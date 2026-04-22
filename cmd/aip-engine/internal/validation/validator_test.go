package validation

import (
	"testing"

	"github.com/example/aip-engine/internal/models"
)

func validFlow() *models.Flow {
	return &models.Flow{
		APIVersion: "aip/v0.1",
		Kind:       "Flow",
		Metadata:   models.FlowMetadata{Name: "test"},
		Participants: []models.Participant{
			{ID: "agent1", Kind: models.ParticipantKindAgent},
		},
		Artifacts: []models.Artifact{
			{Ref: "aip://artifact/out"},
		},
		Steps: []models.Step{
			{ID: "s1", Type: models.StepTypeAction, ParticipantRef: "agent1"},
		},
	}
}

func TestValidate(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name      string
		modify    func(*models.Flow)
		wantValid bool
		wantErr   string // substring to look for in errors
	}{
		{
			name:      "valid flow",
			modify:    func(f *models.Flow) {},
			wantValid: true,
		},
		{
			name:      "missing apiVersion",
			modify:    func(f *models.Flow) { f.APIVersion = "" },
			wantValid: false,
			wantErr:   "apiVersion is required",
		},
		{
			name:      "wrong kind",
			modify:    func(f *models.Flow) { f.Kind = "Workflow" },
			wantValid: false,
			wantErr:   "kind must be 'Flow'",
		},
		{
			name:      "missing metadata name",
			modify:    func(f *models.Flow) { f.Metadata.Name = "" },
			wantValid: false,
			wantErr:   "metadata.name is required",
		},
		{
			name:      "no participants",
			modify:    func(f *models.Flow) { f.Participants = nil },
			wantValid: false,
			wantErr:   "at least one participant",
		},
		{
			name:      "no steps",
			modify:    func(f *models.Flow) { f.Steps = nil },
			wantValid: false,
			wantErr:   "at least one step",
		},
		{
			name: "duplicate participant",
			modify: func(f *models.Flow) {
				f.Participants = append(f.Participants, models.Participant{ID: "agent1", Kind: models.ParticipantKindAgent})
			},
			wantValid: false,
			wantErr:   "duplicate participant id",
		},
		{
			name: "action missing participantRef",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeAction}}
			},
			wantValid: false,
			wantErr:   "requires participantRef",
		},
		{
			name: "action unknown participant",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeAction, ParticipantRef: "unknown"}}
			},
			wantValid: false,
			wantErr:   "unknown participant",
		},
		{
			name: "fanOut missing steps",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeFanOut}}
			},
			wantValid: false,
			wantErr:   "requires steps",
		},
		{
			name: "decision missing cases",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeDecision}}
			},
			wantValid: false,
			wantErr:   "requires decision.cases",
		},
		{
			name: "await missing ref",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeAwait}}
			},
			wantValid: false,
			wantErr:   "requires awaitInput.ref",
		},
		{
			name: "exit missing config",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeExit}}
			},
			wantValid: false,
			wantErr:   "requires exit",
		},
		{
			name: "unknown step type",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: "bogus"}}
			},
			wantValid: false,
			wantErr:   "unknown step type",
		},
		{
			name: "circular dependency",
			modify: func(f *models.Flow) {
				f.Participants = []models.Participant{{ID: "a", Kind: models.ParticipantKindAgent}}
				f.Steps = []models.Step{
					{ID: "s1", Type: models.StepTypeAction, ParticipantRef: "a", DependsOn: []string{"s2"}},
					{ID: "s2", Type: models.StepTypeAction, ParticipantRef: "a", DependsOn: []string{"s1"}},
				}
			},
			wantValid: false,
			wantErr:   "circular dependency",
		},
		{
			name: "artifact bad ref",
			modify: func(f *models.Flow) {
				f.Artifacts = []models.Artifact{{Ref: "bad-ref"}}
			},
			wantValid: false,
			wantErr:   "must start with aip://",
		},
		{
			name: "subflow missing flowRef",
			modify: func(f *models.Flow) {
				f.Participants = []models.Participant{
					{ID: "sub", Kind: models.ParticipantKindSubflow},
				}
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeFanIn}}
			},
			wantValid: false,
			wantErr:   "requires flowRef",
		},
		{
			name: "fanIn is valid without condition",
			modify: func(f *models.Flow) {
				f.Steps = []models.Step{{ID: "s1", Type: models.StepTypeFanIn}}
			},
			wantValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flow := validFlow()
			tt.modify(flow)
			result := v.Validate(flow)

			if result.Valid != tt.wantValid {
				t.Errorf("Valid = %v, want %v; errors: %v", result.Valid, tt.wantValid, result.Errors)
			}
			if tt.wantErr != "" {
				found := false
				for _, e := range result.Errors {
					if contains(e, tt.wantErr) {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("expected error containing %q, got %v", tt.wantErr, result.Errors)
				}
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchSubstring(s, substr)
}

func searchSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
