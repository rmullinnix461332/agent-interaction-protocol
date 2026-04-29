# AIP Lab — Navigation Redesign Implementation Plan

## Overview

Redesign aip-lab's navigation and layout to follow a VS Code-inspired model: icon activity bar on the left, context-sensitive side panel, central editor area, right chat panel, and a native application menu bar.

---

## 1. Current State

The current layout is a flat toolbar-driven design:

```
┌──────────────────────────────────────────────────────┐
│ AppBar: [New][Open][Save][Undo][Redo][Meta][Parts]   │
│         [Arts][Gallery][Chat][CLI][Canvas|Split|YAML] │
│         [Lab Controls]              [Help][Settings]  │
├──────────────────────────────────────────────────────┤
│ TabBar                                                │
├──────────┬───────────────────────────┬───────────────┤
│ Toolbox  │ Canvas / YAML / Split     │ Properties    │
│ + Chat   │                           │               │
│          │                           │               │
│          ├───────────────────────────┤               │
│          │ Trace Panel               │               │
├──────────┴───────────────────────────┴───────────────┤
│ Status Bar: [Validation] [Git Branch] [View] [Path]  │
└──────────────────────────────────────────────────────┘
```

Problems:
- Toolbar is crowded with 20+ buttons
- No workspace/folder concept
- No file explorer
- No native menu bar
- Chat is embedded in the toolbox panel
- Settings is a toolbar button, not a nav item
- No debug/run panel separation

---

## 2. Target Layout

```
┌──────────────────────────────────────────────────────┐
│ Menu Bar: File │ Edit │ Run │ Window │ Help           │
├──┬───────────────────────────────────────────────────┤
│  │ Search Bar: [◀][▶] [🔍 Search...        ] [Layout]│
├──┼──────────┬────────────────────────┬───────────────┤
│  │          │                        │               │
│📁│ Side     │ Central Editor         │ AI Chat       │
│🎨│ Panel    │ (YAML or Diagram)      │ Panel         │
│🐛│          │                        │               │
│🔀│          │                        │               │
│🏪│          │                        │               │
│  │          │                        │               │
│  │          ├────────────────────────┤               │
│  │          │ Trace / Output Panel   │               │
├──┤          ├────────────────────────┴───────────────┤
│⚙️│          │ Status Bar                              │
└──┴──────────┴────────────────────────────────────────┘

Activity Bar (48px)  Side Panel (250px)  Editor (flex)  Chat (300px)
```

### Activity Bar Icons (top to bottom)

| Position | Icon | ID | Side Panel Content |
|----------|------|----|--------------------|
| 1 | File icon | `explorer` | File explorer (workspace tree) |
| 2 | Design icon | `design` | Flow toolbox (step palette) |
| 3 | Debug icon | `debug` | Run/debug controls |
| 4 | Source control icon | `scm` | Git status, commit, branches |
| 5 | Marketplace icon | `marketplace` | Agent gallery |
| Bottom | Settings gear | `settings` | Opens settings dialog |

### Central Editor

Determined by activity bar selection:
- `explorer` selected → YAML text editor
- `design` selected → Flow diagram canvas
- Any other → preserves last editor state

### Top Bar

Replaces the current AppBar:
- Left: Back/Forward navigation buttons
- Center: Search input (Cmd+P style)
- Right: Layout toggle buttons (canvas/split/yaml)

---

## 3. Application Menu Bar

Native Electron menu bar. On macOS this renders in the system menu bar at the top of the screen (not inside the app window). On Windows/Linux it renders as the window's menu bar. Built via `Menu.setApplicationMenu()` in the Electron main process.

### File

| Item | Shortcut | Action |
|------|----------|--------|
| New Flow | Cmd+N | Create new empty flow |
| Open File... | Cmd+O | Open single YAML/JSON file |
| Add Folder to Workspace | — | Add folder to workspace tree |
| Close Workspace | — | Close all folders |
| — | — | separator |
| Save | Cmd+S | Save current file |
| Save As... | Cmd+Shift+S | Save to new path |
| — | — | separator |
| Settings | Cmd+, | Open settings |
| — | — | separator |
| Quit | Cmd+Q | Exit application |

### Edit

| Item | Shortcut | Action |
|------|----------|--------|
| Undo | Cmd+Z | Undo last change |
| Redo | Cmd+Shift+Z | Redo |
| — | — | separator |
| Find | Cmd+F | Find in editor |
| Find Node | Cmd+P | Find node by name |
| — | — | separator |
| Delete Node | Delete/Backspace | Delete selected node |
| Duplicate Node | Cmd+D | Duplicate selected node |

### Run

| Item | Shortcut | Action |
|------|----------|--------|
| Start Run | F5 | Start mock execution |
| Pause | F6 | Pause execution |
| Stop | Shift+F5 | Stop execution |
| — | — | separator |
| Select Test Scenario | — | Submenu: Happy Path, Error Path, etc. |

### Window

