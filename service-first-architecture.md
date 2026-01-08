# Service-First Architecture

A technical strategy for implementing business logic in web applications, influenced by Domain-Driven Design (DDD) principles.

## Core Principle

**The service layer is the heart of the application.** All business logic, workflows, and entity transformations live in service classes—never in controllers or integration layers.

---

## Guidelines

### 1. Thin Controllers

Controllers (or route handlers) are purely integration glue. They handle:

- Request parsing
- Response formatting
- HTTP status codes
- Authentication/authorization checks

Controllers **delegate all business logic** to services. A controller should contain no business rules, calculations, or entity transformations.

### 2. Service Layer as the Core

The service layer is **integration-agnostic**. The same business logic should work whether consumed via:

- REST API
- GraphQL
- Message queue / worker
- CLI tool
- Scheduled job

Build the service layer first, then integrate it with your chosen delivery mechanism.

### 3. Entity-Centric Services

Services are instantiated with domain entities. Methods on a service reflect business operations on that entity.

```
// Example structure
const orderService = new OrderService(order);
orderService.calculateTotal();
orderService.applyDiscount(discountCode);
```

This pattern keeps business operations cohesive and discoverable.

### 4. Lifecycle Management

**Services are lifecycle-agnostic.** A service class does not implement singleton patterns or manage its own instantiation.

- **IOC Container owns lifecycle decisions** — Whether a service is transient, scoped, or singleton is configured at the composition root, not in the service class.
- **No internal singleton logic** — Avoid `getInstance()`, lazy initialization, or similar patterns within services.
- **Static members for shared state** — If data must be shared across instances (e.g., configuration, caches), use static attributes. This is the exception, not the norm.

### 5. Consumer-First Design

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

Ideally, a single service class accomplishes a user use case from start to finish. The integrator might use different methods in different contexts (controller vs worker), but they interact with one service that has all the methods for the workflow.

#### Facade When Needed

Internal complexity is acceptable — many files, deep organization, thorough testing. But the consumer-facing API should be simple.

**Trigger:** If consumers must interact with more than 2-3 services to accomplish a workflow, consider a facade.

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

### 6. Service Decomposition

When a feature involves multiple entities and operations, decompose it into focused services. The design process works backward from the core business value.

#### Design Process: Work Backward from Core Value

1. **Start at the core feature** — Every project begins with the exciting idea. Don't start with "how do we create X?" Start with the end-state: the core business operation the system exists to perform.

2. **Ask "what must exist for this to work?"** — Identify the entities required by the core workflow.

3. **Ask "how does that get set up?"** — For each entity, trace backward to understand how it comes into existence and what operations configure it.

4. **Keep peeling** — Continue asking "what must happen before this?" until you reach the entry point (typically user-initiated creation).

Each layer you uncover becomes a service, scoped to the entity at that level.

#### Service Types

- **Workflow Executor** — Implements the core business operation. This is the reason the system exists.
- **Entity Manager** — Manages operations within a single entity's scope (configuration, relationships, internal structure).
- **Collection Manager** — Manages the lifecycle of entities owned by a parent (create, list, find, delete).

#### Validation: Constructor Injection Test

Once you have candidate services, validate the decomposition by examining constructor dependencies:

**The entity injected via constructor should be used by every method.** If not, it signals misplaced logic:

- **Parameter repetition smell** — If multiple methods need the same entity passed as a parameter (rather than using the constructor-injected one), those methods belong in a service scoped to that entity.
- **Unused dependency smell** — If some methods don't use the constructor-injected entity at all, those methods belong in a different service.

### 7. Folder Organization

Organize code by **feature/domain**, not by technical layer. Everything related to a business capability lives together.

#### Feature-Based Structure

```
/Features
  /OrderProcessing
    OrderExecutor.ts           ← Workflow executor
    /Services
      OrdersManager.ts         ← Collection manager
      SingleOrderManager.ts    ← Entity manager
    /Schemas
      order.schema.ts
      create-order.schema.ts
    /Exceptions
      OrderProcessingException.ts
```

#### Why Not Layer-Based?

Avoid organizing by technical layer across the entire codebase:

```
# Avoid this structure
/Services
  OrdersManager.ts
  UsersManager.ts
  PaymentsManager.ts
/Exceptions
  OrderException.ts
  UserException.ts
/Schemas
  order.schema.ts
  user.schema.ts
```

**Problems with layer-based:**
- Related files are scattered across folders
- Adding a feature means touching many directories
- Hard to see the full picture of a domain

**Benefits of feature-based:**
- All related code is co-located
- Adding a feature means adding one folder
- Easy to understand a domain by looking at one location
- Features can be extracted or moved independently

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Testability** | Services without lifecycle logic are trivial to instantiate with mock dependencies |
| **Flexibility** | Change lifecycle behavior (singleton → scoped) without modifying service code |
| **Reusability** | Same business logic works across multiple integration points |
| **Clarity** | Clear separation—services handle business logic, controllers handle HTTP, containers handle lifecycle |

---

## Anti-Patterns to Avoid

- **Fat controllers** — Business logic embedded in route handlers
- **Singleton services** — Services managing their own instance lifecycle
- **Framework coupling** — Business logic dependent on HTTP framework specifics
- **Scattered business rules** — Logic spread across controllers, middleware, and utilities
