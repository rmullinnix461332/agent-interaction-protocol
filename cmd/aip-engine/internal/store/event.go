package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/example/aip-engine/internal/models"
)

// eventStore implements EventStore
type eventStore struct {
	*FileStore
	eventMu sync.Mutex // Separate mutex for event file operations
}

// List returns all events for a run
func (s *eventStore) List(runID string) ([]*models.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	path := filepath.Join(s.config.DataDir, "runs", runID, "events.json")

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var events []*models.Event
	if err := json.Unmarshal(data, &events); err != nil {
		return nil, err
	}
	return events, nil
}

// Save saves an event
func (s *eventStore) Save(event *models.Event) error {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()

	// Ensure run directory exists
	runDir := filepath.Join(s.config.DataDir, "runs", event.RunID)
	if err := ensureDir(runDir); err != nil {
		return err
	}

	path := filepath.Join(runDir, "events.json")

	// Read existing events
	var events []*models.Event
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, &events)
	}

	// Append new event
	events = append(events, event)

	// Write back
	data, err = json.MarshalIndent(events, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// DeleteRun removes all events for a run
func (s *eventStore) DeleteRun(runID string) error {
	path := filepath.Join(s.config.DataDir, "runs", runID, "events.json")
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
