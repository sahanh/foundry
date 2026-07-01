# Service-First Architecture

How to design and write the `services/` submodule of a feature. Influenced by Domain-Driven Design (DDD).

> **Scope:** this doc covers services — one entity, one service, the business logic for it. For overarching architecture (layering, thin controllers), folder layout, and the feature-design process, see start-here.md. For coordinating multiple services, see orchestration.md — an orchestration is a service-shaped type that is the only domain unit allowed to inject and coordinate several services.

## Core Principle

**A service owns the business logic for its entity.** All business rules, calculations, and entity transformations for a domain entity live in its service — not in controllers or integration code. Multi-service coordination is a separate concern (orchestrations); a service stays focused on its own entity and never injects or calls another service.

---

## Guidelines

### 1. Entity-Centric Services

Services are instantiated with domain entities. Methods on a service reflect business operations on that entity.

```
// Example structure
const orderService = new OrderService(order);
orderService.calculateTotal();
orderService.applyDiscount(discountCode);
```

This pattern keeps business operations cohesive and discoverable.

### 2. Lifecycle Management

**Services are lifecycle-agnostic.** A service does not instantiate itself or decide how long it lives. Dependencies are wired *externally* — by a container, a factory, or an injected context. Every service receives an `AppContext` alongside its domain entity, giving it access to all system-layer infrastructure (db, logger, email, queue) through `ctx.system`. See [app-context.md](./app-context.md).

- **No self-instantiation** — avoid `getInstance()`, lazy singletons, or similar patterns inside a service.
- **No global state** — don't reach for module-level singletons or globals; take dependencies through the constructor.
- **Shared state is the exception** — if something genuinely must be shared (config, a cache), make it an explicit injected dependency rather than a hidden global.

### 3. Consumer-First Design

Before implementing services, design how they will be consumed.

#### Write Usage First

Write pseudo-code showing how a developer will use your services:
- What services do they instantiate?
- What methods do they call?
- What arguments do they pass?

Evaluate the experience:
- Do service names communicate purpose?
- Do method names describe the operation?
- Do arguments feel natural?

#### One Service, One Use Case

Ideally, a single service class accomplishes a user use case from start to finish. The integrator might use different methods in different contexts (controller vs worker), but they interact with one service that has all the methods for the use case.

#### Facade When Needed

Internal complexity is acceptable — many files, deep organization, thorough testing. But the consumer-facing API should be simple.

**Trigger:** If consumers must interact with more than 2-3 services to accomplish a use case, consider a facade — or an orchestration (see orchestration.md) when the use case spans multiple services.

#### When NOT to Extract

Not every entity needs its own service. Extract only when:
- It improves the consumer experience
- The logic is substantial enough to warrant isolation

Keep logic consolidated when extraction adds ceremony without improving usability.

#### Architecture Checklist

Use this checklist when designing service architecture:

- [ ] Can a single service accomplish the use case start to finish?
- [ ] Do service/method names communicate purpose clearly?
- [ ] Do arguments feel natural to the consumer?
- [ ] Is the number of services the consumer interacts with ≤ 2-3?
- [ ] Does extracting a new service improve consumer experience?
- [ ] Is the constructor-injected entity used by every method?

### 4. Decide Domain Boundaries First

> **Important.** Before any code is written, ask: based on the requirements, what are the feature boundaries and how should the services be structured?
>
> This is not a question to answer alone. Present the proposed structure to the user and get explicit confirmation before implementation begins. The answer shapes folder names, service names, and what gets tested together — changing it mid-implementation is expensive.

The confirmation is a concise feature-and-service list. One line per feature, services named by their role. No file paths, no folder diagrams — just enough for the user to confirm the breakdown is right:

```
Feature: todo
Services: TodoService, TodoCollectionService, TodoCommentService, TodoCommentCollectionService
```

#### The boundary question

For each related entity or behaviour, ask: does this belong inside the current feature, or does it earn its own feature folder?

