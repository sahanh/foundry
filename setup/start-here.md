# Setup — Start Here

**Setting up a repo to follow Foundry** — the one-time work that makes the standard enforceable in
an adopting codebase, as opposed to the per-feature guidance under [code-placement.md](../code-placement.md).
Come here when asked to set up Foundry, set up CI for it, or install its skills, or when an adopting
repo has no `foundry-ci.md`, `foundry.lock` or `.github/dependabot.yml`.

- **[ci-verification.md](./ci-verification.md)** — the spec for the repo's CI: every rule a tool can
  decide (imports, naming, TypeScript, column definitions, migrations), each with the failure its check
  must catch. Build the checks for the project's stack, prove each one fails on a violation, and record
  them in the repo's `foundry-ci.md` manifest. The [review protocol](../review.md) then skips what CI
  enforces and checks only what needs judgment.
- **[staying-in-sync.md](./staying-in-sync.md)** — the pin: a committed `foundry.lock` naming the
  Foundry commit the repo's code was last reconciled to, and how to reconcile the
  [CHANGELOG](../CHANGELOG.md) entries after it as Foundry moves on.
- **[routine-maintenance.md](./routine-maintenance.md)** — Dependabot, set up with the repo, and the
  recurring pass over dependencies, the runtime, the deployed server and backups, whose last run is
  the `routine` date in `foundry.lock`.
- **[agent-skills.md](./agent-skills.md)** — installing Foundry's skills as the repo's own: they are
  templates, so the setting-up agent copies every one into each harness's skill directory, repoints
  its Foundry links, fills in its project parameters, checks it is invocable, and lists it in
  `AGENTS.md` — and does the same for new and changed skills when reconciling.

Setup is not finished once. A later change that picks or swaps an adapter, adds a deterministic
convention, or adds a satellite, extends the CI too — [ci-verification.md → Extending](./ci-verification.md#extending).
