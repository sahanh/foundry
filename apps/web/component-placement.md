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

## Extraction — on the second copy, with confirmation

Do **not** create shared components for speculative reuse. Keep the first implementation local.

The real signal is a **second copy of the same component shape**, whether in the same feature or another one. Before writing a new component, look for one that already does the job, in the owning feature and its sibling feature folders: search by name, by a distinctive literal (a placeholder, a label), or by structure. Finding one means the new component is the second copy: pause and **confirm the refactor with the user** instead of writing it. This is the same gate the core applies before splitting a service or extracting a shared guard: a structural move waits for the second signal and an explicit decision.

Where the extracted component lives depends on who uses it:

- **Both copies in one feature** → a component in that feature's folder, `src/components/<feature>/`.
- **Copies in two features** → promoted to shared, `src/components/shared/<feature>/`.

**Example.** The task detail view already has a free-form type input with a `<datalist>` of suggestions. The task create form needs the same input:

```txt
src/components/tasks/detail/task-editable-type.tsx   ← existing: type input + <datalist>
src/components/tasks/board/task-create.tsx           ← new: needs the same input
```

Writing a second input into `task-create.tsx` is the miss: two copies hardcode the same placeholder, length limit and datalist id, then drift. Searching `tasks/` for the placeholder text finds the first copy, so the change pauses, confirms with the user, and extracts `TaskTypeInput` into `src/components/tasks/`; both forms render it. When project settings later needs the input too, that is the cross-feature signal: confirm again, and promote it to shared.

## Ownership after promotion

- A shared component describes **feature-neutral** behavior — it must not know about `Contact`, `Company`, or any single entity unless the concept is truly app-wide.
- Keep the entity-specific adapter **thin and local** inside each owning feature; it wraps the shared component with feature context.
- Promotion is **backfilled**: the original call sites now use the shared component (or their thin local adapter), leaving no divergent copy behind — mirroring the core's *promotions are backfilled* rule.

## Enforcement

- Keep components at the **lowest sensible level** in the hierarchy.
- Refactor upward only after **concrete, second** reuse appears — not in anticipation.
- Never write a second copy of an existing component silently — the second copy is the signal to pause.
- Get **explicit user confirmation** before structural refactors or shared promotion.
- A shared component that reaches back for a specific entity type is misplaced — either it isn't really shared, or the entity-specific part belongs in a local adapter.
