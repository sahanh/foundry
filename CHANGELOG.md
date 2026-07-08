# Changelog

Notable changes to the engineering playbook. If a concept you remember is gone, look here for
what replaced it and how to migrate.

---

## 2026-07-08 — AppContext carries established facts; provisioning is the identity flow's use case

`AppContext` gains its contract: **every field on the context is an established fact, never a
pending claim** — new section [app-context.md](./packages/core/app-context.md) → *The Context Is a
Statement of Fact* — with two corollaries: **no operation establishes its own preconditions** (a
missing precondition is rejected at the edge or thrown in the domain, never repaired inline), and
**contexts are assembled at the edge** — the context factory is invoked only in driving adapters
and test setup, never inside `packages/core` (a consumer-facing facade included), and assembly is
**read-only**. The invariant's first application is a new
[identity-and-access.md](./packages/core/identity-and-access.md) → *Identity lifecycle* section:
the domain assumes a `user` actor exists; sign-up/provisioning is a dedicated, system-actor-gated
use case with an explicit edge trigger (IdP webhook or onboarding endpoint), never a step another
flow composes.

Affects code that JIT-provisions users or workspaces during context assembly, any core-resident
context-factory caller (e.g. facade static factories assembling bootstrap contexts), any binding
path that writes, and any handler or domain operation that manufactures a missing precondition (a
user, a tenant, a referenced entity) inline. Re-check against
[app-context.md](./packages/core/app-context.md) → *The Context Is a Statement of Fact* / *Wiring*;
[identity-and-access.md](./packages/core/identity-and-access.md) → *Identity lifecycle* /
*Anti-Patterns*; the new boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → *AppContext* / *Identity & Access* and
[apps/end-here.md](./apps/end-here.md) → *Authentication & actor*; and the
[review protocol](./review.md) lens + the app transport / bootstrap routing row.

---

## 2026-07-08 — Multi-tenancy: tenant isolation moves from Postgres RLS to an application-level scoped seam

Tenant isolation is now enforced **purely at the application level**, with no database dependency. The
earlier two-layer model — an app-level scoped `ctx.system.db` **plus** a Postgres **Row-Level Security**
policy keyed on a `SET LOCAL app.current_tenant` session variable — drops its second layer: **RLS,
`SET LOCAL`, and `app.current_tenant` are removed**. The scoped `ctx.system.db` is now the sole
isolation guarantee — and it is a guarantee, not a convention, because the raw db client is never
reachable from feature code: the only handle a service can touch is the already-scoped one, and the only
unscoped path is the explicit, grep-able elevated context.

Affects any **multi-tenant** application built against the earlier model — specifically any table with a
Postgres RLS policy, or any code relying on the `app.current_tenant` session variable, for tenant
isolation. Single-tenant apps are unaffected. Re-check against:
[multi-tenancy.md](./packages/core/multi-tenancy.md) → *Isolation is enforced at the database seam* /
*Anti-Patterns*; [system/database.md](./packages/core/system/database.md) → *Tenant column*;
[app-context.md](./packages/core/app-context.md) → *Transaction Boundary*;
[working-with-databases.md](./packages/core/working-with-databases.md) → *Tenant scope*;
[code-placement.md](./code-placement.md) → *Tenancy splits by which face you are placing*; the
[review protocol](./review.md) routing table + lens; and
[system/end-here.md](./packages/core/system/end-here.md) → *Multi-tenancy*.

---

## 2026-07-08 — Error-handling strategy + the controller's transport-mapping job (resolves #3)

