# Review Protocol

Self-driving instructions for a reviewer — person or sub-agent — checking changed code against the standard. **Not** a flat checklist: **map, then route, then validate** — classify *what was touched* into a fixed taxonomy; the map tells you *which guidelines to open*; validate each touched area against only those.

The `start-here.md`s are the forward pass; this is the backward pass.

**This protocol covers what a tool cannot decide.** The deterministic rules — imports, naming,
TypeScript, column definitions, migrations — are CI checks, specified in
[setup/ci-verification.md](./setup/ci-verification.md), and the `end-here` checklists leave them out.
If the repo's CI does not enforce them, Step 0 makes this review check them instead.

## Persona

You are an experienced reviewer. Do not review line-by-line first: **map the change into the taxonomy, route each area to its owning guideline, validate area by area.** Never invent categories — every touch classifies into an enumerated node below.

---

## Step 0 — What CI already verifies

Read the repo's CI manifest, `foundry-ci.md` at its root ([ci-verification.md → The manifest](./setup/ci-verification.md#the-manifest--foundry-cimd)).

- **Run its local command** (or read the change's CI result). A failing check is a blocker; report it
  and do not spend review on it until it passes.
- **A rule the manifest marks `enforced` is CI's job** — never re-check it here.
- **A check the manifest marks `scheduled`** has not run on this diff
  ([ci-verification.md → Scheduled strength checks](./setup/ci-verification.md#scheduled-strength-checks)):
  report it as not run, and never cite its last result as evidence for the change.
- **Every other applicable rule** in [ci-verification.md](./setup/ci-verification.md) — marked
  `deferred`, missing from the manifest, or every rule when there is no manifest — joins this review:
  check the diff against the rule's *Fails when* condition, and report a hit as a blocker under the
  rule ID. Note in the report that the repo has no CI for these rules
  ([setup/start-here.md](./setup/start-here.md)).
- **A satellite meets only the catalogue rules named for satellites**
  ([ci-verification.md → Satellites](./setup/ci-verification.md#satellites)); check no other rule
  against it. The project's own `EXT-NN` checks for it are reported like any other. Steps 1–3
  apply to it through its L2d nodes, in any language; Step 4 stops at its boundary.

## Step 1 — Map

Explore the diff (not the whole repo, bar the two lookups below). Produce a **table of contents of touched areas** — each with its taxonomy **level** and **file(s)**. Classify every touch into exactly one leaf node.

**The taxonomy (the only options):**

```
L1 — where in the repo?
  apps/<app>                → driving adapter (app)          → L2b (server transport), L2c (frontend)
                                                                or L2m (apps/mcp, the MCP server)
  packages/core/            → the domain core                → L2a
  packages/<other>/         → graduated package (driven adapter)
  satellites/<name>/        → satellite (own codebase, published API only; any language) → L2d
  repo root / config        → cross-cutting
  foundry-ci.md · CI config → CI verification
  site/                     → the website (landing + docs viewer) — OUT OF SCOPE; not the standard, skip it

L2a — inside packages/core/
  src/system/<adapter>      → driven adapter (db, logger, clock, queue, email, …)
  src/system/<primitive>    → foundational primitive (id helpers, pagination, AppContext type)
  src/<feature>/            → domain feature module          → L3

L2b — inside a server-side app (api / cli / worker)
  transport / bootstrap     → server / session / actor + tenant resolution / AppContext assembly
  handlers / controllers    → per route / command / consumer handler

L2m — inside the MCP server (apps/mcp) — skip this whole branch unless the diff touches apps/mcp,
      or adds an MCP node (below)
  mcp transport / auth      → main.ts, server.ts, context.ts, the token check, the metadata routes;
                              the authorization server's MCP setup
  mcp tool dispatcher       → dispatch.ts: parsing, failure mapping, rate limit, logging, the audit step
  mcp refusal hints         → the hint mapper and the hint texts
  mcp tool definition       → tools/<feature>.ts: name, description, schemas, annotations, the core call
  mcp edge tests            → apps/mcp tests: edge tests, leak sweep, tools/list snapshot,
                              conformance baseline, smoke script
  mcp tool-call audit       → (added node only) the audit feature, its table, its purge job

L2c — inside the frontend client UI (apps/web) — skip this whole branch unless the diff touches apps/web
  shell / layout            → app shell, container, navigation
  feature component         → a feature-owned component (placement, naming, grouping)
  visual system             → shared visual treatments, design tokens, global styles
  ui scope                  → feature-surface scope decisions

L2d — inside a satellite (satellites/<name>: a Zapier app, a WordPress plugin) — skip unless the diff touches one
  satellite wiring          → README map, platform manifest / bootstrap, auth flow, build, packaging, deploy config
  satellite surface         → per trigger / action / search / hook / form: each call it makes to the system
  satellite internals       → everything else inside it: pages, components, content, assets, its own tests

L3 — inside a feature module
  services/*.service.ts             → service (or sub-feature service)
  orchestrations/*.orchestration.ts → orchestration
  schemas/*.schema.ts               → schema
  shared/validation.ts              → shared validation guard (incl. authorization)
  shared/utils.ts                   → pure helper
  exceptions.ts                     → domain exception
  __tests__/*                       → tests
```

**Changed logic adds a tests node.** Each touch still classifies into one leaf; a touch that changes logic — a service, orchestration, schema, shared validation, pure helper, or a worker job's handler — also adds **tests** to the map, whether or not the diff touched `__tests__/`: changed logic needs its owning tests. Likewise a change to an L2m dispatcher, refusal-hint or tool-definition node adds **mcp edge tests**.

**A change reaching the MCP server adds an MCP node,** when the repo has `apps/mcp/`. Each touch still classifies into its own leaf; in addition:

- a change to a core **exception message, guard message or input schema** that an MCP tool's refusal can carry adds **mcp refusal hints** — a new or reworded refusal needs a hint, or a deliberate none ([tool-design.md → Refusals that guide](./apps/mcp/tool-design.md#refusals-that-guide));
- a change to a **service or orchestration an MCP tool calls**, or to its output schema, adds **mcp tool definition** — the tool's description, example and output schema may no longer hold;
- a change to the **tool-call audit** feature, its table or its purge job adds **mcp tool-call audit** ([tool-call-audit.md](./apps/mcp/tool-call-audit.md)).

**A touch adding new code or a new file/folder:** first run [code-placement.md](./code-placement.md) Q1–Q3; a misplaced file fails review before any concern-doc check.

**A touch to a satellite's part outside `satellites/`** — a published route it calls, a webhook route the vendor calls back on, the adapter that pushes to it, its deploy step — also maps that satellite's **satellite wiring** node, so its README map is checked ([satellites/start-here.md](./satellites/start-here.md#the-readme-maps-the-whole-integration)).

**A new frontend component is one place to look outside the diff:** search its owning feature and sibling feature folders for a component of the same shape. A diff never contains the first copy, so this is the only way to see a second one ([component-placement.md → Extraction](./apps/web/component-placement.md#extraction--on-the-second-copy-with-confirmation)).

**A satellite's API call is the other:** for each call a changed satellite surface makes, open the `apps/api` route it calls, and check that the route is on the published API and that the call's method, path, inputs and the response it reads match the route's code ([satellites/start-here.md](./satellites/start-here.md#it-reaches-the-system-only-through-the-published-api)).

## Step 2 — Route

Each mapped node routes to its guideline(s) and owning `end-here`:

| Mapped node | Validate against (guideline) | end-here |
|---|---|---|
| app handler / controller | [code-placement.md](./code-placement.md) (thin controller, schema reuse), [transport-mapping.md](./apps/transport-mapping.md) (outcome→response, error shape, collection contract), [logging.md](./packages/core/system/logging.md); edge authN gate → [identity-and-access.md](./packages/core/identity-and-access.md); a route for outside callers → [apps/start-here.md → The published API](./apps/start-here.md#the-published-api) | [apps/end-here.md](./apps/end-here.md) |
| app transport / bootstrap | [code-placement.md](./code-placement.md), [app-context.md](./packages/core/app-context.md) (assembly + the context-as-facts invariant), [identity-and-access.md](./packages/core/identity-and-access.md) (actor resolution, identity lifecycle), [multi-tenancy.md](./packages/core/multi-tenancy.md) (tenant resolution) | [apps/end-here.md](./apps/end-here.md) |
| mcp transport / auth | [apps/mcp/start-here.md](./apps/mcp/start-here.md) (toolchain, layout, transport), [authentication.md](./apps/mcp/authentication.md); plus everything *app transport / bootstrap* routes to | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → Toolchain, Placement & transport, Authentication; plus [apps/end-here.md](./apps/end-here.md) |
| mcp tool dispatcher | [apps/mcp/start-here.md](./apps/mcp/start-here.md) (The tool dispatcher, Rate limiting), [transport-mapping.md](./apps/transport-mapping.md#other-transports), [logging.md](./packages/core/system/logging.md) | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → The tool dispatcher; [apps/end-here.md](./apps/end-here.md) → Response & error mapping, Entry-point logging |
| mcp refusal hints | [tool-design.md → Refusals that guide](./apps/mcp/tool-design.md#refusals-that-guide), [transport-mapping.md → Other transports](./apps/transport-mapping.md#other-transports) | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → Refusals that guide |
| mcp tool definition | [tool-design.md](./apps/mcp/tool-design.md); plus everything *app handler / controller* routes to | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → Tools, Refusals that guide; [apps/end-here.md](./apps/end-here.md) → Handler / controller |
| mcp tool-call audit | [tool-call-audit.md](./apps/mcp/tool-call-audit.md), plus the guideline of the leaf it touched (service, schema, worker job) | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → Tool-call audit |
| mcp edge tests | [apps/mcp/testing.md](./apps/mcp/testing.md) | [apps/mcp/end-here.md](./apps/mcp/end-here.md) → Testing |
| frontend shell / layout | [apps/web/app-shell.md](./apps/web/app-shell.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend feature component | [apps/web/component-placement.md](./apps/web/component-placement.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend visual system | [apps/web/visual-system.md](./apps/web/visual-system.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| frontend ui scope | [apps/web/ui-scope.md](./apps/web/ui-scope.md) | [apps/web/end-here.md](./apps/web/end-here.md) |
| satellite wiring | [satellites/start-here.md](./satellites/start-here.md) (placement, README map, credentials); credential issue and actor resolution on the API side → [identity-and-access.md](./packages/core/identity-and-access.md) | [satellites/end-here.md](./satellites/end-here.md) |
| satellite surface | [satellites/start-here.md](./satellites/start-here.md) (published API only, calls match the `apps/api` routes, no business rules) | [satellites/end-here.md](./satellites/end-here.md) |
| satellite internals | [satellites/start-here.md → Toolchain, CI and release](./satellites/start-here.md#toolchain-ci-and-release-are-the-projects) — the baseline only; layout, patterns and tests are the project's, so no other guideline applies | — (the baseline is CI's) |
| driven adapter (`system/`) | [system/start-here.md](./packages/core/system/start-here.md), [database.md](./packages/core/system/database.md) / [logging.md](./packages/core/system/logging.md); tenant column & scoped seam → [multi-tenancy.md](./packages/core/multi-tenancy.md) | [system/end-here.md](./packages/core/system/end-here.md) → Any driven adapter (+ Database adapter / Logger adapter / Multi-tenancy) |
| foundational primitive (`system/`) | [system/start-here.md](./packages/core/system/start-here.md) (Foundational Primitives), [app-context.md](./packages/core/app-context.md) (Injectable helper vs direct import), [identifiers.md](./packages/core/identifiers.md) | [system/end-here.md](./packages/core/system/end-here.md) → Foundational primitive |
| feature service | [service-first-architecture.md](./packages/core/service-first-architecture.md), [implementation-validation.md](./packages/core/implementation-validation.md) | [core/end-here.md](./packages/core/end-here.md) → Services |
| orchestration | [orchestration.md](./packages/core/orchestration.md), [atomicity.md](./packages/core/atomicity.md), [implementation-validation.md](./packages/core/implementation-validation.md) (cross-entity invariant) | [core/end-here.md](./packages/core/end-here.md) → Orchestrations |
| schema | [implementation-schemas.md](./packages/core/implementation-schemas.md), [identifiers.md](./packages/core/identifiers.md) | [core/end-here.md](./packages/core/end-here.md) → Schemas |
| pure helper | [logic-placement.md](./packages/core/logic-placement.md) (its rung), [branching-logic.md](./packages/core/branching-logic.md) (named decisions) | [core/end-here.md](./packages/core/end-here.md) → Placement & promotion |
| shared validation / exceptions | [implementation-validation.md](./packages/core/implementation-validation.md); for an authorization guard also [identity-and-access.md](./packages/core/identity-and-access.md) | [core/end-here.md](./packages/core/end-here.md) → Validation & exceptions (+ Identity & Access) |
| db access in a service | [working-with-databases.md](./packages/core/working-with-databases.md), [atomicity.md](./packages/core/atomicity.md); multi-tenant app → [multi-tenancy.md](./packages/core/multi-tenancy.md) (no hand-written tenant filter) | [core/end-here.md](./packages/core/end-here.md) → Database / Atomicity |
| tests | [testing.md](./packages/core/testing.md), validated by running the [test-review](./skills/test-review/SKILL.md) procedure | [core/end-here.md](./packages/core/end-here.md) → Testing |
| graduated package | [code-placement.md](./code-placement.md) (building a driven adapter) | [packages/end-here.md](./packages/end-here.md) |
| CI verification (manifest, CI config) | [setup/ci-verification.md](./setup/ci-verification.md) — each enforced rule's check rejects its *Fails when* condition and was proven to fail; parameters match the repo | — (the spec is the gate) |

Service, orchestration, and shared-validation nodes also consult [logic-placement.md](./packages/core/logic-placement.md) for *which construct the logic belongs in and when to promote it*.

**Ground auth before you grade.** The identity model — which actor `type`s exist, what a permission means — is **project-specific**: establish the *actual* model from the code first ([identity-and-access.md](./packages/core/identity-and-access.md) → *Reviewing an auth change*). A gap (a feature covering `user` but not `api`) is a **question to raise, not an automatic fail**; never grade auth as a flat checklist.

**Ground tenancy too — but a hole is a blocker.** The model is likewise project-specific — establish it from the code ([multi-tenancy.md](./packages/core/multi-tenancy.md) → *Reviewing a tenancy change*). A tenant-owned table missing `tenantId` or off the scoped seam, a hand-written tenant filter, or an ad-hoc unscoped client is a **structural hole in the isolation guarantee — a blocker, not a question.** The one judgment call: is a new table tenant-owned or global.

## Step 3 — Validate

Validate each mapped node's changed area against the routed guideline + `end-here`: the guideline for the *why*, the `end-here` boxes as the pass/fail gate. Nodes are independent — validate one at a time or **launch a sub-agent per node** (one guideline + that area's diff each) and collect results. Never validate an area against a guideline it wasn't routed to.

## Step 4 — Cross-cutting sweeps (always)

Run once across the whole diff, outside satellites' folders:

- **Logging** → [logging.md](./packages/core/system/logging.md) — `ctx.system.logger` at method entry / business events / side effects; errors logged with full context before re-throw; trace ID flowing throughout.
- **Patterns** → [branching-logic.md](./packages/core/branching-logic.md) (incl. [Strategy escalation](./packages/core/branching-logic.md#escalation-when-the-decision-grows-into-a-family--extract-a-strategy)) — tangled policy that should be a named decision; substantial type-branching that should be a Strategy.

**The review lens.** Hold these cross-cutting invariants against every node, whatever was touched; each links its owning doc. A satellite's nodes are held only to placement, the published-API boundary and business-rule ownership:

- **One home for every piece of code** — feature, driven adapter / `system/` primitive, app, or satellite; anything else needs explicit confirmation → [code-placement.md](./code-placement.md).
- **Dependencies point one way** — driving → domain → driven, never reversed → [code-placement.md](./code-placement.md#layering-three-roles-one-direction).
- **Cross-feature crossings have exactly two shapes** — an owner-exported `void` guard (verdict) or the data path (an orchestration calling the owner's services; schemas deriving from the owner's schemas); any other cross-feature import in domain code fails → [implementation-validation.md](./packages/core/implementation-validation.md#cross-feature-guards).
- **A cross-entity invariant is the one business rule an orchestration may own** — a predicate over ≥2 owners' data; a *single-entity* rule in an orchestration fails → [orchestration.md](./packages/core/orchestration.md#cross-entity-invariants).
- **Business logic lives in the domain, integration-agnostic** — a rule existing *only* in a controller, adapter, or the UI fails → [code-placement.md](./code-placement.md#layering-three-roles-one-direction).
- **Failures are raised, not returned; handled → `4xx` in one shape, never a `500`** → [error-handling.md](./error-handling.md).
- **A refusal to an AI assistant guides its fix** (MCP) — every problem at its exact field path, all in one refusal, each with a hint naming a valid shape, a tool or a docs topic → [tool-design.md](./apps/mcp/tool-design.md#refusals-that-guide).
- **Authorization is enforced in the domain against `ctx.actor`, not only at the edge** → [identity-and-access.md](./packages/core/identity-and-access.md#authorization-is-a-domain-concern).
- **The context asserts facts; no operation establishes its own preconditions** — factory invoked only in driving adapters and test setup → [app-context.md](./packages/core/app-context.md#the-context-is-a-statement-of-fact).
- **Tenant isolation is structural, not per-query** (multi-tenant apps) — scoped seam by default; the only unscoped path is an explicit elevated context → [multi-tenancy.md](./packages/core/multi-tenancy.md#isolation-is-enforced-at-the-database-seam).
- **Single source of truth; define once, derive the rest** — schemas infer types; boundaries reuse core schemas; every boundary/contract type lives in its feature's schema file — none inline in a service, mapper, or handler (local implementation-only types excepted) → [implementation-schemas.md](./packages/core/implementation-schemas.md).
- **Climb on a real signal, not in anticipation** — every extraction/promotion waits for the second signal; a pure seam the test strategy justifies with variation that already exists is that signal → [logic-placement.md](./packages/core/logic-placement.md), [testing.md → Seams](./packages/core/testing.md#seams--structuring-logic-so-unit-tests-carry-it).
- **Every risk has one owning level, the cheapest that can observe it** — chosen by where the decision is made, never by the construct → [testing.md](./packages/core/testing.md#choosing-the-level).
- **Promotions are backfilled** — the old home delegates; every existing caller re-evaluated, none stranded → [logic-placement.md](./packages/core/logic-placement.md#the-backfill-obligation-the-revisit-list).
- **All-or-nothing; side effects after commit** — one transaction boundary, effects dispatched post-commit → [atomicity.md](./packages/core/atomicity.md).

## Step 5 — Report

Report the Step 0 outcome first — CI result, and which rules this review checked because CI does not enforce them. Then per node: the guideline checked against, conformance, and any blockers (a box that could not be ticked, or a CI rule's failure condition hit). A blocker is a blocker, not a note.

**A map with a tests node always reports a Tests section:** the [test-review report](./skills/test-review/report-template.md) — its tables filled, one line per strategy row and category question. A tests node with no such section is unreviewed.
