---
name: implement
argument-hint: "[PRD or fix issue]"
description: Build a ready issue in a Foundry codebase — a PRD published by elaborate-feature, or a finalised fix filed by capture-fix — as reviewed, CI-green pull requests. Checks the issue is ready first and refuses one that isn't, naming what's missing and the command that completes it. A PRD becomes a stack (the plan PR at the bottom, one PR per slice above it); a fix becomes one PR, its test plan written from the issue. Orchestrates one builder subagent per slice (test-first, with the tdd skill) and two reviews of each slice's PR (review.md with the slice's use cases, and a correctness review), watches CI, gathers every judgment call into the plan PR, then runs test-review once over the whole stack against the PRD's test strategy and routes its findings back to the slices. Ends at a reviewed, CI-green stack for the user to merge. Use when the user asks to implement, build or fix a named issue (a number or link). Never merges.
---

# Implement

You build one ready issue as **pull requests**, and you are their **orchestrator**: you read the issue,
create the branches and worktrees, launch a builder and the reviews for each slice, open the PRs, watch
CI, and keep the plan PR's record of what was decided. Subagents build and review; they never push,
open PRs or touch the tracker. You never build or review in your own context.

An issue comes in one of two kinds:

- **A PRD**, from [elaborate-feature](../elaborate-feature/SKILL.md): its goal, use cases, slice table and
  the branch that holds its plan. It becomes a stack.
- **A fix**, from [capture-fix](../capture-fix/SKILL.md): a contained change to something that already
  exists, with its context, current and desired behaviour, acceptance criteria and evidence. It becomes
  one PR. Wherever this skill and its briefs say *PRD*, a fix reads as one: its desired behaviour is the
  goal, its acceptance criteria its use case, and it is a single slice.

The rules the code and tests follow are Foundry's; the briefs point the subagents at them.

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| Issues live in | *issues on the tracker, e.g. GitHub issues in `<owner>/<repo>`; `docs/agents/issue-tracker.md` gives the commands. Its number names the PRs, and the top PR closes it* |
| Labels | *as capture-fix sets them: the kind `fix`, ready `ready-for-agent`, needs a human `needs-triage`; and `ready-to-land`, which this skill puts on finished PRs* |
| Test strategies live in | `docs/test-strategy/` |
| Quick checks | *the repo's checks short of the full integration suite: the static checks and the unit tests (e.g. `pnpm verify:quick`)* |
| Run test files | *how to run named test files, unit or integration (e.g. `pnpm vitest run <files>`)* |
| Stack-wide checks | *checks too slow for every commit, run once on the top of the stack before the tests are reviewed (e.g. a gate re-proof); or none* |
| Required CI checks | *the check names a PR must show green* |
| Worktree setup | *what a fresh worktree needs: e.g. `pnpm install --frozen-lockfile`, `.env` copied from the main checkout* |
| Correctness review | *the bug review each slice PR gets, report-only: e.g. Claude Code's `code-review` skill, `code-review <PR> high`, in a Sonnet subagent at high effort; or none* |
| UI evidence | *for a slice that changes the UI: how to run the app and capture it (e.g. the repo's run skill and a screenshot); or none* |
| Preview | *how to run the app from a worktree for the user to try: the start command on free ports, the check that it's up, how to expose it to the user (e.g. the host's `expose-service` skill) and how to stop it; or none* |
| Base branch | *the branch PRs target: the default branch, unless the repo integrates elsewhere (e.g. `develop`)* |
| Merge method | *how the repo merges PRs: merge commits, or squash* |
| Subagent model | *e.g. inherit* |

## Invariants

- **Never merge, and never push to the base branch.** Only the PRD's branches reach the remote. The
  user lands the stack.
- **One issue per run.**
- **Token-minimal delegation.** A subagent's prompt holds only pointers: its brief's path, the PRD, the
  slice, the worktree, the base branch, the strategy's path. It reads everything else itself. The one
  thing you paste is what exists nowhere else: review findings to fix.
- **Record as you go.** The plan PR's description is the live record — update it after every slice.
- **CI runs the full suite; nothing here does.** Every pushed commit gets CI's run, and a PR lands
  only with its required checks green on its head commit — that result is the commit's record.
  Locally, a builder runs the quick checks and the test files its change touches, unit and
  integration; no one runs the full integration suite, and no one repeats a run CI makes.
