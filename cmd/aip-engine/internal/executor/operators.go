package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"text/template"

	"github.com/example/aip-engine/internal/models"
)

// applyOperator transforms artifacts according to the step's operator config.
// It receives the produced artifacts from a step and returns the transformed set.
func applyOperator(op *models.Operator, artifacts []models.ProducedArtifact, runArtifacts map[string]*models.RuntimeArtifact) ([]models.ProducedArtifact, error) {
	switch op.Type {
	case "summarize":
		return applySummarize(op, artifacts)
	case "rank":
		return applyRank(op, artifacts)
	case "merge":
		return applyMerge(op, artifacts)
	case "filter":
		return applyFilter(op, artifacts)
	default:
		return nil, fmt.Errorf("unknown operator type: %s", op.Type)
	}
}

// applySummarize reduces artifacts using a template
func applySummarize(op *models.Operator, artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	tmplStr := "{{range .Items}}{{.Content}}\n{{end}}"
	if op.Config != nil {
		if t, ok := op.Config["template"].(string); ok && t != "" {
			tmplStr = t
		}
	}

	tmpl, err := template.New("summarize").Parse(tmplStr)
	if err != nil {
		return nil, fmt.Errorf("invalid summarize template: %w", err)
	}

	type item struct {
		Ref         string
		ContentType string
		Content     string
		Parsed      any
	}

	var items []item
	for _, art := range artifacts {
		parsed := tryParseJSON(art.Content)
		items = append(items, item{
			Ref:         art.Ref,
			ContentType: art.ContentType,
			Content:     string(art.Content),
			Parsed:      parsed,
		})
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, map[string]any{"Items": items}); err != nil {
		return nil, fmt.Errorf("summarize template execution failed: %w", err)
	}

	ref := "aip://artifact/summarized"
	if len(artifacts) > 0 {
		ref = artifacts[0].Ref + "/summarized"
	}

	return []models.ProducedArtifact{
		{
			Ref:         ref,
			ContentType: "text/plain",
			Content:     buf.Bytes(),
		},
	}, nil
}

// applyRank orders artifacts by a score field and returns top-N
func applyRank(op *models.Operator, artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	criteria := "score"
	if op.Config != nil {
		if c, ok := op.Config["criteria"].(string); ok && c != "" {
			criteria = c
		}
	}

	topN := len(artifacts)
	if op.TopN > 0 && op.TopN < topN {
		topN = op.TopN
	}

	type scored struct {
		art   models.ProducedArtifact
		score float64
	}

	var items []scored
	for _, art := range artifacts {
		s := extractScore(art.Content, criteria)
		items = append(items, scored{art: art, score: s})
	}

	// Sort descending by score
	sort.Slice(items, func(i, j int) bool {
		return items[i].score > items[j].score
	})

	var result []models.ProducedArtifact
	for i := 0; i < topN && i < len(items); i++ {
		result = append(result, items[i].art)
	}

	return result, nil
}

// applyMerge combines artifacts based on mode
func applyMerge(op *models.Operator, artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	mode := op.Mode
	if mode == "" {
		mode = "append"
	}

	switch mode {
	case "append":
		return mergeAppend(artifacts)
	case "union":
		return mergeUnion(artifacts)
	case "dedupe":
		return mergeDedupe(artifacts)
	default:
		return nil, fmt.Errorf("unknown merge mode: %s", mode)
	}
}

// mergeAppend concatenates all artifact content
func mergeAppend(artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	var parts []string
	for _, art := range artifacts {
		parts = append(parts, string(art.Content))
	}

	ref := "aip://artifact/merged"
	if len(artifacts) > 0 {
		ref = artifacts[0].Ref + "/merged"
	}

	return []models.ProducedArtifact{
		{
			Ref:         ref,
			ContentType: "application/json",
			Content:     []byte("[" + strings.Join(parts, ",") + "]"),
		},
	}, nil
}

// mergeUnion combines unique JSON values from all artifacts
func mergeUnion(artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	seen := make(map[string]bool)
	var items []json.RawMessage

	for _, art := range artifacts {
		// Try to parse as array
		var arr []json.RawMessage
		if err := json.Unmarshal(art.Content, &arr); err == nil {
			for _, item := range arr {
				key := string(item)
				if !seen[key] {
					seen[key] = true
					items = append(items, item)
				}
			}
		} else {
			// Treat as single value
			key := string(art.Content)
			if !seen[key] {
				seen[key] = true
				items = append(items, art.Content)
			}
		}
	}

	merged, _ := json.Marshal(items)
	ref := "aip://artifact/merged"
	if len(artifacts) > 0 {
		ref = artifacts[0].Ref + "/merged"
	}

	return []models.ProducedArtifact{
		{
			Ref:         ref,
			ContentType: "application/json",
			Content:     merged,
		},
	}, nil
}

// mergeDedupe removes duplicate artifacts by content
func mergeDedupe(artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	seen := make(map[string]bool)
	var result []models.ProducedArtifact

	for _, art := range artifacts {
		key := string(art.Content)
		if !seen[key] {
			seen[key] = true
			result = append(result, art)
		}
	}

	return result, nil
}

// applyFilter removes artifacts that don't meet criteria
func applyFilter(op *models.Operator, artifacts []models.ProducedArtifact) ([]models.ProducedArtifact, error) {
	rules := extractFilterRules(op)
	if len(rules) == 0 {
		return artifacts, nil
	}

	var result []models.ProducedArtifact
	for _, art := range artifacts {
		if matchesAllRules(art.Content, rules) {
			result = append(result, art)
		}
	}

	return result, nil
}

// filterRule represents a single filter condition
type filterRule struct {
	Field string
	Op    string
	Value any
}

// extractFilterRules parses filter rules from operator config
func extractFilterRules(op *models.Operator) []filterRule {
	if op.Config == nil {
		return nil
	}

	rawRules, ok := op.Config["rules"]
	if !ok {
		return nil
	}

	ruleList, ok := rawRules.([]any)
	if !ok {
		return nil
	}

	var rules []filterRule
	for _, raw := range ruleList {
		m, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		field, _ := m["field"].(string)
		opStr, _ := m["op"].(string)
		value := m["value"]

		if field != "" && opStr != "" {
			rules = append(rules, filterRule{Field: field, Op: opStr, Value: value})
		}
	}

	return rules
}

// matchesAllRules checks if artifact content matches all filter rules
func matchesAllRules(content []byte, rules []filterRule) bool {
	parsed := tryParseJSON(content)
	if parsed == nil {
		return false
	}

	m, ok := parsed.(map[string]any)
	if !ok {
		return false
	}

	for _, rule := range rules {
		actual, exists := m[rule.Field]
		if !exists {
			return false
		}
		if !compareValues(rule.Op, actual, rule.Value) {
			return false
		}
	}

	return true
}

// extractScore extracts a numeric score from artifact content by field name
func extractScore(content []byte, field string) float64 {
	parsed := tryParseJSON(content)
	if parsed == nil {
		return 0
	}

	m, ok := parsed.(map[string]any)
	if !ok {
		return 0
	}

	val, exists := m[field]
	if !exists {
		return 0
	}

	f, ok := toFloat64(val)
	if !ok {
		return 0
	}

	return f
}
