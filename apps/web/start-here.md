# Start Here — `apps/web` (Frontend)

`apps/web` is the **frontend client UI** — the human-facing driving surface of the system. Like every app under `apps/`, it is a **driving adapter**: it calls *into* the domain (through the API app over HTTP, or directly from server-side code), never the reverse. This file maps the frontend's guidelines; each doc covers one concern.

> **This is a skippable branch.** If your work is not frontend/UI, you do **not** need to read this subtree — stop at [apps/start-here.md](../start-here.md), which covers the server-side transport apps. Everything below is for building the client UI.

> **Zoom out first.** For where `apps/web` sits in the whole repo — one driving adapter among `apps/`, beside the domain core it consumes — read [code-placement.md](../../code-placement.md), then [apps/start-here.md](../start-here.md). Those cover *where the frontend belongs*; this doc covers what lives *inside* it.

## The one macro rule: the UI holds no business rules

The frontend is exactly as thin as a controller: it renders state and turns user intent into calls on the core; a rule may be *mirrored* for fast feedback but never lives only in the UI — rule owner: [code-placement.md → Worked Examples](../../code-placement.md#worked-examples). Everything below governs the frontend's rich *internal* structure, which the thin-controller guidance never had to.

**The concern docs:**

- **[component-placement.md](./component-placement.md)** — where a component starts, how it's named and grouped, and when it earns promotion to shared. The frontend analogue of the core's *climb on a real signal, not in anticipation*.
- **[app-shell.md](./app-shell.md)** — the authenticated shell and container own app-level layout; feature components stay layout-agnostic.
- **[visual-system.md](./visual-system.md)** — shared visual treatments and design tokens live in one place; inherit the default before adding a local variant.
- **[ui-scope.md](./ui-scope.md)** — build the requested surface's essentials; confirm before adding adjacent product surfaces.

## Designing a UI feature

Work from the requested surface inward, reusing shared layers before inventing local ones:

1. **Scope the surface** from the request — the essentials of the named pattern, no adjacent surfaces ([ui-scope.md](./ui-scope.md)).
2. **Place components close to the owning feature**, named with feature context; keep the first implementation local ([component-placement.md](./component-placement.md)).
3. **Compose inside the shared shell and container** — don't reinvent app-level layout ([app-shell.md](./app-shell.md)).
4. **Inherit the visual system** — reach for semantic tokens and the shared default before any local style ([visual-system.md](./visual-system.md)).

When a change here is complete, verify against [end-here.md](./end-here.md) — the verify companion to this file. You are usually routed there by the [review protocol](../../review.md).
