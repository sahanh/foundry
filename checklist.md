# Implementation Checklist

Run this after implementation is complete — not during, not as a planning reference. Every box must be ticked for every feature folder before the work is considered done. A box you cannot tick is a blocker, not a note.

**How to use it:** list every feature folder under `src/`. Work through all sections for each one. Then run the sanity sweeps once across the whole implementation.

---

## Per feature

A "feature" is one business capability — one folder under `src/`. Run all sections below for each.

### 1. Layering → [architecture/start-here.md](./architecture/start-here.md)
- [ ] Is every business rule in a service or workflow — never in a controller, route handler, or middleware?
- [ ] Could this logic run unchanged behind a different delivery mechanism (HTTP, worker, CLI)?

### 2. Structure & naming → [architecture/start-here.md](./architecture/start-here.md)
- [ ] Is everything for this capability co-located in one feature folder?
- [ ] kebab-case files with the right `.<suffix>.ts`, and sub-feature folders only where a cluster earned one?
- [ ] Are folder and class names singular? Does the service naming follow the role pattern (`{Entity}Service`, `{Entity}CollectionService`)?

### 3. Schemas → [architecture/implementation-schemas.md](./architecture/implementation-schemas.md)
- [ ] One schema per entity as the source of truth, with types inferred rather than hand-written?
- [ ] Are input and variant schemas derived (pick / omit / partial) instead of duplicated?
- [ ] Any `any`, optionals that aren't genuinely optional, or stringly-typed fields that should be enums?
- [ ] Do string fields backed by DB columns have matching `.max()` constraints? Are content rules expressed as `.refine()`?
- [ ] Does every entity `id` use a prefixed `entityId('…')`, domain-minted — not a bare UUID or a DB-generated key? ([identifiers.md](./architecture/identifiers.md))

### 4. Services → [architecture/service-first-architecture.md](./architecture/service-first-architecture.md)
- [ ] Was the domain boundary decision confirmed with the user before implementation started?
- [ ] Does the constructor-injected entity get used by every method? (If not, logic is misplaced.)
- [ ] Does a consumer touch ≤ 2–3 services to accomplish a use case?
- [ ] Is the granularity right for the scope — not split prematurely, not left coarse after it grew?
- [ ] Are services lifecycle-agnostic — no self-instantiation, no reaching for globals?

### 5. Validation & exceptions → [architecture/implementation-validation.md](./architecture/implementation-validation.md)
- [ ] Does each service validate its own inputs — schema parse, then its business rules?
- [ ] Are checks reused by ≥ 2 callers (and only those) extracted to `shared/validation.ts`?
- [ ] One domain exception per feature, carrying structured context — thrown by services, guards, and workflows alike?

### 6. Workflows → [architecture/workflow-orchestration.md](./architecture/workflow-orchestration.md)
- [ ] For each multi-service use case, does a workflow own the sequencing — with no business rules of its own?
- [ ] Do services avoid calling each other, with coordination going up into the workflow?
- [ ] Is the workflow's validation thin — inputs and existence checks only?

### 7. Database → [architecture/working-with-databases.md](./architecture/working-with-databases.md)
- [ ] Do services call Drizzle directly via `ctx.system.db` — no repository layer between them?
- [ ] Does each service only touch the tables that belong to its feature?
- [ ] Is cross-feature data access going through the owning feature's service, not the DB directly?

### 7a. Atomicity → [architecture/atomicity.md](./architecture/atomicity.md)
- [ ] Does each multi-write use case run inside one `ctx.transaction` boundary owned by the outermost caller?
- [ ] Are all non-DB side effects dispatched *after* the boundary commits — never inside it?
- [ ] Is the use case correctly classified: atomic (transaction) vs durable (compensation)?

### 8. AppContext → [architecture/app-context.md](./architecture/app-context.md)
- [ ] Does every service receive AppContext through its constructor?
- [ ] Is all infrastructure access (db, logger) going through `ctx.system` — no direct imports of adapters?

### 9. Testing → [architecture/testing.md](./architecture/testing.md)
- [ ] Do `shared/validation.ts` guards have unit tests?
- [ ] Do services and workflows have integration tests?
- [ ] Right location (`__tests__/`) and suffixes (`.unit.ts` / `.integration.ts`)?
- [ ] Does every integration test use a test AppContext with a real or in-memory DB?
- [ ] Are infrastructure side effects (emails, jobs) asserted via spy adapters — not ignored?

---

## Sanity sweeps

Across the whole implementation, not per feature.

### Patterns → [architecture/implementation-strategy-pattern.md](./architecture/implementation-strategy-pattern.md) · [architecture/named-decisions.md](./architecture/named-decisions.md)
- [ ] Any substantial type-branching (if/else on a kind) that should become a Strategy?
- [ ] Any tangled policy buried in a handler that should become a named decision?

### TypeScript → [architecture/typescript-coding-standards.md](./architecture/typescript-coding-standards.md)
- [ ] Arrow functions for module-level definitions, `type` over `interface`, no non-null assertions, explicit return types on exports?
- [ ] No TypeScript enums — string literal unions instead?

### Logging → [system/logging.md](./system/logging.md)
- [ ] Is `ctx.system.logger` used at service method entry, business events, and infrastructure side effects?
- [ ] Are errors logged at `error` level with full context before re-throwing?
- [ ] Is the trace ID flowing through all log entries?
