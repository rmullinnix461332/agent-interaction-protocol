package runner

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/agent-interaction-protocol/aip/internal/graph"
	"github.com/agent-interaction-protocol/aip/internal/loader"
)

// Mock represents a mock participant response.
type Mock struct {
	ParticipantID string                 `json:"participantId"`
	Output        map[string]any `json:"output"`
	Status        string                 `json:"status"` // "success" or "failure"
}

// Result captures the outcome of a test run.
type Result struct {
	Steps []StepResult
}

type StepResult struct {
	ID     string
	Status string
	Output any
}

func (r *Result) Summary() string {
	var sb strings.Builder
	sb.WriteString("Test Run Summary:\n")
	passed := 0
	for _, s := range r.Steps {
		icon := "✓"
		if s.Status != "success" {
			icon = "✗"
		} else {
			passed++
		}
		sb.WriteString(fmt.Sprintf("  %s %s [%s]\n", icon, s.ID, s.Status))
	}
	sb.WriteString(fmt.Sprintf("\n%d/%d steps passed\n", passed, len(r.Steps)))
	return sb.String()
}

// Execute runs the flow using mock participants.
func Execute(flow *loader.Flow, mockDir string) (*Result, error) {
	mocks, err := loadMocks(mockDir)
	if err != nil {
		return nil, err
	}

	stages, err := graph.TopoSort(flow)
	if err != nil {
		return nil, err
	}

	result := &Result{}
	for _, stage := range stages {
		for _, stepID := range stage {
			step := findStep(flow, stepID)
			if step == nil {
				continue
			}

			sr := StepResult{ID: stepID, Status: "success"}

			if step.ParticipantRef != "" {
				mock, ok := mocks[step.ParticipantRef]
				if ok {
					sr.Status = mock.Status
					sr.Output = mock.Output
				} else {
					sr.Status = "success"
					sr.Output = map[string]string{"mock": "default pass-through"}
				}
			}

			// Handle exit steps
			if step.Type == "exit" {
				if status, ok := step.Exit["status"].(string); ok {
					sr.Status = status
				}
			}

			result.Steps = append(result.Steps, sr)
		}
	}

	return result, nil
}

func loadMocks(dir string) (map[string]*Mock, error) {
	mocks := map[string]*Mock{}

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return mocks, nil // No mocks dir is fine
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read mocks dir: %w", err)
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return nil, fmt.Errorf("read mock %s: %w", e.Name(), err)
		}
		var m Mock
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("parse mock %s: %w", e.Name(), err)
		}
		mocks[m.ParticipantID] = &m
	}

	return mocks, nil
}

func findStep(flow *loader.Flow, id string) *loader.Step {
	for i := range flow.Steps {
		if flow.Steps[i].ID == id {
			return &flow.Steps[i]
		}
	}
	return nil
}
