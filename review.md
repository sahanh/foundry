# Review Protocol

> **Naming/location is provisional.** This file is the root **verify pass** for the playbook. Rename or relocate it as you prefer — note that `/review` and `/code-review` already exist as tools, so a distinct name (e.g. `self-review.md`, `conformance-review.md`) may avoid confusion.

This is a self-driving instruction for a reviewer — a person or a sub-agent — checking that changed code adheres to the playbook. It is **not** a flat checklist. A flat checklist over a comprehensive playbook is either too rigid (atomic boxes that miss the point) or too open ("read the guides and review the code"). Instead you **map, then route, then validate**: you first classify *what was touched* into a fixed taxonomy, then let that map tell you *which guidelines to open*, and validate each touched area against only those.

The forward pass — reading before you build — is the `start-here.md` at each seam. This is the backward pass.

## Persona

You are an experienced reviewer ensuring the changed code adheres to this playbook. You do not review line-by-line first. You **map the change into the taxonomy, route each mapped area to the guideline that owns it, then validate area by area.** You never invent categories — every touch is classified into one of the enumerated nodes below.

---

## Step 1 — Map

Explore the diff (not the whole repo). Produce a **table of contents of touched areas** — for each, its **level** in the taxonomy and its **file(s)**. This is the *areas* touched, not a line-by-line list. Classify every touch into exactly one leaf node.

**The taxonomy (the only options):**

```
L1 — where in the repo?
  apps/<app>                → driving adapter (app)          → L2b (server transport) or L2c (frontend)
  packages/core/            → the domain core                → L2a
  packages/<other>/         → graduated package (driven adapter)
  repo root / config        → cross-cutting

L2a — inside packages/core/
  src/system/<adapter>      → driven adapter (db, logger, clock, queue, email, …)
  src/system/<primitive>    → foundational primitive (id helpers, pagination, AppContext type)
  src/<feature>/            → domain feature module          → L3

L2b — inside a server-side app (api / cli / worker / mcp)
  transport / bootstrap     → server / session / actor + tenant resolution / AppContext assembly
  handlers / controllers    → per route / tool / command handler

L2c — inside the frontend client UI (apps/web) — skip this whole branch unless the diff touches apps/web
  shell / layout            → app shell, container, navigation
  feature component         → a feature-owned component (placement, naming, grouping)
  visual system             → shared visual treatments, design tokens, global styles
  ui scope                  → feature-surface scope decisions

L3 — inside a feature module
  services/*.service.ts             → service (or sub-feature service)
  orchestrations/*.orchestration.ts → orchestration
  schemas/*.ts                      → schema
  shared/validation.ts              → shared validation guard (incl. authorization)
  exceptions.ts                     → domain exception
  __tests__/*                       → tests
```

The taxonomy mirrors the repo's own topology (see [code-placement.md](./code-placement.md)), so it cannot drift from how the code is actually organized.

**If a touch adds new code or a new file/folder,** first confirm its placement is correct at all: run [code-placement.md](./code-placement.md) Q1–Q3. A misplaced file fails review before any concern-doc check.

## Step 2 — Route

For each mapped node, look up its guideline(s) and the `end-here` that owns its verification:

