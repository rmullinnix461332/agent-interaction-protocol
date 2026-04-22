package executor

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/example/aip-engine/internal/models"
	"github.com/example/aip-engine/internal/store"
	"github.com/sirupsen/logrus"
)

// LocalExecutor executes flows locally using goroutines
type LocalExecutor struct {
	store    *store.FileStore
	registry AdapterRegistry
	logger   logrus.FieldLogger

	mu     sync.RWMutex
	active map[string]*RunContext // runID -> active context
}

// NewLocalExecutor creates a new local executor
func NewLocalExecutor(fs *store.FileStore, logger logrus.FieldLogger) *LocalExecutor {
	return &LocalExecutor{
		store:    fs,
		registry: NewAdapterRegistry(),
		logger:   logger,
		active:   make(map[string]*RunContext),
	}
}

// Start begins execution of a run in a background goroutine
func (e *LocalExecutor) Start(ctx context.Context, run *models.Run, flow *models.ConnectedFlow) error {
	runCtx, cancel := context.WithCancel(ctx)

	rc := &RunContext{
		Ctx:      runCtx,
		Cancel:   cancel,
		Run:      run,
		Flow:     flow,
		ResumeCh: make(chan *models.ResumePayload, 1),
	}

	e.mu.Lock()
	e.active[run.ID] = rc
	e.mu.Unlock()

	// Execute in background
	go e.executeRun(rc)

	return nil
}

// Stop halts a running execution
func (e *LocalExecutor) Stop(_ context.Context, runID string) error {
	e.mu.RLock()
	rc, ok := e.active[runID]
	e.mu.RUnlock()

	if !ok {
		return fmt.Errorf("run not active: %s", runID)
	}

	rc.Cancel()
	return nil
}

// IsRunning returns whether a run is actively executing
func (e *LocalExecutor) IsRunning(runID string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	_, ok := e.active[runID]
	return ok
}

// Resume sends a resume payload to an awaiting run
func (e *LocalExecutor) Resume(_ context.Context, runID string, payload *models.ResumePayload) error {
	e.mu.RLock()
	rc, ok := e.active[runID]
	e.mu.RUnlock()

	if !ok {
		return fmt.Errorf("run not active: %s", runID)
	}

	if rc.Run.Status != models.RunStatusAwaiting {
		return fmt.Errorf("run %s is not in awaiting state (current: %s)", runID, rc.Run.Status)
	}

	// Send payload through the resume channel (non-blocking with buffer of 1)
	select {
	case rc.ResumeCh <- payload:
		return nil
	default:
		return fmt.Errorf("resume already pending for run %s", runID)
	}
}

// StopAll cancels all active runs (used during graceful shutdown)
func (e *LocalExecutor) StopAll() {
	e.mu.RLock()
	contexts := make([]*RunContext, 0, len(e.active))
	for _, rc := range e.active {
		contexts = append(contexts, rc)
	}
	e.mu.RUnlock()

	for _, rc := range contexts {
		rc.Cancel()
	}

	if len(contexts) > 0 {
		e.logger.Infof("Cancelled %d active runs for shutdown", len(contexts))
	}
}

// ActiveRunCount returns the number of currently active runs
func (e *LocalExecutor) ActiveRunCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.active)
}

