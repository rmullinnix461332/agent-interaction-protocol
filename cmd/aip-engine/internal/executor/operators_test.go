package executor

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/example/aip-engine/internal/models"
)

func makeArtifact(ref string, content any) models.ProducedArtifact {
	data, _ := json.Marshal(content)
	return models.ProducedArtifact{
		Ref:         ref,
		ContentType: "application/json",
		Content:     data,
	}
}

func TestApplyOperator_UnknownType(t *testing.T) {
	op := &models.Operator{Type: "bogus"}
	_, err := applyOperator(op, nil, nil)
	if err == nil {
		t.Error("expected error for unknown operator type")
	}
}

func TestApplyRank(t *testing.T) {
	arts := []models.ProducedArtifact{
		makeArtifact("aip://a/low", map[string]any{"score": 0.3}),
		makeArtifact("aip://a/high", map[string]any{"score": 0.9}),
		makeArtifact("aip://a/mid", map[string]any{"score": 0.6}),
	}

	tests := []struct {
		name      string
		topN      int
		criteria  string
		wantLen   int
		wantFirst string
	}{
		{name: "top 1", topN: 1, criteria: "score", wantLen: 1, wantFirst: "aip://a/high"},
		{name: "top 2", topN: 2, criteria: "score", wantLen: 2, wantFirst: "aip://a/high"},
		{name: "all", topN: 0, criteria: "score", wantLen: 3, wantFirst: "aip://a/high"},
		{name: "missing field", topN: 0, criteria: "missing", wantLen: 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op := &models.Operator{
				Type:   "rank",
				TopN:   tt.topN,
				Config: map[string]any{"criteria": tt.criteria},
			}
			result, err := applyRank(op, arts)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("got %d results, want %d", len(result), tt.wantLen)
			}
			if tt.wantFirst != "" && len(result) > 0 && result[0].Ref != tt.wantFirst {
				t.Errorf("first = %q, want %q", result[0].Ref, tt.wantFirst)
			}
		})
	}
}

func TestApplyMerge(t *testing.T) {
	tests := []struct {
		name    string
		mode    string
		arts    []models.ProducedArtifact
		wantLen int
		check   func([]models.ProducedArtifact) bool
	}{
		{
			name: "append",
			mode: "append",
			arts: []models.ProducedArtifact{
				makeArtifact("a", map[string]any{"v": 1}),
				makeArtifact("b", map[string]any{"v": 2}),
			},
			wantLen: 1,
			check: func(result []models.ProducedArtifact) bool {
				return strings.Contains(string(result[0].Content), "[")
			},
		},
		{
			name: "dedupe same content",
			mode: "dedupe",
			arts: []models.ProducedArtifact{
				makeArtifact("a", map[string]any{"v": 1}),
				makeArtifact("b", map[string]any{"v": 1}),
			},
			wantLen: 1,
		},
		{
			name: "dedupe different content",
			mode: "dedupe",
			arts: []models.ProducedArtifact{
				makeArtifact("a", map[string]any{"v": 1}),
				makeArtifact("b", map[string]any{"v": 2}),
			},
			wantLen: 2,
		},
		{
			name:    "unknown mode",
			mode:    "bogus",
			arts:    nil,
			wantLen: -1, // expect error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op := &models.Operator{Type: "merge", Mode: tt.mode}
			result, err := applyMerge(op, tt.arts)

			if tt.wantLen == -1 {
				if err == nil {
					t.Error("expected error")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("got %d results, want %d", len(result), tt.wantLen)
			}
			if tt.check != nil && !tt.check(result) {
				t.Error("check function failed")
			}
		})
	}
}

func TestApplyFilter(t *testing.T) {
	arts := []models.ProducedArtifact{
		makeArtifact("a", map[string]any{"quality": 0.3, "name": "bad"}),
		makeArtifact("b", map[string]any{"quality": 0.9, "name": "good"}),
		makeArtifact("c", map[string]any{"quality": 0.7, "name": "ok"}),
	}

	tests := []struct {
		name    string
		rules   []any
		wantLen int
	}{
		{
			name: "gte filter",
			rules: []any{
				map[string]any{"field": "quality", "op": "gte", "value": 0.7},
			},
			wantLen: 2,
		},
		{
			name: "eq filter",
			rules: []any{
				map[string]any{"field": "name", "op": "eq", "value": "good"},
			},
			wantLen: 1,
		},
		{
			name: "multiple rules",
			rules: []any{
				map[string]any{"field": "quality", "op": "gte", "value": 0.5},
				map[string]any{"field": "name", "op": "ne", "value": "bad"},
			},
			wantLen: 2,
		},
		{
			name:    "no rules passes all",
			rules:   nil,
			wantLen: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := map[string]any{}
			if tt.rules != nil {
				config["rules"] = tt.rules
			}
			op := &models.Operator{Type: "filter", Config: config}
			result, err := applyFilter(op, arts)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("got %d results, want %d", len(result), tt.wantLen)
			}
		})
	}
}

func TestApplySummarize(t *testing.T) {
	arts := []models.ProducedArtifact{
		makeArtifact("a", map[string]any{"data": "alpha"}),
		makeArtifact("b", map[string]any{"data": "beta"}),
	}

	tests := []struct {
		name     string
		template string
		wantErr  bool
		check    func(string) bool
	}{
		{
			name:     "default template",
			template: "",
			wantErr:  false,
		},
		{
			name:     "custom template",
			template: "Count: {{len .Items}}",
			wantErr:  false,
			check:    func(s string) bool { return strings.Contains(s, "Count: 2") },
		},
		{
			name:     "invalid template",
			template: "{{.Invalid",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := map[string]any{}
			if tt.template != "" {
				config["template"] = tt.template
			}
			op := &models.Operator{Type: "summarize", Config: config}
			result, err := applySummarize(op, arts)

			if tt.wantErr {
				if err == nil {
					t.Error("expected error")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != 1 {
				t.Fatalf("got %d results, want 1", len(result))
			}
			if tt.check != nil && !tt.check(string(result[0].Content)) {
				t.Errorf("check failed on content: %q", result[0].Content)
			}
		})
	}
}

func TestExtractScore(t *testing.T) {
	tests := []struct {
		name    string
		content string
		field   string
		want    float64
	}{
		{name: "valid score", content: `{"score": 0.85}`, field: "score", want: 0.85},
		{name: "missing field", content: `{"other": 1}`, field: "score", want: 0},
		{name: "not a number", content: `{"score": "high"}`, field: "score", want: 0},
		{name: "invalid json", content: `not json`, field: "score", want: 0},
		{name: "empty", content: ``, field: "score", want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractScore([]byte(tt.content), tt.field)
			if got != tt.want {
				t.Errorf("extractScore() = %v, want %v", got, tt.want)
			}
		})
	}
}
