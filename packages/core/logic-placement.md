# Logic Placement & Promotion

Where a piece of business logic lives — and when to move it as it grows.

This is the domain-layer companion to [code-placement.md](../../code-placement.md). `code-placement.md`
decides *which package or app* a file belongs to (macro, decided once). This decides *which construct
within a feature* a piece of business logic lives in — an inline service method, its own service, a
shared `shared/validation.ts` guard, or an orchestration — and, because requirements keep changing,
*when to re-home it*. **Consult it whenever you touch the service layer.**

> **Ownership.** This doc owns the *placement decision* and the *promotion lifecycle*. Each construct's
> internal rules stay in its own doc — [service-first-architecture.md](./service-first-architecture.md)
> (services), [implementation-validation.md](./implementation-validation.md) (guards/exceptions),
> [orchestration.md](./orchestration.md) (orchestrations). This doc says *which construct, and when*;
> those say *how that construct behaves*.

---

## Core Principle

**Logic lands at the lowest rung that fits, and climbs only on a real signal.** A piece of business
logic starts in the simplest home that holds it and is promoted to a heavier construct only when a
concrete signal appears — never in anticipation. And every promotion is a **refactor of existing
code**, not just a new home: the old caller must keep working.

---

## Two Axes

The construct a piece of logic belongs in is fixed by two **independent** questions. Keep them
separate — collapsing them is the most common mistake.

### Axis 1 — Altitude: how many services must coordinate?

- **One service** → the logic is a *service* concern (a method, or its own service).
- **Two or more** → the coordination is an *orchestration* concern.

The trigger is the **number of services**, not how long the work runs and not how many features are
involved.

### Axis 2 — Feature boundary: does the logic stay in one feature, or cross into another's?

