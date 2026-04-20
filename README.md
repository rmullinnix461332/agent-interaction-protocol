# AIP — Agent Interaction Protocol

AIP is an exploratory **provider-neutral orchestration protocol** for coordinating participants through explicit flows, typed artifacts, reusable subflows, and pause/resume boundaries.

The goal is simple:

> Define orchestration above specific vendors, frameworks, and runtimes.

---

# Why AIP

Current multi-agent and workflow systems are often built as:

* vendor frameworks
* hardcoded chains
* bespoke orchestration logic
* tightly coupled runtimes
* tool-specific ecosystems

These approaches can work, but often trade away:

* portability
* reuse
* visibility
* long-term flexibility

AIP explores whether orchestration can be expressed as a portable contract instead.

---

# Core Model

AIP separates four concerns:

| Concern                 | AIP Object   |
| ----------------------- | ------------ |
| Who performs work       | Participants |
| What moves through flow | Artifacts    |
| What happens            | Steps        |
| How work coordinates    | Flows        |

Additional primitives:

* Operators
* Subflows
* Providers

---

# Participant Types

* `agent` — reasoning / generative participant
* `service` — bounded deterministic capability
* `human` — judgment / preference / approval
* `subflow` — reusable orchestration unit

---

# Step Types

* `action`
* `fanOut`
* `fanIn`
* `decision`
* `await`
* `exit`

---

# Flow Capabilities

AIP supports:

* sequential pipelines
* parallel fan-out
* fan-in convergence
* conditional routing
* iteration loops
* pause / resume workflows
* reusable subflows
* human-in-the-loop orchestration

---

# Example

```yaml
steps:
  - id: generate-story
    type: action
    participantRef: writer

  - id: explore
    type: fanOut
    dependsOn:
      - generate-story
    steps:
      - option-a
      - option-b

  - id: option-a
    type: action

  - id: option-b
    type: action

  - id: choose-best
    type: fanIn
    dependsOn:
      - explore
    operator:
      type: rank
      topN: 1

  - id: editor-choice
    type: await
    dependsOn:
      - choose-best

  - id: publish
    type: action
    dependsOn:
      - editor-choice
```

---

# Repo Structure

```text
docs/
  00-overview.md
  01-participants.md
  02-artifacts.md
  03-steps.md
  04-flows.md
  05-operators.md
  06-subflows.md
  07-providers.md

schema/
  aip-core.schema.json
```

---

# Design Principles

AIP favors:

* explicitness over magic
* portability over lock-in
* contracts over hidden coupling
* small primitives over bloated frameworks
* human + machine collaboration over automation mythology

---

# Non-Goals

AIP is **not**:

* a workflow engine
* a BPM suite
* a prompt framework
* an LLM runtime
* a memory system
* a deployment platform
* a UI product

AIP is a protocol contract.

---

# Status

Early draft / personal exploration.

The project is testing whether orchestration semantics can remain stable while implementations evolve.

---

# License

Apache License 2.0

---

# Summary

AIP asks:

> How do multiple participants coordinate useful work without being trapped inside one vendor model?

This repository is an attempt to answer that question.

