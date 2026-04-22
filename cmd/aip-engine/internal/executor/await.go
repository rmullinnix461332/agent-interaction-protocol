package executor

import (
	"fmt"

	"github.com/example/aip-engine/internal/models"
)

// executeAwaitStep pauses the run until a resume payload is received
func (e *LocalExecutor) executeAwaitStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run

	if step.AwaitInput == nil || step.AwaitInput.Ref == "" {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "AWAIT_NO_INPUT",
				Message: "Await step has no awaitInput configuration",
			},
		}
	}

	// Mark step and run as awaiting
	run.CurrentStep = step.ID
	run.Status = models.RunStatusAwaiting
	run.AwaitState = &models.AwaitState{
		StepID:        step.ID,
		AwaitInputRef: step.AwaitInput.Ref,
	}
	run.SetStepStatus(step.ID, "awaiting", "")
	e.emitEvent(run.ID, models.EventTypeAwaitEntered, step.ID,
		fmt.Sprintf("Awaiting input: %s", step.AwaitInput.Ref))
	e.saveRun(run)

	e.logger.WithField("runId", run.ID).WithField("stepId", step.ID).
		Infof("Run paused, awaiting input: %s", step.AwaitInput.Ref)

	// Block until resume or cancellation
	select {
	case payload := <-rc.ResumeCh:
		return e.handleResume(rc, step, payload, runArtifacts)
	case <-rc.Ctx.Done():
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "AWAIT_CANCELLED",
				Message: "Await cancelled",
			},
		}
	}
}

// handleResume processes a resume payload and stores the artifact
func (e *LocalExecutor) handleResume(rc *RunContext, step *models.Step, payload *models.ResumePayload, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run

	e.logger.WithField("runId", run.ID).WithField("stepId", step.ID).
		Info("Run resumed")

	// Store the resume payload as an artifact
	content, _ := marshalContent(payload.Value)
	contentType := payload.ContentType
	if contentType == "" {
		contentType = "application/json"
	}

	ref := payload.Ref
	if ref == "" {
		ref = step.AwaitInput.Ref
	}

	produced := models.ProducedArtifact{
		Ref:         ref,
		ContentType: contentType,
		Content:     content,
	}
	e.storeProducedArtifact(run.ID, step.ID, &produced, runArtifacts)

	// Update run state
	run.Status = models.RunStatusRunning
	run.AwaitState = nil
	e.emitEvent(run.ID, models.EventTypeAwaitResumed, step.ID,
		fmt.Sprintf("Resumed with input: %s", ref))
	e.saveRun(run)

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: []models.ProducedArtifact{produced},
	}
}
