# PR templates

## Plan PR

Title: `<PRD title>: plan (#<PRD>)`

```markdown
## Goal

> <the PRD's goal, verbatim>

PRD: #<PRD> · Test strategy: [<path>](<link>)

This PR carries the plan: the test strategy, and the glossary terms and ADRs the PRD settled. The
slices build on it.

## Stack

| | PR | Slice | Status |
|---|---|---|---|
| 1 | #<n> | <title> | <draft · ready · blocked> |

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

Review: <rounds of conformance and correctness review, e.g. 2 rounds, clean> · Gates: <command> green · UI evidence: <links> | n/a
```

The top slice's PR also carries `Closes #<PRD>`.

## Landing

The plan PR's *Landing* section tells whoever merges the stack:

- **Bottom-up:** the plan PR first, then each slice in stack order. Each PR is reviewed against the one
  below it, so it merges only after that one.
- **Merge commits keep the stack intact.** Squash-merging rewrites the merged PR's commits, so the PR
  above it re-shows them and usually conflicts: rebase it onto the default branch before merging it.
- **When the top PR lands,** the PRD closes, the strategy's *Merged in* line is true, and the plan
  branch's worktree and the stack's branches can go.
