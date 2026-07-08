# Logic Placement & Promotion

Where business logic lives, and when to move it as it grows. **Consult on every service-layer touch.**

Companion to [code-placement.md](../../code-placement.md) (macro: which package/app); this doc: *which construct within a feature*, and *when to re-home it*.

> **Ownership.** This doc owns *placement* and *promotion*; construct behavior stays with [service-first-architecture.md](./service-first-architecture.md), [implementation-validation.md](./implementation-validation.md) (guards/exceptions), [orchestration.md](./orchestration.md).

## Core Principle

**Logic lands at the lowest rung that fits, and climbs only on a real signal, never in anticipation.** Every promotion is a **refactor of existing code**: the old caller must keep working ([Backfill Obligation](#the-backfill-obligation-the-revisit-list)).

## Two Axes

Two **independent** questions fix the construct:

- **Axis 1 — Altitude:** how many services coordinate? One → *service*; 2+ → *orchestration*: service count, not run time, not feature count.
- **Axis 2 — Feature boundary:** within one feature → ordinary service/shared-guard placement; across features → an owner-exported **guard** (verdict) or an **orchestration** (data) ([Cross-Feature Data Access](./working-with-databases.md#cross-feature-data-access); [Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).

**The conflation mistake:** deciding orchestration by feature boundary is **wrong** — the trigger is Axis 1: two coordinating services *inside one feature* is still an orchestration (`TaskLifecycleOrchestration` is intra-feature); cross-feature use cases merely *tend* toward 2+ services. Carve-out: collection → single-entity calls ([service-first](./service-first-architecture.md)) are not orchestration.

**The *kind* of logic:** an **assertion** (yes/no that throws) → a **guard** when reused — unless it spans **≥2 owners' data**: a [cross-entity invariant](./orchestration.md#cross-entity-invariants), not a guard. **Behavior/computation** → **service**; **sequencing** → **orchestration**.

## The Rungs

| Rung | Construct | Climb here when | Owning doc |
|---|---|---|---|
| **R0** | inline in a service method | first implementation | [service-first](./service-first-architecture.md) |
| **R1** | extracted **private method** (same service) | the method grows long, or a step repeats **within that one service** | [service-first](./service-first-architecture.md) |
| **R2** | its **own service** (same feature) | the *cohesion smell* — the logic doesn't operate on this service's injected scope | [service-first](./service-first-architecture.md) |
| **R3** | **`shared/`** (feature-level) — `utils.ts` (pure helper) or `validation.ts` (guard) | a **2nd service in the feature** needs the same helper/assertion | [implementation-validation](./implementation-validation.md) |
| **R4** | **orchestration** | **2+ services**, another feature's **data** flows in, or a **cross-entity invariant** | [orchestration](./orchestration.md) |

Edges: **R3 guards are verdict-only** (cross-feature callers get `void`; needing *data* is R4); `shared/utils.ts` is never a cross-feature import; **R3 threshold** — second in-feature caller, **first** cross-feature caller; **a verdict never promotes to R4** ([orchestration.md → Promotion](./orchestration.md#promotion-when-a-service-operation-becomes-an-orchestration)).

## Promotion Is a Lifecycle

Logic starts at R0; later requirements add signals; climb one rung at a time:

- A `TodoService` check gets copied into `TodoCommentService` → **R3**.
- "create task" grows "…**and** notify" → **R4**.
- Todo assignment needs the user's `clearanceLevel` → **R4** (the orchestration fetches the user; the todo service judges the data it's handed).
- Run creation grows "…within the tenant's plan limit" → **R4** (a [cross-entity invariant](./orchestration.md#cross-entity-invariants)).

## The Backfill Obligation (the revisit list)

On every promotion:

1. **Don't strand the old home.** The original method **delegates**, never keeps a *copy* (copies drift); untouched callers must still behave correctly.
2. **Re-evaluate every caller.** Grep callers of what you promoted; per caller, re-point or legitimately stay (generalizes [orchestration.md](./orchestration.md)'s *stranded callers* step to every rung).
3. **Sync the seams.** Update `start-here` / `end-here` / `review.md` and cross-links in the *same* change (per AGENTS.md).

A promotion is **done** when the old world points at the new construct, nothing stranded.

## Where the Promoted Thing Lives

By **ownership**, not who triggered the change:

- **Shared guard** → the feature **owning the rule and the tables it reads** (user-activeness guard → the *user* feature), never the caller's.
- **Orchestration** → the feature owning the **use-case outcome** (`AssignTodo` → *todo*; user is a dependency, not the home).
- **Neither** → may deserve its **own** feature/module — raise it (README → *When in doubt*).

### Who owns a cross-entity-invariant orchestration

When the outcome owner is ambiguous (typical of cross-entity invariants), take the **first** that fits:

1. **Outcome owner** — a single entity whose state the use case changes (the write target)? → that feature; the invariant *gates* that write, other features are read-only dependencies. (Most quotas gate a creation: "start a run under a plan limit" → the `run` feature.)
2. **Rule owner** — no single write outcome (pure consistency check, or mutates two features equally)? → the feature owning the **limit or policy** (the plan, the budget, the tenant).
3. **Own feature/module** — fits neither? → open one (e.g. an entitlements/quota module); raise it (README → *When in doubt*).

The landing feature's domain exception is thrown on violation.

## Which Feature Does It Belong To?

Owned by [service-first-architecture.md](./service-first-architecture.md); consult before creating a folder: **own feature vs. inside an existing one** → *Decide Domain Boundaries First* (keep together until a real signal; user-confirmed before the first file); **folder granularity** → *Granularity Scales with Scope* (the same ladder one level up). Behaviour fitting no feature signals a new folder (above).

## The Decision Procedure

Run on any service-layer touch:

1. **Reused step?** Within this one service → **R1**; ≥2 services in the feature → **R3** (`validation.ts` if it asserts-and-throws, `utils.ts` if pure).
2. **2+ services, cross-feature data, or a cross-entity invariant?** → **R4**, in the feature the [ownership ladder](#who-owns-a-cross-entity-invariant-orchestration) lands on.
3. **Cohesion smell** (service-first → *The Constructor Declares the Scope*)? → **R2**, same feature.
4. **Otherwise stay put** (R0/R1): don't climb without a signal.

If anything moved: run the [Backfill Obligation](#the-backfill-obligation-the-revisit-list).

## Anti-Patterns

- **Orphaned old home** — a *copy* instead of delegation (Backfill step 1).
- **Guard where an orchestration belongs** — reaching another feature's data through a value-returning guard instead of promoting to R4 ([Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).

(Anticipatory climbing, axis conflation, stranded callers: covered above.)

---

**Verify:** when done, check [end-here.md](./end-here.md) → Placement & promotion.
