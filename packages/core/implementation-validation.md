# Validation

Validation strategy for the domain layer — services and orchestrations. Services are the primary site (they own business logic); orchestrations validate thinly.

## Core Principle

**The domain layer validates everything.** Treat services and orchestrations as a standalone library — they cannot assume anything about how they will be consumed. Every input is validated against business rules and system constraints before use, and failures throw the feature's domain exception.

- **Services are primary** — they own the business logic, so the bulk of validation lives there.
- **Orchestrations are thin** — a orchestration validates only the inputs handed to it (via shared guards); everything beyond input validity belongs to the services it calls.

---

## Why the Domain Layer Owns Validation

1. **It knows the constraints** — Database column limits, business rules, relationship requirements. The domain layer is closest to the model and understands what's valid.

2. **Multiple integration points** — The same service or orchestration may be consumed via API, queue worker, CLI, or scheduled job. Each integration point shouldn't duplicate validation logic.

3. **Defense in depth** — Even if an integration layer validates inputs, the domain layer validates again. External validation is a convenience; domain-layer validation is the guarantee.

---

## What Gets Validated

### Data Constraints

- **Type correctness** — Expected types (string, array, integer)
- **Length limits** — Based on storage constraints (database column sizes)
- **Format requirements** — Patterns, allowed characters
- **Required vs optional** — Presence of mandatory fields

### Business Rules

- **Uniqueness** — Names, identifiers within a scope
- **Referential integrity** — Entity relationships (does the parent exist? does this belong to that?)
- **Cardinality limits** — Maximum items, one-per-type restrictions
- **State validity** — Is this operation allowed in the current state?

### Domain Semantics

- **Value validity** — Is this value meaningful in the domain? (e.g., selected option exists in allowed list)
- **Cross-field consistency** — Do related fields make sense together?

---

## Exception Strategy — `exceptions.ts`

When validation fails, the domain layer throws exceptions that let integrators handle errors appropriately. Each feature owns an `exceptions.ts`. Start simple — two kinds of failure cover most cases.

### Input Failures — the Schema Library

Malformed input (wrong type, bad format, missing required field) is caught at the boundary by the schema library (e.g. Zod's `.parse()`). A dedicated input-validation exception is usually unnecessary — the schema library throws its own. This is the first line of defense wherever data enters a service or orchestration.

### The Domain Exception

`exceptions.ts` holds **one domain exception per feature**, named after the feature:

- `AdvancedRoundRobinException`
- `OrderProcessingException`
- `UserManagementException`

It covers all business-rule violations within the feature: not found, constraint violations, authorization failures, invalid state, etc.

**Who throws it** — every layer in the feature throws the *same* feature exception:

- **Services** — on any business-rule violation in their own logic.
- **`shared/validation.ts` guards** — when a shared check fails (see Shared Validation Helpers).
- **Orchestrations** — only *via* those shared guards, as part of their thin input validation. A orchestration does not raise business-rule failures of its own.

Because it's one exception per feature, a guard, a service, and a orchestration all throw (and an integrator catches) the same type.

### When to Add Granular Exceptions

Start with a single domain exception. Only introduce specific subtypes when there's a clear need:

- An integrator needs to catch and handle a specific error differently
- The error requires distinct recovery logic (e.g., retry vs fail)
- Multiple services need to throw the same specific error type

Example progression:
```
AdvancedRoundRobinException          ← Start here
    ↓ (when needed)
AdvancedRoundRobinGroupNotFoundException   ← Add when specific handling required
```

### Exception Design

Exceptions should include:

- **Contextual data** — IDs of entities involved, field names, attempted values
- **Human message** — Default message for logging/debugging
- **Structured access** — Programmatic access to context for integrators

The integrator catches the exception and decides presentation: JSON error response, CLI alert, queue retry, or logging.

---

## Who Validates What

| Layer | Validates | Throws |
|-------|-----------|--------|
| **Service** | its own inputs (schema parse) **and** all business rules for its entity (uniqueness, relationships, state); calls shared guards for recurring checks | feature domain exception (+ schema library on bad input) |
| **`shared/validation.ts`** | a single shared business-rule check, reused by ≥2 callers | feature domain exception |
| **Orchestration** | **only the inputs handed to it** — schema parse + shared guards to confirm referenced entities exist; then delegates | feature domain exception, only via the shared guards |

The rule: a orchestration's validation is **thin and input-bounded**. Anything past "are my inputs well-formed and do the referenced entities exist?" is the job of the services it calls.

## Validation Flow

Service — owns the full flow:

```
Input arrives at service method
        ↓
Validate against schema (type, format, required)
        ↓  (failure → schema library error)
Validate business rules (uniqueness, relationships, state)
        ↓  (failure → domain exception)
Proceed with operation
```

Orchestration — thin, then delegate:

```
Inputs arrive at orchestration
        ↓
Validate against schema (type, format, required)
        ↓  (failure → schema library error)
Shared guards: referenced entities exist
        ↓  (failure → domain exception)
Call services in sequence  ← each service validates its own business rules
```

---

## Shared Validation Helpers

**By default, validation lives inside the service that owns the operation** — that is the rule. This layer is the exception: when the *same* business-rule check keeps recurring across a feature's services (a parent-exists check written in several of the feature's own services is the typical case), extract that shared subset into `shared/validation.ts` so it lives in one place. The shared module is for de-duplicating recurring domain validation, not the default home for validation.

