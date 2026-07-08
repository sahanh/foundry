# Identity & Access

How the domain knows **who** is calling and enforces **what they may do**. This is the playbook's
single story for authentication, the actor, and authorization. Like the database, auth is
infrastructure the playbook cannot avoid — but the vendor (Clerk, WorkOS, Cognito, BetterAuth) is
an implementation detail kept at the edge. This doc steers the placement decisions; it does not
prescribe a provider.

## Authentication vs Authorization — two concerns, two homes

They are not the same word split in half. They live at different layers:

- **Authentication (authN) — "who is calling?"** — a boundary concern owned by the **edge** (`apps/`).
  An app verifies a credential (session cookie, bearer token, API key) and resolves a vendor-neutral
  **actor**. Covered under *Authentication is an edge concern* below.
- **Authorization (authZ) — "may this actor do this?"** — a business concern owned by the **domain**.
  It is enforced as guards reading `ctx.actor`, never only at the controller. Covered under
  *Authorization is a domain concern* below.

If you came here searching for "authentication," the mechanics belong to the edge — see
[apps/end-here.md](../../apps/end-here.md) → *Authentication & actor*. The domain's job begins once
the actor is resolved.

## Two ways you reach this guide

This guide is unusual. Most of the playbook fixes a convention — file naming, folder layout — that is
the same in every project. Here the *content* of a system's identity model is **project-specific**:
which actor types exist, and what a permission means, differ from one product to the next. So how you
use this doc depends on why you are here.

- **Building** — a new product, or identity & access set up for the **first time**. The actor `type`
  set and the permission model are decisions *this* project makes about its own consumers, not values
  to copy from here. Treat it like a domain boundary: **propose the actor types and the permission
  model, and confirm them with the user before building** — the same "decide first, confirm explicitly"
  rule services follow ([service-first-architecture.md](./service-first-architecture.md)). The patterns
  below — actor on `ctx`, authZ as guards, the promotion ladder — are the *shape*; the specifics are
  yours to fill in.
- **Reviewing** — a diff that touches auth in a system where it is already set up. Do **not** grade the
  change against this doc as a flat checklist. First understand the identity model this project
  *actually* has, then judge the change against it. See *Reviewing an auth change* below.

## The Actor — `ctx.actor`

Every operation runs on behalf of some caller. That caller is the **actor**, carried as a top-level
field on `AppContext` — a sibling of `traceId`, reached as `ctx.actor`, not something under
`ctx.system.*` (the domain does not call *out* to it; it is ambient operation metadata). The field
mechanics — where it sits, why it is not a constructor argument, how tests pin it — live in
[app-context.md](./app-context.md) → *The Actor*. This doc owns its **meaning**.

The actor is a **total, discriminated union** keyed on `type`. It is **always present** —
unauthenticated is an explicit member, never `undefined`:

```ts
type Actor =
  | { type: "user"; id: UserId; roles?: readonly string[]; claims?: Record<string, unknown> }
  | { type: "anonymous" };
```

- A `user` actor carries `id` (all a day-one ownership guard needs) plus optional `roles` / `claims`
  — the reserved seam for extended permissions, unused until a rule needs them.
- `anonymous` is the caller with no verified identity — a public endpoint, a pre-login request.
  Guards that require a user throw the feature exception against it.

`Actor` is a `system/` **foundational primitive type**, defined once and reached by **direct import**
(a type position, no `ctx` — the same rule as the `AppContext` type itself, see
[app-context.md](./app-context.md) → *Injectable helper vs direct import*). It carries **no business
rules**: it does not decide what a role *means* — that is domain logic, enforced in guards. This
respects the `system/` non-domain invariant ([system/start-here.md](./system/start-here.md) →
*Foundational Primitives*).

