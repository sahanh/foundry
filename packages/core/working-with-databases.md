# Working with Databases

How the service layer interacts with the database. Infrastructure specifics (table definitions, migrations) are covered in [system/database.md](./system/database.md).

## Core Principle

**Services are the database seam.** There is no repository layer between a service and the database. A service calls the database directly via `ctx.system.db`, and it is the only entry point for data operations on its entity. The Drizzle client reaches the service through AppContext — see [app-context.md](./app-context.md).

A service always uses `ctx.system.db` without knowing whether a transaction is open. When a use case spans multiple writes, they go through a single atomic boundary owned by the outermost caller — `ctx.system.db` then resolves to that transaction. See [atomicity.md](./atomicity.md).

## Feature Ownership

Each table belongs to exactly one feature — a feature can own multiple tables, but a table cannot belong to more than one feature. The services within that feature are the only code that reads from or writes to those tables. This boundary is how business rules stay co-located with the data they govern — bypassing the service to access its tables skips validation, constraint checks, and domain logic.

## Cross-Feature Data Access

If feature A needs something owned by feature B, it never reaches B's tables directly — but *how* it goes through B depends on whether it needs a verdict or data:

- **From a service — a verdict.** When A's own service must assert a rule B owns ("is this user active?"), it calls B's exported **cross-feature guard** from B's `shared/validation.ts`. The guard reads only B's tables, throws B's exception, and returns `void`. A's service never injects B's service (that would break Service-First) and never touches B's tables. See [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).
- **From an orchestration — data.** When B's *entity* must flow into the use case, that use case is multi-service by definition: an [orchestration](./orchestration.md) reaches the data through B's service and either hands it onward or evaluates a **cross-entity invariant** over it — a predicate spanning A's and B's data that no single owner can check (see [orchestration.md → Cross-Entity Invariants](./orchestration.md#cross-entity-invariants)). An orchestration owns no tables of its own, so the single-owner-per-table seam is never widened — it reads each side only through that side's service.

The one thing that never happens either way: A reading or writing B's tables directly. The only legal cross-feature import for domain code is another feature's `shared/validation.ts`.

## Tenant scope

In a **multi-tenant** application, a service still calls `ctx.system.db` exactly as always — and it **never writes a tenant filter and never sets `tenantId` on an insert**. The isolation is applied *at the seam*: `ctx.system.db` is assembled already scoped to `ctx.tenant`, the same way it resolves to the open transaction when a boundary is active. A service is unaware of tenancy the way it is unaware of transactions. There is **no opt-in method to remember** — the base `ctx.system.db` *is* the scoped handle; crossing tenants is the explicit elevated context (see [multi-tenancy.md](./multi-tenancy.md)), never the raw client.

This is **not a repository** — the scoped client is a property of how `ctx.system.db` was assembled, not a layer between the service and the database; the service still owns its writes. Hand-writing `where tenantId = …` is the anti-pattern: the one query that forgets leaks the table, which is exactly why the scope lives at the seam and not the call site. The full convention — the `ctx.tenant` scope, the RLS backstop, the `tenantId` column, and the one sanctioned unscoped path — is in [multi-tenancy.md](./multi-tenancy.md); a single-tenant app has none of it.

## Deletes

**Hard-delete is the default.** A service deletes the row outright via `ctx.system.db` — the row is gone. Do not give an entity a "deleted" flag in anticipation of one day needing it: that is a rung climbed without a signal, and it turns every read into a query that must remember to exclude dead rows — the first one that forgets leaks the whole table.

Soft-delete is a deliberate exception, adopted only on a **real signal** — the entity must be recoverable, held for a legal or retention window, or support undo. When that signal is real:

- The entity gets a nullable **`deletedAt`** tombstone column — `null` means live, a timestamp means deleted. See [system/database.md](./system/database.md) → Table Definitions.
- The delete is a write like any other: stamp `deletedAt` through `ctx.system.helpers` (`softDelete(values)`), so it comes from the injected clock and is controllable in tests — never a hand-written `new Date()`, never a DB default. See [app-context.md](./app-context.md) → Persistence timestamps.
- Because the service is the **sole seam** for its entity, the live-row filter (`deletedAt IS NULL`) lives once, in that service's reads — where the data is owned, not repeated at every call site.

A cross-feature read layer, when it arrives ([concerns.md](../../concerns.md) #14), is the highest-risk place to leak soft-deleted rows *and* another tenant's rows — the one layer that reads tables without going through the owning service or its scoped seam — so both its `deletedAt IS NULL` filter and its tenant scoping are structural obligations, not per-query discipline. It inherits the scoped `ctx.system.db` and RLS ([multi-tenancy.md](./multi-tenancy.md)), never a raw client.

## Anti-Patterns

- **Repository wrapping the database client** — a class that proxies database calls without adding domain logic. The service already provides this abstraction.
- **Cross-feature table access** — a service querying or writing to a table owned by a different feature, bypassing that feature's service and its business rules.
- **Business logic in query construction** — complex conditionals embedded in a database call that should live in the service method or a named decision helper instead.
- **Soft-delete by default** — a `deletedAt` / `isDeleted` column on an entity with no recoverability signal. It buys nothing and turns every read into a filter that leaks the whole table the first time one is forgotten. Hard-delete unless a real signal earns the tombstone.
- **Filtering deleted rows outside the owning service** — repeating `deletedAt IS NULL` at call sites instead of once in the service that owns the table. The filter belongs at the single seam, or it will be missing at one.
- **Hand-written tenant filter** — a service writing `where tenantId = …`, or setting `tenantId` on an insert, in a multi-tenant app. Tenant scoping is applied at the seam (scoped `ctx.system.db` + RLS), never per query. See [multi-tenancy.md](./multi-tenancy.md).
- **Ad-hoc unscoped client** — constructing a db handle without the tenant scope to read across tenants, instead of the sanctioned explicit elevated context. This is the breach, however local it looks.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Database.
