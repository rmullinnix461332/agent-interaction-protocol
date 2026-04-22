package executor

import (
	"context"

	"github.com/example/aip-engine/internal/models"
)

// Executor coordinates flow execution
type Executor interface {
	// Start begins execution of a run
	Start(ctx context.Context, run *models.Run, flow *models.ConnectedFlow) error
	// Stop halts a running execution
	Stop(ctx context.Context, runID string) error
	// Resume sends a resume payload to an awaiting run
	Resume(ctx context.Context, runID string, payload *models.ResumePayload) error
	// IsRunning returns whether a run is actively executing
	IsRunning(runID string) bool
}

// Adapter is the interface for participant implementations
type Adapter interface {
	// Execute invokes the participant with resolved inputs
	Execute(ctx context.Context, input *models.AdapterInput) (*models.AdapterOutput, error)
}

// AdapterRegistry manages participant adapters
type AdapterRegistry interface {
	// Resolve returns the adapter for a participant
	Resolve(participantRef string, flow *models.ConnectedFlow) (Adapter, map[string]any, error)
}

// StepResult captures the outcome of a single step execution
type StepResult struct {
	StepID    string
	Status    string // "completed", "failed", "awaiting"
	Artifacts []models.ProducedArtifact
	Error     *models.AdapterError
}

// RunContext carries execution state through a run
type RunContext struct {
	Ctx      context.Context
	Cancel   context.CancelFunc
	Run      *models.Run
	Flow     *models.ConnectedFlow
	ResumeCh chan *models.ResumePayload // Channel for await/resume signaling
}
