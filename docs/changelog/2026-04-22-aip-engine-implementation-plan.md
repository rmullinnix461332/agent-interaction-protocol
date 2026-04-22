# AIP Engine — Implementation Plan

## Overview

This document outlines the implementation plan for `aip-engine`, a file-system based Provider Engine for the Agent Interaction Protocol (AIP). The engine is a Go backend using go-chi for HTTP routing and logrus for logging, with no external dependencies on databases, queues, or notification systems.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer (go-chi)                     │
│  /api/v1/admin/*  │  /api/v1/aip/*                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  FlowService │ RunService │ ParticipantService │ ArtifactSvc │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Execution Layer                           │
│  Executor │ Scheduler │ Coordinator │ OperatorEngine        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  FileStore (flows/, runs/, artifacts/, participants/)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Design Decisions

### 2.1 Operator Semantics

| Operator | Behavior |
|----------|----------|
| `summarize` | Template-driven reduction. Template supplied via config or artifact field. |
| `rank` | Simple ordered score list. Criteria supplied as config or artifact field. |
| `merge` | Modes: `append`, `union`, `dedupe`. Keyed overwrite deferred. |
| `filter` | Simple quality/contains/numeric compare rules. |

### 2.2 Condition Expression DSL

Decision `when` conditions use a simple JSON expression DSL:

**Operators**: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`, `exists`

**Example**:
```json
{
  "and": [
    { "eq": { "artifact.status": "approved" } },
    { "gte": { "artifact.score": 0.8 } }
  ]
}
```

### 2.3 Iteration Scope

MVP supports **step-level iteration only**. Subflow iteration deferred.

### 2.4 Built-in Participants

Built-in participants are hardcoded but configurable via participant bindings:

| Participant | Behavior |
|-------------|----------|
| `echo` | Returns input as output |
| `mock` | Returns configured mock response |
| `fail` | Always returns error (for testing) |
| `delay` (optional) | Waits configured duration, returns success |
| `artifact-loader` (optional) | Loads artifact from file path |

### 2.5 Participant Adapter Contract

```go
type AdapterInput struct {
    RunID       string
    StepID      string
    Participant string
    Artifacts   []ResolvedArtifact  // Resolved metadata + optionally resolved content
    Config      map[string]any
}

type AdapterOutput struct {
    Artifacts []ProducedArtifact
    Error     *AdapterError
}

type AdapterError struct {
    Code      string
    Message   string
    Retryable bool
}
```

**Key principle**: Engine resolves artifacts before invocation unless explicitly configured otherwise. Adapters receive clean payload, not unresolved refs.

**Timeout**: Context-based cancellation propagated from run context.

### 2.6 Concurrent Execution

- Goroutine-based parallelism for fanOut
- Engine-level max concurrency config
- Optional per-run max concurrency
- Cancellation propagation through context

### 2.7 Await Timeout

| Setting | Behavior |
|---------|----------|
| No timeout (default) | Run waits indefinitely |
| Timeout configured | Run fails on timeout |

MVP supports only: no timeout, or timeout → fail. Advanced behaviors (cancel, continue, default artifact) deferred.

### 2.8 Run Input/Output

**Input**: Passed at run start via `aip://input/...` namespace.

**Output**:
- Formal output set = declared outputs in flow definition
- Debug/runtime visibility = all produced artifacts available in run inspection

### 2.9 Artifact Storage

| Size | Storage |
|------|---------|
| Small (below threshold) | Inline in JSON |
| Large (above threshold) | Separate file with `contentPath` reference |

Threshold configurable via engine config.

### 2.10 Event Retention

Simple retention config:
- `maxRuns`: Maximum number of runs to retain
- `maxAge`: Maximum age of run data before cleanup

### 2.11 Logs Endpoint

MVP behavior:
- Paginated results
- Filter by `runId`
- Filter by `level`
- No streaming (WebSocket deferred)

### 2.12 Resume Payload

Artifact-shaped, not raw value:

```json
{
  "ref": "aip://input/editor/decision",
  "contentType": "application/json",
  "value": {
    "decision": "approved"
  }
}
```

Stays consistent with AIP artifact model.

---

## 3. Project Structure

```
cmd/aip-engine/
├── main.go                 # Entry point, CLI flags
├── config/
│   ├── config.go           # Configuration loading and management
│   └── types.go            # Config structs (Config, ServerConfig, EngineConfig)
├── internal/
│   ├── models/             # Domain models
│   │   ├── types.go        # All exported structs (Flow, Run, Step, Participant, etc.)
│   │   └── helpers.go      # Unexported helpers (ID generation, defaults, validation)
│   ├── store/              # File-system storage
│   │   ├── store.go        # Store interface and factory
│   │   ├── types.go        # Store-related types (StoreConfig, etc.)
│   │   ├── flow.go         # Flow store operations (exported functions)
│   │   ├── flow_helpers.go # Internal flow store helpers
│   │   ├── run.go          # Run store operations (exported functions)
│   │   ├── run_helpers.go  # Internal run store helpers
│   │   ├── artifact.go     # Artifact store operations
│   │   └── participant.go  # Participant store operations
│   ├── service/            # Business logic
│   │   ├── flow.go         # FlowService exported functions
│   │   ├── flow_helpers.go # Internal flow service helpers
│   │   ├── run.go          # RunService exported functions
│   │   ├── run_helpers.go  # Internal run service helpers
│   │   ├── participant.go  # ParticipantService
│   │   └── artifact.go     # ArtifactService
│   ├── executor/           # Execution engine
│   │   ├── executor.go     # Executor interface and main coordinator
│   │   ├── types.go        # Execution-related types (ExecutionContext, etc.)
│   │   ├── action.go       # Action step execution
│   │   ├── fanout.go       # FanOut step execution
│   │   ├── fanin.go        # FanIn step execution
│   │   ├── decision.go     # Decision step execution
│   │   ├── await.go        # Await step and pause/resume handling
│   │   ├── exit.go         # Exit step execution
│   │   ├── iteration.go    # Iteration handling (forEach, while, bounded)
│   │   ├── operators.go    # Operator implementations (summarize, rank, merge, filter)
│   │   └── helpers.go      # Internal execution helpers
│   └── validation/         # Flow validation
│       ├── validator.go    # Exported validation functions
│       └── helpers.go      # Internal validation helpers
├── handlers/               # HTTP handlers (at project root level)
│   ├── router.go           # Route setup
│   ├── types.go            #go mo Request/response types
│   ├── middleware.go       # Logging, recovery, CORS middleware
│   ├── admin/              # /api/v1/admin/*
│   │   ├── health.go
│   │   ├── info.go
│   │   ├── capabilities.go
│   │   ├── flows.go
│   │   ├── runs.go
│   │   ├── participants.go
│   │   ├── artifacts.go
│   │   └── diagnostics.go
│   └── aip/                # /api/v1/aip/* (protocol endpoints) [future]
│       └── protocol.go
├── pkg/                    # Reusable packages [future]
│   └── aipref/             # aip:// reference parsing
│       ├── ref.go          # Exported reference parsing functions
│       └── types.go        # Reference-related types
└── go.mod
```

### File Organization Notes

Following Go code organization best practices:

- **`types.go`**: Contains all exported structs, interfaces, type aliases, and public constants/enums for each package
- **`helpers.go`**: Contains unexported utility functions, internal data structures, and implementation details
- **Feature files** (e.g., `flow.go`, `run.go`): Contain exported functions that form the package's public API
- **Feature helpers** (e.g., `flow_helpers.go`): Contain unexported helpers specific to that feature
- Use `any` instead of `interface{}` for Go 1.18+
- Target files under 300 lines; split when approaching 500 lines

---

## 3. Core Domain Models

All domain models are defined in `internal/models/types.go`. Helper functions (ID generation, defaults, validation) go in `internal/models/helpers.go`.

### 3.1 Flow (from schema)

```go
type Flow struct {
    APIVersion      string            `json:"apiVersion"`
    Kind            string            `json:"kind"` // always "Flow"
    Metadata        FlowMetadata      `json:"metadata"`
    Participants    []Participant     `json:"participants"`
    Artifacts       []Artifact        `json:"artifacts"`
    Steps           []Step            `json:"steps"`
    ProviderBinding *ProviderBinding  `json:"providerBinding,omitempty"`
}

type FlowMetadata struct {
    Name        string            `json:"name"`
    Title       string            `json:"title,omitempty"`
    Version     string            `json:"version,omitempty"`
    Description string            `json:"description,omitempty"`
    Labels      map[string]string `json:"labels,omitempty"`
}
```

### 3.2 Run

```go
type Run struct {
    ID            string          `json:"id"`
    FlowID        string          `json:"flowId"`
    FlowName      string          `json:"flowName"`
    Status        RunStatus       `json:"status"`
    StartedAt     time.Time       `json:"startedAt"`
    CompletedAt   *time.Time      `json:"completedAt,omitempty"`
    CurrentStep   string          `json:"currentStep,omitempty"`
    AwaitState    *AwaitState     `json:"awaitState,omitempty"`
    StepStatuses  map[string]StepStatus `json:"stepStatuses"`
    Input         map[string]any  `json:"input,omitempty"`
    Output        map[string]any  `json:"output,omitempty"`
    Error         string          `json:"error,omitempty"`
}

type RunStatus string

const (
    RunStatusPending   RunStatus = "pending"
    RunStatusRunning   RunStatus = "running"
    RunStatusAwaiting  RunStatus = "awaiting"
    RunStatusCompleted RunStatus = "completed"
    RunStatusFailed    RunStatus = "failed"
    RunStatusCancelled RunStatus = "cancelled"
)

type StepStatus struct {
    Status      string    `json:"status"`
    StartedAt   *time.Time `json:"startedAt,omitempty"`
    CompletedAt *time.Time `json:"completedAt,omitempty"`
    Error       string    `json:"error,omitempty"`
}

type AwaitState struct {
    StepID       string    `json:"stepId"`
    AwaitInputRef string   `json:"awaitInputRef"`
    ResumedAt    *time.Time `json:"resumedAt,omitempty"`
    ResumeValue  any       `json:"resumeValue,omitempty"`
}
```

### 3.3 Participant

```go
type Participant struct {
    ID           string            `json:"id"`
    Kind         ParticipantKind   `json:"kind"`
    Title        string            `json:"title,omitempty"`
    Description  string            `json:"description,omitempty"`
    FlowRef      string            `json:"flowRef,omitempty"`     // for subflow
    Version      string            `json:"version,omitempty"`
    Capabilities []string          `json:"capabilities,omitempty"`
    Constraints  map[string]any    `json:"constraints,omitempty"`
}

type ParticipantKind string

const (
    ParticipantKindAgent    ParticipantKind = "agent"
    ParticipantKindService  ParticipantKind = "service"
    ParticipantKindHuman    ParticipantKind = "human"
    ParticipantKindSubflow  ParticipantKind = "subflow"
)
```

### 3.4 Step

```go
type Step struct {
    ID             string        `json:"id"`
    Type           StepType      `json:"type"`
    Title          string        `json:"title,omitempty"`
    Description    string        `json:"description,omitempty"`
    ParticipantRef string        `json:"participantRef,omitempty"`
    DependsOn      []string      `json:"dependsOn,omitempty"`
    Consumes       []string      `json:"consumes,omitempty"`
    Produces       []string      `json:"produces,omitempty"`
    Steps          []string      `json:"steps,omitempty"`        // fanOut
    Condition      string        `json:"condition,omitempty"`    // fanIn
    Operator       *Operator     `json:"operator,omitempty"`
    Decision       *Decision     `json:"decision,omitempty"`
    Iteration      *Iteration    `json:"iteration,omitempty"`
    AwaitInput     *AwaitInput   `json:"awaitInput,omitempty"`
    Exit           *Exit         `json:"exit,omitempty"`
    Extensions     map[string]any `json:"extensions,omitempty"`
}

type StepType string

const (
    StepTypeAction   StepType = "action"
    StepTypeFanOut   StepType = "fanOut"
    StepTypeFanIn    StepType = "fanIn"
    StepTypeDecision StepType = "decision"
    StepTypeAwait    StepType = "await"
    StepTypeExit     StepType = "exit"
)
```

### 3.5 Artifact

```go
type Artifact struct {
    Ref          string            `json:"ref"`
    ContentType  string            `json:"contentType,omitempty"`
    ContractRef  string            `json:"contractRef,omitempty"`
    Title        string            `json:"title,omitempty"`
    Description  string            `json:"description,omitempty"`
    Producer     string            `json:"producer,omitempty"`
    Consumers    []string          `json:"consumers,omitempty"`
    Required     bool              `json:"required,omitempty"`
    Metadata     map[string]any    `json:"metadata,omitempty"`
}

// RuntimeArtifact - stored artifact with content
type RuntimeArtifact struct {
    Artifact
    RunID       string    `json:"runId"`
    StepID      string    `json:"stepId,omitempty"`
    Content     []byte    `json:"content,omitempty"`
    ContentPath string    `json:"contentPath,omitempty"` // file path for large artifacts
    CreatedAt   time.Time `json:"createdAt"`
    Size        int64     `json:"size"`
}
```

### 3.6 Event

```go
type Event struct {
    ID        string    `json:"id"`
    RunID     string    `json:"runId"`
    Type      EventType `json:"type"`
    StepID    string    `json:"stepId,omitempty"`
    Timestamp time.Time `json:"timestamp"`
    Message   string    `json:"message,omitempty"`
    Data      map[string]any `json:"data,omitempty"`
}

type EventType string

const (
    EventTypeRunStarted    EventType = "run_started"
    EventTypeStepStarted   EventType = "step_started"
    EventTypeStepCompleted EventType = "step_completed"
    EventTypeStepFailed    EventType = "step_failed"
    EventTypeAwaitEntered  EventType = "await_entered"
    EventTypeAwaitResumed  EventType = "await_resumed"
    EventTypeArtifactProduced EventType = "artifact_produced"
    EventTypeRunCompleted  EventType = "run_completed"
    EventTypeRunFailed     EventType = "run_failed"
)
```

### 3.7 Condition Expression DSL

```go
// Condition represents a decision condition expression
type Condition struct {
    // Exactly one of these operators should be set
    Eq    *Comparison `json:"eq,omitempty"`
    Ne    *Comparison `json:"ne,omitempty"`
    Gt    *Comparison `json:"gt,omitempty"`
    Gte   *Comparison `json:"gte,omitempty"`
    Lt    *Comparison `json:"lt,omitempty"`
    Lte   *Comparison `json:"lte,omitempty"`
    Exists *PathExpr  `json:"exists,omitempty"`
    And   []Condition `json:"and,omitempty"`
    Or    []Condition `json:"or,omitempty"`
    Not   *Condition  `json:"not,omitempty"`
}

type Comparison struct {
    Path  string `json:"path"`  // e.g., "artifact.status" or "artifact.score"
    Value any    `json:"value"`
}

type PathExpr struct {
    Path string `json:"path"`
}
```

### 3.8 Participant Adapter Types

```go
// AdapterInput is passed to participant adapters
type AdapterInput struct {
    RunID       string             `json:"runId"`
    StepID      string             `json:"stepId"`
    Participant string             `json:"participant"`
    Artifacts   []ResolvedArtifact `json:"artifacts"`
    Config      map[string]any     `json:"config,omitempty"`
}

// ResolvedArtifact contains resolved metadata and optionally content
type ResolvedArtifact struct {
    Ref         string         `json:"ref"`
    ContentType string         `json:"contentType"`
    Metadata    map[string]any `json:"metadata,omitempty"`
    Content     []byte         `json:"content,omitempty"`     // Resolved by engine
    HasContent  bool           `json:"hasContent,omitempty"`  // True if content was resolved
}

// AdapterOutput is returned by participant adapters
type AdapterOutput struct {
    Artifacts []ProducedArtifact `json:"artifacts,omitempty"`
    Error     *AdapterError      `json:"error,omitempty"`
}

// ProducedArtifact represents an artifact produced by a participant
type ProducedArtifact struct {
    Ref         string         `json:"ref"`
    ContentType string         `json:"contentType"`
    Content     []byte         `json:"content,omitempty"`
    ContentPath string         `json:"contentPath,omitempty"` // For large artifacts
    Metadata    map[string]any `json:"metadata,omitempty"`
}

// AdapterError represents a structured error from a participant adapter
type AdapterError struct {
    Code      string `json:"code"`
    Message   string `json:"message"`
    Retryable bool   `json:"retryable,omitempty"`
}

// Adapter is the interface for participant implementations
type Adapter interface {
    Execute(ctx context.Context, input *AdapterInput) (*AdapterOutput, error)
}
```

### 3.9 Resume Payload

```go
// ResumePayload is the artifact-shaped payload for resuming await states
type ResumePayload struct {
    Ref         string `json:"ref"`
    ContentType string `json:"contentType,omitempty"`
    Value       any    `json:"value,omitempty"`
}
```

---

## 4. File-System Storage Layout

```
{data-dir}/
├── engine.json              # Engine metadata (id, name, type, version)
├── flows/
│   ├── {flow-name}.json     # Flow definition
│   └── {flow-name}/
│       └── metadata.json    # Flow metadata (installed, lastRun, runCount)
├── runs/
│   ├── {run-id}.json        # Run state
│   └── {run-id}/
│       ├── events.json      # Event log
│       └── artifacts/
│           └── {artifact-ref}.json
├── participants/
│   └── {participant-id}.json # Participant bindings/config
└── diagnostics/
    └── engine.log           # Engine logs
```

---

## 5. API Implementation

### 5.1 Admin API Endpoints (`/api/v1/admin`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Engine health check |
| `/info` | GET | Engine identity (name, version, type, uptime) |
| `/capabilities` | GET | Supported features |
| `/flows` | GET, POST | List/connect flows |
| `/flows/{flowId}` | GET, DELETE | Inspect/disconnect flow |
| `/runs` | GET | List runs |
| `/runs/{runId}` | GET | Inspect run |
| `/runs/{flowId}/start` | POST | Start new run |
| `/runs/{runId}/stop` | POST | Stop run |
| `/runs/{runId}/resume` | POST | Resume await state |
| `/participants` | GET | List participants |
| `/participants/{id}` | GET | Inspect participant |
| `/runs/{runId}/artifacts` | GET | List run artifacts |
| `/runs/{runId}/artifacts/{ref}` | GET | Read artifact |
| `/diagnostics` | GET | General diagnostics |
| `/runs/{runId}/events` | GET | Run event timeline |
| `/logs` | GET | Engine logs (paginated, filterable) |

### 5.2 Response Models

Request and response types are defined in `internal/http/types.go`.

```go
// HealthResponse
type HealthResponse struct {
    Status  string `json:"status"` // "healthy", "degraded", "unhealthy"
    Uptime  string `json:"uptime"`
    Version string `json:"version"`
}

// InfoResponse
type InfoResponse struct {
    Name       string    `json:"name"`
    Version    string    `json:"version"`
    Type       string    `json:"type"` // "local", "mock", "mcp"
    Uptime     string    `json:"uptime"`
    StartedAt  time.Time `json:"startedAt"`
}

// CapabilitiesResponse
type CapabilitiesResponse struct {
    Await           bool     `json:"await"`
    Subflows        bool     `json:"subflows"`
    Iteration       bool     `json:"iteration"`
    Operators       []string `json:"operators"`
    MockScenarios   bool     `json:"mockScenarios"`
    ArtifactPreview bool     `json:"artifactPreview"`
}

// FlowListResponse
type FlowListResponse struct {
    Flows []FlowSummary `json:"flows"`
}

type FlowSummary struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Title       string    `json:"title,omitempty"`
    Version     string    `json:"version,omitempty"`
    Status      string    `json:"status"`
    InstalledAt time.Time `json:"installedAt"`
    LastRunAt   *time.Time `json:"lastRunAt,omitempty"`
    RunCount    int       `json:"runCount"`
}

// RunListResponse
type RunListResponse struct {
    Runs []RunSummary `json:"runs"`
}

type RunSummary struct {
    ID          string    `json:"id"`
    FlowID      string    `json:"flowId"`
    FlowName    string    `json:"flowName"`
    Status      string    `json:"status"`
    StartedAt   time.Time `json:"startedAt"`
    CompletedAt *time.Time `json:"completedAt,omitempty"`
    Duration    string    `json:"duration,omitempty"`
}
```

### 5.3 Logs Endpoint

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `runId` | string | Filter logs by run ID |
| `level` | string | Filter by log level (debug, info, warn, error) |
| `offset` | int | Pagination offset |
| `limit` | int | Max results (default: 100, max: 1000) |

**Response**:
```go
type LogsResponse struct {
    Logs     []LogEntry `json:"logs"`
    Offset   int        `json:"offset"`
    Limit    int        `json:"limit"`
    Total    int        `json:"total"`
    HasMore  bool       `json:"hasMore"`
}

type LogEntry struct {
    Timestamp time.Time `json:"timestamp"`
    Level     string    `json:"level"`
    RunID     string    `json:"runId,omitempty"`
    StepID    string    `json:"stepId,omitempty"`
    Message   string    `json:"message"`
    Fields    map[string]any `json:"fields,omitempty"`
}
```

---

## 6. Execution Engine

The Executor interface and execution-related types are defined in `internal/executor/types.go`. Step execution logic is separated into dedicated files per step type.

### 6.1 Executor Interface

```go
type Executor interface {
    // Start begins execution of a run
    Start(ctx context.Context, run *Run) error
    
    // Stop halts a running execution
    Stop(ctx context.Context, runID string) error
    
    // Resume continues an await state
    Resume(ctx context.Context, runID string, value any) error
    
    // GetStatus returns current execution status
    GetStatus(runID string) (*Run, error)
}
```

### 6.2 Step Execution Flow

```
1. Load flow definition
2. Validate flow (dependencies, references, bindings)
3. Create run record
4. Build execution plan (topological sort of steps)
5. Execute steps in dependency order:
   - action: invoke participant, produce artifacts
   - fanOut: spawn parallel step executions
   - fanIn: wait for upstream steps, apply condition
   - decision: evaluate cases, route to next step(s)
   - await: pause run, wait for resume
   - exit: terminate run with status
6. Record events at each transition
7. Persist artifacts
8. Update run status
```

### 6.3 Operator Implementations

| Operator | Behavior |
|----------|----------|
| `summarize` | Template-driven reduction. Template from `config.template` or artifact field. |
| `rank` | Ordered score list. Criteria from `config.criteria` or artifact field. Output: top-N based on `topN` config. |
| `merge` | Combine outputs. Modes: `append` (concatenate), `union` (unique), `dedupe` (remove duplicates). |
| `filter` | Remove outputs not meeting criteria. Rules: quality, contains, numeric compare. |

**Operator Config Examples**:

```yaml
# Summarize
operator:
  type: summarize
  config:
    template: "Summary of {{.Artifacts}}: {{.Content}}"

# Rank
operator:
  type: rank
  topN: 3
  config:
    criteria: "score"  # Field path in artifact

# Merge
operator:
  type: merge
  mode: append

# Filter
operator:
  type: filter
  config:
    rules:
      - field: "quality"
        op: gte
        value: 0.8
```

### 6.4 Participant Binding Resolution

```go
type ParticipantBinding struct {
    ParticipantRef string         `json:"participantRef"`
    ProviderTarget string         `json:"providerTarget"`
    Config         map[string]any `json:"config,omitempty"`
}
```

**Built-in Participants**:

| Target | Behavior | Config Options |
|--------|----------|----------------|
| `echo` | Returns input as output | None |
| `mock` | Returns configured mock response | `response`: the mock response data |
| `fail` | Always returns error | `code`, `message`, `retryable` |
| `delay` (optional) | Waits configured duration | `duration`: time string (e.g., "5s") |
| `artifact-loader` (optional) | Loads artifact from file | `path`: file path to load |

**Example Binding**:
```yaml
participantBindings:
  - participantRef: researcher
    providerTarget: mock
    config:
      response:
        findings: "Mock research results"
```

---

## 7. Implementation Phases

### Phase 1: Foundation (MVP)

**Goal**: Basic engine that can load flows and report status

1. Project scaffolding (go.mod, main.go, config)
2. Domain models (flow, run, participant, artifact, event)
3. File-system store implementation
4. HTTP router setup with go-chi
5. Admin API: health, info, capabilities
6. Admin API: flows (list, get, connect, disconnect)
7. Basic validation (schema validation, dependency resolution)

**Deliverable**: Engine that can be discovered by aip-desktop

### Phase 2: Execution Core

**Goal**: Execute simple sequential flows

1. Run service (create, start, stop, get)
2. Admin API: runs endpoints
3. Executor framework
4. Step executor for `action` type
5. Mock participant adapter
6. Event recording
7. Artifact storage

**Deliverable**: Engine that can run simple action→action flows

### Phase 3: Flow Control

**Goal**: Support all step types

1. FanOut execution (parallel step spawning)
2. FanIn execution (condition evaluation)
3. Decision step (case evaluation, routing)
4. Exit step (status termination)
5. Iteration support (forEach, while, bounded)

**Deliverable**: Engine that handles complex flow topologies

### Phase 4: Await/Resume

**Goal**: Pause and resume flows

1. Await step implementation
2. Run state persistence (await state)
3. Resume API endpoint
4. Await input validation
5. Human participant handling

**Deliverable**: Engine that supports human-in-the-loop workflows

### Phase 5: Operators

**Goal**: Implement coordination operators

1. Summarize operator
2. Rank operator
3. Merge operator (append, union, dedupe modes)
4. Filter operator

**Deliverable**: Full operator support

### Phase 6: Diagnostics & Polish

**Goal**: Production-ready local engine

1. Diagnostics API
2. Log streaming endpoint
3. Error handling improvements
4. Performance optimization
5. Documentation

**Deliverable**: Complete local engine ready for aip-desktop integration

---

## 8. Dependencies

```go
// go.mod
module github.com/example/aip-engine

go 1.22

require (
    github.com/go-chi/chi/v5 v5.0.12        // HTTP router
    github.com/sirupsen/logrus v1.9.3       // Logging
    github.com/xeipuuv/gojsonschema v1.2.0  // JSON schema validation
)
```

---

## 9. Configuration

```yaml
# config.yaml (optional, defaults shown)
server:
  host: "localhost"
  port: 8080

engine:
  name: "local-engine"
  type: "local"
  dataDir: "./data"
  maxConcurrency: 10              # Engine-level max concurrent step executions
  artifactSizeThreshold: 65536    # Bytes; artifacts larger go to separate files

execution:
  defaultAwaitTimeout: ""         # Empty = no timeout; otherwise duration string (e.g., "30m")
  awaitTimeoutBehavior: "fail"    # MVP only supports "fail"

retention:
  maxRuns: 100                    # Maximum runs to retain
  maxAge: "168h"                  # Maximum age before cleanup (7 days)

logging:
  level: "info"
  format: "json"

participants:
  builtins:
    echo:
      enabled: true
    mock:
      enabled: true
    fail:
      enabled: true
    delay:
      enabled: false              # Optional
    artifact-loader:
      enabled: false              # Optional
```

---

## 10. CLI Usage

```bash
# Start engine with defaults
aip-engine

# Start with custom config
aip-engine --config /path/to/config.yaml

# Start with flags
aip-engine --port 3000 --data-dir /var/lib/aip-engine

# Show version
aip-engine --version
```

---

## 11. Testing Strategy

### Unit Tests
- Model serialization/deserialization
- Store operations (CRUD)
- Step execution logic
- Operator implementations
- Validation rules

### Integration Tests
- Full API endpoint testing
- Flow execution end-to-end
- Await/resume cycle
- Artifact persistence

### Test Data
- Sample flows in `testdata/flows/`
- Mock participants for testing

---

## 12. Deferred Features

The following are explicitly deferred for future releases:

| Feature | Reason |
|---------|--------|
| CEL / JSONPath expression support | Simple DSL sufficient for MVP |
| Subflow iteration | Step-level iteration covers most use cases |
| Keyed overwrite merge mode | Append/union/dedupe sufficient for MVP |
| Plugin-loaded mock participants | Built-in participants cover testing needs |
| WebSocket log streaming | Paginated HTTP sufficient for MVP |
| Advanced retention policy | Simple maxRuns/maxAge sufficient |
| Complicated output selection policies | All artifacts visible in run inspection |
| Rich timeout behaviors beyond fail | Single behavior simplifies implementation |
| Engine-to-engine remote delegation | Local-only for MVP |
| WebSocket support for real-time events | Polling sufficient for MVP |
| Subflow execution | Complex feature, defer to later phase |
| MCP participant adapter | Requires MCP integration |
| Remote participant adapters | Local-only for MVP |
| Flow versioning | Single version per flow for MVP |
| Run replay | Debug feature, not core |
| Metrics endpoint | Observability enhancement |
| Authentication/authorization | Local-only, no auth needed |
| TLS support | Local-only for MVP |

---

## 13. Success Criteria

1. Engine starts and responds to health checks
2. Flows can be connected via API
3. Simple flows execute successfully
4. Complex flows with fanOut/fanIn work correctly
5. Await/resume cycle functions properly
6. Artifacts are persisted and retrievable
7. Events are recorded for each run
8. aip-desktop can connect and manage the engine

---

## Appendix A: Sample Flow for Testing

```yaml
apiVersion: aip/v0.1
kind: Flow
metadata:
  name: simple-pipeline
  title: Simple Pipeline
  version: "1.0"
participants:
  - id: researcher
    kind: agent
    title: Research Agent
  - id: writer
    kind: agent
    title: Writer Agent
artifacts:
  - ref: aip://artifact/research-output
    title: Research Output
  - ref: aip://artifact/final-report
    title: Final Report
steps:
  - id: research
    type: action
    participantRef: researcher
    produces:
      - aip://artifact/research-output
  - id: write
    type: action
    participantRef: writer
    dependsOn:
      - research
    consumes:
      - aip://artifact/research-output
    produces:
      - aip://artifact/final-report
```

---

## Appendix B: API Request/Response Examples

### Connect Flow

```bash
POST /api/v1/admin/flows
Content-Type: application/json

{
  "flow": { ... full flow definition ... }
}
```

```json
{
  "id": "simple-pipeline",
  "name": "simple-pipeline",
  "title": "Simple Pipeline",
  "status": "connected",
  "installedAt": "2024-01-15T10:30:00Z"
}
```

### Start Run

```bash
POST /api/v1/admin/runs/simple-pipeline/start
Content-Type: application/json

{
  "input": {
    "aip://input/topic": {
      "contentType": "text/plain",
      "value": "AI agents in software development"
    }
  }
}
```

```json
{
  "runId": "run-abc123",
  "flowId": "simple-pipeline",
  "status": "running",
  "startedAt": "2024-01-15T10:31:00Z"
}
```

### Resume Await

```bash
POST /api/v1/admin/runs/run-abc123/resume
Content-Type: application/json

{
  "ref": "aip://input/editor/decision",
  "contentType": "application/json",
  "value": {
    "decision": "approved",
    "comment": "Proceed with publication"
  }
}
```

---

## Appendix C: Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "FLOW_NOT_FOUND",
    "message": "Flow 'unknown-flow' not found",
    "details": {}
  }
}
```

Common error codes:
- `FLOW_NOT_FOUND`
- `RUN_NOT_FOUND`
- `VALIDATION_ERROR`
- `EXECUTION_ERROR`
- `INVALID_STATE`
- `PARTICIPANT_NOT_FOUND`
- `ARTIFACT_NOT_FOUND`
