# AIP Platform — System Overview (Draft v0.1)

## 1. Purpose

The AIP Platform is a modular system for designing, validating, simulating, and executing portable workflows built on the Agent Interaction Protocol (AIP).

It combines:

* a protocol specification
* authoring tools
* execution runtimes
* operational management surfaces

The platform is designed primarily for individuals and small teams who want to build sophisticated workflows involving AI agents, services, humans, and reusable orchestration patterns.

---

## 2. Core Philosophy

AIP separates concerns cleanly:

| Concern                      | Component        |
| ---------------------------- | ---------------- |
| Workflow language            | AIP Protocol     |
| Validation / utility tooling | AIP CLI          |
| Workflow authoring           | Visual Builder   |
| Workflow execution           | Provider Engine  |
| Runtime operations           | Provider Desktop |

This separation allows workflows to remain portable while implementations evolve independently.

---

## 3. Major Components

---

## 3.1 AIP Protocol

The protocol defines how workflows are described.

Primary concepts:

* Participants
* Artifacts
* Steps
* Flows
* Operators
* Subflows
* Provider bindings

Typical format:

* YAML (human friendly)
* JSON (machine interchange)

The protocol is the canonical source of workflow intent.

---

## 3.2 AIP Command Line Tool

The command line tool supports protocol development and validation.

Typical functions:

* validate
* render
* plan
* lint
* format
* test

Example:

```bash id="c7h2qa"
aip validate flow.yaml
aip render flow.yaml
aip plan flow.yaml
```

The CLI acts as the compiler / utility layer for AIP.

---

## 3.3 Visual Builder

The Visual Builder provides a desktop authoring experience for creating flows.

Capabilities:

* drag-and-drop node graph editing
* side-panel configuration
* participant and artifact management
* split view (graph + YAML)
* validation feedback
* mock execution preview
* AI-assisted authoring chat

The Visual Builder edits the canonical AIP model rather than replacing it.

---

## 3.4 Provider Engine

The Provider Engine is the runtime backend that executes AIP workflows.

Responsibilities:

* load connected flows
* resolve participants
* manage runs
* execute steps
* manage fanOut / fanIn
* handle await / resume
* persist artifacts
* emit events and diagnostics

Multiple engines may exist:

* mock engine
* local engine
* MCP-integrated engine
* cloud engine
* domain-specific engines

---

## 3.5 Provider Desktop

The Provider Desktop is the runtime control plane for one or more Provider Engines.

Inspired by tools such as Docker Desktop.

Capabilities:

* discover engines
* connect to engines
* list flows
* inspect runs
* view artifacts
* manage participants
* diagnostics / health
* start / stop / resume runs

The desktop manages engines but does not define workflow semantics.

---

## 4. Three Ways to Build Flows

AIP intentionally supports multiple creation styles.

---

## 4.1 YAML Editing

Best for:

* technical users
* source control workflows
* direct protocol authorship

Example:

```yaml id="n5z4tr"
- id: publish
  type: action
  dependsOn:
    - review
```

Benefits:

* explicit
* diffable
* portable
* scriptable

---

## 4.2 Visual Builder

Best for:

* visual thinkers
* rapid design
* exploring structure

Users drag nodes such as:

* Action
* Fan Out
* Fan In
* Decision
* Await
* Exit

The graph synchronizes to AIP YAML.

---

## 4.3 Natural Language via AI Chat

Best for:

* fast creation
* beginners
* iterative refinement

Example prompt:

```text id="e8m0pd"
Create a workflow with three researchers in parallel,
merge results, ask for approval, retry twice if rejected.
```

The AI assistant drafts AIP YAML which can then be validated and edited.

---

## 5. Typical User Flow

```text id="u2d6aw"
Idea
 ↓
Create flow (YAML / Visual / AI Chat)
 ↓
Validate / Render / Plan
 ↓
Mock Run
 ↓
Connect to Provider Engine
 ↓
Execute Real Runs
 ↓
Inspect Runs / Artifacts / Diagnostics
```

---

## 6. Example Use Cases

### Creative

* comic strip generation
* writing pipelines
* video production flows

### Developer

* repo maintenance workers
* review loops
* build/test pipelines

### Research

* parallel source gathering
* summarization
* ranking and synthesis

### Personal Productivity

* assistants
* planning systems
* repetitive knowledge work

---

## 7. Why This Model Works

The platform allows:

* protocol stability
* multiple authoring modes
* multiple runtime engines
* local-first experimentation
* clear separation of design and execution

---

## 8. Summary

The AIP Platform is a workflow ecosystem composed of:

* Protocol
* CLI
* Visual Builder
* Provider Engine
* Provider Desktop

Together they allow individuals to design and run sophisticated workflows without being locked into a single vendor model.

