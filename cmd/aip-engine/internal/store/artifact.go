package store

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/example/aip-engine/internal/models"
)

// artifactStore implements ArtifactStore
type artifactStore struct {
	*FileStore
}

// List returns all artifacts for a run
func (s *artifactStore) List(runID string) ([]*models.RuntimeArtifact, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir := filepath.Join(s.config.DataDir, "runs", runID, "artifacts")
	files, err := s.listFiles(dir)
	if err != nil {
		return nil, nil // No artifacts yet
	}

	var artifacts []*models.RuntimeArtifact
	for _, file := range files {
		path := filepath.Join(dir, file)
		var artifact models.RuntimeArtifact
		if err := s.readFile(path, &artifact); err != nil {
			continue
		}
		artifacts = append(artifacts, &artifact)
	}
	return artifacts, nil
}

// Get returns an artifact by run ID and ref
func (s *artifactStore) Get(runID string, ref string) (*models.RuntimeArtifact, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Encode ref for filename (refs contain special chars)
	encodedRef := encodeRef(ref)
	path := filepath.Join(s.config.DataDir, "runs", runID, "artifacts", encodedRef+".json")

	var artifact models.RuntimeArtifact
	if err := s.readFile(path, &artifact); err != nil {
		return nil, fmt.Errorf("artifact not found: %s", ref)
	}
	return &artifact, nil
}

// Save saves an artifact
func (s *artifactStore) Save(artifact *models.RuntimeArtifact) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure artifact directory exists
	dir := filepath.Join(s.config.DataDir, "runs", artifact.RunID, "artifacts")
	if err := ensureDir(dir); err != nil {
		return err
	}

	// Handle large artifacts
	if len(artifact.Content) > int(s.config.ArtifactSizeThreshold) {
		contentPath := filepath.Join(dir, encodeRef(artifact.Ref)+".content")
		if err := os.WriteFile(contentPath, artifact.Content, 0644); err != nil {
			return err
		}
		artifact.ContentPath = contentPath
		artifact.Size = int64(len(artifact.Content))
		artifact.Content = nil // Don't store inline
	} else {
		artifact.Size = int64(len(artifact.Content))
	}

	artifact.CreatedAt = time.Now()

	// Save metadata
	encodedRef := encodeRef(artifact.Ref)
	path := filepath.Join(dir, encodedRef+".json")
	return s.writeFile(path, artifact)
}

// DeleteRun removes all artifacts for a run
func (s *artifactStore) DeleteRun(runID string) error {
	dir := filepath.Join(s.config.DataDir, "runs", runID, "artifacts")
	return removeDir(dir)
}

// encodeRef encodes an artifact ref for use as a filename
func encodeRef(ref string) string {
	return base64.URLEncoding.EncodeToString([]byte(ref))
}

// decodeRef decodes a filename back to an artifact ref
func decodeRef(encoded string) (string, error) {
	decoded, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}
