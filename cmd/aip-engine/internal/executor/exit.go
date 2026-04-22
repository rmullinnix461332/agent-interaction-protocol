package executor

import (
	"fmt"

	"github.com/example/aip-engine/internal/models"
)

// executeExitStep terminates the run with a defined status
func (e *LocalExecutor) executeExitStep(rc *RunContext, step *models.Step) *StepResult {
	run := rc.Run
	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID, "Exit step started")
	e.saveRun(run)

	if step.Exit == nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "EXIT_NO_CONFIG",
				Message: "Exit step has no exit configuration",
			},
		}
	}

	message := step.Exit.Message
	if message == "" {
		message = fmt.Sprintf("Flow exited with status: %s", step.Exit.Status)
	}

	e.emitEvent(run.ID, models.EventTypeStepCompleted, step.ID, message)

	// Map exit status to step result
	switch step.Exit.Status {
	case "success":
		return &StepResult{
			StepID: step.ID,
			Status: "exit_success",
		}
	case "failure":
		return &StepResult{
			StepID: step.ID,
			Status: "exit_failure",
			Error: &models.AdapterError{
				Code:    step.Exit.Code,
				Message: message,
			},
		}
	case "cancelled":
		return &StepResult{
			StepID: step.ID,
			Status: "exit_cancelled",
		}
	case "blocked":
		return &StepResult{
			StepID: step.ID,
			Status: "exit_blocked",
			Error: &models.AdapterError{
				Code:    step.Exit.Code,
				Message: message,
			},
		}
	default:
		return &StepResult{
			StepID: step.ID,
			Status: "exit_success",
		}
	}
}
