# Agent Interaction Protocol (AIP) — Overview (Draft v0.1)

## 1. What Is AIP?

Agent Interaction Protocol (AIP) is a **provider-neutral orchestration protocol** for coordinating participants through:

* typed interactions
* explicit flow semantics
* coordination operators
* reusable subflows
* pause / resume boundaries

AIP defines how work coordinates across participants without requiring those participants to be rewritten for orchestration.

---

## 2. Why AIP Exists

Current multi-agent orchestration is commonly delivered through:

* vendor frameworks
* tightly coupled runtimes
* bespoke hardcoded workflows
* tool-specific ecosystems
* hidden prompt chains

These approaches may work, but often create:

* lock-in
* poor portability
* weak visibility
* brittle integrations
* difficult reuse

AIP exists to define a stable coordination layer above implementations.

---

## 3. What Problem AIP Solves

AIP addresses a common need:

> Multiple participants need to contribute to a useful outcome, but the orchestration should remain portable, explicit, and implementation-neutral.

Examples:

* several agents reviewing code
* services processing artifacts in parallel
* a creative pipeline generating a comic strip
* background workers requesting human input when needed
* reusable review flows embedded in larger workflows

---

## 4. Core Principle

AIP separates four concerns:

| Concern                 | AIP Object   |
| ----------------------- | ------------ |
| Who performs work       | Participants |
| What moves through flow | Artifacts    |
| What happens            | Steps        |
| How coordination occurs | Flows        |

This keeps orchestration understandable and evolvable.

---

## 5. What AIP Is Not

AIP is **not**:

* a workflow engine
* a vendor framework
* a prompt framework
* an AI model runtime
* a memory system
* a BPM suite
* a UI product
* a deployment platform

AIP is a protocol contract.

Providers implement it. Tools may visualize it. Runtimes may execute it.

---

## 6. Core Building Blocks

## Participants

Entities capable of work.

Examples:

* agent
* service
* human
* subflow

## Artifacts

Data exchanged through flow.

Examples:

* markdown plans
* JSON objects
* code patches
* images
* approval decisions

## Steps

Executable coordination units.

Examples:

* action
* fanOut
* fanIn
* decision
* await
* exit

## Flows

Graph structures describing how steps coordinate over time.

---

## 7. Flow Capabilities

AIP supports:

* sequential pipelines
* parallel fan-out
* fan-in convergence
* conditional routing
* pause / resume workflows
* iteration loops
* reusable subflows
* human-in-the-loop boundaries

---

## 8. Example Mental Model

```text id="k9w4az"
generate brief
     |
   fanOut
  /   |   \
draft-a b c
   \   |  /
    fanIn rank
        |
      await human pick
        |
      publish
```

This is orchestration expressed clearly without binding to any single runtime.

---

## 9. Why Provider Neutral Matters

AIP should work regardless of whether a provider uses:

* REST APIs
* local runtimes
* queues
* events
* SaaS tools
* agent frameworks
* IDE plugins
* distributed workers

The provider chooses implementation.

AIP preserves meaning.

---

## 10. Why Humans Are First-Class

Many useful workflows require judgment, preference, or approval.

AIP treats humans as normal participants through:

* `action`
* `await`

This avoids awkward external task systems.

---

## 11. Why Subflows Matter

Reusable flows become composable building blocks.

Examples:

* security review flow
* publishing flow
* comic generation flow
* release readiness flow

This allows orchestration ecosystems rather than one-off flows.

---

## 12. Design Philosophy

AIP favors:

* explicitness over magic
* portability over lock-in
* contracts over hidden coupling
* small primitives over bloated frameworks
* human + machine collaboration over full automation mythology

---

## 13. Typical Use Cases

## Software

* code review swarms
* remediation workers
* CI/CD decision flows

## Personal Productivity

* background assistants
* inbox triage
* research pipelines

## Creative

* writing systems
* comic strip generation
* storyboard pipelines
* content ranking and refinement

## Enterprise

* review workflows
* policy checks
* reusable operational flows

---

## 14. Status

AIP is an exploratory protocol draft intended to test whether orchestration can be described cleanly above specific frameworks and vendors.

---

## 15. Summary

AIP answers a simple question:

> How do multiple participants coordinate useful work without being trapped inside one vendor’s model?

It does so through:

* participants
* artifacts
* steps
* flows
* operators
* subflows

AIP is orchestration as a portable contract.

