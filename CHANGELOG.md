# Changelog

Notable changes to Foundry. If a concept you remember is gone, look here for
what replaced it and how to migrate.

Each entry's **Commit:** is the commit on `main` that made it — what an adopting repo's pin names
([setup/staying-in-sync.md](./setup/staying-in-sync.md)). Entries older than
*2026-07-09 — Handled failures must be logged* predate commit refs.

---

## 2026-10-29 — CI may run only the formatter on a docs-only change

**Commit:** [`2b3bfce`](https://github.com/sahanh/foundry/commit/2b3bfce2d30b74e9d1b3e832f98b67cb697d8002)

[setup/ci-verification.md → Docs-only changes](./setup/ci-verification.md#docs-only-changes) is a
second exception to "every check on every pull request": a change touching only a declared docs set
runs only the formatter, with the required check still reporting. The manifest records the set and its
exclusions (files code, tests or checks read). New rule **CI-01** (conditional): the docs-only set is
honest.

Affects adopting repos that want the docs-only path: build it and CI-01, and record the set in the
manifest; repos that don't record CI-01 as `n/a`. Read
[setup/ci-verification.md → Docs-only changes](./setup/ci-verification.md#docs-only-changes) and
[→ Docs-only CI path](./setup/ci-verification.md#docs-only-ci-path).

## 2026-10-29 — implement verifies each commit once

**Commit:** [`25defdf`](https://github.com/sahanh/foundry/commit/25defdfcbfcd3a297052db59c2861e5c78148718)

**implement**'s reviewer no longer runs the local gates: it reads the builder's recorded result for the
PR's head commit, and CI's. A commit with a recorded passing run isn't verified again; a new commit is.
Nothing else runs in a worktree while its gates run. A new *Stack-wide checks* parameter runs checks too
slow for every commit once, on the top of the stack.

Affects adopting repos that installed `implement`: re-copy it, and move any slow check out of *Local
gates* into *Stack-wide checks*. Read [skills/implement/SKILL.md → Invariants](./skills/implement/SKILL.md#invariants).

## 2026-10-29 — The pipeline's tracker labels are listed

**Commit:** [`07ec583`](https://github.com/sahanh/foundry/commit/07ec583b9e1e592997df1a3136f20b9f7b075308)

[setup/agent-skills.md → Tracker labels](./setup/agent-skills.md#tracker-labels) lists the issue labels
the pipeline hands work over with — `ready-for-agent`, `needs-triage` and `fix` — what each means, and
which skill applies and reads it; setup creates them in the tracker.

Affects adopting repos that installed `capture-fix` or `implement`: make sure the three labels exist, or
map them in the skills' *Fix labels* parameter. Read
[setup/agent-skills.md → Tracker labels](./setup/agent-skills.md#tracker-labels).

## 2026-10-29 — implement-prd becomes implement, for PRDs and fixes; new capture-fix skill

**Commit:** [`355995a`](https://github.com/sahanh/foundry/commit/355995a5a1562fda01b3b4182f321bb30898ef56)

**implement-prd** is renamed **implement** ([skills/implement/](./skills/implement/SKILL.md)). It takes a
ready issue of either kind — a PRD from `elaborate-feature`, or a finalised fix from the new
**capture-fix** — checks it is ready first, and refuses one that isn't, naming what's missing and the
command that completes it. A fix becomes one PR, its test plan written unattended from the issue.

New skill, **capture-fix** ([skills/capture-fix/](./skills/capture-fix/SKILL.md)): a bug, implementation
gap or test fix found while working is filed as a self-contained issue, labelled ready or marked for a
human to finalise, after the agent asks "Shall I invoke /capture-fix?". **tdd**, **implement** and
**elaborate-feature** offer it rather than fixing on the side, and
[setup/agent-skills.md → The pipeline](./setup/agent-skills.md#the-pipeline) names it.

Affects adopting repos that installed `implement-prd`: install `implement` in its place, carrying its
parameters over (*PRDs live in* is now *Issues live in*; add *Fix labels*), and update its `AGENTS.md`
line. Install `capture-fix`, and re-copy `tdd` and `elaborate-feature`.

## 2026-10-29 — implement-prd: only high and medium correctness findings block

**Commit:** [`1dd3ed2`](https://github.com/sahanh/foundry/commit/1dd3ed20704a7bd37471bde46bf8754e3a94e92b)

**implement-prd** defines a clean slice review: no conformance blockers and no high or medium findings
from the correctness review, rated by the orchestrator where the review doesn't rate them. Low findings
don't block and are listed on the slice PR, so the fix loop ends. The whole-stack test-review waits for
both reviews clean and CI green on every slice.

Affects adopting repos that installed `implement-prd`: re-copy it. Read
[skills/implement-prd/SKILL.md → Stage 3](./skills/implement/SKILL.md#stage-3-build-each-slice).

## 2026-10-29 — domain-modeling follows the repo's own ADR rules

**Commit:** [`a0f4789`](https://github.com/sahanh/foundry/commit/a0f4789bef5ce8dbf2bb7cfc9ebda9953897536d)

**domain-modeling** gains an *ADR format* parameter: a repo with its own rules for writing ADRs (their
numbering, template and index) names them, and they replace the skill's `ADR-FORMAT.md`.

Affects adopting repos that installed `domain-modeling` and keep their own ADR rules: fill in *ADR
format*. Read [skills/domain-modeling/SKILL.md → Project parameters](./skills/domain-modeling/SKILL.md#project-parameters).

## 2026-10-29 — grilling and domain-modeling ship with Foundry

**Commit:** [`dd79217`](https://github.com/sahanh/foundry/commit/dd792177735ff5a7e4e608181affee0a0f95dc40)

Matt Pocock's **grilling** and **domain-modeling** skills, which `elaborate-feature` runs, are now
Foundry skills ([skills/grilling/](./skills/grilling/SKILL.md), [skills/domain-modeling/](./skills/domain-modeling/SKILL.md)),
copied at upstream `59db609` with its licence; `domain-modeling` gains parameters for where the glossary
and ADRs live. [setup/agent-skills.md](./setup/agent-skills.md)'s *Companion skills* section, which had
each repo copy them from upstream, is replaced by *Skills from upstream*.

Affects adopting repos that installed them from upstream, or installed upstream's `grill-with-docs`,
`to-spec` or `to-tickets`: install Foundry's copies in their place, carrying over the glossary and ADR
locations, and remove the upstream-only ones. Read
[setup/agent-skills.md → Skills from upstream](./setup/agent-skills.md#skills-from-upstream).

## 2026-10-29 — Pipeline skills target a base branch

**Commit:** [`6e7fd52`](https://github.com/sahanh/foundry/commit/6e7fd52e13912464831b147b060e52a1f2496251)

**implement-prd** and **elaborate-feature** gain a *Base branch* parameter: the branch work is cut from
and the stack targets, the default branch unless the repo integrates elsewhere (e.g. `develop`).
Everything they said of "the default branch" now says the base branch.

Affects adopting repos that installed either skill: fill in *Base branch*. Read
[skills/implement-prd/SKILL.md → Project parameters](./skills/implement/SKILL.md#project-parameters).

## 2026-10-29 — Pipeline skills: landing marks the strategy, slice scope, stack catch-up

**Commit:** [`063efb6`](https://github.com/sahanh/foundry/commit/063efb6b40a28c821f1af896bc4d1d106fc5f4e3)

After a review of the pipeline, **implement-prd** no longer marks the strategy *Merged in* ahead of time
(a marked strategy reads as an earlier PRD's to test-review); the merger adds it before the top PR lands,
by the repo's new *Merge method* parameter. Its stack catches up before every push, carries fixes and a
moving default branch up by merge, and hands test-review the top worktree. Its reviewer judges a slice
against the part of each use case it covers. **tdd** and **elaborate-feature** handle a slice with no
rows and a PRD with no strategy; **elaborate-feature** assigns rows existing tests cover. Both pipeline
skills need the PRD to be a tracker issue. [setup/agent-skills.md → Companion
skills](./setup/agent-skills.md#companion-skills) copies the upstream root `LICENSE` and lists the
companions in `AGENTS.md`.

Affects adopting repos that installed these skills: re-copy `implement-prd`, `tdd` and
`elaborate-feature`, filling in *Merge method*. Read
[skills/implement-prd/pr-templates.md → Landing](./skills/implement/pr-templates.md#landing).

## 2026-10-29 — New implement-prd skill: a PRD built as a PR stack

**Commit:** [`deefd20`](https://github.com/sahanh/foundry/commit/deefd2048701d1c942a0d2d30533ed0931da4280)

New skill, **implement-prd** ([skills/implement-prd/](./skills/implement/SKILL.md)): it builds a PRD
published by `elaborate-feature` as a stack of pull requests — the plan PR, then one PR per slice built
by a subagent with `tdd`, each reviewed for conformance (`review.md`, tests excepted) and correctness;
then `test-review` once over the whole stack. It gathers judgment calls and strategy changes on the plan
PR and stops at a ready stack. [setup/agent-skills.md → The pipeline](./setup/agent-skills.md#the-pipeline)
now names the two entry skills and their order.

Affects adopting repos: install the skill and fill in its parameters (local gates, required CI checks,
correctness review, worktree setup, UI evidence). Read
[setup/agent-skills.md → The pipeline](./setup/agent-skills.md#the-pipeline).

## 2026-10-29 — New elaborate-feature skill: from an idea to a published PRD

**Commit:** [`424ff5c`](https://github.com/sahanh/foundry/commit/424ff5c49c720baacaad49f8825bc5079aaaf6ab)

New user-only skill, **elaborate-feature** ([skills/elaborate-feature/](./skills/elaborate-feature/SKILL.md)):
it takes the user's goal in their words, grills the idea, drafts the PRD, writes its test strategy with
`test-plan`, cuts tracer-bullet slices that each own strategy rows, and publishes the PRD with the docs
committed on the worktree branch. It runs two **companion skills** from Matt Pocock's repo, `grilling`
and `domain-modeling`, which [setup/agent-skills.md → Companion skills](./setup/agent-skills.md#companion-skills)
now covers, pinned at `59db609`; it replaces upstream's `to-spec` and `to-tickets` in this flow. The same
doc now lets a skill's frontmatter make it user-only (`disable-model-invocation: true`), kept on install.

Affects adopting repos: install the skill and its companions, and keep user-only frontmatter on every
installed skill. Read [setup/agent-skills.md](./setup/agent-skills.md#you-are-installing-them) step 3
and [→ Companion skills](./setup/agent-skills.md#companion-skills).

## 2026-10-29 — New tdd skill: build a test strategy test-first

**Commit:** [`a446eed`](https://github.com/sahanh/foundry/commit/a446eedb84bb73ee04cf4c35300ac56916b72ca4)

New skill, **tdd** ([skills/tdd/](./skills/tdd/SKILL.md)), adapted from Matt Pocock's skill of the same
name: it builds a PRD's test strategy, or one slice of it, one row at a time, and reports guard evidence,
strategy changes and judgment calls. [core/start-here.md](./packages/core/start-here.md) points to it
after the test strategy.

Affects adopting repos: install it ([setup/agent-skills.md](./setup/agent-skills.md)). A repo that
installed Matt Pocock's `tdd` directly replaces that copy with this one; its `mocking.md` and
`tests.md` go with it, since they contradict
[testing.md → The Two Levels](./packages/core/testing.md#the-two-levels).

## 2026-10-29 — Guard evidence is a pair of runs, in either order

**Commit:** [`9e6260c`](https://github.com/sahanh/foundry/commit/9e6260ca364c514daf96de8b923700760036412e)

[testing.md → What a Test Must Prove](./packages/core/testing.md#what-a-test-must-prove) states a guard
row's evidence as what it must show, not how to produce it: two runs of the test that differ only in
the protection, passing with it and failing at the risk's assertion without it, in either order. The
old wording, *the implementer breaks the guard, runs its test, watches it fail, and reverts* with *the
test passed first*, is gone; a test written red before its guard exists now qualifies. The box in
[core/end-here.md → Testing](./packages/core/end-here.md) and the **test-review** skill's Stage 4 and
report template follow.

Affects adopting repos' PR templates or instructions that describe the break-it record, and their
installed `test-review` skill. A record made under the old wording still qualifies. Read
[testing.md → What a Test Must Prove](./packages/core/testing.md#what-a-test-must-prove).

## 2026-10-25 — Strength checks may run on a schedule

**Commit:** [`29e808d`](https://github.com/sahanh/foundry/commit/29e808dc9d0a44c25123f1b816eb8553c631ee96)

[ci-verification.md](./setup/ci-verification.md) names **strength checks** (mutation testing, automated
re-proofs of other checks), which may run on a schedule instead of on every pull request, under
conditions it sets. Every other check still runs on every pull request. The manifest's rule rows gain a
**cadence**. [review.md → Step 0](./review.md#step-0--what-ci-already-verifies) and the
**test-review** skill treat a scheduled check as not run on the change.

Affects adopting repos that run mutation testing or automated gate re-proofs, and their installed
`test-review` skill. Read
[ci-verification.md → Scheduled strength checks](./setup/ci-verification.md#scheduled-strength-checks)
and [→ The manifest](./setup/ci-verification.md#the-manifest--foundry-cimd).

## 2026-10-25 — A second copy of a component is the extraction signal, in the same feature too

**Commit:** [`e562d9a`](https://github.com/sahanh/foundry/commit/e562d9a908db3f95be6e1010c5862cbe10fff9c1)

[component-placement.md](./apps/web/component-placement.md) → *Promotion to shared — on the second
signal, with confirmation* is renamed *Extraction — on the second copy, with confirmation*. The signal is
now a second copy of a component shape in the same feature or another, found by searching before writing
one; a same-feature copy extracts into the feature's folder. [review.md](./review.md) → *Step 1* searches
outside the diff for a new frontend component's existing copy, and
[apps/web/end-here.md](./apps/web/end-here.md) gains the matching box.

Affects frontend components added before this change, and reviews of them. Read
[component-placement.md → Extraction](./apps/web/component-placement.md#extraction--on-the-second-copy-with-confirmation).

## 2026-10-25 — React is imported by name

**Commit:** [`b18c510`](https://github.com/sahanh/foundry/commit/b18c510eeb911f576e037abfc70735dded7198fa)

New rule: React's hooks, helpers and types are imported by name, never through `import * as React` or
the default export; generated UI primitives (shadcn/ui's `components/ui/`) are exempt. New CI rule
**`TS-07`** and a *Generated UI primitives folder* parameter, which **`WEB-03`** no longer counts as a
feature folder.

Affects any React code written before this change, and `WEB-03` checks built before it. Read
[typescript-coding-standards.md → Named React Imports](./common/typescript-coding-standards.md#named-react-imports)
and [ci-verification.md → TypeScript](./setup/ci-verification.md#typescript) (`TS-07`).

## 2026-10-25 — Setup installs every skill; reconciling keeps them current

**Commit:** [`d69ef2e`](https://github.com/sahanh/foundry/commit/d69ef2ec503d0b846bb39e3fada2d91593e36c5e)

[setup/agent-skills.md](./setup/agent-skills.md) is rewritten as instructions to the setting-up agent:
install **every** skill in `skills/` as the repo's own, in each harness's skill directory, invocable by
the user and the agent, and check it shows up. Reconciling now covers skills:
[staying-in-sync.md → Reconciling](./setup/staying-in-sync.md#reconciling) and
[reconcile-foundry-changes](./skills/reconcile-foundry-changes/SKILL.md) install new skills, re-adapt
changed ones and delete removed ones, and its `brief.sh` gains a *Skills* section listing them.

Affects every adopting repo: install the skills it lacks per
[agent-skills.md → You are installing them](./setup/agent-skills.md#you-are-installing-them), and
re-install `reconcile-foundry-changes`.

## 2026-10-25 — Routine maintenance and Dependabot; `routine` in `foundry.lock`

**Commit:** [`e21200e`](https://github.com/sahanh/foundry/commit/e21200ea0f61c8fabfb5c8ea8a97625f01b7381c)

New **[setup/routine-maintenance.md](./setup/routine-maintenance.md)**: every adopting repo on GitHub
runs Dependabot (alerts, security updates, and weekly version updates per ecosystem), and a developer
runs a recurring maintenance pass with the new
**[skills/routine-maintenance](./skills/routine-maintenance/SKILL.md)**. The pass merges Dependabot's
PRs once they're proven on the local stack with a browser smoke test, or probes the production
dependencies when there are none. It also checks Node, pnpm and TypeScript, the deployed server and
its images, and whether deploys and backups are succeeding. `foundry.lock` gains a `routine` date,
the last time a run finished ([staying-in-sync.md → The pin](./setup/staying-in-sync.md#the-pin--foundrylock)).

Affects every adopting repo: add `.github/dependabot.yml` and turn on Dependabot's alerts and security
updates ([routine-maintenance.md → Dependabot](./setup/routine-maintenance.md#dependabot)), then
install `routine-maintenance` ([setup/agent-skills.md](./setup/agent-skills.md)), filling in its
parameters. `routine` is written by the first finished run.

## 2026-10-25 — The test-plan skill writes a PRD's test strategy

**Commit:** [`c0379a0`](https://github.com/sahanh/foundry/commit/c0379a0f93008b3bab548c8bea8f05728289097c)

New **[skills/test-plan](./skills/test-plan/SKILL.md)**, with a
[strategy template](./skills/test-plan/strategy-template.md): writes a PRD's test strategy with the user,
before the code, in [testing.md](./packages/core/testing.md#the-test-strategy)'s format.
[testing.md](./packages/core/testing.md#the-test-strategy) and
[core/start-here.md](./packages/core/start-here.md) → *Designing a Feature* link to it. No rule changed.

Affects adopting repos that install Foundry's skills: install `test-plan` per
[setup/agent-skills.md](./setup/agent-skills.md).

## 2026-10-25 — Tests reviewed against the test strategy; break-it evidence; installing skills

**Commit:** [`2487bc0`](https://github.com/sahanh/foundry/commit/2487bc0d2defa957256bdcfea983c8d49946b9de)

New **[skills/test-review](./skills/test-review/SKILL.md)**: the read-only procedure for verifying a
change's tests against its PRD's test strategy, with a fixed [report](./skills/test-review/report-template.md).
[review.md](./review.md) routes the tests node to it, and a map with a tests node must report that
table. [testing.md → What a Test Must Prove](./packages/core/testing.md#what-a-test-must-prove) adds
**break-it evidence** for guard rows, recorded in the PR, and says a mutation score is no substitute;
[core/end-here.md](./packages/core/end-here.md) → *Testing* gains the matching box. New
**[setup/agent-skills.md](./setup/agent-skills.md)**: `skills/` holds templates an adopting repo
copies and adapts.

Affects PRs that touch a lock, conditional write, uniqueness guard, rollback or refusal; every review
with a tests node; and every adopting repo, which must install `test-review` for the tests node to
run. Read [testing.md → What a Test Must Prove](./packages/core/testing.md#what-a-test-must-prove),
[skills/test-review](./skills/test-review/SKILL.md) and [setup/agent-skills.md](./setup/agent-skills.md).

## 2026-10-25 — Adopting repos pin Foundry; entries carry their commit

**Commit:** [`ff0f215`](https://github.com/sahanh/foundry/commit/ff0f215c17a586ff80a0cb637ddf1cb131ef9907)

New [setup/staying-in-sync.md](./setup/staying-in-sync.md): an adopting repo commits `foundry.lock` at
its root, naming the Foundry commit its code was last reconciled to, and moves it only by reconciling
the entries after it — by hand or with the new
[reconcile-foundry-changes](./skills/reconcile-foundry-changes/SKILL.md) skill, which adopters copy and
adapt. Each entry now carries a **Commit:** line, the commit on `main` that made it; CI writes it after
merge, and the ten entries before this one are backfilled. The `foundry-ci.md` manifest's
**Synced to** line is removed: the pin replaces it.

Affects every adopting repo: create `foundry.lock` per
[staying-in-sync.md → The pin](./setup/staying-in-sync.md#the-pin--foundrylock) — a repo with a
*Synced to* line starts from that entry's commit — and drop *Synced to* from `foundry-ci.md`
([ci-verification.md → The manifest](./setup/ci-verification.md#the-manifest--foundry-cimd)).

## 2026-10-25 — Testing driven by a test strategy, not by construct

**Commit:** [`729ac01`](https://github.com/sahanh/foundry/commit/729ac01de711ce18544b59a7c436df7121adf072)

[testing.md](./packages/core/testing.md) now starts from a **test strategy**, written per PRD before
the code. Removed: the **What to Test Where** table, which fixed the level by construct ("guards get
unit tests; services and orchestrations get integration tests"); the **in-memory database** option;
the **spy queue**; and the integration-flavour rows for clock thresholds and polarity. **`TEST-01`**
in [setup/ci-verification.md](./setup/ci-verification.md) no longer requires a level.
[branching-logic.md](./packages/core/branching-logic.md) gains one exception to refactor-first
extraction. [review.md](./review.md) gains a *pure helper* node and maps changed logic to tests;
[core/end-here.md](./packages/core/end-here.md) → *Testing* is replaced.

Affects tests written before this change, and work started without a test strategy. Read
[testing.md → The Test Strategy](./packages/core/testing.md#the-test-strategy),
[→ What a Test Must Prove](./packages/core/testing.md#what-a-test-must-prove) and
[→ The Test AppContext](./packages/core/testing.md#the-test-appcontext); update the `TEST-01` check
and move `foundry-ci.md`'s *Synced to* forward.

## 2026-10-17 — Tooling baseline and no floating promises

**Commit:** [`aaf29f4`](https://github.com/sahanh/foundry/commit/aaf29f4249da7f351bd9cf513c43caded95afc97)

[typescript-coding-standards.md](./common/typescript-coding-standards.md) gains two sections, for
frontend and backend alike: **No Floating Promises** (every promise awaited, returned, or handled) and
**Tooling Baseline** (`strict` on and type-checking clean; the language's recommended lint presets plus
each framework's — for React, `react-hooks` and `jsx-a11y`; one formatter; a preset rule switched off
only with a recorded reason). [setup/ci-verification.md](./setup/ci-verification.md) gains a
*Baseline* section, **`BASE-01`–`BASE-05`**, and two parameters (*Formatter*, *Lint presets switched
off*). The `end-here` footers that still pointed at the removed TypeScript sweep now point to CI.

Affects every package and app: code with floating promises, non-strict configs, unformatted files, or
lint-preset violations. Read [typescript-coding-standards.md → No Floating Promises](./common/typescript-coding-standards.md#no-floating-promises)
and [→ Tooling Baseline](./common/typescript-coding-standards.md#tooling-baseline); add the
`BASE-*` checks and record them in `foundry-ci.md`.

## 2026-10-17 — Two frontend CI rules: scrollbar styling and shared-component imports

**Commit:** [`cc4a3a5`](https://github.com/sahanh/foundry/commit/cc4a3a51eca6eb73b58fa039390fdf408ea7eebb)

[setup/ci-verification.md](./setup/ci-verification.md) → *Web apps* gains **`WEB-02`** (scrollbar
styling only in the shared styling files) and **`WEB-03`** (a shared component never imports a feature's
components). The *Design-token sources* parameter is renamed **Shared styling files** (it now also
scopes `WEB-02`), and a *Shared component folder* parameter is added. The matching slices leave
[apps/web/end-here.md](./apps/web/end-here.md) → *Visual system* / *Component placement & promotion*.

Affects web apps: add both checks and record them in `foundry-ci.md`, and rename the parameter there.
Read [visual-system.md → Enforcement](./apps/web/visual-system.md#enforcement) and
[component-placement.md → Ownership after promotion](./apps/web/component-placement.md#ownership-after-promotion).

## 2026-10-17 — Deterministic checks move to CI; `setup/` added

**Commit:** [`a746f0b`](https://github.com/sahanh/foundry/commit/a746f0b0f8005eabe1ff626698a964379a519e4b)

New **[setup/](./setup/start-here.md)** section for one-time adoption work, starting with
**[setup/ci-verification.md](./setup/ci-verification.md)**: a catalogue of every rule a tool can
decide, each with a rule ID and the failure its check must catch, for an adopting repo to build into
its CI and record in a `foundry-ci.md` manifest at its root. The review protocol no longer spends a
reviewer on those rules: [review.md](./review.md) gains **Step 0** (read the manifest; CI-enforced rules
are skipped, the rest are checked against the catalogue as a fallback), the Step 4 **TypeScript sweep
is removed** (now `TS-01`–`TS-06`), and the deterministic boxes and half-boxes are removed from
[core/end-here.md](./packages/core/end-here.md), [system/end-here.md](./packages/core/system/end-here.md),
[apps/end-here.md](./apps/end-here.md), [apps/web/end-here.md](./apps/web/end-here.md) and
[packages/end-here.md](./packages/end-here.md). Adapter checklists gain a box: an adapter's
deterministic invariants get a CI check ([ci-verification.md → Extending](./setup/ci-verification.md#extending)).
Apart from that box, no rule changed meaning — only where each is verified.

Affects every adopting repo: until its CI enforces a rule, review checks that rule by hand. Read
[setup/start-here.md](./setup/start-here.md) and [setup/ci-verification.md](./setup/ci-verification.md)
to set up the checks; all rule IDs are new.

## 2026-10-17 — File suffixes, schema file names, and cross-feature imports clarified

**Commit:** [`a746f0b`](https://github.com/sahanh/foundry/commit/a746f0b0f8005eabe1ff626698a964379a519e4b)

Three places where the guidelines disagreed with each other are settled, so a CI check can encode them:

- **Suffixes.** The `.exception.ts` suffix is gone from
  [core/start-here.md → File Naming](./packages/core/start-here.md#file-naming); the exception file is
  the fixed name `exceptions.ts`, as the feature tree always showed. `.schema.ts` joins the suffix list.
- **Schema file example.** [implementation-schemas.md → Schema Organization](./packages/core/implementation-schemas.md#schema-organization)
  showed `orders/orderNotes.schema.ts` (a plural folder, a camelCase name); it now shows
  `order/schemas/order-note.schema.ts`.
- **Cross-feature imports.** [working-with-databases.md](./packages/core/working-with-databases.md#cross-feature-data-access)
  said the *only* legal cross-feature import was another feature's `shared/validation.ts`, while
  orchestrations reach other features' services. [implementation-validation.md → Cross-Feature Guards](./packages/core/implementation-validation.md#cross-feature-guards)
  now owns the full list: services and guards import only the owner's guard; the data path adds an
  orchestration importing the owner's services and schemas, and schema files deriving from the
  owner's schemas. [database.md → Table Definitions](./packages/core/system/database.md#table-definitions)
  now says services import the table definitions directly; only the client goes through `ctx`.

Affects code with `*.exception.ts` files, non-kebab or non-`.schema.ts` schema files, or cross-feature
imports beyond these shapes. Read the sections above; the matching CI rules are `NAME-01`, `NAME-02`,
`IMP-03` and `IMP-04` in [setup/ci-verification.md](./setup/ci-verification.md).

## 2026-07-18 — Method naming across the service → orchestration → facade seam

**Commit:** [`6a4965f`](https://github.com/sahanh/foundry/commit/6a4965f9df31966865df528abbb1a3b50c01072d)

Prompted by a consuming-project case study (an "Inbox" read model whose service and orchestration
both exposed `listWaitingTasks` with different return shapes),
[orchestration.md](./packages/core/orchestration.md) § *Naming* now owns method naming across the
wrapping seam: **the name changes where the shape changes** — an orchestration that hydrates or
assembles a read from a service it consumes must not reuse that method's name, while a pure
pass-through (a facade forwarding an orchestration's result unchanged) keeps it. A companion consumer-naming rule
landed in [service-first-architecture.md](./packages/core/service-first-architecture.md)
§ *Consumer-First Design*: method names drop words their receiver already implies (and keep
discriminators it doesn't). Gate-enforced
via new/updated boxes in [core/end-here.md](./packages/core/end-here.md) → *Orchestrations* /
*Services*.

Affects code where an orchestration or facade method shares its name with a wrapped service method
returning a different shape, or a method name restates its subject's invariant. Read
[orchestration.md](./packages/core/orchestration.md) § *Naming* and
[service-first-architecture.md](./packages/core/service-first-architecture.md)
§ *Consumer-First Design*, and verify against [core/end-here.md](./packages/core/end-here.md) →
*Orchestrations* / *Services*.

## 2026-07-11 — Schema placement scoped to boundary/contract types and gate-enforced

**Commit:** [`df30c01`](https://github.com/sahanh/foundry/commit/df30c01863e93e97162b0e20c3f3d72ec7787378)

The inline-schema rule in [implementation-schemas.md](./packages/core/implementation-schemas.md)
§ *Schema Organization* was broadened beyond entity schemas and beyond the old wording *"never inline
in service methods"*: it now governs **every boundary/contract type** — persisted-entity shapes and
their projections, and any type exported across a module boundary (**presentation/read-side types
included**) — which must live in the feature's `*.schema.ts` file(s), never inline in a service,
orchestration, mapper, or any non-schema module. *Local implementation-only* types (options bags,
intermediates) may stay inline. Added: presentation shapes are **derived** from the base
(`.pick()/.partial()/.omit()`), schema files **graduate with the feature** like services do, and one
exception — an exported DTO sealed by a module-private brand symbol stays with its only constructor.
The rule is now gate-enforced: a placement box in [core/end-here.md](./packages/core/end-here.md) →
*Schemas* and a cross-cutting lens clause in [review.md](./review.md) Step 4.

Affects code that defines a presentation/read-side or other boundary type inline, or hand-writes a
type that overlaps an existing schema. Read
[implementation-schemas.md](./packages/core/implementation-schemas.md) § *Schema Organization* +
§ *Avoiding Duplication*, and verify against [core/end-here.md](./packages/core/end-here.md) →
*Schemas*.

## 2026-07-11 — "Engineering Playbook" renamed to Foundry

**Commit:** [`6a0333f`](https://github.com/sahanh/foundry/commit/6a0333f49601594b10a1abda5ddc38eca3f928aa)

The standard is now called **Foundry**. Every doc that used "the playbook" or "Engineering Playbook"
as the project's name now says Foundry (or, where it reads better, "the standard"); the descriptor
*engineering standard* is unchanged, and no rule changed meaning.

Anyone with a link or reference to "Engineering Playbook" / "the playbook" as the product name should
read it as Foundry. Entries below this one predate the rename and keep the former name as a dated
record — start with [README.md](./README.md).

## 2026-07-11 — Public website added under `site/`; `viewer/` renamed, `landing-copy.md` moved

**Commit:** [`f22a975`](https://github.com/sahanh/foundry/commit/f22a975e8b3314c14e19931bbda3927150b8efb6)

The local Markdown viewer at `viewer/` is now **`site/`**, which additionally holds the public
landing page and a static build of the docs viewer (published to GitHub Pages). `landing-copy.md`
moved from the repo root to `site/landing-copy.md`.

No rule changed and nothing in the standard is affected — `site/` is website content, off the agent
reading path. Anyone looking for `viewer/` or root `landing-copy.md` finds them under `site/`; see
[AGENTS.md](./AGENTS.md) → *The `site/` directory is not part of the standard*.

## 2026-07-09 — named-decisions.md renamed to branching-logic.md

**Commit:** [`ffb5318`](https://github.com/sahanh/foundry/commit/ffb531892370c76bc4a4fbec8e391414e952554a)

`packages/core/named-decisions.md` is now
[branching-logic.md](./packages/core/branching-logic.md) — with the Strategy pattern merged in, the
doc covers the whole branching ladder (inline → named decision → Strategy), not just the first tier.
No rule changed; section headings are unchanged. Anyone linking to `named-decisions.md` (or the
older `implementation-strategy-pattern.md`) should repoint to the new file.

## 2026-07-09 — Handled failures must be logged; reads are authorized too

**Commit:** [`5d71c63`](https://github.com/sahanh/foundry/commit/5d71c63f4961e3e737430008453daa5750d30711)

Two rules added after an A/B build evaluation surfaced silent gaps: a **handled failure (`4xx`) is
logged at `warn` with its failure code** — never silent — and **authorization covers reads**
(`get`/`list` scoped to `ctx.actor`; world-readability only as an explicit recorded decision).

Affects apps whose shared error handler logs only `500`s, and features whose queries skip the guard
discipline. Re-check against [logging.md](./packages/core/system/logging.md) → *At the entry point*
and [identity-and-access.md](./packages/core/identity-and-access.md) → *Authorization is a domain
concern*, plus the new boxes in [apps/end-here.md](./apps/end-here.md) → *Response & error mapping*
and [packages/core/end-here.md](./packages/core/end-here.md) → *Identity & Access*.

## 2026-07-08 — Playbook compressed; state-once ownership convention; implementation-strategy-pattern.md merged into named-decisions.md

Every guideline was rewritten for token efficiency under a new **state-once** convention: each rule
now has exactly **one owning doc**, and every other doc carries at most a one-line echo plus a link.
`packages/core/implementation-strategy-pattern.md` was **removed** — its content lives in
[named-decisions.md](./packages/core/branching-logic.md) as the *Strategy* escalation tier — and
standalone anti-pattern sections were folded into the rules they negate.

No rule changed meaning, so existing code is unaffected. Anyone linking to
`implementation-strategy-pattern.md` should repoint to
[named-decisions.md](./packages/core/branching-logic.md).

## 2026-07-08 — app-context.md: *The Actor* and *The Tenant scope* merged into *Actor & Tenant*

The two parallel `app-context.md` sections **The Actor** and **The Tenant scope** were merged into
one section, **Actor & Tenant — `ctx.actor` / `ctx.tenant`**, which owns the shared ctx-field
mechanics for both; actor *meaning* and tenant *meaning* stay in their owning docs. No rule changed
— only the headings.

Affects any doc, link, or note that points at the old headings. Repoint to
[app-context.md](./packages/core/app-context.md) → *Actor & Tenant*; semantics remain at
[identity-and-access.md](./packages/core/identity-and-access.md) → *The Actor* and
[multi-tenancy.md](./packages/core/multi-tenancy.md).

## 2026-07-08 — implementation-strategy-pattern.md merged into named-decisions.md

`packages/core/implementation-strategy-pattern.md` was **deleted**; the Strategy pattern now lives
as an escalation tier of [named-decisions.md](./packages/core/branching-logic.md) → *Escalation:
When The Decision Grows Into A Family — Extract A Strategy*. The rule itself is unchanged — only
its home moved; links and review routing now point at named-decisions.md.

Affects any code or doc that references the old file, and anyone applying Strategy guidance from
memory of the standalone doc. Re-check against
[named-decisions.md](./packages/core/branching-logic.md) — the *Escalation* section plus the shared
*Apply As A Refactor*, *When To Apply*, and *When Not To* sections, which now govern both tiers.

## 2026-07-08 — AppContext carries established facts; provisioning is the identity flow's use case

`AppContext` gains its contract: **every field on the context is an established fact, never a
pending claim** — new section [app-context.md](./packages/core/app-context.md) → *The Context Is a
Statement of Fact* — with two corollaries: **no operation establishes its own preconditions** (a
missing precondition is rejected at the edge or thrown in the domain, never repaired inline), and
**contexts are assembled at the edge** — the context factory is invoked only in driving adapters
and test setup, never inside `packages/core` (a consumer-facing facade included), and assembly is
**read-only**. The invariant's first application is a new
[identity-and-access.md](./packages/core/identity-and-access.md) → *Identity lifecycle* section:
the domain assumes a `user` actor exists; sign-up/provisioning is a dedicated, system-actor-gated
use case with an explicit edge trigger (IdP webhook or onboarding endpoint), never a step another
flow composes.

Affects code that JIT-provisions users or workspaces during context assembly, any core-resident
context-factory caller (e.g. facade static factories assembling bootstrap contexts), any binding
path that writes, and any handler or domain operation that manufactures a missing precondition (a
user, a tenant, a referenced entity) inline. Re-check against
[app-context.md](./packages/core/app-context.md) → *The Context Is a Statement of Fact* / *Wiring*;
[identity-and-access.md](./packages/core/identity-and-access.md) → *Identity lifecycle*; the new
boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → *AppContext* / *Identity & Access* and
[apps/end-here.md](./apps/end-here.md) → *Authentication & actor*; and the
[review protocol](./review.md) lens + the app transport / bootstrap routing row.

---

## 2026-07-08 — Multi-tenancy: tenant isolation moves from Postgres RLS to an application-level scoped seam

Tenant isolation is now enforced **purely at the application level**, with no database dependency. The
earlier two-layer model — an app-level scoped `ctx.system.db` **plus** a Postgres **Row-Level Security**
policy keyed on a `SET LOCAL app.current_tenant` session variable — drops its second layer: **RLS,
`SET LOCAL`, and `app.current_tenant` are removed**. The scoped `ctx.system.db` is now the sole
isolation guarantee — and it is a guarantee, not a convention, because the raw db client is never
reachable from feature code: the only handle a service can touch is the already-scoped one, and the only
unscoped path is the explicit, grep-able elevated context.

Affects any **multi-tenant** application built against the earlier model — specifically any table with a
Postgres RLS policy, or any code relying on the `app.current_tenant` session variable, for tenant
isolation. Single-tenant apps are unaffected. Re-check against:
[multi-tenancy.md](./packages/core/multi-tenancy.md) → *Isolation is enforced at the database seam* /
*The one unscoped path*; [system/database.md](./packages/core/system/database.md) → *Tenant column*;
[app-context.md](./packages/core/app-context.md) → *Transaction Boundary*;
[working-with-databases.md](./packages/core/working-with-databases.md) → *Tenant scope*;
[code-placement.md](./code-placement.md) → *Worked Examples* (the multi-tenancy entry); the
[review protocol](./review.md) routing table + lens; and
[system/end-here.md](./packages/core/system/end-here.md) → *Multi-tenancy*.

---

## 2026-07-08 — Error-handling strategy + the controller's transport-mapping job (resolves #3)

The playbook gains a cross-cutting **error-handling spine** — new root doc
**[error-handling.md](./error-handling.md)** — and its edge application, new
**[apps/transport-mapping.md](./apps/transport-mapping.md)** — closing [concerns.md](./concerns.md) #3
(the controller's exception→response job was unspecified). The strategy: "error" is **two anticipated
classes** — an input-validation failure (the Zod schema at the boundary, field-keyed) and a domain-rule
failure (the per-feature domain exception, one message) — that **both normalize to one response shape at
the edge** and are **both a handled `4xx`, never a `500`**; a `500` is reserved for the *unanticipated*
fault the framework owns. `transport-mapping.md` makes this concrete for HTTP: one shared error handler,
the response envelope (an array of optionally field-scoped messages, a stable `code`, the `traceId`, only
a safe subset of context), the uniform **`422`** for domain exceptions today, and the
pagination/filtering/sorting contract for collection endpoints (the controller binds params and serializes
`Page<T>`; the service owns the legal filter/sort set). No shared `DomainException` base class and no
per-status failure `kind` were introduced — finer statuses (`403`/`404`/`409`) are a **documented growth
path**.

Affects any server-side transport code that handles errors ad hoc — a per-route `try/catch`, a bespoke or
divergent error body, or a handler that lets a domain/validation failure bubble into a `500` — and any
collection endpoint with a hand-rolled pagination/filter response. Also affects code written against
[identity-and-access.md](./packages/core/identity-and-access.md)'s earlier "authorization failure → `403`"
wording: an authorization denial is a handled domain failure presented as **`422` today** (the `403` is
now the growth path). Re-check against [error-handling.md](./error-handling.md);
[apps/transport-mapping.md](./apps/transport-mapping.md);
[apps/start-here.md](./apps/start-here.md) and [apps/end-here.md](./apps/end-here.md) → *Response & error
mapping* / *Collection endpoints*;
[implementation-validation.md](./packages/core/implementation-validation.md) → *Exception Strategy — `exceptions.ts`*;
[identity-and-access.md](./packages/core/identity-and-access.md) → *Authorization is a domain concern*;
[atomicity.md](./packages/core/atomicity.md) → *The Boundary Lives on `ctx`*; and the
[review protocol](./review.md) lens + the app-handler routing row.

---

## 2026-07-08 — Frontend guidelines: the client UI as a driving adapter, in its own `apps/web/` subtree

The playbook now covers the **frontend**. A client UI is a **driving adapter** like any inbound
entry point — it drives the system (through the API, or `@app/core` from server code) and holds **no
business rules** at the macro scale — so its home is `apps/`. What it adds is a rich *internal*
structure the thin-transport apps never had, documented in a new **[apps/web/](./apps/web/start-here.md)**
subtree: **[component-placement.md](./apps/web/component-placement.md)** (start local, promote to
`shared/` only on a second real signal, with confirmation — the frontend reading of *climb on a real
signal*), **[app-shell.md](./apps/web/app-shell.md)** (app-level layout lives once, in the shared
shell/container), **[visual-system.md](./apps/web/visual-system.md)** (shared treatments + semantic
tokens over per-feature styles), and **[ui-scope.md](./apps/web/ui-scope.md)** (build the requested
surface; propose adjacent surfaces separately). `apps/` is now framed as **two families** of driving
app — server-side transport and the client UI — and the web subtree is a **skippable branch**: work
unrelated to the UI never needs to open it.

In `code-placement.md` the topology's example HTTP-controller app is **renamed `web/` → `api/`** so
`web/` can name the frontend; if you referenced `apps/web/` as "the HTTP controllers", that example is
now `apps/api/`. Affects any frontend code written before this change — check it against the new
subtree: [apps/web/start-here.md](./apps/web/start-here.md) and
[apps/web/end-here.md](./apps/web/end-here.md);
[code-placement.md](./code-placement.md) → *The Topology* / *Worked Examples* (the frontend entry);
[apps/start-here.md](./apps/start-here.md) (two families) and [apps/end-here.md](./apps/end-here.md)
(scoped to server-side transport); and the [review protocol](./review.md) taxonomy node **L2c** +
routing rows + lens (business logic never lives *only* in the UI). Known gaps in this first pass —
data fetching, client state, forms, accessibility, and frontend testing — are tracked in
[concerns.md](./concerns.md) #17 (this milestone itself closes #16).

---

## 2026-07-08 — Multi-tenancy: tenant-as-scope on AppContext, isolation enforced at the db seam

Tenant isolation is now a structural convention (resolves [concerns.md](./concerns.md) #13).
The split: **tenant-as-scope** (which isolation boundary an operation runs within) is **infrastructure**,
not domain — the domain is identical for every tenant. It rides top-level on `AppContext` as **`ctx.tenant`**
beside `ctx.actor`, resolved at the edge, and enforced structurally at the single db seam: an **app-level
scoped `ctx.system.db`** (derived the same way as the transaction handle, not a repository) **plus Postgres
RLS** keyed on a per-transaction session variable — so a service never writes `where tenantId` and cannot
forge it. Scoping is the **default**, not an opt-in method: the scoped `ctx.system.db` *is* the handle a
service receives, and the only unscoped path is an explicit, auditable opt-*out* (an elevated context) — a
`tenanted()`-style helper, if any, is sugar over an already-scoped handle, never the safety mechanism.
**Tenant-as-entity** (org / plan / members) stays an ordinary domain feature. Tenant-owned tables
carry a `NOT NULL` tenant-id FK — one **uniform** column name across every such table (`tenantId` by
default; the exact name is a project choice, but it must be the same on all of them so the generic seam
and RLS key on one predictable column) — plus an RLS policy (the tenant table and global reference
tables exempt).
**Single-tenant is the zero-ceremony default**; multi-tenancy is a whole-app, up-front opt-in. Like the actor
`type` set, this is a **framework, not a fixed shape** — the `ctx.tenant` shape and which tables are
tenant-owned are project decisions confirmed with the user. New concern doc
**[packages/core/multi-tenancy.md](./packages/core/multi-tenancy.md)**.

Affects any multi-tenant application, and in particular code that hand-writes a `where tenantId` filter, sets
`tenantId` in a service, constructs an ad-hoc unscoped db client for cross-tenant reads, or has a tenant-owned
table without a `tenantId` column + RLS. Single-tenant apps are unaffected. Re-check against
[multi-tenancy.md](./packages/core/multi-tenancy.md);
[app-context.md](./packages/core/app-context.md) → *Actor & Tenant* / *Transaction Boundary*;
[working-with-databases.md](./packages/core/working-with-databases.md) → *Tenant scope*;
[system/database.md](./packages/core/system/database.md) → *Tenant column*;
[code-placement.md](./code-placement.md) → *Worked Examples* (the multi-tenancy entry);
[apps/end-here.md](./apps/end-here.md) → *Tenant scope*,
[packages/core/end-here.md](./packages/core/end-here.md) → *Database* / *AppContext*,
[system/end-here.md](./packages/core/system/end-here.md) → *Multi-tenancy*; and the
[review protocol](./review.md) routing table + lens.

---

## 2026-07-08 — Identity & access: the actor on AppContext, authN at the edge, authZ in the domain

`AppContext` gains a top-level **`actor`** field — a tagged union discriminated on **`type`**, modeled
minimally now (`user | anonymous`) and designed to grow additively (`service` / `system` on a real
signal). The set of actor `type`s is **project-specific**: each system decides its own consumers.
**Authentication** is an edge concern: the app verifies the credential and resolves a vendor-neutral
actor onto `ctx.actor` before the domain runs; the auth-provider SDK stays out of the core.
**Authorization** is a domain concern, enforced as `shared/validation.ts` guards reading `ctx.actor`
and throwing the feature exception — not an edge-only check, because the domain is multi-consumer. New
concern doc **[packages/core/identity-and-access.md](./packages/core/identity-and-access.md)**, which
also frames how to use it when **building** (confirm the actor types with the user) versus **reviewing**
(ground in the project's real model before judging a diff); extended permissions follow the existing
promotion ladder (inline check → named decision → capability-named policy adapter). This closes
[concerns.md](./concerns.md) #4.

Affects any code that put authorization in a controller or middleware, threaded a `userId` through
service method parameters, or assumed `AppContext` carried no caller identity. Re-check against
[identity-and-access.md](./packages/core/identity-and-access.md) (esp. *Two ways you reach this guide* /
*Reviewing an auth change*);
[app-context.md](./packages/core/app-context.md) → *Actor & Tenant* / *Constructor Injection*;
[implementation-validation.md](./packages/core/implementation-validation.md) → *Shared Validation Helpers* /
*Cross-Feature Guards*; [apps/end-here.md](./apps/end-here.md) → *Authentication & actor*;
[packages/core/end-here.md](./packages/core/end-here.md) → *Identity & Access* / *AppContext*; and the
[review protocol](./review.md) routing table.

---

## 2026-07-07 — Persistence conventions decided: hard-delete default, enum columns as varchar + z.enum()

Two open persistence questions (concerns #11) are now decided rules. **Deletes:** hard-delete is the
default; **soft-delete** is a signal-driven exception with a prescribed shape — a nullable `deletedAt`
tombstone stamped via a new `ctx.system.helpers.softDelete(values)` and filtered once in the owning
service. **Enum columns:** an enum-valued DB column is a `varchar` guarded by the schema's `z.enum()`,
never Postgres **`pgEnum`**. (Audit trails, the third item under #11, are deliberately left out of scope
at this level.)

Affects any feature that deletes rows (a hand-rolled soft-delete flag, or a `deletedAt` filtered at call
sites) or stores an enum-valued column (especially one backed by `pgEnum`). Re-check against
[packages/core/working-with-databases.md](./packages/core/working-with-databases.md) → *Deletes*,
[packages/core/system/database.md](./packages/core/system/database.md) → *Table Definitions*,
[packages/core/app-context.md](./packages/core/app-context.md) → *Persistence timestamps*,
and the new boxes in [packages/core/end-here.md](./packages/core/end-here.md) → *Database* and
[packages/core/system/end-here.md](./packages/core/system/end-here.md) → *Database adapter*.

---

## 2026-07-07 — Orchestrations may own a cross-entity invariant

Previously an orchestration held **no** business rules of its own — every rule lived in a service or a
guard. That left a business invariant spanning **two or more owners' data** (a quota — "plan limit vs.
count of active runs across workspaces" — a cross-owner uniqueness, an aggregate, an overlap) with no
legal home, since no single owner can evaluate it. The rule is now: an orchestration holds no
*single-entity* rules, but it **may own a cross-entity invariant** — a predicate over ≥2 owners' data,
gathered via each side's service and enforced inside its transaction boundary. A new **ownership ladder**
(outcome owner → rule owner → its own feature) decides which feature owns such an orchestration. This
resolves concern #12; the "shared domain service" the docs used to gesture at is not a separate construct.

Affects anyone who avoided an orchestration for a cross-entity rule, parked such a rule ad hoc (a fattened
orchestration or an improvised policy layer), or read "orchestrations hold no rules" as absolute. Re-check
against [packages/core/orchestration.md](./packages/core/orchestration.md) → *Cross-Entity Invariants*,
[packages/core/logic-placement.md](./packages/core/logic-placement.md) → *Where the Promoted Thing Lives*
(the ownership ladder), [packages/core/implementation-validation.md](./packages/core/implementation-validation.md)
→ *Cross-Feature Guards* and the Who-Validates-What table, and the new boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → *Orchestrations* / *Placement & promotion*.

---

## 2026-07-07 — `system/` broadened to home the core's foundational primitives

`packages/core/src/system/` is no longer "driven adapters only." It is now the core's **non-domain
infrastructure**: driven adapters **and** the cross-cutting **foundational primitives** the domain is
built on — the `AppContext` type + `ctx.transaction` factory, the id helpers + prefix registry, and
pagination. These were mandated by the playbook but had no sanctioned home (former concern #6). A
dedicated substrate folder (a `kernel/`) is deferred until a real crowding signal, not created now.
Two rules keep `system/` honest: the **non-domain invariant** (no business rules, no domain vocabulary
anywhere under `system/`) and **two access modes** — adapters are injected via `ctx.system.*`; a
foundational primitive is either a runtime helper on `ctx.system.helpers.*` (e.g. `newId`, now an
injectable id-source alongside `timestamps`) or a direct import (e.g. `entityId`, `Page<T>`, the
`AppContext` type).

Affects any code that placed the `AppContext` type, id helpers, prefix registry, or pagination ad hoc
(a src root, a feature folder, a `utils`/`shared` file), or that minted ids via a direct `newId(...)`
import rather than `ctx.system.helpers.newId(...)`. Re-check against [code-placement.md](./code-placement.md)
→ *Layering* + *Folder rules*; [packages/core/system/start-here.md](./packages/core/system/start-here.md)
→ *Foundational Primitives*; [packages/core/app-context.md](./packages/core/app-context.md) → *Helpers* /
*Injectable helper vs direct import*; [packages/core/identifiers.md](./packages/core/identifiers.md).
Verify via [packages/core/system/end-here.md](./packages/core/system/end-here.md) → *Foundational
primitive* and [packages/core/end-here.md](./packages/core/end-here.md) → *Schemas*.

---

## 2026-07-06 — Constructor-injection test reframed: cohesion decides the constructor, not an entity count

The service-decomposition rule "the entity injected via constructor should be used by every method"
assumed every service owns exactly one entity — leaving `{Entity}CollectionService` (nothing single to
inject) and multi-entity services with no answer. The rule is now stated as what it always was
underneath: a **high-cohesion** check. The constructor declares the domain scope the service's methods
share; arity follows from that scope (one entity, several, or `ctx` only) and is **never prescribed**;
the two smells (unused dependency, repeated parameter) are cohesion diagnostics, not violations of an
entity count. The section formerly titled *Validation: Constructor Injection Test* is now *Validation:
The Constructor Declares the Scope*.

Affects anyone who applied the old one-entity rule — in particular any collection or multi-entity
service designed (or avoided) because of it. Re-check against
[packages/core/service-first-architecture.md](./packages/core/service-first-architecture.md) → *Service
Decomposition → Validation: The Constructor Declares the Scope*,
[packages/core/app-context.md](./packages/core/app-context.md) → *Constructor Injection*, and the
constructor box in [packages/core/end-here.md](./packages/core/end-here.md) → *Services*.

---

## 2026-07-05 — New: logic-placement.md (placement & promotion spine)

A new domain-core guideline, [packages/core/logic-placement.md](./packages/core/logic-placement.md),
now owns the decision of *which construct a piece of business logic lives in* — an inline service
method, its own service, a shared `shared/validation.ts` guard, or an orchestration — and *when to
promote it* as requirements grow. It names two independent axes (service-count altitude vs feature
boundary), the promotion ladder as one lifecycle, the **backfill obligation** (every promotion
re-points the old callers — generalizing orchestration's *stranded callers* rule to every rung), and
where a promoted guard/orchestration lives.

Affects anyone deciding where new service-layer logic goes, or refactoring logic that outgrew its
home — consult it whenever you touch the service layer. **Note:** this pass introduces the spine; the
promotion/granularity detail currently *also* in [service-first-architecture.md](./packages/core/service-first-architecture.md)
(§5), [orchestration.md](./packages/core/orchestration.md) (*When an Orchestration Exists* / *Promotion*),
and [implementation-validation.md](./packages/core/implementation-validation.md) (second-caller
extraction) will be consolidated into the spine in a follow-up — until then those sections remain the
detailed reference. Verify via [packages/core/end-here.md](./packages/core/end-here.md) → *Placement &
promotion*.

---

## 2026-07-05 — Cross-feature access: owner-exported guards for verdicts, orchestrations for data

Two playbook rules deadlocked whenever a business rule needed another feature's data: a feature must
reach another's data *through its service* (working-with-databases), yet a service *never injects or
calls another service* (service-first / orchestration). Cross-feature checks like "is this user
active?" had no legal path. There are now two named legal crossings, and the shared-guard contract
gained a cross-feature tier: a **cross-feature guard returns `void`** (asserts a verdict, throws the
owner's exception), while anything needing the other feature's **data** is an orchestration.

Affects any code where a feature reads another feature's tables, injects another feature's service,
or has a `shared/validation.ts` guard that returns an entity to a cross-feature caller (e.g.
pre-existing `requireAuthor`-style checks). Re-check against
[packages/core/implementation-validation.md](./packages/core/implementation-validation.md#cross-feature-guards)
→ *Cross-Feature Guards*, [packages/core/working-with-databases.md](./packages/core/working-with-databases.md)
→ *Cross-Feature Data Access*, [packages/core/orchestration.md](./packages/core/orchestration.md)
→ *Services Never Call Each Other* & *Promotion*, and the new boxes in
[packages/core/end-here.md](./packages/core/end-here.md) → Validation / Services / Database.

---

## 2026-07-05 — Removed the durable workflow runtime

The playbook no longer references a durable **workflow runtime** / `packages/workflow/` engine. It
was load-bearing but never specified: `atomicity.md` and `orchestration.md` delegated all
long-running/durable work to a `packages/workflow/` package (and a `ctx.task` API) that had no spec —
routing readers to a void. Those references are gone. The name **"workflow"** is no longer reserved,
and `packages/workflow/` is no longer a graduated-package example.

Long-running, multi-step execution that waits, sleeps, retries, or must survive a restart is now
stated plainly as **outside this playbook's current scope** (raise it, per the README's *When in
doubt*) rather than handed to a non-existent engine.

Affects any code or notes that routed durable work to `packages/workflow/`, referenced the "workflow
runtime," or used `ctx.task`. Re-check against [packages/core/atomicity.md](./packages/core/atomicity.md)
→ *What a Transaction Cannot Span*, and
[packages/core/orchestration.md](./packages/core/orchestration.md) → *Reliability: Synchronous
Coordination Only*.

---

## 2026-07-01 — Timestamp helpers take and return the write values

The timestamp helpers changed shape. Previously `ctx.system.helpers.timestamps()` took no argument and returned bare `{ createdAt, updatedAt }` fields that the caller spread into the write (`.values({ ...input, ...ctx.system.helpers.timestamps() })`); `updatedAt()` likewise returned `{ updatedAt }`. Now each helper **takes the write's values and returns them stamped** — `timestamps(values)` / `updatedAt(values)` — and is the sole source of those columns.

Affects any create/update that spread the bare helper result, or that hand-wrote `createdAt`/`updatedAt` alongside it. Re-check against [packages/core/app-context.md](./packages/core/app-context.md) → Persistence Timestamps and the timestamp item in [packages/core/end-here.md](./packages/core/end-here.md).

---

## 2026-07-01 — `checklist.md` decomposed into `end-here.md` seams + a root review protocol

The single root **`checklist.md`** is **gone**. Verification is now split into a per-seam `end-here.md` (the verify companion to each `start-here.md`) plus a root **[review.md](./review.md)** protocol that drives the check.

### Why

One monolithic, feature-shaped checklist made a narrow change carry the full cognitive load, and it had no verification path at all for non-feature edits (a `system/` adapter, an app, a graduated package). A flat checklist is also the wrong *mechanism*: too rigid if atomic, too vague if "read the guides." The verify pass is now an agentic **map → route → validate** protocol over a fixed taxonomy, routing each touched area to only the guideline that owns it.

### What changed

- Each seam now has a **`start-here.md`** (read before) and an **`end-here.md`** (verify after): [packages/core/end-here.md](./packages/core/end-here.md), [packages/core/system/end-here.md](./packages/core/system/end-here.md), [apps/end-here.md](./apps/end-here.md), [packages/end-here.md](./packages/end-here.md).
- **[review.md](./review.md)** is the new root verify pass — persona + map/route/validate + the enumerated taxonomy and routing table. (Name/location provisional.)
- `checklist.md`'s content was redistributed: its per-feature sections → `packages/core/end-here.md`; its system/app checks → the `system/` and `apps/` `end-here.md`; its sanity sweeps → the protocol's always-run cross-cutting sweeps.

### Who is affected

Anyone who linked to or ran **`checklist.md`**, or who relied on it as the post-implementation gate. Read [review.md](./review.md) for the new flow and the `end-here.md` for the seam you touched. The forward pass (`start-here.md`) is unchanged.

---

## 2026-07-01 — `architecture/` → `packages/core/`; new `code-placement.md`, `apps/`, `packages/`

The playbook now mirrors the code topology it prescribes. The **`architecture/`** folder is
**gone** — its docs live at `packages/core/` (and `system/` at `packages/core/system/`); the macro
sections of the old `architecture/start-here.md` moved into a new root
**[code-placement.md](./code-placement.md)**, now the first thing to read. The repo model is
`apps/` (driving adapters — HTTP, CLI, MCP) + `packages/` (`packages/core` is the domain hexagon;
driven adapters live in `core/src/system/` and graduate to `packages/<name>/` on a real signal),
with new `apps/start-here.md` and `packages/start-here.md` stubs.

Affects anyone linking to `architecture/` paths, and any project laid out against the old model —
in particular inbound entry points filed beside feature folders. Check your layout against
[code-placement.md](./code-placement.md).

---

## 2026-07-01 — Injected clock & domain-stamped timestamps

Time is now an injected system adapter, not `new Date()`. Introduced:

- **`ctx.system.clock`** — the single injectable now-source for every domain time read.
- **`ctx.system.helpers`** — `timestamps()` (create) and `updatedAt()` (update) to stamp rows from
  that clock.
- **A schema rule** — domain timestamp columns are `NOT NULL` with no DB default (no `defaultNow()`,
  no `$defaultFn`); timestamps are stamped in the domain, never by the database.

If your code predates this — it reaches for `new Date()` in services, relies on `defaultNow()` or a
column default for `createdAt`/`updatedAt`, or mocks time with a global `vi.setSystemTime` — you need
to bring it into line. We're not prescribing a migration script; the guidelines are the source of
truth. Read these sections and check your code against them:

- [packages/core/app-context.md](./packages/core/app-context.md) → **The Clock** and **Persistence Timestamps**
- [packages/core/system/database.md](./packages/core/system/database.md) → **Timestamps** (and the matching anti-pattern)
- [packages/core/end-here.md](./packages/core/end-here.md) → **Database** and **AppContext** (was `checklist.md` §7/§8)

---

## 2026-07-01 — "Workflow" renamed to "Orchestration"

The domain-layer concept formerly called a **workflow** is now an **orchestration**. The old
`architecture/workflow-orchestration.md` is now [orchestration.md](./packages/core/orchestration.md);
the `workflows/` folder and `.workflow.ts` suffix are now `orchestrations/` and `.orchestration.ts`;
"workflow" is no longer a playbook term. Conceptually, an orchestration is a **service type** —
distinguished only by being the sole domain unit that coordinates other services, and by owning no
table — triggered by **altitude** (a use case coordinates 2+ services), never by duration. This
change is vocabulary and structure in the domain layer only.

Affects any code using the old names (`workflows/`, `*.workflow.ts`, `{X}Workflow`) — and any
"workflow" created because something runs long. Re-check against
[packages/core/orchestration.md](./packages/core/orchestration.md) and the *Orchestrations* section
of [packages/core/end-here.md](./packages/core/end-here.md).
