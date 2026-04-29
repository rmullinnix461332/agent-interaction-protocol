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

	// Collect iteration back-edges (scope-aware) before rendering.
	// Each maps from the iterating step to its loop-back target.
	var iterBacks []iterBack
	for _, s := range flow.Steps {
		if s.Iteration == nil || len(s.Iteration) == 0 {
			continue
		}
		target := s.ID // default: self-loop
		if scope, ok := s.Iteration["scope"].(map[string]any); ok {
			if ref, ok := scope["ref"].(string); ok && ref != "" {
				// For subflow scope, the ref is a participant ID — find the step that uses it
				scopeType, _ := scope["type"].(string)
				if scopeType == "step" {
					target = ref
				} else if scopeType == "subflow" {
					// Find the earliest step that references this participant
					// and is between the target and the iterating step
					for _, candidate := range flow.Steps {
						if candidate.ParticipantRef == ref {
							if ni, ok := nodes[candidate.ID]; ok {
								if ni.stage < nodes[s.ID].stage {
									target = candidate.ID
									break
								}
							}
						}
					}
				}
			}
		}
		iterBacks = append(iterBacks, iterBack{
			fromID:     s.ID,
			targetID:   target,
			annotation: buildIterAnnotation(s.Iteration),
		})
	}

	// Determine the right gutter column for back-edges.
	// Use the widest single-node row to keep the gutter close.
	gutterCol := 0
	for _, row := range stageNodes {
		if len(row) == 1 {
			rightEdge := row[0].col + row[0].width/2
			if rightEdge > gutterCol {
				gutterCol = rightEdge
			}
		}
	}
	gutterCol += 4 // gap from rightmost single-node box edge

	var sb strings.Builder

	for si, row := range stageNodes {
		// Check if any back-edge targets or passes through this stage
		// We need to draw the gutter pipe on the right for active back-edges

		// Find active back-edges at this stage (between target and source stages)
		var activeBackEdges []iterBack
		for _, ib := range iterBacks {
			fromStage := nodes[ib.fromID].stage
			targetStage := nodes[ib.targetID].stage
			if si >= targetStage && si <= fromStage {
				activeBackEdges = append(activeBackEdges, ib)
			}
		}

		// Check if this stage is the source of a scoped back-edge (not self-loop)
		isSource := false
		isSelfLoop := false
		for _, ib := range activeBackEdges {
			if nodes[ib.fromID].stage == si && nodes[ib.targetID].stage != si {
				isSource = true
			}
			if nodes[ib.fromID].stage == si && nodes[ib.targetID].stage == si {
				isSelfLoop = true
			}
		}

		// Draw box top
		line := buildLine(row, func(ni *nodeInfo) string {
			return "+" + strings.Repeat("-", ni.width-2) + "+"
		})
		if isSource {
			for len(line) < gutterCol+3 {
				line += " "
			}
			line += "|"
		} else {
			line = padGutter(line, gutterCol, activeBackEdges, si, nodes, false, "")
		}
		sb.WriteString(line + "\n")

		// Draw box middle (label)
		line = buildLine(row, func(ni *nodeInfo) string {
			pad := ni.width - 2 - len(ni.label)
			lpad := pad / 2
			rpad := pad - lpad
			return "|" + strings.Repeat(" ", lpad) + ni.label + strings.Repeat(" ", rpad) + "|"
		})

		// Check if this row is a back-edge target (arrow points here)
		isTarget := false
		for _, ib := range activeBackEdges {
			if nodes[ib.targetID].stage == si {
				isTarget = true
				break
			}
		}
		if isTarget {
			// Pad to gutter and draw the arrow
			for len(line) < gutterCol {
				line += " "
			}
			line += "<--+"
		} else if isSource {
			for len(line) < gutterCol+3 {
				line += " "
			}
			line += "|"
		} else {
			line = padGutter(line, gutterCol, activeBackEdges, si, nodes, false, "")
		}
		sb.WriteString(line + "\n")

		// Draw box bottom
		line = buildLine(row, func(ni *nodeInfo) string {
			return "+" + strings.Repeat("-", ni.width-2) + "+"
		})
		// Box bottom needs gutter pipe if: target stage (scoped), source stage (scoped),
		// or self-loop (target == source == this stage)
		isTargetBottom := false
		for _, ib := range activeBackEdges {
			if nodes[ib.targetID].stage == si && nodes[ib.fromID].stage != si {
				isTargetBottom = true
				break
			}
		}
		if isTargetBottom || isSource || isSelfLoop {
			for len(line) < gutterCol+3 {
				line += " "
			}
			line += "|"
		} else {
			line = padGutter(line, gutterCol, activeBackEdges, si, nodes, false, "")
		}
		sb.WriteString(line + "\n")

		// Draw loop connector from the iterating step
		var iterNodeHere *nodeInfo
		var iterAnnotation string
		for _, ib := range iterBacks {
			if nodes[ib.fromID].stage == si {
				iterNodeHere = nodes[ib.fromID]
				iterAnnotation = ib.annotation
				break
			}
		}

		if iterNodeHere != nil {
			// Line 1: pipe down from center + annotation
			centerLine := make([]byte, gutterCol+4)
			for i := range centerLine {
				centerLine[i] = ' '
			}
			centerLine[iterNodeHere.col] = '|'
			centerLine[gutterCol+3] = '|'
			annotated := string(centerLine)
			if iterAnnotation != "" {
				annotated += " " + iterAnnotation
			}
			sb.WriteString(annotated + "\n")

			// Line 2: horizontal connector from center to gutter
			connLine := make([]byte, gutterCol+4)
			for i := range connLine {
				connLine[i] = ' '
			}
			connLine[iterNodeHere.col] = '+'
			for c := iterNodeHere.col + 1; c < gutterCol+3; c++ {
				connLine[c] = '-'
			}
			connLine[gutterCol+3] = '+'
			sb.WriteString(strings.TrimRight(string(connLine), " ") + "\n")

			// Line 3: pipe continuing down
			downLine := make([]byte, iterNodeHere.col+1)
			for i := range downLine {
				downLine[i] = ' '
			}
			downLine[iterNodeHere.col] = '|'
			sb.WriteString(strings.TrimRight(string(downLine), " ") + "\n")
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

				buf := make([]byte, maxCol+1)

				// Row 1: vertical pipes down from source centers
				for i := range buf {
					buf[i] = ' '
				}
				for _, e := range edges {
					if e.fromCol < len(buf) {
						buf[e.fromCol] = '|'
					}
				}
				connStr := strings.TrimRight(string(buf), " ")
				sb.WriteString(padGutter(connStr, gutterCol, activeBackEdges, si, nodes, true, "") + "\n")

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
					connStr = strings.TrimRight(string(buf), " ")
					sb.WriteString(padGutter(connStr, gutterCol, activeBackEdges, si, nodes, true, "") + "\n")
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
				connStr = strings.TrimRight(string(buf), " ")
				sb.WriteString(padGutter(connStr, gutterCol, activeBackEdges, si, nodes, true, "") + "\n")
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

// padGutter adds the right-side gutter pipe for active back-edges passing through this stage.
func padGutter(line string, gutterCol int, activeBackEdges []iterBack, si int, nodes map[string]*nodeInfo, isConnector bool, extra string) string {
	if len(activeBackEdges) == 0 {
		return line
	}

	// The gutter pipe should be continuous from the row after the target arrow
	// down to the row before the source horizontal connector.
	needsPipe := false
	for _, ib := range activeBackEdges {
		targetStage := nodes[ib.targetID].stage
		fromStage := nodes[ib.fromID].stage
		// Self-loops don't need a gutter pipe
		if targetStage == fromStage {
			continue
		}
		if si > targetStage && si < fromStage {
			// Fully between target and source — always draw pipe
			needsPipe = true
			break
		}
		if si == targetStage && isConnector {
			// Target stage's connector lines below the box
			needsPipe = true
			break
		}
	}

	if !needsPipe {
		return line
	}

	// Pad line to gutter and add pipe
	for len(line) < gutterCol+3 {
		line += " "
	}
	line += "|"
	return line
}

type iterBack struct {
	fromID     string
	targetID   string
	annotation string
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

	if scope, ok := iter["scope"].(map[string]any); ok {
		scopeType, _ := scope["type"].(string)
		scopeRef, _ := scope["ref"].(string)
		if scopeType != "" && scopeRef != "" {
			parts = append(parts, fmt.Sprintf("scope: %s(%s)", scopeType, scopeRef))
		}
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
