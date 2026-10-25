# Staying in Sync

Foundry keeps changing after a repo adopts it, and the repo's code was written against the version
its agents read at the time. **The pin** records the Foundry commit that code was last reconciled
to, so each later change is found and worked through on purpose, not discovered at review.

## The pin — `foundry.lock`

A committed file at the adopting repo's root:

```
# The Foundry commit this repo's code was last reconciled to.
# Moved only by reconciling, in the change that does it (Foundry: setup/staying-in-sync.md).
commit = <full 40-character sha>

# The date routine maintenance last finished (Foundry: setup/routine-maintenance.md).
routine = <YYYY-MM-DD>
```

The rest of this doc is about `commit`. `routine` is owned by
[routine-maintenance.md → The last run](./routine-maintenance.md#the-last-run--routine-in-foundrylock).

- **What it says:** the code conforms to Foundry up to this commit — every
  [CHANGELOG](../CHANGELOG.md) entry at or before it is either followed or covered by a recorded
  decision. Entries after it are not yet reconciled. It does not pin what agents read: new code
  follows Foundry as it is now (`origin/main`); the pin is about the code already written.
- **The value** is a commit on Foundry's `main` — in practice an entry's **Commit:** — never a
  branch.
- **At adoption**, set it to the `main` commit the repo adopted against
  (`git -C <foundry> rev-parse origin/main`). A repo that adopted before the pin existed starts from
  the newest entry it is known to conform to; if nobody knows, from the newest entry older than its
  adoption, and reconciles forward from there.
- **It moves only by reconciling**, in the same change as the reconciling work, and only as far as
  every entry up to it is decided. Entries that share a commit move together.

## Reconciling

When Foundry's `main` is ahead of the pin, the
**[reconcile-foundry-changes](../skills/reconcile-foundry-changes/SKILL.md)** skill does the work: it
briefs the entries after the pin and drives an agent through them with the user. It is written to be
copied into the repo and adapted. By hand, the steps are the same:

1. **List** the entries after the pin, oldest first — later ones build on earlier ones.
2. **Investigate** each: read the sections it links and the change itself (`git show <commit>`), then
   find the code in this repo shaped by the rule as it was.
3. **Decide** each with the user: conform now; defer, with the reason recorded; or deviate, with the
   decision recorded — wherever the repo records its decisions. A rule ID an entry names is a row in
   `foundry-ci.md` ([ci-verification.md → The manifest](./ci-verification.md#the-manifest--foundry-cimd)).
   A skill an entry adds, changes or removes is installed, re-adapted or deleted in the repo
   ([agent-skills.md → Keeping current](./agent-skills.md#keeping-current)).
4. **Move the pin** to the newest commit up to which every entry is decided.
