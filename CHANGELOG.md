# Changelog

Notable changes to the engineering playbook. If a concept you remember is gone, look here for
what replaced it and how to migrate.

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

- [architecture/app-context.md](./architecture/app-context.md) → **The Clock** and **Persistence Timestamps**
- [system/database.md](./system/database.md) → **Timestamps** (and the matching anti-pattern)
- [checklist.md](./checklist.md) → §7 Database and §8 AppContext

---

## 2026-07-01 — "Workflow" renamed to "Orchestration"

The domain-layer concept formerly called a **workflow** is now an **orchestration**.

If you came looking for `workflow-orchestration.md`, the `workflows/` folder, or the
`.workflow.ts` suffix and didn't find them — this is why. See
[architecture/orchestration.md](./architecture/orchestration.md) for the full concept.

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
6. **Update references** in docs/code: cross-links to `orchestration.md`, and the post-
   implementation [checklist.md](./checklist.md) (the "Orchestrations" section).

### Not changed / not yet built

The durable-execution **workflow engine** and a step-shaped authoring standard are deliberately
deferred and tracked separately — this change is vocabulary and structure in the domain layer only.
