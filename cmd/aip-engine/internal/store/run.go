package store

import (
	"fmt"
	"path/filepath"
	"sort"

	"github.com/example/aip-engine/internal/models"
)

// runStore implements RunStore
type runStore struct {
	*FileStore
}

// List returns all runs, optionally filtered
func (s *runStore) List(filter RunFilter) ([]*models.Run, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir := filepath.Join(s.config.DataDir, "runs")
	files, err := s.listFiles(dir)
	if err != nil {
		return nil, err
	}

	var runs []*models.Run
	for _, file := range files {
		path := filepath.Join(dir, file)
		var run models.Run
		if err := s.readFile(path, &run); err != nil {
			continue
		}

		// Apply filters
		if filter.FlowID != "" && run.FlowID != filter.FlowID {
			continue
		}
		if filter.Status != "" && string(run.Status) != filter.Status {
			continue
		}

		runs = append(runs, &run)
	}

	// Sort by startedAt descending
	sort.Slice(runs, func(i, j int) bool {
		return runs[i].StartedAt.After(runs[j].StartedAt)
	})

	// Apply pagination
	if filter.Offset > 0 && filter.Offset < len(runs) {
		runs = runs[filter.Offset:]
	}
	if filter.Limit > 0 && filter.Limit < len(runs) {
		runs = runs[:filter.Limit]
	}

	return runs, nil
}

// Get returns a run by ID
func (s *runStore) Get(runID string) (*models.Run, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	path := filepath.Join(s.config.DataDir, "runs", runID+".json")
	var run models.Run
	if err := s.readFile(path, &run); err != nil {
		return nil, fmt.Errorf("run not found: %s", runID)
	}
	return &run, nil
}

// Save saves a run
func (s *runStore) Save(run *models.Run) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure run directory exists
	runDir := filepath.Join(s.config.DataDir, "runs", run.ID)
	if err := ensureDir(runDir); err != nil {
		return err
	}

	path := filepath.Join(s.config.DataDir, "runs", run.ID+".json")
	return s.writeFile(path, run)
}

// Delete removes a run
func (s *runStore) Delete(runID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Remove run file
	path := filepath.Join(s.config.DataDir, "runs", runID+".json")
	if err := s.deleteFile(path); err != nil && !isNotExist(err) {
		return err
	}

	// Remove run directory
	runDir := filepath.Join(s.config.DataDir, "runs", runID)
	return removeDir(runDir)
}
