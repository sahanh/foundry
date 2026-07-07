# AppContext

AppContext is the single injected dependency that carries all cross-cutting infrastructure access into the domain layer. Services and orchestrations receive it through their constructor and use it to reach system-layer adapters — the database, logger, email, queue, and any other infrastructure the domain needs.

## Structure

```
AppContext
  traceId       — UUID identifying the current operation (see system/logging.md)
  transaction   — opens an atomic boundary (see atomicity.md)
  system
    db          — Drizzle client (see working-with-databases.md)
    logger      — logging adapter, required (see system/logging.md)
    clock       — injectable now-source (see The Clock below)
    helpers     — runtime utilities sourced from an injected seam: timestamps (clock) + newId
                  (id-source) (see Helpers below)
```

`traceId` is operation-level metadata, not an infrastructure adapter — it sits at the top level. `transaction` is a method, covered below. Additional system-layer adapters are added under `AppContext.system` as the application introduces them. The domain layer never imports an adapter directly — it always goes through the context.

## Constructor Injection

AppContext is passed to a service alongside the domain scope it operates on — one entity in the common case:

```
new TodoService(todo, ctx)
new TodoCommentService(comment, ctx)
```

What else a constructor takes is not fixed — the scope may be one entity, several, or nothing beyond `ctx`; it is derived from cohesion, per [service-first-architecture.md → Validation: The Constructor Declares the Scope](./service-first-architecture.md). The service stores the context and uses it across all its methods. This keeps dependencies explicit — a service's constructor signature is a complete declaration of what it needs.

## Why AppContext, Not Direct Imports

The architecture prohibits hidden globals and module-level singletons. Importing a database client or logger directly at the module level is the same problem — it's an implicit dependency that can't be swapped, inspected, or controlled from outside the module.

Injecting through AppContext means:
- **Testability** — tests supply a test context with in-memory or spy adapters; the service code is unchanged.
- **Explicitness** — what a service depends on is visible at the constructor, not hidden in imports.
- **Replaceability** — swapping an adapter (e.g. changing email providers) is a change to the context wiring, not to every service that sends email.

## Wiring

AppContext is assembled externally — in the application bootstrap, a factory, or a test setup — and injected into services. A service never constructs its own context or reaches for a global instance. This is the same rule as lifecycle management in [service-first-architecture.md](./service-first-architecture.md).

The `AppContext` **type** and the generic `ctx.transaction` implementation are defined once as `system/` foundational primitives (see [system/start-here.md](./system/start-here.md)) and imported wherever needed; only the *concrete instance* — choosing real vs test adapters — is assembled externally as above. Defining the type and the transaction-wrapping once, rather than per app, keeps every consumer's boundary identical.

## Transaction Boundary

`ctx.transaction` opens an atomic, all-or-nothing boundary for a use case:

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();
  await new InventoryService(item, txCtx).reserve();
}); // commit on return · rollback on any throw
```

It wraps `ctx.system.db.transaction`, derives a context whose `system.db` is the transaction handle, and passes that `txCtx` to every service so all their writes run on the same transaction. A service is unaware it is inside a boundary — it always calls `ctx.system.db`, which is the transaction when one is open. A nested `ctx.transaction` joins the open one rather than opening a second top-level transaction. Full rules — who owns the boundary, why side effects wait until after commit, and what a transaction cannot span — are in [atomicity.md](./atomicity.md).

## The Clock — `ctx.system.clock`

Time enters the domain through one injected adapter — `ctx.system.clock.now()` — never through `new Date()` scattered across services. Scattering `new Date()` makes time an uncontrollable, hidden input: every service silently reaches the wall clock, and ordering and timestamps become impossible to assert. The clock is an adapter for the same reason `db` and `logger` are — the domain reaches infrastructure only through the context.

- `now(): Date` returns an **absolute instant**. Every domain time read — stamping a row, an expiry check, an "is X before Y" comparison — goes through it.
- In production the factory is omitted and defaults to `() => new Date()` — real wall-clock time, zero behavior change.
- In tests you inject a clock pinned to a fixed instant, so a test can assert that a row's `createdAt`, a related row's `startedAt`, and an event's stamp are all exactly that instant.

Why an injected clock rather than the common `vi.setSystemTime` approach: system-time mocking mutates a **global**, which is process-wide and hostile to parallel integration tests (two tests freezing time clobber each other). An injected clock is parallel-safe by construction — each context carries its own.

**No timezone in the domain.** The clock deals only in absolute instants. Timezone conversion is a presentation concern owned by the layer that communicates between the app and the domain (the API / edge), never by services. The domain stores and compares absolute time; the edge localizes for the viewer.

## Helpers — `ctx.system.helpers`

`ctx.system.helpers` holds **runtime utilities sourced from an injected seam** — stamping timestamps from the clock, and minting ids from an injected id-source. The domain reaches them through `ctx`, so a test controls their output (deterministic time and ids). What belongs here versus a direct import is decided by the framework in *Injectable helper vs direct import* below.

### Persistence timestamps

Timestamps that land in the database come from the clock too — so they are controllable in tests — but a database can't reach the injected clock (a column default runs in the DB or at module load, never per-request). So the **service stamps explicitly**, using a small helper built on the clock. This is not a repository: the service still owns the write and calls `ctx.system.db` directly; the helper only reads the injected clock and stamps the write.

The helper **takes the write's values and returns them stamped** — one call is the whole write shape, so there is no separate "spread the timestamps in" step to forget. Two methods, one per write shape:

- `timestamps(values)` → a **new** object `{ ...values, createdAt, updatedAt }`, both stamps from a **single** captured `now()` (so a new row's created/updated match exactly — never call `now()` twice for one row).
- `updatedAt(values)` → `{ ...values, updatedAt }`.

Both are **pure**: they return a new object and never mutate `values`, and they preserve the input type — `timestamps<T>(values: T): T & { createdAt: Date; updatedAt: Date }`.

```ts
// create
ctx.system.db.insert(tasks).values(ctx.system.helpers.timestamps({ ...input }));

