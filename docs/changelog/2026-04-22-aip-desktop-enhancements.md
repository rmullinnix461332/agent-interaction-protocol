# AIP Desktop — Enhancement Plan

## Overview

Three enhancements to improve the flow connection experience, participant management, and runtime visibility.

---

## 1. Connect Flow Wizard

### Problem

Connecting a flow currently accepts raw JSON/YAML and sends it directly to the engine. Participants are auto-assigned to the `echo` adapter with no user input. Users have no opportunity to configure which adapter (mock, echo, fail, delay) each participant should use, or to provide adapter-specific config (mock responses, delay durations, etc.).

### Solution

Replace the single-step connect dialog with a multi-step wizard:

**Step 1: Load Flow**
- Open file (JSON/YAML) or paste content (existing behavior)
- Parse and validate the flow
- Show flow summary: name, participant count, step count, artifact count

**Step 2: Configure Participants**
- Table of all participants from the flow definition
- Per participant:
  - ID (read-only, from flow)
  - Kind (read-only: agent/service/human/subflow)
  - Provider Target (dropdown: echo, mock, fail, delay)
  - Config (JSON editor, context-sensitive to target)
    - mock: `response` object
    - fail: `code`, `message`, `retryable`
    - delay: `duration` string
    - echo: no config needed
- Pre-populate from existing `providerBinding` if present in the flow

**Step 3: Review & Connect**
- Show final flow JSON with provider bindings applied
- Confirm button sends to engine

### Components

```
src/components/flows/
├── ConnectFlowWizard.tsx       # Multi-step dialog container
├── WizardStepLoad.tsx          # Step 1: file load + parse
├── WizardStepParticipants.tsx  # Step 2: participant binding config
└── WizardStepReview.tsx        # Step 3: review + confirm
```

### API Changes

None. The wizard builds the same `POST /flows` payload, but with a populated `providerBinding.participantBindings` array.

### Implementation Steps

1. Create `ConnectFlowWizard` with MUI Stepper (3 steps)
2. Move existing file load logic into `WizardStepLoad`
3. Build `WizardStepParticipants` with editable table
4. Build `WizardStepReview` with read-only YAML preview
5. Replace `ConnectFlowDialog` usage in `Flows.tsx` with the wizard
6. Keep the old dialog available as a "Quick Connect (JSON)" option for power users

---

## 2. Participant Editing

### Problem

The Participants page is read-only. Users cannot change a participant's adapter binding or config after a flow is connected. The only way to change bindings is to disconnect and reconnect the flow.

### Solution

Add edit and delete capabilities to the Participants page, plus an engine API endpoint for updating bindings.

### Engine Changes (aip-engine)

Add `PUT /api/v1/admin/participants/{id}` endpoint:

```go
// UpdateParticipantHandler updates a participant binding
func UpdateParticipantHandler(fs *store.FileStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        var binding models.ParticipantBinding
        json.NewDecoder(r.Body).Decode(&binding)
        binding.ParticipantRef = id
        fs.ParticipantStore().Save(&binding)
        respondJSON(w, http.StatusOK, binding)
    }
}
```

Wire route: `r.Put("/participants/{id}", admin.UpdateParticipantHandler(fs))`

### Desktop Changes (aip-desktop)

**API client**: Add `updateParticipant(id, binding)` and `deleteParticipant(id)` methods.

**Edit dialog**: `EditParticipantDialog.tsx`
- Participant ref (read-only)
- Provider target (dropdown: echo, mock, fail, delay)
- Config (JSON editor)
- Save button calls `PUT /participants/{id}`

**Participants page updates**:
- Add edit (pencil) icon button per row
- Add delete (trash) icon button per row
- Edit opens `EditParticipantDialog`
- Delete calls `DELETE /participants/{id}` with confirmation

### Components

```
src/components/participants/
└── EditParticipantDialog.tsx    # Edit binding dialog
```

### Implementation Steps

