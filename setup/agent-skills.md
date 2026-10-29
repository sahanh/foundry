# Agent Skills

Foundry's [`skills/`](../skills/) folder holds **templates**, not working skills. Each is a procedure
that applies the guidelines — planning tests, reviewing them, checking drift, reconciling Foundry
changes — written against Foundry's own paths. Where it sits, no agent harness discovers it: nobody can
invoke it, and the guideline steps that route to it have nothing to run. **Setting up a repo means
installing every skill as the repo's own**, invocable both by the user (as a command) and by the agent
(when a task matches the skill's description) — unless the skill's frontmatter marks it user-only.

## You are installing them

When you set up a repo for Foundry — or reconcile one and find a skill new, changed or removed
([Keeping current](#keeping-current)) — do this yourself, for every skill in Foundry's `skills/` at the
commit the repo follows. Install all of them unless the user declines one; ask once, listing them with
their one-line descriptions and recommending all.

For each skill:

1. **Find the harness's project skill directory.** Every agent harness the repo uses — check which
   (`.claude/`, `AGENTS.md` instructions, the user) — discovers skills in its own place: Claude Code in
   `.claude/skills/<name>/SKILL.md`; another harness wherever its documentation says project skills
   live. Install into each one. A skill the repo installs once, in a directory no harness reads, is
   still not installed.
2. **Copy the whole folder** — `SKILL.md` and every file beside it (templates, scripts) — keeping the
   folder name equal to the skill's `name`. Keep a script's executable bit.
3. **Keep the frontmatter.** The `name` is how the user invokes it; the `description` is how the agent
   recognises when to use it. Change neither, except to fit the harness's frontmatter format.
   `disable-model-invocation: true` makes a skill user-only; keep it, in the harness's own form where it
   differs (Codex: `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml`).
4. **Repoint the Foundry links.** A skill links to the guidelines by relative path
   (`../../packages/core/testing.md`), and every one breaks once copied. Point each at the Foundry the
   repo follows: its GitHub URL on `main`, or the repo's own command for reading Foundry (e.g.
   `git -C "$FOUNDRY_DIR" show origin/main:<path>`). Links between the skill's own files stay relative.
5. **Fill in its *Project parameters*.** A skill that needs project facts — where PRDs live, which file
   builds the test `AppContext`, where CI results are read — declares them in a table near its top.
   Read each value from the repo; ask the user only for what the code cannot answer. The pipeline's
   labels also need creating in the tracker ([Tracker labels](#tracker-labels)).
6. **Check it is invocable.** Confirm the harness lists it (Claude Code: it appears among the available
   skills and as `/<name>`). A skill that doesn't show up is not installed.
7. **List it in the repo's `AGENTS.md`** (or the file the harness loads on every session): one line per
   skill — its name and what to use it for. Agents use the skills they are told about at the start;
   they rarely go looking for one.

**Adapt only the frontmatter format, the links and the parameters.** The procedure is Foundry's: a
project that needs a different procedure writes its own skill under its own name.

## The pipeline

Three skills take work from an idea, or a problem found along the way, to reviewed pull requests; the
others run inside them.

1. **`/elaborate-feature`** (user-only) — new behaviour: the goal, the grilling, the PRD, its test
   strategy (`test-plan`) and its slices, published with the plan committed on a branch.
2. **`/capture-fix`** — a contained change to something that already exists (a bug, an implementation
   gap, a test fix), found while working: offered by the agent, run only on the user's yes, filed as a
   self-contained issue that is ready to build or lists what a human must finalise.
3. **`/implement <issue>`** — a ready PRD or fix, refusing one that isn't: for a PRD the plan PR, then one
   PR per slice; for a fix one PR, its test plan written from the issue. Each PR is built with `tdd` and
   reviewed for conformance (`review.md`) and correctness; then `test-review` once over all of it. It
   stops at ready PRs: landing them is the user's.

`test-plan`, `tdd` and `test-review` stay usable on their own.

### Tracker labels

The pipeline hands work over through issue labels. **Create each one in the repo's tracker when you
install the skills**, or map it to an existing label with the same meaning; the names are the skills'
*Fix labels* parameter (`capture-fix`, `implement`), so they match it.

| Label | Means | Applied by | Read by |
|---|---|---|---|
| `ready-for-agent` | fully specified: an agent can build it | `elaborate-feature` (every PRD it publishes), `capture-fix` (a fix with no open questions or after finalising) | `implement` — the queue of ready work |
| `needs-triage` | a human must settle its open questions first | `capture-fix` (a fix with a *Needs a human to finalise* section) | `/capture-fix #<n>`, which finalises it; `implement` refuses it |
| `fix` | the kind: a bug, implementation gap or test fix in something that already exists | `capture-fix` (every issue it files) | `implement`, which builds it as one PR; `label:fix label:ready-for-agent` is the fix queue |

## Skills from upstream

Two skills Foundry ships are Matt Pocock's, copied from his [skills](https://github.com/mattpocock/skills)
repo (MIT) at commit [`59db609`](https://github.com/mattpocock/skills/tree/59db609eb1e18aaf59b63284d0e52255aff0c63c):
[`grilling`](../skills/grilling/SKILL.md) and [`domain-modeling`](../skills/domain-modeling/SKILL.md),
which `elaborate-feature` runs. Each folder carries the upstream `LICENSE` and a line naming its source.
They install like every other skill; only `domain-modeling` has parameters (where the repo keeps its
glossary and ADRs). Foundry moves them to a newer upstream commit in a change of its own, with a
changelog entry, so an adopting repo never fetches them from upstream itself. Upstream's
`grill-with-docs`, `to-spec` and `to-tickets` are not part of Foundry: `elaborate-feature` does their job.

## Keeping current

Every skill change is a [CHANGELOG](../CHANGELOG.md) entry naming the skill, and reconciling the
entries after the repo's pin ([staying-in-sync.md](./staying-in-sync.md#reconciling)) includes the
installed skills:

- **A new skill** — install it, as above.
- **A changed skill** — re-copy it, then re-apply steps 3–6, carrying over the parameter values
  already filled in.
- **A removed skill** — delete the installed copy and its `AGENTS.md` line.

The reconcile brief lists all three
([reconcile-foundry-changes](../skills/reconcile-foundry-changes/SKILL.md)).
