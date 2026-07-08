# AppContext

AppContext is the single injected dependency for all cross-cutting infrastructure: services and orchestrations receive it via constructor and reach system adapters (db, logger, email, queue) only through it.

## Structure

```
AppContext
  traceId       — UUID identifying the current operation (see system/logging.md)
  actor         — who/what is performing this operation; a tagged union over principal types,
                  resolved at the edge (see Actor & Tenant below · identity-and-access.md)
  tenant        — which isolation boundary this operation runs within; present only in a
                  multi-tenant app, resolved at the edge (see Actor & Tenant below · multi-tenancy.md)
  transaction   — opens an atomic boundary (see atomicity.md)
  system
    db          — Drizzle client (see working-with-databases.md)
    logger      — logging adapter, required (see system/logging.md)
    clock       — injectable now-source (see The Clock below)
    helpers     — runtime utilities sourced from an injected seam: timestamps (clock) + newId
                  (id-source) (see Helpers below)
```

`traceId`, `actor`, and (multi-tenant only) `tenant` are top-level operation metadata; `system.*` holds only what the domain calls *out* to. New adapters go under `system` — the domain never imports one directly.

## The Context Is a Statement of Fact

Every field is an **established fact, never a pending claim**: the actor verified (a `user` **exists**), the tenant resolved and the actor's own. The domain reads it as evidence — never input to verify or a state to bring about. Corollaries:

1. **No operation establishes its own preconditions.** Making a fact true — a user existing, a workspace provisioned, a referent present — is its own use case with its own trigger, never a side effect of context assembly or another operation (no writing context binder, no en-route user creation). Reject at the edge or throw the feature exception; first application: [identity-and-access.md](./identity-and-access.md) → *Identity lifecycle*.
2. **Contexts are assembled at the edge**, where facts are known — the domain receives contexts, never assembles one (*Wiring* below).

## Constructor Injection

A service receives `ctx` alongside its domain scope — `new TodoService(todo, ctx)`; scope rules: [service-first-architecture.md → Validation: The Constructor Declares the Scope](./service-first-architecture.md).

Module-level db/logger imports are hidden globals, prohibited like all singletons (why: testability, explicitness, replaceability).

## Wiring

The context factory is invoked at exactly two sites: **a driving adapter (`apps/`) and test setup**. Nothing in `packages/core` invokes it, derives its own, or reaches a global. Grep enforcement: a factory call in core outside `system/` (its definition) and `__tests__/` fails review.

Assembly is **read-only** — resolving actor and tenant performs lookups at most, never writes ([identity-and-access.md](./identity-and-access.md) → *Identity lifecycle*).

The `AppContext` **type**, the factory, and the generic `ctx.transaction` are `system/` foundational primitives defined once ([system/start-here.md](./system/start-here.md)); only the concrete instance — real vs test adapters — is assembled at the edge.

## Transaction Boundary