The playbook gains a cross-cutting **error-handling spine** — new root doc
**[error-handling.md](./error-handling.md)** — and its edge application, new
**[apps/transport-mapping.md](./apps/transport-mapping.md)** — closing [concerns.md](./concerns.md) #3
(the controller's exception→response job was unspecified). The strategy: "error" is **two anticipated
classes** — an input-validation failure (the Zod schema at the boundary, field-keyed) and a domain-rule
failure (the per-feature domain exception, one message) — that **both normalize to one response shape at
the edge** and are **both a handled `4xx`, never a `500`**; a `500` is reserved for the *unanticipated*
fault the framework owns. `transport-mapping.md` makes this concrete for HTTP: one shared error handler,
the response envelope (an array of optionally field-scoped messages, a stable `code`, the `traceId`, only
a safe subset of context), the uniform **`422`** for domain exceptions today, and the
pagination/filtering/sorting contract for collection endpoints (the controller binds params and serializes
`Page<T>`; the service owns the legal filter/sort set). No shared `DomainException` base class and no
per-status failure `kind` were introduced — finer statuses (`403`/`404`/`409`) are a **documented growth
path**.

Affects any server-side transport code that handles errors ad hoc — a per-route `try/catch`, a bespoke or
divergent error body, or a handler that lets a domain/validation failure bubble into a `500` — and any
collection endpoint with a hand-rolled pagination/filter response. Also affects code written against
[identity-and-access.md](./packages/core/identity-and-access.md)'s earlier "authorization failure → `403`"
wording: an authorization denial is a handled domain failure presented as **`422` today** (the `403` is
now the growth path). Re-check against [error-handling.md](./error-handling.md);
[apps/transport-mapping.md](./apps/transport-mapping.md);
[apps/start-here.md](./apps/start-here.md) and [apps/end-here.md](./apps/end-here.md) → *Response & error
mapping* / *Collection endpoints*;
[implementation-validation.md](./packages/core/implementation-validation.md) → *Exception Design*;
[identity-and-access.md](./packages/core/identity-and-access.md) → *Authorization is a domain concern*;
[atomicity.md](./packages/core/atomicity.md) → *The Boundary Lives on `ctx`*; and the
[review protocol](./review.md) lens + the app-handler routing row.

---

## 2026-07-08 — Frontend guidelines: the client UI as a driving adapter, in its own `apps/web/` subtree

The playbook now covers the **frontend**. A client UI is a **driving adapter** like any inbound
entry point — it drives the system (through the API, or `@app/core` from server code) and holds **no
business rules** at the macro scale — so its home is `apps/`. What it adds is a rich *internal*
structure the thin-transport apps never had, documented in a new **[apps/web/](./apps/web/start-here.md)**
subtree: **[component-placement.md](./apps/web/component-placement.md)** (start local, promote to
`shared/` only on a second real signal, with confirmation — the frontend reading of *climb on a real
signal*), **[app-shell.md](./apps/web/app-shell.md)** (app-level layout lives once, in the shared
shell/container), **[visual-system.md](./apps/web/visual-system.md)** (shared treatments + semantic
tokens over per-feature styles), and **[ui-scope.md](./apps/web/ui-scope.md)** (build the requested
surface; propose adjacent surfaces separately). `apps/` is now framed as **two families** of driving
app — server-side transport and the client UI — and the web subtree is a **skippable branch**: work
unrelated to the UI never needs to open it.

In `code-placement.md` the topology's example HTTP-controller app is **renamed `web/` → `api/`** so
`web/` can name the frontend; if you referenced `apps/web/` as "the HTTP controllers", that example is
now `apps/api/`. Affects any frontend code written before this change — check it against the new
subtree: [apps/web/start-here.md](./apps/web/start-here.md) and
[apps/web/end-here.md](./apps/web/end-here.md);
[code-placement.md](./code-placement.md) → *The Topology* / *The frontend is a driving adapter too*;
[apps/start-here.md](./apps/start-here.md) (two families) and [apps/end-here.md](./apps/end-here.md)
(scoped to server-side transport); and the [review protocol](./review.md) taxonomy node **L2c** +
routing rows + lens (business logic never lives *only* in the UI). Known gaps in this first pass —
data fetching, client state, forms, accessibility, and frontend testing — are tracked in
[concerns.md](./concerns.md) #17 (this milestone itself closes #16).

---

## 2026-07-08 — Multi-tenancy: tenant-as-scope on AppContext, isolation enforced at the db seam

Tenant isolation is now a structural convention (resolves [concerns.md](./concerns.md) #13).
The split: **tenant-as-scope** (which isolation boundary an operation runs within) is **infrastructure**,
not domain — the domain is identical for every tenant. It rides top-level on `AppContext` as **`ctx.tenant`**
beside `ctx.actor`, resolved at the edge, and enforced structurally at the single db seam: an **app-level
scoped `ctx.system.db`** (derived the same way as the transaction handle, not a repository) **plus Postgres
RLS** keyed on a per-transaction session variable — so a service never writes `where tenantId` and cannot
forge it. Scoping is the **default**, not an opt-in method: the scoped `ctx.system.db` *is* the handle a
service receives, and the only unscoped path is an explicit, auditable opt-*out* (an elevated context) — a
`tenanted()`-style helper, if any, is sugar over an already-scoped handle, never the safety mechanism.
**Tenant-as-entity** (org / plan / members) stays an ordinary domain feature. Tenant-owned tables
carry a `NOT NULL` tenant-id FK — one **uniform** column name across every such table (`tenantId` by
default; the exact name is a project choice, but it must be the same on all of them so the generic seam
and RLS key on one predictable column) — plus an RLS policy (the tenant table and global reference
tables exempt).
**Single-tenant is the zero-ceremony default**; multi-tenancy is a whole-app, up-front opt-in. Like the actor
`type` set, this is a **framework, not a fixed shape** — the `ctx.tenant` shape and which tables are
tenant-owned are project decisions confirmed with the user. New concern doc
**[packages/core/multi-tenancy.md](./packages/core/multi-tenancy.md)**.

Affects any multi-tenant application, and in particular code that hand-writes a `where tenantId` filter, sets
`tenantId` in a service, constructs an ad-hoc unscoped db client for cross-tenant reads, or has a tenant-owned
table without a `tenantId` column + RLS. Single-tenant apps are unaffected. Re-check against
[multi-tenancy.md](./packages/core/multi-tenancy.md);
[app-context.md](./packages/core/app-context.md) → *The Tenant scope* / *Transaction Boundary*;
[working-with-databases.md](./packages/core/working-with-databases.md) → *Tenant scope*;
[system/database.md](./packages/core/system/database.md) → *Tenant column & RLS*;
[code-placement.md](./code-placement.md) → *Tenancy splits by which face you are placing*;
[apps/end-here.md](./apps/end-here.md) → *Tenant scope*,
[packages/core/end-here.md](./packages/core/end-here.md) → *Database* / *AppContext*,
[system/end-here.md](./packages/core/system/end-here.md) → *Multi-tenancy*; and the
[review protocol](./review.md) routing table + lens.

---

## 2026-07-08 — Identity & access: the actor on AppContext, authN at the edge, authZ in the domain

`AppContext` gains a top-level **`actor`** field — a tagged union discriminated on **`type`**, modeled
minimally now (`user | anonymous`) and designed to grow additively (`service` / `system` on a real
signal). The set of actor `type`s is **project-specific**: each system decides its own consumers.
**Authentication** is an edge concern: the app verifies the credential and resolves a vendor-neutral
actor onto `ctx.actor` before the domain runs; the auth-provider SDK stays out of the core.
**Authorization** is a domain concern, enforced as `shared/validation.ts` guards reading `ctx.actor`
and throwing the feature exception — not an edge-only check, because the domain is multi-consumer. New
concern doc **[packages/core/identity-and-access.md](./packages/core/identity-and-access.md)**, which
also frames how to use it when **building** (confirm the actor types with the user) versus **reviewing**
(ground in the project's real model before judging a diff); extended permissions follow the existing
promotion ladder (inline check → named decision → capability-named policy adapter). This closes
[concerns.md](./concerns.md) #4.

Affects any code that put authorization in a controller or middleware, threaded a `userId` through
service method parameters, or assumed `AppContext` carried no caller identity. Re-check against
[identity-and-access.md](./packages/core/identity-and-access.md) (esp. *Two ways you reach this guide* /
*Reviewing an auth change*);
[app-context.md](./packages/core/app-context.md) → *The Actor* / *Constructor Injection*;
[implementation-validation.md](./packages/core/implementation-validation.md) → *What Belongs There* /
*Cross-Feature Guards*; [apps/end-here.md](./apps/end-here.md) → *Authentication & actor*;
[packages/core/end-here.md](./packages/core/end-here.md) → *Identity & Access* / *AppContext*; and the
[review protocol](./review.md) routing table.

---

## 2026-07-07 — Persistence conventions decided: hard-delete default, enum columns as varchar + z.enum()

Two open persistence questions (concerns #11) are now decided rules. **Deletes:** hard-delete is the
default; **soft-delete** is a signal-driven exception with a prescribed shape — a nullable `deletedAt`
tombstone stamped via a new `ctx.system.helpers.softDelete(values)` and filtered once in the owning
service. **Enum columns:** an enum-valued DB column is a `varchar` guarded by the schema's `z.enum()`,
never Postgres **`pgEnum`**. (Audit trails, the third item under #11, are deliberately left out of scope
at this level.)

Affects any feature that deletes rows (a hand-rolled soft-delete flag, or a `deletedAt` filtered at call
sites) or stores an enum-valued column (especially one backed by `pgEnum`). Re-check against
[packages/core/working-with-databases.md](./packages/core/working-with-databases.md) → *Deletes*,
[packages/core/system/database.md](./packages/core/system/database.md) → *Table Definitions* /
*Anti-Patterns*, [packages/core/app-context.md](./packages/core/app-context.md) → *Persistence timestamps*,
and the new boxes in [packages/core/end-here.md](./packages/core/end-here.md) → *Database* and
[packages/core/system/end-here.md](./packages/core/system/end-here.md) → *Database adapter*.

---

## 2026-07-07 — Orchestrations may own a cross-entity invariant

Previously an orchestration held **no** business rules of its own — every rule lived in a service or a
guard. That left a business invariant spanning **two or more owners' data** (a quota — "plan limit vs.
count of active runs across workspaces" — a cross-owner uniqueness, an aggregate, an overlap) with no
legal home, since no single owner can evaluate it. The rule is now: an orchestration holds no
*single-entity* rules, but it **may own a cross-entity invariant** — a predicate over ≥2 owners' data,
gathered via each side's service and enforced inside its transaction boundary. A new **ownership ladder**
(outcome owner → rule owner → its own feature) decides which feature owns such an orchestration. This
resolves concern #12; the "shared domain service" the docs used to gesture at is not a separate construct.

Affects anyone who avoided an orchestration for a cross-entity rule, parked such a rule ad hoc (a fattened
orchestration or an improvised policy layer), or read "orchestrations hold no rules" as absolute. Re-check
against [packages/core/orchestration.md](./packages/core/orchestration.md) → *Cross-Entity Invariants*,
[packages/core/logic-placement.md](./packages/core/logic-placement.md) → *Where the Promoted Thing Lives*
(the ownership ladder), [packages/core/implementation-validation.md](./packages/core/implementation-validation.md)
→ *Cross-Feature Guards* and the Who-Validates-What table, and the new boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → *Orchestrations* / *Placement & promotion*.

---

## 2026-07-07 — `system/` broadened to home the core's foundational primitives

`packages/core/src/system/` is no longer "driven adapters only." It is now the core's **non-domain
infrastructure**: driven adapters **and** the cross-cutting **foundational primitives** the domain is
built on — the `AppContext` type + `ctx.transaction` factory, the id helpers + prefix registry, and
pagination. These were mandated by the playbook but had no sanctioned home (former concern #6). A
dedicated substrate folder (a `kernel/`) is deferred until a real crowding signal, not created now.
Two rules keep `system/` honest: the **non-domain invariant** (no business rules, no domain vocabulary
anywhere under `system/`) and **two access modes** — adapters are injected via `ctx.system.*`; a
foundational primitive is either a runtime helper on `ctx.system.helpers.*` (e.g. `newId`, now an
injectable id-source alongside `timestamps`) or a direct import (e.g. `entityId`, `Page<T>`, the
`AppContext` type).

Affects any code that placed the `AppContext` type, id helpers, prefix registry, or pagination ad hoc
(a src root, a feature folder, a `utils`/`shared` file), or that minted ids via a direct `newId(...)`
import rather than `ctx.system.helpers.newId(...)`. Re-check against [code-placement.md](./code-placement.md)
→ *Layering* + *Folder rules*; [packages/core/system/start-here.md](./packages/core/system/start-here.md)
→ *Foundational Primitives*; [packages/core/app-context.md](./packages/core/app-context.md) → *Helpers* /
*Injectable helper vs direct import*; [packages/core/identifiers.md](./packages/core/identifiers.md).
Verify via [packages/core/system/end-here.md](./packages/core/system/end-here.md) → *Foundational
primitive* and [packages/core/end-here.md](./packages/core/end-here.md) → *Schemas*.

---

## 2026-07-06 — Constructor-injection test reframed: cohesion decides the constructor, not an entity count

The service-decomposition rule "the entity injected via constructor should be used by every method"
assumed every service owns exactly one entity — leaving `{Entity}CollectionService` (nothing single to
inject) and multi-entity services with no answer. The rule is now stated as what it always was
underneath: a **high-cohesion** check. The constructor declares the domain scope the service's methods
share; arity follows from that scope (one entity, several, or `ctx` only) and is **never prescribed**;
the two smells (unused dependency, repeated parameter) are cohesion diagnostics, not violations of an
entity count. The section formerly titled *Validation: Constructor Injection Test* is now *Validation:
The Constructor Declares the Scope*.

Affects anyone who applied the old one-entity rule — in particular any collection or multi-entity
service designed (or avoided) because of it. Re-check against
[packages/core/service-first-architecture.md](./packages/core/service-first-architecture.md) → *Service
Decomposition → Validation: The Constructor Declares the Scope*,
[packages/core/app-context.md](./packages/core/app-context.md) → *Constructor Injection*, and the
constructor box in [packages/core/end-here.md](./packages/core/end-here.md) → *Services*.

---

## 2026-07-05 — New: logic-placement.md (placement & promotion spine)

A new domain-core guideline, [packages/core/logic-placement.md](./packages/core/logic-placement.md),
now owns the decision of *which construct a piece of business logic lives in* — an inline service
method, its own service, a shared `shared/validation.ts` guard, or an orchestration — and *when to
promote it* as requirements grow. It names two independent axes (service-count altitude vs feature
boundary), the promotion ladder as one lifecycle, the **backfill obligation** (every promotion
re-points the old callers — generalizing orchestration's *stranded callers* rule to every rung), and
where a promoted guard/orchestration lives.

Affects anyone deciding where new service-layer logic goes, or refactoring logic that outgrew its
home — consult it whenever you touch the service layer. **Note:** this pass introduces the spine; the
promotion/granularity detail currently *also* in [service-first-architecture.md](./packages/core/service-first-architecture.md)
(§5), [orchestration.md](./packages/core/orchestration.md) (*When an Orchestration Exists* / *Promotion*),
and [implementation-validation.md](./packages/core/implementation-validation.md) (second-caller
extraction) will be consolidated into the spine in a follow-up — until then those sections remain the
detailed reference. Verify via [packages/core/end-here.md](./packages/core/end-here.md) → *Placement &
promotion*.

---

## 2026-07-05 — Cross-feature access: owner-exported guards for verdicts, orchestrations for data

Two playbook rules deadlocked whenever a business rule needed another feature's data: a feature must
reach another's data *through its service* (working-with-databases), yet a service *never injects or
calls another service* (service-first / orchestration). Cross-feature checks like "is this user
active?" had no legal path. There are now two named legal crossings, and the shared-guard contract
gained a cross-feature tier: a **cross-feature guard returns `void`** (asserts a verdict, throws the
owner's exception), while anything needing the other feature's **data** is an orchestration.

Affects any code where a feature reads another feature's tables, injects another feature's service,
or has a `shared/validation.ts` guard that returns an entity to a cross-feature caller (e.g.
pre-existing `requireAuthor`-style checks). Re-check against
[packages/core/implementation-validation.md](./packages/core/implementation-validation.md#cross-feature-guards)
→ *Cross-Feature Guards*, [packages/core/working-with-databases.md](./packages/core/working-with-databases.md)
→ *Cross-Feature Data Access*, [packages/core/orchestration.md](./packages/core/orchestration.md)
→ *Services Never Call Each Other* & *Promotion*, and the new boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → Validation / Services / Database.

---

## 2026-07-05 — Removed the durable workflow runtime

The playbook no longer references a durable **workflow runtime** / `packages/workflow/` engine. It
was load-bearing but never specified: `atomicity.md` and `orchestration.md` delegated all
long-running/durable work to a `packages/workflow/` package (and a `ctx.task` API) that had no spec —
routing readers to a void. Those references are gone. The name **"workflow"** is no longer reserved,
and `packages/workflow/` is no longer a graduated-package example.

Long-running, multi-step execution that waits, sleeps, retries, or must survive a restart is now
stated plainly as **outside this playbook's current scope** (raise it, per the README's *When in
doubt*) rather than handed to a non-existent engine.

Affects any code or notes that routed durable work to `packages/workflow/`, referenced the "workflow
runtime," or used `ctx.task`. Re-check against [packages/core/atomicity.md](./packages/core/atomicity.md)
→ *What a Transaction Cannot Span* and *When NOT to Open a Boundary*, and
[packages/core/orchestration.md](./packages/core/orchestration.md) → *Reliability: Synchronous
Coordination Only*.

---

## 2026-07-01 — Timestamp helpers take and return the write values

The timestamp helpers changed shape. Previously `ctx.system.helpers.timestamps()` took no argument and returned bare `{ createdAt, updatedAt }` fields that the caller spread into the write (`.values({ ...input, ...ctx.system.helpers.timestamps() })`); `updatedAt()` likewise returned `{ updatedAt }`. Now each helper **takes the write's values and returns them stamped** — `timestamps(values)` / `updatedAt(values)` — and is the sole source of those columns.

Affects any create/update that spread the bare helper result, or that hand-wrote `createdAt`/`updatedAt` alongside it. Re-check against [packages/core/app-context.md](./packages/core/app-context.md) → Persistence Timestamps and the timestamp item in [packages/core/end-here.md](./packages/core/end-here.md).

---

## 2026-07-01 — `checklist.md` decomposed into `end-here.md` seams + a root review protocol

The single root **`checklist.md`** is **gone**. Verification is now split into a per-seam `end-here.md` (the verify companion to each `start-here.md`) plus a root **[review.md](./review.md)** protocol that drives the check.

### Why

One monolithic, feature-shaped checklist made a narrow change carry the full cognitive load, and it had no verification path at all for non-feature edits (a `system/` adapter, an app, a graduated package). A flat checklist is also the wrong *mechanism*: too rigid if atomic, too vague if "read the guides." The verify pass is now an agentic **map → route → validate** protocol over a fixed taxonomy, routing each touched area to only the guideline that owns it.

### What changed

- Each seam now has a **`start-here.md`** (read before) and an **`end-here.md`** (verify after): [packages/core/end-here.md](./packages/core/end-here.md), [packages/core/system/end-here.md](./packages/core/system/end-here.md), [apps/end-here.md](./apps/end-here.md), [packages/end-here.md](./packages/end-here.md).
- **[review.md](./review.md)** is the new root verify pass — persona + map/route/validate + the enumerated taxonomy and routing table. (Name/location provisional.)
- `checklist.md`'s content was redistributed: its per-feature sections → `packages/core/end-here.md`; its system/app checks → the `system/` and `apps/` `end-here.md`; its sanity sweeps → the protocol's always-run cross-cutting sweeps.

### Who is affected

Anyone who linked to or ran **`checklist.md`**, or who relied on it as the post-implementation gate. Read [review.md](./review.md) for the new flow and the `end-here.md` for the seam you touched. The forward pass (`start-here.md`) is unchanged.

---

## 2026-07-01 — `architecture/` → `packages/core/`; new `code-placement.md`, `apps/`, `packages/`

The playbook now mirrors the code topology it prescribes. The `architecture/` folder is gone; a new root **[code-placement.md](./code-placement.md)** is the first thing to read.

### Why

1. **There was no home for inbound entry points.** The playbook described the domain (features) and driven infrastructure (`system/`), but never assigned a folder to *driving* adapters — HTTP controllers, CLI, workers, **MCP servers**. With nowhere correct to put them, they ended up filed beside feature folders. `code-placement.md` gives them a home: `apps/`.
2. **`src/` and folder names were overloaded.** The domain is a reusable **core package** meant to sit beside an integration framework (which ships its own `src/`), so it needs a package identity, not a generic `src/`. And the guidelines described `packages/core` while explaining it in a folder called `architecture/` — the names didn't mirror the code. Now they do.

### What changed conceptually

The repo is `apps/` + `packages/`. `packages/core` is the domain hexagon (domain layer + its driven infrastructure in `core/src/system/`). Adapters are classified by **direction**: *driven* (the domain calls out to them — db, logger, clock) live in `core/src/system/` and graduate to their own `packages/<name>/` on a real signal; *driving* (they call into the domain — HTTP, CLI, MCP) live in `apps/`. A single placement rule (Q1–Q3) decides where any code goes. See [code-placement.md](./code-placement.md).

### Where things moved

| Before | After |
|---|---|
| `architecture/` (all docs) | `packages/core/` |
| `architecture/start-here.md` (macro sections) | `code-placement.md` (Layering, Folder Organization, File Structure) |
| `system/` | `packages/core/system/` |
| — | `code-placement.md` (new, root) |
| — | `apps/start-here.md`, `packages/start-here.md` (new stubs) |

`checklist.md`, `CHANGELOG.md`, and `README.md` stay at the root; their links were repathed.

### Migrating your project

This restructure is about the **playbook's own folders** — but the model it formalizes may not match how your project is laid out. Run this self-audit against your codebase (read [code-placement.md](./code-placement.md) first):

- [ ] For each direct child of `src/`, classify it with the criteria: a **feature** (domain), **driven infrastructure**, or an **inbound entry point** (transport).
- [ ] Any inbound entry point (HTTP, CLI, queue consumer, tool server) sitting beside your feature folders → relocate it to `apps/`. It is a driving adapter, not domain and not `system/`.
- [ ] Move your domain features into `packages/core/src/`, and `src/system/` into `packages/core/src/system/`.
- [ ] Any driven adapter that is heavy, reused beyond the core, or owns its own lifecycle → consider graduating it to its own `packages/<name>/`.
- [ ] Verify the dependency direction end to end: `apps → core → driven infrastructure`. Nothing inbound should live inside the core; the core should import no app.
- [ ] At each entry point, reuse the core's schemas at the boundary — don't redefine input shapes that then drift from the domain's real constraints.

---

## 2026-07-01 — Injected clock & domain-stamped timestamps

Time is now an injected system adapter, not `new Date()`. Introduced:

- **`ctx.system.clock`** — the single injectable now-source for every domain time read.
- **`ctx.system.helpers`** — `timestamps()` (create) and `updatedAt()` (update) to stamp rows from
  that clock.
- **A schema rule** — domain timestamp columns are `NOT NULL` with no DB default (no `defaultNow()`,
  no `$defaultFn`); timestamps are stamped in the domain, never by the database.

If your code predates this — it reaches for `new Date()` in services, relies on `defaultNow()` or a
column default for `createdAt`/`updatedAt`, or mocks time with a global `vi.setSystemTime` — you need
to bring it into line. We're not prescribing a migration script; the guidelines are the source of
truth. Read these sections and check your code against them:

- [packages/core/app-context.md](./packages/core/app-context.md) → **The Clock** and **Persistence Timestamps**
- [packages/core/system/database.md](./packages/core/system/database.md) → **Timestamps** (and the matching anti-pattern)
- [packages/core/end-here.md](./packages/core/end-here.md) → **Database** and **AppContext** (was `checklist.md` §7/§8)

---

## 2026-07-01 — "Workflow" renamed to "Orchestration"

The domain-layer concept formerly called a **workflow** is now an **orchestration**.

If you came looking for `workflow-orchestration.md`, the `workflows/` folder, or the
`.workflow.ts` suffix and didn't find them — this is why. See
[architecture/orchestration.md](./packages/core/orchestration.md) for the full concept.

### Why

1. **The word was overloaded.** "Workflow" implies long-running / durable / infrastructure. That
   dragged an execution-model meaning into what is purely a *domain coordination* concept.
2. **The trigger was stated as a symptom.** A workflow was described as "more than one service."
   The real, principled boundary is **altitude / coordination** — duration is *not* a domain
   concern, it belongs to the integration/infrastructure layer.

### What changed conceptually

An orchestration is now framed as a **service type** — the same building block as a service (a
constructor-injected class taking `AppContext`, same lifecycle rules) — distinguished by exactly
two things:

- It is the **only** domain unit allowed to inject and coordinate other services.
- It **owns no table** (services remain the database seam; the single-owner-per-table rule is
  unchanged).

Two clarifications were added:

- **Triggered by altitude, not duration.** It exists because a use case coordinates 2+ services —
  never because it "runs long." A single service method may legitimately take minutes.
- **Promotion protocol.** When a single-service operation grows a second-service concern, it
  *graduates* to an orchestration. At that moment you must re-evaluate the direct callers of the
  superseded service method so none silently skip the new coordination.

### Migration guide (if you already use "workflows")

| Before | After |
|---|---|
| `architecture/workflow-orchestration.md` | `architecture/orchestration.md` |
| `workflows/` folder | `orchestrations/` folder |
| `*.workflow.ts` | `*.orchestration.ts` |
| concept: "workflow" | concept: "orchestration" |
| name: `ClaimTaskWorkflow` (or a loose `claimTask` function) | `ClaimTaskOrchestration` (a class) |
| "workflow" = durable/long-running execution | not a term the playbook uses |

Steps:

1. **Rename the folder** `workflows/` → `orchestrations/` and the suffix `.workflow.ts` →
   `.orchestration.ts` in each feature.
2. **Rename the unit** to `{Process}Orchestration`, named by the use case it coordinates
   (e.g. `ClaimTaskOrchestration`). Group related multi-service use cases as methods on one
   orchestration; split on the second signal — same granularity ladder as services.
3. **Make it service-shaped** (recommended): if your workflows were loose functions, turn them
   into constructor-injected classes taking `AppContext`, consistent with services. Behaviour is
   unchanged; only the shape becomes uniform.
4. **No rule changes for services.** Services still never inject or call each other — coordination
   still goes *up* into the orchestration. Validation in an orchestration is still thin
   (inputs + existence checks), then delegate.
5. **Reconsider any "workflow" you created because something runs long.** If it coordinates only
   one service, it is **not** an orchestration — it's a service method. How it executes (inline,
   job, durable) is an integration decision, made per consumer.
6. **Update references** in docs/code: cross-links to `orchestration.md`, and the
   [packages/core/end-here.md](./packages/core/end-here.md) **Orchestrations** section (was `checklist.md`).

### Scope of this change

This change is vocabulary and structure in the domain layer only.
