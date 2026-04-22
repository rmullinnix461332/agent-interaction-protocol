package executor

import (
	"fmt"

	"github.com/example/aip-engine/internal/models"
)

// executeFanInStep waits for upstream steps and evaluates the join condition
func (e *LocalExecutor) executeFanInStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run
	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID, "FanIn started")
	e.saveRun(run)

	// Evaluate condition against upstream step statuses
	condition := step.Condition
	if condition == "" {
		condition = "allSuccess"
	}

	ok := evaluateFanInCondition(condition, step.DependsOn, run.StepStatuses)
	if !ok {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "FANIN_CONDITION_FAILED",
				Message: fmt.Sprintf("FanIn condition '%s' not met for dependencies: %v", condition, step.DependsOn),
			},
		}
	}

	return &StepResult{
		StepID: step.ID,
		Status: "completed",
	}
}

// evaluateFanInCondition checks whether upstream steps satisfy the join condition
func evaluateFanInCondition(condition string, dependsOn []string, statuses map[string]models.StepStatus) bool {
	if len(dependsOn) == 0 {
		return true
	}

	switch condition {
	case "allSuccess":
		for _, dep := range dependsOn {
			ss, ok := statuses[dep]
			if !ok || ss.Status != "completed" {
				return false
			}
		}
		return true

	case "anySuccess":
		for _, dep := range dependsOn {
			ss, ok := statuses[dep]
			if ok && ss.Status == "completed" {
				return true
			}
		}
		return false

	case "allComplete":
		for _, dep := range dependsOn {
			ss, ok := statuses[dep]
			if !ok {
				return false
			}
			if ss.Status != "completed" && ss.Status != "failed" {
				return false
			}
		}
		return true

	default:
		// Unknown condition, default to allSuccess
		for _, dep := range dependsOn {
			ss, ok := statuses[dep]
			if !ok || ss.Status != "completed" {
				return false
			}
		}
		return true
	}
}
