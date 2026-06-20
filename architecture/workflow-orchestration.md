# Workflow Orchestration

How to compose multiple services into one use case without leaking coordination into the services themselves.

## Core Principle

**Services own business logic; workflows own sequencing.** A workflow is a thin layer that composes services to accomplish a use case spanning more than one of them. It holds no business rules of its own — only the order in which services are called and the passing of results between them.

This is the counterpart to [Service-First Architecture](./service-first-architecture.md): services stay integration-agnostic and unaware of each other; the workflow is the one place that knows how they fit together.

---

## When a Workflow Exists

A workflow earns its place when a single use case spans **more than one service** — the same signal as Service-First's facade trigger ("more than 2-3 services to accomplish a use case"). Until then there is no workflow: a use case one service accomplishes start to finish is a service concern.

---

## Guidelines

### 1. No Business Logic in the Workflow

The workflow reads as an ordered list of service calls. If a step does more than call a service and pass its result onward, that logic belongs in a service. The moment a workflow makes a domain decision or transforms an entity, it has stopped being a workflow.

### 2. Services Never Call Each Other

Cross-service coordination goes **up** into the workflow, never sideways between services. A service that imports another service is a smell — the dependency belongs in the workflow. This keeps each service independently testable and unaware of the others.

### 3. Validation Is Thin

A workflow validates only the inputs handed to it — schema parse, plus shared `validation.ts` guards to confirm referenced entities exist — then delegates. It defines no business rules of its own; every domain rule, state check, and invariant lives in the services it calls. See [Validation](./implementation-validation.md).

### 4. One Entry Point

A workflow exposes a single way to drive it. Every consumer — HTTP handler, queue worker, scheduled job — invokes it the same way, just as services are integration-agnostic.

---

## Beyond the Convention

*How* a workflow runs reliably — retries, idempotency, rollback/compensation, resuming a long-running workflow after a crash — is an implementation and runtime concern, not a convention. It belongs to a durable-execution engine or your own job/queue plumbing, chosen per project. This doc covers only how to **structure** a workflow; the runtime handles the rest.

---

## When NOT to Use a Workflow

- **Single-service use case** — one service accomplishes it start to finish. Call the service; there is nothing to orchestrate.
- **Pure linear glue** — a controller calling two services in sequence with no real coordination doesn't need a workflow. Inline it.
- **No multi-service use case yet** — don't build orchestration in anticipation; extract a workflow when the coordination actually exists.

---

## Relationship to Service-First

| Layer | Owns | Knows about |
|---|---|---|
| Controller | HTTP / transport concerns | one workflow or service |
| **Workflow** | sequencing and coordination across services | multiple services |
| Service | business logic for one entity | its own domain only |
| `shared/validation.ts` | shared business-rule guards | the feature's domain |

The workflow sits *between* controllers and services. It is Service-First's facade trigger made concrete: when a use case touches more than 2-3 services, the workflow is the single place that coordinates them.

---

## Anti-Patterns

- **Fat workflow** — business rules creeping into the workflow instead of staying in services.
- **Sideways calls** — services calling each other instead of coordination going up into the workflow.
- **Validation beyond inputs** — a workflow enforcing business rules that belong in a service.
