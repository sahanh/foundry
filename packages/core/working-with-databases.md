# Working with Databases

How the service layer interacts with the database. Column and migration mechanics are in [system/database.md](./system/database.md).

## Core Principle

**Services are the database seam.** No repository layer — a class proxying database calls without adding domain logic adds nothing the service doesn't already provide. A service calls the database directly via `ctx.system.db` (reached through [AppContext](./app-context.md)) and is the only entry point for data operations on its entity. Keep business logic out of query construction: complex conditionals belong in the service method or a named decision helper, not embedded in a database call.

A service uses `ctx.system.db` without knowing whether a transaction is open: multi-write use cases go through a single atomic boundary owned by the outermost caller, and `ctx.system.db` then resolves to that transaction. See [atomicity.md](./atomicity.md).

## Feature Ownership

Each table belongs to exactly one feature — a feature can own multiple tables; a table never has two owners. Only that feature's services read or write those tables: bypassing the service skips validation, constraint checks, and domain logic.

## Cross-Feature Data Access

Feature A never reads or writes B's tables directly. How it goes through B depends on what it needs:

- **From a service — a verdict.** When A's service must assert a rule B owns ("is this user active?"), it calls B's exported **cross-feature guard** from B's `shared/validation.ts` — reads only B's tables, throws B's exception, returns `void`. A's service never injects B's service (that breaks Service-First). See [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).
- **From an orchestration — data.** When B's *entity* must flow into the use case, it is multi-service by definition: an [orchestration](./orchestration.md) reaches the data through B's service and hands it onward or evaluates a **cross-entity invariant** over it — a predicate spanning A's and B's data that no single owner can check ([orchestration.md → Cross-Entity Invariants](./orchestration.md#cross-entity-invariants)). An orchestration owns no tables, so single-owner-per-table is never widened.

The only legal cross-feature import for domain code is another feature's `shared/validation.ts`.

## Tenant scope

In a **multi-tenant** app, isolation is applied at the seam: `ctx.system.db` is assembled already scoped to `ctx.tenant` (the same way it resolves to an open transaction), so a service **never hand-writes `where tenantId = …` and never sets `tenantId` on an insert** — the one query that forgets leaks the table. Not a repository (a property of the handle's assembly, not a layer; the service still owns its writes) and no opt-in to remember: the base handle *is* the scoped one, and crossing tenants goes only through the explicit elevated context — an ad-hoc unscoped client is the breach, however local it looks. Full convention (`ctx.tenant`, the tenant column, the one sanctioned unscoped path): [multi-tenancy.md](./multi-tenancy.md). A single-tenant app has none of it.

## Deletes

**Hard-delete is the default.** The service deletes the row outright via `ctx.system.db`. Never add a "deleted" flag in anticipation — a rung climbed without a signal: it buys nothing and turns every read into a filter that leaks the whole table the first time one is forgotten.

**Soft-delete is a deliberate exception**, adopted only on a **real signal** — the entity must be recoverable, held for a legal or retention window, or support undo. When the signal is real:

- Nullable **`deletedAt`** tombstone — `null` means live, a timestamp means deleted. Column definition: [system/database.md → Table Definitions](./system/database.md#table-definitions).
- The delete is a write like any other: stamp `deletedAt` through `ctx.system.helpers` (`softDelete(values)`) — injected clock, controllable in tests — never a hand-written `new Date()`, never a DB default. See [app-context.md](./app-context.md) → Persistence timestamps.
- The live-row filter (`deletedAt IS NULL`) lives **once, in the owning service's reads** — never repeated at call sites. The filter belongs at the single seam, or it will be missing at one.

A future cross-feature read layer ([concerns.md](../../concerns.md) #14) is the highest-risk place to leak soft-deleted rows *and* another tenant's rows — it reads tables without the owning service or its scoped seam — so its `deletedAt IS NULL` filter and tenant scoping are structural obligations, not per-query discipline; it inherits the scoped `ctx.system.db` ([multi-tenancy.md](./multi-tenancy.md)), never a raw client.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Database.
