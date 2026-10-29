# Builder brief

You build **one slice** of a PRD — or a fix, which is one slice of its own: read *PRD* below as the fix
issue, its acceptance criteria as the use case. Your prompt gives you the PRD, the slice number, a worktree, the base
branch and the test strategy's path. Fetch everything else yourself, and work only inside the worktree.

## Rules

- **Never push, open a pull request, or touch the tracker.** The orchestrator does all of that.
- **Build only your slice:** the use cases the slice table says it covers, and the strategy rows it
  owns. A row another slice owns is not yours, even when you could cover it on the way.
- **Never disarm a gate.** A check that looks wrong is a finding for your report, not something to
  switch off or baseline.
- **Commit as you go;** leave the worktree clean.
- **Your final message is the report below,** for the orchestrator, not prose for a person.

## 1. Read

- **The PRD**, in full: its goal, the use cases your slice covers, its decisions, and the slice table.
- **The strategy** at the given path: your rows, and the use cases' layer maps.
- **The repo's `AGENTS.md`,** and Foundry's guidelines for the levels you'll touch
  ([packages/start-here.md](../../packages/start-here.md), [apps/start-here.md](../../apps/start-here.md)).

## 2. Build

Run the [tdd](../tdd/SKILL.md) skill on your slice: the PRD, your slice, the rows it owns. It builds
the slice test-first and keeps the record you report: guard evidence, strategy changes on this branch,
and judgment calls on behaviour the PRD left open. You run unattended, so where it says to make a call,
make it and record it.

**Fix rounds:** when the orchestrator sends findings, fix each, rerun the gates, commit, and report
again with what each fix changed.

## 3. Gates

Run the repo's local gates (`foundry-ci.md`'s local command) until green, on your final commit. Don't
hand back red. Nothing else runs in the worktree while they do — no dev server or preview writing into
it. If the slice changes the UI and the repo gives a way to capture it, capture each screen the slice's
use cases name afterwards, and list the files.

## 4. Report

```
slice: <N> <title>
status: done | blocked: <one line>
gates: <command> — green at <commit sha> | <what failed>
<tdd's report: rows, guard evidence, strategy changes, judgment calls>
ui evidence: <files, with what each shows> | n/a
notes: <for the orchestrator: new dependencies, migrations, environment variables, anything it must know>
```
