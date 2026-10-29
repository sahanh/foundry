# PR templates

A fix is one PR: its *Goal* is the issue's desired behaviour, and it closes the issue.

## Plan PR

Title: `<PRD title>: plan (#<PRD>)`

```markdown
## Goal

> <the PRD's goal, verbatim>

PRD: #<PRD> · Test strategy: [<path>](<link>)

This PR carries the plan: the test strategy, and the glossary terms and ADRs the PRD settled. The
slices build on it.

## Stack

| | PR | Slice | Blocked by | Status |
|---|---|---|---|---|
| 1 | #<n> | <title> | <slices it really depends on, or —> | <draft · ready · blocked> |

A slice sits above every slice before it; only *Blocked by* is a real dependency.

## Strategy changes

- **Slice <N>** · <row>: <what changed> — <why>

## Judgment calls

- **Weakened guard · slice <N>** · <row>: <what the test proves now, and what it no longer does>
- **Slice <N>:** <what the PRD left open> → <what was chosen> — <why>

## Test review

<the stack-level test-review's summary and verdict>

## Landing

<how this stack lands>
```

## Slice PR

Title: `<slice title> (#<PRD>, slice <N>/<M>)`

```markdown
Part of #<PRD>, slice <N> of <M>: <covers>. Based on #<PR below>.

## Delivers

<what a user can now do, from the slice's use cases>

## Rows

- <row> → <test file> › <test title>

## Guard evidence

- <row>: without the protection — <file>:<line> failed: expected <…>, received <…>; with it — passed

## Judgment calls and strategy changes

<this slice's, or "none" — all of them are gathered on the plan PR>

## Verification

Review: <rounds of conformance and correctness review, e.g. 2 rounds, clean> · Low correctness findings, not fixed: <each, one line> | none · Gates: <command> green · UI evidence: <links> | n/a
```

The top slice's PR also carries `Closes #<PRD>`.

## Landing

The plan PR's *Landing* section tells whoever merges the stack, by the repo's merge method:

- **Bottom-up:** the plan PR first, then each slice in stack order. Each PR is reviewed against the one
  below it, so it merges only after that one.
- **After each merge,** retarget the next PR to the base branch (GitHub does it when the merged
  branch is deleted).
- **Merge commits** keep the stack intact: each PR, once the one below has merged, shows only its own
  commits. **Squash** rewrites the merged PR's commits, so the PR above re-shows them and usually
  conflicts: after each squash, rebase the next PR onto the base branch, push it, and let CI pass
  before merging it.
- **Before merging the top PR,** add the line [testing.md](../../packages/core/testing.md#the-test-strategy)
  asks for at the strategy's top, naming the top PR. The top PR closes the PRD.
- **Once it has landed,** the plan branch's worktree and the stack's branches can go.
