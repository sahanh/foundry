# Orchestration

How to compose multiple services into one use case without leaking coordination into the services themselves.

## Core Principle

**Services own business logic; orchestrations own sequencing.** An orchestration is a service-shaped class that composes services to accomplish a use case spanning more than one of them. It holds no **single-entity** business rules of its own — those live in the services it calls; it owns the order in which services are called and the passing of results between them. The **one** exception is a *cross-entity invariant* — a rule that no single owner can evaluate because it spans two or more owners' data; that, and only that, an orchestration may own (see [Cross-Entity Invariants](#cross-entity-invariants)).

An orchestration is a **service type**, not separate machinery. It is built like any service — a constructor-injected class taking `AppContext`, bound by the same lifecycle rules (no self-instantiation, no globals; see [Service-First Architecture](./service-first-architecture.md)). It differs in exactly two ways: it is the one domain unit *allowed* to inject and coordinate other services, and it owns no table of its own.

This is the counterpart to Service-First: services stay integration-agnostic and unaware of each other; the orchestration is the one place that knows how they fit together.

---

## When an Orchestration Exists

An orchestration earns its place when a single use case spans **more than one service** — the same signal as Service-First's facade trigger ("more than 2-3 services to accomplish a use case"). Until then there is no orchestration: a use case one service accomplishes start to finish is a service concern.

**The trigger is altitude, not duration.** An orchestration exists because a use case *coordinates multiple services* — never because it "runs long." How long a unit takes to execute, and whether it runs synchronously or as a background job, is an **integration concern** decided per consumer (HTTP, worker, scheduled job), not a property of the domain. A single service method may legitimately take minutes; that does not make it an orchestration. Conversely, a fast three-service coordination *is* an orchestration. Keep duration out of the decision.

---

## Guidelines

### 1. No Single-Entity Business Logic in the Orchestration