1. Add `PUT /participants/{id}` to aip-engine
2. Add `updateParticipant` and `deleteParticipant` to desktop API client
3. Create `EditParticipantDialog`
4. Add edit/delete actions to Participants page table
5. Refresh participant list after edit/delete

---

## 3. Engine Logging Improvements

### Problem

The desktop log viewer only shows HTTP request logs (health checks, API calls). No execution activity appears because:

1. The executor uses `e.emitEvent()` to record runtime events to the event store, but never calls `e.logger` with structured `runId`/`stepId` fields
2. The logrus hook captures entries to the in-memory buffer, but the executor doesn't produce logrus entries for execution activity
3. The HTTP middleware logs every request (including 10-second health polls), which floods the log viewer with noise

### Solution

Three changes:

### 3a. Add Structured Logging to Executor

Add `e.logger.WithFields(logrus.Fields{"runId": ..., "stepId": ...}).Info(...)` calls at key execution points:

| Event | Log Level | Message |
|-------|-----------|---------|
| Run started | info | `Run started: {flowId}` |
| Step started | info | `Step started: {stepId} ({stepType})` |
| Step completed | info | `Step completed: {stepId}` |
| Step failed | error | `Step failed: {stepId}: {error}` |
| Adapter resolved | debug | `Adapter resolved: {participantRef} -> {target}` |
| Artifact produced | debug | `Artifact produced: {ref} ({size} bytes)` |
| Await entered | info | `Await entered: {stepId} waiting for {ref}` |
| Await resumed | info | `Await resumed: {stepId}` |
| Run completed | info | `Run completed: {runId} ({duration})` |
| Run failed | error | `Run failed: {runId}: {error}` |
| Flow connected | info | `Flow connected: {flowName}` |
| Flow disconnected | info | `Flow disconnected: {flowName}` |

All execution log entries must include `runId` field so the desktop can filter by run.

### 3b. Filter Health Check Noise

Modify the HTTP logger middleware to skip logging for `GET /health` requests (or log them at `debug` level instead of `info`). This prevents health poll noise from drowning out execution activity.

```go
// In LoggerMiddleware
if r.URL.Path == "/api/v1/admin/health" {
    logger.WithFields(fields).Debug("HTTP request")
} else {
    logger.WithFields(fields).Info("HTTP request")
}
```

### 3c. Add Flow Connect/Disconnect Logging

Add logger calls in `ConnectFlowHandler` and `DeleteFlowHandler` so flow lifecycle events appear in logs.

### Implementation Steps

1. Add structured logger calls throughout `executor.go` at each event point
2. Add structured logger calls in `fanout.go`, `fanin.go`, `decision.go`, `await.go`, `exit.go`
3. Modify HTTP middleware to demote health check logs to debug
4. Add logger calls in flow connect/disconnect handlers
5. Verify logs appear in desktop log viewer with runId filtering

### Files Modified

| File | Changes |
|------|---------|
| `internal/executor/executor.go` | Add logger calls at run/step lifecycle points |
| `internal/executor/fanout.go` | Add logger calls for fanOut child execution |
| `internal/executor/fanin.go` | Add logger call for condition evaluation |
| `internal/executor/decision.go` | Add logger call for case matching |
| `internal/executor/await.go` | Add logger calls for await/resume |
| `internal/executor/exit.go` | Add logger call for exit status |
| `handlers/middleware.go` | Demote health check logs to debug |
| `handlers/admin/flows.go` | Add logger calls for connect/disconnect |

---

## Implementation Order

| Phase | Enhancement | Effort | Dependencies |
|-------|------------|--------|-------------|
| 1 | Engine logging (3a, 3b, 3c) | Small | None — engine only |
| 2 | Participant editing (2) | Medium | Engine PUT endpoint |
| 3 | Connect flow wizard (1) | Large | None — desktop only |

Recommended: start with logging since it's the smallest change and immediately improves the debugging experience for the other two enhancements.

---

## Deferred

- Participant auto-discovery from MCP servers
- Participant health/status monitoring
- Participant capability matching against flow requirements
- Flow re-connect (update in place without disconnect)
- Batch participant config import/export
