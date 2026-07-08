# Multi-Tenancy

How one deployment serves many tenants without a tenant ever seeing another's data — and without
every service re-implementing that isolation by hand. Like the database and auth, tenancy is
infrastructure the playbook cannot avoid once a product needs it; but *which* boundary an operation
runs within is resolved at the **edge** and enforced at the **database seam**, so the domain stays
unaware of it. This doc steers the placement and enforcement decisions; it does **not** prescribe a
tenant model's shape — that is yours to fill in (see *Two ways you reach this guide*).

The concern this exists to kill: tenant isolation re-implemented as per-query discipline. One missed
`where tenantId` across five years of query sites is not a bug, it is a breach. **Tenancy must be a
structural convention, not a habit** — enforced once, at a seam a service cannot bypass.

## Two faces of "tenant" — scope vs entity, two homes

"Tenant" names two different things that live in two different layers. Keep them apart:

- **Tenant-as-scope — "*which* boundary does this operation run within?"** — an isolation concern, and
  pure **infrastructure**. It is *not* domain logic: the domain is byte-for-byte identical for every
  tenant — a task is a task, an order is an order, whoever owns it. The scope is ambient operation
  metadata carried as `ctx.tenant`, resolved at the edge, enforced at the db seam. Governed by the
  `system/` **non-domain invariant** ([system/start-here.md](./system/start-here.md) → *Foundational
  Primitives*). This is what the rest of this doc is about.
- **Tenant-as-entity — the org / workspace / account itself** (its plan, members, billing, settings).
  This is an **ordinary domain feature** with its own service, schema, and tables, no different from
  any other. It owns what a plan *permits*, who belongs to a tenant, and every rule about tenants —
  because those *are* business rules.

So "is multi-tenancy a domain problem or an implementation problem?" has a two-part answer: the
**isolation mechanism** is implementation (system-level, this doc); the **tenant entity** is domain (a
feature). This is the same split the playbook already draws elsewhere — a job queue is a driven
*system* adapter to enqueue but a driving *app* to consume; a notification's *delivery* is a driven
adapter while the *decision to notify* is a domain rule ([code-placement.md](../../code-placement.md)).
Tenancy splits the same way.

Tenant-as-scope is **orthogonal to the actor** ([identity-and-access.md](./identity-and-access.md)):
the actor is *who* is calling, the tenant is *which boundary* the call runs within. They are distinct
axes — but they share one seam: **both are resolved at the edge and set on `AppContext` during
assembly.** `ctx.tenant` sits beside `ctx.actor` as a sibling.

## Single-tenant is the default

A single-tenant application carries **no `ctx.tenant`, no scoped `ctx.system.db`, no `tenantId`
columns** — zero ceremony, zero overhead. Most projects using this playbook are single-tenant and
should stay that way; nothing here applies to them.

Multi-tenancy is a **whole-application, up-front decision**, not an incremental per-feature climb.
Unlike soft-delete (adopted one entity at a time on a real signal), tenant isolation cannot be
retrofitted cheaply — bolting `tenantId` + a scoped seam onto five years of tables *is* the migration
pain this convention exists to prevent. So: decide it at the start. And **once the application is multi-tenant,
the conventions below are mandatory and structural** — there is no per-query middle ground, because
per-query is exactly the failure mode.

## Two ways you reach this guide

Like [identity-and-access.md](./identity-and-access.md), this guide is unusual: most of the playbook
fixes a convention that is identical in every project, but the *content* of a tenancy model is
**project-specific** — which tables are tenant-owned, how the tenant is derived from a request, and
what `ctx.tenant` carries all differ from one product to the next. So how you use this doc depends on
why you are here.

- **Building** — a new multi-tenant product, or tenancy set up for the **first time**. Which tables are
  tenant-scoped (vs global reference data), what `ctx.tenant` carries beyond the id, the tenant-id
  **column name**, and how the edge derives the tenant are decisions *this* project makes. Treat it like
  a domain boundary: **propose the scoping model — the tenant-owned tables, the `ctx.tenant` shape, the
  tenant column name, the derivation source — and confirm it with the user before building**, the same
  "decide first, confirm explicitly" rule services and actors follow
  ([service-first-architecture.md](./service-first-architecture.md)). One constraint on the column name:
  it must be **the same on every tenant-owned table** (`tenantId` is the recommended default) — the
  generic scoped seam keys on one predictable column. The patterns below — tenant on `ctx`,
  isolation at the db seam, resolve-at-the-edge — are the *shape*; the specifics are yours.
- **Reviewing** — a diff in a system where tenancy is already set up. Do **not** grade it against this
  doc as a flat checklist. First establish the project's *actual* tenancy model (which tables carry the
  tenant column and what it is named, what `ctx.tenant` holds), then judge the change against that. See
  *Reviewing a tenancy change* below.

