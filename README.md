# Foundry

**Foundry is an engineering standard for TypeScript codebases** — an opinionated take on how the domain, services, adapters, and edges are organised, with a review protocol built in. It's a guideline, not a dependency: a project adopts it by pointing its coding agents at this repository, and there's nothing to install or upgrade. For a human-friendly overview, see [sahanh.github.io/foundry](https://sahanh.github.io/foundry/).

The repo may also hold code that ships to another platform, in that platform's language — a Zapier app, a PHP WordPress plugin. Foundry places it and reviews its boundaries, while what sits inside its folder, toolchain and CI included, is the project's own ([plugins/start-here.md](./plugins/start-here.md)).

This file is the entry point to the standard. When an agent builds in a codebase that adopts Foundry, it reads here first and follows where it leads — this is the specification to follow, not a reference to consult occasionally. Read it before writing code.

**Start with [code-placement.md](./code-placement.md)** — it defines the repository's shape (`apps/` + `packages/`, plus `plugins/` when needed) and the one rule for where any piece of code belongs. Everything else sits underneath it:

- **[packages/core/](./packages/core/start-here.md)** — the domain core: how to structure and build features (services, orchestrations, validation, schemas, testing) and the rules that govern the domain layer.
- **[packages/core/system/](./packages/core/system/start-here.md)** — the driven infrastructure the core sits on: database, logger, clock, and other adapters.
- **[apps/](./apps/start-here.md)** — the driving adapters, in two families: **server-side transport** (HTTP, CLI, workers, MCP) and the **[frontend / web UI](./apps/web/start-here.md)** (a client surface). The web subtree is a *skippable branch* — open it only for UI work; backend-only work stops at the server-transport guidance. The **[MCP server](./apps/mcp/start-here.md)** has its own skippable subtree on top of the server-transport guidance.
- **[packages/](./packages/start-here.md)** — libraries, including driven adapters that graduated out of the core.
- **[plugins/](./plugins/start-here.md)** — code that ships to another platform and runs there (a Zapier app, a WordPress plugin), in any language. A *skippable branch* — open it only for plugin work.

Each level has two seams: a **`start-here.md`** to read *before* you build, and an **`end-here.md`** to verify *after*. When a change is complete, run the **[review protocol](./review.md)** — it maps what you touched, routes each area to the guideline that owns it, and validates against the matching `end-here`. It is mandatory — not a suggestion.

The rules a tool can decide on its own — imports, naming, TypeScript, column definitions — belong in the adopting repo's CI, not in review. **Setting up a repo for Foundry, or its CI? Start at [setup/start-here.md](./setup/start-here.md).**

One concern cuts across every level: **failure**. How an error is raised in the domain and presented at each edge is one strategy, in **[error-handling.md](./error-handling.md)** — a cross-cutting spine like this map itself; the per-layer docs apply it rather than re-decide it.

Renamed or removed concepts are recorded in **[CHANGELOG.md](./CHANGELOG.md)** — a lookup-on-demand index, not reading material: when a concept you expected is missing or renamed, consult the single entry that names it (it points to the owning guideline); never read the file whole. Each entry names the commit that made it, and an adopting repo pins the commit it last reconciled to ([setup/staying-in-sync.md](./setup/staying-in-sync.md)).

## Conventions

Repo-wide standards apply to every package and app, not just the domain core; a plugin meets only what [plugins/start-here.md](./plugins/start-here.md#toolchain-ci-and-release-are-the-projects) names. Cross-cutting standard docs live in **[common/](./common/)**:

- **Package manager:** use `pnpm` for JavaScript and TypeScript. Do not use `npm` or `yarn`. A plugin in another language uses that language's one package manager (Composer for PHP).
- **TypeScript:** [common/typescript-coding-standards.md](./common/typescript-coding-standards.md) — coding standards for all TypeScript in an adopting codebase.

## When in doubt

Foundry is the answer. If Foundry does not cover a case, raise it — the gap should be documented, not silently decided.
