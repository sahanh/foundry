# End Here — `apps/web` (Frontend)

Verify companion to [start-here.md](./start-here.md), for a **frontend client UI** change. A box you cannot tick is a blocker.

---

## Placement — the UI holds no business rules → [start-here.md](./start-here.md)
- [ ] Business decisions (validity, authorization, rule meaning) live in the core; UI only renders state and issues calls — no UI-only rule — [start-here.md](./start-here.md#the-one-macro-rule-the-ui-holds-no-business-rules)
- [ ] Frontend calls into the system, never imported by the core — [start-here.md](./start-here.md)

## Component placement & promotion → [component-placement.md](./component-placement.md)
- [ ] New components start under their owning feature (`src/components/<feature>/`), named with feature context — [component-placement.md](./component-placement.md#start-close-to-the-owning-feature)
- [ ] A file until it isn't — a folder only once cohesive parts/modes appear — [component-placement.md](./component-placement.md#grouping-a-file-until-it-isnt)
- [ ] Every climb waited for a second real signal **and explicit user confirmation**, never speculation — the same gate in [app-shell.md](./app-shell.md) and [visual-system.md](./visual-system.md) — [component-placement.md](./component-placement.md#promotion-to-shared--on-the-second-signal-with-confirmation)
- [ ] Shared components feature-neutral (no `Contact`/`Company` leakage); entity adapters thin and local; call sites backfilled, no divergent copy — [component-placement.md](./component-placement.md#ownership-after-promotion)

## App shell & container → [app-shell.md](./app-shell.md)
- [ ] App-level layout (navigation, auth controls, sidebar, width, padding) comes from the shared shell/container, not re-declared in a feature — [app-shell.md](./app-shell.md#what-the-shell-owns)
- [ ] Feature components layout-agnostic, composing inside the container — [app-shell.md](./app-shell.md#features-stay-layout-agnostic)
- [ ] New layout needs met by extending the shared primitive, not forking (second variant passes the promotion gate) — [app-shell.md](./app-shell.md#extend-the-shared-layer-before-forking-it)

## Visual system → [visual-system.md](./visual-system.md)
- [ ] Cross-app primitives (scrollbars, focus, surfaces) inherited from the shared styling surface (second variant passes the promotion gate) — [visual-system.md](./visual-system.md#shared-defaults-own-the-cross-app-primitives)
- [ ] Semantic tokens / design-system values, not raw colors or magic numbers — [visual-system.md](./visual-system.md#semantic-tokens-over-raw-values)

## UI scope → [ui-scope.md](./ui-scope.md)
- [ ] Only the requested surface (plus the named pattern's essentials) — no smuggled dashboards, metrics, filters, extra controls — [ui-scope.md](./ui-scope.md#implement-the-named-patterns-essentials)
- [ ] Adjacent surfaces proposed separately, never added silently — [ui-scope.md](./ui-scope.md#ask-before-adjacent-surfaces)

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless.
