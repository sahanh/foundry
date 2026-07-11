Repo-wide working instructions for this project. Read alongside the guidelines themselves.

## Keeping the seams in sync

**When you add, change, or remove any part of a guideline, check that the navigation and
verification seams still reflect it — in the *same* change.** These are:

- the relevant **`start-here.md`** (the forward pass — what to read before building at that level),
- the relevant **`end-here.md`** (the verify companion — the checks for that level), and
- the root **[`review.md`](./review.md)** protocol (its enumerated taxonomy and routing table).

If a rule moved, was renamed, or a new construct/level was introduced, a stale `end-here` box or an
unrouted node in `review.md` will silently let non-conforming code pass review. So after editing a
guideline, ask: does an `end-here` check need adding/updating/removing? Does `review.md`'s taxonomy
or routing table need a new row or a repointed link? Fix them alongside the guideline, not later.

## State once, link elsewhere

Each rule has exactly **one owning doc**. Any other doc may carry at most a **one-line echo plus a
link** to the owner — never a restatement. Anti-patterns live inside the rule they negate, not in
separate anti-pattern lists. `CHANGELOG.md` and `concerns.md` are lookup-on-demand references —
consult a specific entry when needed, never bulk-load them into a reading path.

## The `site/` directory is not part of the standard

`site/` holds the public **website** — the landing page, the copy that feeds it
(`site/landing-copy.md`), and the build that renders these docs into a static viewer. It is **not
part of the standard and not on the agent reading path**: nothing in the guidelines links into it,
and no rule lives there. Don't read `site/` to understand or review a code change, and don't route
it through [`review.md`](./review.md). The viewer re-renders the docs automatically, so there is no
navigation/verification seam inside `site/` to keep in sync.

## Maintaining the Changelog

**Every change that adds, changes, or removes a guideline** — any convention, rule, or structure
someone must follow — updates [`CHANGELOG.md`](./CHANGELOG.md) in the *same* change. This is not
optional. (Trivial edits that change no rule — typo and formatting fixes — are exempt.)

The changelog exists for one reason: so that someone whose work predates a change can discover their
code may no longer conform, and find where to look. It is a **signpost, not a tutorial**.

### Anatomy of an entry

Newest entries at the top. Each entry has three parts:

1. **Dated heading** — `## YYYY-MM-DD — <concise title of the change>`.
2. **What changed** — a short statement of what was introduced, renamed, or removed. For a rename or
   removal, name the *old* thing (the old file, folder, or term) so someone searching for it lands
   here.
3. **Adherence pointer** — name who is affected (code written before this change), then link the
   specific guideline docs **and sections** to read and check against.

**The defining rule: point, don't re-teach.** The changelog does **not** prescribe migration steps,
restate the rule, or explain how to fix code. The guidelines are the single source of truth — the
entry says only *what changed* and *which sections to read* to confirm you adhere. Anyone who needs
to bring their code into line reads the linked guideline, not the changelog.

See the existing entries in [`CHANGELOG.md`](./CHANGELOG.md) for the shape.