The orchestration reads as an ordered list of service calls. If a step does more than call a service and pass its result onward, that logic belongs in a service. The moment an orchestration makes a domain decision about *one entity* or transforms an entity, it has stopped being an orchestration. The sole exception is a **cross-entity invariant** — a predicate no single owner can evaluate — which the orchestration alone may own; see [Cross-Entity Invariants](#cross-entity-invariants).

### 2. Services Never Call Each Other

Cross-service coordination goes **up** into an orchestration, never sideways between services. A service that imports another service is a smell — the dependency belongs in the orchestration. This keeps each service independently testable and unaware of the others. The orchestration is the **only** domain unit permitted to inject more than one service.

A shared-validation **guard** is not a service — including one exported by another feature. A service calling `requireActiveUser(ctx, id)` is asserting a rule, not injecting a collaborator; that is a *verdict* crossing, not a sideways call. See [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).

### 3. Validation Is Thin

An orchestration validates only the inputs handed to it — schema parse, plus shared `validation.ts` guards to confirm referenced entities exist — then delegates. It defines no *single-entity* business rules of its own; every single-entity rule and state check lives in the services it calls. The one thing it may enforce directly is a **cross-entity invariant** (a predicate spanning ≥2 owners' data) — see [Cross-Entity Invariants](#cross-entity-invariants). See [Validation](./implementation-validation.md).

### 4. One Entry Point

An orchestration exposes a single way to drive each use case. Every consumer — HTTP handler, queue worker, scheduled job — invokes it the same way, just as services are integration-agnostic.

### 5. Owns the Transaction Boundary

For a synchronous multi-service use case, the orchestration is the outermost caller, so it owns the atomic boundary: it opens `ctx.transaction` and passes the derived `txCtx` to every service it coordinates, so all their writes commit together or roll back together. Non-transactional side effects (email, queue) are dispatched *after* the boundary commits, never inside it. The services stay unaware — they just use `ctx.system.db`. Full rules in [atomicity.md](./atomicity.md).

### 6. Owns No Table

An orchestration is **not** the database seam. Services remain the only code that reads from or writes to their tables (see [Working with Databases](./working-with-databases.md)); an orchestration reaches data only *through* the services it coordinates. It owns no table, so the single-seam, one-owner-per-table rule is untouched — an orchestration coordinates owners, it does not become one.

---

## Cross-Entity Invariants

*The one business rule an orchestration may own.*

Every rule so far belongs to a service (its own entity) or a guard (a verdict about one other feature). One kind fits neither: a **cross-entity invariant** — a rule that is a *predicate over two or more owners' data, evaluated together*. Examples:

- a **quota** — "a tenant on plan X can't exceed N active runs across all workspaces" (the limit lives in `plan`, the count in `run`);
- a **cross-owner uniqueness** — "an email is unique across both `user` and `pendingInvite`";
- an **aggregate** — "allocations can't exceed the budget cap";
- an **overlap** — "a booking can't overlap another for the same resource".

No single owner can evaluate it, because it inherently reads more than one feature's tables — and the orchestration is the **only** domain unit permitted to see multiple owners' data (through their services). So it is the only legal home.

**This is a narrow carve-out, not a loosening of Guideline 1.** An orchestration may own a rule only when **all three** hold:

1. it is a **predicate over data from ≥2 distinct owners**, evaluated together — not a rule about any one entity;
2. **no single service** can own it (it is not a single-entity rule) **and no guard** can (it is not a yes/no verdict about one other feature — that stays a [cross-feature guard](./implementation-validation.md#cross-feature-guards));
3. it **gates the use case this orchestration coordinates**.

If a rule fails any of these it is not a cross-entity invariant — it belongs in a service (single-entity) or a guard (single-feature verdict), and putting it in the orchestration is the [fat-orchestration](#anti-patterns) smell.

### How it runs — gather, check, then proceed

The orchestration reads each side's data **through that feature's own service** (never its tables), evaluates the predicate over the gathered values, and throws its owning feature's domain exception on violation — all **inside** the transaction boundary it owns (Guideline 5), so the check sees a consistent snapshot and the guarded write cannot commit past a failed invariant.

```ts
// StartRunOrchestration — owned by the `run` feature (it writes the run)
await ctx.transaction(async (txCtx) => {
  const plan = await new PlanService(txCtx).forTenant(tenantId);              // read via plan's service
  const activeRuns = await new RunCollectionService(txCtx).countActive(tenantId); // read via run's service
  if (activeRuns >= plan.maxActiveRuns) {                                     // the cross-entity invariant
    throw new RunException('active-run-limit-exceeded', { tenantId, limit: plan.maxActiveRuns });
  }
  await new RunService(run, txCtx).start();                                   // the gated write
});
```

The orchestration still holds no single-entity rule: `plan.maxActiveRuns` and how a run starts are owned by their services; the orchestration owns only the *relationship between them*.

**Races.** A read-then-write invariant (quota, uniqueness, aggregate) is subject to the same race as any check-then-write: two transactions can both read "under the limit" before either writes. Back it with a database constraint or a row lock — the invariant read is not sufficient alone. See [atomicity.md → Validation Inside the Boundary](./atomicity.md#validation-inside-the-boundary).

### Which feature owns the orchestration

Decided by the ownership ladder in [logic-placement.md → Where the Promoted Thing Lives](./logic-placement.md#where-the-promoted-thing-lives): the **outcome owner** first (the feature whose entity the use case writes — the invariant is a gate on that write), then the **rule owner** (the feature owning the limit/policy) when there is no single write outcome, then its **own feature** when it fits neither. The owning feature's domain exception is the one thrown for the violation.

---

## Naming

Name an orchestration by the process or use case it coordinates, not by an entity (it spans several): `{Process}Orchestration`.

- Folder: `orchestrations/`
- Files: `claim-task.orchestration.ts`
- Class: `ClaimTaskOrchestration`

Follow the same granularity ladder as services: group related multi-service use cases as methods on one orchestration (e.g. `TaskLifecycleOrchestration` with `claim()`, `complete()`, `resume()`), and split a use case into its own orchestration class on the second signal — not in anticipation.

---

## Promotion: When a Service Operation Becomes an Orchestration

A use case often starts as a single-service operation and later grows a second-service concern — e.g. "create task" (one service) becomes "create task **and** send a notification" (two services). At that point it **graduates** from a service method to an orchestration. Handle the graduation deliberately:

1. **Create the orchestration** for the now-multi-service use case. Do not add the second service's call to the existing service method — that would make a service call another service (Guideline 2) and pollute the primitive.
2. **Re-evaluate the superseded callers.** Grep every direct caller of the original service method and decide, per caller, whether it should now route through the orchestration or legitimately remains a primitive call. This is the step that prevents stranded callers silently skipping the new coordination.
3. **Prefer the orchestration going forward.** Once an orchestration exists for a use case, consumers use it rather than re-stitching the raw service methods themselves. Optionally, note in the orchestration which service operation(s) it supersedes, so the relationship is discoverable.

This keeps the service layer primitive (its purpose) while ensuring growth in coordination is captured in one visible place instead of duplicated across consumers.

**Verdict vs. data — when a cross-feature concern does _not_ trigger promotion.** Needing another feature's *data* in the flow (its entity fields feed the use case) is a genuine second-service concern: promote. Needing only another feature's *verdict* (a yes/no its guard can answer) is **not** — call the exported guard and stay a single-service method. Don't promote a use case to an orchestration merely to ask another feature a question; that inflates the orchestration layer. See [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).

---

## Reliability: Synchronous Coordination Only

An orchestration describes *what* services are coordinated and in what order — a **domain** concept, silent on how long the coordination takes to run. A synchronous coordination is made **reliable** by the transaction boundary the orchestration owns (Guideline 5): it completes within one operation and is all-or-nothing. See [atomicity.md](./atomicity.md).

A coordination that must wait on the outside world, sleep, retry, or survive a crash **cannot** be wrapped in that boundary — see [atomicity.md → What a Transaction Cannot Span](./atomicity.md#what-a-transaction-cannot-span). Reliably executing that kind of long-running, multi-step work is **outside this playbook's current scope**: raise it (README → *When in doubt*) rather than forcing it into an orchestration-plus-transaction. Either way duration stays out of the domain — an orchestration is triggered by altitude, not by how it runs.

---

## When NOT to Use an Orchestration

- **Single-service use case** — one service accomplishes it start to finish. Call the service; there is nothing to coordinate. (Even if it runs long — duration is not the trigger.)
- **Pure linear glue** — a controller calling two services in sequence with no real coordination doesn't need an orchestration. Inline it.
- **No multi-service use case yet** — don't build coordination in anticipation; extract an orchestration when the coordination actually exists.

---

## Relationship to Service-First

| Layer | Owns | Knows about |
|---|---|---|
| Controller | HTTP / transport concerns | one orchestration or service |
| **Orchestration** | sequencing and coordination across services, plus any **cross-entity invariant** | multiple services |
| Service | business logic for one entity | its own domain only |
| `shared/validation.ts` | shared business-rule guards | the feature's domain |

The orchestration sits *between* controllers and services. It is Service-First's facade trigger made concrete: when a use case touches more than 2-3 services, the orchestration is the single place that coordinates them — same building block as a service, with the privilege to inject several of them.

---

## Anti-Patterns

- **Fat orchestration** — *single-entity* business rules creeping into the orchestration instead of staying in services. (A genuine cross-entity invariant is the sanctioned exception, not this smell — see [Cross-Entity Invariants](#cross-entity-invariants).)
- **Sideways calls** — services calling each other instead of coordination going up into an orchestration.
- **Validation beyond inputs** — an orchestration enforcing a *single-entity* business rule that belongs in a service (as opposed to a cross-entity invariant, which it may own).
- **Orchestration-by-duration** — creating an orchestration because a use case "runs long" rather than because it coordinates multiple services. Duration is an integration concern.
- **Stranded callers** — promoting a service operation to an orchestration without re-evaluating the existing direct callers of the superseded service method.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Orchestrations.
