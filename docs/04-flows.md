# AIP Specification — 04 Flows (Draft v0.4)

## 1. Purpose

Flows define **how steps coordinate over time** within AIP.

Participants describe capability.
Artifacts describe data.
Steps describe units of work.
**Flows describe orchestration structure.**

Flows answer the question:

> **How does work move through the system?**

---

## 2. Design Principles

### 2.1 Explicit Coordination

Flow behavior should be declared in AIP rather than hidden in provider runtime logic.

### 2.2 Dependency Graph With Coordination Blocks

AIP flows are expressed through flat steps with explicit dependencies, plus coordination blocks such as `fanOut` and `fanIn`.

### 2.3 Human + Machine Compatible

Flows may coordinate:

* agents
* services
* humans
* subflows

### 2.4 Portable Semantics

Providers may execute flows differently, but should preserve declared flow meaning.

### 2.5 Composition Friendly

Flows should support reuse through subflows.

---

## 3. Canonical Model

Flows are composed of:

* steps
* dependencies (`dependsOn`)
* coordination blocks
* artifacts
* operators
* subflows

---

## 4. Flow Shapes

AIP supports common orchestration shapes.

---

## 4.1 Sequence

One step depends on another.

```text id="c3qf81"
generate -> review -> publish
```

Use for:

* staged pipelines
* refinement chains
* deterministic progression

---

## 4.2 Parallel Fan-Out

A `fanOut` step defines intentional divergence into multiple member steps.

```text id="p6n1zy"
generate
   |
 fanOut explore
  / | \
 a  b  c
```

Use for:

* alternatives generation
* simultaneous reviews
* distributed parallel work

---

## 4.3 Fan-In Convergence

A `fanIn` step converges one or more upstream `fanOut` blocks or explicit steps.

```text id="s5j9xv"
fanOut explore
  / | \
 a  b  c
   |
fanIn choose-best
```

Use for:

* combining outputs
* ranking alternatives
* filtering noisy results
* summarizing findings

---

## 4.4 Multiple Fan-Out to Single Fan-In

Independent branch groups may recombine through a single `fanIn`.

```text id="g2t6ka"
fanOut visuals
fanOut dialogue
      |
    combine
```

---

## 4.5 Fan-In Completion Conditions

A `fanIn` step may declare when upstream work is sufficient.

Supported values:

* `allSuccess` *(default)*
* `anySuccess`
* `allComplete`

### allSuccess

All upstream dependencies must succeed.

### anySuccess

At least one upstream dependency must succeed.

### allComplete

All upstream dependencies must reach terminal state.

---

## 4.6 Conditional Decision

A `decision` step evaluates conditions and selects path(s).

```text id="h9k2pw"
quality-check
   |
 pass -> publish
 fail -> revise
```

Use for:

* gates
* threshold routing
* retries
* alternate paths

---

## 4.7 Await / Pause Resume

Flow pauses until required input is supplied.

```text id="m7q3cd"
draft -> editor-review [pause] -> publish
```

Use for:

* approvals
* missing context
* creative choices
* external callbacks

---

## 4.8 Iterative Flow

Iteration repeats a step, participant action, or subflow according to declared rules.

Iteration transforms AIP from static dependency graphs into adaptive workflows.

Use for:

* refinement loops
* per-item processing
* retries
* background workers
* scanning collections
* creative exploration rounds

---

### 4.8.1 Iteration Scope

Iteration may apply to:

* a single `action` step
* a reusable subflow
* future grouped step sets

Example:

```yaml id="4w1mcf"
- id: review-files
  type: action
  iteration:
    mode: forEach
```

---

### 4.8.2 Iteration Modes

#### forEach

Execute once for each item in a collection.

Example:

```yaml id="n8r5uz"
iteration:
  mode: forEach
  collectionRef: aip://artifact/file-list
```

Typical uses:

* process files
* review tickets
* generate images per panel
* transform records

---

#### while

Repeat while a condition remains true.

Example:

```yaml id="t3x0sa"
iteration:
  mode: while
  condition:
    scoreLt: 90
```

Typical uses:

* revise until acceptable
* retry until success
* improve quality until threshold

---

