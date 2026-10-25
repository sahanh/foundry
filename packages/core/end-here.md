# End Here — `packages/core`

Verify companion to [start-here.md](./start-here.md). Run the sections matching your change (all, for a whole feature). **A box you cannot tick is a blocker.** A "feature" = one folder under `packages/core/src/`.

Deterministic rules (imports, naming, TypeScript, time/id/context hygiene) are CI checks, not boxes — [setup/ci-verification.md](../../setup/ci-verification.md); without CI for them, [review.md](../../review.md) Step 0 checks them.

---

## Layering → [start-here.md](./start-here.md)
- [ ] Business rules only in services/orchestrations (never controller, handler, middleware) — logic runs unchanged behind HTTP, worker, CLI — [start-here.md](./start-here.md#the-domain-layer)

## Structure & naming → [start-here.md](./start-here.md)
- [ ] Capability co-located in one feature folder — [start-here.md](./start-here.md#feature-structure)
- [ ] Singular folder/class names, `{Entity}Service`/`{Entity}CollectionService` by role; sub-feature folders only where earned — [start-here.md](./start-here.md#file-naming)

## Schemas → [implementation-schemas.md](./implementation-schemas.md)
- [ ] One source-of-truth schema per entity; types inferred, never hand-written — [implementation-schemas.md](./implementation-schemas.md#core-principle)
- [ ] Every boundary/contract type (persisted shape/projection or cross-module export, presentation included) lives in the feature's schema file(s) — never inline in a service/orchestration/mapper/handler; a subset/variant is derived (pick/omit/partial), not a hand-written twin. Local implementation-only types (options bags, intermediates) may stay inline; sole exception, an exported DTO sealed by a module-private brand symbol co-located with its only constructor — [implementation-schemas.md](./implementation-schemas.md#schema-organization)
- [ ] Input/variant schemas derived (pick/omit/partial), not duplicated — [implementation-schemas.md](./implementation-schemas.md#avoiding-duplication)
- [ ] No non-genuine optionals or stringly-typed enum candidates — [implementation-schemas.md](./implementation-schemas.md#explicit-over-implicit)
- [ ] DB-backed strings carry matching `.max()`; content rules as `.refine()` — [implementation-schemas.md](./implementation-schemas.md#mirror-storage-constraints)
- [ ] Ids: `entityId('…')` in schema, minted via `ctx.system.helpers.newId('…')`, prefix from the single `system/` registry — [identifiers.md](./identifiers.md)

## Services → [service-first-architecture.md](./service-first-architecture.md)
- [ ] Domain boundary confirmed with the user before implementing — [service-first-architecture.md](./service-first-architecture.md#4-decide-domain-boundaries-first)
- [ ] Consumption designed first: usage pseudo-code, names judged consumer-side, no words the receiver already implies — [service-first-architecture.md](./service-first-architecture.md#3-consumer-first-design)
- [ ] One service accomplishes the use case — consumer touches ≤2–3 services, facade/orchestration beyond — [service-first-architecture.md](./service-first-architecture.md#5-service-decomposition)
- [ ] Every injected dependency used across methods; no repeatedly-passed parameter that should be injected — [service-first-architecture.md](./service-first-architecture.md#validation-the-constructor-declares-the-scope)
- [ ] Granularity fits scope — no premature split, not left coarse after growth — [service-first-architecture.md](./service-first-architecture.md#granularity-scales-with-scope)

## Validation & exceptions → [implementation-validation.md](./implementation-validation.md)
- [ ] Each service validates its own inputs: schema parse, then business rules — [implementation-validation.md](./implementation-validation.md#who-validates-what)
- [ ] Checks reused by ≥2 callers (only those) live in `shared/validation.ts` — [implementation-validation.md](./implementation-validation.md#shared-validation-helpers)
- [ ] One domain exception per feature, structured context, thrown by services/guards/orchestrations — [implementation-validation.md](./implementation-validation.md#the-domain-exception)
- [ ] Cross-feature guards return `void`, read only owner's tables, throw owner's exception — [implementation-validation.md](./implementation-validation.md#cross-feature-guards)

## Identity & Access → [identity-and-access.md](./identity-and-access.md)
> Auth is **project-specific** — verify against the actual actor `type`s and permission model; raise gaps (e.g. `user` but not `api`) as questions, not auto-fails — [identity-and-access.md](./identity-and-access.md#reviewing-an-auth-change).
- [ ] First-time setup: actor `type`s and permission model confirmed with the user — [identity-and-access.md](./identity-and-access.md#the-actor--ctxactor)
- [ ] Authorization enforced in the domain (service/guard reading `ctx.actor`), not only edge-side; guards throw the feature's exception, `void` when cross-feature — [identity-and-access.md](./identity-and-access.md#authorization-is-a-domain-concern)
- [ ] Reads authorized too — `get`/`list` scoped to `ctx.actor` unless world-readability is an explicit recorded decision — [identity-and-access.md](./identity-and-access.md#authorization-is-a-domain-concern)
- [ ] Actor reaches the domain as `ctx.actor`, never a hand-threaded `userId` — [identity-and-access.md](./identity-and-access.md#the-actor--ctxactor)
- [ ] Cross-resource limits (quota/plan) are cross-entity invariants in orchestrations, never guards — [identity-and-access.md](./identity-and-access.md#extended-permissions--a-promotion-ladder)
- [ ] Provisioning only in the dedicated system-actor-gated identity flow (explicit edge trigger); other flows throw on missing users — [identity-and-access.md](./identity-and-access.md#identity-lifecycle--where-a-user-comes-from)

## Orchestrations → [orchestration.md](./orchestration.md)
- [ ] Multi-service use cases sequenced by an orchestration with no single-entity rules; its validation thin (inputs, existence, owned cross-entity invariants) — [orchestration.md](./orchestration.md#1-no-single-entity-logic-validation-is-thin)
- [ ] Triggered by altitude (coordinates 2+ services), not duration — [orchestration.md](./orchestration.md#when-an-orchestration-exists)
- [ ] Cross-entity invariant = predicate over ≥2 owners' data (else stays a service/guard), gathered via owners' services, checked in-transaction, throwing the owner's exception — [orchestration.md](./orchestration.md#cross-entity-invariants)
- [ ] On promotion from a service method, superseded method's direct callers re-evaluated — [orchestration.md](./orchestration.md#promotion-when-a-service-operation-becomes-an-orchestration)
- [ ] Orchestration method's name differs from any consumed service read whose return shape differs (hydration/assembly); a pure pass-through (facade) keeps the name — [orchestration.md](./orchestration.md#naming)

## Placement & promotion → [logic-placement.md](./logic-placement.md)
- [ ] Logic at the lowest rung that fits; no split before a real second signal — [logic-placement.md](./logic-placement.md#the-rungs)
- [ ] Orchestration needs a real signal (2+ services, cross-feature data, cross-entity invariant), not mere boundary-crossing — [logic-placement.md](./logic-placement.md#the-decision-procedure)
- [ ] Cross-entity-invariant orchestration's owner chosen by the ownership ladder — [logic-placement.md](./logic-placement.md#who-owns-a-cross-entity-invariant-orchestration)
- [ ] On promotion, old home delegates (no orphaned copy); existing callers re-evaluated — [logic-placement.md](./logic-placement.md#the-backfill-obligation-the-revisit-list)

## Database → [working-with-databases.md](./working-with-databases.md)
- [ ] Drizzle called directly via `ctx.system.db` (no repository layer); each service touches only its feature's tables — [working-with-databases.md](./working-with-databases.md#feature-ownership)
- [ ] Cross-feature access via owning service (orchestrations) or exported guard (services), never the DB — [working-with-databases.md](./working-with-databases.md#cross-feature-data-access)
- [ ] Hard deletes by default; soft-delete only on real signal: nullable `deletedAt` via `softDelete(values)`, filtered once owner-side — [working-with-databases.md](./working-with-databases.md#deletes)

## Atomicity → [atomicity.md](./atomicity.md)
- [ ] Multi-write use case in one `ctx.transaction` owned by the outermost caller; non-DB side effects dispatched after commit, never inside — [atomicity.md](./atomicity.md#db-only-inside-effects-after-commit)
- [ ] Genuinely synchronous — nothing waiting, sleeping, retrying, or surviving restarts (out of Foundry's scope) — [atomicity.md](./atomicity.md#what-a-transaction-cannot-span)

## AppContext → [app-context.md](./app-context.md)
- [ ] Nothing establishes a fact the context asserts (no write making `ctx.actor`/`ctx.tenant` valid); missing preconditions throw, never repaired inline — [app-context.md](./app-context.md#the-context-is-a-statement-of-fact)

## Testing → [testing.md](./testing.md)
- [ ] A test strategy for the PRD exists and links it; each use case it covers has an entry point, layer map and vendors — [testing.md](./testing.md#what-the-strategy-contains)
- [ ] Every category question is answered for every use case: rows, or an `n/a` whose behaviour is truly absent — [testing.md](./testing.md#what-the-strategy-contains)
- [ ] Each risk names its owning level and why — [testing.md](./testing.md#choosing-the-level)
- [ ] *Not covered* holds only behaviour-free layers or user-accepted exceptions — [testing.md](./testing.md#what-the-strategy-contains)
- [ ] The tests cover every risk row at its level — one test may cover several rows, each still able to fail on its own; each integration test spans the layers its row names and mocks only the vendors it names — [testing.md](./testing.md#choosing-the-level)
- [ ] No risk owned at two levels: integration does not re-run unit variants, and an overlap the strategy needs says why — [testing.md](./testing.md#choosing-the-level)
- [ ] Breaking each behaviour turns its test red: every guard proven by an outcome that depends on it — [testing.md](./testing.md#what-a-test-must-prove)
- [ ] Every guard row (lock, conditional write, uniqueness guard, rollback, refusal) has a valid break-it record in the PR: baseline passing, only that protection disabled, its assertion failing — [testing.md](./testing.md#what-a-test-must-prove)
- [ ] Every assertion can fail: literal expected values, the precise failure, every claim in the test's name, negative assertions in a setup where the effect could happen, spies on the object the code uses — [testing.md](./testing.md#what-a-test-must-prove)
- [ ] No internal structure pinned — [testing.md](./testing.md#what-a-test-must-prove)
- [ ] Integration tests run on the test AppContext: production database engine, persisted `user` actors, internal queue running the real handler, only external vendors spied — [testing.md](./testing.md#the-test-appcontext)

---

The root review protocol runs the cross-cutting sweeps regardless: logging, Patterns (named decisions, incl. Strategy escalation).