- **One run per worktree.** Nothing else runs in a worktree while its checks run: no dev server or
  preview writing into it, no second agent's checks.
- **Stay in your worktree.** You and every subagent work only in the worktree you were given — launch
  each with it as the working directory, the correctness review included. Never check out, switch
  branches or run anything in the main checkout or another worktree.
- **Skills from the base branch.** The skills and briefs a stack runs are the base branch's as it is
  now: before building, if the plan branch's skill files differ from the base branch's, merge the base
  branch into the plan branch first (Stage 4), so no slice runs a stale copy.

## Stage 0. Is it ready?

Read the issue in full, comments included, and decide its kind: a **fix** carries the fix label; a
**PRD** carries the *Branch* and *Test strategy* lines elaborate-feature writes. Then check it is ready.
**Refuse** anything that isn't — build nothing, and tell the user what is missing and the command that
completes it:

> #418 isn't ready to implement: it still has 1 open question under *Needs a human to finalise*
> (empty list or 404?). Finalise it with `/capture-fix #418`, then run `/implement #418` again.

- **A fix is ready** when it carries the ready label and not the needs-a-human one, has no *Needs a
  human to finalise* section, and has its kind, context, current and desired behaviour, testable
  acceptance criteria and out of scope ([capture-fix](../capture-fix/SKILL.md)). Otherwise:
  `/capture-fix #<issue>`.
- **A PRD is ready** when it has the parts below and its slice table is buildable. Otherwise:
  `/elaborate-feature`.
- **Neither kind:** refuse, and point to `/capture-fix` for a contained change to something that exists,
  or `/elaborate-feature` for new behaviour.

**A PRD:** from it take:

- **the goal** — the user's statement, verbatim;
- **the branch** that holds the plan (its *Branch* line) — fetch it; missing on the remote: stop;
- **the strategy** — the file its *Test strategy* line names, read on that branch. *None* — the change
  alters no behaviour — means no rows, and slices own none;
- **the slice table** — for each slice the use cases it covers, its blockers and the rows it owns.

**Check it is buildable:** every strategy row owned by exactly one slice, every blocker a slice in the
table, no cycle. A gap is a planning fault: stop and say so — the fix is in elaborate-feature, not
here. No slice table: the whole PRD is one slice.

**A fix** has no plan yet; write it before building:

1. **Branch** from the base branch, named for the fix, in a worktree.
2. **Run [test-plan](../test-plan/SKILL.md) on the issue, unattended.** Its rows come from the acceptance
   criteria, plus one for a test that fails on today's behaviour — the reproduction. Where test-plan
   would settle a question with the user, decide it from the issue's desired behaviour and out of scope,
   and record it as a judgment call. Write the strategy, link it to the issue, and commit it.
3. The fix is **one slice** owning every row: continue at Stage 1's *One slice*, on this branch.

## Stage 1. Order the stack

Order the slices so every slice sits above its blockers; ties keep the table's order. That order is
the stack: **the plan branch, then slice 1, slice 2…**, each slice's PR based on the branch directly
below it. A slice's branch is `<plan branch>-s<N>-<slug>`.

