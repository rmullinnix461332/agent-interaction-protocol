# AIP Specification — 05 Coordination Operators (Draft v0.1)

## 1. Purpose

Coordination operators define **how outputs are transformed, reduced, ordered, combined, filtered, or paused at flow boundaries**.

Operators are applied within AIP steps to shape artifacts for downstream participants.

Operators express **intent**, not implementation.

Providers choose how an operator is realized.

---

## 2. Design Principles

### 2.1 Semantic Intent Over Algorithm

An operator declares desired orchestration behavior.

AIP does not require any specific implementation algorithm.

Examples:

* `summarize` may use an agent, heuristic logic, templates, or deterministic reduction.
* `rank` may use scoring logic, rules, or model evaluation.

### 2.2 Minimal Canonical Set

AIP intentionally defines a small set of broadly useful operators.

### 2.3 Boundary-Oriented

Operators are most commonly applied at:

* fan-in points
* iteration boundaries
* branch preparation points
* pre-invocation shaping steps
* pause/resume boundaries

### 2.4 Provider Neutrality

Providers may optimize operator execution but must preserve operator meaning.

---

## 3. Canonical Operator Set

AIP defines five core operators:

* `summarize`
* `rank`
* `merge`
* `filter`
* `await`

---

## 4. Operator Definitions

---

## 4.1 Summarize

Reduce one or more inputs into a concise downstream artifact while preserving salient meaning.

Typical use cases:

* condensing fan-in outputs
* reducing long context before agent invocation
* compressing iteration results
* executive summary generation

Example:

```yaml id="0z4c2r"
operator:
  type: summarize
```

Possible provider implementations:

* LLM summarization
* template extraction
* rules-based reduction
* structured condensation

Notes:

* Output should be materially smaller or simpler than inputs.
* Summarize does not imply opinion or ranking.

---

## 4.2 Rank

Order outputs according to declared criteria.

Typical use cases:

* candidate selection
* issue prioritization
* recommendation ordering
* choosing strongest alternatives

Example:

```yaml id="rm0g4n"
operator:
  type: rank
  topN: 3
```

Optional fields:

* `topN`
* `criteriaRef`

Possible provider implementations:

* scoring model
* weighted rules
* evaluator agent
* deterministic comparator

Notes:

* Rank orders outputs.
* Downstream consumers may select top results.

---

## 4.3 Merge

Combine multiple outputs into a single downstream artifact.

Typical use cases:

* assembling sections of a document
* combining contributions from participants
* collecting artifacts
* unioning result sets

Example:

```yaml id="sy2e8p"
operator:
  type: merge
  mode: union
```

Suggested modes:

* `append`
* `union`
* `deduplicate`
* `keyedOverwrite`

Possible provider implementations:

* structured object merge
* list concatenation
* set union
* conflict resolution logic

Notes:

* Merge does not imply summarization.
* Merge preserves content unless mode dictates otherwise.

---

## 4.4 Filter

Remove outputs that do not meet criteria.

Typical use cases:

* reduce noisy fan-out results
* remove invalid candidates
* enforce constraints
* narrow search sets

Example:

```yaml id="2z6g0x"
operator:
  type: filter
  criteriaRef: aip://artifact/filter-rules
```

Optional fields:

* `criteriaRef`

Possible provider implementations:

* rules engine
* evaluator agent
* schema validation
* threshold scoring

Notes:

* Filter removes, it does not reorder.
* Rank may follow filter.

---

## 4.5 Await

Suspend flow until required external input is provided.

Input may come from:

* human participant
* external system
* callback
* event
* delayed disconnected process

Typical use cases:

* editorial approval
* user choice
* missing context request
* asynchronous external completion
* manual review boundary

Example:

```yaml id="8owk15"
operator:
  type: await
```

Possible provider implementations:

* IDE prompt
* web form
* notification link
* queue listener
* webhook resume event

Notes:

* Await is a coordination boundary.
* Await does not imply human-only workflows.
* Flow resumes when required input is satisfied.

---

## 5. Where Operators Apply

Operators are commonly attached to steps.

Example:

```yaml id="x54qeq"
steps:
  - id: combine-findings
    type: fanIn
    dependsOn:
      - security-scan
      - code-review
    operator:
      type: summarize
```

---

## 6. Combining Operators

Providers may support sequential operator application.

Example conceptual chain:

```text id="ik83fg"
fanIn -> filter -> rank -> summarize
```

Canonical AIP may express this through separate steps rather than nested operator stacks.

Preferred style:

* keep each operator explicit
* preserve traceability
* simplify debugging

---

## 7. Operator Metadata

Common optional fields:

| Field       | Description                                |
| ----------- | ------------------------------------------ |
| type        | Operator name                              |
| mode        | Variant behavior (merge)                   |
| topN        | Result count limit (rank)                  |
| criteriaRef | Reference to scoring or filtering criteria |
| config      | Provider-specific extension config         |

---

## 8. Provider Responsibilities

Providers must:

* honor declared operator semantics
* produce traceable outputs
* preserve output references
* reject unsupported operators clearly

Providers may:

* optimize execution
* batch operations
* choose deterministic or model-based realization

---

## 9. Non-Goals

Operators do not define:

* prompts
* model internals
* storage strategy
* transport method
* UI behavior
* business policy language

---

## 10. Example Flow

```yaml id="5z0hrp"
steps:
  - id: generate-options
    type: fanOut

  - id: narrow-options
    type: fanIn
    operator:
      type: filter

  - id: choose-best
    type: fanIn
    operator:
      type: rank
      topN: 1

  - id: final-approval
    type: await
    operator:
      type: await
```

---

## 11. Summary

Operators answer the question:

> **How should outputs be shaped for downstream flow?**

AIP keeps the operator set intentionally small:

* summarize
* rank
* merge
* filter
* await

These are coordination semantics, not implementation code.

