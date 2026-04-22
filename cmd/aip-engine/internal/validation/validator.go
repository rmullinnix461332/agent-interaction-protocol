package validation

import (
	"fmt"
	"strings"

	"github.com/example/aip-engine/internal/models"
)

// Validator validates AIP flows
type Validator struct{}

// NewValidator creates a new validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidationResult contains validation errors
type ValidationResult struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}

// Validate validates a flow definition
func (v *Validator) Validate(flow *models.Flow) *ValidationResult {
	var errors []string

	// Check required fields
	if flow.APIVersion == "" {
		errors = append(errors, "apiVersion is required")
	}
	if flow.Kind != "Flow" {
		errors = append(errors, "kind must be 'Flow'")
	}
	if flow.Metadata.Name == "" {
		errors = append(errors, "metadata.name is required")
	}
	if len(flow.Participants) == 0 {
		errors = append(errors, "at least one participant is required")
	}
	if len(flow.Steps) == 0 {
		errors = append(errors, "at least one step is required")
	}

	// Validate participants
	participantIDs := make(map[string]bool)
	for _, p := range flow.Participants {
		if p.ID == "" {
			errors = append(errors, "participant id is required")
			continue
		}
		if participantIDs[p.ID] {
			errors = append(errors, fmt.Sprintf("duplicate participant id: %s", p.ID))
		}
		participantIDs[p.ID] = true

		if p.Kind == models.ParticipantKindSubflow && p.FlowRef == "" {
			errors = append(errors, fmt.Sprintf("subflow participant %s requires flowRef", p.ID))
		}
	}

	// Validate steps
	stepIDs := make(map[string]bool)
	for _, step := range flow.Steps {
		if step.ID == "" {
			errors = append(errors, "step id is required")
			continue
		}
		if stepIDs[step.ID] {
			errors = append(errors, fmt.Sprintf("duplicate step id: %s", step.ID))
		}
		stepIDs[step.ID] = true

		// Validate step type
		switch step.Type {
		case models.StepTypeAction:
			if step.ParticipantRef == "" {
				errors = append(errors, fmt.Sprintf("action step %s requires participantRef", step.ID))
			} else if !participantIDs[step.ParticipantRef] {
				errors = append(errors, fmt.Sprintf("step %s references unknown participant: %s", step.ID, step.ParticipantRef))
			}
		case models.StepTypeFanOut:
			if len(step.Steps) == 0 {
				errors = append(errors, fmt.Sprintf("fanOut step %s requires steps", step.ID))
			}
		case models.StepTypeFanIn:
			// Valid with or without condition
		case models.StepTypeDecision:
			if step.Decision == nil || len(step.Decision.Cases) == 0 {
				errors = append(errors, fmt.Sprintf("decision step %s requires decision.cases", step.ID))
			}
		case models.StepTypeAwait:
			if step.AwaitInput == nil || step.AwaitInput.Ref == "" {
				errors = append(errors, fmt.Sprintf("await step %s requires awaitInput.ref", step.ID))
			}
		case models.StepTypeExit:
			if step.Exit == nil {
				errors = append(errors, fmt.Sprintf("exit step %s requires exit", step.ID))
			}
		default:
			errors = append(errors, fmt.Sprintf("unknown step type: %s", step.Type))
		}

		// Validate dependencies
		for _, dep := range step.DependsOn {
			if !stepIDs[dep] && !v.stepExists(flow, dep) {
				errors = append(errors, fmt.Sprintf("step %s depends on unknown step: %s", step.ID, dep))
			}
		}
	}

	// Check for circular dependencies
	if err := v.checkCircularDependencies(flow); err != nil {
		errors = append(errors, err.Error())
	}

	// Validate artifacts
	artifactRefs := make(map[string]bool)
	for _, a := range flow.Artifacts {
		if a.Ref == "" {
			errors = append(errors, "artifact ref is required")
			continue
		}
		if !strings.HasPrefix(a.Ref, "aip://") {
			errors = append(errors, fmt.Sprintf("artifact ref must start with aip://: %s", a.Ref))
		}
		artifactRefs[a.Ref] = true
	}

	return &ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// stepExists checks if a step exists in the flow
func (v *Validator) stepExists(flow *models.Flow, stepID string) bool {
	for _, s := range flow.Steps {
		if s.ID == stepID {
			return true
		}
	}
	return false
}

// checkCircularDependencies checks for circular dependencies in steps
func (v *Validator) checkCircularDependencies(flow *models.Flow) error {
	// Build adjacency list
	graph := make(map[string][]string)
	for _, step := range flow.Steps {
		for _, dep := range step.DependsOn {
			graph[dep] = append(graph[dep], step.ID)
		}
	}

	// DFS to detect cycles
	visited := make(map[string]bool)
	recStack := make(map[string]bool)

	for _, step := range flow.Steps {
		if v.hasCycle(step.ID, graph, visited, recStack) {
			return fmt.Errorf("circular dependency detected in steps")
		}
	}
	return nil
}

// hasCycle performs DFS to detect cycles
func (v *Validator) hasCycle(node string, graph map[string][]string, visited, recStack map[string]bool) bool {
	if recStack[node] {
		return true
	}
	if visited[node] {
		return false
	}

	visited[node] = true
	recStack[node] = true

	for _, neighbor := range graph[node] {
		if v.hasCycle(neighbor, graph, visited, recStack) {
			return true
		}
	}

	recStack[node] = false
	return false
}
