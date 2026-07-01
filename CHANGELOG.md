# Changelog

Notable changes to the engineering playbook. If a concept you remember is gone, look here for
what replaced it and how to migrate.

---

## 2026-07-01 — `checklist.md` decomposed into `end-here.md` seams + a root review protocol

The single root **`checklist.md`** is **gone**. Verification is now split into a per-seam `end-here.md` (the verify companion to each `start-here.md`) plus a root **[review.md](./review.md)** protocol that drives the check.

### Why

One monolithic, feature-shaped checklist made a narrow change carry the full cognitive load, and it had no verification path at all for non-feature edits (a `system/` adapter, an app, a graduated package). A flat checklist is also the wrong *mechanism*: too rigid if atomic, too vague if "read the guides." The verify pass is now an agentic **map → route → validate** protocol over a fixed taxonomy, routing each touched area to only the guideline that owns it.

### What changed

- Each seam now has a **`start-here.md`** (read before) and an **`end-here.md`** (verify after): [packages/core/end-here.md](./packages/core/end-here.md), [packages/core/system/end-here.md](./packages/core/system/end-here.md), [apps/end-here.md](./apps/end-here.md), [packages/end-here.md](./packages/end-here.md).
- **[review.md](./review.md)** is the new root verify pass — persona + map/route/validate + the enumerated taxonomy and routing table. (Name/location provisional.)
- `checklist.md`'s content was redistributed: its per-feature sections → `packages/core/end-here.md`; its system/app checks → the `system/` and `apps/` `end-here.md`; its sanity sweeps → the protocol's always-run cross-cutting sweeps.

### Who is affected

Anyone who linked to or ran **`checklist.md`**, or who relied on it as the post-implementation gate. Read [review.md](./review.md) for the new flow and the `end-here.md` for the seam you touched. The forward pass (`start-here.md`) is unchanged.

---

## 2026-07-01 — `architecture/` → `packages/core/`; new `code-placement.md`, `apps/`, `packages/`

The playbook now mirrors the code topology it prescribes. The `architecture/` folder is gone; a new root **[code-placement.md](./code-placement.md)** is the first thing to read.

### Why

1. **There was no home for inbound entry points.** The playbook described the domain (features) and driven infrastructure (`system/`), but never assigned a folder to *driving* adapters — HTTP controllers, CLI, workers, **MCP servers**. With nowhere correct to put them, they ended up filed beside feature folders. `code-placement.md` gives them a home: `apps/`.
2. **`src/` and folder names were overloaded.** The domain is a reusable **core package** meant to sit beside an integration framework (which ships its own `src/`), so it needs a package identity, not a generic `src/`. And the guidelines described `packages/core` while explaining it in a folder called `architecture/` — the names didn't mirror the code. Now they do.

### What changed conceptually

The repo is `apps/` + `packages/`. `packages/core` is the domain hexagon (domain layer + its driven infrastructure in `core/src/system/`). Adapters are classified by **direction**: *driven* (the domain calls out to them — db, logger, clock) live in `core/src/system/` and graduate to their own `packages/<name>/` on a real signal; *driving* (they call into the domain — HTTP, CLI, MCP) live in `apps/`. A single placement rule (Q1–Q3) decides where any code goes. See [code-placement.md](./code-placement.md).

### Where things moved

| Before | After |
|---|---|
| `architecture/` (all docs) | `packages/core/` |
| `architecture/start-here.md` (macro sections) | `code-placement.md` (Layering, Folder Organization, File Structure) |
| `system/` | `packages/core/system/` |
| — | `code-placement.md` (new, root) |
| — | `apps/start-here.md`, `packages/start-here.md` (new stubs) |

`checklist.md`, `CHANGELOG.md`, and `README.md` stay at the root; their links were repathed.

### Migrating your project

This restructure is about the **playbook's own folders** — but the model it formalizes may not match how your project is laid out. Run this self-audit against your codebase (read [code-placement.md](./code-placement.md) first):

- [ ] For each direct child of `src/`, classify it with the criteria: a **feature** (domain), **driven infrastructure**, or an **inbound entry point** (transport).
- [ ] Any inbound entry point (HTTP, CLI, queue consumer, tool server) sitting beside your feature folders → relocate it to `apps/`. It is a driving adapter, not domain and not `system/`.
- [ ] Move your domain features into `packages/core/src/`, and `src/system/` into `packages/core/src/system/`.
- [ ] Any driven adapter that is heavy, reused beyond the core, or owns its own lifecycle → consider graduating it to its own `packages/<name>/`.
- [ ] Verify the dependency direction end to end: `apps → core → driven infrastructure`. Nothing inbound should live inside the core; the core should import no app.
- [ ] At each entry point, reuse the core's schemas at the boundary — don't redefine input shapes that then drift from the domain's real constraints.

