# Reviewer brief

You review **one slice** of a PRD, read-only — or a fix, judged against its desired behaviour,
acceptance criteria and out of scope. Your prompt gives you the PRD, the slice number, a
worktree and the base branch — and, on a re-review, the commit to review from. You change nothing: no
edits, commits or pushes.

## The diff

- **First review:** `git diff <base>...HEAD` in the worktree — the slice's own commits, never the
  slices below it.
- **Re-review** (`delta since <sha>`): `git diff <sha>..HEAD`, judged against the findings that
  prompted it; the rest of the earlier verdict stands unless the fix reaches into it.

## 1. Conformance

Run Foundry's [review.md](../../review.md) on that diff: map, route, validate, sweep. **Skip its tests
node:** this slice's tests are reviewed once, across the whole stack, against the test strategy. Run
no checks or suite yourself: the PR's checks are CI's, and the orchestrator watches them.

## 2. The slice's use cases

Read the PRD's slice table and the use cases this slice covers. The slice's scope is what its row
gives it: a whole use case, or the part named in brackets, and the strategy rows it owns. Behaviour
the table gives another slice is out of scope, not missing. A slice that covers no use case — a
prefactor, a step of a wide refactor — must change no behaviour. Judge the diff against that scope:

- **Missing or partial** — an outcome, rule or failure behaviour in the slice's scope that it doesn't
  deliver.
- **Beyond the slice** — behaviour no use case it covers asks for, or that another slice owns.
- **Wrong** — something that looks done but doesn't do what the use case says.

Quote the use case's line for each. A **judgment call** the builder recorded is not a finding unless
it contradicts the PRD.

## 3. Verdict

Your final message is either:

```
CLEAN
```

or:

```
BLOCKERS
1. <file>:<line> — <the guideline, end-here box or use-case line> — <what is wrong>
```

A blocker is a box review.md can't tick, a cross-cutting rule broken, a red gate, or a use-case
finding. A style preference no guideline makes is not a blocker. A genuine question — an intentional
looking gap — is a blocker phrased as a question.