**The set of actor `type`s is project-specific.** `user | anonymous` is the minimal starting shape,
not a fixed vocabulary — one product's callers are `user` + `agent` + `api`; another adds `service`
(machine-to-machine) or `system` (cron, workers). Which types exist, and what each carries (`roles`,
`scopes`, …), is decided per system when identity & access is set up — see *Two ways you reach this
guide*. The union is deliberately **minimal here** and designed to **grow additively** — see *Growth
path*.

## Authentication is an edge concern

The app, not the domain, verifies the credential. This is the same discipline that keeps the
database vendor inside `system/db`: the auth-provider SDK stays in the app (or in edge middleware),
and the domain receives an **already-resolved, vendor-neutral actor**. The flow mirrors `traceId`
ingestion ([system/logging.md](./system/logging.md), [apps/end-here.md](../../apps/end-here.md) →
*Entry-point logging*):

1. The request arrives at a driving adapter (`apps/`).
2. The app verifies the credential with whatever provider it uses, and maps the result to an `Actor`
   — a `user` with its domain `id`, or `anonymous`.
3. The app sets `ctx.actor` during `AppContext` assembly, **before** any service or orchestration runs.

An **authentication failure** — a missing or invalid credential — is rejected at the edge and never
reaches the domain (a `401`, mapped by the controller). Contrast an **authorization failure** below,
which is a domain decision.

The provider is an example, never a rule. Should the domain itself ever need to verify a credential
(an MCP tool re-checking a signed capability) or consult an external policy engine, that becomes a
**capability-named** driven adapter under `system/` (e.g. `policy/`, never `clerk/`) — a graduation
on a real signal, not created upfront. See [system/start-here.md](./system/start-here.md).

## Authorization is a domain concern

**Authorization is enforced in the domain, against `ctx.actor` — not only at the edge.** The reason
is the same one that makes the domain own all validation: a service or orchestration is a standalone
library that cannot assume how it is consumed ([implementation-validation.md](./implementation-validation.md)
→ *Why the Domain Layer Owns Validation*). The same operation is reachable via API, queue worker, CLI,
or scheduled job; a check that lives only in the HTTP controller is silently absent on every other
path. An edge check is a convenience; the domain check is the guarantee. The edge may do a **coarse
gate** (is this route open to an anonymous caller at all), but the real per-resource decision — *can
this actor do this to this resource* — is a domain guard.