| Item | Shortcut | Action |
|------|----------|--------|
| Canvas View | — | Switch to diagram |
| YAML View | — | Switch to YAML |
| Split View | — | Show both |
| — | — | separator |
| Toggle Chat Panel | Cmd+Shift+C | Show/hide AI chat |
| Toggle Side Panel | Cmd+B | Show/hide side panel |
| Toggle Trace Panel | Cmd+J | Show/hide bottom panel |

### Help

| Item | Action |
|------|--------|
| Welcome | Show welcome dialog |
| Documentation | Open docs URL |
| About AIP Lab | Version info |

---

## 4. Workspace Model

### Concept

A workspace is a collection of folders containing AIP flow files. Similar to VS Code's multi-root workspace.

### State

```typescript
interface Workspace {
  folders: WorkspaceFolder[]
}

interface WorkspaceFolder {
  path: string           // Absolute path to folder
  name: string           // Display name (folder basename)
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  gitStatus?: 'added' | 'modified' | 'deleted' | 'untracked' | null
}
```

### Persistence

Workspace state saved to `~/.aip-lab/workspace.json`. Restored on app launch.

### IPC

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `workspace:addFolder` | renderer → main | Open folder picker, add to workspace |
| `workspace:removeFolder` | renderer → main | Remove folder from workspace |
| `workspace:getTree` | renderer → main | Read folder tree with git status |
| `workspace:readFile` | renderer → main | Read file content |
| `workspace:watchFolder` | renderer → main | Start watching for changes |

---

## 5. Side Panel Specifications

### 5.1 Explorer Panel (`explorer`)

File tree navigator for workspace folders.

| Feature | Detail |
|---------|--------|
| Folder tree | Expandable/collapsible directory tree |
| File icons | YAML files get flow icon, others get generic icon |
| Git status | Color-coded: green (added), yellow (modified), red (deleted), gray (untracked) |
| Click file | Opens in YAML editor |
| Right-click | Context menu: Open, Rename, Delete, Reveal in Finder |
| Empty state | "Add Folder to Workspace" button |

### 5.2 Design Panel (`design`)

Flow step toolbox (existing Toolbox component, relocated).

| Feature | Detail |
|---------|--------|
| Step palette | Draggable step types: Action, FanOut, FanIn, Decision, Await, Exit |
| Properties | Selected node properties editor (existing Properties component, below palette) |
| Participants | Quick participant list |
| Artifacts | Quick artifact list |

When `design` is active, the central editor shows the flow diagram canvas.

### 5.3 Debug Panel (`debug`)

Run and test controls.

| Feature | Detail |
|---------|--------|
| Run controls | Start (▶), Pause (⏸), Stop (⏹) buttons |
| Test scenario | Dropdown: Happy Path, Error Path, Timeout, Custom |
| Run status | Current run state, active step |
| Step breakpoints | Toggle breakpoints on steps (future) |
| Trace output | Summary of last run events |

### 5.4 Source Control Panel (`scm`)

Git integration (existing git features, relocated).

| Feature | Detail |
|---------|--------|
| Changed files | List of modified files with git status |
| Commit | Message input + commit button |
| Branch | Current branch display, branch switcher |
| Diff | Show diff for selected file |

### 5.5 Marketplace Panel (`marketplace`)

Agent gallery (existing AgentGalleryDialog content, relocated to panel).

| Feature | Detail |
|---------|--------|
| Agent list | Browse available agents |
| Agent detail | Capabilities, config |
| Install | Add agent to flow |

---

## 6. Project Structure Changes

### New Files

```
src/
├── layout/
│   ├── AppLayout.tsx           # Root layout: activity bar + side panel + editor + chat
│   ├── ActivityBar.tsx         # Left icon strip (48px)
│   ├── SidePanel.tsx           # Side panel container (routes to panel content)
│   ├── TopBar.tsx              # Search bar + navigation + layout toggles
│   └── StatusBar.tsx           # Bottom status bar (extracted from App.tsx)
├── panels/
│   ├── ExplorerPanel.tsx       # File tree navigator
│   ├── DesignPanel.tsx         # Toolbox + properties (wraps existing)
│   ├── DebugPanel.tsx          # Run/debug controls
│   ├── SCMPanel.tsx            # Source control
│   └── MarketplacePanel.tsx    # Agent gallery (wraps existing)
├── store/
│   └── workspace-context.tsx   # Workspace state (folders, active file)
└── components/
    └── FileTree.tsx            # Recursive file tree component
```

### Electron New Files

```
electron/
├── menu.ts                     # Application menu bar builder
└── workspace-service.ts        # Workspace folder management + file watching
```

### Modified Files

| File | Change |
|------|--------|
| `App.tsx` | Replace monolithic layout with `AppLayout` |
| `electron/main.ts` | Register menu and workspace handlers |
| `electron/preload.ts` | Add workspace IPC methods |
| `store/ui-context.tsx` | Add `activePanel` state, remove toolbar-specific state |

### Removed/Deprecated

| File | Reason |
|------|--------|
| `panels/Toolbox.tsx` | Wrapped by `DesignPanel.tsx` |
| `dialogs/AgentGalleryDialog.tsx` | Content moves to `MarketplacePanel.tsx` |
| `dialogs/WelcomeDialog.tsx` | Replaced by empty-state in explorer |

