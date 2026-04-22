package store

import (
	"fmt"
	"path/filepath"

	"github.com/example/aip-engine/internal/models"
)

// participantStore implements ParticipantStore
type participantStore struct {
	*FileStore
}

// List returns all participant bindings
func (s *participantStore) List() ([]*models.ParticipantBinding, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir := filepath.Join(s.config.DataDir, "participants")
	files, err := s.listFiles(dir)
	if err != nil {
		return nil, err
	}

	var bindings []*models.ParticipantBinding
	for _, file := range files {
		path := filepath.Join(dir, file)
		var binding models.ParticipantBinding
		if err := s.readFile(path, &binding); err != nil {
			continue
		}
		bindings = append(bindings, &binding)
	}
	return bindings, nil
}

// Get returns a participant binding by ID
func (s *participantStore) Get(participantID string) (*models.ParticipantBinding, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	path := filepath.Join(s.config.DataDir, "participants", participantID+".json")
	var binding models.ParticipantBinding
	if err := s.readFile(path, &binding); err != nil {
		return nil, fmt.Errorf("participant binding not found: %s", participantID)
	}
	return &binding, nil
}

// Save saves a participant binding
func (s *participantStore) Save(binding *models.ParticipantBinding) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := filepath.Join(s.config.DataDir, "participants", binding.ParticipantRef+".json")
	return s.writeFile(path, binding)
}

// Delete removes a participant binding
func (s *participantStore) Delete(participantID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := filepath.Join(s.config.DataDir, "participants", participantID+".json")
	return s.deleteFile(path)
}
