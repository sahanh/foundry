# Named Decisions

When a handler's branching policy has a simple outcome but internals that fan out into many cases, extract it into a **pure function named in domain terms**: the handler gathers inputs, dispatches on the helper's result, and executes the side effect; the helper holds the branching, exhaustively tested. `if (shouldRetry(err, attempts))` is policy; `if (err.code !== "FATAL" && attempts < 3 && !err.isRateLimited)` is plumbing — the helper's name *is* the abstraction. When the decision grows into a **family of substantial behaviors**, escalate to a [Strategy](#escalation-when-the-decision-grows-into-a-family--extract-a-strategy).

## Why It Pays Off

- **Domain naming at the call site** — the caller no longer knows which conditions matter or in what order.
- **Cost asymmetry** — caller-path tests cost seeded state, harness, IO per case; a pure helper: one input, one assertion — cover the whole matrix. Same per Strategy class: each tests in isolation.
- **Invariants become tests** — subtle rules ("X wins over Y") pin as named regression tests, not comments.

## Apply As A Refactor, Not Upfront Design

Write the handler inline first; extract when the branching has revealed itself, naming the policy from observed reality (why: speculation guesses cases, inputs, layer wrong). Both tiers — a Strategy too is extracted from a lived-in conditional, never designed upfront.

Signals the policy has earned extraction:

- A third branch goes in and you must re-read the whole block to keep it straight.
- You're writing a comment explaining why one condition wins, or why an "obvious" simplification would be wrong.
- You want to test a case the caller's path makes expensive to set up.
- The same conditional shape appears in a second handler.
- Type/category branching with substantial logic per branch → go straight to the Strategy tier.

## Output Shape — Pick The Simplest One The Caller Can Use

| Shape | When to use |
|---|---|
| **Boolean** | Caller only branches yes/no, doesn't need to know why |
| **Enum / string literal union** | Caller dispatches on a small set of outcomes |
| **Value or `T \| null`** | Caller consumes a result the helper computed |
| **Tagged union (`{ kind, reason }`)** | Caller (or its logs) needs *why* as well as *what*, or you want exhaustiveness checking |

The shape is downstream; the principle is the extraction and the naming.

### Upgrading A Boolean To A Tagged Union

A boolean answers *what*; the tagged form adds *why*. Upgrade the moment you want to log, branch on, or test *why* it came back false:

```ts
type Decision =
  | { allow: true }
  | { allow: false; reason: "rate-limited" | "blocked" | "unverified" };
```

Upgrade signals: a comment next to the `false` return naming the case; the caller reconstructing the reason in a log; a test named "returns false when X" — a case the type can't express.

## Escalation: When The Decision Grows Into A Family — Extract A Strategy

When branching is on a type/category and each branch is a substantial behavior (many lines of distinct logic per type, more types expected), a pure helper no longer fits. Extract each branch into a class behind a common interface; a factory selects by type.

Before:

```
function evaluate(field, agent) {
    if (field.type === 'multiselect') {
        // multiselect evaluation logic
    } else if (field.type === 'timezone') {
        // timezone evaluation logic
    } else if (field.type === 'weight') {
        // weight evaluation logic
    }
}
```

After:

```
function evaluate(field, agent) {
    const evaluator = factory.getEvaluator(field.type);
    return evaluator.evaluate(field, agent);
}
```

Steps: define the interface → move each branch into an implementing class → add a factory mapping type → implementation → replace the conditional with the factory lookup. A new type is a new class, not modified code; each tests independently.

## When To Apply

- The handler reads like plumbing — policy tangled with IO.
- The decision is, or can be made, pure — its inputs are values, not framework handles.
- Edge cases you want to assert are expensive through the caller's harness.
- The policy has a team-vocabulary name that doesn't appear in the code yet.

Tier choice: simple outcome (bool/enum/value) from small branches → named decision; substantial per-type behaviors → Strategy.

## When Not To

- A single condition, two trivial branches, or a one-off conditional that won't grow — inline it; a helper is ceremony.
- The decision genuinely needs IO mid-flight (queries a second source to decide) — it can't stay pure; reach for a domain service or the [Strategy tier](#escalation-when-the-decision-grows-into-a-family--extract-a-strategy) instead (strategy classes may do IO).
- Branches just map values without logic — a lookup table is simpler than either tier.

## It's An Extraction, Not An Escape Hatch

A Named Decision extracts *branching*, not business rules out of the service. The helper is the service's functional core ("functional core, imperative shell" at handler scope): it stays with the owning service, which calls it and performs the side effect. The policy doesn't live "outside" the service, so **every business rule lives in a service or orchestration** holds — see [end-here.md](./end-here.md). Nor a home for cross-entity rules: a decision helper reads values its single caller holds; a predicate over ≥2 owners' data belongs to an orchestration as a [cross-entity invariant](./orchestration.md#cross-entity-invariants). The same boundaries bind the Strategy tier.

---

**Verify:** covered by the [review protocol](../../review.md)'s Patterns sweep (Step 4).
