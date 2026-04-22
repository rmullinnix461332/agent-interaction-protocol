# AIP Runtime Desktop (aip-desktop)

## 1. Purpose

AIP Runtime Desktop (`aip-desktop`) is the local control plane for managing one or more AIP Provider Engines.

It provides a visual operational interface for connecting flows, monitoring executions, inspecting artifacts, managing participants, and troubleshooting runtime behavior.

It serves a similar role to tools such as Docker Desktop:

* runtime visibility
* local management
* operational control
* diagnostics
* multi-engine management

`aip-desktop` does **not** define workflow semantics.
Workflow semantics remain owned by the AIP Protocol.

---

## 2. Primary Goals

`aip-desktop` exists to answer:

* What engines are available?
* What flows are connected?
* What is currently running?
* What completed or failed?
* What artifacts were produced?
* What participants are available?
* What needs attention?
* What is misconfigured?

---

## 3. Relationship to Other Components

| Component       | Role                 |
| --------------- | -------------------- |
| AIP Protocol    | Defines flows        |
| AIP CLI         | Validation / tooling |
| AIP Studio      | Flow authoring       |
| Provider Engine | Executes flows       |
| aip-desktop     | Operates engines     |

---

## 4. Core Concepts

### Engine

A runtime backend process capable of executing AIP workflows.

Examples:

* Mock Engine
* Local Engine
* MCP Engine
* Cloud Engine

### Flow

A connected workflow definition installed on an engine.

### Run

One execution instance of a flow.

### Participant

Agent, service, human endpoint, or subflow binding available to an engine.

### Artifact

Input, intermediate, or output object produced during a run.

---

## 5. Main Application Areas

---

## 5.1 Dashboard

Landing page showing:

* engines online / offline
* active runs
* pending awaits
* recent failures
* recent successful runs
* engine health summary

---

## 5.2 Engines

Manage installed or connected engines.

Per engine:

* name
* type
* version
* status
* uptime
* capabilities
* endpoint

Actions:

* start
* stop
* restart
* remove
* inspect
* open logs

Example:

```text id="4xk3vp"
Engines
- mock-local         Running
- local-runtime      Running
- mcp-runtime        Stopped
```

---

## 5.3 Flows

Connected workflows deployed to engines.

Per flow:

* name
* version
* source path
* bound engine
* status
* last run
* run count

Actions:

* run now
* pause
* disable
* update
* disconnect
* inspect graph

---

## 5.4 Runs

Execution history and active runtime state.

Per run:

* run ID
* flow
* engine
* status
* started / ended
* duration
* active step
* await state

Actions:

* inspect
* stop
* resume
* replay
* export trace

---

## 5.5 Participants

Runtime participant registry.

Examples:

* research-agent
* writer-agent
* github-service
* filesystem-tool
* approval-human
* asset-subflow

Display:

* type
* status
* capabilities
* auth state
* last used

---

## 5.6 Artifacts

Artifacts generated during runs.

Examples:

* markdown reports
* JSON outputs
* image assets
* logs
* ranked result sets

Display:

* artifact ref
* run ID
* content type
* size
* producer
* created time

Actions:

* preview
* export
* trace lineage

---

## 5.7 Diagnostics

Troubleshooting and health center.

Includes:

* failed runs
* participant errors
* await timeouts
* missing bindings
* artifact failures
* engine warnings
* capability mismatches

Actions:

* inspect logs
* validate bindings
* replay failed run
* export diagnostics bundle

---

## 6. Typical User Flow

```text id="8wq7ua"
Open aip-desktop
 ↓
See engine status
 ↓
Select flow
 ↓
Run flow
 ↓
Observe live execution
 ↓
Inspect outputs
 ↓
Troubleshoot if needed
```

---

## 7. Multi-Engine Support

`aip-desktop` should support multiple simultaneous engines.

Example:

```text id="5p3dht"
Desktop
 ├─ Mock Engine
 ├─ Local Engine
 └─ MCP Engine
```

Users may compare behavior across engines or route flows to different runtimes.

---

## 8. Live Execution View

Recommended run detail screen:

### Graph View

Nodes marked as:

* pending
* running
* complete
* failed
* awaiting input

### Timeline View

Chronological events:

* run started
* step completed
* artifact produced
* await entered
* resumed
* run complete

### Artifact View

All outputs grouped by step.

---

## 9. Engine Communication

`aip-desktop` communicates with engines through the management interface:

```text id="7y2nkp"
/api/v1/admin
```

Typical resources:

* health
* info
* capabilities
* flows
* runs
* participants
* artifacts
* diagnostics

---

## 10. Design Principles

### Local First

Should work well on one machine.

### Provider Neutral

Any compliant engine may connect.

### Operational Clarity

Users should quickly understand runtime state.

### Strong Diagnostics

Failures should be legible.

### Separate Authoring from Operations

Flow design belongs to AIP Studio.
Runtime operation belongs to `aip-desktop`.

---

## 11. Future Enhancements

* notifications
* run scheduling
* side-by-side engine comparisons
* remote engine support
* shared team views
* plugin panels
* metrics dashboards

---

## 12. Summary

`aip-desktop` is the runtime management application for AIP systems.

It gives users a clean operational surface to manage engines, run flows, inspect artifacts, and troubleshoot workflows without coupling runtime management to protocol authoring.

