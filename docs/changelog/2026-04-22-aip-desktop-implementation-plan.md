# AIP Desktop — Implementation Plan

## Overview

`aip-desktop` is the local runtime control plane for managing one or more AIP Provider Engines. It is an Electron desktop application that communicates with engines via their `/api/v1/admin` HTTP interface.

It does not define workflow semantics. It operates engines.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  Engine Manager │ Config Store │ Process Supervisor          │
└─────────────────────────────────────────────────────────────┘
                              │ IPC
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer (React)                 │
│  Dashboard │ Engines │ Flows │ Runs │ Artifacts │ Diagnostics│
└─────────────────────────────────────────────────────────────┘
                              │ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    Provider Engines                          │
│  /api/v1/admin (health, flows, runs, artifacts, diagnostics)│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

Matches `aip-lab` for consistency:

| Layer | Technology |
|-------|-----------|
| Shell | Electron 35+ |
| Build | Vite 6 + vite-plugin-electron |
| UI | React 19 + TypeScript 5 |
| Components | MUI 6 (@mui/material, @mui/icons-material) |
| State | React Context + custom hooks |
| Testing | Vitest |

No additional UI frameworks. No server-side rendering.

---

## 3. Design Decisions

### 3.1 Engine Communication

Desktop communicates with engines exclusively via HTTP to `/api/v1/admin/*`. No direct file access, no shared memory, no IPC to engines.

This keeps the desktop provider-neutral — any engine exposing the admin API contract can be managed.

### 3.2 Engine Discovery

MVP supports manual engine registration (user provides endpoint URL). Engines are stored in a local config file.

Future: auto-discovery via mDNS or local process scanning.

### 3.3 Engine Lifecycle

Desktop can optionally manage engine processes it starts locally:

- Start: spawn `aip-engine` as a child process
- Stop: send SIGTERM
- Restart: stop + start

For remote engines, desktop only monitors via health checks.

### 3.4 Polling vs Push

MVP uses polling for engine state:

| Resource | Poll Interval |
|----------|--------------|
| Health | 10s |
| Runs (active) | 3s |
| Runs (history) | 30s |
| Flows | 30s |
| Diagnostics | 15s |

Future: WebSocket upgrade when engines support it.

### 3.5 Data Flow

Desktop holds no persistent run/flow data. All data is fetched from engines on demand. Desktop persists only:

- Engine registry (endpoints, names, types)
- UI preferences (theme, layout, last viewed)
- Window state

### 3.6 State Management

No global state library. The app is a thin read-only dashboard over HTTP APIs.

- **Active engine selection**: React Context (`EngineContext`)
- **Page data** (runs, flows, artifacts): Local component state via custom hooks (`useRuns`, `useFlows`, etc.) that fetch on mount and poll
- **Engine registry**: Electron main process config, accessed via IPC
- **UI preferences**: Electron main process config, accessed via IPC

If cross-page state synchronization becomes necessary later, Zustand can be added incrementally.

---

## 4. Project Structure

```
cmd/aip-desktop/
├── electron/
│   ├── main.ts              # Electron main process entry
│   ├── preload.ts           # Preload script (IPC bridge)
│   ├── engine-manager.ts    # Engine process lifecycle
│   └── config-store.ts      # Persistent config (engines, prefs)
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Root layout + routing
│   ├── api/
│   │   ├── types.ts         # API response types (mirrors engine types)
│   │   └── client.ts        # Engine HTTP client
│   ├── store/
│   │   └── EngineContext.tsx  # Active engine selection context
│   ├── hooks/
│   │   ├── useEngine.ts     # Engine polling + data hooks
│   │   ├── useRuns.ts       # Run data hooks
│   │   └── usePolling.ts    # Generic polling hook
│   ├── pages/
│   │   ├── Dashboard.tsx     # Landing page
│   │   ├── Engines.tsx       # Engine management
│   │   ├── Flows.tsx         # Flow management
│   │   ├── Runs.tsx          # Run history + active runs
│   │   ├── RunDetail.tsx     # Single run inspection
│   │   ├── Artifacts.tsx     # Artifact browser
│   │   ├── Participants.tsx  # Participant registry
│   │   └── Diagnostics.tsx   # Health + troubleshooting
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   ├── Header.tsx    # Top bar with engine selector
│   │   │   └── StatusBar.tsx # Bottom status bar
│   │   ├── engines/
│   │   │   ├── EngineCard.tsx
│   │   │   └── AddEngineDialog.tsx
│   │   ├── runs/
│   │   │   ├── RunTable.tsx
│   │   │   ├── RunTimeline.tsx
│   │   │   ├── StepStatusChip.tsx
│   │   │   └── ResumeDialog.tsx
│   │   ├── flows/
│   │   │   ├── FlowTable.tsx
│   │   │   └── ConnectFlowDialog.tsx
│   │   ├── artifacts/
│   │   │   ├── ArtifactList.tsx
│   │   │   └── ArtifactPreview.tsx
│   │   └── diagnostics/
│   │       ├── DiagnosticsPanel.tsx
│   │       └── LogViewer.tsx
│   └── theme/
│       └── theme.ts          # MUI theme config
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 5. API Client

The API client wraps all engine admin endpoints. One client instance per engine.

```typescript
interface EngineClient {
  // Identity
  health(): Promise<HealthResponse>
  info(): Promise<InfoResponse>
  capabilities(): Promise<CapabilitiesResponse>

