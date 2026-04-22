package store

import (
	"os"
	"testing"

	"github.com/example/aip-engine/internal/models"
)

func setupTestStore(t *testing.T) *FileStore {
	t.Helper()
	dir, err := os.MkdirTemp("", "aip-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })

	fs, err := New(StoreConfig{DataDir: dir, ArtifactSizeThreshold: 1024})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	return fs
}

func TestFlowStore_CRUD(t *testing.T) {
	fs := setupTestStore(t)
	store := fs.FlowStore()

	flow := models.NewConnectedFlow(models.Flow{
		APIVersion: "aip/v0.1",
		Kind:       "Flow",
		Metadata:   models.FlowMetadata{Name: "test-flow", Title: "Test"},
		Participants: []models.Participant{
			{ID: "a", Kind: models.ParticipantKindAgent},
		},
		Steps: []models.Step{
			{ID: "s1", Type: models.StepTypeAction, ParticipantRef: "a"},
		},
	})

	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "save and get",
			fn: func(t *testing.T) {
				if err := store.Save(flow); err != nil {
					t.Fatalf("Save: %v", err)
				}
				got, err := store.Get("test-flow")
				if err != nil {
					t.Fatalf("Get: %v", err)
				}
				if got.Metadata.Name != "test-flow" {
					t.Errorf("Name = %q, want %q", got.Metadata.Name, "test-flow")
				}
			},
		},
		{
			name: "list",
			fn: func(t *testing.T) {
				flows, err := store.List()
				if err != nil {
					t.Fatalf("List: %v", err)
				}
				if len(flows) != 1 {
					t.Errorf("got %d flows, want 1", len(flows))
				}
			},
		},
		{
			name: "get not found",
			fn: func(t *testing.T) {
				_, err := store.Get("nonexistent")
				if err == nil {
					t.Error("expected error for missing flow")
				}
			},
		},
		{
			name: "update run count",
			fn: func(t *testing.T) {
				if err := store.UpdateRunCount("test-flow", 1000); err != nil {
					t.Fatalf("UpdateRunCount: %v", err)
				}
				got, _ := store.Get("test-flow")
				if got.RunCount != 1 {
					t.Errorf("RunCount = %d, want 1", got.RunCount)
				}
			},
		},
		{
			name: "delete",
			fn: func(t *testing.T) {
				if err := store.Delete("test-flow"); err != nil {
					t.Fatalf("Delete: %v", err)
				}
				_, err := store.Get("test-flow")
				if err == nil {
					t.Error("expected error after delete")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestRunStore_CRUD(t *testing.T) {
	fs := setupTestStore(t)
	store := fs.RunStore()

	run := &models.Run{
		ID:           "run-test-1",
		FlowID:       "flow-1",
		FlowName:     "flow-1",
		Status:       models.RunStatusPending,
		StepStatuses: make(map[string]models.StepStatus),
	}

	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "save and get",
			fn: func(t *testing.T) {
				if err := store.Save(run); err != nil {
					t.Fatalf("Save: %v", err)
				}
				got, err := store.Get("run-test-1")
				if err != nil {
					t.Fatalf("Get: %v", err)
				}
				if got.FlowID != "flow-1" {
					t.Errorf("FlowID = %q, want %q", got.FlowID, "flow-1")
				}
			},
		},
		{
			name: "list with filter",
			fn: func(t *testing.T) {
				runs, err := store.List(RunFilter{FlowID: "flow-1"})
				if err != nil {
					t.Fatalf("List: %v", err)
				}
				if len(runs) != 1 {
					t.Errorf("got %d runs, want 1", len(runs))
				}
			},
		},
		{
			name: "list filter no match",
			fn: func(t *testing.T) {
				runs, err := store.List(RunFilter{FlowID: "other"})
				if err != nil {
					t.Fatalf("List: %v", err)
				}
				if len(runs) != 0 {
					t.Errorf("got %d runs, want 0", len(runs))
				}
			},
		},
		{
			name: "delete",
			fn: func(t *testing.T) {
				if err := store.Delete("run-test-1"); err != nil {
					t.Fatalf("Delete: %v", err)
				}
				_, err := store.Get("run-test-1")
				if err == nil {
					t.Error("expected error after delete")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestEventStore_CRUD(t *testing.T) {
	fs := setupTestStore(t)
	store := fs.EventStore()

	event := models.NewEvent("run-1", models.EventTypeRunStarted, "", "Run started")

	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "save and list",
			fn: func(t *testing.T) {
				if err := store.Save(event); err != nil {
					t.Fatalf("Save: %v", err)
				}
				events, err := store.List("run-1")
				if err != nil {
					t.Fatalf("List: %v", err)
				}
				if len(events) != 1 {
					t.Errorf("got %d events, want 1", len(events))
				}
			},
		},
		{
			name: "list empty run",
			fn: func(t *testing.T) {
				events, err := store.List("run-nonexistent")
				if err != nil {
					t.Fatalf("List: %v", err)
				}
				if len(events) != 0 {
					t.Errorf("got %d events, want 0", len(events))
				}
			},
		},
		{
			name: "delete run events",
			fn: func(t *testing.T) {
				if err := store.DeleteRun("run-1"); err != nil {
					t.Fatalf("DeleteRun: %v", err)
				}
				events, _ := store.List("run-1")
				if len(events) != 0 {
					t.Errorf("got %d events after delete, want 0", len(events))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestEngineMetadata(t *testing.T) {
	fs := setupTestStore(t)

	if err := fs.SaveEngineMetadata("test-engine", "local", "0.1.0"); err != nil {
		t.Fatalf("SaveEngineMetadata: %v", err)
	}

	meta, err := fs.LoadEngineMetadata()
	if err != nil {
		t.Fatalf("LoadEngineMetadata: %v", err)
	}

	tests := []struct {
		key  string
		want string
	}{
		{key: "name", want: "test-engine"},
		{key: "type", want: "local"},
		{key: "version", want: "0.1.0"},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			if meta[tt.key] != tt.want {
				t.Errorf("%s = %q, want %q", tt.key, meta[tt.key], tt.want)
			}
		})
	}
}
