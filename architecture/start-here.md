# Start Here

The engineering playbook: how we structure and build services. Each doc covers one concern; this file is the map.

**The concern docs:** service-first-architecture (services) · implementation-schemas · implementation-validation · workflow-orchestration · working-with-databases · testing. Reference: named-decisions, implementation-strategy-pattern, typescript-coding-standards.

When a feature is done, evaluate it with [end-here.md](./end-here.md) — a retrospective checklist that points back into these docs.

---

## Layering

Business logic lives in the **service layer** — never in controllers or integration code. Controllers (route handlers, queue consumers, CLI commands) are thin glue: parse the request, call a service or workflow, format the response. They hold no business rules.

The service layer is **integration-agnostic** — the same logic works behind REST, GraphQL, a worker, or a scheduled job. Build it first, then wire a delivery mechanism to it.

Together, services, workflows, and shared validation form the **domain layer** — the feature's framework-agnostic business code, as opposed to controllers and integration code. When a rule applies across the feature's business code (not just one service), docs refer to the domain layer.

Beneath the domain layer sits the **infrastructure layer** — adapters that connect the application to external systems (database, email, queue). The domain calls into these adapters; adapters never import from the domain. Infrastructure adapters live in `src/system/` and are documented separately in [system/start-here.md](../system/start-here.md).

See service-first-architecture.md (services) and workflow-orchestration.md (multi-service coordination).

## Designing a Feature

Work backward from the core business value, not forward from "how do we create X?":

1. **Start at the core operation** — the end-state the system exists to perform.
2. **Ask "what must exist for this to work?"** — the entities the core operation needs.
3. **Ask "how does that get set up?"** — trace each entity back to how it comes into being.
4. **Keep peeling** until you reach the entry point (usually user-initiated creation).

Each layer you uncover becomes a service scoped to that entity — see service-first-architecture.md for the service types.

## Folder Organization

Organize by **feature/domain, not by technical layer**. Everything for one capability lives in one folder (per the File Structure below), so adding a feature means adding a folder, not touching `services/`, `schemas/`, `exceptions/` directories scattered across the codebase. Features stay co-located, understandable in one place, and movable independently.

`src/system/` is reserved for infrastructure (db, email, queue, and similar); every other direct child of `src/` is a feature folder.

**Any folder that fits neither category requires explicit confirmation from the user before it is created.** A shared utilities folder, a cross-cutting helpers folder, anything that is not a named domain feature and not an infrastructure adapter — these are not the developer's call to make unilaterally. Stop and confirm. This applies at every level of the `src/` tree, not just the top level.

## File Structure

```
src/
  system/
    db/           - all Drizzle table definitions in one file (see system/database.md)
  <feature>/
    exceptions.ts   - one domain exception per feature; carries structured context; thrown by
                      services, workflows, and validation (see implementation-validation.md)
    services/       - one service, several, or nested sub-feature folders (e.g. activity/)
                      for complex clusters — each holding its own services
                      (see service-first-architecture.md)
    workflows/      - compose multiple services: sequencing and coordination, no business rules
                      (see workflow-orchestration.md)
    schemas/        - Zod schemas + inferred type exports (see implementation-schemas.md)
    shared/
      validation.ts - shared business-rule guards reused by services/workflows; throw a domain
                      exception (see implementation-validation.md)
      utils.ts      - non-domain helper functions
    __tests__/      - <name>.unit.ts (unit) · <name>.integration.ts (integration)
                      (see testing.md)
```

## Anti-Patterns (cross-cutting)

- **Scattered business rules** — logic spread across controllers, middleware, and utilities instead of consolidated in the service layer.

## File Naming

1. Use kebab-case for all file and folder names.
2. Use the appropriate `.{suffix}.ts` extension: `.service.ts`, `.exception.ts`, `.unit.ts`, `.integration.ts`, `.workflow.ts`.

### Singular vs plural

The domain layer uses **singular** throughout — feature folders, file names, class names, and schema names. A service operates on one entity, so the concept is singular everywhere it appears.

```
todo/                    ✓
todos/                   ✗

todo.service.ts          ✓
TodoService              ✓
TodoSchema               ✓
```

Drizzle table names are the deliberate exception — they use **plural** because tables are collections (`todos`, `orders`). This is the one place domain naming and database naming intentionally diverge.

### Service naming

Service names follow the service's responsibility. Decide the role before deciding the name.

| Role | Pattern | Example |
|---|---|---|
| Single-entity operations | `{Entity}Service` | `TodoService` |
| Collection / bulk operations | `{Entity}CollectionService` | `TodoCollectionService` |
| Single sub-entity operations | `{Parent}{Child}Service` | `TodoCommentService` |
| Sub-entity collection / bulk | `{Parent}{Child}CollectionService` | `TodoCommentCollectionService` |

A collection service may use its single-entity counterpart internally for per-entity logic. See service-first-architecture.md for how to decide service roles and domain boundaries.
