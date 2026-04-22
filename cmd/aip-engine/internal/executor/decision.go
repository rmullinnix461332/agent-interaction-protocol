package executor

import (
	"fmt"
	"strings"

	"github.com/example/aip-engine/internal/models"
)

// executeDecisionStep evaluates conditions and routes to next step(s)
func (e *LocalExecutor) executeDecisionStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run
	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID, "Decision started")
	e.saveRun(run)

	if step.Decision == nil || len(step.Decision.Cases) == 0 {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "DECISION_NO_CASES",
				Message: "Decision step has no cases",
			},
		}
	}

	// Build evaluation context from runtime artifacts
	evalCtx := buildEvalContext(runArtifacts)

	// Evaluate cases in order
	for _, c := range step.Decision.Cases {
		if evaluateCondition(c.When, evalCtx) {
			next := resolveDecisionNext(&c.Next)
			e.emitEvent(run.ID, models.EventTypeStepCompleted, step.ID,
				fmt.Sprintf("Decision matched case, routing to: %s", strings.Join(next, ", ")))

			return &StepResult{
				StepID: step.ID,
				Status: "completed",
			}
		}
	}

	// No case matched, try default
	if step.Decision.Default != nil {
		next := resolveDecisionNext(step.Decision.Default)
		e.emitEvent(run.ID, models.EventTypeStepCompleted, step.ID,
			fmt.Sprintf("Decision using default, routing to: %s", strings.Join(next, ", ")))

		return &StepResult{
			StepID: step.ID,
			Status: "completed",
		}
	}

	// No match and no default
	return &StepResult{
		StepID: step.ID,
		Status: "failed",
		Error: &models.AdapterError{
			Code:    "DECISION_NO_MATCH",
			Message: "No decision case matched and no default defined",
		},
	}
}

// resolveDecisionNext returns the step IDs from a DecisionNext
func resolveDecisionNext(next *models.DecisionNext) []string {
	if next.NextStep != "" {
		return []string{next.NextStep}
	}
	return next.NextSteps
}

// buildEvalContext flattens runtime artifacts into a map for condition evaluation
func buildEvalContext(runArtifacts map[string]*models.RuntimeArtifact) map[string]any {
	ctx := make(map[string]any)
	for ref, art := range runArtifacts {
		ctx[ref] = art.Content
		// Also expose parsed JSON content if possible
		if parsed := tryParseJSON(art.Content); parsed != nil {
			ctx[ref+".parsed"] = parsed
			// Flatten top-level keys for simple path access
			if m, ok := parsed.(map[string]any); ok {
				for k, v := range m {
					ctx["artifact."+k] = v
				}
			}
		}
	}
	return ctx
}

// evaluateCondition evaluates a DecisionCondition (map[string]any) using the simple DSL
func evaluateCondition(when models.DecisionCondition, evalCtx map[string]any) bool {
	return evaluateExpr(when, evalCtx)
}

// evaluateExpr recursively evaluates a condition expression
func evaluateExpr(expr map[string]any, evalCtx map[string]any) bool {
	// Handle logical operators
	if andList, ok := expr["and"]; ok {
		return evaluateLogicalList(andList, evalCtx, true)
	}
	if orList, ok := expr["or"]; ok {
		return evaluateLogicalList(orList, evalCtx, false)
	}
	if notExpr, ok := expr["not"]; ok {
		if m, ok := notExpr.(map[string]any); ok {
			return !evaluateExpr(m, evalCtx)
		}
		return false
	}

	// Handle exists
	if existsExpr, ok := expr["exists"]; ok {
		if path, ok := existsExpr.(string); ok {
			_, found := evalCtx[path]
			return found
		}
		return false
	}

	// Handle comparison operators
	for _, op := range []string{"eq", "ne", "gt", "gte", "lt", "lte"} {
		if compExpr, ok := expr[op]; ok {
			if m, ok := compExpr.(map[string]any); ok {
				return evaluateComparison(op, m, evalCtx)
			}
		}
	}

	return false
}

// evaluateLogicalList evaluates and/or lists
func evaluateLogicalList(list any, evalCtx map[string]any, isAnd bool) bool {
	items, ok := list.([]any)
	if !ok {
		return false
	}

	for _, item := range items {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		result := evaluateExpr(m, evalCtx)
		if isAnd && !result {
			return false
		}
		if !isAnd && result {
			return true
		}
	}

	return isAnd // and: all passed; or: none passed
}

// evaluateComparison evaluates a single comparison like {"artifact.status": "approved"}
func evaluateComparison(op string, comp map[string]any, evalCtx map[string]any) bool {
	for path, expected := range comp {
		actual, ok := evalCtx[path]
		if !ok {
			return op == "ne" // ne returns true if path doesn't exist
		}
		return compareValues(op, actual, expected)
	}
	return false
}

// compareValues compares two values using the given operator
func compareValues(op string, actual, expected any) bool {
	// Try numeric comparison
	actualNum, actualOk := toFloat64(actual)
	expectedNum, expectedOk := toFloat64(expected)

	if actualOk && expectedOk {
		switch op {
		case "eq":
			return actualNum == expectedNum
		case "ne":
			return actualNum != expectedNum
		case "gt":
			return actualNum > expectedNum
		case "gte":
			return actualNum >= expectedNum
		case "lt":
			return actualNum < expectedNum
		case "lte":
			return actualNum <= expectedNum
		}
	}

	// Fall back to string comparison
	actualStr := fmt.Sprintf("%v", actual)
	expectedStr := fmt.Sprintf("%v", expected)

	switch op {
	case "eq":
		return actualStr == expectedStr
	case "ne":
		return actualStr != expectedStr
	case "gt":
		return actualStr > expectedStr
	case "gte":
		return actualStr >= expectedStr
	case "lt":
		return actualStr < expectedStr
	case "lte":
		return actualStr <= expectedStr
	}

	return false
}
