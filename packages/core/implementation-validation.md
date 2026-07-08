# Validation

Validation strategy for the domain layer: services and orchestrations.

## Core Principle

**The domain layer validates everything**: treat services and orchestrations as a standalone library, assuming nothing about consumers. Every input is validated before use; failures throw the feature's domain exception. Services are primary; an orchestration validates only its own inputs plus any owned [cross-entity invariant](./orchestration.md#cross-entity-invariants).

## Why the Domain Layer Owns Validation

1. **It knows the constraints** — column limits, business rules, relationships.
2. **Multiple integration points** — API, queue worker, CLI, scheduled job consume the same code and must not duplicate validation.
3. **Defense in depth** — edge validation is convenience; the domain's is the guarantee and runs even when the edge already did.

Other docs cite this argument; this is its single home.

## What Gets Validated

- **Data constraints** — types; length limits (column sizes); formats; required vs optional.
- **Business rules** — uniqueness within a scope; referential integrity (parent exists, ownership); cardinality limits (maximums, one-per-type); state validity (allowed now?).
- **Domain semantics** — value validity (e.g. option in allowed list); cross-field consistency.

## Exception Strategy — `exceptions.ts`

Each feature owns one; two kinds of failure cover most cases.

### Input Failures — the Schema Library

Malformed input (wrong type, bad format, missing field) is caught by the schema library (e.g. Zod's `.parse()`) throwing its own error — a dedicated input-validation exception is usually unnecessary. The first line of defense wherever data enters the domain.

### The Domain Exception

`exceptions.ts` holds **one domain exception per feature**, named after it (`OrderProcessingException`), covering all business-rule violations: not found, constraints, authorization, invalid state. Every layer throws, and the integrator catches, the *same* type ([Who Validates What](#who-validates-what)).

**Granular subtypes:** only when an integrator must catch distinctly (e.g. retry vs fail) or multiple services throw the same specific error; start with the single feature exception.

**Exception design:** contextual data (entity IDs, fields, attempted values), a human message, structured programmatic access. The integrator decides presentation — but not ad hoc: both failure sources are *anticipated*; the edge maps them to **one response shape**, a handled `4xx`, **never** a `500`. Strategy: [error-handling.md](../../error-handling.md); HTTP realization: [apps/transport-mapping.md](../../apps/transport-mapping.md). Deferred: per-status mapping (`403`, `404`, `409`) — awaiting a machine-readable failure category on the exception.

## Who Validates What

| Layer | Validates | Throws |
|-------|-----------|--------|
| **Service** | own inputs (schema parse first) **and** all its entity's business rules; shared guards for recurring checks | feature domain exception (+ schema library on bad input) |
| **`shared/validation.ts`** | a single shared business-rule check, reused by ≥2 callers | feature domain exception |
| **Orchestration** | its inputs only — schema parse + guards that referenced entities exist — **plus any owned cross-entity invariant** (never a single-entity rule); then delegates | feature domain exception — via guards, or directly for the invariant (the owning feature's) |

The sequence everywhere: schema parse (→ schema library error), business rules (→ domain exception), proceed; an orchestration's validation is **thin and input-bounded**.

## Shared Validation Helpers

**By default, validation lives in the service owning the operation.** `shared/validation.ts` is the exception: when the *same* check recurs across a feature's services (parent-exists is typical), extract the shared subset on the **second** caller, not in anticipation ([logic-placement.md](./logic-placement.md)). Shared helpers do **not** replace a service's own boundary validation (defense in depth); they are also an orchestration's thin input validation.

**The contract.** A shared helper is a **guard**: it asserts a business rule and **throws the feature's domain exception** on violation; on success it returns nothing meaningful, or the entity it just confirmed. A guard may perform IO (existence, uniqueness) — it asserts and halts rather than computing; the defining trait is the throw.

What belongs there: **referential checks** (parent/owner exists); **uniqueness** within a scope; **relationship/ownership invariants**; **authorization** — the guard reads `ctx.actor` (resolved at the edge) and asserts permission for the operation, e.g. `requireAuthor(ctx, todoId)`; enforced in the domain, not only at the edge (the multi-consumer reason; [identity-and-access.md](./identity-and-access.md)).

### Cross-Feature Guards

A feature's `shared/validation.ts` is its **published contract**: the one thing another feature's domain code may import. When feature A must assert a rule B owns ("is this user active?"), B *exports* the guard and A calls it; nothing else of B's crosses — not tables, not services.

Here the contract **tightens**: a within-feature guard may return the confirmed entity, but a **cross-feature guard returns `void`** — it reads only its owner's tables (through the passed `ctx`) and throws its owner's domain exception. The *verdict* crosses; the *data* does not. The `void` return is the enforcement — nothing can be smuggled through it; a signature returning an entity is the **guard-as-read-API** drift, visible in one line.

Routing:

- **A needs B's _verdict_** (a yes/no about B's state) → B exports a guard; A calls it and stays a service.
- **A needs B's _data_** — B's entity fields flow into A's logic → genuinely multi-service; promote to an [orchestration](./orchestration.md).
- **The rule spans _both_ owners** — a predicate over A's *and* B's data together → a [cross-entity invariant](./orchestration.md#cross-entity-invariants) in an orchestration.

**Reuse threshold.** The second-caller rule is *within*-feature; a cross-feature guard is a boundary contract, in the owner's `shared/validation.ts` from the **first** cross-feature caller. Canonical: `requireActiveUser` / `requireAuthor` are **user**-feature exports called by todo and comment services, never a todo guard reaching into the users table; the same guards serve `ctx.actor` authorization verdicts, contract unchanged.

**Keep the feature dependency graph acyclic** — guard exports point one direction (`todo` depends on `user`, never the reverse); a cycle means two features are really one.

## Anti-Patterns to Avoid

- **Silent failures** — returning null/false instead of throwing.
- **Language-level exceptions only** — base Exception without domain context.
- **Partial validation** — some fields validated, others not.
- **Implicit constraints** — database errors surfacing instead of explicit validation.
- **Foreign guard, local exception** — re-wrapping another feature's guard exception; the owner's propagates unchanged.

(Integrator-only validation, premature subtypes, single-entity rules in an orchestration, guard-as-read-API — covered above.)

---

**Verify:** when done, check [end-here.md](./end-here.md) → Validation & exceptions.
