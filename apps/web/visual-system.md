# Visual System

Shared visual treatments belong to the app's **visual system**, not to individual features. Prefer the one default that every section inherits before creating any local variant — the styling reading of *one home for every piece of code*.

## Shared defaults own the cross-app primitives

Cross-app visual primitives — scrollbars, focus behavior, text rendering, app-wide surface treatment — live in the shared styling surface and are inherited, not re-declared per feature. For scrollable areas, use the app's default scrollbar; do not add one-off scrollbar styles inside feature components.

## Semantic tokens over raw values

Reach for **semantic design tokens** and existing design-system values before raw colors or magic numbers. A raw value hard-codes a decision the token system is meant to own, and it drifts the moment that system changes — the visual analogue of *single source of truth: define once, derive the rest*.

## When a component needs something different

Decide first whether the need is **app-wide**. If it is, improve the shared default so everything benefits. If it is genuinely local, keep the variant narrow and intentional.

## Enforcement

- Do not reinvent visual primitives per feature.
- Do not introduce local scrollbar (or other primitive) styling without a specific interaction need.
- Prefer semantic tokens and existing design-system values over raw colors.
- **Confirm with the user before adding a second visual variant** of a shared primitive.
