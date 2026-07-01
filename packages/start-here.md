# Packages — Start Here

> **Stub.** This folder's guidelines are not written yet. For now, [code-placement.md](../code-placement.md) is the source of truth for what belongs here and why.

`packages/` holds the importable libraries of the repo — code that gets *consumed*, never run on its own.

- **[core/](./core/start-here.md)** — the domain hexagon: business logic plus the driven infrastructure it sits on (`core/src/system/`). This is the always-present package; its guidelines are the most developed.
- **Graduated driven adapters** — a driven adapter (see [code-placement.md](../code-placement.md)) that has outgrown `core/src/system/` earns its own package here: `packages/<name>/` (e.g. a durable-execution `workflow/` engine). It graduates only on a real signal — reused beyond the core, heavy enough to own its lifecycle, or a genuine engine. `core` depends on it; it never depends on `core`'s domain.

**Content to follow.** This doc will eventually document the pattern for building a standalone driven-adapter package — the general "focused interface, no business logic, name by capability" rules and the graduation criteria — so a package that leaves `core` follows the standard without reaching back into it.
