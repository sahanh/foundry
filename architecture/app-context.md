# AppContext

AppContext is the single injected dependency that carries all cross-cutting infrastructure access into the domain layer. Services and workflows receive it through their constructor and use it to reach system-layer adapters — the database, logger, email, queue, and any other infrastructure the domain needs.

## Structure

```
AppContext
  traceId       — UUID identifying the current operation (see system/logging.md)
  transaction   — opens an atomic boundary (see atomicity.md)
  system
    db          — Drizzle client (see working-with-databases.md)
    logger      — logging adapter, required (see system/logging.md)
```

`traceId` is operation-level metadata, not an infrastructure adapter — it sits at the top level. `transaction` is a method, covered below. Additional system-layer adapters are added under `AppContext.system` as the application introduces them. The domain layer never imports an adapter directly — it always goes through the context.

## Constructor Injection

AppContext is passed to a service alongside its domain entity:

```
new TodoService(todo, ctx)
new TodoCommentService(comment, ctx)
```

The service stores the context and uses it across all its methods. This keeps dependencies explicit — a service's constructor signature is a complete declaration of what it needs.

## Why AppContext, Not Direct Imports

The architecture prohibits hidden globals and module-level singletons. Importing a database client or logger directly at the module level is the same problem — it's an implicit dependency that can't be swapped, inspected, or controlled from outside the module.

Injecting through AppContext means:
- **Testability** — tests supply a test context with in-memory or spy adapters; the service code is unchanged.
- **Explicitness** — what a service depends on is visible at the constructor, not hidden in imports.
- **Replaceability** — swapping an adapter (e.g. changing email providers) is a change to the context wiring, not to every service that sends email.

## Wiring

AppContext is assembled externally — in the application bootstrap, a factory, or a test setup — and injected into services. A service never constructs its own context or reaches for a global instance. This is the same rule as lifecycle management in [service-first-architecture.md](./service-first-architecture.md).

## Transaction Boundary

`ctx.transaction` opens an atomic, all-or-nothing boundary for a use case:

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();
  await new InventoryService(item, txCtx).reserve();
}); // commit on return · rollback on any throw
```

It wraps `ctx.system.db.transaction`, derives a context whose `system.db` is the transaction handle, and passes that `txCtx` to every service so all their writes run on the same transaction. A service is unaware it is inside a boundary — it always calls `ctx.system.db`, which is the transaction when one is open. A nested `ctx.transaction` joins the open one rather than opening a second top-level transaction. Full rules — who owns the boundary, why side effects wait until after commit, and how this differs from durable workflows — are in [atomicity.md](./atomicity.md).

## In Tests

Integration tests construct a test AppContext with controlled adapters:

- `system.db` — a test database client (real test DB or in-memory)
- `system.email`, `system.queue` — spy or capture adapters so side effects can be asserted

The service under test receives the test context through its constructor. No service code changes between production and test — only the context differs. See [testing.md](./testing.md) for how this applies to integration test setup.
