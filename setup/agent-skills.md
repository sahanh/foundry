# Agent Skills

Foundry's [`skills/`](../skills/) folder holds **templates**, not installable skills. Each one is a
procedure that applies the guidelines (a test review, a drift check, a PRD brief), written against
Foundry's own paths. An adopting repo installs the ones it wants by copying and adapting them — until
then, an agent can't invoke them, and the review protocol's routes to them have nothing to run.

## Installing a skill

1. **Copy** the skill's folder — `SKILL.md` and every file beside it — into the skill directory of
   each agent harness the repo uses (e.g. `.claude/skills/<name>/`, or the equivalent for another
   harness).
2. **Repoint the Foundry links.** A skill links to the guidelines by relative path
   (`../../packages/core/testing.md`), and every one of those breaks once copied. Point each at the
   Foundry the repo follows: its GitHub URL on `main`, or the repo's own command for reading Foundry
   (e.g. `git -C "$FOUNDRY_DIR" show origin/main:<path>`). Links between the skill's own files stay
   relative.
3. **Fill in its *Project parameters*.** A skill that needs project facts — where PRDs live, which file
   builds the test `AppContext`, where CI results are read — declares them in a table near its top.
   Read each value from the repo, and ask the user for any the code cannot answer. A skill with no such
   table needs only step 2.
4. **List it in the repo's `AGENTS.md`** (or the harness's equivalent, which agents load on every
   session): one line per installed skill — its name, and what to use it for. Agents use the skills
   they are told about at the start; they rarely go looking for one.

Adapt only the parameters and links. A skill's procedure is Foundry's: a project that needs a
different procedure writes its own skill under its own name.

## Keeping current

A [CHANGELOG](../CHANGELOG.md) entry names every skill it changes. When an entry after the repo's pin
([staying-in-sync.md](./staying-in-sync.md)) names an installed skill, re-copying it and re-applying
steps 2 and 3 is part of reconciling that entry.
