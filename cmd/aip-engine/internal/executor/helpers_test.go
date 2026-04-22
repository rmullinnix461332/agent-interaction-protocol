package executor

import (
	"testing"

	"github.com/example/aip-engine/internal/models"
)

func TestTopologicalSort(t *testing.T) {
	tests := []struct {
		name  string
		steps []models.Step
		want  []string // expected order (first elements)
	}{
		{
			name: "single step",
			steps: []models.Step{
				{ID: "a"},
			},
			want: []string{"a"},
		},
		{
			name: "linear chain",
			steps: []models.Step{
				{ID: "a"},
				{ID: "b", DependsOn: []string{"a"}},
				{ID: "c", DependsOn: []string{"b"}},
			},
			want: []string{"a", "b", "c"},
		},
		{
			name: "diamond",
			steps: []models.Step{
				{ID: "a"},
				{ID: "b", DependsOn: []string{"a"}},
				{ID: "c", DependsOn: []string{"a"}},
				{ID: "d", DependsOn: []string{"b", "c"}},
			},
			want: []string{"a"}, // a must be first, d must be last
		},
		{
			name:  "empty",
			steps: nil,
			want:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sorted, err := topologicalSort(tt.steps)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if tt.want == nil {
				if len(sorted) != 0 {
					t.Errorf("expected empty, got %v", sorted)
				}
				return
			}

			if len(sorted) != len(tt.steps) {
				t.Errorf("got %d steps, want %d", len(sorted), len(tt.steps))
			}

			// Check that expected first elements are in order
			for i, w := range tt.want {
				if i < len(sorted) && sorted[i] != w {
					t.Errorf("sorted[%d] = %q, want %q", i, sorted[i], w)
				}
			}

			// For diamond: d must be last
			if tt.name == "diamond" && sorted[len(sorted)-1] != "d" {
				t.Errorf("diamond: last = %q, want %q", sorted[len(sorted)-1], "d")
			}
		})
	}
}

func TestTryParseJSON(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		wantNil bool
	}{
		{name: "valid object", input: []byte(`{"key":"val"}`), wantNil: false},
		{name: "valid array", input: []byte(`[1,2,3]`), wantNil: false},
		{name: "valid string", input: []byte(`"hello"`), wantNil: false},
		{name: "invalid", input: []byte(`not json`), wantNil: true},
		{name: "empty", input: nil, wantNil: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tryParseJSON(tt.input)
			if tt.wantNil && result != nil {
				t.Errorf("expected nil, got %v", result)
			}
			if !tt.wantNil && result == nil {
				t.Error("expected non-nil result")
			}
		})
	}
}

func TestToFloat64(t *testing.T) {
	tests := []struct {
		name   string
		input  any
		want   float64
		wantOK bool
	}{
		{name: "float64", input: 3.14, want: 3.14, wantOK: true},
		{name: "int", input: 42, want: 42.0, wantOK: true},
		{name: "int64", input: int64(100), want: 100.0, wantOK: true},
		{name: "float32", input: float32(1.5), want: 1.5, wantOK: true},
		{name: "string", input: "nope", want: 0, wantOK: false},
		{name: "nil", input: nil, want: 0, wantOK: false},
		{name: "bool", input: true, want: 0, wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := toFloat64(tt.input)
			if ok != tt.wantOK {
				t.Errorf("ok = %v, want %v", ok, tt.wantOK)
			}
			if ok && got != tt.want {
				t.Errorf("value = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestResolveConsumedArtifacts(t *testing.T) {
	flow := &models.ConnectedFlow{
		Flow: models.Flow{
			Artifacts: []models.Artifact{
				{Ref: "aip://artifact/data", ContentType: "application/json"},
			},
		},
	}

	runArtifacts := map[string]*models.RuntimeArtifact{
		"aip://artifact/data": {
			Artifact: models.Artifact{Ref: "aip://artifact/data", ContentType: "application/json"},
			Content:  []byte(`{"hello":"world"}`),
		},
	}

	tests := []struct {
		name        string
		consumes    []string
		wantCount   int
		wantContent bool
	}{
		{
			name:        "resolves existing artifact",
			consumes:    []string{"aip://artifact/data"},
			wantCount:   1,
			wantContent: true,
		},
		{
			name:        "missing artifact still returned",
			consumes:    []string{"aip://artifact/missing"},
			wantCount:   1,
			wantContent: false,
		},
		{
			name:      "no consumes",
			consumes:  nil,
			wantCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := &models.Step{Consumes: tt.consumes}
			resolved := resolveConsumedArtifacts(step, flow, runArtifacts)

			if len(resolved) != tt.wantCount {
				t.Errorf("got %d artifacts, want %d", len(resolved), tt.wantCount)
			}
			if tt.wantContent && len(resolved) > 0 && !resolved[0].HasContent {
				t.Error("expected HasContent = true")
			}
		})
	}
}