`ctx.transaction` opens an atomic, all-or-nothing boundary:

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();
  await new InventoryService(item, txCtx).reserve();
}); // commit on return · rollback on any throw
```

It wraps `ctx.system.db.transaction`, deriving a context whose `system.db` *is* the transaction handle; a service given `txCtx` writes on it unaware — it just calls `ctx.system.db`. A nested `ctx.transaction` joins the open one. Boundary ownership, post-commit side effects, span limits: [atomicity.md](./atomicity.md). When `ctx.tenant` is present the same factory derives the tenant-scoped `system.db` — no db session variable ([multi-tenancy.md](./multi-tenancy.md) → *Isolation is enforced at the database seam*).

## Actor & Tenant — `ctx.actor` / `ctx.tenant`

`ctx.actor` = *who/what* performs the operation; `ctx.tenant` = *which isolation boundary* it runs within. This section owns field mechanics; the owning docs own meaning.

- **Top-level metadata** beside `traceId`, never under `system.*`.
- **Edge-resolved, read-only.** Set by the driving adapter during assembly, before any service runs; a service reads them — never sets, overrides, or threads them through constructor/method parameters (the **parameter-repetition smell**: anything passed the same way every call belongs on `ctx`).
- **Direct-import primitive types** from `system/` (type position, no `ctx` — *Injectable helper vs direct import* below), carrying no business rules.
- **Actor: always present** — a total tagged union; unauthenticated is an explicit member, never `undefined`. Authorization guards decide against `ctx.actor`. Members, discriminant, authN/authZ: [identity-and-access.md](./identity-and-access.md) → *The Actor*.
- **Tenant: multi-tenant apps only** — a single-tenant app has no `ctx.tenant`, no ceremony. When present, `ctx.system.db` is assembled **already tenant-scoped** — no `where tenantId` to write, forget, or forge. Shape, derivation, unscoped path: [multi-tenancy.md](./multi-tenancy.md).

## The Clock — `ctx.system.clock`

Time enters the domain only through `ctx.system.clock.now()` — never scattered `new Date()`. `now(): Date` is an **absolute instant**. Production defaults to `() => new Date()`; tests pin a fixed instant (why: assertable timestamps). Injected clock, not `vi.setSystemTime` (why: parallel-test safety).

**No timezone in the domain.** Timezone conversion is presentation, owned by the edge ([transport-mapping.md](../../apps/transport-mapping.md)).

## Helpers — `ctx.system.helpers`

Runtime utilities over an injected seam (clock, id-source), so tests control their output. **No domain logic** — not a junk drawer. Placement: *Injectable helper vs direct import* below.

### Persistence timestamps

A column default can't reach the injected clock, so the **service stamps explicitly** via a clock-backed helper (not a repository: the service still owns the write, calling `ctx.system.db` directly). Three **pure**, type-preserving methods:

- `timestamps(values)` → `{ ...values, createdAt, updatedAt }` — both from a **single** captured `now()`.
- `updatedAt(values)` → `{ ...values, updatedAt }`.
- `softDelete(values)` → `{ ...values, deletedAt, updatedAt }` — single `now()`; only for features that soft-delete ([working-with-databases.md](./working-with-databases.md) → Deletes).

```ts
ctx.system.db.insert(tasks).values(ctx.system.helpers.timestamps({ ...input }));
```

The helper is the **sole** source of `createdAt`/`updatedAt`/`deletedAt`: never also stamp by hand or call `now()` again for the same row. Timestamp columns are `NOT NULL`, **no DB default** — a forgotten stamp fails loud; sole exception: soft-delete's nullable `deletedAt` (`null` = live). See [system/database.md](./system/database.md).

### Minting IDs — `ctx.system.helpers.newId`

`newId('task')` mints a prefixed id ([identifiers.md](./identifiers.md)) from an **injected id-source** — ULID in production, deterministic in tests. The prefix registry is the single `system/` id module shared with the `entityId` schema helper — defined once; minting and validation cannot drift.

## Injectable helper vs direct import

Place a non-adapter foundational primitive by two questions:

1. **Is `ctx` available?** Schema/type positions (`entityId('task')` in a Zod schema, `Page<T>`, `AppContext`) run at module load, no `ctx` → **direct import** from `system/`. Stop.
2. **Runtime: does it read a source worth controlling in tests or varying by environment?** Yes → helper on `ctx.system.helpers.*` over an injectable seam (clock → `timestamps`/`updatedAt`; id-source → `newId`). No — pure and deterministic (pagination's `resolveLimit`, `toPage`, cursor codecs) → **direct import**; `ctx` is ceremony.

## In Tests

A test context supplies: test `system.db`; pinned `system.clock`; deterministic id-source; fixed `actor` (test `user` or explicit `anonymous`); fixed `tenant` (multi-tenant apps) for assertable cross-tenant isolation; spy `system.email`/`system.queue`. No service code changes between production and test. See [testing.md](./testing.md).

---

**Verify:** when done, check [end-here.md](./end-here.md) → AppContext.
