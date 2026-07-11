# End Here — `packages/core`

Verify companion to [start-here.md](./start-here.md). Run the sections matching your change (all, for a whole feature). **A box you cannot tick is a blocker.** A "feature" = one folder under `packages/core/src/`.

---

## Layering → [start-here.md](./start-here.md)
- [ ] Business rules only in services/orchestrations (never controller, handler, middleware) — logic runs unchanged behind HTTP, worker, CLI — [start-here.md](./start-here.md#the-domain-layer)

## Structure & naming → [start-here.md](./start-here.md)
- [ ] Capability co-located in one feature folder — [start-here.md](./start-here.md#feature-structure)
- [ ] kebab-case files, right `.<suffix>.ts`, singular folder/class names, `{Entity}Service`/`{Entity}CollectionService`; sub-feature folders only where earned — [start-here.md](./start-here.md#file-naming)

## Schemas → [implementation-schemas.md](./implementation-schemas.md)
- [ ] One source-of-truth schema per entity; types inferred, never hand-written — [implementation-schemas.md](./implementation-schemas.md#core-principle)
- [ ] Input/variant schemas derived (pick/omit/partial), not duplicated — [implementation-schemas.md](./implementation-schemas.md#avoiding-duplication)
- [ ] No `any`, non-genuine optionals, stringly-typed enum candidates — [implementation-schemas.md](./implementation-schemas.md#explicit-over-implicit)
- [ ] DB-backed strings carry matching `.max()`; content rules as `.refine()` — [implementation-schemas.md](./implementation-schemas.md#mirror-storage-constraints)
- [ ] Ids: `entityId('…')` in schema, minted via `ctx.system.helpers.newId('…')` (never bare UUID/DB-key), prefix from the single `system/` registry — [identifiers.md](./identifiers.md)

## Services → [service-first-architecture.md](./service-first-architecture.md)
- [ ] Domain boundary confirmed with the user before implementing — [service-first-architecture.md](./service-first-architecture.md#4-decide-domain-boundaries-first)
- [ ] Consumption designed first: usage pseudo-code, names judged consumer-side — [service-first-architecture.md](./service-first-architecture.md#3-consumer-first-design)
- [ ] One service accomplishes the use case — consumer touches ≤2–3 services, facade/orchestration beyond — [service-first-architecture.md](./service-first-architecture.md#5-service-decomposition)
- [ ] Every injected dependency used across methods; no repeatedly-passed parameter that should be injected — [service-first-architecture.md](./service-first-architecture.md#validation-the-constructor-declares-the-scope)
- [ ] Granularity fits scope — no premature split, not left coarse after growth — [service-first-architecture.md](./service-first-architecture.md#granularity-scales-with-scope)
- [ ] Lifecycle-agnostic: no self-instantiation, globals, framework coupling — [service-first-architecture.md](./service-first-architecture.md#2-lifecycle-management)
- [ ] Other features reached only via exported guards (verdicts) — never their services or tables — [implementation-validation.md](./implementation-validation.md#cross-feature-guards)

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
- [ ] Services never inject or call each other; coordination goes up — [orchestration.md](./orchestration.md#2-services-never-call-each-other)
- [ ] Triggered by altitude (coordinates 2+ services), not duration — [orchestration.md](./orchestration.md#when-an-orchestration-exists)
- [ ] Cross-entity invariant = predicate over ≥2 owners' data (else stays a service/guard), gathered via owners' services, checked in-transaction, throwing the owner's exception — [orchestration.md](./orchestration.md#cross-entity-invariants)
- [ ] On promotion from a service method, superseded method's direct callers re-evaluated — [orchestration.md](./orchestration.md#promotion-when-a-service-operation-becomes-an-orchestration)

## Placement & promotion → [logic-placement.md](./logic-placement.md)
- [ ] Logic at the lowest rung that fits; no split before a real second signal — [logic-placement.md](./logic-placement.md#the-rungs)
- [ ] Orchestration needs a real signal (2+ services, cross-feature data, cross-entity invariant), not mere boundary-crossing — [logic-placement.md](./logic-placement.md#the-decision-procedure)
- [ ] Cross-entity-invariant orchestration's owner chosen by the ownership ladder — [logic-placement.md](./logic-placement.md#who-owns-a-cross-entity-invariant-orchestration)
- [ ] On promotion, old home delegates (no orphaned copy); existing callers re-evaluated — [logic-placement.md](./logic-placement.md#the-backfill-obligation-the-revisit-list)

## Database → [working-with-databases.md](./working-with-databases.md)
- [ ] Drizzle called directly via `ctx.system.db` (no repository layer); each service touches only its feature's tables — [working-with-databases.md](./working-with-databases.md#feature-ownership)
- [ ] Cross-feature access via owning service (orchestrations) or exported guard (services), never the DB — [working-with-databases.md](./working-with-databases.md#cross-feature-data-access)
- [ ] Domain timestamps `NOT NULL`, no DB default, stamped only via `ctx.system.helpers` (`timestamps`/`updatedAt`) — [working-with-databases.md](./working-with-databases.md)
- [ ] Hard deletes by default; soft-delete only on real signal: nullable `deletedAt` via `softDelete(values)`, filtered once owner-side — [working-with-databases.md](./working-with-databases.md#deletes)
- [ ] Multi-tenant: scoped `ctx.system.db` only — no hand-written `where tenantId`, no service-set `tenantId` — [multi-tenancy.md](./multi-tenancy.md)

## Atomicity → [atomicity.md](./atomicity.md)
- [ ] Multi-write use case in one `ctx.transaction` owned by the outermost caller; non-DB side effects dispatched after commit, never inside — [atomicity.md](./atomicity.md#db-only-inside-effects-after-commit)
- [ ] Genuinely synchronous — nothing waiting, sleeping, retrying, or surviving restarts (out of Foundry's scope) — [atomicity.md](./atomicity.md#what-a-transaction-cannot-span)

## AppContext → [app-context.md](./app-context.md)
- [ ] Every service receives AppContext via constructor — [app-context.md](./app-context.md#constructor-injection)
- [ ] Context factory only in driving adapters and test setup; core receives, never assembles — [app-context.md](./app-context.md#wiring)
- [ ] Nothing establishes a fact the context asserts (no write making `ctx.actor`/`ctx.tenant` valid); missing preconditions throw, never repaired inline — [app-context.md](./app-context.md#the-context-is-a-statement-of-fact)
- [ ] Infrastructure (db, logger) via `ctx.system`, no direct adapter imports; domain time from `ctx.system.clock.now()`, never `new Date()` — [app-context.md](./app-context.md#the-clock--ctxsystemclock)
- [ ] `ctx.actor` set for every operation (real principal or explicit `anonymous`) — never `undefined` or parameter-threaded — [app-context.md](./app-context.md#actor--tenant--ctxactor--ctxtenant)
- [ ] Multi-tenant: `ctx.tenant` read-only — set at assembly, never by a service (absent single-tenant) — [app-context.md](./app-context.md#actor--tenant--ctxactor--ctxtenant)

## Testing → [testing.md](./testing.md)
- [ ] `shared/validation.ts` guards unit-tested; services and orchestrations integration-tested — [testing.md](./testing.md#what-to-test-where)
- [ ] Tests in `__tests__/`, suffixed `.unit.ts` / `.integration.ts` — [testing.md](./testing.md#what-to-test-where)
- [ ] Integration tests use a test AppContext with real/in-memory DB; infra side effects (emails, jobs) asserted via spy adapters — [testing.md](./testing.md#integration-test-setup--appcontext)
- [ ] Transactional use case tested all-or-nothing: forced mid-flow failure → no rows, no spy calls — [testing.md](./testing.md#integration-test-flavours)

---

The root review protocol runs the cross-cutting sweeps regardless: TypeScript standards, logging, Patterns (named decisions, incl. Strategy escalation).
