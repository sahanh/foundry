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
- [ ] Does every entity `id` use a prefixed `entityId('…')`, domain-minted — not a bare UUID or a DB-generated key? ([identifiers.md](./identifiers.md))

## Services → [service-first-architecture.md](./service-first-architecture.md)
- [ ] Was the domain boundary decision confirmed with the user before implementation started?
- [ ] Does the constructor-injected entity get used by every method? (If not, logic is misplaced.)
- [ ] Does a consumer touch ≤ 2–3 services to accomplish a use case?
- [ ] Is the granularity right for the scope — not split prematurely, not left coarse after it grew?
- [ ] Are services lifecycle-agnostic — no self-instantiation, no reaching for globals?

## Validation & exceptions → [implementation-validation.md](./implementation-validation.md)
- [ ] Does each service validate its own inputs — schema parse, then its business rules?
- [ ] Are checks reused by ≥ 2 callers (and only those) extracted to `shared/validation.ts`?
- [ ] One domain exception per feature, carrying structured context — thrown by services, guards, and orchestrations alike?

## Orchestrations → [orchestration.md](./orchestration.md)
- [ ] For each multi-service use case, does an orchestration own the sequencing — with no business rules of its own?
- [ ] Do services avoid injecting or calling each other, with coordination going up into an orchestration?
- [ ] Is the orchestration's validation thin — inputs and existence checks only?
- [ ] Is the orchestration triggered by altitude (it coordinates 2+ services), not by duration?
- [ ] When a use case was promoted from a service method to an orchestration, were the direct callers of the superseded service method re-evaluated?

## Database → [working-with-databases.md](./working-with-databases.md)
- [ ] Do services call Drizzle directly via `ctx.system.db` — no repository layer between them?
- [ ] Does each service only touch the tables that belong to its feature?
- [ ] Is cross-feature data access going through the owning feature's service, not the DB directly?
- [ ] Are domain timestamp columns `NOT NULL` with no DB default, stamped by wrapping the write's values in `ctx.system.helpers` (`timestamps(values)` on create, `updatedAt(values)` on update) — and set nowhere else (no hand-written `createdAt`/`updatedAt`)?

## Atomicity → [atomicity.md](./atomicity.md)
- [ ] Does each multi-write use case run inside one `ctx.transaction` boundary owned by the outermost caller?
- [ ] Are all non-DB side effects dispatched *after* the boundary commits — never inside it?
- [ ] Is the use case correctly classified: atomic (transaction) vs durable (compensation)?

## AppContext → [app-context.md](./app-context.md)
- [ ] Does every service receive AppContext through its constructor?
- [ ] Is all infrastructure access (db, logger) going through `ctx.system` — no direct imports of adapters?
- [ ] Do domain time reads come from `ctx.system.clock.now()` rather than `new Date()`?

## Testing → [testing.md](./testing.md)
- [ ] Do `shared/validation.ts` guards have unit tests?
- [ ] Do services and orchestrations have integration tests?
- [ ] Right location (`__tests__/`) and suffixes (`.unit.ts` / `.integration.ts`)?
- [ ] Does every integration test use a test AppContext with a real or in-memory DB?
- [ ] Are infrastructure side effects (emails, jobs) asserted via spy adapters — not ignored?

---

The cross-cutting sweeps that apply to *any* change — TypeScript standards, logging, and Strategy/Named-Decisions patterns — are run by the review protocol regardless of what you touched. See the root review protocol.
