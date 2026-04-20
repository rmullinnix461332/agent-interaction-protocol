# AIP Specification — 06 Subflows (Draft v0.1)

## 1. Purpose

Subflows are **reusable AIP flows invoked as participants within another flow**.

A subflow allows orchestration logic to be packaged behind a stable contract and reused across many parent flows.

Participants describe capability.
Steps describe work.
Flows describe coordination.
**Subflows describe reusable coordination units.**

Subflows answer the question:

> **How can orchestration be composed and reused?**

---

## 2. Design Principles

### 2.1 Contract Over Internals

Parent flows should depend on a subflow’s declared inputs, outputs, and completion semantics rather than its internal implementation.

### 2.2 Encapsulation

A subflow hides internal orchestration complexity from the parent flow.

### 2.3 Reusability

A subflow should be reusable across many flows and providers.

### 2.4 Versionability

Subflows should support explicit version references.

### 2.5 Provider Neutrality

Providers may execute subflows differently, but must preserve declared subflow semantics.

---

## 3. Core Concept

A subflow is:

* an AIP flow
* referenced as a participant
* invoked through an `action` step
* governed by an input/output contract

Example:

```yaml id="k5r2qn"
participants:
  - id: security-review
    kind: subflow
```

Then used as:

```yaml id="v9p7cx"
steps:
  - id: run-security-review
    type: action
    participantRef: security-review
```

---

## 4. Why Subflows Exist

Subflows reduce duplication and improve consistency.

Common reusable patterns:

* security review pipeline
* content publishing pipeline
* comic generation pipeline
* release readiness checks
* research gather-and-rank pipeline
* background worker remediation flow

Without subflows, these patterns must be repeatedly reauthored.

---

## 5. Subflow Identity

Subflows should expose stable identity.

Recommended fields:

| Field       | Required    | Description                 |
| ----------- | ----------- | --------------------------- |
| id          | Yes         | Local participant reference |
| flowRef     | Recommended | Canonical subflow location  |
| version     | Recommended | Explicit version            |
| title       | No          | Human-readable label        |
| description | No          | Purpose summary             |

Example:

```yaml id="n2q6tw"
participants:
  - id: security-review
    kind: subflow
    flowRef: aip://flow/security-review
    version: v1.2
```

---

## 6. Input Contract

Subflows should declare required and optional inputs.

Example:

```yaml id="r7j3ax"
inputs:
  - ref: aip://input/pr-diff
    contentType: text/x-diff

  - ref: aip://input/repo-metadata
    contentType: application/json
```

Parent flows provide these artifacts.

---

## 7. Output Contract

Subflows should declare produced outputs.

Example:

```yaml id="u4w8mn"
outputs:
  - ref: aip://output/security-findings
    contentType: text/markdown

  - ref: aip://output/risk-score
    contentType: application/json
```

Parent flows consume outputs like any other artifact.

---

## 8. Invocation Model

A subflow is executed through an `action` step.

Example:

```yaml id="z1m4he"
- id: run-release-check
  type: action
  participantRef: release-readiness
  consumes:
    - aip://artifact/build-results
  produces:
    - aip://artifact/release-report
```

Notes:

* Parent flow does not need awareness of internal subflow steps.
* Providers may execute subflow locally or remotely.

---

## 9. Completion Semantics

Subflows should declare how they terminate.

Supported outcomes:

* success
* failure
* cancelled
* blocked

Example:

```yaml id="w8f5pd"
completion:
  successOutputs:
    - aip://output/security-findings
```

Parent flows react to subflow completion as they would any participant action.

---

## 10. Error Boundaries

Subflows create clean error boundaries.

Benefits:

* internal failure handling can remain encapsulated
* parent flow receives normalized result
* retries may occur internally or externally

Example:

```text id="g6q2sr"
parent flow
   |
subflow failed
   |
normalized failure artifact
```

---

## 11. Nested Subflows

Subflows may invoke other subflows.

Example:

```text id="b3m9zc"
release-readiness
   ├─ security-review
   ├─ quality-review
   └─ compliance-review
```

This enables hierarchical orchestration.

Providers should guard against infinite recursion.

---

## 12. Versioning

Versioning is strongly recommended.

Examples:

```text id="p0x4dv"
aip://flow/security-review@v1
aip://flow/security-review@v2
```

Benefits:

* stable contracts
* safe upgrades
* repeatable execution
* auditability

---

## 13. Override and Extension Strategy

Parent flows may configure subflows through declared inputs rather than mutating internals.

Preferred:

```yaml id="f5r8ou"
aip://input/review-threshold
aip://input/style-guide
aip://input/max-risk-score
```

Avoid:

* reaching into internal steps
* patching internal dependencies
* runtime mutation of hidden logic

---

## 14. Subflows as Products

Reusable subflows may become standard building blocks.

Examples:

* standard code review
* standard onboarding flow
* standard comic publishing flow
* standard remediation worker

This allows ecosystems of composable orchestration units.

---

## 15. Provider Responsibilities

Providers may choose:

* local execution
* remote execution
* cached execution
* distributed execution

Providers must preserve:

* input contract
* output contract
* completion semantics
* version reference
* nested flow boundaries

---

## 16. Validation

A subflow reference is valid when:

* referenced flow exists
* version resolves
* required inputs are satisfied
* declared outputs are coherent
* recursion limits are respected

---

## 17. Non-Goals

Subflows do not require:

* shared runtime engine
* shared storage backend
* visibility into internals
* same provider as parent flow

Subflows are contract-based, not infrastructure-bound.

---

## 18. Example

```yaml id="x2n7ka"
participants:
  - id: comic-pipeline
    kind: subflow
    flowRef: aip://flow/comic-strip-generator
    version: v1

steps:
  - id: run-comic
    type: action
    participantRef: comic-pipeline
    consumes:
      - aip://artifact/story-prompt
    produces:
      - aip://artifact/final-comic
```

---

## 19. Summary

Subflows answer the question:

> **How do we reuse orchestration logic cleanly?**

They provide:

* encapsulation
* versioning
* composition
* portability
* standardized building blocks

Subflows let AIP scale from simple flows to reusable orchestration ecosystems.

