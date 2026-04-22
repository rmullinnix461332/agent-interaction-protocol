package executor

import (
	"testing"

	"github.com/example/aip-engine/internal/models"
)

func TestCompareValues(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		actual   any
		expected any
		want     bool
	}{
		// Numeric comparisons
		{name: "eq numeric true", op: "eq", actual: 5.0, expected: 5.0, want: true},
		{name: "eq numeric false", op: "eq", actual: 5.0, expected: 6.0, want: false},
		{name: "ne numeric true", op: "ne", actual: 5.0, expected: 6.0, want: true},
		{name: "gt true", op: "gt", actual: 10.0, expected: 5.0, want: true},
		{name: "gt false", op: "gt", actual: 3.0, expected: 5.0, want: false},
		{name: "gte equal", op: "gte", actual: 5.0, expected: 5.0, want: true},
		{name: "gte greater", op: "gte", actual: 6.0, expected: 5.0, want: true},
		{name: "lt true", op: "lt", actual: 3.0, expected: 5.0, want: true},
		{name: "lte equal", op: "lte", actual: 5.0, expected: 5.0, want: true},

		// String comparisons
		{name: "eq string true", op: "eq", actual: "hello", expected: "hello", want: true},
		{name: "eq string false", op: "eq", actual: "hello", expected: "world", want: false},
		{name: "ne string true", op: "ne", actual: "a", expected: "b", want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := compareValues(tt.op, tt.actual, tt.expected)
			if got != tt.want {
				t.Errorf("compareValues(%q, %v, %v) = %v, want %v", tt.op, tt.actual, tt.expected, got, tt.want)
			}
		})
	}
}

func TestEvaluateExpr(t *testing.T) {
	evalCtx := map[string]any{
		"artifact.status": "approved",
		"artifact.score":  0.85,
		"artifact.name":   "test",
	}

	tests := []struct {
		name string
		expr map[string]any
		want bool
	}{
		{
			name: "eq match",
			expr: map[string]any{"eq": map[string]any{"artifact.status": "approved"}},
			want: true,
		},
		{
			name: "eq no match",
			expr: map[string]any{"eq": map[string]any{"artifact.status": "rejected"}},
			want: false,
		},
		{
			name: "gte match",
			expr: map[string]any{"gte": map[string]any{"artifact.score": 0.8}},
			want: true,
		},
		{
			name: "gte no match",
			expr: map[string]any{"gte": map[string]any{"artifact.score": 0.9}},
			want: false,
		},
		{
			name: "exists true",
			expr: map[string]any{"exists": "artifact.name"},
			want: true,
		},
		{
			name: "exists false",
			expr: map[string]any{"exists": "artifact.missing"},
			want: false,
		},
		{
			name: "and both true",
			expr: map[string]any{
				"and": []any{
					map[string]any{"eq": map[string]any{"artifact.status": "approved"}},
					map[string]any{"gte": map[string]any{"artifact.score": 0.8}},
				},
			},
			want: true,
		},
		{
			name: "and one false",
			expr: map[string]any{
				"and": []any{
					map[string]any{"eq": map[string]any{"artifact.status": "approved"}},
					map[string]any{"gte": map[string]any{"artifact.score": 0.9}},
				},
			},
			want: false,
		},
		{
			name: "or one true",
			expr: map[string]any{
				"or": []any{
					map[string]any{"eq": map[string]any{"artifact.status": "rejected"}},
					map[string]any{"eq": map[string]any{"artifact.status": "approved"}},
				},
			},
			want: true,
		},
		{
			name: "or none true",
			expr: map[string]any{
				"or": []any{
					map[string]any{"eq": map[string]any{"artifact.status": "rejected"}},
					map[string]any{"eq": map[string]any{"artifact.status": "pending"}},
				},
			},
			want: false,
		},
		{
			name: "not inverts",
			expr: map[string]any{
				"not": map[string]any{"eq": map[string]any{"artifact.status": "rejected"}},
			},
			want: true,
		},
		{
			name: "ne missing path",
			expr: map[string]any{"ne": map[string]any{"artifact.missing": "anything"}},
			want: true,
		},
		{
			name: "empty expr",
			expr: map[string]any{},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := evaluateExpr(tt.expr, evalCtx)
			if got != tt.want {
				t.Errorf("evaluateExpr() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEvaluateFanInCondition(t *testing.T) {
	statuses := map[string]models.StepStatus{
		"a": {Status: "completed"},
		"b": {Status: "completed"},
		"c": {Status: "failed"},
	}

	tests := []struct {
		name      string
		condition string
		deps      []string
		want      bool
	}{
		{name: "allSuccess all completed", condition: "allSuccess", deps: []string{"a", "b"}, want: true},
		{name: "allSuccess one failed", condition: "allSuccess", deps: []string{"a", "c"}, want: false},
		{name: "anySuccess one completed", condition: "anySuccess", deps: []string{"a", "c"}, want: true},
		{name: "anySuccess none completed", condition: "anySuccess", deps: []string{"c"}, want: false},
		{name: "allComplete mixed", condition: "allComplete", deps: []string{"a", "c"}, want: true},
		{name: "allComplete missing", condition: "allComplete", deps: []string{"a", "missing"}, want: false},
		{name: "empty deps", condition: "allSuccess", deps: nil, want: true},
		{name: "unknown condition defaults to allSuccess", condition: "bogus", deps: []string{"a", "b"}, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := evaluateFanInCondition(tt.condition, tt.deps, statuses)
			if got != tt.want {
				t.Errorf("evaluateFanInCondition(%q, %v) = %v, want %v", tt.condition, tt.deps, got, tt.want)
			}
		})
	}
}
