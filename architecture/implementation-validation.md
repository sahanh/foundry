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

**By default, validation lives inside the service that owns the operation** — that is the rule. This layer is the exception: when the *same* business-rule check keeps recurring across services (the author-existence check we kept writing in every todo/comment service is the canonical example), extract that shared subset into `shared/validation.ts` so it lives in one place. The shared module is for de-duplicating recurring domain validation, not the default home for validation.

### The Contract

A shared validation helper is a **guard**: it asserts a business rule and **throws a domain exception** (from the feature's `exceptions.ts`) when the rule is violated. On success it returns nothing meaningful, or returns the entity it just confirmed exists.

A guard **may perform IO** — it commonly checks existence or uniqueness against a store. This is what distinguishes it from a pure helper: it asserts and halts rather than computing and returning. The defining trait is the throw.

### What Belongs There

- **Referential checks** — "the referenced user/parent/owner exists" (e.g. `requireAuthor`).
- **Uniqueness** — a name or identifier is unique within its scope.
- **Relationship / ownership invariants** — this entity belongs to that parent; this operation is allowed for this owner.

Only the checks **reused by two or more** services/orchestrations belong here. A check used by exactly one service stays inline in that service — extract it on the *second* caller, not in anticipation. This mirrors the playbook's "extract as a refactor, not upfront" stance.

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