// update
ctx.system.db.update(tasks)
  .set(ctx.system.helpers.updatedAt({ ...changes }))
  .where(eq(tasks.id, id));
```

The helper is the **sole** source of `createdAt`/`updatedAt` — pass the write's values *through* it and never also stamp those columns by hand. No `createdAt: now` in the values, no second `ctx.system.clock.now()` for the same row: a manual stamp sitting next to the helper is duplicate, un-clock-controlled time.

Domain timestamp columns are defined `NOT NULL` with **no DB default**, so the app clock is the only source and a forgotten stamp fails loud — see [system/database.md](./system/database.md).

### Minting IDs — `ctx.system.helpers.newId`

Entity IDs are minted at creation the same way timestamps are stamped — through an **injected id-source**, not a direct import. `ctx.system.helpers.newId('task')` returns a prefixed id (see [identifiers.md](./identifiers.md)); in production the source defaults to a ULID generator, and a test injects a deterministic one so ids are stable and assertable — the clock's rationale applied to ids. The prefix registry it reads is the single `system/` id module shared with the import-time `entityId` schema helper, so a prefix is defined once and cannot drift between minting and validation.

`ctx.system.helpers` is scoped to runtime utilities sourced from an injected seam (clock, id-source). **No domain logic lives here** — that stays in services; it is not a general junk drawer.

## Injectable helper vs direct import

A non-adapter foundational primitive — an id helper, the pagination utilities, the `AppContext` type — is placed by two questions:

1. **Is `ctx` available where it's used?** A primitive used at a **schema-definition or type position** — `entityId('task')` inside a Zod schema, `Page<T>` in a signature, the `AppContext` type itself — runs at module-load time, where there is **no `ctx`**. It **must** be a **direct import** from `system/`. Stop here.
2. **(`ctx` is available — runtime use) Does it read a source worth controlling in tests or varying by environment?**
   - **Yes** → expose it as a **helper on `ctx.system.helpers.*`**, sourced from an injectable seam (clock → `timestamps` / `updatedAt`; id-generator → `newId`), so a test pins it deterministically and production uses the real source.
   - **No** — it is pure and deterministic with nothing to control (e.g. pagination's `resolveLimit`, `toPage`, cursor encode/decode) → a **direct import** is correct; putting it on `ctx` is ceremony for no gain.

The litmus: **inject through `helpers.*` to gain a controllable seam; import when there is no `ctx` to reach or nothing worth controlling.**

## In Tests

Integration tests construct a test AppContext with controlled adapters:

- `system.db` — a test database client (real test DB or in-memory)
- `system.clock` — a clock pinned to a fixed instant, so timestamps are deterministic and assertable
- an injected **id-source** — a deterministic generator so `ctx.system.helpers.newId(...)` yields stable, assertable ids (the id analogue of the pinned clock)
- `system.email`, `system.queue` — spy or capture adapters so side effects can be asserted

The service under test receives the test context through its constructor. No service code changes between production and test — only the context differs. See [testing.md](./testing.md) for how this applies to integration test setup.

---

**Verify:** when done, check [end-here.md](./end-here.md) → AppContext.