---

## 2026-07-01 — Injected clock & domain-stamped timestamps

Time is now an injected system adapter, not `new Date()`. Introduced:

- **`ctx.system.clock`** — the single injectable now-source for every domain time read.
- **`ctx.system.helpers`** — `timestamps()` (create) and `updatedAt()` (update) to stamp rows from
  that clock.
- **A schema rule** — domain timestamp columns are `NOT NULL` with no DB default (no `defaultNow()`,
  no `$defaultFn`); timestamps are stamped in the domain, never by the database.

If your code predates this — it reaches for `new Date()` in services, relies on `defaultNow()` or a
column default for `createdAt`/`updatedAt`, or mocks time with a global `vi.setSystemTime` — you need
to bring it into line. We're not prescribing a migration script; the guidelines are the source of
truth. Read these sections and check your code against them:

- [packages/core/app-context.md](./packages/core/app-context.md) → **The Clock** and **Persistence Timestamps**
- [packages/core/system/database.md](./packages/core/system/database.md) → **Timestamps** (and the matching anti-pattern)
- [packages/core/end-here.md](./packages/core/end-here.md) → **Database** and **AppContext** (was `checklist.md` §7/§8)

---

## 2026-07-01 — "Workflow" renamed to "Orchestration"

The domain-layer concept formerly called a **workflow** is now an **orchestration**.

If you came looking for `workflow-orchestration.md`, the `workflows/` folder, or the
`.workflow.ts` suffix and didn't find them — this is why. See
[architecture/orchestration.md](./packages/core/orchestration.md) for the full concept.

### Why

1. **The word was overloaded.** "Workflow" implies long-running / durable / infrastructure. That
   dragged an execution-model meaning into what is purely a *domain coordination* concept.
2. **It collides with future infrastructure.** A durable-execution **engine** (retries,
   idempotency, crash-resume) is a planned, separate infrastructure layer that genuinely deserves
   the name "workflow." The name is now **reserved** for that engine.
3. **The trigger was stated as a symptom.** A workflow was described as "more than one service."
   The real, principled boundary is **altitude / coordination** — duration is *not* a domain
   concern, it belongs to the integration/infrastructure layer.

### What changed conceptually

An orchestration is now framed as a **service type** — the same building block as a service (a
constructor-injected class taking `AppContext`, same lifecycle rules) — distinguished by exactly
two things:

- It is the **only** domain unit allowed to inject and coordinate other services.
- It **owns no table** (services remain the database seam; the single-owner-per-table rule is
  unchanged).

Two clarifications were added:

- **Triggered by altitude, not duration.** It exists because a use case coordinates 2+ services —
  never because it "runs long." A single service method may legitimately take minutes.
- **Promotion protocol.** When a single-service operation grows a second-service concern, it
  *graduates* to an orchestration. At that moment you must re-evaluate the direct callers of the
  superseded service method so none silently skip the new coordination.

### Migration guide (if you already use "workflows")

| Before | After |
|---|---|
| `architecture/workflow-orchestration.md` | `architecture/orchestration.md` |
| `workflows/` folder | `orchestrations/` folder |
| `*.workflow.ts` | `*.orchestration.ts` |
| concept: "workflow" | concept: "orchestration" |
| name: `ClaimTaskWorkflow` (or a loose `claimTask` function) | `ClaimTaskOrchestration` (a class) |
| "workflow" = durable/long-running execution | reserved for the future **infrastructure** engine |

Steps:

1. **Rename the folder** `workflows/` → `orchestrations/` and the suffix `.workflow.ts` →
   `.orchestration.ts` in each feature.
2. **Rename the unit** to `{Process}Orchestration`, named by the use case it coordinates
   (e.g. `ClaimTaskOrchestration`). Group related multi-service use cases as methods on one
   orchestration; split on the second signal — same granularity ladder as services.
3. **Make it service-shaped** (recommended): if your workflows were loose functions, turn them
   into constructor-injected classes taking `AppContext`, consistent with services. Behaviour is
   unchanged; only the shape becomes uniform.
4. **No rule changes for services.** Services still never inject or call each other — coordination
   still goes *up* into the orchestration. Validation in an orchestration is still thin
   (inputs + existence checks), then delegate.
5. **Reconsider any "workflow" you created because something runs long.** If it coordinates only
   one service, it is **not** an orchestration — it's a service method. How it executes (inline,
   job, durable) is an integration decision, made per consumer.
6. **Update references** in docs/code: cross-links to `orchestration.md`, and the
   [packages/core/end-here.md](./packages/core/end-here.md) **Orchestrations** section (was `checklist.md`).

### Not changed / not yet built

The durable-execution **workflow engine** and a step-shaped authoring standard are deliberately
deferred and tracked separately — this change is vocabulary and structure in the domain layer only.
