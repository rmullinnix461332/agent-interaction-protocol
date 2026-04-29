package loader

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Flow represents a parsed AIP flow document.
type Flow struct {
	APIVersion      string                 `yaml:"apiVersion"`
	Kind            string                 `yaml:"kind"`
	Metadata        Metadata               `yaml:"metadata"`
	Participants    []Participant          `yaml:"participants"`
	Artifacts       []Artifact             `yaml:"artifacts"`
	Steps           []Step                 `yaml:"steps"`
	ProviderBinding map[string]any `yaml:"providerBinding,omitempty"`
	Raw             map[string]any `yaml:"-"`
	RawBytes        []byte                 `yaml:"-"`
}

type Metadata struct {
	Name        string            `yaml:"name"`
	Title       string            `yaml:"title,omitempty"`
	Version     string            `yaml:"version,omitempty"`
	Description string            `yaml:"description,omitempty"`
	Labels      map[string]string `yaml:"labels,omitempty"`
}

type Participant struct {
	ID           string   `yaml:"id"`
	Kind         string   `yaml:"kind"`
	Title        string   `yaml:"title,omitempty"`
	Description  string   `yaml:"description,omitempty"`
	FlowRef      string   `yaml:"flowRef,omitempty"`
	Version      string   `yaml:"version,omitempty"`
	Capabilities []string `yaml:"capabilities,omitempty"`
}

type Artifact struct {
	Ref         string   `yaml:"ref"`
	ContentType string   `yaml:"contentType,omitempty"`
	Title       string   `yaml:"title,omitempty"`
	Description string   `yaml:"description,omitempty"`
	Producer    string   `yaml:"producer,omitempty"`
	Consumers   []string `yaml:"consumers,omitempty"`
	Required    bool     `yaml:"required,omitempty"`
}

type Step struct {
	ID             string                 `yaml:"id"`
	Type           string                 `yaml:"type"`
	Title          string                 `yaml:"title,omitempty"`
	Description    string                 `yaml:"description,omitempty"`
	ParticipantRef string                 `yaml:"participantRef,omitempty"`
	DependsOn      []string               `yaml:"dependsOn,omitempty"`
	Consumes       []string               `yaml:"consumes,omitempty"`
	Produces       []string               `yaml:"produces,omitempty"`
	Steps          []string               `yaml:"steps,omitempty"`
	Condition      string                 `yaml:"condition,omitempty"`
	Operator       map[string]any `yaml:"operator,omitempty"`
	Decision       map[string]any `yaml:"decision,omitempty"`
	Iteration      map[string]any `yaml:"iteration,omitempty"`
	AwaitInput     map[string]any `yaml:"awaitInput,omitempty"`
	Exit           map[string]any `yaml:"exit,omitempty"`
	Extensions     map[string]any `yaml:"extensions,omitempty"`
}

// LoadFlow reads and parses a YAML flow file.
func LoadFlow(path string) (*Flow, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	var flow Flow
	if err := yaml.Unmarshal(data, &flow); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}

	// Also keep raw map for schema validation (using yaml.v3 Node for proper typing)
	var node yaml.Node
	if err := yaml.Unmarshal(data, &node); err != nil {
		return nil, fmt.Errorf("parse raw %s: %w", path, err)
	}

	raw := nodeToInterface(&node)
	if m, ok := raw.(map[string]any); ok {
		flow.Raw = m
	}
	flow.RawBytes = data
	return &flow, nil
}

// nodeToInterface converts a yaml.Node tree to native Go types with string keys.
func nodeToInterface(node *yaml.Node) any {
	switch node.Kind {
	case yaml.DocumentNode:
		if len(node.Content) > 0 {
			return nodeToInterface(node.Content[0])
		}
		return nil
	case yaml.MappingNode:
		m := make(map[string]any, len(node.Content)/2)
		for i := 0; i < len(node.Content)-1; i += 2 {
			key := node.Content[i].Value
			val := nodeToInterface(node.Content[i+1])
			m[key] = val
		}
		return m
	case yaml.SequenceNode:
		s := make([]any, len(node.Content))
		for i, child := range node.Content {
			s[i] = nodeToInterface(child)
		}
		return s
	case yaml.ScalarNode:
		var v any
		_ = node.Decode(&v)
		return v
	case yaml.AliasNode:
		return nodeToInterface(node.Alias)
	}
	return nil
}
