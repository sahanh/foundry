---
name: implement-prd
argument-hint: "[PRD issue or URL]"
description: Build a published PRD as a stack of pull requests in a Foundry codebase — the plan PR at the bottom, one PR per slice above it. Orchestrates one builder subagent per slice (test-first, with the tdd skill) and two reviews of each slice's PR (review.md with the slice's use cases, and a correctness review), watches CI, gathers every judgment call into the plan PR, then runs test-review once over the whole stack against the PRD's test strategy and routes its findings back to the slices. Ends at a reviewed, CI-green stack for the user to merge. Use when the user asks to implement or build a named PRD — an issue number or link that elaborate-feature published. Never merges.
---

# Implement PRD

You build one PRD as a **stack of pull requests**, and you are its **orchestrator**: you read the PRD,
create the branches and worktrees, launch a builder and the reviews for each slice, open the PRs, watch
CI, and keep the plan PR's record of what was decided. Subagents build and review; they never push,
open PRs or touch the tracker. You never build or review in your own context.

The PRD comes from [elaborate-feature](../elaborate-feature/SKILL.md): its goal, use cases, slice table
and the branch that holds its plan. The rules the code and tests follow are Foundry's; the briefs point
the subagents at them.

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| PRDs live in | *issues on the tracker, e.g. GitHub issues in `<owner>/<repo>`; `docs/agents/issue-tracker.md` gives the commands. The pipeline needs an issue: its number names the PRs, and the top PR closes it* |
| Test strategies live in | `docs/test-strategy/` |
| Local gates | *the local command in `foundry-ci.md`, e.g. `pnpm verify:checks`* |
| Required CI checks | *the check names a PR must show green* |
| Worktree setup | *what a fresh worktree needs: e.g. `pnpm install --frozen-lockfile`, `.env` copied from the main checkout* |
| Correctness review | *the bug review each slice PR gets, report-only: e.g. Claude Code's `code-review` skill, `code-review <PR> high`, in a Sonnet subagent at high effort; or none* |
| UI evidence | *for a slice that changes the UI: how to run the app and capture it (e.g. the repo's run skill and a screenshot); or none* |
| Base branch | *the branch PRs target: the default branch, unless the repo integrates elsewhere (e.g. `develop`)* |
| Merge method | *how the repo merges PRs: merge commits, or squash* |
| Subagent model | *e.g. inherit* |

## Invariants

- **Never merge, and never push to the base branch.** Only the PRD's branches reach the remote. The
  user lands the stack.
- **One PRD per run.**
- **Token-minimal delegation.** A subagent's prompt holds only pointers: its brief's path, the PRD, the
  slice, the worktree, the base branch, the strategy's path. It reads everything else itself. The one
  thing you paste is what exists nowhere else: review findings to fix.
- **Record as you go.** The plan PR's description is the live record — update it after every slice.

## Stage 0. Inputs

Read the PRD in full, comments included. From it take:

- **the goal** — the user's statement, verbatim;
- **the branch** that holds the plan (its *Branch* line) — fetch it; missing on the remote: stop;
- **the strategy** — the file its *Test strategy* line names, read on that branch. *None* — the change
  alters no behaviour — means no rows, and slices own none;
- **the slice table** — for each slice the use cases it covers, its blockers and the rows it owns.

**Check it is buildable:** every strategy row owned by exactly one slice, every blocker a slice in the
table, no cycle. A gap is a planning fault: stop and say so — the fix is in elaborate-feature, not
here. No slice table: the whole PRD is one slice.

## Stage 1. Order the stack

Order the slices so every slice sits above its blockers; ties keep the table's order. That order is
the stack: **the plan branch, then slice 1, slice 2…**, each slice's PR based on the branch directly
below it. A slice's branch is `<plan branch>-s<N>-<slug>`.

**One slice:** no separate plan PR. The slice is built on the plan branch itself, in a worktree on it
(reuse elaborate-feature's if it is still checked out). Its one PR, titled `<PRD title> (#<PRD>)`,
carries the plan and the code, its description both templates' sections.

## Stage 2. The plan PR

Open it as a **draft**, base the base branch, head the plan branch, its description from
[pr-templates.md → Plan PR](pr-templates.md#plan-pr): the goal first, the PRD, the stack (filled in as
slices open), and empty *Strategy changes* and *Judgment calls* sections.

## Stage 3. Build each slice

A slice is **ready** once each of its blockers has finished its builder; ready slices build in
parallel, each in its own worktree. For each:

1. **Worktree** — branch from the highest branch below it in the stack whose builder has reported,
   then the worktree setup.
2. **Build** — launch a builder per [builder.md](builder.md):
   > Read `<repo>/<skills dir>/implement-prd/builder.md` and execute it. PRD: <ref>. Slice: <N>.
   > Worktree: `<path>`. Base: `<branch>`. Strategy: `<path>`.
3. **Catch up** — before every push, merge the branch directly beneath it, at its current tip, and
   rerun the local gates. That brings in a slice built alongside it and any fix carried up from below.
   A slice whose branch beneath is still being built waits here.
4. **Push and open its PR** as a draft, base the branch below, its description from
   [pr-templates.md → Slice PR](pr-templates.md#slice-pr): the builder's report — rows, guard evidence,
   strategy changes, judgment calls. The PR's diff is now exactly the slice, which is what both
   reviews read.
5. **Review** — two reviews of the PR, launched together:
   - **Conformance and use cases**, per [reviewer.md](reviewer.md):
     > Read `<repo>/<skills dir>/implement-prd/reviewer.md` and execute it. PRD: <ref>. Slice: <N>.
     > Worktree: `<path>`. Base: `<branch>`. [Re-review: delta since `<sha>`.]
   - **Correctness**, by the repo's correctness review on the PR, report-only — the builder makes the
     fixes, with their tests.

   Both reports' findings go back to the builder together, pasted verbatim; push the fixes and run both
   again. Still not clean after **three rounds**, counted together: the slice is **blocked**. Record
   the rounds in the PR's *Verification*.
6. **CI** — watch the required checks. Red: reproduce in the worktree, have the builder fix it, delta
   review, push. Three failed fixes: the slice is **blocked**. An infrastructure flake gets one rerun.
7. **Record** — add the PR to the plan PR's stack, and its strategy changes and judgment calls to the
   plan PR's sections, each naming its slice. A **weakened guard** goes at the top of *Judgment calls*.

**A blocked slice** halts every slice above it in the stack; the others carry on. Comment the
outstanding findings or failure on its PR.

## Stage 4. Carry a fix up the stack

A fix lands on the branch of the slice it belongs to. Then, from that branch upward, **merge each
branch into the one above it**, resolve, rerun the local gates, and push each. A slice whose builder is
still running is skipped: it takes the fix at its own catch-up — never merge into a worktree a builder
is editing. While the stack is being built, never rebase or force-push a branch with an open PR; each
PR's diff stays its own.

**The base branch moving on** is carried the same way: when a PR in the stack conflicts with it,
merge it into the plan branch, then up.

## Stage 5. Review the tests across the stack

When every slice's PR is open, reviewed clean and green, launch one agent, in the top slice's
worktree, to run [test-review](../test-review/SKILL.md) on the **whole stack**:

> Run the test-review skill on the current branch against base ref `<base branch>` — the whole
> stack. PRD: <ref>. Strategy: `<path>`. The break-it records are in the slice PRs' descriptions:
> <PR links>.

Each finding goes to the slice that owns its row, or, for a test no row explains, the slice whose
code it tests: fix it there as a fix round (Stage 3, steps 5–6), carry it up (Stage 4), then run
test-review again. Still finding gaps after two
rounds: report them rather than looping. Put the final report's summary on the plan PR.

## Stage 6. Finish

1. Mark every PR in the stack **ready for review**.
2. Clean up: remove every worktree and local slice branch you created, stop anything you started.
   A worktree on the plan branch that elaborate-feature left stays until the stack lands.
3. Report to the user: the goal; the stack, bottom to top, each PR's link and status; the judgment
   calls (weakened guards first) and strategy changes, or a pointer to the plan PR; the test-review
   verdict; anything blocked and why. Landing is theirs, bottom-up
   ([pr-templates.md → Landing](pr-templates.md#landing)).
