# Atomicity

How a use case stays all-or-nothing. Every write in a single use case commits together or not at all, enforced by one transaction boundary owned by the outermost caller and carried on `ctx`.

> **Scope:** this doc covers *synchronous* use cases — those that complete within one operation. Long-running, durable workflows (the [workflow runtime](../workflow/README.md)) are explicitly **not** atomic and use compensation instead; see [Atomic vs Durable](#atomic-vs-durable) below.

## Core Principle

**A use case is all-or-nothing.** Either every write it performs commits, or none of them do. The boundary is a database transaction, opened once by the code that owns the use case and threaded to every service through `ctx`. Services never know whether they are inside a transaction — they call `ctx.system.db`, which *is* the transaction when a boundary is open. This is the same rule as [AppContext](./app-context.md): wiring changes, service code does not.

---

## The Boundary Lives on `ctx`

`ctx.transaction` wraps `ctx.system.db.transaction`, derives a context whose `system.db` is the transaction handle, and passes that derived context to every service. On return it commits; on any throw it rolls back.

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();
  await new InventoryService(item, txCtx).reserve();
}); // commit on return · rollback on any throw
```

Because the services receive `txCtx`, every `ctx.system.db` call inside them runs on the same transaction. A service written for the non-transactional path works unchanged inside a boundary — it is agnostic by construction. See [AppContext → Transaction Boundary](./app-context.md).

---

## The Outermost Caller Owns It

The boundary belongs to whoever owns the use case:

- **Multi-service use case** → the **orchestration** opens the boundary (see [orchestration.md](./orchestration.md)).
- **Single-service use case** → the **service** opens the boundary for its own multi-write operation.

A nested `ctx.transaction` **joins** the open one (a Drizzle savepoint) — it never opens a second top-level transaction. So a single-service method that owns a boundary still composes when an orchestration later wraps it: any uncaught throw propagates out and rolls the *whole* operation back. The rule is one top-level boundary per use case, owned by the outermost caller; everything beneath it participates.

---

## DB-Only Inside; Effects After Commit

A transaction rolls back database writes. It cannot recall an email that was sent or a job that was queued. **Non-transactional side effects are never dispatched inside the boundary** — the owner fires them only after the boundary has committed.

```ts
await ctx.transaction(async (txCtx) => {
  await new OrderService(order, txCtx).place();    // DB only
  await new InventoryService(item, txCtx).reserve(); // DB only
});
// commit succeeded — now safe to dispatch
await new EmailService(ctx).sendConfirmation(order);
await new FulfillmentService(ctx).enqueue(order);
```

**Consequence — split mixed methods.** A service method that both writes to the database *and* dispatches a side effect cannot run as-is inside a boundary. Separate the persistence from the dispatch: the write runs inside the transaction, and the owner triggers the effect after commit.

**What atomicity does and does not guarantee.** It guarantees **database consistency** — the use case's writes are all present or all absent. It does **not** guarantee effect delivery. A post-commit effect can still fail after the data is committed; that is handled by the effect's own retry/idempotency, not by rolling the database back. The database is the source of truth; effects reconcile toward it.

---

## Atomic vs Durable

Atomic orchestration and the durable [workflow runtime](../workflow/README.md) solve different problems. A use case is one or the other — never both.

| | Atomic orchestration | Durable workflow |
|---|---|---|
| Spans | one operation, one transaction | time, restarts, external waits |
| Failure model | rollback (all-or-nothing) | compensation + idempotent tasks |
| Sleeps / retries / parallel | none | yes |
| Home | services & orchestrations (this doc) | [`packages/workflow/`](../workflow/README.md) |

You **cannot** hold a transaction across a sleep, a retry, or a process restart — so anything that waits on the outside world or must survive a crash belongs to the durable runtime, where reliability comes from compensation and idempotent tasks, not a shared transaction.

**Per-task atomicity inside a durable workflow.** The two compose at the task level: an individual `ctx.task` may wrap *its own* writes in a transaction. Atomicity there is per-task, never per-workflow — the workflow as a whole is durable, and each task it runs can be atomic.

---

## Validation Inside the Boundary

Existence and uniqueness guards that read run *inside* the transaction, so they see a consistent snapshot (see [Validation](./implementation-validation.md)).

A read-then-write uniqueness check is still subject to a race under concurrency — two transactions can both read "no duplicate" before either writes. Back it with a database unique constraint or a row lock; the guard read is not sufficient on its own.

---

## When NOT to Open a Boundary

- **Read-only use cases** — nothing to commit; wrapping them adds overhead and signals intent that isn't there.
- **Single-write use cases** — one write is already atomic; a boundary is ceremony.
- **Durable / long-running use cases** — see [Atomic vs Durable](#atomic-vs-durable); use the workflow runtime.

---

## Anti-Patterns

- **Side effects inside the boundary** — dispatching email or queueing a job before commit; a rollback leaves the effect sent and the data gone.
- **A second top-level transaction** — an inner service opening its own boundary instead of joining the outer one, splitting one use case across two commits.
- **Partial use case** — some writes inside the boundary and some outside it, so a failure leaves the database half-updated.
- **Relying on a guard read for uniqueness under concurrency** — a check-then-insert with no database constraint behind it.
- **Trying to make a durable workflow atomic** — holding a transaction across sleeps or retries; this is the durable runtime's job, via compensation.
