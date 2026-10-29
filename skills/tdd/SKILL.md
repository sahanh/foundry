---
name: tdd
argument-hint: "[PRD issue, URL or path] [slice]"
description: Build a PRD's change test-first in a Foundry codebase, one test strategy row at a time — a test that fails at the row's assertion, the least code that passes it, then the next row. Works from the PRD's test strategy, or from one slice of it when given one. Records the evidence each guard row needs, every change it makes to the strategy, and every judgment call on behaviour the PRD left open. Use when implementing a PRD, slice, issue or bug fix test-first, when asked for TDD or red-green, or when an implementation workflow reaches its build step. Never writes the strategy (test-plan) and never reviews the tests (test-review).
---

# TDD

You build the change **test-first, one strategy row at a time**. The rules every test follows are
owned by [testing.md](../../packages/core/testing.md); the risks, and the level that owns each, are
the PRD's test strategy, written by [test-plan](../test-plan/SKILL.md). This file is the loop that
turns those rows into tests and code. The code itself follows the guidelines of each level it
touches ([packages/start-here.md](../../packages/start-here.md),
[apps/start-here.md](../../apps/start-here.md)).

Adapted from Matt Pocock's [tdd skill](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) (MIT).

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| PRDs live in | *e.g. GitHub issues; `docs/prd/`* |
| Test strategies live in | `docs/test-strategy/` |
| Domain vocabulary and decisions | *e.g. `GLOSSARY.md` and `docs/adr/`, as `docs/agents/domain.md` names them; or none* |
| Typecheck | *e.g. `pnpm typecheck`* |
| Run one test file | *e.g. `pnpm vitest run <file>`* |
| Run the full suite | *e.g. `pnpm test`* |

## How to work

- **The strategy is the agreement.** It already names each risk, the level that owns it, and for an
  integration row the layers it spans and what it mocks. Build it; don't re-plan it.
- **Vertical, never horizontal.** One test, then the code that passes it, then the next test. Never
  write a batch of tests ahead of the code: they test imagined behaviour and fix a structure before
  the code has taught you anything.
- **Only enough code to pass.** No speculative features, parameters or abstractions — they wait for a
  real signal ([logic-placement.md](../../packages/core/logic-placement.md)).
- **Tests never cite strategy row IDs** ([testing.md](../../packages/core/testing.md#the-test-strategy)).
  Name them in the domain's words: the glossary's terms, and a use-case test after its scenario
  ([testing.md → Integration Test Flavours](../../packages/core/testing.md#integration-test-flavours)).
- **Typecheck and run the test file you're in often;** the full suite once, at the end.

## Stage 0. Inputs

- **The PRD:** the one given (an issue → `gh issue view <n> --comments`; a URL or path → read it).
  Read it in full.
- **The strategy:** the file in the strategies folder that links the PRD.
  - **None, and the change alters behaviour:** stop. It needs a strategy first
    ([testing.md → The Test Strategy](../../packages/core/testing.md#the-test-strategy)); say so and
    point to test-plan.
  - **None, and nothing changes behaviour** (a dependency bump): there is nothing to build test-first.
    Say so.
- **The rows to build:** a slice given → the rows the PRD assigns to it; otherwise every row of the
  strategy. A row an existing test already owns needs nothing built; it goes in the report as covered.
  A slice that owns no rows — a prefactor, a step of a wide refactor — changes no behaviour: build it
  with the existing suite green throughout, and report `rows: none`.
- **The ground:** the existing code and tests the rows touch, the test `AppContext` builder and its
  adapter defaults ([testing.md → The Test AppContext](../../packages/core/testing.md#the-test-appcontext)),
  and the domain vocabulary and decisions, if the repo has them. Absent ones: carry on without them.

## Stage 1. Order the rows

1. **A tracer first:** the integration row that runs the path from the entry point to its effects,
   with one representative input. It proves the layers connect before any case is added.
2. **Then the unit rows,** one case per cycle: each cycle adds one row to the table.
3. **Then the remaining integration rows** — refusals, rollbacks, concurrency, failure modes — guard
   rows among them.

## Stage 2. The loop, per row

1. **Red.** Write one test for the row: at its level, spanning its layers, mocking only its vendors
   ([testing.md → The Two Levels](../../packages/core/testing.md#the-two-levels)). Run it. It must
   fail **at the assertion for that row's risk**. A failure at compilation or setup is not red yet:
   add the least scaffolding — the signature, the wiring, the table — until it fails at the assertion.
   - **A guard row:** this red, run before the protection exists, is one of the two runs its evidence
     needs ([testing.md → What a Test Must Prove](../../packages/core/testing.md#what-a-test-must-prove)).
     Keep the output: the test, the assertion, expected and received.
   - **It passes straight away:** either existing code already owns the risk (cite that test and move
     on), or the test cannot fail — fix the test, not the code.
2. **Green.** Write the least code that passes it. Run the test, then its file.
   - **A guard row:** the green run is the other half, when the only thing added between red and green
     is the protection. If other behaviour went in with it, the red is not evidence: remove only the
     protection, run the test, watch it fail at the assertion, and restore it.
3. **Check the test from each assertion**, against
   [testing.md → What a Test Must Prove](../../packages/core/testing.md#what-a-test-must-prove).
4. **Next row.** One test may cover several rows when each can still fail on its own.

## Stage 3. When the plan turns out wrong

Building shows what planning could not. Make the call, keep going, and record it — never leave it
silent.

- **How it's built or tested.** A rule whose cases turn out expensive through the entry point has
  earned a pure seam ([branching-logic.md](../../packages/core/branching-logic.md#apply-as-a-refactor-not-upfront-design);
  [testing.md → Seams](../../packages/core/testing.md#seams--structuring-logic-so-unit-tests-carry-it));
  a risk the strategy missed needs a row. Make the change with every test green, and edit the strategy
  file to match: the row's new level, the seam with its contract row, the new row. When you work one
  slice of a stack, the edit goes on your own branch.
- **What the product should do.** Behaviour the PRD leaves unspecified: choose what the PRD's intent
  best supports, build it, and record it as a judgment call — what was unspecified, what you chose,
  and why.
- **Something outside your rows that needs a fix** — a bug, a gap or a weak test in code the change
  doesn't own: don't fix it on the side. Offer [capture-fix](../capture-fix/SKILL.md) to the user; when
  no one is there to ask, list it under *fixes found* in your report.
- **A guard row you cannot build at its level** — the overlap can't be forced, the rollback can't be
  provoked: never settle for a weaker test in silence. Record it as a judgment call marked **weakened
  guard**, saying what the test now proves and what it no longer does.

## Stage 4. Finish

Typecheck and the full suite, green. Then report — to the user, or to whoever launched you — in this
shape:

```
rows:
  <ID> → <test file> › <test title>
  <ID> → covered by existing <test file> › <test title>
guard evidence:
  <ID>: without the protection — <test file>:<line> failed: expected <…>, received <…>; with it — passed
strategy changes:
  <ID>: <what changed> — <why>
judgment calls:
  [weakened guard] <ID>: <what the test proves now, and what it no longer does>
  <what the PRD left open> → <what you chose> — <why>
fixes found:
  <what needs fixing, where, and how it showed> | none
```

Committing, pushing and opening a pull request belong to whoever launched you; do them only when
asked. The guard evidence and judgment calls go in the PR's description
([testing.md → What a Test Must Prove](../../packages/core/testing.md#what-a-test-must-prove)).
