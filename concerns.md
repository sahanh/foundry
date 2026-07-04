# Concerns

Open gaps in the playbook. Per the README, gaps are **documented, not silently decided** — each item
below is a one-line concern followed by the detail and its current status.

This list was first compiled from a full review on **2026-07-02**, then **revalidated on 2026-07-05**
against the docs after two restructures (`bf55708` mirror-code-topology, `bea1254` workflow→orchestration
rename). Items the restructures resolved were dropped — see [Resolved](#resolved-no-longer-valid) at the
bottom for what was removed and why, so a reader who remembers an old concern can find where it went.

Each open item carries a **status** — `open` (no coverage), `partial` (some coverage, named gap remains),
or `softened` (the risk is now acknowledged in a doc but not fully closed) — and a **current anchor** to
the doc(s) that own, or should own, the decision.

---

## Domain layer

### 3. Controllers' actual job is unspecified: mapping domain exceptions to transport responses — `open`

Controllers are "thin glue," but no doc covers exception → HTTP status mapping, error response shape, or
pagination/filtering/sorting contracts for collection endpoints. The domain side stops at "throw a domain
exception; the integrator decides presentation" (`implementation-validation.md:96`); the controller side
that owns the mapping is still a stub (`apps/start-here.md`), and `apps/end-here.md` only says "format the
response, with no business rules." The one piece of logic controllers legitimately own has no convention.

**Anchor:** `apps/start-here.md` (stub), `apps/end-here.md`, `implementation-validation.md`.

### 4. Authentication and authorization have no home — `partial`

Ownership *checks* now have a home: they live as `shared/validation.ts` guards ("this operation is allowed
for this owner", `implementation-validation.md:152`) and the feature exception covers "authorization
failures" (`implementation-validation.md:63`). Still unaddressed: where **authentication** happens, whether
authz lives in controller vs service vs a guard layer, and **how the current user (actor) reaches a
service** — `AppContext` (`app-context.md:7-16`) carries `traceId`, `transaction`, and `system.*` but **no
actor/principal field**, and services are constructed as `new TodoService(todo, ctx)` with no actor argument.

**Anchor:** `app-context.md`, `implementation-validation.md`.

### 5. Collection services break the constructor-injection test and the docs never resolve it — `open`

The decomposition rule is "the injected entity is used by every method" (`service-first-architecture.md:133`),
but a `{Entity}CollectionService` (`TodoCollectionService.create()`/`list()`) has no single entity to inject —
it creates and lists them. The docs bless collection services as a role (`start-here.md:89`) but never carve
them out of the injected-entity test or state what their constructor takes (parent entity? just `ctx`?).

**Anchor:** `service-first-architecture.md`, `app-context.md:22`.

### 6. Cross-cutting helpers have no legal home under the folder rules — `open`

`newId()`/`entityId()` and the mandated "single prefix registry" (`identifiers.md:19`), the `AppContext`
type itself, and the `ctx.transaction` implementation are neither a feature nor a driven adapter nor an app.
The folder rule (`code-placement.md:140`, `start-here.md:56`) says any such folder "requires explicit
confirmation from the user before it is created" — so the standard mandates code it gives no sanctioned home.

**Anchor:** `identifiers.md:19`, `code-placement.md`, `app-context.md`.

### 7. AppContext assembly and per-request construction are still hand-waved — `partial`

Progress since 2026-07-02: `traceId` and `transaction` are now top-level on `AppContext`
(`app-context.md:7-16`); assembly is located ("bootstrap, a factory, or a test setup",
`app-context.md:41`) and routed in `review.md`; trace-ID establishment is specified (use inbound
`X-Trace-ID` or generate a UUID, `logging.md:11-16`; checkbox at `apps/end-here.md:22`). Still unwritten:
the **per-request construction mechanics** — no trace-ID middleware pattern, no worked example of building a
fresh `AppContext` per request. The home doc (`apps/start-here.md`) only promises this content later.

**Anchor:** `app-context.md`, `system/logging.md`, `apps/start-here.md`.

## Reliability & operations

### 8. Post-commit side effects can be silently lost — no outbox story — `softened`

`atomicity.md:55` now explicitly states atomicity "does not guarantee effect delivery" and that a
post-commit effect is "handled by the effect's own retry/idempotency ... effects reconcile toward" the
database. That names the philosophy, but it does **not** prescribe a transactional outbox, nor name the
specific crash-between-commit-and-dispatch window — where the process dies after commit but before dispatch,
so there is no effect left to retry. Either document an outbox pattern or explicitly accept that loss window.

**Anchor:** `atomicity.md:41,55,94`.

### 9. Observability beyond logs is absent — `open`

Logging is the only implemented pillar (`system/logging.md`); timing is mentioned only in passing. No
metrics, alerting, health checks, or tracing-span layer. Monitoring remains an unwritten TODO
(`packages/core/todo.md`), and `review.md` has no observability node.

**Anchor:** `system/logging.md`, `packages/core/todo.md`.

### 10. Concurrency control beyond the uniqueness-race note is missing — `partial`

`atomicity.md:80,97` correctly flags the check-then-insert uniqueness race (back it with a DB constraint or
row lock). Nothing else: no optimistic locking / version columns, no idempotency keys for retried inbound
API calls, no isolation-level expectations. (Idempotency is only ever delegated to the deferred workflow
engine, never given as a convention for retried API calls.)

**Anchor:** `atomicity.md`.

### 11. Common persistence conventions are partly undecided — `partial`

Decided: who sets `createdAt`/`updatedAt` — the service, via `ctx.system.helpers` sourced from the injected
clock (`app-context.md:69-92`, `system/database.md:22`). The type-level enum question is also settled toward
string-literal unions + `z.enum()`. Still undecided: **soft-delete vs hard-delete**, **audit trails** for
domain data, and the **DB-column** enum question (`varchar` + Zod enum vs Postgres `pgEnum`) — `database.md`
never states which. Without a rule these get decided ad hoc per feature.

**Anchor:** `app-context.md`, `system/database.md`.

## Scaling / five-year pressure points

### 12. Cross-entity business rules have no home — `open`

Rules are scoped to the owning entity's service, orchestrations hold no rules of their own
(`orchestration.md:7,27`), sideways service calls are banned, and `shared/validation.ts` is for a single
check reused by ≥2 callers (`implementation-validation.md:140`). So an invariant spanning entities ("a
tenant on plan X can't exceed N active runs across all workspaces") fits nowhere. Teams will resolve it by
fattening orchestrations or inventing a policy layer ad hoc. Needs a sanctioned answer before the first
such rule appears.

**Anchor:** `orchestration.md:7,27`, `implementation-validation.md:140`.

### 13. Multi-tenancy is not in the playbook — `open`

No tenant isolation convention exists. `AppContext` (`app-context.md:7-16`) carries no tenant field; there
is no scoped `ctx.system.db`, no RLS, no tenant-column guidance. Tenant isolation re-implemented by hand in
every service means one missed `where tenantId` across five years of query sites — a breach, not a bug.
Tenancy must be a structural convention, not per-query discipline.

**Anchor:** `app-context.md:7`, `working-with-databases.md`.

### 14. Cross-feature reads — direction decided, spec still missing — `open`

Direction is confirmed: cross-entity queries (dashboards, search, reporting) should live in a dedicated
read layer, not in feature services. But no such spec exists — the current rule still routes all
cross-feature reads through the owning service (`working-with-databases.md:16`), and the folder rule
(`code-placement.md:34-44,136-140`) recognizes only three roles, sanctioning no read-model category. The
layer still needs its spec:

- **Read-only is the entire contract** — may join any tables, never mutates; enforce with a read-only DB
  role/connection, not convention alone.
- **It is a third architectural category** — the folder rule must sanction a named home for it.
- **Domain definitions will drift into SQL copies** — when a service defines "active," the query layer
  re-encodes it; needs shared predicates, DB views, or imports of the named-decision helpers.
- **It is the highest-risk site for tenant leaks** — the one layer that legitimately bypasses services must
  have structural tenant scoping.

**Anchor:** `working-with-databases.md`, `code-placement.md`, `packages/core/start-here.md`.

## Smaller items

- **Test coverage & lifecycle** — `open`. Controller/e2e tests are deferred but nothing tracks when "later"
  arrives; test-DB lifecycle (migrate/reset between runs) is unspecified. Verify against `testing.md`'s
  current state.

---

## Resolved (no longer valid)

Dropped from the backlog because the restructures closed them. Listed so an old concern can be traced.

- **workflow README contradicts its PRD/database-design** *(was #1)* — the entire `packages/workflow/` tree
  (`README.md`, `prd.md`, `database-design.md`, `documentation.md`, `project-strcuture.md`,
  `test-implementation-plan.md`) was deleted. The durable runtime is deliberately deferred; there is no spec
  left to contradict.
- **Doc chain doesn't reach every file** *(was #2)* — `architecture/todo.md` and the workflow sibling docs
  no longer exist.
- **Workflow versioning / "replay mismatch fails the run"** *(was #15)* — there is no runtime, no replay
  rule, and no v1 out-of-scope list; the engine is explicitly deferred.
- **`documentation.md` is a misleading filename** *(smaller item)* — file deleted.
- **"Workflow" names both the sync orchestrator and the durable runtime** *(smaller item)* — this overload
  was the **reason for the rename**: the sync domain concept is now `orchestration`
  (`orchestration.md`, folder `orchestrations/`), and "workflow" is reserved for the future durable engine.
