package graph

import (
	"fmt"
	"strings"

	"github.com/agent-interaction-protocol/aip/internal/loader"
)

// ResolveDeps returns the effective dependency map after resolving fanOut/fanIn semantics.
// A fanOut's `steps` children implicitly depend on the fanOut.
// A fanIn that dependsOn a fanOut implicitly depends on all the fanOut's child steps.
func ResolveDeps(flow *loader.Flow) map[string][]string {
	deps := map[string][]string{}

	// Index steps by ID
	stepMap := map[string]*loader.Step{}
	for i := range flow.Steps {
		stepMap[flow.Steps[i].ID] = &flow.Steps[i]
	}

	for _, s := range flow.Steps {
		// Start with explicit dependsOn
		resolved := make([]string, 0, len(s.DependsOn))

		for _, dep := range s.DependsOn {
			depStep := stepMap[dep]
			if depStep != nil && depStep.Type == "fanOut" && s.Type == "fanIn" {
				// fanIn depending on a fanOut means it depends on all the fanOut's children
				resolved = append(resolved, depStep.Steps...)
			} else {
				resolved = append(resolved, dep)
			}
		}

		deps[s.ID] = resolved
	}

	// fanOut's children implicitly depend on the fanOut itself
	for _, s := range flow.Steps {
		if s.Type == "fanOut" {
			for _, childID := range s.Steps {
				deps[childID] = append(deps[childID], s.ID)
			}
		}
	}

	return deps
}

// TopoSort returns steps grouped into parallel execution stages.
func TopoSort(flow *loader.Flow) ([][]string, error) {
	deps := ResolveDeps(flow)

	// Build adjacency
	inDegree := map[string]int{}
	dependents := map[string][]string{}
	for _, s := range flow.Steps {
		if _, ok := inDegree[s.ID]; !ok {
			inDegree[s.ID] = 0
		}
		for _, dep := range deps[s.ID] {
			inDegree[s.ID]++
			dependents[dep] = append(dependents[dep], s.ID)
		}
	}

	var stages [][]string
	for len(inDegree) > 0 {
		// Collect nodes with zero in-degree
		var ready []string
		for id, deg := range inDegree {
			if deg == 0 {
				ready = append(ready, id)
			}
		}
		if len(ready) == 0 {
			return nil, fmt.Errorf("cycle detected in step dependencies")
		}

		stages = append(stages, ready)
		for _, id := range ready {
			delete(inDegree, id)
			for _, dep := range dependents[id] {
				inDegree[dep]--
			}
		}
	}
	return stages, nil
}

