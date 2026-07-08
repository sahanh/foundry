# End Here — `apps/web` (Frontend)

The verify companion to [start-here.md](./start-here.md), for a change in the **frontend client UI**. `start-here` is where you begin; this is where you confirm the UI kept business rules out, placed its components right, and reused the shared shell and visual system instead of forking them.

You usually arrive here routed by the root [review protocol](../../review.md) when it maps a touch under `apps/web`. A box you cannot tick is a blocker, not a note.

---

## Placement — the UI holds no business rules → [start-here.md](./start-here.md)
- [ ] Do business decisions (validity rules, authorization, what a rule *means*) live in the domain core, with the UI only rendering state and issuing calls — no rule existing *only* in the UI?
- [ ] Does the frontend call *into* the system (API / server code) and never get imported by the core — dependency points inward?

## Component placement & promotion → [component-placement.md](./component-placement.md)
- [ ] Does each new component start under its owning feature (`src/components/<feature>/`), named with feature context?
- [ ] A file until it isn't: a single file while there's one surface, a folder only once cohesive parts/modes appear?
- [ ] Was anything moved to `shared/` only on a **second** real reuse signal, **confirmed with the user** — not speculatively?
- [ ] Are shared components feature-neutral (no `Contact`/`Company` leakage), with entity-specific adapters kept thin and local, and were call sites backfilled to leave no divergent copy?

## App shell & container → [app-shell.md](./app-shell.md)
- [ ] Does app-level layout (navigation, auth controls, sidebar, page width, padding) come from the shared shell/container — not re-declared in a feature?
- [ ] Do feature components stay layout-agnostic, composing inside the container rather than owning app-level layout?
- [ ] Was any new layout need met by **extending the shared primitive**, with a second variant confirmed with the user rather than forked locally?

## Visual system → [visual-system.md](./visual-system.md)
- [ ] Are cross-app visual primitives (scrollbars, focus, surface treatment) inherited from the shared styling surface, not re-declared per feature?
- [ ] Semantic tokens and design-system values used instead of raw colors / magic numbers?
- [ ] Was a second variant of a shared visual primitive confirmed with the user?

## UI scope → [ui-scope.md](./ui-scope.md)
- [ ] Does the change implement the **requested** surface (and the named pattern's essentials) without smuggling in adjacent surfaces — dashboards, metrics, filters, extra controls — that were never asked for?
- [ ] Were adjacent surfaces **proposed separately** rather than added silently?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
