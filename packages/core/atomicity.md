# Atomicity

How a use case stays all-or-nothing.

> **Scope:** *synchronous* use cases only — those that complete within one operation. A use case that waits, sleeps, retries, or must survive a restart is out of scope here; see [What a Transaction Cannot Span](#what-a-transaction-cannot-span).

## Core Principle

**A use case is all-or-nothing: every write it performs commits, or none do.** The boundary is a database transaction, opened once by the code that owns the use case and threaded to every service through `ctx`. Services never know whether they are inside a transaction — they call `ctx.system.db`, which *is* the transaction when a boundary is open. Same rule as [AppContext](./app-context.md): wiring changes, service code does not.

## The Boundary Lives on `ctx`

`ctx.transaction` wraps `ctx.system.db.transaction`, derives a context whose `system.db` is the transaction handle, and passes it to every service. Return commits; any throw rolls back — and a throw is a raised failure (schema parse, guard, service rule), so a **failure is the rollback signal**: the *unwinding* half of the [error-handling strategy](../../error-handling.md) — writes revert and the post-commit effects below never fire.

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();
  await new InventoryService(item, txCtx).reserve();
}); // commit on return · rollback on any throw
```

Services receive `txCtx`, so every `ctx.system.db` call inside them runs on the same transaction; a service written for the non-transactional path works unchanged inside a boundary — agnostic by construction. See [AppContext → Transaction Boundary](./app-context.md).

## The Outermost Caller Owns It

- **Multi-service use case** → the **orchestration** opens the boundary (see [orchestration.md](./orchestration.md)).
- **Single-service use case** → the **service** opens the boundary for its own multi-write operation.

A nested `ctx.transaction` **joins** the open one (a Drizzle savepoint) — never a second top-level transaction, which would split one use case across two commits. So a single-service method that owns a boundary still composes when an orchestration later wraps it: any uncaught throw rolls the *whole* operation back. One top-level boundary per use case, owned by the outermost caller, everything beneath it participating — never some writes inside and some outside, which leaves the database half-updated on failure.

## DB-Only Inside; Effects After Commit

A transaction rolls back database writes; it cannot recall a sent email or a queued job. **Non-transactional side effects are never dispatched inside the boundary** — a rollback would leave the effect fired and the data gone. The owner dispatches them only after commit:

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();    // DB only
  await new InventoryService(item, txCtx).reserve(); // DB only
});
// commit succeeded — now safe to dispatch
await new EmailService(ctx).sendConfirmation(order);
await new FulfillmentService(ctx).enqueue(order);
```

**Split mixed methods:** a method that both writes *and* dispatches cannot run as-is inside a boundary — the write runs inside the transaction; the owner triggers the effect after commit.

**Guarantee:** atomicity guarantees **database consistency** (the use case's writes are all present or all absent), not effect delivery — a post-commit effect can still fail after the data is committed; that is the effect's own retry/idempotency, never a database rollback. The database is the source of truth; effects reconcile toward it.

## What a Transaction Cannot Span

A transaction is all-or-nothing but effectively instantaneous — it holds locks and a connection for its whole duration, so it **cannot be held across a wait**: a sleep, a retry with backoff, an awaited external call, or a process restart all break it. Do not open a boundary for:

- **Read-only use cases** — nothing to commit; wrapping adds overhead and false intent.
- **Single-write use cases** — one write is already atomic; a boundary is ceremony.
- **Long-running use cases** — anything that must wait on the outside world, sleep, retry, or survive a crash cannot be made atomic by one shared transaction. That kind of multi-step execution is **outside this playbook's current scope** — raise it (README → *When in doubt*) rather than stretching a transaction across the waits or silently splitting the use case across several commits.

**Atomicity still applies per step:** within such a process, each discrete step's *own* writes get their own transaction — atomic per step, never across the whole process.

## Validation Inside the Boundary

Existence and uniqueness guards that read run *inside* the transaction, so they see a consistent snapshot ([Validation](./implementation-validation.md)); a [cross-entity invariant](./orchestration.md#cross-entity-invariants) runs inside the same boundary for the same reason — it must judge a consistent snapshot before the guarded write commits.

Any **read-then-write** check (uniqueness, quota, aggregate cap) still races under concurrency — two transactions can both read "OK" before either writes. Back it with a database constraint or a row lock; the read alone is never sufficient.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Atomicity.
