package executor

import (
	"fmt"
	"sync"

	"github.com/example/aip-engine/internal/models"
)

// executeFanOutStep spawns parallel execution of child steps
func (e *LocalExecutor) executeFanOutStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run

	rc.RunMu.Lock()
	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	rc.RunMu.Unlock()

	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID, fmt.Sprintf("FanOut started: %d parallel steps", len(step.Steps)))
	e.saveRun(run)

	if len(step.Steps) == 0 {
		return &StepResult{StepID: step.ID, Status: "completed"}
	}

	type childResult struct {
		stepID string
		result *StepResult
	}

	var (
		mu      sync.Mutex
		wg      sync.WaitGroup
		results []childResult
		artMu   sync.Mutex
	)

	for _, childID := range step.Steps {
		childStep, ok := rc.Flow.GetStep(childID)
		if !ok {
			return &StepResult{
				StepID: step.ID,
				Status: "failed",
				Error: &models.AdapterError{
					Code:    "FANOUT_STEP_NOT_FOUND",
					Message: fmt.Sprintf("FanOut child step not found: %s", childID),
				},
			}
		}

		wg.Add(1)
		go func(cs *models.Step) {
			defer wg.Done()

			// Take a snapshot of current artifacts for this child
			artMu.Lock()
			snapshot := snapshotArtifacts(runArtifacts)
			artMu.Unlock()

			res := e.executeStep(rc, cs, snapshot)

			// Update child step status on the run (synchronized)
			rc.RunMu.Lock()
			if res.Status == "failed" {
				errMsg := ""
				if res.Error != nil {
					errMsg = res.Error.Message
				}
				run.SetStepStatus(cs.ID, "failed", errMsg)
			} else {
				run.SetStepStatus(cs.ID, "completed", "")
			}
			rc.RunMu.Unlock()

			// Merge produced artifacts back
			artMu.Lock()
			for _, art := range res.Artifacts {
				e.storeProducedArtifact(run.ID, cs.ID, &art, runArtifacts)
			}
			artMu.Unlock()

			mu.Lock()
			results = append(results, childResult{stepID: cs.ID, result: res})
			mu.Unlock()
		}(childStep)
	}

	wg.Wait()
	e.saveRun(run)

	// Check results
	var allArtifacts []models.ProducedArtifact
	for _, cr := range results {
		if cr.result.Status == "failed" {
			return &StepResult{
				StepID: step.ID,
				Status: "failed",
				Error:  cr.result.Error,
			}
		}
		allArtifacts = append(allArtifacts, cr.result.Artifacts...)
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: allArtifacts,
	}
}

// snapshotArtifacts creates a shallow copy of the artifact map
func snapshotArtifacts(src map[string]*models.RuntimeArtifact) map[string]*models.RuntimeArtifact {
	dst := make(map[string]*models.RuntimeArtifact, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