### The Contract

A shared validation helper is a **guard**: it asserts a business rule and **throws a domain exception** (from the feature's `exceptions.ts`) when the rule is violated. On success it returns nothing meaningful, or returns the entity it just confirmed exists.

A guard **may perform IO** — it commonly checks existence or uniqueness against a store. This is what distinguishes it from a pure helper: it asserts and halts rather than computing and returning. The defining trait is the throw.

### What Belongs There

- **Referential checks** — "the referenced parent/owner exists" (e.g. a guard confirming a parent record exists before a child is attached).
- **Uniqueness** — a name or identifier is unique within its scope.
- **Relationship / ownership invariants** — this entity belongs to that parent; this operation is allowed for this owner.

Only the checks **reused by two or more** services/orchestrations belong here. A check used by exactly one service stays inline in that service — extract it on the *second* caller, not in anticipation. This mirrors the playbook's "extract as a refactor, not upfront" stance.

### Cross-Feature Guards

A feature's `shared/validation.ts` is also its **published contract**: those guards are the one thing another feature's domain code may import from it. When feature A must assert a rule that feature B owns — a todo service checking "is this user active?" — B *exports* the guard and A calls it. Nothing else of B's crosses the boundary: not its tables, not its services.

This is where the guard contract **tightens**. A guard used only *within* its own feature keeps the full contract above — it may return the entity it just confirmed. A **cross-feature guard returns `void`**: it asserts and throws, and hands nothing back. It reads only its owner's tables (through the `ctx` passed in) and throws its owner's domain exception. The *verdict* crosses the boundary; the *data* does not.

The routing rule follows directly:

- **A needs B's _verdict_** — a yes/no about B's state → B exports a cross-feature guard; A calls it and stays a service.
- **A needs B's _data_** — a field of B's entity flows into A's own logic → that is genuinely multi-service; promote to an [orchestration](./orchestration.md), the one unit allowed to inject both services. A guard is the wrong tool here — the moment you want it to *return* B's entity, it is no longer a guard.

The `void` return is what keeps the two apart: you cannot smuggle data through a guard that hands nothing back, so a check can never quietly decay into a read. A cross-feature guard whose signature returns an entity is the **guard-as-read-API** drift — and it is visible in one line.

This is the Domain Service from Domain-Driven Design — a named, stateless domain operation owned by one model — constrained to a published, verdict-only shape, the same boundary a modular monolith draws with a module's public API.

**Reuse threshold.** The "extract on the second caller" rule above is about de-duplicating a check *within* a feature. A cross-feature guard is different: it is a boundary contract, so it lives in the owner's `shared/validation.ts` from the **first** cross-feature caller — there is no other legal place for the crossing to happen. The canonical author-existence check (`requireAuthor` / `requireActiveUser`) is therefore a guard the **user** feature exports from `user/shared/validation.ts`, called by the todo and comment services — not a todo-feature guard reaching into the users table.

**Keep the feature dependency graph acyclic.** Exporting guards makes one feature depend on another's contract; let those dependencies point one direction (a `todo` feature depending on `user`, not the reverse). A cycle of cross-feature guards is a sign two features are really one.

### Relationship to In-Service Validation

Shared helpers do **not** replace a service's own boundary validation. A service still validates its input at the boundary (schema parse, then its own rules) — defense in depth, per the Validation Flow above. `shared/validation.ts` holds the *shared subset* of business rules so they live in one place, not a substitute for each service validating its own inputs.

These guards are also what a **orchestration** uses for its thin input validation — confirming referenced entities exist before delegating to services.

---

## Anti-Patterns to Avoid

- **Silent failures** — Returning null or false instead of throwing
- **Language-level exceptions only** — Throwing base Exception without domain context
- **Validation in integrators only** — Relying on controllers/CLI to validate
- **Partial validation** — Validating some fields but not others
- **Implicit constraints** — Database errors surfacing instead of explicit validation
- **Over-engineered exceptions** — Creating granular exception types before they're needed
- **Business rules in a orchestration** — Validation beyond input/existence checks that belongs in a service
- **Guard as read API** — A cross-feature guard that returns an entity instead of `void`, letting the caller read another feature's data through what is nominally a check
- **Foreign guard, local exception** — A caller catching another feature's guard exception only to re-wrap it in its own; the owner's exception should propagate unchanged

---

**Verify:** when done, check [end-here.md](./end-here.md) → Validation & exceptions.
