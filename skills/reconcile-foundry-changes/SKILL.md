---
name: reconcile-foundry-changes
argument-hint: "[target Foundry commit, default origin/main]"
description: Reconcile a Foundry codebase with the Foundry changes made since its pin (foundry.lock). Briefs every CHANGELOG entry after the pin, finds what in the repo each one touches, plans with the user entry by entry (conform, defer, or deviate), then carries out the approved plan and moves the pin. Use when the user asks to reconcile, sync or catch up with Foundry, check what changed in Foundry, or move the Foundry pin, or when an adopting repo has no foundry.lock yet.
---

# Reconcile Foundry changes

You bring an adopting repo up to date with the Foundry changes made since its pin. Foundry's
changelog says what changed and where the rule lives; you find what in this repo each change
touches, agree a plan with the user, and only then change code. **You never edit Foundry.**

The protocol this skill drives is [setup/staying-in-sync.md](../../setup/staying-in-sync.md): read it
first. Paths to Foundry docs in this file are relative to the Foundry repository.

**This copy is a starting point.** Copy the skill into the adopting repo and adapt it: where Foundry
is cloned, where the repo records its decisions, how it ships a change.

## Inputs

- `$ARGUMENTS`: the Foundry commit to reconcile to. Default: `origin/main`.
- The pin: `foundry.lock` at the repo root. If there is none, start at **Bootstrap** below.
- A Foundry clone at `$FOUNDRY_DIR` (default `~/projects/foundry`). If there is none, clone
  `https://github.com/sahanh/foundry` there. Read Foundry only through git (`git show <commit>:<path>`),
  never from its working tree, and never edit, commit to or check out branches in it.

## Step 1. Brief

From the adopting repo's root, run [brief.sh](brief.sh) from this skill's directory:

```bash
bash <this skill's dir>/brief.sh [target]
```

It fetches Foundry and prints every entry after the pin, oldest first: the commit that made it, the
entry's text, the rule IDs it names, the sections it points to, and the commands that show each
section at the target and the change itself. Then come the commits that changed Foundry with no
entry, and older entries edited since the pin. If nothing comes after the pin, tell the user and stop.

The brief is the agenda. Work through it oldest first, because later entries build on earlier ones:
a doc is renamed, and then a rule changes inside the renamed doc.

## Step 2. Investigate each entry

Explore before asking the user anything.

1. **Read the entry, then the sections it points to**, at the target.
2. **Read the change itself**, using the diff command in the brief. It shows what the rule was and
   what it is now. The entry only points; the diff and the guideline say exactly what changed.
3. **Find the code shaped by the old rule.** Search this repo for every shape the change outlaws or
   renames: a removed construct, an old file or term, a pattern a new check rejects, a place a new
   rule now governs. Cite each site as `path:line`. Search the repo's own docs too (`AGENTS.md`,
   `CLAUDE.md`, ADRs, the decision log) for text that restates the changed rule or links to a moved
   or renamed doc.
4. **Rule IDs.** For each ID the entry names, read its row in `foundry-ci.md` and the rule's entry in
   [setup/ci-verification.md](../../setup/ci-verification.md) at the target. A new or changed rule
   means a check to build or update, and proving that it bites.
5. **Classify the entry:**
   - **No impact.** Nothing in the repo is shaped by the old rule. Say what you searched.
   - **Needs change.** List the sites.
   - **Conflicts with a decision.** The repo already recorded a deviation or decision the change
     touches. Cite it.

The **commits with no entry** and the **older entries edited** should change no rule. Skim each
one. If it does change a rule, treat it like an entry, and tell the user the changelog missed it so
they can raise it with Foundry. If a skill changed and this repo carries a copy, say so.

## Step 3. Plan with the user

Present one plan, entry by entry, oldest first:

- **What changed**, in one line.
- **What it touches here**: the sites, or for a large set, the count and a few examples.
- **The proposed decision:**
  - **conform**: the change to make;
  - **defer**: conform later, with the reason recorded;
  - **deviate**: keep the old shape on purpose, recorded as a decision.

List no-impact entries one line each, with what you searched. Ask the user to confirm or change each
decision. Make no edits until they approve.

If the plan is large, offer to split it into several changes. Each change moves the pin to the
commit of the newest entry up to which everything is decided. Entries that share a commit move
together.

## Step 4. Carry it out

1. Work on a branch or worktree, the way the repo ships changes.
2. Make the approved changes.
3. Record each deferral and deviation where the repo records its decisions. If it has no such place,
   ask the user where to put them.
4. For each rule ID: build or update the check, prove it fails on a violation, and update its
   `foundry-ci.md` row ([ci-verification.md → Setting it up](../../setup/ci-verification.md#setting-it-up)).
5. Run the repo's local verify command, then the [review protocol](../../review.md) on the change.
6. **Move the pin in the same change**: `commit = <sha>`. Use the target, or for a partial reconcile,
   the commit of the newest entry up to which every entry is decided. The brief's last section names
   the target's full sha.
7. Report each entry with its decision, the pin's old and new commit, and anything left for later.

## Bootstrap: no `foundry.lock`

Find the newest entry the repo is known to conform to:

- a **Synced to** line in `foundry-ci.md` (the marker the pin replaced) names one;
- otherwise, find when the repo began following Foundry (for example,
  `git log -S Foundry -- AGENTS.md CLAUDE.md`), and take the newest entry from before then.

Put the candidate to the user with its evidence. Once they agree, get its commit with
`brief.sh --entry-commit "<entry heading>"`, write `foundry.lock` in the format from
[staying-in-sync.md → The pin](../../setup/staying-in-sync.md#the-pin--foundrylock), and continue
from Step 1. A repo that has never followed Foundry needs [setup/](../../setup/start-here.md), not
this skill.
