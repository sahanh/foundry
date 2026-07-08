# Start Here — `packages/core`

`packages/core` is the **domain core**: the business logic (services, orchestrations, shared validation) plus the driven infrastructure it sits directly on (`system/` — db, logger, clock). This file maps the core's guidelines; each doc covers one concern.

> **Zoom out first.** For where `packages/core` sits in the whole repo — alongside `apps/` and other `packages/` — and the rule for deciding *where any piece of code belongs*, read [code-placement.md](../../code-placement.md) before this. That doc covers the topology and placement criteria; this doc covers what lives *inside* the core.

**The concern docs:** logic-placement (which construct logic lives in & when to promote it — consult when touching the service layer) · service-first-architecture (services) · implementation-schemas · identifiers · implementation-validation · orchestration · atomicity · working-with-databases · identity-and-access (the actor, identity lifecycle, authN at the edge, authZ in the domain) · multi-tenancy (tenant isolation — an edge-resolved scope enforced at the db seam; multi-tenant apps only) · app-context · testing. Reference: branching-logic (named decisions + the Strategy escalation tier). Driven infrastructure that lives inside the core is documented under [system/](./system/start-here.md). Repo-wide TypeScript coding standards (which apply to every package and app, not just the core) live in `common/` — see [typescript-coding-standards.md](../../common/typescript-coding-standards.md).

When implementation is complete, verify against [end-here.md](./end-here.md) — the mandatory verify companion to this file. Every box must be ticked for every feature before the work is considered done. You are usually routed there by the [review protocol](../../review.md), which maps what you touched.

---

## The domain layer

Services, orchestrations, and shared validation together form the **domain layer** — the feature's framework-agnostic business code; when a rule applies across a feature's business code (not just one service), docs refer to the domain layer. Business logic lives here and nowhere else, integration-agnostic — the rule is owned by [code-placement.md](../../code-placement.md#layering-three-roles-one-direction). Beneath it sits the core's driven infrastructure (`system/`), reached only through `AppContext` ([app-context.md](./app-context.md)).

## Designing a Feature

Work backward from the core business value, not forward from "how do we create X?":

1. **Start at the core operation** — the end-state the system exists to perform.
2. **Ask "what must exist for this to work?"** — the entities the core operation needs.
3. **Ask "how does that get set up?"** — trace each entity back to how it comes into being.
4. **Keep peeling** until you reach the entry point (usually user-initiated creation).

Each layer you uncover becomes a service scoped to that entity — see service-first-architecture.md for the service types.

## Feature Structure

Organize by **feature/domain, not by technical layer**. Everything for one capability lives in one folder under the core's `src/`, so adding a feature means adding a folder — not touching `services/`, `schemas/`, `exceptions/` directories scattered across the codebase. Features stay co-located, understandable in one place, and movable independently.

Inside a single feature folder:

```
<feature>/
  exceptions.ts   - one domain exception per feature; carries structured context; thrown by
                    services, orchestrations, and validation (see implementation-validation.md)
  services/       - one service, several, or nested sub-feature folders (e.g. activity/)
                    for complex clusters — each holding its own services
                    (see service-first-architecture.md)
  orchestrations/ - compose multiple services: sequencing and coordination, no single-entity business
                    rules (may own a cross-entity invariant) (see orchestration.md)
  schemas/        - Zod schemas + inferred type exports (see implementation-schemas.md)
  shared/
    validation.ts - shared business-rule guards reused by services/orchestrations; throw a domain
                    exception; may be exported as the feature's cross-feature contract — the one
                    thing another feature's domain code may import (see implementation-validation.md)
    utils.ts      - non-domain helper functions
  __tests__/      - <name>.unit.ts (unit) · <name>.integration.ts (integration)
                    (see testing.md)
```

Where feature folders sit relative to `system/`, `apps/`, and other `packages/` — the macro tree, and the rule that any folder fitting *neither* a feature nor an adapter needs explicit confirmation — lives in [code-placement.md](../../code-placement.md). Besides the driven adapters, `system/` also holds the core's non-domain **foundational primitives** — the id helpers + prefix registry, pagination, and the `AppContext` type — reached either as `ctx.system.helpers.*` or a direct import; see [system/start-here.md](./system/start-here.md).

## File Naming

1. Use kebab-case for all file and folder names.
2. Use the appropriate `.{suffix}.ts` extension: `.service.ts`, `.orchestration.ts`, `.exception.ts`, `.unit.ts`, `.integration.ts`.

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
