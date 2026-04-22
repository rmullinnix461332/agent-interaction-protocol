# AIP Flow Designer — Implementation Plan

## Overview

Desktop application for visually creating, editing, and refining AIP flow YAML files. Built as a React app packaged with Electron for cross-platform (macOS/Windows) distribution. Includes AI chat for natural language flow generation, a visual DAG editor with drag-and-drop, and YAML as the single source of truth.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Electron Shell (main process)                  │
│  ├── File I/O (YAML + display layout files)     │
│  ├── Git integration (simple-git)               │
│  ├── CLI bridge (spawns aip validate/render)    │
│  ├── LLM proxy (API key stays in main process)  │
│  └── Mock Lab engine (flow executor + mocks)    │
├─────────────────────────────────────────────────┤
│  React App (renderer process)                   │
│  ├── Canvas — DAG visual editor (React Flow)    │
│  ├── Chat Panel — AI conversation               │
│  ├── Properties Panel — shape detail editing     │
│  ├── Toolbox Panel — drag-and-drop shapes       │
│  ├── YAML Editor — raw editing with sync        │
│  ├── Mock Lab — execution sandbox + trace view   │
│  └── Settings — LLM, Git, theme, preferences    │
└─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────────┐
│  flow.yaml       │    │  flow.display.json   │
│  (source of truth)│    │  (node positions,    │
│                  │    │   viewport, zoom)     │
└──────────────────┘    └──────────────────────┘
```

### Key Principle: YAML is the Source of Truth

All UI interactions produce YAML mutations. The canvas renders from parsed YAML. The display file only stores visual layout metadata (positions, viewport state) — never flow semantics.

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop shell | Electron | Cross-platform macOS/Windows, file system access, native menus |
| UI framework | React 19 + TypeScript | Component model, ecosystem, React 19 `use()` hook, improved context performance |
| DAG canvas | React Flow | Purpose-built for node-based editors, handles layout/zoom/pan/edges |
| State management | React Context + useReducer | Native React 19 state management — no external dependency, reducer pattern enables undo/redo via state history stack |
| YAML parsing | js-yaml | Read/write YAML, preserve comments where possible |
| Schema validation | ajv | JSON Schema validation in-browser |
| Chat UI | Custom component | Markdown rendering, streaming responses |
| LLM integration | OpenAI SDK / Anthropic SDK / Ollama | Configurable provider in settings |
| Git | simple-git (Node) | Commit, diff, branch from main process |
| Code editor | Monaco Editor | YAML editing with schema-aware autocomplete |
| Styling | MUI (Material UI) | Component library with built-in theming, dark mode, accessible components, consistent design system |
| Build/bundle | Vite + electron-builder | Fast dev, cross-platform packaging |
| Testing | Vitest + Playwright | Unit + E2E |

---

## File Format

### flow.yaml
Standard AIP YAML — unchanged from current schema. This is what gets committed to git.

### flow.display.json
Companion layout file, co-located with the YAML:

```json
{
  "version": "1.0",
  "viewport": { "x": 0, "y": 0, "zoom": 1.0 },
  "nodes": {
    "define-narrative": { "x": 200, "y": 50 },
    "define-layout": { "x": 200, "y": 200 },
    "produce-assets": { "x": 200, "y": 350 }
  },
  "collapsed": ["produce-assets"],
  "annotations": []
}
```

If no display file exists, auto-layout using dagre (topological sort + layered positioning).

---

## Visual Node Shapes

Each step type gets a distinct shape on the canvas:

| Step Type | Shape | Color Accent | Icon |
|-----------|-------|-------------|------|
| action | Rounded rectangle | Blue | ▶ Play |
| fanOut | Trapezoid (wide bottom) | Orange | ⑂ Fork |
| fanIn | Trapezoid (wide top) | Green | ⑃ Merge |
| decision | Diamond | Yellow | ◇ Branch |
| await | Hexagon | Purple | ⏸ Pause |
| exit | Rounded rectangle (double border) | Red/Green by status | ⏹ Stop |
| subflow (participant) | Dashed rounded rectangle | Teal | ↻ Sub |

Edges:
- Normal dependency: solid arrow
- Iteration back-edge: dashed arrow with loop annotation
- Fan-out to children: solid with fork indicator

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Menu Bar: File | Edit | View | Flow | Settings | Help       │
├────────┬─────────────────────────────────┬───────────────────┤
│Toolbox │                                 │  Properties       │
│        │                                 │  (Accordion)      │
│ Shapes │        Canvas / DAG             │                   │
│ ──────-│                                 │  ┌─ General ────┐ │
│ action │    [Define Narrative]           │  │ id: ...      │ │
│ fanOut │          │                      │  │ title: ...   │ │
│ fanIn  │    [Define Layout]              │  │ type: action │ │
│ decide │          │                      │  └──────────────┘ │
│ await  │    [Produce Assets]             │  ┌─ Inputs ─────┐ │
│ exit   │          │                      │  │ consumes:    │ │
│        │    [AI Review]                  │  └──────────────┘ │
│────────│          │                      │  ┌─ Outputs ────┐ │
│        │    [Rework Assets]◄─┐           │  │ produces:    │ │
│ Chat   │          │          │           │  └──────────────┘ │
│ ────── │          ▼          │           │  ┌─ Iteration ──┐ │
│ > make │    [Await Human]    │           │  │ mode: while  │ │
│   a    │          │          │           │  │ scope: ...   │ │
│   flow │    [Revise]◄────────┘           │  └──────────────┘ │
│   for..│          │                      │                   │
│        │    [Published]                  │                   │
│ AI: ...|                                 │                   │
├────────┴─────────────────────────────────┴───────────────────┤
│  Status Bar: validation status | file path | git branch      │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1 — Foundation (Weeks 1-3)

**Goal:** Electron app that loads, displays, and saves AIP YAML files.

1. Scaffold Electron + React + Vite + TypeScript project
2. YAML parser/serializer module
   - Parse YAML to internal Flow model (mirrors Go loader types)
   - Serialize Flow model back to YAML (preserve key ordering)
   - JSON Schema validation using ajv against aip-core.json.schema
3. React Flow canvas integration
   - Custom node components for each step type (shapes above)
   - Edge rendering (solid for deps, dashed for iteration back-edges)
   - Auto-layout with dagre when no display file exists
4. Display file read/write
   - Load node positions from .display.json
   - Save positions on drag-end
   - Auto-generate display file on first open
5. File operations
   - New (blank flow with template)
   - Open (file picker, loads YAML + display file)
   - Save / Save As
   - Recent files list
6. Undo/redo
   - useReducer with state history stack (past/present/future pattern)
   - Ctrl+Z / Ctrl+Shift+Z

**Deliverable:** App opens a YAML file, renders the DAG, allows repositioning nodes, saves back.

### Phase 2 — Editing (Weeks 4-6)

**Goal:** Full visual editing of flow structure and properties.

1. Toolbox panel (left sidebar)
   - Draggable shape components for each step type
   - Drop onto canvas creates new step in YAML
   - Participant and artifact quick-add buttons
2. Properties panel (right sidebar, accordion)
   - General section: id, title, description, type
   - Participant section: participantRef picker (dropdown of declared participants)
   - Inputs section: consumes (artifact ref picker)
   - Outputs section: produces (artifact ref picker)
   - Dependencies section: dependsOn (step ref picker)
   - Type-specific sections:
     - action: participantRef
     - fanOut: steps (child step picker)
     - fanIn: condition, operator
     - decision: cases editor (when/next pairs)
     - await: awaitInput fields
     - exit: status, code, message
     - iteration: mode, condition, scope, maxIterations, timeout
3. Edge editing
   - Draw edge between nodes to create dependsOn
   - Delete edge removes dependency
   - Visual indicator for fan-out parent → child relationships
4. Participants manager
   - Side panel or modal to add/edit/remove participants
   - Kind selector (agent, service, human, subflow)
   - Subflow: flowRef file picker
5. Artifacts manager
   - Side panel or modal to add/edit/remove artifacts
   - Producer/consumer linking with visual indicators on canvas
6. Validation overlay
   - Real-time validation as you edit
   - Red badges on nodes with errors
   - Validation panel showing all issues

**Deliverable:** Full visual flow authoring without touching YAML directly.

### Phase 3 — AI Chat (Weeks 7-9)

**Goal:** Natural language flow generation and refinement via chat.

1. Chat panel (bottom-left, collapsible)
   - Message input with send button
   - Streaming response display with markdown rendering
   - Conversation history (per flow file)
2. LLM integration module (main process)
   - Provider abstraction: OpenAI, Anthropic, Ollama (local)
   - System prompt with AIP schema context and current flow state
   - Function calling / tool use:
     - `generate_flow` — create complete YAML from description
     - `modify_step` — update a specific step
     - `add_step` — insert a new step with dependencies
     - `remove_step` — delete step and clean up refs
     - `explain_flow` — describe what the current flow does
3. Chat → YAML pipeline
   - AI returns YAML diff or complete YAML
   - Parse and validate before applying
   - Show diff preview before accepting
   - Apply updates flow state → canvas re-renders
4. Context-aware prompting
   - Include current flow YAML in context
   - Include selected node details when asking about specific steps
   - Include validation errors for "fix this" requests
5. Prompt templates
   - "Create a flow that..." (generation)
   - "Add a step after X that..." (modification)
   - "Why does this flow have a validation error?" (debugging)
   - "Optimize this flow for parallel execution" (refinement)

**Deliverable:** Chat with AI to generate and refine flows, changes reflected on canvas.

### Phase 4 — YAML Editor & Sync (Weeks 10-11)

**Goal:** Split-view YAML editing with bidirectional sync.

1. Monaco editor integration
   - YAML syntax highlighting
   - JSON Schema-based autocomplete (aip-core.json.schema)
   - Error squiggles from validation
2. Bidirectional sync
   - Canvas edit → YAML updates in editor
   - YAML edit → canvas re-renders (debounced)
   - Conflict resolution: last-write-wins with undo support
3. View modes
   - Canvas only
   - YAML only
   - Split view (canvas left, YAML right)
   - Toggle with keyboard shortcut

**Deliverable:** Edit in either view, changes sync bidirectionally.

### Phase 5 — Settings & Git (Weeks 12-13)

**Goal:** Configuration, git integration, and polish.

1. Settings dialog
   - LLM configuration
     - Provider: OpenAI / Anthropic / Ollama
     - API key (stored in OS keychain via electron safeStorage)
     - Model selection
     - Endpoint URL (for Ollama / custom)
   - Git configuration
     - Repository path
     - Auto-commit on save (toggle)
     - Branch management
   - Appearance
     - Light / Dark / System theme
     - Canvas grid toggle
     - Node label display options
   - Editor preferences
     - Default indent (2/4 spaces)
     - Auto-validate on change
     - Auto-layout new nodes
2. Git integration
   - Status indicator in status bar (branch, dirty state)
   - Commit dialog (message + file selection)
   - Diff view (before/after YAML changes)
   - Branch switcher
3. CLI bridge
   - Run `aip validate` from UI (uses Go CLI)
   - Run `aip test` with mock configuration
   - Run `aip plan` and display execution stages
   - Output panel for CLI results

**Deliverable:** Fully configured app with git workflow support.

### Phase 6 — Mock Lab (Weeks 14-16)

**Goal:** Interactive sandbox for executing flows with mock participants, services, and operators — validating flow behavior without real runtimes.

1. Mock definition format
   - Per-participant mock files (JSON or YAML) stored in a `mocks/` directory alongside the flow
   - Each mock defines: participant ID, output artifacts, status (success/failure), optional delay
   - Support for conditional mocks (different output based on input artifact content)
   - Template mocks auto-generated from flow participant/artifact declarations
   ```yaml
   # mocks/researcher-a.mock.yaml
   participantId: researcher-a
   kind: agent
   responses:
     - match: default
       status: success
       delay: 500ms
       outputs:
         aip://artifact/research-a:
           contentType: text/markdown
           content: "Mock research findings for topic A..."
     - match:
         input:
           aip://artifact/brief:
             contains: "security"
       status: success
       outputs:
         aip://artifact/research-a:
           contentType: text/markdown
           content: "Security-focused research findings..."
   ```

2. Operator mocks
   - Built-in mock implementations for each operator type:
     - `summarize` — concatenates inputs with separator, or returns configurable summary text
     - `rank` — returns inputs in declared order, or shuffled, or reversed
     - `merge` — combines inputs by mode (append, union, keyed overwrite)
     - `filter` — pass-through all, or filter by configurable criteria
     - `await` — immediately resolves with mock input, or waits for user click
   - Operator mock behavior configurable per fanIn step in mock file
   ```yaml
   # mocks/operators.mock.yaml
   operators:
     research-join:
       type: summarize
       behavior: concatenate
     asset-join:
       type: merge
       behavior: pass-through
   ```

3. Service mocks
   - Mock external service participants with request/response pairs
   - Latency simulation (configurable delay per mock)
   - Failure injection (error rate, timeout simulation)
   ```yaml
   # mocks/payment-service.mock.yaml
   participantId: payment-service
   kind: service
   responses:
     - match: default
       status: success
       latency: 200ms
       outputs:
         aip://artifact/payment-result:
           content: { "status": "approved", "txId": "mock-tx-001" }
     - match:
         failureRate: 0.2
       status: failure
       outputs:
         aip://artifact/payment-result:
           content: { "error": "timeout" }
   ```

4. Flow execution engine (renderer process)
   - Topological execution following `aip plan` stage ordering
   - Respects dependsOn, fanOut/fanIn semantics, decision branching
   - Iteration loop execution with mock condition evaluation
   - Await steps pause execution until user provides mock input or clicks "continue"
   - Decision steps evaluate mock conditions to choose branch
   - Subflow steps: inline expand and execute subflow mocks, or treat as single mock

5. Canvas execution visualization
   - Run button in toolbar (▶ Play / ⏸ Pause / ⏹ Stop)
   - Step-through mode: advance one step at a time (⏭ Next)
   - Node state coloring during execution:
     - Gray: pending
     - Blue pulse: running
     - Green: success
     - Red: failure
     - Yellow: awaiting input
     - Orange: iterating (with iteration count badge)
   - Edge animation: flowing dots along edges as data passes
   - Execution progress bar in status bar

6. Trace & inspection panel (bottom panel, tabbed)
   - Timeline tab: ordered list of step executions with timestamps and duration
   - Artifacts tab: browse all produced artifacts with mock content preview
   - Step detail: click a step in timeline to see inputs consumed, outputs produced, mock used
   - Iteration trace: expandable log showing each iteration pass with condition evaluation
   - Decision trace: which branch was taken and why
   - Export trace as JSON for external analysis

7. Mock editor (integrated)
   - Auto-generate mock stubs from flow (one click: "Generate Mocks")
   - Inline mock editing in properties panel when a step is selected
   - Quick-edit mock output directly from the trace panel ("Edit this mock response")
   - Mock file management: list, create, duplicate, delete mock files

8. Execution scenarios
   - Named scenarios: save different mock configurations as named sets
   - Scenario switcher in toolbar dropdown
   - Compare runs: side-by-side trace comparison between scenarios
   - "Happy path" auto-scenario: generates all-success mocks
   - "Failure injection" auto-scenario: randomly fails N% of steps

**Deliverable:** Interactive mock execution environment with visual trace, step-through debugging, and configurable mock scenarios.

### Phase 7 — Polish (Weeks 17-18)

1. Keyboard shortcuts
   - Cmd+N (new), Cmd+O (open), Cmd+S (save)
   - Cmd+Z (undo), Cmd+Shift+Z (redo)
   - Delete (remove selected node)
   - Cmd+D (duplicate node)
   - Cmd+F (find node by id/title)
   - Cmd+Shift+F (format YAML)
2. Onboarding
   - Welcome screen with example flows and keyboard shortcut reference
   - Help button in toolbar to re-open welcome screen
   - Tooltips with shortcut hints on toolbar buttons
3. Performance
   - Virtualized rendering for large flows (100+ nodes)
   - Lazy loading of subflow previews
   - Debounced YAML serialization

### Phase 9 — Cross-Platform Packaging (Future)

1. macOS: DMG with code signing
2. Windows: NSIS installer
3. Auto-update via electron-updater
   - Lazy loading of subflow previews
   - Debounced YAML serialization

---

## Project Structure

```
agent-interaction-protocol/
├── cmd/                          # existing Go CLI
├── schema/                       # existing JSON schemas
├── docs/                         # existing docs
└── ui/                           # new
    ├── package.json
    ├── electron/
    │   ├── main.ts               # Electron main process
    │   ├── preload.ts            # IPC bridge
    │   ├── file-service.ts       # YAML/display file I/O
    │   ├── git-service.ts        # simple-git wrapper
    │   ├── llm-service.ts        # LLM API proxy
    │   ├── cli-bridge.ts         # spawn aip CLI commands
    │   └── mock-service.ts       # Mock file I/O + scenario persistence
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── model/
    │   │   ├── flow.ts           # TypeScript types mirroring schema
    │   │   ├── display.ts        # Display layout types
    │   │   ├── mock.ts           # Mock definition types
    │   │   └── schema.ts         # JSON Schema loader + ajv setup
    │   ├── store/
    │   │   ├── flow-context.tsx   # React Context + useReducer (flow state + undo history)
    │   │   ├── ui-context.tsx     # UI state (panels, selection, theme)
    │   │   ├── chat-context.tsx   # Chat conversation state
    │   │   └── lab-context.tsx    # Mock Lab execution state + trace
    │   ├── yaml/
    │   │   ├── parser.ts         # YAML → Flow model
    │   │   ├── serializer.ts     # Flow model → YAML
    │   │   └── validator.ts      # Schema + semantic validation
    │   ├── lab/
    │   │   ├── engine.ts         # Flow execution engine (topo walk + mocks)
    │   │   ├── mock-loader.ts    # Load/parse mock definition files
    │   │   ├── mock-generator.ts # Auto-generate mock stubs from flow
    │   │   ├── operators.ts      # Built-in operator mock implementations
    │   │   ├── scenario.ts       # Named scenario management
    │   │   └── trace.ts          # Execution trace model + serialization
    │   ├── canvas/
    │   │   ├── FlowCanvas.tsx    # React Flow wrapper
    │   │   ├── nodes/
    │   │   │   ├── ActionNode.tsx
    │   │   │   ├── FanOutNode.tsx
    │   │   │   ├── FanInNode.tsx
    │   │   │   ├── DecisionNode.tsx
    │   │   │   ├── AwaitNode.tsx
    │   │   │   └── ExitNode.tsx
    │   │   ├── edges/
    │   │   │   ├── DependencyEdge.tsx
    │   │   │   └── IterationEdge.tsx
    │   │   └── layout.ts        # dagre auto-layout
    │   ├── panels/
    │   │   ├── Toolbox.tsx       # Drag-and-drop shapes
    │   │   ├── Properties.tsx    # Right-side accordion
    │   │   ├── ChatPanel.tsx     # AI chat interface
    │   │   ├── YamlEditor.tsx    # Monaco YAML editor
    │   │   ├── ValidationPanel.tsx
    │   │   ├── LabControls.tsx   # Run/pause/stop/step-through toolbar
    │   │   ├── TracePanel.tsx    # Execution timeline + artifact browser
    │   │   └── MockEditor.tsx    # Inline mock editing
    │   ├── dialogs/
    │   │   ├── Settings.tsx
    │   │   ├── Participants.tsx
    │   │   ├── Artifacts.tsx
    │   │   └── GitCommit.tsx
    │   └── theme/
    │       └── theme.ts          # MUI theme config (light/dark, palette, typography)
    ├── vite.config.ts
    ├── electron-builder.yml
    └── tsconfig.json
