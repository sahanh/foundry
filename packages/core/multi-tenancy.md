# Multi-Tenancy

One deployment, many tenants, none seeing another's data. **The rule: isolation is structural — enforced once, at a seam a service cannot bypass, never per-query discipline.** The model's shape is project-specific (*Two ways* below); this doc fixes placement and enforcement.

## Two faces of "tenant" — scope vs entity, two homes

- **Tenant-as-scope** — *which* boundary does the operation run within? Pure infrastructure: the domain is byte-for-byte identical per tenant. Ambient `ctx.tenant` — edge-resolved, seam-enforced, under the `system/` non-domain invariant ([system/start-here.md](./system/start-here.md)) — this doc.
- **Tenant-as-entity** — the org/workspace/account (plan, members, billing, settings): an **ordinary domain feature** — own service, schema, tables; its rules *are* business rules.

Scope is **orthogonal to the actor** (*who* vs *which boundary*, [identity-and-access.md](./identity-and-access.md)) but shares its edge seam, `ctx.tenant` beside `ctx.actor`.

## Single-tenant is the default

A single-tenant app has **no `ctx.tenant`, no scoped db, no `tenantId` columns** — zero ceremony. Most projects here are single-tenant; nothing below applies.

Multi-tenancy is a **whole-application, up-front decision**, never a per-feature retrofit (why: a half-scoped schema is a half-open door). Once multi-tenant, everything below is **mandatory and structural**.

## Two ways you reach this guide

Per [identity-and-access.md](./identity-and-access.md) → *Two ways you reach this guide*:

- **Building**: **propose the scoping model — tenant-owned tables (vs global reference data), the `ctx.tenant` shape, the column name, the derivation source — and confirm with the user before building.** One constraint: one column name on **every** tenant-owned table (`tenantId` recommended) — the scoped seam keys on it.
- **Reviewing**: never a flat checklist — establish the project's model first (*Reviewing a tenancy change*).

## The tenant scope — `ctx.tenant`

Field mechanics: [app-context.md](./app-context.md) → *Actor & Tenant*; this doc owns the meaning.

`ctx.tenant` carries at minimum the **tenant isolation id** the seam scopes on; anything more (plan tier, region, residency zone) is a setup decision, confirmed with the user. Guardrail (the non-domain invariant): **opaque tokens only**, never a structured **capability matrix** (limits, feature flags, quotas). What a plan *permits* is domain — the tenant/plan feature's, read via its service; a quota is a **cross-entity invariant** in an orchestration ([orchestration.md](./orchestration.md#cross-entity-invariants)). Litmus: scoping needs ride on `ctx.tenant`; domain-rule inputs stay in the tenant feature.

## Resolution is an edge concern

The app derives the tenant and sets `ctx.tenant` during `AppContext` assembly, **before any service runs** — the `ctx.actor` flow ([identity-and-access.md](./identity-and-access.md) → *Authentication is an edge concern*). Services run already scoped, never re-deriving or re-checking.

Derivation is project-specific — subdomain (`acme.app.com`), path segment, header, actor claim, membership lookup — confirmed with the user. No tenant when required → rejected at the edge like an authentication failure, never passed down unscoped.

## Isolation is enforced at the database seam

The guarantee — *a service cannot read or write another tenant's rows* — lives at the seam every service already uses (`ctx.system.db`); the service participates in none of it:

- **The scoped client.** With `ctx.tenant` present, `ctx.system.db` is assembled **already scoped**: the tenant predicate injected into every read, `tenantId` stamped on every insert — from `ctx.tenant`, never by a service or a column default. Derived like the transaction handle ([app-context.md](./app-context.md) → *Transaction Boundary*); not a repository ([working-with-databases.md](./working-with-databases.md)) — the service still owns its writes on `ctx.system.db`. **A service never writes `where tenantId`, never sets `tenantId`.**
- **A guarantee, not a convention.** The scoped seam is the **only** db handle feature code can reach: the raw driver is never on `ctx.system.*` nor importable in a feature — no hand-written join or raw query slips past. Database-agnostic — seam assembly, not Postgres RLS or a session variable.
- **Default, never opt-in.** The scope binds where the ctx/`ctx.transaction` factory assembles the handle — never inside a query helper — nothing to call, nothing to forget. A `tenanted()`-style helper is legitimate only as **sugar over the already-scoped handle**, never what *makes* a query safe. The only exit is the explicit opt-*out* below (a loud, grep-able `db.unscoped()`/`db.crossTenant()`) — never the base handle. Helper naming and `ctx.tenant` fields are project decisions; scoping-as-default is not.

Table mechanics (uniform tenant column, exempt tables): [system/database.md](./system/database.md) → *Tenant column*.

## The one unscoped path

Legitimate cross-tenant operations — platform-admin console, fleet-wide billing, support tooling — run under an **explicit elevated context** — assembled the same controlled way, deliberately *without* a tenant scope — a **named, sanctioned exception**. An ad-hoc "just this once" unscoped client is the breach itself.

The tenancy peer of the deferred `system` actor ([identity-and-access.md](./identity-and-access.md) → *Growth path*): until it exists the path is **available but under-specified** — assemble explicitly, log every use; who may assume it and how it's audited land with the `system` actor.

## Reviewing a tenancy change

Ground before grading:

1. **Establish the existing model** from the code: which tables carry `tenantId`, which are global/exempt, what `ctx.tenant` holds, how the edge derives it. Tenancy absent → first-time setup (*Two ways*), not review.
2. **Read the diff against it.** New tenant-owned table: column present, on the scoped seam? New query: on the seam, no hand-written filter? Cross-tenant read: through the elevated context?
3. **A gap is usually a blocker, not a question.** Unlike an auth gap (possibly intentional), a tenant-owned table missing `tenantId` or off the seam, a hand-written tenant filter, or an ad-hoc unscoped client is a **structural hole in the isolation guarantee**. One judgment call: tenant-owned vs global for a new table — ground in the model, raise if unclear.

---

**Verify:** [end-here.md](./end-here.md) → *Database* / *AppContext*; [system/end-here.md](./system/end-here.md) → *Multi-tenancy*.
