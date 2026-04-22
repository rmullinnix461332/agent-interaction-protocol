package executor

import (
	"encoding/json"

	"github.com/example/aip-engine/internal/models"
)

// topologicalSort returns step IDs in dependency order
func topologicalSort(steps []models.Step) ([]string, error) {
	// Build adjacency and in-degree maps
	inDegree := make(map[string]int)
	dependents := make(map[string][]string)

	for _, step := range steps {
		if _, exists := inDegree[step.ID]; !exists {
			inDegree[step.ID] = 0
		}
		for _, dep := range step.DependsOn {
			dependents[dep] = append(dependents[dep], step.ID)
			inDegree[step.ID]++
		}
	}

	// Start with steps that have no dependencies
	var queue []string
	for _, step := range steps {
		if inDegree[step.ID] == 0 {
			queue = append(queue, step.ID)
		}
	}

	var sorted []string
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		sorted = append(sorted, current)

		for _, dep := range dependents[current] {
			inDegree[dep]--
			if inDegree[dep] == 0 {
				queue = append(queue, dep)
			}
		}
	}

	return sorted, nil
}

// resolveConsumedArtifacts resolves artifact refs for a step into ResolvedArtifacts
func resolveConsumedArtifacts(
	step *models.Step,
	flow *models.ConnectedFlow,
	runArtifacts map[string]*models.RuntimeArtifact,
) []models.ResolvedArtifact {
	var resolved []models.ResolvedArtifact

	for _, ref := range step.Consumes {
		ra := models.ResolvedArtifact{
			Ref:         ref,
			ContentType: "application/octet-stream",
		}

		// Check flow artifact definition for metadata
		if flowArt, ok := flow.GetArtifact(ref); ok {
			if flowArt.ContentType != "" {
				ra.ContentType = flowArt.ContentType
			}
			ra.Metadata = flowArt.Metadata
		}

		// Resolve content from runtime artifacts
		if runtimeArt, ok := runArtifacts[ref]; ok {
			ra.Content = runtimeArt.Content
			ra.HasContent = len(runtimeArt.Content) > 0
			if runtimeArt.ContentType != "" {
				ra.ContentType = runtimeArt.ContentType
			}
		}

		resolved = append(resolved, ra)
	}

	return resolved
}

// tryParseJSON attempts to parse bytes as JSON
func tryParseJSON(data []byte) any {
	if len(data) == 0 {
		return nil
	}
	var v any
	if err := json.Unmarshal(data, &v); err != nil {
		return nil
	}
	return v
}

// toFloat64 attempts to convert a value to float64
func toFloat64(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case int32:
		return float64(n), true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	default:
		return 0, false
	}
}
