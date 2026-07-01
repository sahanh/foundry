# Orchestration

How to compose multiple services into one use case without leaking coordination into the services themselves.

## Core Principle

**Services own business logic; orchestrations own sequencing.** An orchestration is a service-shaped class that composes services to accomplish a use case spanning more than one of them. It holds no business rules of its own — only the order in which services are called and the passing of results between them.

An orchestration is a **service type**, not separate machinery. It is built like any service — a constructor-injected class taking `AppContext`, bound by the same lifecycle rules (no self-instantiation, no globals; see [Service-First Architecture](./service-first-architecture.md)). It differs in exactly two ways: it is the one domain unit *allowed* to inject and coordinate other services, and it owns no table of its own.

This is the counterpart to Service-First: services stay integration-agnostic and unaware of each other; the orchestration is the one place that knows how they fit together.

---

## When an Orchestration Exists

An orchestration earns its place when a single use case spans **more than one service** — the same signal as Service-First's facade trigger ("more than 2-3 services to accomplish a use case"). Until then there is no orchestration: a use case one service accomplishes start to finish is a service concern.

**The trigger is altitude, not duration.** An orchestration exists because a use case *coordinates multiple services* — never because it "runs long." How long a unit takes to execute, and whether it runs synchronously or as a background/durable job, is an **integration concern** decided per consumer (HTTP, worker, scheduled job), not a property of the domain. A single service method may legitimately take minutes; that does not make it an orchestration. Conversely, a fast three-service coordination *is* an orchestration. Keep duration out of the decision.

---

## Guidelines

### 1. No Business Logic in the Orchestration

The orchestration reads as an ordered list of service calls. If a step does more than call a service and pass its result onward, that logic belongs in a service. The moment an orchestration makes a domain decision or transforms an entity, it has stopped being an orchestration.

### 2. Services Never Call Each Other

Cross-service coordination goes **up** into an orchestration, never sideways between services. A service that imports another service is a smell — the dependency belongs in the orchestration. This keeps each service independently testable and unaware of the others. The orchestration is the **only** domain unit permitted to inject more than one service.

### 3. Validation Is Thin

An orchestration validates only the inputs handed to it — schema parse, plus shared `validation.ts` guards to confirm referenced entities exist — then delegates. It defines no business rules of its own; every domain rule, state check, and invariant lives in the services it calls. See [Validation](./implementation-validation.md).

### 4. One Entry Point

An orchestration exposes a single way to drive each use case. Every consumer — HTTP handler, queue worker, scheduled job — invokes it the same way, just as services are integration-agnostic.

### 5. Owns the Transaction Boundary

For a synchronous multi-service use case, the orchestration is the outermost caller, so it owns the atomic boundary: it opens `ctx.transaction` and passes the derived `txCtx` to every service it coordinates, so all their writes commit together or roll back together. Non-transactional side effects (email, queue) are dispatched *after* the boundary commits, never inside it. The services stay unaware — they just use `ctx.system.db`. Full rules in [atomicity.md](./atomicity.md).

### 6. Owns No Table

An orchestration is **not** the database seam. Services remain the only code that reads from or writes to their tables (see [Working with Databases](./working-with-databases.md)); an orchestration reaches data only *through* the services it coordinates. It owns no table, so the single-seam, one-owner-per-table rule is untouched — an orchestration coordinates owners, it does not become one.

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

---

## Beyond the Convention: Reliability by Lifetime

*How* a multi-service use case runs **reliably** splits by lifetime:

- **Synchronous use cases** — an orchestration that completes within one operation is made all-or-nothing by the transaction boundary it owns (Guideline 5). See [atomicity.md](./atomicity.md).
- **Durable / long-running** — anything that waits on the outside world, sleeps, retries, or must survive a crash cannot be wrapped in a transaction. Reliability there comes from retries, idempotency, and rollback/compensation, owned by a durable-execution engine — the [workflow runtime](../workflow/README.md).

This is the boundary where the names divide: an *orchestration* (domain) describes *what* services are coordinated and in what order; the *workflow runtime* (infrastructure) decides *how* a durable coordination executes as checkpointed steps. The name **"workflow"** belongs to that runtime layer, keeping domain and infrastructure distinct. This doc covers how to **structure** coordination in the domain; atomicity.md and the workflow runtime cover how it runs.

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
| **Orchestration** | sequencing and coordination across services | multiple services |
| Service | business logic for one entity | its own domain only |
| `shared/validation.ts` | shared business-rule guards | the feature's domain |

The orchestration sits *between* controllers and services. It is Service-First's facade trigger made concrete: when a use case touches more than 2-3 services, the orchestration is the single place that coordinates them — same building block as a service, with the privilege to inject several of them.

---

## Anti-Patterns

- **Fat orchestration** — business rules creeping into the orchestration instead of staying in services.
- **Sideways calls** — services calling each other instead of coordination going up into an orchestration.
- **Validation beyond inputs** — an orchestration enforcing business rules that belong in a service.
- **Orchestration-by-duration** — creating an orchestration because a use case "runs long" rather than because it coordinates multiple services. Duration is an integration concern.
- **Stranded callers** — promoting a service operation to an orchestration without re-evaluating the existing direct callers of the superseded service method.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Orchestrations.
