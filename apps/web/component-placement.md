# Component Placement & Promotion

Where a component lives, what it's named, and when it moves up the hierarchy. This is the frontend twin of the core's [logic-placement.md](../../packages/core/logic-placement.md): **start at the lowest sensible level, and climb only on a real reuse signal — never in anticipation.**

The unit of organization is the **feature** — the same word the core uses for one capability's folder (`packages/core/src/<feature>/`). A feature's components live together, named for the feature that owns them.

## Start close to the owning feature

A new feature's components start inside the feature that needs them, under its own folder:

```txt
src/components/<feature>/...
```

Name exported components with their feature context while it is local — `ContactNotes`, not a bare `Notes`. The name keeps ownership visible at the call site without forcing a shared abstraction too early.

## Grouping: a file until it isn't

Use a **single file** while the feature has one clear surface. Promote to a **folder** only when it develops multiple cohesive parts, modes, or subviews:

```txt
src/components/contacts/notes/
  create.tsx
  view.tsx
  summary.tsx
```

Keep names that carry the owning feature and its part while local — `ContactNotesCreate`, `ContactNotesView`, `ContactNotesSummary`.

## Promotion to shared — on the second signal, with confirmation

Do **not** create shared components for speculative reuse. Keep the first implementation local.

When a **second** feature genuinely needs the same component shape — the real signal — pause and **confirm the refactor with the user** before moving anything into shared. This is the same gate the core applies before splitting a service or extracting a shared guard: a structural move waits for the second signal and an explicit decision. Shared home:

```txt
src/components/shared/<feature>/
```

## Ownership after promotion

- A shared component describes **feature-neutral** behavior — it must not know about `Contact`, `Company`, or any single entity unless the concept is truly app-wide.
- Keep the entity-specific adapter **thin and local** inside each owning feature; it wraps the shared component with feature context.
- Promotion is **backfilled**: the original call sites now use the shared component (or their thin local adapter), leaving no divergent copy behind — mirroring the core's *promotions are backfilled* rule.

## Enforcement

- Keep components at the **lowest sensible level** in the hierarchy.
- Refactor upward only after **concrete, second** reuse appears — not in anticipation.
- Get **explicit user confirmation** before structural refactors or shared promotion.
- A shared component that reaches back for a specific entity type is misplaced — either it isn't really shared, or the entity-specific part belongs in a local adapter.
