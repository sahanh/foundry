# Orchestration

Composing multiple services into one use case.

## Core Principle

**Services own business logic; orchestrations own sequencing.** An orchestration composes services for a use case spanning more than one: it owns call order and result passing, and holds no single-entity business rules — sole exception, a [cross-entity invariant](#cross-entity-invariants).

A **service type**, not separate machinery: constructor-injected, takes `AppContext`, same lifecycle rules as services ([service-first-architecture.md](./service-first-architecture.md)). Exactly two differences: it is the one domain unit *allowed* to inject multiple services, and it owns no table. Services stay integration-agnostic and unaware of each other.

## When an Orchestration Exists

When a single use case spans **more than one service** — Service-First's facade trigger. **The trigger is altitude, not duration:** run time and sync-vs-background are integration concerns decided per consumer, not domain properties; a service method may take minutes; a fast three-service coordination *is* one.

Not for: a **single-service use case** (call the service, even long-running); **pure linear glue** (a controller calling two services with no real coordination inlines them); **anticipated coordination** (extract when it actually exists).

## Guidelines

### 1. No Single-Entity Logic; Validation Is Thin

It reads as an ordered list of service calls. It validates only its own inputs — schema parse plus shared `validation.ts` guards that referenced entities exist ([implementation-validation.md](./implementation-validation.md)) — then delegates; every single-entity rule, state check, or transformation stays in the services. A domain decision about one entity = **fat orchestration**. Sole direct rule: a [cross-entity invariant](#cross-entity-invariants).

### 2. Services Never Call Each Other

Coordination goes **up**, never sideways: a service importing another is a smell; only the orchestration injects more than one. Calling another feature's exported **guard** is not sideways — a *verdict* crosses, not a collaborator ([Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).

### 3. One Entry Point

One way to drive each use case: HTTP handler, queue worker, scheduled job all invoke it identically.

### 4. Owns the Transaction Boundary

As outermost caller of a synchronous multi-service use case, it opens `ctx.transaction` and passes the derived `txCtx` to every coordinated service — all writes commit or roll back together; services stay unaware. Non-transactional side effects (email, queue) dispatch *after* commit, never inside. Full rules: [atomicity.md](./atomicity.md).

### 5. Owns No Table

Services remain the only code touching their tables ([working-with-databases.md](./working-with-databases.md)); an orchestration reaches data only *through* them.

## Cross-Entity Invariants

*The one business rule an orchestration may own:* a *predicate over ≥2 owners' data, evaluated together* — a **quota** ("plan X caps active runs at N" — limit in `plan`, count in `run`), **cross-owner uniqueness** ("email unique across `user` and `pendingInvite`"), an **aggregate** ("allocations ≤ budget cap"), an **overlap** ("bookings can't overlap per resource"). No single owner can evaluate it; the orchestration — alone permitted to see multiple owners' data, through their services — is the only legal home.

**A narrow carve-out of Guideline 1** — all three must hold:

1. a **predicate over ≥2 distinct owners' data**, evaluated together — not about one entity;
2. **no single service or guard** can own it (a yes/no about one other feature stays a [cross-feature guard](./implementation-validation.md#cross-feature-guards));
3. it **gates the use case this orchestration coordinates**.

Fail any one → service or guard; here it is the fat-orchestration smell.

**How it runs — gather, check, proceed.** Read each side *through that feature's service* (never its tables), evaluate the predicate, throw the owning feature's domain exception on violation — all **inside** the transaction boundary (Guideline 4):

```ts
// StartRunOrchestration — owned by `run` (it writes the run)
await ctx.transaction(async (txCtx) => {
  const plan = await new PlanService(txCtx).forTenant(tenantId);              // read via plan's service
  const activeRuns = await new RunCollectionService(txCtx).countActive(tenantId); // read via run's service
  if (activeRuns >= plan.maxActiveRuns) {                                     // the cross-entity invariant
    throw new RunException('active-run-limit-exceeded', { tenantId, limit: plan.maxActiveRuns });
  }
  await new RunService(run, txCtx).start();                                   // the gated write
});
```

The orchestration owns only the *relationship*: `plan.maxActiveRuns` and how a run starts stay with their services.

- `tenantId` is threaded because the tenant is the owner the quota is *about*; with `ctx.tenant` ([multi-tenancy.md](./multi-tenancy.md)) the reads scope through the seam.
- **Races:** read-then-write races; back it with a database constraint or row lock — the read alone is insufficient ([atomicity.md → Validation Inside the Boundary](./atomicity.md#validation-inside-the-boundary)).
- **Owning feature:** the ladder in [logic-placement.md → Who owns a cross-entity-invariant orchestration](./logic-placement.md#who-owns-a-cross-entity-invariant-orchestration).

## Naming

`{Process}Orchestration` — named by the use case, never an entity. Folder `orchestrations/`, file `claim-task.orchestration.ts`, class `ClaimTaskOrchestration`. Same granularity ladder as services: group related use cases as methods on one orchestration (`TaskLifecycleOrchestration`: `claim()`, `complete()`, `resume()`); split on the second signal, not in anticipation.

**The name changes where the shape changes.** When an orchestration method wraps a read on a service it consumes and the return type differs — it hydrates a foreign id into the owning feature's data or assembles a composite ([Cross-Feature Data Access](./working-with-databases.md#cross-feature-data-access)) — the two methods must not share a name: an identical name hides that the data changes shape exactly at the seam (**shape-hiding name**). The guard rail binds only that consuming pair — an orchestration and a service it never calls sharing a name is coincidence, not a smell. The service names the feature-local read; the orchestration names the finished public read. When they clash, naming each side in its own vocabulary — the feature's domain status (*waiting for human*) below, the consumer concept (*inbox*) above — resolves it naturally. A **pure pass-through keeps the name**: a facade forwarding an orchestration's result unchanged reuses it — a pass-through boundary is a seam wrapper, not a transformation.

```ts
TaskCollectionService.listWaitingForHumanTasks(): WaitingTask[]  // feature-local read — one waiting status among several; entries carry a foreign projectId
InboxOrchestration.inboxTasks(): InboxEntry[]                    // hydrated — new shape, new name
InboxFacade.inboxTasks(): InboxEntry[]                           // pass-through — same shape, same name
```

Not `InboxOrchestration.listWaitingForHumanTasks()` — same name across a shape change; not `inboxWaitingTasks()` — a method name drops words its receiver implies ([Consumer-First Design](./service-first-architecture.md#3-consumer-first-design)).

## Promotion: When a Service Operation Becomes an Orchestration

A single-service use case grows a second-service concern — "create task" becomes "create task **and** send a notification":

1. **Create the orchestration.** Never add the second call inside the existing service method — that makes a service call a service (Guideline 2).
2. **Re-evaluate superseded callers.** Grep every direct caller of the original method; per caller, route through the orchestration or legitimately stay a primitive call — else **stranded callers** silently skip the new coordination.
3. **Prefer the orchestration going forward** — don't re-stitch raw service methods; optionally note which operation(s) it supersedes.

**What does *not* promote:** another feature's *data* flowing in is a genuine second-service concern — promote; its *verdict* alone (a yes/no its guard answers) — call the exported guard, stay a single-service method ([Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).

## Reliability: Synchronous Coordination Only

A synchronous coordination is reliable via its transaction boundary (Guideline 4). Coordination that must wait on the outside world, sleep, retry, or survive a crash **cannot** be wrapped in that boundary ([atomicity.md → What a Transaction Cannot Span](./atomicity.md#what-a-transaction-cannot-span)); reliable long-running multi-step work is **outside Foundry's current scope** — raise it (README → *When in doubt*), don't force an orchestration-plus-transaction.

## Relationship to Service-First

| Layer | Owns | Knows about |
|---|---|---|
| Controller | HTTP / transport concerns | one orchestration or service |
| **Orchestration** | sequencing across services, plus any **cross-entity invariant** | multiple services |
| Service | business logic for one entity | its own domain only |
| `shared/validation.ts` | shared business-rule guards | the feature's domain |

## Anti-Patterns

Each smell is defined at its rule: **fat orchestration** (Guideline 1), **sideways calls** (Guideline 2), **orchestration-by-duration** (When an Orchestration Exists), **stranded callers** (Promotion step 2), **shape-hiding name** (Naming).

**Verify:** when done, check [end-here.md](./end-here.md) → Orchestrations.
