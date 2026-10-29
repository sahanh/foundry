---
name: land-prs
argument-hint: "[PR] [base | production branch]"
description: Land the pull requests labelled ready-to-land in a Foundry codebase — every one, or a named one and the stack beneath it. Surveys them read-only, shows one plan, and on the user's approval merges them bottom-up into the base branch, re-checking each live, fixing mechanical staleness, watching the branch's CI after every merge and stopping on red; deploys once at the end; reaches the production branch only when the user names it; then closes the issues and cleans up the branches, worktrees and preview stacks the work left. Never deploys production.
disable-model-invocation: true
---

# Land PRs

You land finished pull requests: the ones `implement` labelled `ready-to-land` when it finished, or a
person labelled by hand. You survey them, agree **one plan** with the user, then carry it out without
coming back with questions — merging in order, watching each merge, deploying once, and cleaning up
what the work left behind.

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| Base branch | *the branch PRs land in: the default branch, unless the repo integrates elsewhere (e.g. `develop`)* |
| Production branch | *the branch production is deployed from, when it isn't the base branch (e.g. `main`); or none* |
| Promotion | *how the base branch reaches the production branch, e.g. a release PR from base into production, merged with a merge commit* |
| Merge method | *merge commits, or squash* |
| Required CI checks | *the check names a PR, and the branch after a merge, must show green* |
| Local gates | *the local command in `foundry-ci.md`, e.g. `pnpm verify:checks`, for a PR you bring up to date* |
| Worktree setup | *what a fresh worktree needs: e.g. `pnpm install --frozen-lockfile`* |
| Deploy after landing | *the command that deploys the base branch, run once at the end of a run (e.g. `pnpm deploy:staging`); or none* |
| Known conflict fixes | *mechanical conflicts and their fix, e.g. a lockfile: take the base's and reinstall; or none* |
| Labels | *ready `ready-to-land`* |

## Invariants

- **One gate.** Nothing changes before the user approves the plan; after it, no more questions the plan
  already answered.
- **Never merge over a human objection,** whatever the label says.
- **Never push to the base or production branch.** They move only by merging a PR.
- **The production branch only when named,** and never a production deploy: that stays the user's,
  approved each time.
- **Stop on red.** A red branch after a merge, or a failed deploy, stops the run: nothing else merges,
  nothing is promoted.

## Stage 0. Inputs

- **Which PRs:** a PR given → it, and the open PRs beneath it in its stack; none → every open PR
  labelled ready.
- **Where to:** the base branch, unless the user names the production branch — then the base branch
  first, and promotion after (Stage 5).

## Stage 1. Survey

Read-only. For each PR:

- its labels, draft state, and whether it merges cleanly;
- its **live** CI on its current head: every required check listed and green — a missing check is not
  a pass;
- whether its head moved after the ready label went on, and who pushed;
- human activity since the label: changes requested, unresolved review threads, a comment raising a
  concern;
- its place in a stack — a PR whose base is another open PR's head sits above it;
- the issue it closes, and its *Preview* record, if it has one.

Then classify each, first match wins:

1. **Held** — a human objection. Never landed; shown at the gate.
2. **Skipped** — a draft, or not labelled ready (a named PR without the label is shown, and lands only if
   the user says so at the gate).
3. **Stale** — labelled, but behind the base branch, conflicting, red now, or moved after labelling.
4. **Ready.**

A held or skipped PR holds every PR above it in its stack.

## Stage 2. The plan and the gate

**Order:** each stack bottom-up, its PRs back to back; standalone PRs between stacks, by PR number.
Show, in one message:

- a table — PR, title, the issue it closes, stack position, class, the action (`land 3rd`, `bring up to
  date, then land`, `hold`, `skip`);
- for each held or skipped PR, why;
- the deploy that will run at the end;
- **when the production branch is named:** what a promotion would carry. If the base branch holds
  anything beyond this run's PRs, name it and ask: *promote all of it, or cherry-pick only this run's
  PRs?*

The user approves, overrides per PR (*hold #44*, *land #51 anyway*), or aborts.

## Stage 3. Land, in plan order

For each PR:

1. **Re-check it live:** still open, merges cleanly, required checks green on its **current** head, no
   new objection, head unchanged since the survey. Anything else is reconciled below or held.
2. **Bring a stale PR up to date** in a worktree on its branch (with the worktree setup):
   - **behind, no conflict** — merge the base branch in, run the local gates, push, wait for fresh CI;
   - **a known conflict** — apply its fix, run the local gates, push, wait for fresh CI;
   - **anything else** — a real code conflict, a push nobody in the plan made, CI red with no known fix:
     **hold** it, remove the ready label, and comment what collided.

   Never rebase or force-push: merging the base in keeps the PR's diff its own.
3. **The top PR of a PRD's stack:** before merging it, commit the line
   [testing.md](../../packages/core/testing.md#the-test-strategy) asks for at the strategy's top,
   naming this PR, and wait for its CI.
4. **Merge** with the merge method, and record the merge commit.
5. **Watch the base branch's CI** on that merge commit. **Red: stop.** Report which merge broke it and
   the failing step, and propose reverting that merge or fixing forward — do neither yourself.
6. **The next PR in its stack:** make sure it now targets the base branch (GitHub retargets it when the
   merged branch is deleted). Under squash, the PR above now re-shows the merged commits: bring it up
   to date by merging the base branch in (step 2) before landing it.

## Stage 4. Deploy

Once every planned PR has landed and the base branch is green, run the deploy, once. A failure stops
the run: report it, and promote nothing.

## Stage 5. The production branch

Only when the user named it, and as they chose at the gate:

- **Promote** — by the repo's promotion: open it, wait for its required checks, merge it.
- **Cherry-pick** — each PR this run landed, its merge commit cherry-picked in landing order onto a
  branch cut from the production branch, opened as one PR, its checks waited for, then merged.

Then watch the production branch's CI as in Stage 3, step 5. Deploy nothing.

## Stage 6. Clean up

- **Issues:** every issue a landed PR closes is closed — a PRD when its top PR lands, a fix with its PR.
  One left open: close it with a comment naming the PR and merge commit.
- **Remote branches:** each landed PR's branch is deleted, unless an open PR still sits on it.
- **Preview stacks:** for each landed PR with a *Preview* record, stop exactly what the record lists —
  its processes, containers and exposed address — then remove its worktree. Never stop anything the
  record doesn't name; a preview whose record you can't act on from this machine is reported, with
  how to stop it.
- **Other worktrees the work left:** remove a worktree and its local branch only when it has no
  uncommitted changes and its head is already on the branch it landed in. Anything else — or a dev
  server you can't tie to a landed PR — stays, and is listed.
- **The local base branch:** fast-forward it if it is checked out and clean.

## Stage 7. Report

- **Landed:** PR → issue → merge commit → the branch's CI.
- **Held, skipped, brought up to date:** each with why.
- **Deploy:** its result. **Production:** promoted, cherry-picked, or untouched.
- **Cleaned up:** issues closed, branches deleted, previews stopped, worktrees removed — and what was
  left running, and why.
- **Needs a human:** anything stopped on red, and every held PR.
