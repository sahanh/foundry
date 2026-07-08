# Packages — Start Here

`packages/` holds the importable libraries of the repo — code that gets *consumed*, never run on its own. [code-placement.md](../code-placement.md) is the source of truth for what belongs here and why.

- **[core/](./core/start-here.md)** — the domain hexagon: business logic plus the driven infrastructure it sits on (`core/src/system/`). The always-present package; its guidelines are the most developed.
- **Graduated driven adapters** — `packages/<name>/`, a driven adapter that outgrew `core/src/system/` on a real signal. Criteria and standard: [code-placement.md → Graduation](../code-placement.md#graduation-when-a-driven-adapter-leaves-system) and *Building a driven adapter*.

Deferred: a dedicated standalone-package guideline — until written, code-placement.md's driven-adapter rules govern.

When a change here is complete, verify against [end-here.md](./end-here.md). You are usually routed there by the [review protocol](../review.md).
