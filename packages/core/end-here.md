# End Here — `packages/core`

The verify companion to [start-here.md](./start-here.md). `start-here` is where you **begin** a change in the domain core; this is where you **confirm** you did it right. It is generic on purpose — each check points to the concern doc that owns the detail; read that doc when a box is in question.

You usually arrive here routed by the root review protocol (it maps what you touched and sends you to the matching section). You can also run it directly: work each section that matches what you changed. **A box you cannot tick is a blocker, not a note.** For a whole feature, run every section; for a scoped edit, run only the sections you touched.

A "feature" is one business capability — one folder under the core's `src/` (`packages/core/src/`).

---

## Layering → [start-here.md](./start-here.md)
- [ ] Is every business rule in a service or orchestration — never in a controller, route handler, or middleware?
- [ ] Could this logic run unchanged behind a different delivery mechanism (HTTP, worker, CLI)?

## Structure & naming → [start-here.md](./start-here.md)
- [ ] Is everything for this capability co-located in one feature folder?
- [ ] kebab-case files with the right `.<suffix>.ts`, and sub-feature folders only where a cluster earned one?
- [ ] Are folder and class names singular? Does the service naming follow the role pattern (`{Entity}Service`, `{Entity}CollectionService`)?

## Schemas → [implementation-schemas.md](./implementation-schemas.md)
- [ ] One schema per entity as the source of truth, with types inferred rather than hand-written?
- [ ] Are input and variant schemas derived (pick / omit / partial) instead of duplicated?
- [ ] Any `any`, optionals that aren't genuinely optional, or stringly-typed fields that should be enums?
- [ ] Do string fields backed by DB columns have matching `.max()` constraints? Are content rules expressed as `.refine()`?
- [ ] Does every entity `id` use a prefixed `entityId('…')` in its schema and `ctx.system.helpers.newId('…')` for minting — domain-minted via the injected id-source, not a bare UUID or a DB-generated key — with the prefix read from the single `system/` id registry, not re-declared? ([identifiers.md](./identifiers.md))

## Services → [service-first-architecture.md](./service-first-architecture.md)
- [ ] Was the domain boundary decision confirmed with the user before implementation started?
- [ ] Is every constructor-injected dependency used across the service's methods, and is no object repeatedly passed as a method parameter that should be injected instead? (Cohesion decides what the constructor takes — not an entity count; an unused injected scope means logic is misplaced.)
- [ ] Does a consumer touch ≤ 2–3 services to accomplish a use case?
- [ ] Is the granularity right for the scope — not split prematurely, not left coarse after it grew?
- [ ] Are services lifecycle-agnostic — no self-instantiation, no reaching for globals?
- [ ] Does a service reach other features only via their exported guards (verdicts), never by injecting their services or reading their tables?

## Validation & exceptions → [implementation-validation.md](./implementation-validation.md)
- [ ] Does each service validate its own inputs — schema parse, then its business rules?
- [ ] Are checks reused by ≥ 2 callers (and only those) extracted to `shared/validation.ts`?
- [ ] One domain exception per feature, carrying structured context — thrown by services, guards, and orchestrations alike?
- [ ] Does every **cross-feature** guard return `void`, read only its owner's tables, and throw its owner's exception — never returning the entity to the caller?

## Identity & Access → [identity-and-access.md](./identity-and-access.md)
> Auth is **project-specific**. Before ticking these, establish the project's actual actor `type`s and permission model and verify the change against *that* — a gap (e.g. a permission for `user` but not `api`) may be intentional, so raise it as a question rather than auto-failing. See [identity-and-access.md](./identity-and-access.md) → *Reviewing an auth change*.
- [ ] For a **first-time** identity & access setup, were the actor `type`s and the permission model proposed and confirmed with the user (as with domain boundaries)?
- [ ] Is every authorization decision enforced in the **domain** (a service or a guard reading `ctx.actor`), not only at the edge — so it holds for every consumer (HTTP, worker, CLI, job)?
- [ ] Does the current actor reach the domain via `ctx.actor` — never a `userId` hand-threaded through method params?
- [ ] Do ownership / authorization guards throw the feature's domain exception, returning `void` when cross-feature?
- [ ] Is a cross-resource limit (quota / plan) enforced as a **cross-entity invariant in an orchestration**, not smuggled into a guard?