#### bounded

Repeat up to a maximum count.

Example:

```yaml id="k6j4qe"
iteration:
  mode: bounded
  maxIterations: 3
```

Typical uses:

* capped retries
* three creative rounds
* exploration budget control

---

### 4.8.3 Execution Strategy

Providers may support execution strategy.

Supported values:

* `serial`
* `parallel`

Example:

```yaml id="q9c7vo"
iteration:
  mode: forEach
  collectionRef: aip://artifact/file-list
  strategy: parallel
```

#### serial

Items run one at a time.

Useful when order matters.

#### parallel

Items may run concurrently.

Useful for scalable independent work.

---

### 4.8.4 Output Accumulation

Iteration may define how outputs combine across cycles.

Supported values:

* `append`
* `replace`
* `merge`

Example:

```yaml id="z2h6kl"
iteration:
  mode: forEach
  outputMode: append
```

#### append

Collect outputs as ordered list.

#### replace

Keep latest result only.

#### merge

Combine outputs into one structured artifact.

---

### 4.8.5 Failure Handling

Iteration may define item failure behavior.

Supported values:

* `stop`
* `continue`
* `collect`

Example:

```yaml id="u1b8tx"
iteration:
  mode: forEach
  onItemFailure: continue
```

#### stop

Terminate iteration on first failure.

#### continue

Proceed to remaining items.

#### collect

Continue and preserve failure outputs for later analysis.

---

### 4.8.6 Safety Controls

Providers should support safety limits.

Recommended fields:

* `maxIterations`
* `timeout`
* provider execution quotas

Example:

```yaml id="y7m4na"
iteration:
  mode: while
  maxIterations: 10
  timeout: 300s
```

This prevents runaway loops.

---

### 4.8.7 Await Within Iteration

Iteration may contain `await` boundaries.

Example:

```text id="w4r9xp"
for each draft:
  generate
  await human choice
  continue
```

Useful for:

* batched review queues
* background workers requesting input only when needed
* staged human oversight

---

### 4.8.8 Example

```yaml id="f3k0de"
- id: review-files
  type: action
  participantRef: reviewer
  iteration:
    mode: forEach
    collectionRef: aip://artifact/file-list
    strategy: parallel
    outputMode: append
    onItemFailure: collect
```

---

## 5. Dependencies

Dependencies are the canonical readiness model.

Rules:

* steps may wait on zero or more upstream steps or coordination blocks
* providers schedule once dependencies are satisfied
* dependencies do not imply transport model

---

## 6. Operators in Flow

Operators shape artifacts between stages.

Common patterns:

* fanIn + summarize
* fanIn + rank
* fanIn + filter
* fanIn + merge
* await + resume artifact

---

## 7. Subflows

Flows may invoke reusable flows as participants.

Benefits:

* reuse
* versioning
* complexity isolation
* standard pipelines

---

## 8. Human-Centered Flows

Humans participate through normal flow constructs:

```text id="q5p2rh"
generate -> await human choice -> continue
```

No separate BPM-style human task system is required.

---

## 9. Flow Validation

A flow is structurally valid when:

* step IDs are unique
* dependencies reference real steps or coordination blocks
* `fanOut.steps` reference real steps
* decision targets reference real steps
* required artifacts can be satisfied
* step types are valid
* iteration config is valid

---

## 10. Provider Responsibilities

Providers may determine:

* scheduling
* concurrency
* retries
* persistence
* transport
* optimization

Providers must preserve:

* dependency meaning
* fanOut membership semantics
* fanIn completion semantics
* decision routing semantics
* pause/resume semantics
* iteration semantics
* operator intent

---

## 11. Non-Goals

Flows do not define:

* prompts
* model memory
* UI rendering
* infrastructure topology
* org approval chains
* storage engines

---

## 12. Summary

Flows answer the question:

> **How does work coordinate across steps?**

AIP flows are:

* graph-oriented
* dependency-driven
* portable
* human-compatible
* reusable
* explicit

They support:

* sequence
* fan-out
* fan-in
* decisions
* await boundaries
* iteration
* subflow composition

Iteration is first-class and enables adaptive orchestration beyond static DAG execution.

