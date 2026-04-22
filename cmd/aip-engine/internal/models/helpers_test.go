package models

import (
	"strings"
	"testing"
)

func TestGenerateID(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
	}{
		{name: "run prefix", prefix: "run"},
		{name: "evt prefix", prefix: "evt"},
		{name: "empty prefix", prefix: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id := GenerateID(tt.prefix)
			if !strings.HasPrefix(id, tt.prefix+"-") {
				t.Errorf("expected prefix %q-, got %q", tt.prefix, id)
			}
			// Should be unique
			id2 := GenerateID(tt.prefix)
			if id == id2 {
				t.Errorf("expected unique IDs, got %q twice", id)
			}
		})
	}
}

func TestFlowGetStep(t *testing.T) {
	flow := &Flow{
		Steps: []Step{
			{ID: "s1", Type: StepTypeAction},
			{ID: "s2", Type: StepTypeFanOut},
		},
	}

	tests := []struct {
		name     string
		stepID   string
		wantOK   bool
		wantType StepType
	}{
		{name: "existing step", stepID: "s1", wantOK: true, wantType: StepTypeAction},
		{name: "second step", stepID: "s2", wantOK: true, wantType: StepTypeFanOut},
		{name: "missing step", stepID: "s3", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step, ok := flow.GetStep(tt.stepID)
			if ok != tt.wantOK {
				t.Errorf("GetStep(%q) ok = %v, want %v", tt.stepID, ok, tt.wantOK)
			}
			if ok && step.Type != tt.wantType {
				t.Errorf("GetStep(%q).Type = %v, want %v", tt.stepID, step.Type, tt.wantType)
			}
		})
	}
}

func TestFlowGetParticipant(t *testing.T) {
	flow := &Flow{
		Participants: []Participant{
			{ID: "agent1", Kind: ParticipantKindAgent},
			{ID: "human1", Kind: ParticipantKindHuman},
		},
	}

	tests := []struct {
		name   string
		id     string
		wantOK bool
	}{
		{name: "existing", id: "agent1", wantOK: true},
		{name: "missing", id: "nope", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, ok := flow.GetParticipant(tt.id)
			if ok != tt.wantOK {
				t.Errorf("GetParticipant(%q) ok = %v, want %v", tt.id, ok, tt.wantOK)
			}
		})
	}
}

func TestFlowGetArtifact(t *testing.T) {
	flow := &Flow{
		Artifacts: []Artifact{
			{Ref: "aip://artifact/out1"},
		},
	}

	tests := []struct {
		name   string
		ref    string
		wantOK bool
	}{
		{name: "existing", ref: "aip://artifact/out1", wantOK: true},
		{name: "missing", ref: "aip://artifact/nope", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, ok := flow.GetArtifact(tt.ref)
			if ok != tt.wantOK {
				t.Errorf("GetArtifact(%q) ok = %v, want %v", tt.ref, ok, tt.wantOK)
			}
		})
	}
}

func TestFlowGetEntrySteps(t *testing.T) {
	tests := []struct {
		name  string
		steps []Step
		want  int
	}{
		{
			name:  "all entry steps",
			steps: []Step{{ID: "a"}, {ID: "b"}},
			want:  2,
		},
		{
			name:  "one entry one dependent",
			steps: []Step{{ID: "a"}, {ID: "b", DependsOn: []string{"a"}}},
			want:  1,
		},
		{
			name:  "no steps",
			steps: nil,
			want:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flow := &Flow{Steps: tt.steps}
			got := flow.GetEntrySteps()
			if len(got) != tt.want {
				t.Errorf("GetEntrySteps() = %d entries, want %d", len(got), tt.want)
			}
		})
	}
}

func TestRunIsComplete(t *testing.T) {
	tests := []struct {
		name   string
		status RunStatus
		want   bool
	}{
		{name: "pending", status: RunStatusPending, want: false},
		{name: "running", status: RunStatusRunning, want: false},
		{name: "awaiting", status: RunStatusAwaiting, want: false},
		{name: "completed", status: RunStatusCompleted, want: true},
		{name: "failed", status: RunStatusFailed, want: true},
		{name: "cancelled", status: RunStatusCancelled, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			run := &Run{Status: tt.status}
			if got := run.IsComplete(); got != tt.want {
				t.Errorf("IsComplete() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRunSetStepStatus(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		errMsg    string
		wantStart bool
		wantEnd   bool
		wantErr   string
	}{
		{name: "running", status: "running", wantStart: true, wantEnd: false},
		{name: "completed", status: "completed", wantStart: false, wantEnd: true},
		{name: "failed with error", status: "failed", errMsg: "boom", wantStart: false, wantEnd: true, wantErr: "boom"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			run := &Run{StepStatuses: make(map[string]StepStatus)}
			run.SetStepStatus("step1", tt.status, tt.errMsg)

			ss := run.StepStatuses["step1"]
			if ss.Status != tt.status {
				t.Errorf("status = %q, want %q", ss.Status, tt.status)
			}
			if tt.wantStart && ss.StartedAt == nil {
				t.Error("expected StartedAt to be set")
			}
			if tt.wantEnd && ss.CompletedAt == nil {
				t.Error("expected CompletedAt to be set")
			}
			if ss.Error != tt.wantErr {
				t.Errorf("error = %q, want %q", ss.Error, tt.wantErr)
			}
		})
	}
}

func TestNewRun(t *testing.T) {
	flow := &ConnectedFlow{
		Flow: Flow{Metadata: FlowMetadata{Name: "test-flow"}},
	}
	input := map[string]any{"key": "val"}

	run := NewRun(flow, input)

	if run.FlowID != "test-flow" {
		t.Errorf("FlowID = %q, want %q", run.FlowID, "test-flow")
	}
	if run.Status != RunStatusPending {
		t.Errorf("Status = %q, want %q", run.Status, RunStatusPending)
	}
	if run.StepStatuses == nil {
		t.Error("StepStatuses should be initialized")
	}
	if run.Input["key"] != "val" {
		t.Error("Input not preserved")
	}
}

func TestNewConnectedFlow(t *testing.T) {
	flow := Flow{Metadata: FlowMetadata{Name: "my-flow"}}
	cf := NewConnectedFlow(flow)

	if cf.Status != "connected" {
		t.Errorf("Status = %q, want %q", cf.Status, "connected")
	}
	if cf.RunCount != 0 {
		t.Errorf("RunCount = %d, want 0", cf.RunCount)
	}
	if cf.Metadata.Name != "my-flow" {
		t.Errorf("Name = %q, want %q", cf.Metadata.Name, "my-flow")
	}
}
