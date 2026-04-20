# AIP Specification — 01 Participants (Draft v0.2)

## 1. Purpose

Participants are entities capable of performing work within an AIP flow.

A participant is treated as a **black-box capability** that can consume declared inputs and produce declared outputs.

AIP does not prescribe how a participant internally operates or how it is invoked.

---

## 2. Design Principles

### 2.1 Non-Invasive Participation

Participants are not required to be rewritten, instrumented, or modified to participate in AIP orchestration.

### 2.2 Capability Over Implementation

Participants are classified by **behavioral role**, not runtime technology.

AIP cares about what a participant does, not whether it is implemented as a REST API, CLI command, queue worker, script, or hosted runtime.

### 2.3 Provider Realization

Providers are responsible for binding participant definitions to real implementations.

### 2.4 Stateless Participation Preference

AIP assumes sufficient context is passed per interaction.

Participants may maintain internal state, but AIP does not depend on that state for correctness.

---

## 3. Participant Identity

Every participant must declare a unique identifier within flow scope.

Example:

```yaml id="cb6l6p"
participants:
  - id: story-agent
  - id: image-renderer
  - id: final-editor
```

### Required Fields

* `id`

### Recommended Fields

* `kind`
* `title`
* `description`

---

## 4. Participant Kinds

AIP defines four core participant kinds:

* `agent`
* `service`
* `human`
* `subflow`

These kinds describe orchestration role, not implementation mechanics.

---

## 4.1 Agent

A reasoning, generative, evaluative, or adaptive participant.

Agents are typically used where outputs may vary based on context, judgment, or synthesis.

Examples:

* planner
* reviewer
* coding assistant
* writer
* research assistant
* ranking participant

Example:

```yaml id="lm6d8r"
- id: architecture-agent
  kind: agent
```

Typical characteristics:

* context-sensitive
* may be non-deterministic
* may produce alternatives
* may evaluate or synthesize inputs

---

## 4.2 Service

A bounded capability participant that accepts inputs and produces outputs through deterministic or operational execution.

A service may be implemented as:

* REST API
* CLI command
* queue worker
* scheduled process
* script
* MCP tool adapter
* internal runtime component
* SaaS integration

AIP does not distinguish among these implementations.

Examples:

* test runner
* linter
* image resizer
* search endpoint
* PDF generator
* billing API
* translation engine

Example:

```yaml id="1m9qyf"
- id: test-runner
  kind: service
```

Typical characteristics:

* predictable input/output contract
* bounded execution goal
* implementation-specific invocation hidden by provider

---

## 4.3 Human

A human participant providing judgment, preference, missing context, approval, or creative direction.

Human participants are first-class participants, not workflow exceptions.

Examples:

* editor
* reviewer
* designer
* approver
* operator

Example:

```yaml id="cn2p5x"
- id: final-editor
  kind: human
```

Human participation commonly pairs with `await`.

---

## 4.4 Subflow

A reusable AIP flow invoked as a participant.

Subflows encapsulate internal orchestration behind declared inputs and outputs.

Examples:

* security-review
* article-layout-review
* release-readiness-check

Example:

```yaml id="10t6y0"
- id: security-review
  kind: subflow
```

---

## 5. Common Fields

Example:

```yaml id="sn8d4r"
- id: code-reviewer
  kind: agent
  title: Code Reviewer
  description: Reviews pull requests for maintainability
```

| Field       | Required    | Description                     |
| ----------- | ----------- | ------------------------------- |
| id          | Yes         | Unique participant identifier   |
| kind        | Recommended | Participant role classification |
| title       | No          | Human-readable label            |
| description | No          | Summary of purpose              |

---

## 6. Optional Capability Metadata

Participants may advertise capabilities for routing, discovery, or UI display.

Example:

```yaml id="kz4j1g"
- id: writing-agent
  kind: agent
  capabilities:
    - summarize
    - rewrite
    - tone-adjust
```

Capabilities are advisory metadata.

AIP does not assign semantic meaning to capability labels.

---

## 7. Optional Constraints Metadata

Participants may advertise constraints.

Example:

```yaml id="mb3gpd"
- id: image-renderer
  kind: service
  constraints:
    supportsAsync: true
    maxImages: 4
```

Constraint interpretation is provider-defined.

---

## 8. Invocation Model

Participants are engaged through AIP steps.

Participant definitions do not imply transport or execution model.

Invocation method is provider-defined.

Examples:

* HTTP request
* CLI command
* queue dispatch
* event trigger
* direct in-process call
* human UI prompt

---

## 9. Human Participants and Await

Human participants commonly pair with `await`.

Example:

```yaml id="c3vnj2"
steps:
  - id: final-review
    type: await
    participantRef: final-editor
```

Meaning:

* flow pauses
* required input is requested
* flow resumes when supplied

---

## 10. Subflow Participants

Subflows allow composition and reuse.

Example:

```yaml id="2bg5qv"
participants:
  - id: artifcle-review
    kind: subflow
```

Subflows should expose:

* declared inputs
* declared outputs
* version identity
* failure / exit behavior

---

## 11. Provider Responsibilities

Providers bind participants to implementations.

Examples:

### Agent

* hosted model
* local model
* remote agent gateway

### Service

* API
* CLI
* worker
* tool adapter
* SaaS endpoint

### Human

* IDE panel
* web form
* chat prompt
* notification link

### Subflow

* nested AIP execution

---

## 12. Non-Goals

Participants do not define:

* prompts
* memory models
* reasoning chains
* transport details
* infrastructure topology
* orchestration semantics

Those belong elsewhere.

---

## 13. Example

```yaml id="35wx0z"
participants:
  - id: plot-agent
    kind: agent

  - id: panel-renderer
    kind: service

  - id: final-editor
    kind: human

  - id: publish-review
    kind: subflow
```

---

## 14. Summary

Participants answer the question:

> **Who can perform work in an AIP flow?**

They are:

* capability-oriented
* implementation-agnostic
* provider-bound
* reusable
* optionally human

Core kinds are intentionally minimal:

* agent
* service
* human
* subflow

