package executor

import (
	"encoding/json"
	"fmt"

	"github.com/example/aip-engine/internal/models"
)

// executeIterationStep executes a step repeatedly based on iteration config
func (e *LocalExecutor) executeIterationStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run
	iter := step.Iteration
	if iter == nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "ITERATION_NO_CONFIG",
				Message: "Step has iteration flag but no iteration configuration",
			},
		}
	}

	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID,
		fmt.Sprintf("Iteration started: mode=%s", iter.Mode))
	e.saveRun(run)

	var allArtifacts []models.ProducedArtifact

	switch iter.Mode {
	case "forEach":
		result := e.executeForEach(rc, step, iter, runArtifacts)
		if result.Status == "failed" {
			return result
		}
		allArtifacts = result.Artifacts

	case "while":
		result := e.executeWhile(rc, step, iter, runArtifacts)
		if result.Status == "failed" {
			return result
		}
		allArtifacts = result.Artifacts

	case "bounded":
		result := e.executeBounded(rc, step, iter, runArtifacts)
		if result.Status == "failed" {
			return result
		}
		allArtifacts = result.Artifacts

	default:
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "ITERATION_UNKNOWN_MODE",
				Message: fmt.Sprintf("Unknown iteration mode: %s", iter.Mode),
			},
		}
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: allArtifacts,
	}
}

// executeForEach iterates over a collection artifact
func (e *LocalExecutor) executeForEach(rc *RunContext, step *models.Step, iter *models.Iteration, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	// Resolve collection
	collection, err := resolveCollection(iter.CollectionRef, runArtifacts)
	if err != nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "ITERATION_COLLECTION_ERROR",
				Message: err.Error(),
			},
		}
	}

	var allArtifacts []models.ProducedArtifact

	for i, item := range collection {
		select {
		case <-rc.Ctx.Done():
			return &StepResult{StepID: step.ID, Status: "failed",
				Error: &models.AdapterError{Code: "CANCELLED", Message: "Iteration cancelled"}}
		default:
		}

		// Inject current item as an artifact
		itemContent, _ := marshalContent(item)
		itemRef := fmt.Sprintf("aip://iteration/%s/item/%d", step.ID, i)
		itemArt := &models.RuntimeArtifact{
			Artifact: models.Artifact{
				Ref:         itemRef,
				ContentType: "application/json",
			},
			RunID:   rc.Run.ID,
			StepID:  step.ID,
			Content: itemContent,
			Size:    int64(len(itemContent)),
		}
		runArtifacts[itemRef] = itemArt

		result := e.executeActionStep(rc, step, runArtifacts)

		if result.Status == "failed" {
			if iter.OnItemFailure == "continue" || iter.OnItemFailure == "collect" {
				continue
			}
			return result // stop on failure (default)
		}

		allArtifacts = append(allArtifacts, result.Artifacts...)
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: allArtifacts,
	}
}

// executeWhile iterates while a condition is true
func (e *LocalExecutor) executeWhile(rc *RunContext, step *models.Step, iter *models.Iteration, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	maxIter := 100 // Safety limit
	if iter.MaxIterations > 0 {
		maxIter = iter.MaxIterations
	}

	evalCtx := buildEvalContext(runArtifacts)
	var allArtifacts []models.ProducedArtifact

	for i := 0; i < maxIter; i++ {
		select {
		case <-rc.Ctx.Done():
			return &StepResult{StepID: step.ID, Status: "failed",
				Error: &models.AdapterError{Code: "CANCELLED", Message: "Iteration cancelled"}}
		default:
		}

		// Evaluate condition
		if !evaluateExpr(iter.Condition, evalCtx) {
			break
		}

		result := e.executeActionStep(rc, step, runArtifacts)
		if result.Status == "failed" {
			return result
		}

		allArtifacts = append(allArtifacts, result.Artifacts...)

		// Rebuild eval context with new artifacts
		evalCtx = buildEvalContext(runArtifacts)
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: allArtifacts,
	}
}

// executeBounded iterates a fixed number of times
func (e *LocalExecutor) executeBounded(rc *RunContext, step *models.Step, iter *models.Iteration, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	maxIter := iter.MaxIterations
	if maxIter <= 0 {
		maxIter = 1
	}

	var allArtifacts []models.ProducedArtifact

	for i := 0; i < maxIter; i++ {
		select {
		case <-rc.Ctx.Done():
			return &StepResult{StepID: step.ID, Status: "failed",
				Error: &models.AdapterError{Code: "CANCELLED", Message: "Iteration cancelled"}}
		default:
		}

		result := e.executeActionStep(rc, step, runArtifacts)
		if result.Status == "failed" {
			if iter.OnItemFailure == "continue" || iter.OnItemFailure == "collect" {
				continue
			}
			return result
		}

		allArtifacts = append(allArtifacts, result.Artifacts...)
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: allArtifacts,
	}
}

// resolveCollection resolves a collection artifact ref into a slice
func resolveCollection(collectionRef string, runArtifacts map[string]*models.RuntimeArtifact) ([]any, error) {
	art, ok := runArtifacts[collectionRef]
	if !ok {
		return nil, fmt.Errorf("collection artifact not found: %s", collectionRef)
	}

	if len(art.Content) == 0 {
		return nil, fmt.Errorf("collection artifact is empty: %s", collectionRef)
	}

	var collection []any
	if err := json.Unmarshal(art.Content, &collection); err != nil {
		return nil, fmt.Errorf("collection artifact is not a JSON array: %s: %w", collectionRef, err)
	}

	return collection, nil
}