// executeRun is the main execution loop for a run
func (e *LocalExecutor) executeRun(rc *RunContext) {
	defer func() {
		// Recover from panics
		if r := recover(); r != nil {
			e.logger.Errorf("Panic in run %s: %v", rc.Run.ID, r)
			e.failRun(rc.Run, fmt.Sprintf("Internal error: %v", r))
		}

		e.mu.Lock()
		delete(e.active, rc.Run.ID)
		e.mu.Unlock()
	}()

	run := rc.Run
	flow := rc.Flow

	// Mark run as running
	run.Status = models.RunStatusRunning
	e.emitEvent(run.ID, models.EventTypeRunStarted, "", "Run started")
	e.saveRun(run)

	// Build execution plan
	sortedSteps, err := topologicalSort(flow.Steps)
	if err != nil {
		e.failRun(run, fmt.Sprintf("Failed to build execution plan: %v", err))
		return
	}

	// Build runtime artifact map for resolved content
	runArtifacts := make(map[string]*models.RuntimeArtifact)

	// Store input artifacts
	if run.Input != nil {
		for ref, val := range run.Input {
			e.storeInputArtifact(run.ID, ref, val, runArtifacts)
		}
	}

	// Build set of steps that are children of fanOut (executed inline by fanOut)
	fanOutChildren := make(map[string]bool)
	for _, step := range flow.Steps {
		if step.Type == models.StepTypeFanOut {
			for _, childID := range step.Steps {
				fanOutChildren[childID] = true
			}
		}
	}

	// Execute steps in order
	for _, stepID := range sortedSteps {
		// Skip steps that are children of fanOut (they run inside the fanOut step)
		if fanOutChildren[stepID] {
			continue
		}

		// Check for cancellation
		select {
		case <-rc.Ctx.Done():
			e.cancelRun(run)
			return
		default:
		}

		step, ok := flow.GetStep(stepID)
		if !ok {
			e.failRun(run, fmt.Sprintf("Step not found: %s", stepID))
			return
		}

		result := e.executeStep(rc, step, runArtifacts)

		// Handle exit steps
		switch result.Status {
		case "exit_success":
			run.SetStepStatus(stepID, "completed", "")
			e.completeRun(run)
			return
		case "exit_failure", "exit_blocked":
			errMsg := "exit"
			if result.Error != nil {
				errMsg = result.Error.Message
			}
			run.SetStepStatus(stepID, "completed", "")
			e.failRun(run, errMsg)
			return
		case "exit_cancelled":
			run.SetStepStatus(stepID, "completed", "")
			e.cancelRun(run)
			return
		case "failed":
			errMsg := "step execution failed"
			if result.Error != nil {
				errMsg = result.Error.Message
			}
			run.SetStepStatus(stepID, "failed", errMsg)
			e.emitEvent(run.ID, models.EventTypeStepFailed, stepID, errMsg)
			e.failRun(run, fmt.Sprintf("Step %s failed: %s", stepID, errMsg))
			return
		}

		// Store produced artifacts
		for _, art := range result.Artifacts {
			e.storeProducedArtifact(run.ID, stepID, &art, runArtifacts)
		}

		// Apply operator if defined on this step
		if step.Operator != nil && len(result.Artifacts) > 0 {
			transformed, err := applyOperator(step.Operator, result.Artifacts, runArtifacts)
			if err != nil {
				e.emitEvent(run.ID, models.EventTypeStepFailed, stepID,
					fmt.Sprintf("Operator %s failed: %v", step.Operator.Type, err))
				e.failRun(run, fmt.Sprintf("Step %s operator failed: %v", stepID, err))
				return
			}
			// Store transformed artifacts (these replace the originals for downstream)
			for _, art := range transformed {
				e.storeProducedArtifact(run.ID, stepID, &art, runArtifacts)
			}
			e.emitEvent(run.ID, models.EventTypeStepCompleted, stepID,
				fmt.Sprintf("Operator %s applied: %d -> %d artifacts", step.Operator.Type, len(result.Artifacts), len(transformed)))
		}

		run.SetStepStatus(stepID, "completed", "")
		e.emitEvent(run.ID, models.EventTypeStepCompleted, stepID, "Step completed")
		e.saveRun(run)
	}

	// Run completed successfully
	e.completeRun(run)
}

// executeStep dispatches to the appropriate step executor
func (e *LocalExecutor) executeStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	// Handle iteration wrapping: if a step has iteration config, run it through the iteration executor
	if step.Iteration != nil {
		return e.executeIterationStep(rc, step, runArtifacts)
	}

	switch step.Type {
	case models.StepTypeAction:
		return e.executeActionStep(rc, step, runArtifacts)
	case models.StepTypeFanOut:
		return e.executeFanOutStep(rc, step, runArtifacts)
	case models.StepTypeFanIn:
		return e.executeFanInStep(rc, step, runArtifacts)
	case models.StepTypeDecision:
		return e.executeDecisionStep(rc, step, runArtifacts)
	case models.StepTypeExit:
		return e.executeExitStep(rc, step)
	case models.StepTypeAwait:
		return e.executeAwaitStep(rc, step, runArtifacts)
	default:
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "UNKNOWN_STEP_TYPE",
				Message: fmt.Sprintf("Unknown step type: %s", step.Type),
			},
		}
	}
}