## The tenant scope — `ctx.tenant`

The tenant scope is carried as a **top-level field on `AppContext`, beside `ctx.actor`** — ambient
operation metadata, not something the domain calls *out* to, so it is **not** under `ctx.system.*`
(the field mechanics live in [app-context.md](./app-context.md) → *The Tenant scope*; this doc owns
its meaning). It is **read-only** and set only at assembly; a service reads it (rarely needs to) but
**never sets, overrides, or threads it** through a constructor or method parameter — that is the
parameter-repetition smell, exactly as for the actor.

Its **type is a `system/` foundational primitive** reached by **direct import** (a type position, no
`ctx` — the same rule as the `AppContext` and `Actor` types). It carries **no business rules**.

**The shape is project-specific.** `ctx.tenant` carries, at minimum, the **tenant isolation id** — the
opaque key the db seam scopes on. Whatever else a product puts on it — a plan/tier token, a region, a
data-residency zone — is decided when tenancy is set up and confirmed with the user, exactly like the
actor `type` set. One guardrail keeps it honest, and it is the **non-domain invariant**:

> `ctx.tenant` carries **opaque tokens only** — the id, and at most flat tier/region strings, the same
> way `Actor` carries `roles: readonly string[]` without encoding what a role *means*. It must **not**
> carry a structured **capability matrix** (a plan's concrete limits, feature flags, quotas). What a
> plan *permits* is a domain rule owned by the tenant/plan feature — read it via that feature's service
> when a rule needs it (a quota is a **cross-entity invariant** enforced in an orchestration, see
> [orchestration.md](./orchestration.md#cross-entity-invariants)), not baked into the ambient scope.

The litmus mirrors the actor's: put on `ctx.tenant` only what the **isolation seam** needs to scope a
query; anything a **domain rule** needs to *decide* stays in the tenant feature.

## Resolution is an edge concern

The app, not the domain, works out which tenant an operation belongs to — the same discipline that
keeps the auth provider at the edge and the db vendor inside `system/db`. The flow mirrors `ctx.actor`
resolution ([identity-and-access.md](./identity-and-access.md) → *Authentication is an edge concern*):

1. The request arrives at a driving adapter (`apps/`).
2. The app derives the tenant from the request and sets `ctx.tenant` during `AppContext` assembly,
   **before any service or orchestration runs**.
3. Every service beneath runs already scoped — it never re-derives or re-checks the tenant.

**How** the edge derives the tenant is **project-specific**: a subdomain (`acme.app.com`), a path
segment, a header, a claim on the resolved `ctx.actor`, or a membership lookup (this user belongs to
this tenant). That derivation is where authentication and tenancy meet — the tenant a request may act
within is a function of *who* is calling — but the mechanism is the edge's to choose and confirm with
the user, not fixed here.

A request that resolves to **no** tenant when one is required is rejected at the edge, never passed to
the domain with an absent scope — the same shape as an authentication failure.

## Isolation is enforced at the database seam

The guarantee — *a service cannot read or write another tenant's rows* — is enforced structurally at
the **one db seam every service already uses (`ctx.system.db`)**, and a service participates in none of
it.

**The scoped client.** When `ctx.tenant` is present, `ctx.system.db` is assembled **already scoped**:
it injects the tenant predicate into every read and stamps `tenantId` on every insert. This is the
**same derivation model as the transaction handle** — `ctx.transaction` already derives a `ctx` whose
`system.db` *is* the open transaction, and services stay unaware ([app-context.md](./app-context.md) →
*Transaction Boundary*). Tenant scoping rides the identical rail. It is **not a repository** between
service and db ([working-with-databases.md](./working-with-databases.md)) — the service still calls
`ctx.system.db` directly and owns its writes; the scope is a property of how the client was assembled.

This one seam is a **guarantee, not a convention** — and it needs no database-level backstop to be one,
because it is the **only database handle feature code can reach**. The raw driver is never injected
through `ctx.system.*` and never importable inside a feature, so there is no hand-written join or raw
query that can slip past the scope: the escape hatch simply does not exist in domain code. Scoping is
**ambient** — assembled once at the seam, with nothing to call to turn it on and so nothing to forget.
`tenantId` is **stamped by the seam** from `ctx.tenant`, never by a service or a column default, so a
service cannot forge or override it. And the **only** unscoped path is the loud, grep-able elevated
context below — one auditable escape, not an ad-hoc raw client. Isolation is therefore
**database-agnostic**: it rests on how the seam is assembled, not on Postgres RLS, a session variable,
or anything the storage engine must enforce.

The result is the whole point: **a service never writes `where tenantId`, never sets `tenantId` on an
insert, and cannot forge or override the scope.** The tenant id cannot be tarnished at the service
level because the service never touches it.

### Scoping is the default, not opt-in

The scope is **ambient — never a method a service opts into.** The `ctx.system.db` a service receives *is*
the scoped handle; there is nothing to call to "turn scoping on," so there is nothing to forget. The
safety-critical binding — the tenant scope itself — is bound when the **ctx / `ctx.transaction` factory**
assembles the handle, for the whole scoped context, **never inside a query helper**. If a method were what activated it, forgetting
that method would leak — which is the very per-call discipline this convention exists to kill. The only way
out is the **explicit opt-*out*** — the elevated context above (or a loud, grep-able `db.unscoped()` /
`db.crossTenant()`), rare and reviewed — never the base handle.

A `tenanted()`-style helper *may* exist, but only as **ergonomic sugar over the already-scoped handle** — an
explicit `where tenantId` for index-friendliness or readability, layered on a query that is already safe. It
must never be the thing that *makes* a query safe. The moment scoping is opt-*in*, "one missed
`.tenanted()`" is the same breach as "one missed `where tenantId`." Which fields `ctx.tenant` carries and
what such a helper is named are project decisions; *that scoping is the default* is not.

The table-level mechanics — the tenant column (**one uniform name across every tenant-owned table**,
`tenantId` by default) and which tables are exempt — live in
[system/database.md](./system/database.md) → *Tenant column*.

## The one unscoped path

Some operations legitimately cross tenants: a platform-admin console listing all tenants, a billing job
aggregating across the fleet, a support tool. These run under an **explicit elevated context** —
assembled the same controlled way as any other `AppContext`, but deliberately *without* a tenant scope
— an unscoped `ctx.system.db` that may read across tenants. It is a **named, sanctioned exception**, not an ad-hoc
unscoped client a service constructs for itself. Constructing an unscoped db to "just this once" read
across tenants is the breach this whole convention exists to prevent.

This elevated context is the tenancy peer of the deferred `system` actor type
([identity-and-access.md](./identity-and-access.md) → *Growth path*): a cron/worker/admin caller acting
outside a single tenant. Until that principal is specified, the unscoped path is **available but
under-specified** — assemble it explicitly and log every use; the full convention (who may assume it,
how it is audited) lands with the `system` actor.

## Reviewing a tenancy change

When the [review protocol](../../review.md) routes a tenancy-touching diff here, remember the tenancy
model is **project-specific** — you cannot grade it in the abstract. Ground the review in what the
system *actually* has, then judge the diff:

1. **Establish the existing model first.** From the code: which tables carry `tenantId`, which are
   global/exempt, what `ctx.tenant` holds, and how the edge derives it. If tenancy is
   not set up at all, this is a first-time setup, not a review — see *Two ways you reach this guide*.
2. **Read the diff against that model.** A new tenant-owned table — does it have `tenantId` and rely on
   the scoped seam? A new query — does it rely on the scoped seam rather than a hand-written filter? A cross-tenant read — does
   it go through the explicit elevated context, or did someone build an unscoped client?
3. **A gap is usually a blocker, not a question.** Unlike an auth gap (which may be an intentional
   omission), a tenant-owned table missing `tenantId` / not on the scoped seam, or a hand-written
   tenant filter, is a structural hole in the isolation guarantee — treat it as a blocker. The one genuine judgment call is
   *whether a new table is tenant-owned or global* — that, ground in the model and raise if unclear.

## Anti-Patterns

- **Per-query tenant discipline** — a service writing `where tenantId = …` (or setting `tenantId` on an
  insert) by hand. The one query that forgets leaks the table; isolation must be at the seam, not the
  call site.
- **Opt-in scoping** — a `tenanted()` (or similar) method that is the thing which *makes* a query safe,
  leaving the base `ctx.system.db` unscoped by default. Safety is the default; the cross-tenant escape is
  the explicit, auditable one — not the reverse. Such a helper is legitimate only as sugar over an
  already-scoped handle.
- **An ad-hoc unscoped client** — constructing a db handle without the tenant scope to read across
  tenants, instead of the explicit elevated context. This is the breach, however local it looks.
- **A capability matrix on `ctx.tenant`** — carrying a plan's concrete limits/flags in the ambient
  scope. That is domain vocabulary; it belongs to the tenant/plan feature and violates the `system/`
  non-domain invariant on `ctx.tenant`.
- **Threading the tenant through parameters** — passing a `tenantId` argument into service methods
  instead of the scope living on `ctx`. Same parameter-repetition smell as threading the actor.
- **Retrofitting tenancy per-feature** — treating multi-tenancy as an incremental climb. It is a
  whole-app, up-front decision; a half-tenant-scoped schema is a half-open door.

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Database* / *AppContext*, and
[system/end-here.md](./system/end-here.md) → *Multi-tenancy* for the table & scoped-column mechanics.