| Mapped node | Validate against (guideline) | end-here |
|---|---|---|
| app handler / controller | [code-placement.md](./code-placement.md) (thin controller, schema reuse), [transport-mapping.md](./apps/transport-mapping.md) (outcome→response, error shape, collection contract), [logging.md](./packages/core/system/logging.md); edge authN gate → [identity-and-access.md](./packages/core/identity-and-access.md) | [apps/end-here.md](./apps/end-here.md) |
| app transport / bootstrap | [code-placement.md](./code-placement.md), [app-context.md](./packages/core/app-context.md) (assembly + the context-as-facts invariant), [identity-and-access.md](./packages/core/identity-and-access.md) (actor resolution, identity lifecycle), [multi-tenancy.md](./packages/core/multi-tenancy.md) (tenant resolution) | [apps/end-here.md](./apps/end-here.md) |
| frontend shell / layout | [apps/web/app-shell.md](./apps/web/app-shell.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend feature component | [apps/web/component-placement.md](./apps/web/component-placement.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend visual system | [apps/web/visual-system.md](./apps/web/visual-system.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend ui scope | [apps/web/ui-scope.md](./apps/web/ui-scope.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| driven adapter (`system/`) | [system/start-here.md](./packages/core/system/start-here.md), [database.md](./packages/core/system/database.md) / [logging.md](./packages/core/system/logging.md); tenant column & scoped seam → [multi-tenancy.md](./packages/core/multi-tenancy.md) | [system/end-here.md](./packages/core/system/end-here.md) → Any driven adapter (+ Database / Logger adapter / Multi-tenancy) |
| foundational primitive (`system/`) | [system/start-here.md](./packages/core/system/start-here.md) (Foundational Primitives), [app-context.md](./packages/core/app-context.md) (Injectable helper vs direct import), [identifiers.md](./packages/core/identifiers.md) | [system/end-here.md](./packages/core/system/end-here.md) → Foundational primitive |
| feature service | [service-first-architecture.md](./packages/core/service-first-architecture.md), [implementation-validation.md](./packages/core/implementation-validation.md) | [core/end-here.md](./packages/core/end-here.md) → Services |
| orchestration | [orchestration.md](./packages/core/orchestration.md), [atomicity.md](./packages/core/atomicity.md), [implementation-validation.md](./packages/core/implementation-validation.md) (cross-entity invariant) | [core/end-here.md](./packages/core/end-here.md) → Orchestrations |
| schema | [implementation-schemas.md](./packages/core/implementation-schemas.md), [identifiers.md](./packages/core/identifiers.md) | [core/end-here.md](./packages/core/end-here.md) → Schemas |
| shared validation / exceptions | [implementation-validation.md](./packages/core/implementation-validation.md); for an authorization guard also [identity-and-access.md](./packages/core/identity-and-access.md) | [core/end-here.md](./packages/core/end-here.md) → Validation & exceptions (+ Identity & Access) |
| db access in a service | [working-with-databases.md](./packages/core/working-with-databases.md), [atomicity.md](./packages/core/atomicity.md); multi-tenant app → [multi-tenancy.md](./packages/core/multi-tenancy.md) (no hand-written tenant filter) | [core/end-here.md](./packages/core/end-here.md) → Database / Atomicity |
| tests | [testing.md](./packages/core/testing.md) | [core/end-here.md](./packages/core/end-here.md) → Testing |
| graduated package | [code-placement.md](./code-placement.md) (building a driven adapter) | [packages/end-here.md](./packages/end-here.md) |

Service, orchestration, and shared-validation nodes also consult [logic-placement.md](./packages/core/logic-placement.md) for *which construct the logic belongs in and when to promote it* — the construct docs above own each construct's internal rules; the placement/promotion decision is owned there.

**Auth is the one node you ground before you grade.** When a change touches authorization (or actor resolution at the edge), the identity model — which actor `type`s exist, what a permission means — is **project-specific**, not fixed by the guide. So before validating, first establish the project's *actual* model from the code, then judge the diff against it: see [identity-and-access.md](./packages/core/identity-and-access.md) → *Reviewing an auth change*. A gap (e.g. a feature covering `user` but not `api`) is a **question to raise, not an automatic fail** — it may be intentional. Do not evaluate an auth change against this guide as a flat checklist.

**Tenancy you also ground first — but a hole is a blocker.** In a multi-tenant app the tenancy model is likewise project-specific (which tables are tenant-owned, what `ctx.tenant` carries), so establish it from the code before judging: see [multi-tenancy.md](./packages/core/multi-tenancy.md) → *Reviewing a tenancy change*. Unlike an auth gap, though, a tenant-owned table missing `tenantId` (or not on the scoped seam), a hand-written tenant filter, or an ad-hoc unscoped client is a **structural hole in the isolation guarantee — a blocker, not a question.** The one genuine judgment call is whether a new table is tenant-owned or global.

## Step 3 — Validate

For each mapped node, validate its changed area against the routed guideline + `end-here`. Read the guideline for the *why*; use the `end-here` boxes as the pass/fail gate. Nodes are independent — you may validate them one at a time, or **launch a sub-agent per node** (each reads one guideline + that area's diff) and collect the results. Do not validate an area against a guideline it wasn't routed to.

## Step 4 — Cross-cutting sweeps (always)

These apply to *any* change regardless of what was touched — run them once across the whole diff:

- **TypeScript** → [typescript-coding-standards.md](./common/typescript-coding-standards.md) — arrow functions for module-level defs, `type` over `interface`, no non-null assertions, explicit return types on exports, string-literal unions over enums.
- **Logging** → [logging.md](./packages/core/system/logging.md) — `ctx.system.logger` at method entry / business events / side effects; errors logged with full context before re-throw; trace ID flowing throughout.
- **Patterns** → [implementation-strategy-pattern.md](./packages/core/implementation-strategy-pattern.md) · [named-decisions.md](./packages/core/named-decisions.md) — substantial type-branching that should be a Strategy; tangled policy that should be a named decision.

**The review lens.** Beyond the specific guidelines, hold the playbook's cross-cutting invariants against every node — they don't care what you touched:

- **One home for every piece of code** — a feature, a driven adapter (or a `system/` foundational primitive), or a driving-adapter app; anything else needs explicit confirmation.
- **Dependencies point one way** — driving → domain → driven; the core never imports an app, a driven adapter never imports the domain.
- **Cross-feature crossings have exactly two shapes** — an owner-exported guard (a verdict; returns `void`) or an orchestration (data). Any other cross-feature import in domain code — a foreign service injected, a foreign table read, a guard returning an entity — fails review. (An orchestration that reaches ≥2 owners' data may also **own a cross-entity invariant** over it — a predicate no single owner can evaluate; that is the one business rule an orchestration may hold. A *single-entity* rule in an orchestration still fails review.)
- **Business logic lives in the domain, integration-agnostic** — not in controllers, adapters, or the frontend UI. A UI may *mirror* a rule for fast feedback, but the core stays the single source of truth; a rule that exists *only* in the UI fails review.
- **Failures are raised, not returned; a handled failure is a `4xx`, never a `500`** — the domain and its schema boundary raise *anticipated* failures (a domain exception, a Zod parse), and the edge transforms them into **one response shape**; a `500` is reserved for the *unanticipated*. A domain exception or validation error bubbling to a `500`, a sentinel returned instead of a throw, two divergent error shapes for the two classes, or internal context leaked on the wire fails review. See [error-handling.md](./error-handling.md).
- **Authorization is enforced in the domain against `ctx.actor`, not only at the edge** — the domain is multi-consumer, so an edge-only check is silently absent on the worker / CLI / job path. Resolving the actor (authentication) is the edge's job; deciding what the actor may do (authorization) is a domain guard.
- **The context asserts facts; no operation establishes its own preconditions** — everything on `ctx` (actor, tenant, trace) is already true; making a fact true (a user existing, a workspace provisioned, a referent present) is a separate use case with its own trigger. The context factory is invoked only in driving adapters and test setup. A core-resident assembly call, a context binder that writes, a handler that provisions inline, or domain repair logic for a missing precondition fails review. See [app-context.md](./packages/core/app-context.md) → *The Context Is a Statement of Fact* and [identity-and-access.md](./packages/core/identity-and-access.md) → *Identity lifecycle*.
- **Tenant isolation is structural, not per-query** (multi-tenant apps) — `ctx.tenant` is set only at assembly, and the scoped `ctx.system.db` enforces isolation at the seam. A hand-written `where tenantId`, a service-set `tenantId`, an ad-hoc unscoped client, a db seam where scoping is **opt-in rather than the default**, or a tenant-owned table lacking `tenantId` fails review. The only unscoped path is an explicit elevated context.
- **Single source of truth; define once, derive the rest** — schemas infer types; boundaries reuse core schemas.
- **Climb on a real signal, not in anticipation** — services, sub-features, adapter graduation, shared-validation extraction all wait for the second signal. The placement/promotion decision and this signal are owned by [logic-placement.md](./packages/core/logic-placement.md).
- **Promotions are backfilled** — when logic moved up a rung (method → own service, → shared guard, → orchestration), the old home now delegates and existing callers were re-evaluated; nothing was left stranded.
- **All-or-nothing; side effects after commit** — one transaction boundary, effects dispatched post-commit.

## Step 5 — Report

Report per node: the guideline it was checked against, conformance, and any blockers (a box that could not be ticked). A blocker is a blocker, not a note.