## Orchestrations → [orchestration.md](./orchestration.md)
- [ ] For each multi-service use case, does an orchestration own the sequencing — with no *single-entity* business rules of its own?
- [ ] Do services avoid injecting or calling each other, with coordination going up into an orchestration?
- [ ] Is the orchestration's validation thin — inputs and existence checks, plus any cross-entity invariant it owns?
- [ ] Is the orchestration triggered by altitude (it coordinates 2+ services), not by duration?
- [ ] If it enforces a **cross-entity invariant**, is it genuinely a predicate over ≥2 owners' data (not a single-entity rule and not a single-feature verdict, which stay a service/guard) — gathered via each side's service, evaluated inside the transaction, throwing the owning feature's exception?
- [ ] When a use case was promoted from a service method to an orchestration, were the direct callers of the superseded service method re-evaluated?

## Placement & promotion → [logic-placement.md](./logic-placement.md)
- [ ] Is each piece of logic at the lowest rung that fits — not split into its own service, guard, or orchestration before a real (second) signal?
- [ ] Is any orchestration triggered by a real signal — 2+ services, a cross-feature data need, or a cross-entity invariant — not merely by crossing a feature boundary?
- [ ] For a cross-entity-invariant orchestration, was its owning feature chosen by the ownership ladder (outcome owner → rule owner → its own feature)?
- [ ] On any promotion, does the old home delegate to the new construct (no orphaned copy) and were existing callers re-evaluated so none are stranded?

## Database → [working-with-databases.md](./working-with-databases.md)
- [ ] Do services call Drizzle directly via `ctx.system.db` — no repository layer between them?
- [ ] Does each service only touch the tables that belong to its feature?
- [ ] Is cross-feature access going through the owning feature's service (from an orchestration) or its exported guard (from a service), never the DB directly?
- [ ] Are domain timestamp columns `NOT NULL` with no DB default, stamped by wrapping the write's values in `ctx.system.helpers` (`timestamps(values)` on create, `updatedAt(values)` on update) — and set nowhere else (no hand-written `createdAt`/`updatedAt`)?
- [ ] Are deletes hard by default — with soft-delete used only on a real signal, via a nullable `deletedAt` stamped through `ctx.system.helpers` (`softDelete(values)`) and filtered (`deletedAt IS NULL`) once in the owning service, not at call sites?
- [ ] In a **multi-tenant** app, do services rely on the scoped `ctx.system.db` — **no hand-written `where tenantId`**, and **no service-set `tenantId`** on insert (the seam applies both)? ([multi-tenancy.md](./multi-tenancy.md))

## Atomicity → [atomicity.md](./atomicity.md)
- [ ] Does each multi-write use case run inside one `ctx.transaction` boundary owned by the outermost caller?
- [ ] Are all non-DB side effects dispatched *after* the boundary commits — never inside it?
- [ ] Is the use case genuinely synchronous — completing in one operation, not one that waits on the outside world, sleeps, retries, or must survive a restart (which a transaction cannot span, and which this playbook does not yet cover)?

## AppContext → [app-context.md](./app-context.md)
- [ ] Does every service receive AppContext through its constructor?
- [ ] Is all infrastructure access (db, logger) going through `ctx.system` — no direct imports of adapters?
- [ ] Do domain time reads come from `ctx.system.clock.now()` rather than `new Date()`?
- [ ] Is `ctx.actor` populated for every operation (a real principal, or an explicit `anonymous` member) — never left `undefined`, and never threaded through method parameters instead?
- [ ] In a **multi-tenant** app, is `ctx.tenant` read-only — set only at assembly, never set, overridden, or threaded by a service? (Absent in single-tenant apps.)

## Testing → [testing.md](./testing.md)
- [ ] Do `shared/validation.ts` guards have unit tests?
- [ ] Do services and orchestrations have integration tests?
- [ ] Right location (`__tests__/`) and suffixes (`.unit.ts` / `.integration.ts`)?
- [ ] Does every integration test use a test AppContext with a real or in-memory DB?
- [ ] Are infrastructure side effects (emails, jobs) asserted via spy adapters — not ignored?

---

The cross-cutting sweeps that apply to *any* change — TypeScript standards, logging, and Strategy/Named-Decisions patterns — are run by the review protocol regardless of what you touched. See the root review protocol.
