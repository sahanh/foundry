# Engineering Playbook

This is the engineering standard for this project. It is not a reference to consult occasionally — it is the specification to follow when building any part of the codebase. If you are new to the project, read it before writing code.

**Start with [code-placement.md](./code-placement.md)** — it defines the repository's shape (`apps/` + `packages/`) and the one rule for where any piece of code belongs. Everything else sits underneath it:

- **[packages/core/](./packages/core/start-here.md)** — the domain core: how to structure and build features (services, orchestrations, validation, schemas, testing) and the rules that govern the domain layer.
- **[packages/core/system/](./packages/core/system/start-here.md)** — the driven infrastructure the core sits on: database, logger, clock, and other adapters.
- **[apps/](./apps/start-here.md)** — the driving adapters, in two families: **server-side transport** (HTTP, CLI, workers, MCP) and the **[frontend / web UI](./apps/web/start-here.md)** (a client surface). The web subtree is a *skippable branch* — open it only for UI work; backend-only work stops at the server-transport guidance.
- **[packages/](./packages/start-here.md)** — libraries, including driven adapters that graduated out of the core.

Each level has two seams: a **`start-here.md`** to read *before* you build, and an **`end-here.md`** to verify *after*. When a change is complete, run the **[review protocol](./review.md)** — it maps what you touched, routes each area to the guideline that owns it, and validates against the matching `end-here`. It is mandatory — not a suggestion.

One concern cuts across every level: **failure**. How an error is raised in the domain and presented at each edge is one strategy, in **[error-handling.md](./error-handling.md)** — a cross-cutting spine like this map itself; the per-layer docs apply it rather than re-decide it.

Renamed or removed concepts are recorded in **[CHANGELOG.md](./CHANGELOG.md)** — a lookup-on-demand index, not reading material: when a concept you expected is missing or renamed, consult the single entry that names it (it points to the owning guideline); never read the file whole.

## Conventions

Repo-wide standards apply to every package and app, not just the domain core. Cross-cutting standard docs live in **[common/](./common/)**:

- **Package manager:** use `pnpm`. Do not use `npm` or `yarn`.
- **TypeScript:** [common/typescript-coding-standards.md](./common/typescript-coding-standards.md) — coding standards for all TypeScript in the repo.

## When in doubt

The playbook is the answer. If the playbook does not cover a case, raise it — the gap should be documented, not silently decided.
