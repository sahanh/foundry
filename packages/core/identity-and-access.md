# Identity & Access

Who is calling, and what may they do. The vendor (Clerk, WorkOS, Cognito, BetterAuth) is an edge detail; this doc fixes placement, not provider. **AuthN ("who is calling?") is an edge concern; authZ ("may this actor do this?") a domain concern.**

## Two ways you reach this guide

The model's *content* is **project-specific** — which actor types exist, what a permission means.

- **Building**: **propose the actor types and permission model; confirm with the user before building** (decide-first rule, [service-first-architecture.md](./service-first-architecture.md)).
- **Reviewing**: never a flat checklist — ground the project's model first (*Reviewing an auth change*).

## The Actor — `ctx.actor`

Field mechanics: [app-context.md](./app-context.md) → *Actor & Tenant*. Meaning: a **total, discriminated union** keyed on `type`, always present — unauthenticated an explicit member, never `undefined`:

```ts
type Actor =
  | { type: "user"; id: UserId; roles?: readonly string[]; claims?: Record<string, unknown> }
  | { type: "anonymous" };
```

- `user`: `id` plus optional `roles`/`claims` — the reserved extended-permissions seam until a rule needs it.
- `anonymous`: no verified identity — guards requiring a user throw the feature exception.

`Actor` is a direct-imported `system/` foundational primitive ([app-context.md](./app-context.md) → *Injectable helper vs direct import*), **no business rules** — a role's *meaning* is guard-enforced domain logic.

**The `type` set is project-specific** — `user | anonymous` is the minimal start; products add `agent`, `api`, `service`, `system` (*Two ways*; *Growth path*).

## Authentication is an edge concern

The edge verifies the credential and maps it to an `Actor` (`user` with its domain `id`, or `anonymous`), set on `ctx.actor` during `AppContext` assembly **before** any service runs ([apps/end-here.md](../../apps/end-here.md) → *Authentication & actor*). The provider SDK **never enters `packages/core`** (the db-vendor discipline).

An **authentication failure** (missing/invalid credential) is a `401` at the edge, controller-mapped ([transport-mapping.md](../../apps/transport-mapping.md)), never reaching the domain; authorization failure (below) is a domain decision.

Domain-side credential verification graduates to a **capability-named** driven adapter under `system/` (`policy/`, never `clerk/`) — real signal, never upfront ([system/start-here.md](./system/start-here.md)); policy engines: rung 3.

## Identity lifecycle — where a user comes from

Context-as-facts applied ([app-context.md](./app-context.md) → *The Context Is a Statement of Fact*): **a `user`-typed `ctx.actor` references a user that exists** (multi-tenant: in a tenant that is theirs). A dangling actor id is a **bug surfaced by a thrown exception** — never repaired or provisioned inline by a service, guard, context binder, or passing handler.

Sign-up/provisioning establishes the fact: a **dedicated flow**, never a step other flows compose — system-actor-gated operations behind an **explicit trigger** (IdP `user.created` webhook or first-login onboarding endpoint), confirmed with the user. The trigger adapter assembles its system-actor context at the edge; multi-tenant, the **elevated** tenant-unscoped one ([multi-tenancy.md](./multi-tenancy.md) → *The one unscoped path*).

**Binding is read-only** — resolving verified claims to `ctx.actor`/`ctx.tenant` does lookups at most, never writes. A verified-but-unprovisioned identity is **rejected or routed to onboarding at the edge** (authentication-failure family). Post-onboarding, ids may ride in session claims — zero-lookup binding.

**Decide the provisioning race deliberately** — a first request can beat the webhook. Sanctioned: synchronous onboarding on first login, or a "not yet onboarded" retry/redirect edge response; never quiet inline provisioning.

## Authorization is a domain concern

**Enforced in the domain against `ctx.actor`, not only at the edge** (why: reachable via API, worker, CLI, job — [implementation-validation.md](./implementation-validation.md)). The edge may coarse-gate; the per-resource decision is a domain guard.

**Reads are authorized too.** The guard discipline covers queries, not just mutations — `get`/`list` results are scoped to what `ctx.actor` may see. A world-readable resource is an explicit recorded decision, never a default inherited from silence.

An authorization check is an ordinary [guard](./implementation-validation.md#shared-validation-helpers), not a new layer: it reads `ctx.actor` and **throws the feature's domain exception** — edge-presented like any domain failure, a handled `4xx` in the shared shape, **never `500`**, today uniform `422`. Deferred: a dedicated **`403`**, awaiting a machine-readable failure category ([error-handling.md → Growth path](../../error-handling.md#growth-path-per-category-statuses)).

Shapes:

- **Ownership** — an owner-scoped guard comparing `ctx.actor` to the resource's owner (`requireAuthor(ctx, todoId)`); placement/promotion follow guard rules ([implementation-validation.md](./implementation-validation.md) → *Cross-Feature Guards*). An *actor* check: "belongs to X" without checking `ctx.actor` *is* X is referential, not authorization.
- **A cross-resource limit** ("this plan allows N more of X") — a **cross-entity invariant** owned by an orchestration, not a guard ([orchestration.md](./orchestration.md#cross-entity-invariants)).

## Extended permissions — a promotion ladder

Land at the lowest rung, climb on a real signal — never a policy engine before a second role exists:

1. **Inline actor check** — a guard reads `ctx.actor.id`/`.roles`; the whole story for ownership and a single role gate.
2. **Named Decision** — when the policy branches: a pure [named decision](./named-decisions.md) returning `{ allow: true } | { allow: false; reason }`, branches unit-tested, the rule in the domain.
3. **Policy adapter** — a genuine engine (OpenFGA, Cerbos, a central authz API): a capability-named driven adapter under `system/` via `ctx.system.*` ([code-placement.md](../../code-placement.md) → *Graduation*), holding **no rules** — *what to ask* stays domain.

Steer, don't mandate: most features never leave rung 1.

## Growth path (documented deferrals)

- **Non-human principals** — `{ type: "service"; scopes }` / `{ type: "system"; reason }` (cron, workers, migrations): added when a real caller needs one; every guard's `switch (ctx.actor.type)` forces the new case.
- **RBAC / policy engine** — ladder rung 3, real signal only.
- **Tenancy** — specified ([multi-tenancy.md](./multi-tenancy.md)), not deferred; its cross-tenant/platform-admin elevated path depends on the deferred `system` principal.

## Reviewing an auth change

1. **Establish the existing model** from the code: the project's actor `type`s and permission model. Auth absent → first-time setup (*Two ways*), not review.
2. **Read the diff against that model** — does a guard account for the actor types the operation can receive?
3. **A gap is a question, not an automatic failure** — permissions for `user` but not `api` may be intentional or a miss — only the model plus the feature's intent tells you: **raise it as a question**. No mandate that every feature cover every type.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Identity & Access.
