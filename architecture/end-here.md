# End Here

A retrospective for [start-here.md](./start-here.md). Run it when a feature looks done.

**How to use it:** repeat the pass for every feature folder. Ask yourself each question and tick it only when you can answer honestly. A box you can't tick is a pointer, not a verdict — the rule and its rationale live in the linked doc, not here. The order mirrors how the feature was built; work top-down.

---

## Per feature

A "feature" is one business capability — one folder under `src/`. Run sections 1–7 for each.

### 1. Layering → [start-here.md](./start-here.md)
- [ ] Is every business rule in a service or workflow — never in a controller, route handler, or middleware?
- [ ] Could this logic run unchanged behind a different delivery mechanism (HTTP, worker, CLI)?

### 2. Structure & naming → [start-here.md](./start-here.md)
- [ ] Is everything for this capability co-located in one feature folder?
- [ ] kebab-case files with the right `.<suffix>.ts`, and sub-feature folders only where a cluster earned one?

### 3. Schemas → [implementation-schemas.md](./implementation-schemas.md)
- [ ] One schema per entity as the source of truth, with types inferred rather than hand-written?
- [ ] Are input and variant schemas derived (pick / omit / partial) instead of duplicated?
- [ ] Any `any`, optionals that aren't genuinely optional, or stringly-typed fields that should be enums?

### 4. Services → [service-first-architecture.md](./service-first-architecture.md)
- [ ] Does the constructor-injected entity get used by every method? (If not, logic is misplaced.)
- [ ] Does a consumer touch ≤ 2–3 services to accomplish a use case?
- [ ] Is the granularity right for the scope — not split prematurely, not left coarse after it grew?
- [ ] Are services lifecycle-agnostic — no self-instantiation, no reaching for globals?

### 5. Validation & exceptions → [implementation-validation.md](./implementation-validation.md)
- [ ] Does each service validate its own inputs — schema parse, then its business rules?
- [ ] Are checks reused by ≥ 2 callers (and only those) extracted to `shared/validation.ts`?
- [ ] One domain exception per feature, carrying structured context — thrown by services, guards, and workflows alike?

### 6. Workflows → [workflow-orchestration.md](./workflow-orchestration.md)
- [ ] For each multi-service use case, does a workflow own the sequencing — with no business rules of its own?
- [ ] Do services avoid calling each other, with coordination going up into the workflow?
- [ ] Is the workflow's validation thin — inputs and existence checks only?

### 7. Database → [working-with-databases.md](./working-with-databases.md)
- [ ] Do services call Drizzle directly — no repository layer between them?
- [ ] Does each service only touch the tables that belong to its feature?
- [ ] Is cross-feature data access going through the owning feature's service, not the DB directly?

### 8. Testing → [testing.md](./testing.md)
- [ ] Do `shared/validation.ts` guards have unit tests?
- [ ] Do services and workflows have integration tests?
- [ ] Right location (`__tests__/`) and suffixes (`.unit.ts` / `.integration.ts`)?

---

## Sanity sweeps

Across the whole feature, not per file.

### Patterns → [implementation-strategy-pattern.md](./implementation-strategy-pattern.md) · [named-decisions.md](./named-decisions.md)
- [ ] Any substantial type-branching (if/else on a kind) that should become a Strategy?
- [ ] Any tangled policy buried in a handler that should become a named decision?

### TypeScript → [typescript-coding-standards.md](./typescript-coding-standards.md)
- [ ] Arrow functions for module-level definitions, and `type` over `interface`?
