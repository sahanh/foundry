# Atomicity

How a use case stays all-or-nothing. Every write in a single use case commits together or not at all, enforced by one transaction boundary owned by the outermost caller and carried on `ctx`.

> **Scope:** this doc covers *synchronous* use cases — those that complete within one operation. A use case that waits on the outside world, sleeps, retries, or must survive a restart cannot be made atomic by a shared transaction and is **out of scope here**; see [What a Transaction Cannot Span](#what-a-transaction-cannot-span) below.

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

## What a Transaction Cannot Span

A transaction is all-or-nothing but effectively instantaneous — it holds locks and a connection open for its whole duration, so it **cannot be held across a wait**. A sleep, a retry with backoff, an external call you must await, or a process restart all break it.

So a use case that must wait on the outside world, sleep, retry, or survive a crash **cannot be made atomic by one shared transaction**. That kind of long-running, multi-step execution is **outside this playbook's current scope** — if you hit one, raise it (see the README's *When in doubt*) rather than stretching a transaction across the waits, or splitting the use case silently across several commits and hoping.

**Atomicity still applies per step.** Within such a longer process, each discrete step's *own* writes can be wrapped in its own transaction. Atomicity is per step, never across the whole process — the process as a whole is not atomic, but each individual write it performs can be.

---

## Validation Inside the Boundary

Existence and uniqueness guards that read run *inside* the transaction, so they see a consistent snapshot (see [Validation](./implementation-validation.md)). A [cross-entity invariant](./orchestration.md#cross-entity-invariants) an orchestration enforces runs inside the same boundary, for the same reason — it must judge a consistent snapshot before the guarded write commits.

Any **read-then-write** check is still subject to a race under concurrency — a uniqueness check ("no duplicate"), a quota ("under the limit"), or an aggregate ("sum within cap") can all have two transactions both read "OK" before either writes. Back it with a database constraint or a row lock; the read is not sufficient on its own.

---

## When NOT to Open a Boundary

- **Read-only use cases** — nothing to commit; wrapping them adds overhead and signals intent that isn't there.
- **Single-write use cases** — one write is already atomic; a boundary is ceremony.
- **Long-running use cases** — those that wait on the outside world, sleep, retry, or must survive a restart; a transaction cannot span them. See [What a Transaction Cannot Span](#what-a-transaction-cannot-span).

---

## Anti-Patterns

- **Side effects inside the boundary** — dispatching email or queueing a job before commit; a rollback leaves the effect sent and the data gone.
- **A second top-level transaction** — an inner service opening its own boundary instead of joining the outer one, splitting one use case across two commits.
- **Partial use case** — some writes inside the boundary and some outside it, so a failure leaves the database half-updated.
- **Relying on a guard read for uniqueness under concurrency** — a check-then-insert with no database constraint behind it.
- **Holding a transaction across a wait** — keeping a boundary open across a sleep, a retry, or an external call; a transaction cannot span those (see [What a Transaction Cannot Span](#what-a-transaction-cannot-span)).

---

**Verify:** when done, check [end-here.md](./end-here.md) → Atomicity.
