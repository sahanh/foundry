# Setup — Start Here

**Setting up a repo to follow Foundry** — the one-time work that makes the standard enforceable in
an adopting codebase, as opposed to the per-feature guidance under [code-placement.md](../code-placement.md).
Come here when asked to set up Foundry, set up CI for it, or when an adopting repo has no
`foundry-ci.md` at its root.

- **[ci-verification.md](./ci-verification.md)** — the spec for the repo's CI: every rule a tool can
  decide (imports, naming, TypeScript, column definitions, migrations), each with the failure its check
  must catch. Build the checks for the project's stack, prove each one fails on a violation, and record
  them in the repo's `foundry-ci.md` manifest. The [review protocol](../review.md) then skips what CI
  enforces and checks only what needs judgment.

Setup is not finished once. A later change that picks or swaps an adapter, or adds a deterministic
convention, extends the CI too — [ci-verification.md → Extending](./ci-verification.md#extending).
