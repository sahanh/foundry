# Service Validation

Validation strategy for the service layer. Services are the authoritative source for business rules and constraints.

## Core Principle

**Services validate everything.** Treat the service layer as a standalone library — it cannot assume anything about how it will be consumed. Every input must be validated against business rules and system constraints.

---

## Why Services Own Validation

1. **Services know the constraints** — Database column limits, business rules, relationship requirements. The service is closest to the domain model and understands what's valid.

2. **Multiple integration points** — The same service may be consumed via API, queue worker, CLI, or scheduled job. Each integration point shouldn't duplicate validation logic.

3. **Defense in depth** — Even if an integration layer validates inputs, the service validates again. External validation is a convenience; service validation is the guarantee.

---

## What Services Validate

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

## Exception Strategy

When validation fails, services throw exceptions that allow integrators to handle errors appropriately. Start simple — two exception types are sufficient for most cases.

### Two Exception Types

#### 1. Input Validation Exception

Thrown when input data fails schema validation (type, format, required fields). This is the first line of defense when data enters a service method.

**Note:** In typed languages with schema libraries (e.g., Zod in TypeScript), the schema library may throw its own validation errors. A dedicated input validation exception may not be needed — the schema library handles it.

#### 2. Domain Exception

A single exception type for all business logic errors within a domain. Name it after the feature or domain:

- `AdvancedRoundRobinException`
- `OrderProcessingException`
- `UserManagementException`

This covers all business rule violations: not found, constraint violations, authorization failures, invalid state, etc.

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

## Validation Flow

```
Input arrives at service method
        ↓
Validate against schema (type, format, required)
        ↓  (failure → Input Validation Exception or schema library error)
Validate business rules (uniqueness, relationships, state)
        ↓  (failure → Domain Exception)
Proceed with operation
```

---

## Anti-Patterns to Avoid

- **Silent failures** — Returning null or false instead of throwing
- **Language-level exceptions only** — Throwing base Exception without domain context
- **Validation in integrators only** — Relying on controllers/CLI to validate
- **Partial validation** — Validating some fields but not others
- **Implicit constraints** — Database errors surfacing instead of explicit validation
- **Over-engineered exceptions** — Creating granular exception types before they're needed
