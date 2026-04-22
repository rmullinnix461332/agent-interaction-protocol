package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// FileStore implements all stores using the filesystem
type FileStore struct {
	config StoreConfig
	mu     sync.RWMutex
}

// New creates a new FileStore
func New(config StoreConfig) (*FileStore, error) {
	fs := &FileStore{
		config: config,
	}

	// Ensure directories exist
	dirs := []string{
		config.DataDir,
		filepath.Join(config.DataDir, "flows"),
		filepath.Join(config.DataDir, "runs"),
		filepath.Join(config.DataDir, "participants"),
		filepath.Join(config.DataDir, "diagnostics"),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return fs, nil
}

// readFile reads and unmarshals a JSON file
func (fs *FileStore) readFile(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// writeFile marshals and writes to a JSON file
func (fs *FileStore) writeFile(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// deleteFile removes a file
func (fs *FileStore) deleteFile(path string) error {
	return os.Remove(path)
}

// fileExists checks if a file exists
func (fs *FileStore) fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// listFiles lists all JSON files in a directory
func (fs *FileStore) listFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			files = append(files, entry.Name())
		}
	}
	return files, nil
}

// FlowStore returns the flow store
func (fs *FileStore) FlowStore() FlowStore {
	return &flowStore{fs}
}

// RunStore returns the run store
func (fs *FileStore) RunStore() RunStore {
	return &runStore{fs}
}

// ArtifactStore returns the artifact store
func (fs *FileStore) ArtifactStore() ArtifactStore {
	return &artifactStore{fs}
}

// EventStore returns the event store
func (fs *FileStore) EventStore() EventStore {
	return &eventStore{FileStore: fs}
}

// ParticipantStore returns the participant store
func (fs *FileStore) ParticipantStore() ParticipantStore {
	return &participantStore{fs}
}
