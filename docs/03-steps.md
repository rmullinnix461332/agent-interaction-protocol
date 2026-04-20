# AIP Specification — 03 Steps (Draft v0.2)

## 1. Purpose

Steps are the **executable coordination units** of an AIP flow.

A step defines:

* what action occurs
* which participant is engaged (if any)
* what inputs are consumed
* what outputs are produced
* what dependencies must complete first
* how control transitions afterward

Participants describe capability.
**Steps describe orchestration behavior.**

---

## 2. Design Principles

### 2.1 Explicit Over Implicit

All flow behavior should be expressed through steps rather than hidden provider logic.

### 2.2 Flat Canonical Model

Steps exist as a flat collection with explicit references and dependencies.

Nested authoring views may exist, but canonical AIP should remain flat.

### 2.3 Provider Neutrality

Steps describe orchestration intent, not runtime implementation.

### 2.4 Traceability

Each step should be independently identifiable, inspectable, and traceable.

---

## 3. Step Identity

Each step must declare a unique `id` within the flow.

Example:

```yaml id="p8x4an"
steps:
  - id: generate-outline
  - id: review-outline
```

Recommended fields:

* `id`
* `type`
* `title`
* `description`

---

## 4. Core Step Structure

Example:

```yaml id="j3a6zk"
- id: run-review
  type: action
  participantRef: review-agent
  consumes:
    - aip://artifact/source-doc
  produces:
    - aip://artifact/review-notes
```

---

## 5. Step Types

AIP defines six core step types:

* `action`
* `fanOut`
* `fanIn`
* `decision`
* `await`
* `exit`

---

## 5.1 Action

Perform work through a participant or subflow.

Use for:

* engaging an agent
* executing a service
* requesting human contribution
* invoking a reusable subflow

Example:

```yaml id="r8f1ut"
- id: create-summary
  type: action
  participantRef: summary-agent
```

Valid references:

* `participantRef`
* `subflowRef`

Notes:

* Action describes work intent, not invocation mechanism.
* Providers determine how execution occurs.

---

## 5.2 FanOut

Distribute outputs to multiple downstream paths.

Use for:

* parallel evaluation
* generating alternatives
* simultaneous reviews
* multi-participant consultation

Example:

```yaml id="h7q6nc"
- id: explore-options
  type: fanOut
  onSuccess:
    nextSteps:
      - option-a
      - option-b
      - option-c
```

Notes:

* FanOut creates multiple downstream paths.
* Paths may later converge through FanIn.

---

## 5.3 FanIn

Converge multiple upstream paths into a single downstream step.

Often paired with operators.

Use for:

* combining outputs
* ranking alternatives
* filtering noisy results
* summarizing findings

Example:

```yaml id="s1k4pm"
- id: combine-findings
  type: fanIn
  dependsOn:
    - security-review
    - architecture-review
  operator:
    type: summarize
```

Notes:

* FanIn is structural convergence.
* FanIn does not imply consensus.

---

## 5.4 Decision

Evaluate conditions and choose next path.

Use for:

* quality gates
* threshold routing
* retry paths
* approval outcomes
* alternate processing routes

Example:

```yaml id="c6m2zx"
- id: quality-gate
  type: decision
  decision:
    cases:
      - when:
          scoreGte: 80
        next:
          nextStep: publish
    default:
      nextStep: revise
```

Notes:

* Decision selects path based on declared conditions.
* Condition syntax may be provider-defined or later standardized.

---

## 5.5 Await

Suspend flow until required input is provided.

Use for:

* human review
* missing context requests
* callback completion
* asynchronous external event
* disconnected work completion

Example:

```yaml id="v3n7ar"
- id: final-approval
  type: await
  participantRef: editor
  awaitInput:
    ref: aip://input/editor/decision
    schemaRef: editorDecision.schema.json
```

Notes:

* Flow pauses at this boundary.
* Resume occurs when required input is supplied.

---

## 5.6 Exit

Terminate flow with explicit status.

Use for:

* success completion
* failure termination
* cancellation
* blocked outcome

Example:

```yaml id="f2w8jd"
- id: done
  type: exit
  exit:
    status: success
```

---

## 6. Common Step Fields

| Field       | Description                    |
| ----------- | ------------------------------ |
| id          | Unique step identifier         |
| type        | Step type                      |
| title       | Human-readable name            |
| description | Optional summary               |
| dependsOn   | Required upstream step IDs     |
| consumes    | Artifact refs used as input    |
| produces    | Artifact refs emitted          |
| operator    | Optional coordination operator |
| onSuccess   | Transition after success       |
| onFailure   | Transition after failure       |

---

## 7. Dependencies

Use `dependsOn` to declare upstream completion requirements.

Example:

```yaml id="x0b9gr"
- id: merge-reviews
  type: fanIn
  dependsOn:
    - legal-review
    - design-review
    - finance-review
```

Notes:

* Dependencies define readiness for execution.
* Providers may schedule freely once satisfied.

---

## 8. Inputs and Outputs

Steps should explicitly declare artifacts consumed and produced.

Example:

```yaml id="z5t2hr"
- id: generate-panels
  type: action
  participantRef: panel-artist
  consumes:
    - aip://artifact/panel-descriptions
  produces:
    - aip://artifact/rendered-panels
```

This improves:

* traceability
* validation
* testing
* portability

---

## 9. Operators on Steps

Operators may shape step outputs or fan-in behavior.

Example:

```yaml id="k1r7fd"
- id: choose-best
  type: fanIn
  dependsOn:
    - option-a
    - option-b
    - option-c
  operator:
    type: rank
    topN: 1
```

---

## 10. Transitions

Steps may define explicit next behavior.

Example:

```yaml id="m6w2nh"
- id: run-tests
  type: action
  participantRef: test-runner
  onSuccess:
    nextStep: deploy
  onFailure:
    nextStep: rollback
```

---

## 11. Iteration

Steps may declare iteration metadata.

Example:

```yaml id="a2g5ux"
- id: review-each-file
  type: action
  participantRef: code-reviewer
  iteration:
    mode: forEach
    collectionRef: aip://artifact/file-list
```

Supported patterns:

* forEach
* while
* bounded

---

## 12. Human Participation

Human interaction is modeled through steps, not hidden workflow systems.

Common patterns:

* `action` for contribution request
* `await` for required decision/input

---

## 13. Provider Responsibilities

Providers may determine:

* scheduling
* parallel execution
* retries
* transport
* storage
* runtime binding

Providers must not alter step semantic meaning.

---

## 14. Non-Goals

Steps do not define:

* participant internals
* prompts
* infrastructure topology
* UI behavior
* memory systems

---

## 15. Example

```yaml id="r5d0hy"
steps:
  - id: generate-story
    type: action
    participantRef: writer

  - id: create-options
    type: fanOut
    dependsOn:
      - generate-story

  - id: choose-best
    type: fanIn
    operator:
      type: rank
      topN: 1

  - id: editor-review
    type: await
    participantRef: editor

  - id: complete
    type: exit
    exit:
      status: success
```

---

## 16. Summary

Steps answer the question:

> **What happens in an AIP flow?**

They are:

* explicit
* traceable
* provider-neutral
* dependency-driven
* artifact-aware

Core types are intentionally minimal:

* action
* fanOut
* fanIn
* decision
* await
* exit

