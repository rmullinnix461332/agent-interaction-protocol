package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/example/aip-engine/internal/models"
)

// flowStore implements FlowStore
type flowStore struct {
	*FileStore
}

// List returns all connected flows
func (s *flowStore) List() ([]*models.ConnectedFlow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir := filepath.Join(s.config.DataDir, "flows")
	files, err := s.listFiles(dir)
	if err != nil {
		return nil, err
	}

	var flows []*models.ConnectedFlow
	for _, file := range files {
		path := filepath.Join(dir, file)
		var flow models.ConnectedFlow
		if err := s.readFile(path, &flow); err != nil {
			continue // skip invalid files
		}
		flows = append(flows, &flow)
	}
	return flows, nil
}

// Get returns a flow by ID
func (s *flowStore) Get(flowID string) (*models.ConnectedFlow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	path := filepath.Join(s.config.DataDir, "flows", flowID+".json")
	var flow models.ConnectedFlow
	if err := s.readFile(path, &flow); err != nil {
		return nil, fmt.Errorf("flow not found: %s", flowID)
	}
	return &flow, nil
}

// Save saves a flow
func (s *flowStore) Save(flow *models.ConnectedFlow) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := filepath.Join(s.config.DataDir, "flows", flow.Metadata.Name+".json")
	return s.writeFile(path, flow)
}

// Delete removes a flow
func (s *flowStore) Delete(flowID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := filepath.Join(s.config.DataDir, "flows", flowID+".json")
	return s.deleteFile(path)
}

// UpdateRunCount increments the run count for a flow
func (s *flowStore) UpdateRunCount(flowID string, lastRunAt int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := filepath.Join(s.config.DataDir, "flows", flowID+".json")
	var flow models.ConnectedFlow
	if err := s.readFile(path, &flow); err != nil {
		return err
	}

	flow.RunCount++
	t := time.Unix(lastRunAt, 0)
	flow.LastRunAt = &t

	return s.writeFile(path, &flow)
}

// SaveEngineMetadata saves engine identity
func (fs *FileStore) SaveEngineMetadata(name, engineType, version string) error {
	path := filepath.Join(fs.config.DataDir, "engine.json")
	meta := map[string]string{
		"name":    name,
		"type":    engineType,
		"version": version,
	}
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// LoadEngineMetadata loads engine identity
func (fs *FileStore) LoadEngineMetadata() (map[string]string, error) {
	path := filepath.Join(fs.config.DataDir, "engine.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var meta map[string]string
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	return meta, nil
}