Authorization reuses the existing guard machinery — it is **not** a new layer. An authorization check
is a [guard](./implementation-validation.md#shared-validation-helpers): it reads `ctx.actor`, asserts
the actor may act, and **throws the feature's domain exception** on failure. That exception already
covers authorization failures ([implementation-validation.md](./implementation-validation.md) → *The
Domain Exception*), so an integrator maps it to a `403` the same way it maps any other domain failure
— which is the controller's exception-to-transport job ([concerns.md](../../concerns.md) #3).

Each shape of authorization maps to a construct that already exists:

- **Ownership** — "this actor owns / may act on this resource." An owner-scoped guard comparing
  `ctx.actor` to the resource's owner (`requireAuthor(ctx, todoId)`). Same-feature, it stays inline
  until a second caller earns a `shared/validation.ts` guard. Cross-feature, it is an owner-exported,
  `void`-returning guard from the first crossing ([implementation-validation.md](./implementation-validation.md)
  → *Cross-Feature Guards*) — the canonical `requireActiveUser` / `requireAuthor`, generalized to read
  `ctx.actor`.
- **A cross-resource limit** — "this actor's plan allows N more of X." A predicate spanning two owners'
  data is a **cross-entity invariant**, owned by an orchestration, not a guard
  ([orchestration.md](./orchestration.md#cross-entity-invariants)).

## Extended permissions — a promotion ladder

Roles and policies grow. The playbook's answer is its usual one: **land at the lowest rung, climb on
a real signal.** Do not build a policy engine before a second role exists.

1. **Inline actor check.** A guard (or a service) reads `ctx.actor.id` / `ctx.actor.roles` and decides.
   This is the whole story for ownership and a single role gate.
2. **A Named Decision.** When the policy branches — several roles, several reasons to deny — extract a
   pure [named decision](./named-decisions.md) returning the allow/deny tagged union
   (`{ allow: true } | { allow: false; reason: … }`), so the branches are cheaply unit-tested and the
   call site reads as one named check. The rule still lives in the domain; only the branching moves.
3. **A policy adapter.** When authorization becomes a genuine engine — an external service (OpenFGA,
   Cerbos, a central authz API) or a substantial rule set with its own lifecycle — it **graduates** to
   a capability-named driven adapter under `system/` (or its own package), reached via `ctx.system.*`
   ([code-placement.md](../../code-placement.md) → *Graduation*). The adapter holds **no rules** — it
   plumbs the question to the engine; *what to ask* stays in the domain.

Steer, don't mandate: most features never leave rung 1.

## Growth path (documented deferrals)

These are deliberately out of scope now, recorded so they are decided-not-omitted:

- **Non-human principals.** Machine-to-machine callers (`{ type: "service"; scopes }`) and trusted
  internal callers — cron, workers, migrations (`{ type: "system"; reason }`) — are additive union
  members added when a real caller needs one. Because `Actor` is discriminated on `type`, adding a
  member does not reshape `AppContext`, and every guard's `switch (ctx.actor.type)` forces the new
  case to be handled.
- **An RBAC / policy engine.** Deferred to rung 3 of the ladder above — reached only on a real signal.
- **Tenancy.** Tenant isolation (which boundary an operation runs *within*) is orthogonal to the actor
  (*who* is calling) but shares its edge-resolution seam — both are set during `AppContext` assembly.
  This is now **specified**, not deferred: `ctx.tenant` rides beside `ctx.actor`, resolved at the edge
  and enforced structurally at the db seam — see [multi-tenancy.md](./multi-tenancy.md). What still
  borrows from *this* section: the **cross-tenant / platform-admin** path runs under an elevated context
  that depends on the deferred `system` principal above.

## Reviewing an auth change

When the [review protocol](../../review.md) routes an auth-touching diff here, remember the identity
model is **project-specific** — you cannot grade the change against this doc in the abstract. Ground the
review in what the system *actually* has, then judge the diff against that:

1. **Establish the existing model first.** From the code — not assumptions — determine the project's
   actor `type`s and its permission model: e.g. *this system has `user`, `agent`, and `api` actors, with
   permissions defined per type.* If auth is not set up at all, this is a first-time setup, not a review —
   see *Two ways you reach this guide*.
2. **Read the diff against that model.** Does the change enforce authorization consistently with how the
   established actors and permissions already work? A guard reading `ctx.actor` — does it account for the
   actor types this operation can actually receive?
3. **A gap is a question, not an automatic failure.** If a feature adds permissions for `user` but not
   `api`, that may be correct (the feature is genuinely user-facing) or a miss (the `api` path was
   forgotten). Only the established model *plus* the feature's intent tells you which — so **raise it as a
   question**. This guide gives you the shape to reason with; it does **not** mandate that every feature
   cover every actor type.

The rule: **understand the implementation's real state, then review the diff** — never evaluate an auth
change against the guide as a high-level checklist.

## Anti-Patterns

- **Edge-only authorization** — the "can this actor do this" check living in the controller, so the
  worker / CLI / job path bypasses it. The edge does authN and a coarse gate; per-resource authZ is a
  domain guard.
- **Threading the actor through method parameters** — passing `userId` into service methods instead of
  reading `ctx.actor`. The actor is ambient on `ctx`, like `traceId`; a parameter is the
  parameter-repetition smell.
- **The vendor in the core** — importing the auth-provider SDK inside `packages/core`. The provider
  stays at the edge; the domain sees only a neutral `Actor`.
- **Ownership as a data-only relationship** — checking "todo belongs to user X" without checking that
  `ctx.actor` *is* X. A referential check is not an authorization check.
- **A policy engine with no signal** — building rung 3 before a second role exists.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Identity & Access.
