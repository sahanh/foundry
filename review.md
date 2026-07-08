# Review Protocol

Self-driving instructions for a reviewer — person or sub-agent — checking changed code against the playbook. **Not** a flat checklist: **map, then route, then validate** — classify *what was touched* into a fixed taxonomy; the map tells you *which guidelines to open*; validate each touched area against only those.

The `start-here.md`s are the forward pass; this is the backward pass.

## Persona

You are an experienced reviewer. Do not review line-by-line first: **map the change into the taxonomy, route each area to its owning guideline, validate area by area.** Never invent categories — every touch classifies into an enumerated node below.

---

## Step 1 — Map

Explore the diff (not the whole repo). Produce a **table of contents of touched areas** — each with its taxonomy **level** and **file(s)**. Classify every touch into exactly one leaf node.

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

**A touch adding new code or a new file/folder:** first run [code-placement.md](./code-placement.md) Q1–Q3; a misplaced file fails review before any concern-doc check.

## Step 2 — Route

Each mapped node routes to its guideline(s) and owning `end-here`:

| Mapped node | Validate against (guideline) | end-here |
|---|---|---|
| app handler / controller | [code-placement.md](./code-placement.md) (thin controller, schema reuse), [transport-mapping.md](./apps/transport-mapping.md) (outcome→response, error shape, collection contract), [logging.md](./packages/core/system/logging.md); edge authN gate → [identity-and-access.md](./packages/core/identity-and-access.md) | [apps/end-here.md](./apps/end-here.md) |
| app transport / bootstrap | [code-placement.md](./code-placement.md), [app-context.md](./packages/core/app-context.md) (assembly + the context-as-facts invariant), [identity-and-access.md](./packages/core/identity-and-access.md) (actor resolution, identity lifecycle), [multi-tenancy.md](./packages/core/multi-tenancy.md) (tenant resolution) | [apps/end-here.md](./apps/end-here.md) |
| frontend shell / layout | [apps/web/app-shell.md](./apps/web/app-shell.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend feature component | [apps/web/component-placement.md](./apps/web/component-placement.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend visual system | [apps/web/visual-system.md](./apps/web/visual-system.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend ui scope | [apps/web/ui-scope.md](./apps/web/ui-scope.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| driven adapter (`system/`) | [system/start-here.md](./packages/core/system/start-here.md), [database.md](./packages/core/system/database.md) / [logging.md](./packages/core/system/logging.md); tenant column & scoped seam → [multi-tenancy.md](./packages/core/multi-tenancy.md) | [system/end-here.md](./packages/core/system/end-here.md) → Any driven adapter (+ Database adapter / Logger adapter / Multi-tenancy) |
| foundational primitive (`system/`) | [system/start-here.md](./packages/core/system/start-here.md) (Foundational Primitives), [app-context.md](./packages/core/app-context.md) (Injectable helper vs direct import), [identifiers.md](./packages/core/identifiers.md) | [system/end-here.md](./packages/core/system/end-here.md) → Foundational primitive |
| feature service | [service-first-architecture.md](./packages/core/service-first-architecture.md), [implementation-validation.md](./packages/core/implementation-validation.md) | [core/end-here.md](./packages/core/end-here.md) → Services |
| orchestration | [orchestration.md](./packages/core/orchestration.md), [atomicity.md](./packages/core/atomicity.md), [implementation-validation.md](./packages/core/implementation-validation.md) (cross-entity invariant) | [core/end-here.md](./packages/core/end-here.md) → Orchestrations |
| schema | [implementation-schemas.md](./packages/core/implementation-schemas.md), [identifiers.md](./packages/core/identifiers.md) | [core/end-here.md](./packages/core/end-here.md) → Schemas |
| shared validation / exceptions | [implementation-validation.md](./packages/core/implementation-validation.md); for an authorization guard also [identity-and-access.md](./packages/core/identity-and-access.md) | [core/end-here.md](./packages/core/end-here.md) → Validation & exceptions (+ Identity & Access) |
| db access in a service | [working-with-databases.md](./packages/core/working-with-databases.md), [atomicity.md](./packages/core/atomicity.md); multi-tenant app → [multi-tenancy.md](./packages/core/multi-tenancy.md) (no hand-written tenant filter) | [core/end-here.md](./packages/core/end-here.md) → Database / Atomicity |
| tests | [testing.md](./packages/core/testing.md) | [core/end-here.md](./packages/core/end-here.md) → Testing |
| graduated package | [code-placement.md](./code-placement.md) (building a driven adapter) | [packages/end-here.md](./packages/end-here.md) |

Service, orchestration, and shared-validation nodes also consult [logic-placement.md](./packages/core/logic-placement.md) for *which construct the logic belongs in and when to promote it*.

**Ground auth before you grade.** The identity model — which actor `type`s exist, what a permission means — is **project-specific**: establish the *actual* model from the code first ([identity-and-access.md](./packages/core/identity-and-access.md) → *Reviewing an auth change*). A gap (a feature covering `user` but not `api`) is a **question to raise, not an automatic fail**; never grade auth as a flat checklist.

**Ground tenancy too — but a hole is a blocker.** The model is likewise project-specific — establish it from the code ([multi-tenancy.md](./packages/core/multi-tenancy.md) → *Reviewing a tenancy change*). A tenant-owned table missing `tenantId` or off the scoped seam, a hand-written tenant filter, or an ad-hoc unscoped client is a **structural hole in the isolation guarantee — a blocker, not a question.** The one judgment call: is a new table tenant-owned or global.

## Step 3 — Validate

Validate each mapped node's changed area against the routed guideline + `end-here`: the guideline for the *why*, the `end-here` boxes as the pass/fail gate. Nodes are independent — validate one at a time or **launch a sub-agent per node** (one guideline + that area's diff each) and collect results. Never validate an area against a guideline it wasn't routed to.

## Step 4 — Cross-cutting sweeps (always)

Run once across the whole diff:

- **TypeScript** → [typescript-coding-standards.md](./common/typescript-coding-standards.md) — arrow functions for module-level defs, `type` over `interface`, no non-null assertions, explicit return types on exports, string-literal unions over enums.
- **Logging** → [logging.md](./packages/core/system/logging.md) — `ctx.system.logger` at method entry / business events / side effects; errors logged with full context before re-throw; trace ID flowing throughout.
- **Patterns** → [named-decisions.md](./packages/core/named-decisions.md) (incl. [Strategy escalation](./packages/core/named-decisions.md#escalation-when-the-decision-grows-into-a-family--extract-a-strategy)) — tangled policy that should be a named decision; substantial type-branching that should be a Strategy.

**The review lens.** Hold these cross-cutting invariants against every node, whatever was touched; each links its owning doc:

- **One home for every piece of code** — feature, driven adapter / `system/` primitive, or app; anything else needs explicit confirmation → [code-placement.md](./code-placement.md).
- **Dependencies point one way** — driving → domain → driven, never reversed → [code-placement.md](./code-placement.md#layering-three-roles-one-direction).
- **Cross-feature crossings have exactly two shapes** — an owner-exported `void` guard (verdict) or an orchestration (data); any other cross-feature import in domain code fails → [implementation-validation.md](./packages/core/implementation-validation.md#cross-feature-guards).
- **A cross-entity invariant is the one business rule an orchestration may own** — a predicate over ≥2 owners' data; a *single-entity* rule in an orchestration fails → [orchestration.md](./packages/core/orchestration.md#cross-entity-invariants).
- **Business logic lives in the domain, integration-agnostic** — a rule existing *only* in a controller, adapter, or the UI fails → [code-placement.md](./code-placement.md#layering-three-roles-one-direction).
- **Failures are raised, not returned; handled → `4xx` in one shape, never a `500`** → [error-handling.md](./error-handling.md).
- **Authorization is enforced in the domain against `ctx.actor`, not only at the edge** → [identity-and-access.md](./packages/core/identity-and-access.md#authorization-is-a-domain-concern).
- **The context asserts facts; no operation establishes its own preconditions** — factory invoked only in driving adapters and test setup → [app-context.md](./packages/core/app-context.md#the-context-is-a-statement-of-fact).
- **Tenant isolation is structural, not per-query** (multi-tenant apps) — scoped seam by default; the only unscoped path is an explicit elevated context → [multi-tenancy.md](./packages/core/multi-tenancy.md#isolation-is-enforced-at-the-database-seam).
- **Single source of truth; define once, derive the rest** — schemas infer types; boundaries reuse core schemas → [implementation-schemas.md](./packages/core/implementation-schemas.md).
- **Climb on a real signal, not in anticipation** — every extraction/promotion waits for the second signal → [logic-placement.md](./packages/core/logic-placement.md).
- **Promotions are backfilled** — the old home delegates; every existing caller re-evaluated, none stranded → [logic-placement.md](./packages/core/logic-placement.md#the-backfill-obligation-the-revisit-list).
- **All-or-nothing; side effects after commit** — one transaction boundary, effects dispatched post-commit → [atomicity.md](./packages/core/atomicity.md).

## Step 5 — Report

Report per node: the guideline checked against, conformance, and any blockers (a box that could not be ticked). A blocker is a blocker, not a note.
