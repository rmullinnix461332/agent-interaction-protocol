package service

import (
	"context"
	"sort"
	"time"

	"github.com/example/aip-engine/config"
	"github.com/example/aip-engine/internal/store"
	"github.com/sirupsen/logrus"
)

// RetentionService periodically cleans up old runs
type RetentionService struct {
	store  *store.FileStore
	config config.RetentionConfig
	logger logrus.FieldLogger
}

// NewRetentionService creates a new retention service
func NewRetentionService(fs *store.FileStore, cfg config.RetentionConfig, logger logrus.FieldLogger) *RetentionService {
	return &RetentionService{
		store:  fs,
		config: cfg,
		logger: logger,
	}
}

// Start begins the retention cleanup loop
func (s *RetentionService) Start(ctx context.Context) {
	// Run cleanup immediately on start
	s.cleanup()

	// Then run every 10 minutes
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.cleanup()
		}
	}
}

// cleanup enforces retention policy
func (s *RetentionService) cleanup() {
	runs, err := s.store.RunStore().List(store.RunFilter{})
	if err != nil {
		s.logger.WithError(err).Warn("Retention: failed to list runs")
		return
	}

	// Only clean up completed runs (not active ones)
	var completed []*completedRun
	for _, run := range runs {
		if run.IsComplete() && run.CompletedAt != nil {
			completed = append(completed, &completedRun{
				id:          run.ID,
				completedAt: *run.CompletedAt,
			})
		}
	}

	// Sort oldest first
	sort.Slice(completed, func(i, j int) bool {
		return completed[i].completedAt.Before(completed[j].completedAt)
	})

	deleted := 0

	// Enforce maxAge
	maxAge, err := s.config.MaxAgeDuration()
	if err == nil && maxAge > 0 {
		cutoff := time.Now().Add(-maxAge)
		for _, cr := range completed {
			if cr.completedAt.Before(cutoff) {
				s.deleteRun(cr.id)
				deleted++
			}
		}
	}

	// Enforce maxRuns (after age cleanup)
	if s.config.MaxRuns > 0 {
		remaining := len(completed) - deleted
		excess := remaining - s.config.MaxRuns
		if excess > 0 {
			idx := 0
			for _, cr := range completed {
				if idx >= excess {
					break
				}
				s.deleteRun(cr.id)
				deleted++
				idx++
			}
		}
	}

	if deleted > 0 {
		s.logger.Infof("Retention: cleaned up %d runs", deleted)
	}
}

// deleteRun removes a run and its associated data
func (s *RetentionService) deleteRun(runID string) {
	if err := s.store.ArtifactStore().DeleteRun(runID); err != nil {
		s.logger.WithError(err).Warnf("Retention: failed to delete artifacts for run %s", runID)
	}
	if err := s.store.EventStore().DeleteRun(runID); err != nil {
		s.logger.WithError(err).Warnf("Retention: failed to delete events for run %s", runID)
	}
	if err := s.store.RunStore().Delete(runID); err != nil {
		s.logger.WithError(err).Warnf("Retention: failed to delete run %s", runID)
	}
}

type completedRun struct {
	id          string
	completedAt time.Time
}
