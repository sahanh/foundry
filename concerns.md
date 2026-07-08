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
clock (`app-context.md` → Persistence timestamps, `system/database.md:22`) — and the type-level enum question
(string-literal unions + `z.enum()`). **Decided 2026-07-07:** **hard-delete is the default**, with soft-delete
a signal-driven exception using a nullable `deletedAt` tombstone stamped via `ctx.system.helpers`
(`softDelete(values)`) and filtered once in the owning service (`working-with-databases.md` → Deletes,
`system/database.md` → Table Definitions); and the **DB-column** enum question — store a `varchar` guarded by
the schema's `z.enum()`, never `pgEnum` (`system/database.md` → Table Definitions / Anti-Patterns).

Still undecided — deliberately out of scope at the persistence-convention level: **audit trails** for domain
data (a row-level history of who changed what, when). Not decided here; raise it as its own concern if a
feature needs one. A real "who changed it" trail can now attribute the change to `ctx.actor` (the caller
identity resolved on `AppContext` — see `identity-and-access.md`, resolved #4); the audit-trail convention
itself is what remains unwritten.

**Anchor:** `working-with-databases.md`, `system/database.md`, `app-context.md`.

## Scaling / five-year pressure points

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
  inherit the scoped `ctx.system.db` (`multi-tenancy.md`, resolved #13), never a raw client; its tenant
  scoping is structural, not per-query.

**Anchor:** `working-with-databases.md`, `code-placement.md`, `packages/core/start-here.md`.

## Frontend

### 17. Frontend discipline beyond structure is unwritten — `open`

The `apps/web/` subtree (added 2026-07-08, resolving #16) covers the frontend's **structure**: component
placement & promotion, app shell / container ownership, the visual system, and UI scope. It does **not**
yet cover the rest of the frontend discipline — **data fetching** (the client/server boundary, caching,
loading/error states), **client state management**, **forms & client-side validation** (in particular how
a rule *mirrored* in the UI stays derived from the core's Zod schema rather than re-encoded, so the core
remains the single source of truth), **accessibility**, and **frontend testing** (component / interaction
/ e2e — with their own `end-here` boxes and a `review.md` node). Until these are written, such work has no
convention to check against; raise the specific gap when a feature needs one, per "document, don't
silently decide."

**Anchor:** `apps/web/start-here.md`, `apps/web/end-here.md`.

## Smaller items

- **Test coverage & lifecycle** — `open`. Controller/e2e tests are deferred but nothing tracks when "later"
  arrives; test-DB lifecycle (migrate/reset between runs) is unspecified. Verify against `testing.md`'s
  current state.

---

## Resolved (no longer valid)

Dropped from the backlog because the restructures closed them. Listed so an old concern can be traced.

- **Controllers' transport-mapping job is unspecified** *(was #3)* — resolved 2026-07-08. The controller's
  one legitimate piece of logic — turning a domain outcome into a transport response — now has a
  convention, derived from a cross-cutting **error-handling strategy**. "Error" is two anticipated classes
  (an input-validation failure at the Zod boundary, field-keyed; a domain-rule failure, the per-feature
  exception, one message) that **both normalize to one response shape** and are **both a handled `4xx`,
  never a `500`** — a `500` is only the unanticipated fault. The HTTP realization fixes the response
  envelope, the uniform `422` for domain exceptions, and the pagination/filtering/sorting contract for
  collection endpoints (the controller binds params and serializes `Page<T>`; the service owns the legal
  filter/sort set). Two things are deferred — documented, not decided: a shared `DomainException` base
  class (deliberately **not** introduced — the guideline stays one-exception-per-feature) and a per-status
  failure `kind` for finer statuses (`403`/`404`/`409`), a **growth path**. See `error-handling.md`,
  `apps/transport-mapping.md`, `apps/start-here.md` / `apps/end-here.md` → *Response & error mapping* /
  *Collection endpoints*, and the 2026-07-08 changelog entry.
- **Frontend had no guidelines** *(was #16)* — resolved 2026-07-08 by the new **`apps/web/`** subtree: the
  client UI is a driving adapter with its own guidance for component placement & promotion, app shell /
  container ownership, the visual system, and UI scope. The frontend's *remaining* discipline (data
  fetching, client state, forms, accessibility, testing) stays **open — now tracked as #17**, not closed
  here. See `apps/web/start-here.md`, `apps/web/end-here.md`, and the 2026-07-08 changelog entry.

- **Multi-tenancy is not in the playbook** *(was #13)* — resolved 2026-07-08. Tenant isolation is now a
  structural convention, not per-query discipline. Tenant-as-**scope** is infrastructure (the domain is
  identical per tenant): `ctx.tenant` rides top-level on `AppContext` beside `ctx.actor`, resolved at the
  edge and enforced at the single db seam — a **default-scoped** `ctx.system.db`, so a service never writes
  `where tenantId` and cannot forge it (scoping is the default; the only unscoped path is an explicit,
  auditable opt-out). Tenant-owned tables carry a `NOT NULL` tenant-id FK — one **uniform**, project-named
  column (`tenantId` by default); the tenant table and global reference tables are exempt. (The isolation
  model is now application-level only — the Postgres RLS layer this originally shipped with was removed
  2026-07-08; see the changelog.) Tenant-as-**entity** (org / plan /
  members) stays an ordinary domain feature. Single-tenant is the zero-ceremony default; multi-tenancy is a
  whole-app opt-in, **framework-not-shape** (the `ctx.tenant` shape, which tables are tenant-owned, and the
  column name are project decisions confirmed with the user). Two deferrals are deliberate ("documented, not
  silently decided"): **how** the edge derives the tenant (subdomain / header / membership / actor claim) is
  project-specific, and the **cross-tenant / platform-admin** unscoped path is specified in shape but depends
  on the deferred `system` actor type (#4's ladder). The cross-feature **read layer** — the highest-risk
  tenant-leak site — remains its own open concern (#14). See `multi-tenancy.md`, `app-context.md` → *The
  Tenant scope*, `system/database.md` → *Tenant column*, `working-with-databases.md` → *Tenant scope*,
  and the 2026-07-08 changelog entries.
- **Authentication and authorization have no home** *(was #4)* — resolved 2026-07-08. `AppContext` now
  carries a top-level **`actor`** (a tagged union discriminated on `type` — `user | anonymous` now, the
  type set project-specific and designed to grow). **Authentication** is an edge concern (the app verifies the credential and resolves a vendor-neutral
  actor onto `ctx.actor`; the provider SDK stays out of the core); **authorization** is a domain concern,
  enforced as `shared/validation.ts` guards reading `ctx.actor`, because the domain is multi-consumer.
  Two deferrals are deliberate ("documented, not silently decided"): a `system/` credential-verification /
  policy adapter, and an RBAC / policy engine — both reached on a real signal via the extended-permissions
  ladder. See `identity-and-access.md`, `app-context.md` → *The Actor*, `apps/end-here.md` →
  *Authentication & actor*, and the 2026-07-08 changelog entry.

- **Cross-entity business rules have no home** *(was #12)* — resolved 2026-07-07. An orchestration may now
  own the one rule no single owner can evaluate: a **cross-entity invariant** — a predicate over ≥2 owners'
  data, gathered via each side's service and enforced inside its transaction boundary. Which feature owns
  such an orchestration is decided by an ownership ladder (outcome owner → rule owner → its own feature).
  See `orchestration.md` → *Cross-Entity Invariants*, `logic-placement.md` → *Where the Promoted Thing
  Lives*, and the 2026-07-07 changelog entry.

- **Cross-cutting helpers have no legal home under the folder rules** *(was #6)* — resolved 2026-07-07 by
  broadening `system/` from "driven adapters only" to the core's **non-domain infrastructure**: adapters
  **plus** foundational primitives (the `AppContext` type + `ctx.transaction` factory, id helpers + prefix
  registry, pagination). A dedicated `kernel/` folder is deferred until a real crowding signal. Governed by
  the non-domain invariant + two access modes (`ctx.system.helpers.*` vs direct import). See
  `code-placement.md` → *Layering* / *Folder rules*, `system/start-here.md` → *Foundational Primitives*,
  `app-context.md` → *Injectable helper vs direct import*, and the 2026-07-07 changelog entry.

- **Collection services break the constructor-injection test** *(was #5)* — resolved 2026-07-06 by
  reframing the one-entity test as a high-cohesion guideline
  (`service-first-architecture.md` → *Validation: The Constructor Declares the Scope*): the constructor
  declares the domain scope the methods share, arity is derived from cohesion (one entity, several, or
  `ctx` only) and never prescribed — so a collection service no longer breaks anything.

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
