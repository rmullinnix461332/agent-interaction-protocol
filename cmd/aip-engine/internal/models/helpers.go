package models

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// GenerateID generates a random ID for runs, events, etc.
func GenerateID(prefix string) string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%s-%s", prefix, hex.EncodeToString(b))
}

// NewRun creates a new run instance
func NewRun(flow *ConnectedFlow, input map[string]any) *Run {
	now := time.Now()
	return &Run{
		ID:           GenerateID("run"),
		FlowID:       flow.Metadata.Name,
		FlowName:     flow.Metadata.Name,
		Status:       RunStatusPending,
		StartedAt:    now,
		StepStatuses: make(map[string]StepStatus),
		Input:        input,
	}
}

// NewEvent creates a new event instance
func NewEvent(runID string, eventType EventType, stepID string, message string) *Event {
	return &Event{
		ID:        GenerateID("evt"),
		RunID:     runID,
		Type:      eventType,
		StepID:    stepID,
		Timestamp: time.Now(),
		Message:   message,
		Data:      make(map[string]any),
	}
}

// NewConnectedFlow creates a new connected flow from a flow definition
func NewConnectedFlow(flow Flow) *ConnectedFlow {
	return &ConnectedFlow{
		Flow:        flow,
		InstalledAt: time.Now(),
		RunCount:    0,
		Status:      "connected",
	}
}

// GetStep returns a step by ID
func (f *Flow) GetStep(stepID string) (*Step, bool) {
	for i := range f.Steps {
		if f.Steps[i].ID == stepID {
			return &f.Steps[i], true
		}
	}
	return nil, false
}

// GetParticipant returns a participant by ID
func (f *Flow) GetParticipant(participantID string) (*Participant, bool) {
	for i := range f.Participants {
		if f.Participants[i].ID == participantID {
			return &f.Participants[i], true
		}
	}
	return nil, false
}

// GetArtifact returns an artifact by ref
func (f *Flow) GetArtifact(ref string) (*Artifact, bool) {
	for i := range f.Artifacts {
		if f.Artifacts[i].Ref == ref {
			return &f.Artifacts[i], true
		}
	}
	return nil, false
}

// GetEntrySteps returns steps with no dependencies (entry points)
func (f *Flow) GetEntrySteps() []string {
	var entrySteps []string
	for _, step := range f.Steps {
		if len(step.DependsOn) == 0 {
			entrySteps = append(entrySteps, step.ID)
		}
	}
	return entrySteps
}

// IsComplete returns true if the run is in a terminal state
func (r *Run) IsComplete() bool {
	return r.Status == RunStatusCompleted ||
		r.Status == RunStatusFailed ||
		r.Status == RunStatusCancelled
}

// SetStepStatus updates the status of a step
func (r *Run) SetStepStatus(stepID string, status string, errMsg string) {
	now := time.Now()
	ss, exists := r.StepStatuses[stepID]
	if !exists {
		ss = StepStatus{}
	}
	ss.Status = status
	if status == "running" {
		ss.StartedAt = &now
	} else if status == "completed" || status == "failed" {
		ss.CompletedAt = &now
		ss.Error = errMsg
	}
	r.StepStatuses[stepID] = ss
}