The default is to keep related behaviour together until there is a clear reason to extract — a second feature that needs to share it, a team boundary, or scope large enough that it obscures the host feature. Extract as a refactor, not in anticipation.

**Example — todo with comments:**

Comments could live as `TodoCommentService` / `TodoCommentCollectionService` inside the `todo` feature, or as a standalone `comment` feature. The right call depends on whether comments are ever needed outside the context of a todo. If not, keep them inside `todo`. If they are (or grow to be), extract then.

Get user confirmation on this call before the first file is created.

### 5. Service Decomposition

When a feature involves multiple entities, the feature-design process (start-here.md) gives you a set of entities, each scoped to a layer you uncovered working backward from core value. Classify each resulting service and validate the decomposition.

#### Service Types and Naming

Decide the service's role first, then name it. Premature naming locks in a scope assumption before the responsibility is clear.

- **Operation Executor** — Implements the core business operation. This is the reason the system exists.
- **Entity Manager** — Manages operations within a single entity's scope (configuration, relationships, internal structure).
- **Collection Manager** — Manages the lifecycle of entities owned by a parent (create, list, find, delete).

Service names follow directly from the role. The naming pattern is consistent across all levels of the feature hierarchy:

| Role | Pattern | Example |
|---|---|---|
| Single-entity operations | `{Entity}Service` | `TodoService` |
| Collection / bulk operations | `{Entity}CollectionService` | `TodoCollectionService` |
| Single sub-entity operations | `{Parent}{Child}Service` | `TodoCommentService` |
| Sub-entity collection / bulk | `{Parent}{Child}CollectionService` | `TodoCommentCollectionService` |

A collection service may depend on its single-entity counterpart for per-entity logic — that dependency goes in one direction only (collection → single, never the reverse).

#### Validation: Constructor Injection Test

Once you have candidate services, validate the decomposition by examining constructor dependencies:

**The entity injected via constructor should be used by every method.** If not, it signals misplaced logic:

- **Parameter repetition smell** — If multiple methods need the same entity passed as a parameter (rather than using the constructor-injected one), those methods belong in a service scoped to that entity.
- **Unused dependency smell** — If some methods don't use the constructor-injected entity at all, those methods belong in a different service.

#### Granularity Scales with Scope

The same feature spans a range of granularity, sized to its scope. A todo feature, for example:

- **Simple** — one `TodoService` owns todo CRUD, comments, and attachments.
- **Grown** — comments earn `TodoCommentsService` once the constructor-injection smell appears (comment methods aren't really operating on the todo).
- **Complex** — a cluster (activity = comments + status changes + attachments) graduates into a nested sub-feature folder `activity/` with its own services (`ActivityCommentsService`, `ActivityAttachmentService`).

**The ladder:** inline in one service → its own service → nested sub-feature folder. Climb one rung at a time. Folder nesting mirrors the ownership tree the feature-design process produces (`todo ⊃ activity ⊃ comment/attachment`).

**Timing — on the second signal, not upfront.** A sub-feature folder shouldn't exist until a *second* member appears (e.g. status changes joining comments under "activity"); before that it's speculative — extract as a refactor, not in anticipation (see [Named Decisions](./named-decisions.md)). The two bounds hold together: don't split too early (When NOT to Extract), and don't leave it coarse once it has grown.

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Testability** | Services without lifecycle logic are trivial to instantiate with mock dependencies |
| **Flexibility** | Change how a service is wired (singleton → per-request) without modifying service code |
| **Reusability** | The same business logic works across multiple integration points |

---

## Anti-Patterns to Avoid

- **Singleton services** — Services managing their own instance lifecycle
- **Framework coupling** — Business logic dependent on HTTP framework specifics
- **Self-instantiation** — A service reaching for globals or `getInstance()` instead of taking dependencies through its constructor

---

**Verify:** when done, check [end-here.md](./end-here.md) → Services.
