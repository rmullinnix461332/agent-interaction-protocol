package service

import (
	"context"
	"fmt"

	"github.com/example/aip-engine/internal/executor"
	"github.com/example/aip-engine/internal/models"
	"github.com/example/aip-engine/internal/store"
	"github.com/sirupsen/logrus"
)

// RunService manages run lifecycle
type RunService struct {
	store    *store.FileStore
	executor *executor.LocalExecutor
	logger   logrus.FieldLogger
}

// NewRunService creates a new run service
func NewRunService(fs *store.FileStore, exec *executor.LocalExecutor, logger logrus.FieldLogger) *RunService {
	return &RunService{
		store:    fs,
		executor: exec,
		logger:   logger,
	}
}

// StartRun creates and starts a new run for a flow
func (s *RunService) StartRun(ctx context.Context, flowID string, input map[string]any) (*models.Run, error) {
	// Get flow
	flow, err := s.store.FlowStore().Get(flowID)
	if err != nil {
		return nil, fmt.Errorf("flow not found: %s", flowID)
	}

	// Create run
	run := models.NewRun(flow, input)

	// Save initial run state
	if err := s.store.RunStore().Save(run); err != nil {
		return nil, fmt.Errorf("failed to save run: %w", err)
	}

	s.logger.WithField("runId", run.ID).WithField("flowId", flowID).Info("Starting run")

	// Start execution with a detached context (not tied to HTTP request)
	execCtx := context.Background()
	if err := s.executor.Start(execCtx, run, flow); err != nil {
		return nil, fmt.Errorf("failed to start execution: %w", err)
	}

	return run, nil
}

// StopRun stops a running execution
func (s *RunService) StopRun(ctx context.Context, runID string) error {
	run, err := s.store.RunStore().Get(runID)
	if err != nil {
		return fmt.Errorf("run not found: %s", runID)
	}

	if run.IsComplete() {
		return fmt.Errorf("run %s is already in terminal state: %s", runID, run.Status)
	}

	s.logger.WithField("runId", runID).Info("Stopping run")
	return s.executor.Stop(ctx, runID)
}

// ResumeRun resumes an awaiting run with the given payload
func (s *RunService) ResumeRun(ctx context.Context, runID string, payload *models.ResumePayload) error {
	run, err := s.store.RunStore().Get(runID)
	if err != nil {
		return fmt.Errorf("run not found: %s", runID)
	}

	if run.Status != models.RunStatusAwaiting {
		return fmt.Errorf("run %s is not in awaiting state (current: %s)", runID, run.Status)
	}

	s.logger.WithField("runId", runID).Info("Resuming run")
	return s.executor.Resume(ctx, runID, payload)
}

// GetRun returns a run by ID
func (s *RunService) GetRun(runID string) (*models.Run, error) {
	return s.store.RunStore().Get(runID)
}

// ListRuns returns all runs matching the filter
func (s *RunService) ListRuns(filter store.RunFilter) ([]*models.Run, error) {
	return s.store.RunStore().List(filter)
}

// GetRunArtifacts returns all artifacts for a run
func (s *RunService) GetRunArtifacts(runID string) ([]*models.RuntimeArtifact, error) {
	// Verify run exists
	if _, err := s.store.RunStore().Get(runID); err != nil {
		return nil, fmt.Errorf("run not found: %s", runID)
	}
	return s.store.ArtifactStore().List(runID)
}

// GetRunArtifact returns a specific artifact for a run
func (s *RunService) GetRunArtifact(runID string, ref string) (*models.RuntimeArtifact, error) {
	if _, err := s.store.RunStore().Get(runID); err != nil {
		return nil, fmt.Errorf("run not found: %s", runID)
	}
	return s.store.ArtifactStore().Get(runID, ref)
}

// GetRunEvents returns all events for a run
func (s *RunService) GetRunEvents(runID string) ([]*models.Event, error) {
	if _, err := s.store.RunStore().Get(runID); err != nil {
		return nil, fmt.Errorf("run not found: %s", runID)
	}
	return s.store.EventStore().List(runID)
}