// executeActionStep executes a single action step
func (e *LocalExecutor) executeActionStep(rc *RunContext, step *models.Step, runArtifacts map[string]*models.RuntimeArtifact) *StepResult {
	run := rc.Run
	run.CurrentStep = step.ID
	run.SetStepStatus(step.ID, "running", "")
	e.emitEvent(run.ID, models.EventTypeStepStarted, step.ID, "Step started")
	e.saveRun(run)

	// Resolve adapter
	adapter, adapterConfig, err := e.registry.Resolve(step.ParticipantRef, rc.Flow)
	if err != nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "ADAPTER_RESOLVE_FAILED",
				Message: fmt.Sprintf("Failed to resolve adapter for %s: %v", step.ParticipantRef, err),
			},
		}
	}

	// Resolve consumed artifacts
	resolved := resolveConsumedArtifacts(step, rc.Flow, runArtifacts)

	// Build adapter input
	input := &models.AdapterInput{
		RunID:       run.ID,
		StepID:      step.ID,
		Participant: step.ParticipantRef,
		Artifacts:   resolved,
		Config:      adapterConfig,
	}

	// Execute adapter
	output, err := adapter.Execute(rc.Ctx, input)
	if err != nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error: &models.AdapterError{
				Code:    "ADAPTER_EXECUTION_ERROR",
				Message: err.Error(),
			},
		}
	}

	// Check adapter error
	if output.Error != nil {
		return &StepResult{
			StepID: step.ID,
			Status: "failed",
			Error:  output.Error,
		}
	}

	return &StepResult{
		StepID:    step.ID,
		Status:    "completed",
		Artifacts: output.Artifacts,
	}
}

// storeInputArtifact stores an input artifact from run input
func (e *LocalExecutor) storeInputArtifact(runID string, ref string, val any, runArtifacts map[string]*models.RuntimeArtifact) {
	var content []byte
	var contentType string

	switch v := val.(type) {
	case map[string]any:
		if ct, ok := v["contentType"].(string); ok {
			contentType = ct
		}
		if value, ok := v["value"]; ok {
			content, _ = marshalContent(value)
		}
	default:
		content, _ = marshalContent(val)
	}

	if contentType == "" {
		contentType = "application/json"
	}

	ra := &models.RuntimeArtifact{
		Artifact: models.Artifact{
			Ref:         ref,
			ContentType: contentType,
		},
		RunID:     runID,
		Content:   content,
		CreatedAt: time.Now(),
		Size:      int64(len(content)),
	}

	runArtifacts[ref] = ra
	e.store.ArtifactStore().Save(ra)
}

// storeProducedArtifact stores an artifact produced by a step
func (e *LocalExecutor) storeProducedArtifact(runID string, stepID string, art *models.ProducedArtifact, runArtifacts map[string]*models.RuntimeArtifact) {
	ra := &models.RuntimeArtifact{
		Artifact: models.Artifact{
			Ref:         art.Ref,
			ContentType: art.ContentType,
			Metadata:    art.Metadata,
		},
		RunID:     runID,
		StepID:    stepID,
		Content:   art.Content,
		CreatedAt: time.Now(),
		Size:      int64(len(art.Content)),
	}

	runArtifacts[art.Ref] = ra

	if err := e.store.ArtifactStore().Save(ra); err != nil {
		e.logger.WithError(err).Errorf("Failed to save artifact %s for run %s", art.Ref, runID)
	} else {
		e.emitEvent(runID, models.EventTypeArtifactProduced, stepID, fmt.Sprintf("Artifact produced: %s", art.Ref))
	}
}

// completeRun marks a run as completed
func (e *LocalExecutor) completeRun(run *models.Run) {
	now := time.Now()
	run.Status = models.RunStatusCompleted
	run.CompletedAt = &now
	run.CurrentStep = ""
	e.emitEvent(run.ID, models.EventTypeRunCompleted, "", "Run completed")
	e.saveRun(run)

	// Update flow run count
	e.store.FlowStore().UpdateRunCount(run.FlowID, now.Unix())
}

// failRun marks a run as failed
func (e *LocalExecutor) failRun(run *models.Run, errMsg string) {
	now := time.Now()
	run.Status = models.RunStatusFailed
	run.CompletedAt = &now
	run.Error = errMsg
	run.CurrentStep = ""
	e.emitEvent(run.ID, models.EventTypeRunFailed, "", errMsg)
	e.saveRun(run)

	e.store.FlowStore().UpdateRunCount(run.FlowID, now.Unix())
}

// cancelRun marks a run as cancelled
func (e *LocalExecutor) cancelRun(run *models.Run) {
	now := time.Now()
	run.Status = models.RunStatusCancelled
	run.CompletedAt = &now
	run.CurrentStep = ""
	e.saveRun(run)
}

// saveRun persists the current run state
func (e *LocalExecutor) saveRun(run *models.Run) {
	if err := e.store.RunStore().Save(run); err != nil {
		e.logger.WithError(err).Errorf("Failed to save run %s", run.ID)
	}
}

// emitEvent records a runtime event
func (e *LocalExecutor) emitEvent(runID string, eventType models.EventType, stepID string, message string) {
	event := models.NewEvent(runID, eventType, stepID, message)
	if err := e.store.EventStore().Save(event); err != nil {
		e.logger.WithError(err).Errorf("Failed to save event for run %s", runID)
	}
}
