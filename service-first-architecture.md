# Service-First Architecture

How to design and write the `services/` submodule of a feature. Influenced by Domain-Driven Design (DDD).

> **Scope:** this doc covers services — one entity, one service, the business logic for it. For overarching architecture (layering, thin controllers), folder layout, and the feature-design process, see start-here.md. For coordinating multiple services, see workflow-orchestration.md.

## Core Principle

**A service owns the business logic for its entity.** All business rules, calculations, and entity transformations for a domain entity live in its service — not in controllers or integration code. Multi-service coordination is a separate concern (workflows); a service stays focused on its own entity.

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

**Services are lifecycle-agnostic.** A service does not instantiate itself or decide how long it lives. Dependencies are wired *externally* — by a container, a factory, or an injected context (the reference implementation passes an `AppContext`). The service is constructed with what it needs and stays unaware of how.

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

**Trigger:** If consumers must interact with more than 2-3 services to accomplish a use case, consider a facade — or a workflow (see workflow-orchestration.md) when the use case spans multiple services.

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

### 4. Service Decomposition

When a feature involves multiple entities, the feature-design process (start-here.md) gives you a set of entities, each scoped to a layer you uncovered working backward from core value. Classify each resulting service and validate the decomposition.

#### Service Types

- **Operation Executor** — Implements the core business operation. This is the reason the system exists.
- **Entity Manager** — Manages operations within a single entity's scope (configuration, relationships, internal structure).
- **Collection Manager** — Manages the lifecycle of entities owned by a parent (create, list, find, delete).

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