---

## 7. State Changes

### UI Context Additions

```typescript
type ActivityPanel = 'explorer' | 'design' | 'debug' | 'scm' | 'marketplace'

// New state
activePanel: ActivityPanel        // Which side panel is shown
sidePanelOpen: boolean            // Side panel visibility
chatPanelOpen: boolean            // Right chat panel visibility
editorMode: 'yaml' | 'canvas'    // Central editor content (decoupled from panel)
```

### Workspace Context (new)

```typescript
interface WorkspaceState {
  folders: WorkspaceFolder[]
  fileTree: FileTreeNode[]
  activeFilePath: string | null
  expandedFolders: Set<string>
}
```

---

## 8. Implementation Phases

### Phase 1: Layout Shell

**Goal**: New layout structure with activity bar, side panel, and top bar

1. Create `AppLayout.tsx` with activity bar + side panel + editor + chat zones
2. Create `ActivityBar.tsx` with 5 nav icons + settings
3. Create `SidePanel.tsx` as panel router
4. Create `TopBar.tsx` with search and layout toggles
5. Extract `StatusBar.tsx` from App.tsx
6. Add `activePanel` to UI context
7. Wire existing Toolbox into `DesignPanel`
8. Wire existing ChatPanel to right panel slot
9. Migrate App.tsx to use new layout

**Deliverable**: VS Code-style shell with existing functionality preserved

### Phase 2: Application Menu Bar

**Goal**: Native Electron menu bar with File, Edit, Run, Window, Help

1. Create `electron/menu.ts` — build menu template using `Menu.buildFromTemplate()` and `Menu.setApplicationMenu()`
2. On macOS: first menu item is the app name menu (About, Preferences, Quit) per platform convention
3. Wire menu actions to renderer via `webContents.send()` IPC events
4. Add IPC listeners in renderer for menu-triggered actions (new, open, save, etc.)
5. Remove duplicate toolbar buttons that are now in the menu
6. Add keyboard shortcut hints to menu items (Electron handles accelerators natively)

**Deliverable**: Full native menu bar, toolbar simplified

### Phase 3: Workspace + File Explorer

**Goal**: Multi-folder workspace with file tree navigation

1. Create `electron/workspace-service.ts` (folder management, tree reading, file watching)
2. Create `workspace-context.tsx` (workspace state)
3. Create `FileTree.tsx` component (recursive, expandable, with icons)
4. Create `ExplorerPanel.tsx` (file tree + workspace actions)
5. Add git status coloring to file tree nodes
6. Wire file click to open in YAML editor
7. Add "Add Folder to Workspace" to File menu and explorer empty state
8. Persist workspace to `~/.aip-lab/workspace.json`

**Deliverable**: File explorer with workspace model

### Phase 4: Debug Panel + Source Control Panel

**Goal**: Dedicated panels for run/debug and git

1. Create `DebugPanel.tsx` (run controls, test scenario selector, run status)
2. Move lab controls from toolbar into debug panel
3. Create `SCMPanel.tsx` (changed files, commit, branch)
4. Move git features from toolbar/dialogs into SCM panel
5. Add test scenario dropdown (happy path, error path, timeout)

**Deliverable**: Debug and SCM panels functional

### Phase 5: Marketplace Panel + Polish

**Goal**: Agent gallery as panel, UI polish

1. Create `MarketplacePanel.tsx` (wraps existing gallery content)
2. Remove AgentGalleryDialog (content moved to panel)
3. Polish activity bar hover/selection states
4. Add panel resize handles
5. Persist panel widths and layout preferences
6. Keyboard navigation between panels
7. Remove WelcomeDialog (replaced by explorer empty state)

**Deliverable**: Complete navigation redesign

---

## 9. Migration Strategy

The redesign touches the root layout but preserves all existing components. The approach:

1. Build the new layout shell alongside the existing App.tsx
2. Move existing components into the new layout slots one at a time
3. Keep existing dialogs working during migration
4. Remove old toolbar buttons only after menu bar equivalents are verified
5. Feature-flag the new layout during development (`?layout=new` query param)

This avoids a big-bang rewrite and allows incremental testing.

---

## 10. Design Principles

- **Familiarity**: VS Code layout is well-understood by developers
- **Density**: Activity bar is compact (48px), maximizes editor space
- **Context**: Side panel content matches the current task (design vs debug vs files)
- **Discoverability**: Menu bar provides full feature inventory
- **Keyboard-first**: All actions accessible via shortcuts
- **Persistence**: Layout state, panel widths, and workspace survive restart

---

## 11. Deferred

| Feature | Reason |
|---------|--------|
| Minimap in YAML editor | Monaco feature, low priority |
| Multi-tab editor | Complex, single-file sufficient for MVP |
| Terminal panel | Not needed for flow authoring |
| Extensions/plugins | Extensibility framework, defer |
| Remote workspace | Local-only for MVP |
| Breadcrumb navigation | Nice-to-have, not essential |
| Command palette (Cmd+Shift+P) | Useful but not required for initial redesign |