// RenderASCII produces an ASCII DAG with box nodes and connecting lines.
func RenderASCII(flow *loader.Flow) string {
	stages, err := TopoSort(flow)
	if err != nil {
		return fmt.Sprintf("error: %v", err)
	}

	deps := ResolveDeps(flow)

	// Build node labels and compute positions
	nodes := map[string]*nodeInfo{}
	var stageNodes [][]*nodeInfo

	for si, stage := range stages {
		var row []*nodeInfo
		for _, id := range stage {
			step := findStep(flow, id)
			label := id
			if step != nil && step.Title != "" {
				label = step.Title
			}
			ni := &nodeInfo{id: id, label: label, width: len(label) + 4, stage: si}
			nodes[id] = ni
			row = append(row, ni)
		}
		stageNodes = append(stageNodes, row)
	}

	// Assign horizontal center positions for each node in a stage.
	// For linear chains, center-align all nodes to the widest node's center.
	maxWidth := 0
	for _, row := range stageNodes {
		for _, ni := range row {
			if ni.width > maxWidth {
				maxWidth = ni.width
			}
		}
	}

	for _, row := range stageNodes {
		if len(row) == 1 {
			// Single node: center it at the global center
			row[0].col = maxWidth / 2
		} else {
			// Multiple nodes: lay out side by side
			offset := 0
			for _, ni := range row {
				ni.col = offset + ni.width/2
				offset += ni.width + 4
			}
		}
	}

	var sb strings.Builder

	for si, row := range stageNodes {
		// Draw box top
		line := buildLine(row, func(ni *nodeInfo) string {
			return "+" + strings.Repeat("-", ni.width-2) + "+"
		})
		sb.WriteString(line + "\n")

		// Draw box middle (label) — add back-arrow for iteration nodes
		line = buildLine(row, func(ni *nodeInfo) string {
			pad := ni.width - 2 - len(ni.label)
			lpad := pad / 2
			rpad := pad - lpad
			return "|" + strings.Repeat(" ", lpad) + ni.label + strings.Repeat(" ", rpad) + "|"
		})
		// Check if any node in this row has iteration (for the arrow indicator)
		var iterNode *nodeInfo
		for _, ni := range row {
			step := findStep(flow, ni.id)
			if step != nil && step.Iteration != nil && len(step.Iteration) > 0 {
				iterNode = ni
				break
			}
		}
		if iterNode != nil {
			line += "<--+"
		}
		sb.WriteString(line + "\n")

		// Draw box bottom
		line = buildLine(row, func(ni *nodeInfo) string {
			return "+" + strings.Repeat("-", ni.width-2) + "+"
		})
		if iterNode != nil {
			// Pad to align the loop pipe
			boxEnd := iterNode.col + iterNode.width/2
			if len(line) < boxEnd {
				line += strings.Repeat(" ", boxEnd-len(line))
			}
			line += "   |"
		}
		sb.WriteString(line + "\n")

		// Draw loop back-edge if this node has iteration
		if iterNode != nil {
			step := findStep(flow, iterNode.id)
			loopCol := iterNode.col + iterNode.width/2 + 3

			// Build annotation from iteration fields
			annotation := buildIterAnnotation(step.Iteration)

			// Line 1: pipe down from center + annotation on the right
			centerLine := make([]byte, loopCol+1)
			for i := range centerLine {
				centerLine[i] = ' '
			}
			centerLine[iterNode.col] = '|'
			centerLine[loopCol] = '|'
			annotated := strings.TrimRight(string(centerLine), " ")
			if annotation != "" {
				// Place annotation after the loop pipe
				annotated = string(centerLine) + " " + annotation
			}
			sb.WriteString(annotated + "\n")

			// Line 2: horizontal connector back + from center to loop col
			connLine := make([]byte, loopCol+1)
			for i := range connLine {
				connLine[i] = ' '
			}
			connLine[iterNode.col] = '+'
			for c := iterNode.col + 1; c < loopCol; c++ {
				connLine[c] = '-'
			}
			connLine[loopCol] = '+'
			sb.WriteString(strings.TrimRight(string(connLine), " ") + "\n")

			// Line 3: pipe continuing down from center
			downLine := make([]byte, iterNode.col+1)
			for i := range downLine {
				downLine[i] = ' '
			}
			downLine[iterNode.col] = '|'
			sb.WriteString(strings.TrimRight(string(downLine), " ") + "\n")

			// Skip the normal connector drawing for this stage — we already drew the down pipe
			// But we still need to connect to the next stage, so continue below
		}

		// Draw connecting lines to next stage
		if si < len(stageNodes)-1 {
			nextRow := stageNodes[si+1]

			// Collect edges from this stage to next
			type edge struct {
				fromCol int
				toCol   int
			}
			var edges []edge
			for _, nextNi := range nextRow {
				for _, dep := range deps[nextNi.id] {
					fromNi, ok := nodes[dep]
					if !ok || fromNi.stage != si {
						continue
					}
					edges = append(edges, edge{fromCol: fromNi.col, toCol: nextNi.col})
				}
			}

			// If no explicit edges, connect sequentially (single node stages)
			if len(edges) == 0 && len(row) == 1 && len(nextRow) == 1 {
				edges = append(edges, edge{fromCol: row[0].col, toCol: nextRow[0].col})
			}

			// Draw vertical connector lines
			if len(edges) > 0 {
				maxCol := 0
				for _, e := range edges {
					if e.fromCol > maxCol {
						maxCol = e.fromCol
					}
					if e.toCol > maxCol {
						maxCol = e.toCol
					}
				}

				// Row 1: vertical pipes down from source centers
				buf := make([]byte, maxCol+1)
				for i := range buf {
					buf[i] = ' '
				}
				for _, e := range edges {
					if e.fromCol < len(buf) {
						buf[e.fromCol] = '|'
					}
				}
				sb.WriteString(strings.TrimRight(string(buf), " ") + "\n")

				// Row 2: horizontal routing if source and target differ
				needsRouting := false
				for _, e := range edges {
					if e.fromCol != e.toCol {
						needsRouting = true
						break
					}
				}

				if needsRouting {
					buf = make([]byte, maxCol+1)
					for i := range buf {
						buf[i] = ' '
					}
					for _, e := range edges {
						if e.fromCol == e.toCol {
							buf[e.fromCol] = '|'
							continue
						}
						lo, hi := e.fromCol, e.toCol
						if lo > hi {
							lo, hi = hi, lo
						}
						for c := lo; c <= hi; c++ {
							if buf[c] == ' ' {
								buf[c] = '-'
							}
						}
						buf[e.fromCol] = '+'
						buf[e.toCol] = '+'
					}
					sb.WriteString(strings.TrimRight(string(buf), " ") + "\n")
				}

				// Row 3: vertical pipes down to target centers
				buf = make([]byte, maxCol+1)
				for i := range buf {
					buf[i] = ' '
				}
				for _, e := range edges {
					if e.toCol < len(buf) {
						buf[e.toCol] = '|'
					}
				}
				sb.WriteString(strings.TrimRight(string(buf), " ") + "\n")
			}
		}
	}

	return sb.String()
}

// buildLine constructs a line by placing each node's rendered text at its position.
func buildLine(row []*nodeInfo, render func(*nodeInfo) string) string {
	if len(row) == 0 {
		return ""
	}
	maxEnd := 0
	for _, ni := range row {
		end := ni.col + ni.width/2
		if end > maxEnd {
			maxEnd = end
		}
	}
	buf := make([]byte, maxEnd+1)
	for i := range buf {
		buf[i] = ' '
	}
	for _, ni := range row {
		s := render(ni)
		start := ni.col - ni.width/2
		for i, ch := range []byte(s) {
			pos := start + i
			if pos >= 0 && pos < len(buf) {
				buf[pos] = ch
			}
		}
	}
	return strings.TrimRight(string(buf), " ")
}

type nodeInfo struct {
	id    string
	label string
	width int
	col   int
	stage int
}

func findStep(flow *loader.Flow, id string) *loader.Step {
	for i := range flow.Steps {
		if flow.Steps[i].ID == id {
			return &flow.Steps[i]
		}
	}
	return nil
}

// buildIterAnnotation creates a compact annotation string from iteration config.
func buildIterAnnotation(iter map[string]any) string {
	var parts []string

	if mode, ok := iter["mode"].(string); ok {
		parts = append(parts, mode)
	}

	if cond, ok := iter["condition"]; ok {
		if m, ok := cond.(map[string]any); ok {
			for k, v := range m {
				parts = append(parts, fmt.Sprintf("%s: %v", k, v))
			}
		}
	}

	if max, ok := iter["maxIterations"]; ok {
		parts = append(parts, fmt.Sprintf("max: %v", max))
	}

	return strings.Join(parts, ", ")
}
