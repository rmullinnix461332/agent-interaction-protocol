# Agent Interaction Protocol (AIP) — Draft v0.3

## 1. Purpose

The Agent Interaction Protocol (AIP) defines a provider-neutral coordination contract for orchestrating participants through:

* typed interactions
* explicit flow semantics
* coordination operators
* composable subflows
* pause/resume boundaries

AIP enables multi-participant orchestration without requiring modification of participating agents or services.

---

## 2. Scope

AIP defines:

* how participants interact
* how data is exchanged
* how flows are structured
* how orchestration is composed and reused
* how outputs are transformed at flow boundaries
* how flows suspend and resume when external input is required

AIP does **not** define:

* execution engines
* transport mechanisms
* persistence technologies
* agent internals (prompting, tools, reasoning, memory)
* UI experiences
* provider runtime behavior (retries, scaling, scheduling)

---

## 3. Design Principles

### 3.1 Provider Neutrality

AIP is independent of execution platforms. Providers implement AIP but do not redefine its meaning.

### 3.2 Semantic Completeness

All information required to coordinate orchestration is expressed at the AIP layer.

### 3.3 Participant Agnostic

Participants may be agents, services, tools, humans, or subflows.

### 3.4 Non-Invasive Participation

Participants require no internal modification to participate in orchestration.

### 3.5 Stateless Protocol Model

AIP assumes sufficient context is supplied per interaction. Providers may optimize with state, but correctness does not depend on it.

### 3.6 Separation of Concerns

* AIP defines coordination intent
* Providers define execution realization
* UX layers define user interaction surfaces

### 3.7 Persistence and Communication Agnosticism

AIP does not prescribe storage or communication mechanisms.

Providers may use:

* object stores
* databases
* memory / cache
* git-backed stores
* queues
* events
* synchronous calls
* asynchronous calls

---

## 4. Core Concepts

### 4.1 Participant

An entity capable of performing work.

Types may include:

* agent
* service
* tool
* API
* human
* subflow

Participants are treated as black-box capabilities.

---

### 4.2 Interaction

A single invocation or engagement of a participant.

Each interaction may define:

* consumed inputs
* produced outputs
* schemas
* constraints
* references

---

### 4.3 Inputs / Outputs

All exchanged data should be:

* typed
* schema-defined
* referenceable

Each artifact may include:

* `aipRef`
* `schemaRef`
* producer identity
* consumer identity
* lineage metadata

---

### 4.4 Canonical References

Provider-neutral identifiers for artifacts in flow.

Examples:

```text id="ym97ch"
aip://artifact/story-outline
aip://output/review/top-ranked
aip://input/human/selection
```

---

### 4.5 Intent and Context

Intent and context are structured inputs propagated through flow. They are not assumed from chat history or provider internals.

---

## 5. Orchestration Models

### 5.1 Routing

Select participant(s) based on conditions, intent, or scoring.

### 5.2 Workflow

Ordered execution with declared dependencies.

### 5.3 Collaboration

Multiple participants contribute toward a shared output.

Collaboration does not require convergence and may preserve dissenting outputs.

---

## 6. Flow Semantics

### 6.1 Sequence

Ordered progression from one step to another.

### 6.2 Fan-Out

One output feeds multiple downstream participants.

### 6.3 Fan-In

Multiple upstream outputs converge to a downstream step.

Fan-in does not imply consensus.

### 6.4 Branch

Conditional path selection.

### 6.5 Iteration

Repeated execution of a participant or subflow.

Supports:

* for-each collections
* while conditions
* bounded loops

### 6.6 Failure

Explicit unsuccessful outcome with defined next behavior.

### 6.7 Exit

Defined flow termination.

---

## 7. Coordination Operators

Operators describe transformation intent at flow boundaries. Providers choose implementation method.

### 7.1 Summarize

Reduce one or more inputs into concise downstream output.

### 7.2 Rank

Order outputs by declared criteria.

Supports downstream top-N or top-1 selection.

### 7.3 Merge

Combine multiple outputs into one output.

Possible modes:

* append
* union
* deduplicate
* keyed overwrite

### 7.4 Filter

Remove outputs not meeting criteria.

### 7.5 Await

Suspend flow until required external input is provided.

Input may come from:

* human participant
* external system
* callback
* event
* delayed disconnected process

Await enables pause/resume orchestration without embedding human workflow constructs.

---

## 8. Composition Model

### 8.1 Subflows

An AIP flow may be used as a participant within another flow.

Subflows expose:

* declared inputs
* declared outputs
* failure conditions
* exit conditions

### 8.2 Reusability

Subflows may be versioned and reused across flows.

---

## 9. Provider Model

### 9.1 Role of Provider

Providers are responsible for:

* executing interactions
* resolving references
* storing artifacts
* transporting inputs/outputs
* handling pause/resume mechanics
* integrating participants

### 9.2 Provider Freedom

Providers may implement AIP using:

* local runtimes
* queues
* event buses
* IDE plugins
* workflow engines
* existing agent frameworks
* custom services

### 9.3 Provider Boundaries

Providers must not:

* alter AIP semantic meaning
* require protocol changes for implementation convenience
* redefine operators

---

## 10. Canonical Representation

AIP should use a flat canonical model.

Examples:

* steps with IDs
* explicit dependencies
* explicit refs
* explicit operators

Nested visual authoring models may exist, but should export to canonical flat form.

---

## 11. Tooling Model

### 11.1 CLI Harness

AIP may be validated and exercised through CLI tools.

Examples:

```text id="i5ov63"
aip validate flow.yaml
aip render flow.yaml
aip test flow.yaml
aip trace run.json
```

### 11.2 Render

`aip render` may produce ASCII graph or structured visual output.

### 11.3 Test Harness

Harnesses may simulate participants through mocks without requiring real runtimes.

---

## 12. UX Layer (Optional)

Visual builders or IDE plugins may provide:

* flow design surfaces
* graph views
* execution traces
* await input forms
* provider binding configuration

These are projections of AIP, not replacements for it.

---

## 13. Example Domains

AIP may coordinate work across many domains, including:

* software development
* debugging / review
* research workflows
* personal productivity assistants
* creative writing
* comic strip generation
* media pipelines
* background worker systems requiring occasional human input

---

## 14. Conformance

An AIP definition is valid when:

* references resolve
* schemas are valid
* dependencies are coherent
* operators are validly applied
* subflow boundaries are respected

Providers should reject or warn on unsupported features.

---

## 15. Summary

AIP defines:

* who participates
* what data is exchanged
* how work flows
* how outputs are transformed
* where flows pause and resume
* how orchestration stays portable across implementations

AIP does not define:

* any single runtime
* any vendor framework
* any UI product
* any required storage or transport technology

---

## Anchor Statement

> AIP is a provider-neutral orchestration protocol that coordinates participants through typed interactions, explicit flow semantics, coordination operators, composable subflows, and pause/resume boundaries, without requiring participants to be rewritten for orchestration.

