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
   Read each value from the repo; ask the user only for what the code cannot answer.
6. **Check it is invocable.** Confirm the harness lists it (Claude Code: it appears among the available
   skills and as `/<name>`). A skill that doesn't show up is not installed.
7. **List it in the repo's `AGENTS.md`** (or the file the harness loads on every session): one line per
   skill — its name and what to use it for. Agents use the skills they are told about at the start;
   they rarely go looking for one.

**Adapt only the frontmatter format, the links and the parameters.** The procedure is Foundry's: a
project that needs a different procedure writes its own skill under its own name.

## The pipeline

Two skills take a feature from an idea to a stack of pull requests; the others run inside them.

1. **`/elaborate-feature`** (user-only) — the goal, the grilling, the PRD, its test strategy (`test-plan`)
   and its slices, published with the plan committed on a branch.
2. **`/implement-prd <PRD>`** — the plan PR, then one PR per slice built with `tdd` and reviewed for
   conformance (`review.md`) and correctness; then `test-review` once over the whole stack. It stops at a
   ready stack: landing it is the user's.

`test-plan`, `tdd` and `test-review` stay usable on their own.

## Companion skills

`elaborate-feature` runs two skills Foundry doesn't own: **`grilling`** and **`domain-modeling`**, from
Matt Pocock's [skills](https://github.com/mattpocock/skills) (MIT), at commit
[`59db609`](https://github.com/mattpocock/skills/tree/59db609eb1e18aaf59b63284d0e52255aff0c63c). Install
both as the repo's own, alongside Foundry's:

- **Copy each folder as published** from `skills/productivity/grilling/` and
  `skills/engineering/domain-modeling/` at that commit, with a copy of the upstream repo's root
  `LICENSE` in each.
- **List them in `AGENTS.md`** beside Foundry's skills (step 7 above).
- **Adapt only `domain-modeling`'s file layout** to where the repo keeps its glossary and ADRs, and note
  that difference in the repo's records. Change nothing else, so a later upstream commit can be copied
  over the same way.
- **Upstream's `grill-with-docs`**, which runs the same two skills, may be installed beside them; it
  stays usable on its own. Its `to-spec` and `to-tickets` are what `elaborate-feature` replaces.

A Foundry changelog entry names the commit whenever it moves.

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
