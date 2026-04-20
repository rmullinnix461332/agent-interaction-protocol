# AIP Specification — 07 Providers (Draft v0.1)

## 1. Purpose

Providers are the **runtime realizations of AIP orchestration**.

AIP defines orchestration intent.
Providers execute that intent using real infrastructure, tools, transports, and storage systems.

Providers answer the question:

> **How does AIP meet reality?**

---

## 2. Core Principle

AIP intentionally separates:

| Concern                 | Responsibility             |
| ----------------------- | -------------------------- |
| Orchestration semantics | AIP                        |
| Runtime execution       | Provider                   |
| User experience         | Tooling / UI               |
| Participant internals   | Participant implementation |

This allows AIP flows to remain portable while providers innovate independently.

---

## 3. What a Provider Is

A provider is any implementation capable of interpreting and executing AIP flows.

Examples:

* local CLI runtime
* IDE plugin runtime
* cloud workflow executor
* queue/event worker system
* agent gateway
* serverless runner
* embedded application runtime
* testing harness

A provider may be lightweight or enterprise-scale.

---

## 4. What Providers Do

Providers typically perform some or all of the following:

* validate AIP definitions
* schedule executable steps
* resolve dependencies
* invoke participants
* route artifacts
* persist state
* manage pause / resume boundaries
* apply operators
* enforce limits
* expose traces and logs

---

## 5. What Providers Must Preserve

Providers may optimize implementation, but must preserve AIP semantic meaning.

They must preserve:

* dependency semantics
* fanOut membership semantics
* fanIn completion semantics
* decision routing meaning
* await pause/resume behavior
* iteration behavior
* artifact references
* operator intent
* subflow boundaries

A provider should not silently reinterpret flow meaning.

---

## 6. Provider Freedom

Providers may choose any implementation model.

Examples:

## Execution

* synchronous calls
* asynchronous jobs
* event-driven execution
* long-running workers
* serverless invocation

## Communication

* REST
* gRPC
* CLI commands
* queues
* webhooks
* MCP transports
* in-process calls

## Persistence

* memory
* object storage
* git repositories
* databases
* caches
* provider internal stores

## Scaling

* single user local mode
* shared team runtime
* distributed cluster mode

---

## 7. Participant Binding

Providers bind AIP participants to concrete implementations.

Example AIP participant:

```yaml id="d4k7an"
participants:
  - id: reviewer
    kind: agent
```

Possible provider bindings:

```text id="v6p1rz"
reviewer -> local LLM agent
reviewer -> hosted AI gateway
reviewer -> remote MCP-connected system
```

Example service binding:

```text id="k3j8xc"
test-runner -> npm test
test-runner -> REST endpoint
test-runner -> queue worker
```

AIP defines participant identity.
Provider defines realization.

---

## 8. Artifact Handling

Providers decide how artifacts are transported and stored.

Possible strategies:

* inline payloads
* temporary files
* object references
* message payloads
* cache handles
* database rows

Large artifacts may be represented by references rather than copied repeatedly.

Providers should preserve declared:

* `ref`
* `contentType`
* `contractRef` (when present)

---

## 9. Scheduling Model

Providers may choose scheduling strategy.

Examples:

* eager execution
* lazy execution
* queue-based dispatch
* priority scheduling
* batched execution
* resource-aware throttling

Providers must still honor readiness semantics defined by dependencies.

---

## 10. Await / Resume Handling

Providers are responsible for pause and resume mechanics.

Possible implementations:

* IDE prompt
* web UI approval form
* notification link
* webhook callback
* queue message
* chat response
* external system signal

Providers should preserve:

* waiting step identity
* required input contract
* resumed flow continuity

---

## 11. Operator Realization

AIP defines operator intent.
Providers decide implementation.

Examples:

## Summarize

* LLM reduction
* rules-based compression
* template summary

## Rank

* scoring rules
* evaluator model
* weighted comparator

## Merge

* list append
* object merge
* deduplication

## Filter

* rules engine
* threshold logic
* evaluator participant

---

## 12. Subflow Execution

Providers may run subflows:

* inline within same runtime
* delegated to another provider
* remote invocation
* cached from prior identical inputs

Providers must preserve subflow contracts and completion semantics.

---

## 13. Local vs Distributed Providers

## Local Provider

Runs on developer machine or single host.

Benefits:

* fast iteration
* IDE integration
* private experimentation

## Distributed Provider

Runs across shared infrastructure.

Benefits:

* scaling
* persistence
* multi-user workloads
* centralized governance

Both should support the same AIP semantics.

---

## 14. Testing Providers

A provider may exist purely for testing.

Examples:

* mock participant harness
* deterministic replay runner
* schema validator
* ASCII graph renderer

This enables AIP development without production infrastructure.

---

## 15. Provider Capabilities Declaration

Providers may publish supported capabilities.

Example:

```yaml id="j8w4tp"
provider:
  name: local-aip
  supports:
    - action
    - decision
    - await
    - iteration.parallel
    - subflows
```

Useful for:

* compatibility checks
* tooling selection
* graceful degradation

---

## 16. Multi-Provider Future

Different providers may specialize.

Examples:

* IDE provider for authorship
* cloud provider for scale
* creative provider for media workflows
* enterprise provider for governance workloads

AIP enables portability across them.

---

## 17. What Providers Should Avoid

Providers should avoid:

* changing flow meaning silently
* hardcoding vendor-only semantics into AIP objects
* hiding execution state entirely
* mutating contracts unexpectedly
* forcing one storage model
* forcing one transport model

---

## 18. Example

```text id="c2m9sb"
AIP Flow:
generate -> fanOut -> choose-best -> await -> publish

Provider A:
local IDE runtime using files + prompts

Provider B:
cloud runtime using queues + object storage + web UI

Provider C:
agent gateway runtime using MCP + APIs
```

Same flow, different realization.

---

## 19. Summary

Providers answer the question:

> **How is AIP actually executed?**

They provide:

* runtime execution
* participant binding
* scheduling
* persistence
* transport
* pause/resume mechanics
* operator realization

AIP defines the contract.
Providers bring it to life.

