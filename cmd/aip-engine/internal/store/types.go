package store

import "github.com/example/aip-engine/internal/models"

// StoreConfig holds store configuration
type StoreConfig struct {
	DataDir               string
	ArtifactSizeThreshold int64
}

// FlowStore handles flow persistence
type FlowStore interface {
	// List returns all connected flows
	List() ([]*models.ConnectedFlow, error)
	// Get returns a flow by ID
	Get(flowID string) (*models.ConnectedFlow, error)
	// Save saves a flow
	Save(flow *models.ConnectedFlow) error
	// Delete removes a flow
	Delete(flowID string) error
	// UpdateRunCount increments the run count for a flow
	UpdateRunCount(flowID string, lastRunAt int64) error
}

// RunStore handles run persistence
type RunStore interface {
	// List returns all runs, optionally filtered
	List(filter RunFilter) ([]*models.Run, error)
	// Get returns a run by ID
	Get(runID string) (*models.Run, error)
	// Save saves a run
	Save(run *models.Run) error
	// Delete removes a run
	Delete(runID string) error
}

// RunFilter filters run queries
type RunFilter struct {
	FlowID string
	Status string
	Limit  int
	Offset int
}

// ArtifactStore handles artifact persistence
type ArtifactStore interface {
	// List returns all artifacts for a run
	List(runID string) ([]*models.RuntimeArtifact, error)
	// Get returns an artifact by run ID and ref
	Get(runID string, ref string) (*models.RuntimeArtifact, error)
	// Save saves an artifact
	Save(artifact *models.RuntimeArtifact) error
	// Delete removes all artifacts for a run
	DeleteRun(runID string) error
}

// EventStore handles event persistence
type EventStore interface {
	// List returns all events for a run
	List(runID string) ([]*models.Event, error)
	// Save saves an event
	Save(event *models.Event) error
	// Delete removes all events for a run
	DeleteRun(runID string) error
}

// ParticipantStore handles participant binding persistence
type ParticipantStore interface {
	// List returns all participant bindings
	List() ([]*models.ParticipantBinding, error)
	// Get returns a participant binding by ID
	Get(participantID string) (*models.ParticipantBinding, error)
	// Save saves a participant binding
	Save(binding *models.ParticipantBinding) error
	// Delete removes a participant binding
	Delete(participantID string) error
}
