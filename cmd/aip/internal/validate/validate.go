package validate

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/santhosh-tekuri/jsonschema/v5"
)

// Schema validates the flow against the JSON schema.
func Schema(flow *loader.Flow, schemaPath string) []string {
	if schemaPath == "" {
		schemaPath = findSchema()
	}
	if schemaPath == "" {
		return []string{"schema file not found; use --schema flag"}
	}

	compiler := jsonschema.NewCompiler()
	schema, err := compiler.Compile(schemaPath)
	if err != nil {
		return []string{fmt.Sprintf("schema compile error: %v", err)}
	}

	// Convert raw YAML map to JSON-compatible form
	jsonBytes, err := json.Marshal(flow.Raw)
	if err != nil {
		return []string{fmt.Sprintf("marshal error: %v", err)}
	}

	var doc any
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return []string{fmt.Sprintf("unmarshal error: %v", err)}
	}

	if err := schema.Validate(doc); err != nil {
		ve, ok := err.(*jsonschema.ValidationError)
		if !ok {
			return []string{err.Error()}
		}
		var errs []string
		for _, e := range ve.BasicOutput().Errors {
			if e.Error != "" {
				errs = append(errs, fmt.Sprintf("%s: %s", e.InstanceLocation, e.Error))
			}
		}
		return errs
	}
	return nil
}

// Semantic checks cross-reference integrity beyond schema.
func Semantic(flow *loader.Flow) []string {
	var errs []string

	// Build participant ID set
	participants := map[string]bool{}
	for _, p := range flow.Participants {
		if participants[p.ID] {
			errs = append(errs, fmt.Sprintf("duplicate participant id: %s", p.ID))
		}
		participants[p.ID] = true
	}

	// Build step ID set
	steps := map[string]bool{}
	for _, s := range flow.Steps {
		if steps[s.ID] {
			errs = append(errs, fmt.Sprintf("duplicate step id: %s", s.ID))
		}
		steps[s.ID] = true
	}

	// Validate references
	for _, s := range flow.Steps {
		if s.ParticipantRef != "" && !participants[s.ParticipantRef] {
			errs = append(errs, fmt.Sprintf("step %q references unknown participant %q", s.ID, s.ParticipantRef))
		}
		for _, dep := range s.DependsOn {
			if !steps[dep] {
				errs = append(errs, fmt.Sprintf("step %q depends on unknown step %q", s.ID, dep))
			}
		}
		for _, sub := range s.Steps {
			if !steps[sub] {
				errs = append(errs, fmt.Sprintf("step %q references unknown sub-step %q", s.ID, sub))
			}
		}

		// Validate iteration.scope
		if s.Iteration != nil {
			if scope, ok := s.Iteration["scope"].(map[string]any); ok {
				scopeType, _ := scope["type"].(string)
				scopeRef, _ := scope["ref"].(string)

				if scopeType == "" {
					errs = append(errs, fmt.Sprintf("step %q iteration.scope missing type", s.ID))
				} else if scopeType != "step" && scopeType != "subflow" {
					errs = append(errs, fmt.Sprintf("step %q iteration.scope.type must be \"step\" or \"subflow\", got %q", s.ID, scopeType))
				}

				if scopeRef == "" {
					errs = append(errs, fmt.Sprintf("step %q iteration.scope missing ref", s.ID))
				} else if scopeType == "step" && !steps[scopeRef] {
					errs = append(errs, fmt.Sprintf("step %q iteration.scope.ref %q references unknown step", s.ID, scopeRef))
				} else if scopeType == "subflow" {
					// Verify ref points to a subflow participant
					found := false
					for _, p := range flow.Participants {
						if p.ID == scopeRef && p.Kind == "subflow" {
							found = true
							break
						}
					}
					if !found {
						errs = append(errs, fmt.Sprintf("step %q iteration.scope.ref %q references unknown subflow participant", s.ID, scopeRef))
					}
				}
			}
		}
	}

	return errs
}

func findSchema() string {
	// Walk up from executable to find schema/aip-core.json.schema
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	for i := 0; i < 5; i++ {
		candidate := filepath.Join(dir, "schema", "aip-core.json.schema")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		dir = filepath.Dir(dir)
	}
	return ""
}