  // Flows
  listFlows(): Promise<FlowListResponse>
  getFlow(flowId: string): Promise<ConnectedFlow>
  connectFlow(flow: object): Promise<FlowSummary>
  disconnectFlow(flowId: string): Promise<void>

  // Runs
  listRuns(filter?: RunFilter): Promise<RunListResponse>
  getRun(runId: string): Promise<Run>
  startRun(flowId: string, input?: object): Promise<StartRunResponse>
  stopRun(runId: string): Promise<void>
  resumeRun(runId: string, payload: ResumePayload): Promise<void>

  // Artifacts
  listArtifacts(runId: string): Promise<ArtifactListResponse>
  getArtifact(runId: string, ref: string): Promise<RuntimeArtifact>

  // Participants
  listParticipants(): Promise<ParticipantListResponse>
  getParticipant(id: string): Promise<ParticipantBinding>

  // Diagnostics
  diagnostics(): Promise<DiagnosticsResponse>
  runEvents(runId: string): Promise<EventListResponse>
  logs(query?: LogQuery): Promise<LogsResponse>
}
```

---

## 6. Page Specifications

### 6.1 Dashboard

The landing page. Aggregates state across all connected engines.

| Section | Data Source | Content |
|---------|-----------|---------|
| Engine Status | `GET /health` per engine | Online/offline badges |
| Active Runs | `GET /runs?status=running` | Count + list |
| Pending Awaits | `GET /runs?status=awaiting` | Count + list with resume action |
| Recent Failures | `GET /diagnostics` → recentErrors | Last 5 errors |
| Recent Completions | `GET /runs?status=completed` | Last 5 completed |

### 6.2 Engines

Engine registry management.

| Feature | Implementation |
|---------|---------------|
| List engines | Read from config store |
| Add engine | Dialog: name, endpoint URL, type |
| Remove engine | Confirm dialog |
| Health status | Poll `/health` |
| Engine info | `GET /info` |
| Capabilities | `GET /capabilities` |
| Start/Stop | Electron child process management (local only) |

### 6.3 Flows

Connected flows across engines.

| Feature | Implementation |
|---------|---------------|
| List flows | `GET /flows` per engine |
| Connect flow | Dialog: paste/upload JSON/YAML |
| Disconnect flow | `DELETE /flows/{id}` |
| Run now | `POST /runs/{flowId}/start` |
| Flow detail | `GET /flows/{id}` |

### 6.4 Runs

Execution history and active state.

| Feature | Implementation |
|---------|---------------|
| Run table | `GET /runs` with status/flow filters |
| Run detail | `GET /runs/{id}` |
| Event timeline | `GET /runs/{id}/events` |
| Artifacts | `GET /runs/{id}/artifacts` |
| Stop run | `POST /runs/{id}/stop` |
| Resume run | `POST /runs/{id}/resume` with dialog |

### 6.5 Run Detail

Single run deep inspection.

| Section | Content |
|---------|---------|
| Header | Run ID, flow, engine, status, duration |
| Step Status | Table of steps with status chips (pending/running/completed/failed/awaiting) |
| Timeline | Chronological event list |
| Artifacts | Grouped by step, with preview |
| Await State | If awaiting: show expected input ref, resume button |

### 6.6 Artifacts

Artifact browser across runs.

| Feature | Implementation |
|---------|---------------|
| List | `GET /runs/{id}/artifacts` |
| Preview | Inline JSON/text/markdown rendering |
| Export | Download as file |
| Metadata | Ref, content type, size, producer, timestamp |

### 6.7 Diagnostics

Health center.

| Feature | Implementation |
|---------|---------------|
| Engine health | `GET /diagnostics` |
| Recent errors | From diagnostics response |
| Log viewer | `GET /logs` with level/runId filters, pagination |
| Memory/goroutines | From diagnostics response |

---

## 7. Electron Main Process

### 7.1 Engine Manager

Manages local engine processes.

```typescript
interface ManagedEngine {
  id: string
  name: string
  endpoint: string
  type: 'local' | 'remote'
  // Local only
  binaryPath?: string
  dataDir?: string
  port?: number
  process?: ChildProcess
  status: 'running' | 'stopped' | 'error'
}
```

Responsibilities:
- Start/stop local engine processes
- Monitor process health
- Restart on crash (optional)
- Clean shutdown on app exit

### 7.2 Config Store

Persists engine registry and preferences using Electron's `app.getPath('userData')`.

```
~/.aip-desktop/
├── config.json       # Engine registry
└── preferences.json  # UI preferences
```

### 7.3 IPC Bridge

Preload script exposes typed IPC channels:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `engine:list` | renderer → main | Get registered engines |
| `engine:add` | renderer → main | Register engine |
| `engine:remove` | renderer → main | Unregister engine |
| `engine:start` | renderer → main | Start local engine process |
| `engine:stop` | renderer → main | Stop local engine process |
| `config:get` | renderer → main | Read preferences |
| `config:set` | renderer → main | Write preferences |

HTTP calls to engine APIs are made directly from the renderer process (no IPC needed for API calls).

---

## 8. Implementation Phases

### Phase 1: Shell + Engine Connection

**Goal**: Electron app that connects to an engine and shows health

1. Project scaffolding (Electron + Vite + React + MUI)
2. API client with typed responses
3. Config store for engine registry
4. Engine list page with add/remove
5. Health polling and status display
6. Basic sidebar navigation

**Deliverable**: App that connects to a running aip-engine and shows it's online

### Phase 2: Flows + Runs

**Goal**: Manage flows and start/inspect runs

1. Flows page (list, connect, disconnect)
2. Connect flow dialog (JSON paste)
3. Runs page (list with filters)
4. Start run from flow
5. Run detail page (status, steps, duration)
6. Stop run action

**Deliverable**: Full flow lifecycle from desktop

### Phase 3: Run Detail + Events + Artifacts

**Goal**: Deep run inspection

1. Event timeline component
2. Step status visualization
3. Artifact list per run
4. Artifact preview (JSON, text, markdown)
5. Artifact export/download

**Deliverable**: Complete run inspection experience

### Phase 4: Await/Resume + Dashboard

**Goal**: Human-in-the-loop and operational overview

1. Resume dialog with artifact-shaped payload
2. Await state display in run detail
3. Dashboard page with aggregated metrics
4. Pending awaits section with quick resume
5. Recent failures section

**Deliverable**: Operational dashboard with human-in-the-loop support

### Phase 5: Diagnostics + Logs

**Goal**: Troubleshooting surface

1. Diagnostics page
2. Log viewer with filtering and pagination
3. Engine memory/goroutine display
4. Recent errors panel
5. Participants page

**Deliverable**: Full diagnostics experience

### Phase 6: Local Engine Management + Polish

**Goal**: Manage engine processes from desktop

1. Engine process spawning (start/stop local engines)
2. Process health monitoring
3. Auto-restart on crash
4. Clean shutdown
5. UI polish (loading states, error boundaries, empty states)
6. Keyboard shortcuts
7. Window state persistence

**Deliverable**: Complete desktop application ready for daily use

---

## 9. Dependencies

```json
{
  "dependencies": {
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@mui/icons-material": "^6.4.0",
    "@mui/material": "^6.4.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^35.0.0",
    "electron-builder": "^25.1.0",
    "typescript": "^5.7.0",
    "vite": "^6.3.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "vitest": "^3.1.0"
  }
}
```

---

## 10. Engine API Contract

Desktop depends on these engine endpoints (all implemented in aip-engine):

| Endpoint | Method | Desktop Usage |
|----------|--------|--------------|
| `/health` | GET | Engine status polling |
| `/info` | GET | Engine identity display |
| `/capabilities` | GET | Feature flags |
| `/flows` | GET | Flow list |
| `/flows` | POST | Connect flow |
| `/flows/{id}` | GET | Flow detail |
| `/flows/{id}` | DELETE | Disconnect flow |
| `/runs` | GET | Run list (with ?flowId, ?status filters) |
| `/runs/{id}` | GET | Run detail |
| `/runs/{flowId}/start` | POST | Start run |
| `/runs/{id}/stop` | POST | Stop run |
| `/runs/{id}/resume` | POST | Resume await |
| `/runs/{id}/artifacts` | GET | Artifact list |
| `/runs/{id}/artifacts/*` | GET | Artifact detail |
| `/participants` | GET | Participant list |
| `/participants/{id}` | GET | Participant detail |
| `/diagnostics` | GET | Engine diagnostics |
| `/runs/{id}/events` | GET | Run event timeline |
| `/logs` | GET | Engine logs (with ?runId, ?level, ?offset, ?limit) |

All endpoints are already implemented in aip-engine Phase 1-6.

---

## 11. Deferred Features

| Feature | Reason |
|---------|--------|
| Auto-discovery (mDNS) | Manual registration sufficient for MVP |
| WebSocket real-time updates | Polling sufficient for MVP |
| Remote engine auth | Local-only for MVP |
| Run scheduling | Not in engine API yet |
| Side-by-side engine comparison | Complex UI, defer |
| Plugin panels | Extensibility framework, defer |
| Metrics dashboards | Observability enhancement |
| Notifications | OS-level integration, defer |
| Flow graph visualization | Belongs in aip-lab/studio |

---

## 12. Success Criteria

1. Desktop connects to a running aip-engine and shows health status
2. Flows can be connected and disconnected from the desktop
3. Runs can be started, stopped, and inspected
4. Await/resume cycle works from the desktop UI
5. Artifacts are viewable with preview
6. Event timeline shows run lifecycle
7. Diagnostics page shows engine health and recent errors
8. Log viewer supports filtering and pagination
9. Multiple engines can be registered and switched between
10. Local engine processes can be started/stopped from desktop
