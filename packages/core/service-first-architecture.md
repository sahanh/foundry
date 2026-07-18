# Service-First Architecture

How to design and write the `services/` submodule of a feature.

> **Scope:** services — one entity, one service, its business logic. Layering, folder layout, feature-design process: start-here.md. Coordinating multiple services: [orchestration.md](./orchestration.md).

## Core Principle

**A service owns the business logic for its entity** — every rule, calculation, and transformation, never in controllers or integration code. A service never injects or calls another service; multi-service coordination goes up into an orchestration. (Another feature's exported guard is not a service call — [Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).)

---

## Guidelines

### 1. Entity-Centric Services

Services are instantiated with their domain entity — `new OrderService(order)` — and their methods are the business operations on it. One entity is the common shape, not a ceiling (*The Constructor Declares the Scope*).

### 2. Lifecycle Management

**Services are lifecycle-agnostic** — a service never decides its own lifetime; dependencies are wired externally. Every service receives an `AppContext` alongside its entity; system infrastructure (db, logger, email, queue) via `ctx.system` ([app-context.md](./app-context.md)).

- **No self-instantiation** — no `getInstance()` or lazy singletons.
- **No global state** — dependencies through the constructor; anything genuinely shared (config, a cache) is an explicit injected dependency.
- **No framework coupling** — business logic never depends on HTTP-framework specifics.

### 3. Consumer-First Design

Before implementing, **write pseudo-code showing how a developer uses the services** — what they instantiate, call, and pass; check names communicate purpose, arguments feel natural.

- **One service, one use case** — ideally one service accomplishes a use case start to finish; integrators (controller vs worker) may call different methods — on one service.
- **Facade when needed** — internal complexity is fine; the consumer API stays simple. >2-3 services per use case → a facade; spans services → an [orchestration](./orchestration.md). Method names across the wrapper seam: [orchestration.md → Naming](./orchestration.md#naming).
- **When NOT to extract** — extract only for consumer experience or genuine isolation, never for ceremony.
- **Drop words the receiver implies** — `inboxTasks()`, never `inboxWaitingTasks()`: being in an inbox *means* waiting. The converse holds: keep a discriminator the receiver *doesn't* imply — `listWaitingForHumanTasks()` on a task read is not redundant when tasks can wait on several things. Redundancy is relative to the receiver: a method name states what the call adds, never the invariant its subject already carries.

### 4. Decide Domain Boundaries First

> Before any code, decide feature boundaries and service structure from the requirements — and **present the proposal to the user for explicit confirmation before implementation begins** (why: changing mid-implementation is expensive).

The confirmation: a concise feature-and-service list — one line per feature, services named by role, no file paths or folder diagrams:

```
Feature: todo
Services: TodoService, TodoCollectionService, TodoCommentService, TodoCommentCollectionService
```

**The boundary question.** Per related entity/behaviour: current feature or its own folder? Keep together until a clear signal — a second feature sharing it, a team boundary, scope obscuring the host — extract as a refactor, not in anticipation ([logic-placement.md](./logic-placement.md)). Example: comments stay `TodoCommentService` inside `todo` until needed outside a todo's context. Confirm this call with the user before the first file.

### 5. Service Decomposition

For each entity (start-here.md), decide the service's **role first, then name it** — premature naming locks in a scope assumption:

- **Operation Executor** — the system's core business operation.
- **Entity Manager** — operations within one entity's scope (configuration, relationships, structure).
- **Collection Manager** — lifecycle of entities owned by a parent (create, list, find, delete).

Names follow the role at every level:

| Role | Pattern | Example |
|---|---|---|
| Single-entity operations | `{Entity}Service` | `TodoService` |
| Collection / bulk operations | `{Entity}CollectionService` | `TodoCollectionService` |
| Single sub-entity operations | `{Parent}{Child}Service` | `TodoCommentService` |
| Sub-entity collection / bulk | `{Parent}{Child}CollectionService` | `TodoCommentCollectionService` |

A collection service may depend on its single-entity counterpart — one direction only, never the reverse.

#### Validation: The Constructor Declares the Scope

No constructor shape is prescribed; the principle is **high cohesion**: the constructor declares the domain scope the methods collectively operate on — inject exactly that, nothing more. The scope may be one entity (the **common case, not a law**), several (`new TodoCommentAnalysisService(todo, comment, ctx)` is cohesive if every method uses both), or nothing beyond `ctx` (a collection service's scope is what its methods share).

Two smells read off it — cohesion failures, not entity-count violations:

- **Unused dependency** — some methods never touch it: they belong elsewhere, or it shouldn't be injected.
- **Parameter repetition** — an object passed to method after method wants injection: those methods share a scope the constructor should declare.

#### Granularity Scales with Scope

**The ladder: inline in one service → its own service → nested sub-feature folder.** A todo feature: simple — one `TodoService` owns CRUD, comments, attachments; grown — comments earn `TodoCommentsService` on the cohesion smell; complex — a cluster (activity = comments + status changes + attachments) graduates to a nested `activity/` folder. Climb one rung at a time, **on the second signal, not upfront** — a sub-feature folder exists only once a *second* member appears, as a refactor ([branching-logic.md](./branching-logic.md)). Both bounds: don't split early, don't leave it coarse once grown. Folder nesting mirrors the feature-design ownership tree (`todo ⊃ activity ⊃ comment/attachment`).

---

**Verify:** when done, check [end-here.md](./end-here.md) → Services.