```

---

## Data Flow

```
User Action (drag, edit, chat, run)
       │
       ▼
  React Context + useReducer (flow-context.tsx)
       │
       ├──► YAML Serializer ──► flow.yaml (disk)
       │
       ├──► React Flow Nodes ──► Canvas render
       │
       ├──► Display File ──► flow.display.json (disk)
       │
       ├──► Validator ──► error badges / panel
       │
       └──► Lab Engine (lab-context.tsx)
              │
              ├──► Mock Loader ──► mocks/*.mock.yaml (disk)
              │
              ├──► Execution Trace ──► TracePanel render
              │
              └──► Node State ──► Canvas node coloring (running/success/fail)
```

Every mutation follows: **action → store update → YAML serialize → canvas re-render**. The YAML file on disk is always the canonical representation.

---

## Estimated Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| 1 — Foundation | 3 weeks | Opens and renders YAML flows |
| 2 — Editing | 3 weeks | Full visual authoring |
| 3 — AI Chat | 3 weeks | Natural language flow generation |
| 4 — YAML Editor | 2 weeks | Bidirectional YAML sync |
| 5 — Settings & Git | 2 weeks | Configuration and version control |
| 6 — Mock Lab | 3 weeks | Interactive mock execution and trace |
| 7 — Polish | 2 weeks | Packaging and release |
| 8 — Agent Gallery | 2 weeks | MCP-based agent catalog |
| **Total** | **20 weeks** | |

---

## Resolved Design Decisions

1. Subflow expansion: **open in new tab** — subflows open as separate tabs, not inline on the parent canvas
2. Display file: **committed to git** — co-located with the YAML, versioned alongside the flow
3. Multi-file editing: **yes, tabs** — multiple flows open simultaneously in tabs
4. Collaboration: **future scope** — real-time multi-user editing deferred to a later release
5. Plugin system: **no** — no custom node types or LLM providers; built-in types and providers only
6. Mock Lab await: **require user click** — await steps always pause until the user clicks Continue
7. Mock file format: **support both** — YAML and JSON mock files accepted
8. Trace persistence: **yes, persist to disk** — execution traces saved for regression comparison

---

## Additional Feature: Agent Gallery

An Agent Gallery provides a browsable catalog of available agents that can be used as participants in flows. Agents are discovered and managed via MCP (Model Context Protocol).

### Agent Gallery — Design

```
┌──────────────────────────────────────────────────────────────┐
│  Agent Gallery                                    [+ Add] [×]│
├──────────────────────────────────────────────────────────────┤
│  Search: [________________________]  Filter: [All kinds ▾]   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ▶ Content Writer                              [agent]   │ │
│  │   Writes blog posts, articles, and documentation        │ │
│  │   Capabilities: writing, markdown, research             │ │
│  │                                    [Details] [Add to ▾] │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ▶ Code Reviewer                               [agent]   │ │
│  │   Reviews code for quality, security, and performance   │ │
│  │   Capabilities: code-review, security, linting          │ │
│  │                                    [Details] [Add to ▾] │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ⏸ Human Approver                              [human]   │ │
│  │   Manual review and approval gate                       │ │
│  │                                    [Details] [Add to ▾] │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### MCP Integration

The Agent Gallery uses MCP to discover, query, and manage agents:

- **Discovery**: MCP server exposes `list_agents` tool returning available agents with metadata
- **Details**: `get_agent` tool returns full agent spec (capabilities, constraints, version, description)
- **Registration**: `register_agent` tool adds a new agent to the catalog
- **Removal**: `unregister_agent` tool removes an agent from the catalog

MCP server configuration is managed in Settings (Phase 5) alongside LLM providers.

### Agent Gallery — Implementation

| Component | Description |
|-----------|-------------|
| `electron/mcp-service.ts` | MCP client that connects to configured MCP servers, invokes tools |
| `src/model/agent.ts` | Agent type definitions (id, kind, capabilities, constraints, metadata) |
| `src/store/gallery-context.tsx` | React Context for agent catalog state |
| `src/dialogs/AgentGalleryDialog.tsx` | Browsable gallery with search, filter, detail view |
| `src/panels/AgentDetail.tsx` | Full agent detail panel (capabilities, constraints, version history) |

### Agent Gallery — Workflow

1. User opens Agent Gallery from toolbar
2. Gallery fetches agent list from MCP server(s) via `list_agents`
3. User browses/searches/filters agents by kind, capabilities, or name
4. "Add to flow" adds the agent as a participant in the current flow
5. "Details" shows full agent spec fetched via `get_agent`
6. "Register" opens a form to register a new agent via `register_agent`
7. "Remove" calls `unregister_agent` after confirmation

### Settings — MCP Configuration

```
MCP Servers:
  ┌──────────────────────────────────────────────────┐
  │ Name: agent-registry                             │
  │ Command: uvx agent-registry-mcp-server@latest    │
  │ Env: FASTMCP_LOG_LEVEL=ERROR                     │
  │ Status: ● Connected                [Reconnect]   │
  └──────────────────────────────────────────────────┘
  [+ Add MCP Server]
```

### Estimated Timeline Addition

| Phase | Duration | Milestone |
|-------|----------|-----------|
| 8 — Agent Gallery | 2 weeks | MCP-based agent catalog with browse/add/remove |

Updated total: **20 weeks**
