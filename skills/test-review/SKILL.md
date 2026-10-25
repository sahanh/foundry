---
name: test-review
argument-hint: "[PR number or URL | base ref] [test strategy path | PRD issue, URL or path]"
description: Verify a change's tests in a Foundry codebase against its PRD's test strategy. Maps the changed code and the changed tests separately, reconciles each strategy row and category question with the tests that cover it, checks from each assertion whether it could fail, and checks break-it evidence for guard rows. The report is a fixed table, one line per row, with file:line on both sides. Read-only: never writes or runs tests unless the user asks it to re-check a guard. Use when asked to review the tests of a PR or branch, check test coverage or test quality, find test gaps, or when review.md routes the tests node here.
---

# Test review

You check whether a change's tests **cover its test strategy** and whether each test **can fail**.
This is the tests node of Foundry's [review protocol](../../review.md), zoomed in. The rules are owned
by [testing.md](../../packages/core/testing.md); this file is the procedure that applies them, and
each check below is a one-line echo with a link to its owner.

**Read-only.** Do not write, modify or commit anything. Run tests only to re-check a guard row
(Stage 4), and only when the user allows it.

**The report is the protocol.** Fill in every table in [report-template.md](report-template.md). A row
left out is a check not done; a verdict without file:line on both sides doesn't count.

## How to work

- **One file per read.** Never number several files in one command (`cat -n a.ts b.ts` numbers lines
  across files, and your line references drift).
- **Write candidates down as you go,** each with file:line, before moving to the next file. Recheck
  every candidate before it reaches the report.
- **Cite both sides:** the production code, and the test with what it actually asserts.
- **Two directions, always both:** from the code (break it — which test fails?) and from each
  assertion (could this ever fail?). Neither replaces the other.
- **Explore before asking.** Ask the user only what the code, the PRD and the strategy cannot answer,
  with a recommended answer.

## Stage 0. Inputs

`$ARGUMENTS` is `[change] [strategy-or-PRD]`.

- **The change:** a PR number or URL → `gh pr view <n> --json title,body,baseRefName,headRefOid` and
  `gh pr diff <n>`; a base ref → the current branch against its merge-base with that ref; nothing → the
  current branch against the default branch, uncommitted changes included. Record base and head.
- **The strategy:** the path given, or the file under `docs/test-strategy/` that links the PRD the
  change names (its description, branch name, linked issues). Read it in full.
  - **No strategy found:** say so in the report header — it fails
    [core/end-here.md → Testing](../../packages/core/end-here.md) — then derive one from the PRD and the
    diff in [testing.md's format](../../packages/core/testing.md#what-the-strategy-contains), mark it
    *derived*, and review against it.
  - **A strategy marked merged** belongs to an earlier PRD; it is history, not this change's plan.
- **The PRD:** read it. A behaviour it states that the strategy has no row for is a hole in the plan.
- **CI:** read the change's CI result, or run the repo's local command when allowed. A mutation score
  is evidence only for the files it mutates — read the mutation config for its exclusions — and never
  for a race or rollback row ([testing.md](../../packages/core/testing.md#what-a-test-must-prove)).
- **The harness:** read the test `AppContext` builder and every adapter it defaults. Note, for each
  adapter, its default state — a spy disabled by default makes every "not sent" assertion through it
  vacuous. Name the files you read.

## Stage 1. Map the code

From `git diff --stat <base>...<head>`, list every changed production file, then in each file every
changed function and branch: a conditional, an early return, a throw, a query predicate, a lock, a
conditional write, a unique constraint and its violation mapping, a transaction boundary, an effect
(write, dispatch, vendor call), a clock read.

For each, trace up to its **entry point** (the method a driving adapter calls) and down to the
**effects** it leaves. Then, for each:

- **Break it in your head** — invert the condition, drop the lock, remove the rollback. Which test
  fails? Note the test, or "none".
- **For every read, then decide, then write, and every write a uniqueness guard protects:** what if two
  requests run it at once?
- **For every effect after a commit:** what if it fails? **For every loop:** what if one step fails?
  **For every input:** what if it arrives twice?

## Stage 2. Map the tests

Every test file the change adds or touches, plus every existing test that exercises changed code —
**one file at a time**, read next to the production code it exercises. For each test, record:

- its level: unit, or integration (on the test `AppContext` — a test that stubs the database's
  behaviour is not integration, whatever its suffix)
- where it enters, which layers it spans, and what it mocks
- the outermost thing it asserts: a row, a dispatch and its effect, a vendor call, an exception

Then, **from each assertion**, ask whether it could fail
([testing.md → What a Test Must Prove](../../packages/core/testing.md#what-a-test-must-prove)):

- **Literal?** Is the expected value written out, or taken from the code's own constant or helper?
  Grep for the literal.
- **Precise?** Would the wrong failure also satisfy it (`toThrow(Error)`)?
- **Complete?** Does it assert everything the test's name claims?
- **Possible?** For "not sent / nothing queued / nothing written": could the effect have happened in
  this setup at all? Check the adapter's default from Stage 0.
- **Right object?** Is the spy on the handle the code uses — inside a transaction, the transaction's
  own handle, not the outer one?
- **Guard-dependent?** Would the test still pass with the guard removed?
- **Observable?** Does it pin internal structure nobody reads?

## Stage 3. Reconcile

Four directions, each a table in the report:

1. **Every strategy row → its tests.** Verdict: **covered**, **stops short** (the test exists but an
   assertion can't fail, or it spans less than the row names), **missing**, or **wrong level**.
2. **Every category question, per use case → its answer.** Rows present, or an `n/a` whose behaviour
   is truly absent ([testing.md](../../packages/core/testing.md#what-the-strategy-contains)). A question
   skipped in silence, or an `n/a` hiding real behaviour, is a hole in the plan.
3. **Every test → its row.** A test no row explains is a risk the plan missed (report the missing row)
   or a risk owned at two levels (report the overlap).
4. **Every Stage 1 finding → a row.** A changed path, race, failure mode or effect with no row is a
   hole in the plan.

Check *Not covered*: only a behaviour-free layer or a user-accepted exception qualifies.

## Stage 4. Guard evidence

For every row about a lock, a conditional write, a uniqueness guard, a rollback or a refusal, find the
PR's break-it record — what was broken, and which test failed
([testing.md](../../packages/core/testing.md#what-a-test-must-prove)). No record → **stops short**,
whatever the test looks like. When the user allows running tests, re-check one or two of these rows
yourself: break the guard, run the test, confirm it fails, revert, and confirm the tree is clean.

## Stage 5. Report

Fill [report-template.md](report-template.md). Before writing it:

- **Citation check.** Grep the head for every test title and file:line you cite. A citation that
  doesn't resolve moves the row to **missing**, with a note.
- **Recipes, not code.** Each gap names the file to extend, the fixture to reuse, the trigger, and
  what to assert. If the behaviour is unspecified, open the recipe with `Decide first:` and the options.
- **Keep "Checked and sound".** List what you verified and why it holds; it exposes misjudgements a
  gaps-only list hides.

After the report, stop. Do not implement any gap.