**One slice:** no separate plan PR. The slice is built on the plan branch itself, in a worktree on it
(reuse elaborate-feature's if it is still checked out). Its one PR, titled `<issue title> (#<issue>)`,
carries the plan and the code, its description both templates' sections, and closes the issue.

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
   > Read `<repo>/<skills dir>/implement/builder.md` and execute it. PRD: <ref>. Slice: <N>.
   > Worktree: `<path>`. Base: `<branch>`. Strategy: `<path>`.
3. **Catch up** — before every push, merge the branch directly beneath it, at its current tip. That
   brings in a slice built alongside it and any fix carried up from below. Run no checks for a clean
   merge — CI runs on the push; a merge whose conflicts you resolved gets the quick checks first.
   A slice whose branch beneath is still being built waits here.
4. **Push and open its PR** as a draft, base the branch below, its description from
   [pr-templates.md → Slice PR](pr-templates.md#slice-pr): the builder's report — rows, guard evidence,
   strategy changes, judgment calls. The PR's diff is now exactly the slice, which is what both
   reviews read.
5. **Review** — two reviews of the PR, launched together:
   - **Conformance and use cases**, per [reviewer.md](reviewer.md):
     > Read `<repo>/<skills dir>/implement/reviewer.md` and execute it. PRD: <ref>. Slice: <N>.
     > Worktree: `<path>`. Base: `<branch>`. [Re-review: delta since `<sha>`.]
   - **Correctness**, by the repo's correctness review on the PR, report-only — the builder makes the
     fixes, with their tests.

   **Clean** means no conformance blockers and no **high or medium** correctness findings. Where the
   correctness review doesn't rate severity, rate each finding yourself: **high** — wrong behaviour or
   data on a normal path; **medium** — a likely bug on a reachable path; **low** — an unlikely edge,
   cleanup or style. Low findings never block and aren't fixed in the loop: list them in the PR's
   *Verification*, so a review that always finds something can't keep the loop going.

   The blocking findings go back to the builder together, pasted verbatim; push the fixes and run both
   reviews again. Still not clean after **three rounds**, counted together: the slice is **blocked**.
   Record the rounds in the PR's *Verification*.
6. **CI** — watch the required checks. Red: reproduce in the worktree, have the builder fix it, delta
   review, push. Three failed fixes: the slice is **blocked**. An infrastructure flake gets one rerun.
7. **Record** — add the PR to the plan PR's stack, and its strategy changes and judgment calls to the
   plan PR's sections, each naming its slice. A **weakened guard** goes at the top of *Judgment calls*.

**A blocked slice** halts every slice above it in the stack; the others carry on. Comment the
outstanding findings or failure on its PR.

## Stage 4. Carry a fix up the stack

A fix lands on the branch of the slice it belongs to. Then, from that branch upward, **merge each
branch into the one above it**, resolve, and push each — CI runs on every push; only a merge whose
conflicts you resolved gets the quick checks first. A slice whose builder is
still running is skipped: it takes the fix at its own catch-up — never merge into a worktree a builder
is editing. While the stack is being built, never rebase or force-push a branch with an open PR; each
PR's diff stays its own.

**The base branch moving on** is carried the same way: when a PR in the stack conflicts with it,
merge it into the plan branch, then up.

## Stage 5. Review the tests across the stack

When every slice's PR is open, both its reviews are clean (Stage 3, step 5) and its CI is green, run
the repo's stack-wide checks once, in the top slice's worktree; a failure goes to the slice it belongs
to as a fix round. Then launch one agent, in the top slice's
worktree, to run [test-review](../test-review/SKILL.md) on the **whole stack**:

> Run the test-review skill on the current branch against base ref `<base branch>` — the whole
> stack. PRD: <ref>. Strategy: `<path>`. The break-it records are in the slice PRs' descriptions:
> <PR links>.

Each finding goes to the slice that owns its row, or, for a test no row explains, the slice whose
code it tests: fix it there as a fix round (Stage 3, steps 5–6), carry it up (Stage 4), then run
test-review again. Still finding gaps after two
rounds: report them rather than looping. Put the final report's summary on the plan PR.

## Stage 6. Finish

1. **Ready to land** — when nothing in the stack is blocked: mark every PR **ready for review** and
   label it `ready-to-land`. A blocked slice leaves every PR unlabelled; they stay drafts.
2. **Preview** — unless the repo has none: in a worktree on the top branch (the single PR's, for a
   fix), start the app on free ports, wait until it's up, and expose it to the user. Record under the
   plan PR's (or single PR's) *Preview*: the link, the worktree, and everything started — processes,
   containers, ports, the exposed address — with how to stop each. That record is what
   [land-prs](../land-prs/SKILL.md) stops once the work lands.
3. **Clean up:** remove every other worktree and local slice branch you created, and stop anything
   else you started. A worktree on the plan branch that elaborate-feature left stays until the stack
   lands.
4. **Report** to the user: the goal; the preview's link; the stack, bottom to top, each PR's link and
   status; the judgment calls (weakened guards first) and strategy changes, or a pointer to the plan
   PR; the test-review verdict; anything blocked and why. Landing is theirs, with `/land-prs`.
5. **Fixes found** — every one the builders reported, listed for the user with the question
   [capture-fix](../capture-fix/SKILL.md) asks: *Shall I invoke `/capture-fix` for these?*