- **Within one feature** → ordinary service / shared-guard placement.
- **Across features** → the crossing must take a legal shape: an owner-exported **guard** (a verdict)
  or an **orchestration** (data). See [working-with-databases.md → Cross-Feature Data Access](./working-with-databases.md#cross-feature-data-access)
  and [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards).

### The common mistake — conflating the two

"Same feature → no orchestration; different feature → orchestration" is **wrong**. The orchestration
trigger is Axis 1 (service count), not Axis 2 (feature boundary). Two services *inside one feature*
that must coordinate is still an orchestration (e.g. `TaskLifecycleOrchestration` is intra-feature).
Cross-feature use cases *usually* involve 2+ services, which is why the shortcut often looks right —
but decide on the service count. The one carve-out: a **collection service may call its single-entity
service** (one direction only); that is not an orchestration.

### A third distinction — what *kind* of thing the logic is

- An **assertion** — a yes/no that throws → a **guard** when reused. A yes/no that spans **≥2 owners' data**
  (a quota, a cross-owner uniqueness) is a **cross-entity invariant** — no single owner can assert it, so it
  belongs to an **orchestration**, not a guard (see [orchestration.md → Cross-Entity Invariants](./orchestration.md#cross-entity-invariants)).
- **Behavior / computation** — produces a result or mutates state → a **service**.
- **Sequencing** across services → an **orchestration**.

---

## The Rungs

Logic has a current home and climbs to a heavier one when a signal appears. The rungs:

| Rung | Construct | Climb here when | Owning doc |
|---|---|---|---|
| **R0** | inline in a service method | first implementation | [service-first](./service-first-architecture.md) |
| **R1** | extracted **private method** (same service) | the method grows long, or the same step repeats **within that one service** | [service-first](./service-first-architecture.md) |
| **R2** | its **own service** (same feature) | the *cohesion smell* — the logic doesn't operate on this service's injected scope | [service-first](./service-first-architecture.md) |
| **R3** | **`shared/`** (feature-level) — `utils.ts` (pure helper) or `validation.ts` (guard) | a **2nd service in the feature** needs the same helper/assertion | [implementation-validation](./implementation-validation.md) |
| **R4** | **orchestration** | the use case coordinates **2+ services**, another feature's **data** flows into it, or it enforces a **cross-entity invariant** (a predicate spanning ≥2 owners' data) | [orchestration](./orchestration.md) |

Things to hold onto:

- **R1 vs R3 — reuse *scope* decides.** A step reused *within one service* stays a **private method**
  on that service (R1). It climbs to `shared/` (R3) only when a **second service in the feature** needs
  it — `shared/utils.ts` if it's a pure helper, `shared/validation.ts` if it's a guard that asserts and
  throws.
- **R3 guards are verdict-only.** A shared guard asserts and throws; when the caller is *another
  feature* it returns `void` (see [Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).
  If a caller needs *data* rather than a yes/no, that is not R3 — it is R4. (`shared/utils.ts` is
  feature-internal — never a cross-feature import.)
- **R3's reuse threshold depends on the boundary.** *Within* a feature, extract on the **second**
  caller. *Across* features, a guard is a boundary contract — it lives in the owner's
  `shared/validation.ts` from the **first** cross-feature caller.
- **R4 is triggered by service count, a cross-feature data need, *or* a cross-entity invariant.** Needing
  only another feature's *verdict* does **not** promote — call its guard and stay a service method (see
  [orchestration.md → Promotion](./orchestration.md#promotion-when-a-service-operation-becomes-an-orchestration)).
  But a rule that is a *predicate over ≥2 owners' data* (a quota, a cross-owner uniqueness, an aggregate)
  can be evaluated by no single owner — it is a **cross-entity invariant**, owned by the orchestration (see
  [orchestration.md → Cross-Entity Invariants](./orchestration.md#cross-entity-invariants)).

---

## Promotion Is a Lifecycle, Not a One-Time Choice

A piece of logic rarely lands at its final rung. It starts at R0 for one business use case; a later
requirement adds the signal that pushes it up. That is expected — **climb one rung at a time, on the
signal, not ahead of it.**

- A check written inline in `TodoService` gets copied into `TodoCommentService` → **R3** (extract to
  `shared/validation.ts`).
- "create task" grows "…**and** notify" → **R4** (promote to an orchestration).
- Todo assignment starts needing the user's `clearanceLevel` field → **R4** (an orchestration fetches
  the user; the todo service judges the data it is handed).
- Run creation grows "…and stay within the tenant's plan limit" → **R4** (an orchestration reads the plan
  limit and the active-run count via their services and enforces the **cross-entity invariant** — see
  [orchestration.md → Cross-Entity Invariants](./orchestration.md#cross-entity-invariants)).

---

## The Backfill Obligation (the revisit list)

This is the rule that makes promotion safe. Climbing a rung is a **refactor of existing code**, not
merely a new construct standing beside the old one. On every promotion:

1. **Don't strand the old home.** The original method/caller keeps working — it now **delegates** to
   the new home (calls the extracted service, the guard, or routes through the orchestration). Callers
   you don't touch must still behave correctly.
2. **Re-evaluate every existing caller.** Grep the callers of what you promoted and decide, per caller,
   whether it re-points to the new home or legitimately stays. (This generalizes
   [orchestration.md](./orchestration.md)'s *stranded callers* step to **every** rung.)
3. **Sync the seams.** Update `start-here` / `end-here` / `review.md` and any cross-links in the *same*
   change (per AGENTS.md), so the verify pass reflects the new shape.

A promotion is **done** only when the old world points at the new construct and nothing was left
stranded.

---

## Where the Promoted Thing Lives

Climbing a rung raises "in which feature?" — answer by **ownership**, not by who triggered the change.

- A **shared guard** lives in the `shared/validation.ts` of the feature that **owns the rule and the
  tables it reads** (a user-activeness guard → the *user* feature), never the caller's.
- An **orchestration** lives in the feature that owns the **use-case outcome** — the entity whose state
  the use case exists to change (`AssignTodo` → the *todo* feature; the user feature is a dependency,
  not the home).
- **Belonging to neither** feature is a signal the use case may deserve its **own** feature/module —
  raise it (README → *When in doubt*) rather than forcing it into an unrelated one.

### Who owns a cross-entity-invariant orchestration

When the orchestration exists to enforce a [cross-entity invariant](./orchestration.md#cross-entity-invariants),
"which feature owns the outcome?" can be ambiguous — the rule spans several. Resolve it with this ordered
self-check; take the **first** that fits:

1. **Outcome owner** — is there a single entity whose state the use case exists to change (the write
   target)? → **that feature** owns the orchestration; the invariant is a *gate* on that write, and the
   other features are read-only dependencies reached via their services. *(Most quotas gate a creation: "start
   a run under a plan limit" writes a `run` → the `run` feature owns it; `plan` is a read dependency.)*
2. **Rule owner** — no single write outcome (a pure consistency/limit check, or it mutates two features
   equally)? → the feature that owns the **limit or policy** being enforced (the plan, the budget, the
   tenant) owns it.
3. **Own feature/module** — fits neither cleanly (the policy belongs to no existing feature)? → that is the
   signal to open its **own** feature/module (e.g. an entitlements/quota module). Raise it (README → *When in
   doubt*).

Whichever feature the ladder lands on, **its** domain exception is the one the orchestration throws when the
invariant is violated.

---

## Which Feature Does It Belong To?

Placement has a second question beside "which construct?": *which feature owns it* — and whether the
behaviour earns its own feature folder at all. Both sub-decisions are owned today by
[service-first-architecture.md](./service-first-architecture.md); consult it before creating a folder.

- **Own feature vs. inside an existing one.** For each new entity or behaviour, ask whether it belongs
  inside the current feature or earns its own folder. Default: keep related behaviour together until
  there is a real reason to extract — a second feature needs it, a team boundary, or scope large
  enough to obscure the host feature. Extract as a refactor, not in anticipation; and the
  feature/service breakdown is confirmed with the user *before* the first file is created. See
  service-first-architecture.md → *Decide Domain Boundaries First*.
- **Folder granularity is the same ladder, one level up.** Just as *logic* climbs R0→R4, a *cluster*
  climbs `inline in a feature → its own sub-feature folder → its own feature` — on the **second
  member**, not in anticipation (e.g. `todo ⊃ activity ⊃ comment`). It is the same "climb on a real
  signal" rule at coarser grain. See service-first-architecture.md → *Granularity Scales with Scope*.

This connects to *Where the Promoted Thing Lives* above: a guard lands in the feature owning the rule,
an orchestration in the feature owning the outcome, and behaviour that fits no existing feature is
itself the signal to open a new folder.

---

## The Decision Procedure

Run this on any service-layer touch — new logic, or a change that might have introduced a signal:

1. Is the same step **reused**? *Within this one service only* → a **private method** (R1). By **≥2
   services in the feature** → `shared/` (R3): `shared/validation.ts` if it asserts-and-throws (a
   guard; a cross-feature caller → returns `void`, and it lives in the owner's feature),
   `shared/utils.ts` if it's a pure helper.
2. Does the use case coordinate **2+ services**, does another feature's **data** flow into it, or does it
   enforce a **cross-entity invariant** (a predicate over ≥2 owners' data)? → **orchestration (R4)**, in the
   feature the [ownership ladder](#who-owns-a-cross-entity-invariant-orchestration) lands on (outcome owner
   first).
3. Does the behavior **not operate on this service's injected scope** (the cohesion smell — see service-first → *The Constructor Declares the Scope*)? →
   **its own service (R2)**, same feature.
4. Otherwise → it **stays where it is** (R0/R1). Don't climb without a signal.

Then, **if you moved anything**: run the Backfill Obligation above.

---

## Anti-Patterns

- **Climbing in anticipation** — extracting a service, guard, or orchestration before the second
  signal actually exists.
- **Conflating the axes** — promoting to an orchestration because the logic crossed a *feature* (Axis
  2) rather than because it coordinates *2+ services* (Axis 1).
- **Stranded callers** — promoting without re-pointing or re-evaluating the existing callers of the
  old home.
- **Orphaned old home** — leaving the original method holding a *copy* of the logic instead of
  delegating to the new construct (the two copies drift).
- **Guard where an orchestration belongs** — reaching another feature's data through a value-returning
  guard instead of promoting to an orchestration (see
  [implementation-validation.md → Cross-Feature Guards](./implementation-validation.md#cross-feature-guards)).

---

**Verify:** when done, check [end-here.md](./end-here.md) → Placement & promotion.
