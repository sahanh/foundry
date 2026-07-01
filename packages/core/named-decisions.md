# Named Decisions

When a handler contains a branching policy whose outcome is simple but whose internals fan out into many cases, extract the policy into a pure function named in domain terms. The caller sees one named decision; the helper holds the branching internally where it can be exhaustively tested.

---

## Core Principle

**Name the decision, hide the branches behind a pure helper.** The handler's job is to gather inputs and execute the side effect. The decision about *what* to do is a separate concern — extract it into a pure function with a domain-meaningful name, and let the caller dispatch on the result.

---

## Why It Pays Off

### Domain naming at the call site

`if (shouldRetry(err, attempts))` reads as policy.
`if (err.code !== "FATAL" && attempts < 3 && !err.isRateLimited)` reads as plumbing.

Same outcome, very different signal-to-noise. The helper's name *is* the abstraction — the caller no longer needs to know which conditions matter or in what order.

### The cost asymmetry is the whole point

Testing all the internal branches through the caller is expensive — seeded state, framework harness, IO, end-to-end setup per case. Testing them through a pure helper is cheap — one input, one assertion, microseconds. Extraction collapses an expensive test surface into a cheap one, which is what lets you actually cover the matrix instead of picking three representative scenarios.

### The invariants become tests

Subtle rules ("X wins over Y," "out-of-order input can't cause Z") that previously lived as comments or as "I'm pretty sure this is right" can be pinned as named tests on the helper. The next person to touch the policy gets a regression suite, not a comment.

---

## Apply As A Refactor, Not Upfront Design

Write the handler inline first. Extract the helper only when the branching has revealed itself — when you can name the policy from observed reality rather than imagined future needs.

Speculative extraction tends to fail in predictable ways: the helper handles two cases when only one ever materializes, takes the wrong inputs and gets rewritten on first use, or sits at the wrong abstraction layer because the real boundary wasn't visible yet. Upfront, you don't know which inputs the policy actually depends on, which cases will occur, or what the team will call it. Those answers come from writing the inline version and living with it.

Signals that the policy has earned its name:

- A third branch is going in and you have to re-read the whole block to keep the logic straight.
- You're writing a comment to explain why one condition wins over another, or why an "obvious" simplification would be wrong.
- You want to test a case but the path through the handler is expensive to set up.
- The same conditional shape is showing up in a second handler.

This is a sequencing rule, not a contradiction of the principle. Naming a decision is most valuable when the decision has shown you what it is.

---

## Output Shape — Pick The Simplest One The Caller Can Use

The return type follows what the caller actually needs:

| Shape | When to use |
|---|---|
| **Boolean** | Caller only branches yes/no, doesn't need to know why |
| **Enum / string literal union** | Caller dispatches on a small set of outcomes |
| **Value or `T \| null`** | Caller consumes a result the helper computed |
| **Tagged union (`{ kind, reason }`)** | Caller (or its logs) needs to know not just *what* but *why*, or you want exhaustiveness checking across cases |

The shape is a downstream choice. The principle is the extraction and the naming.

### Upgrading A Boolean To A Tagged Union

A boolean answers *what*; the tagged form answers *what and why*. The moment you find yourself wanting to log, branch on, or test the *reason* a boolean came back false, upgrade:

```ts
type Decision =
  | { allow: true }
  | { allow: false; reason: "rate-limited" | "blocked" | "unverified" };
```

Signals to upgrade:

- You write a comment next to the `false` return explaining which case it is.
- The caller does `if (!ok) log("denied because ...")` and the string is reconstructed at the call site.
- A test name is "returns false when X" — meaning the test cares about a case the type can't express.

---

## When To Apply

- The handler reads like plumbing because the policy is tangled with the IO.
- The decision is, or can be made, pure — its inputs are values, not framework handles.
- You'd like to assert on edge cases that the caller's test harness makes expensive.
- The policy has a name in the team's vocabulary that doesn't appear in the code yet.

---

## When Not To

- The decision is a single condition. Inlining is fine; a helper would just be ceremony.
- The decision genuinely needs IO mid-flight (it must query a second source to know what to do). The helper can't stay pure; reach for a domain service or the strategy pattern instead.

---

## Related

- **[Strategy Pattern](./implementation-strategy-pattern.md)** — for when each branch is substantial enough to warrant its own class. Named Decisions is the lighter alternative when the branches are small and the caller wants a simple outcome.
- This is "functional core, imperative shell" applied at handler scope, with the decision helper as the functional core.

---

**Verify:** the Patterns sweep in the [review protocol](../../review.md) (Step 4) covers this.
