package explain

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// Object prints schema documentation for a named AIP object.
func Object(name string, schemaPath string) (string, error) {
	if schemaPath == "" {
		return "", fmt.Errorf("schema path required; use --schema flag")
	}

	data, err := os.ReadFile(schemaPath)
	if err != nil {
		return "", fmt.Errorf("read schema: %w", err)
	}

	var schema map[string]any
	if err := json.Unmarshal(data, &schema); err != nil {
		return "", fmt.Errorf("parse schema: %w", err)
	}

	// Look in $defs
	defs, ok := schema["$defs"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("schema has no $defs")
	}

	// Try exact match, then case-insensitive
	def, ok := defs[name]
	if !ok {
		for k, v := range defs {
			if strings.EqualFold(k, name) {
				def = v
				name = k
				ok = true
				break
			}
		}
	}
	if !ok {
		available := make([]string, 0, len(defs))
		for k := range defs {
			available = append(available, k)
		}
		return "", fmt.Errorf("unknown object %q; available: %s", name, strings.Join(available, ", "))
	}

	return formatDef(name, def), nil
}

func formatDef(name string, def any) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("=== %s ===\n\n", name))

	m, ok := def.(map[string]any)
	if !ok {
		sb.WriteString(fmt.Sprintf("%v\n", def))
		return sb.String()
	}

	if desc, ok := m["description"].(string); ok {
		sb.WriteString(fmt.Sprintf("  %s\n\n", desc))
	}

	if typ, ok := m["type"].(string); ok {
		sb.WriteString(fmt.Sprintf("  Type: %s\n", typ))
	}

	if req, ok := m["required"].([]any); ok {
		strs := make([]string, len(req))
		for i, r := range req {
			strs[i] = fmt.Sprint(r)
		}
		sb.WriteString(fmt.Sprintf("  Required: %s\n", strings.Join(strs, ", ")))
	}

	if props, ok := m["properties"].(map[string]any); ok {
		sb.WriteString("\n  Properties:\n")
		for k, v := range props {
			prop, _ := v.(map[string]any)
			typ := prop["type"]
			desc := prop["description"]
			line := fmt.Sprintf("    %-20s %v", k, typ)
			if desc != nil {
				line += fmt.Sprintf("  — %v", desc)
			}
			sb.WriteString(line + "\n")
		}
	}

	return sb.String()
}
