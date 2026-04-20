package format

import (
	"bytes"

	"github.com/agent-interaction-protocol/aip/internal/loader"
	"gopkg.in/yaml.v3"
)

// canonicalKeyOrder defines the preferred top-level key ordering.
var canonicalKeyOrder = []string{
	"apiVersion", "kind", "metadata", "participants", "artifacts", "steps", "providerBinding",
}

// Canonical formats a flow with canonical key ordering and indentation.
func Canonical(flow *loader.Flow, indent int) ([]byte, error) {
	// Re-marshal with controlled indentation
	var node yaml.Node
	if err := yaml.Unmarshal(flow.RawBytes, &node); err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(indent)
	if err := enc.Encode(&node); err != nil {
		return nil, err
	}
	enc.Close()

	return buf.Bytes(), nil
}
