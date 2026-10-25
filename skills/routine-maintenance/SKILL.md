---
name: routine-maintenance
argument-hint: "[area to limit the run to: deps | runtime | server | backups]"
description: Routine maintenance pass on a Foundry codebase and its deployment, run by a developer every so often. Merges Dependabot's PRs after proving them against the local dev stack with a browser smoke test, or probes the production dependencies when there are none; checks Node, pnpm and TypeScript; checks the deployed server's OS, container runtime and images for updates and known vulnerabilities; and checks that deploys and backups are succeeding. Plans every fix with the developer, then records the run's date in foundry.lock. Use when the user asks for routine maintenance, an upkeep or health pass, to merge Dependabot PRs, to check dependencies, the server or backups are up to date and safe, or when foundry.lock's routine date is old.
---

# Routine maintenance

You run the recurring upkeep pass described in
[setup/routine-maintenance.md](../../setup/routine-maintenance.md): the repo's dependencies, its
runtime, the server it's deployed to, and its deploys and backups. You survey everything first,
agree a plan with the developer, then act. **Nothing changes on production, and nothing is merged,
upgraded or deferred, without the developer's yes.**

You run on the developer's machine. You start the local dev stack yourself, and you reach the
deployed server with whatever access the developer has.

Paths to Foundry docs in this file are relative to the Foundry repository.

## Project parameters

This file is a template: an adopting repo installs and adapts it
([setup/agent-skills.md](../../setup/agent-skills.md)). Filled in when installed:

| Parameter | Value |
|---|---|
| Local dev stack | *how to start it, its ports, and how to seed it* |
| Local verify command | *from `foundry-ci.md`, e.g. `pnpm verify`* |
| Smoke flows | *the journeys to walk in a browser, and the test login* |
| Deployed environments | *each server: how to reach it (SSH alias, deploy tool, monitoring CLI)* |
| Container runtime | *Docker, Podman…; where images are built, and the registry* |
| Deploys | *how a deploy runs, and where to see the last one* |
| Backups | *what is backed up, where to, on what schedule, and how to restore one* |
| Findings are recorded in | *e.g. GitHub issues labelled `maintenance`* |

Read anything left blank from the repo (`AGENTS.md`, deploy config, compose files), and ask the
developer only for what the repo can't answer.

## Step 0. Orient

- **Days since the last run:** read `routine` in `foundry.lock`. If it's missing, this is the first run.
- **Open findings** from earlier runs, wherever findings are recorded. Carry them into this run.
- **Foundry pin:** if Foundry's `main` is ahead of `commit` in `foundry.lock`, say how far. Reconciling
  is a separate job (the `reconcile-foundry-changes` skill), so don't do it here.
- If `$ARGUMENTS` names an area, run only that one, and don't move the `routine` date at the end.

## Step 1. Survey (read-only)

Work through every section. Write each finding down as you go, with the evidence: a version, an
advisory ID, a log line, a date.

### Dependencies

- **Dependabot PRs:** `gh pr list --author app/dependabot --state open`. For each, note what it bumps
  (from → to), whether it's a security fix, whether it's a major, and its CI status. Read the release
  notes for every major, and for any minor whose package is known to break in minors.
- **When there are none, probe the production dependencies.** Production means what the deployed
  apps and their workspace packages pull in at runtime, not `devDependencies`. Use
  `pnpm audit --prod` and `pnpm outdated --prod --recursive`. Which packages those are depends on the
  project, so take the list from the lockfile, not from memory. For each outdated package, note how
  far behind it is, and whether the gap holds a security fix.
- **GitHub's own alerts:** the Dependabot alerts (`gh api repos/{owner}/{repo}/dependabot/alerts`),
  plus code-scanning and secret-scanning alerts where they're enabled. An alert with no PR means
  Dependabot couldn't fix it, so it needs a hand.
- **Dependabot is set up** the way [setup/routine-maintenance.md → Dependabot](../../setup/routine-maintenance.md#dependabot)
  says, covering every ecosystem the repo has. A missing entry is a finding.

### The runtime Foundry fixes

These are the same in every Foundry repo, so check them by name, dev tooling included:

- **Node:**
  - The line in use is an LTS release in Active or Maintenance support, not near its end of life
    (check nodejs.org's release schedule).
  - It's on that line's latest patch, since Node's security fixes ship as patches.
  - The pin (`.node-version`, `.nvmrc` or `engines.node`), CI's setup step and the production image's
    `FROM node:<tag>` all name the same line.
  - `@types/node` matches that line.
- **pnpm:** the `packageManager` field names a supported major, on its latest release.
- **TypeScript:** it's on the latest release in the repo's major. `typescript-eslint` supports that
  version; check its supported range, which it pins. A new major or minor is gated on a clean strict
  type-check ([Tooling Baseline](../../common/typescript-coding-standards.md#tooling-baseline)).

### The deployed server

For each deployed environment:

- **OS:**
  - The release is still supported.
  - List pending security updates, and check that automatic security updates are running.
  - Note whether a reboot is pending, and since when.
- **Container runtime:** the engine (Docker, containerd, Podman) is on a supported, patched release.
- **Images:**
  - The running images are what the default branch builds; the deployed revision matches the last
    deploy.
  - When was each image's base last rebuilt?
  - Scan each image for known vulnerabilities (e.g. `trivy image` or `docker scout cves`), and note
    the fixable high and critical ones.
- **Health:**
  - Containers are up and not restart-looping.
  - Check disk, memory and inode headroom.
  - Errors in the logs since the last run.
  - TLS certificates don't expire within 30 days.
  - Credentials and API keys with an expiry aren't close to it.

### Deploys and backups

- **Deploys:** the last deploy succeeded, and no lock or half-finished rollout is left behind.
- **Backups:**
  - The latest backup ran on schedule and succeeded.
  - Its size is in line with the ones before it.
  - It's stored where the parameters say, including off the server.
- **A backup restores.** Restore the latest one into a scratch database on the local machine and
  query a few tables. If this is done less often than every run, note when it was last done. Until a
  restore works, there is no backup.

## Step 2. Plan with the developer

Present every finding, grouped by area. Each one gets its evidence, how urgent it is (an exploitable
vulnerability or a failing backup comes first) and a proposed action:

- **fix now:** the change, and how it gets verified;
- **decide:** an action with real risk or cost, such as a major upgrade, a new Node LTS line, an OS
  upgrade or a reboot. Set out the options;
- **defer:** fix later, recorded with the reason and a date to revisit;
- **accept:** leave it as it is (e.g. a vulnerability in a code path the app never reaches),
  recorded with the reason.

Areas with nothing to report get one line each, saying what was checked. Make no change until the
developer approves.

## Step 3. Act

### Dependency changes: Dependabot's PRs, or your own upgrades

1. **Combine and prove locally.** In a worktree off the default branch, merge every approved PR
   branch, or make the approved upgrades. Then:
   - install with a frozen lockfile;
   - run the local verify command and the test suite;
   - build every app;
   - apply the migrations to a fresh local database.
2. **Smoke test.** Start the local dev stack from the worktree, on its own ports. Then walk each
   smoke flow in a real browser with agent-browser, or the repo's browser automation, watching the
   browser console and the server logs. One flow failing means the combined change is broken. Find
   which update broke it by bisecting the merged branches, and take that update back to the
   developer.
3. **Merge:**
   - **Few PRs, no conflicts:** merge each on GitHub once its CI is green.
   - **Several, or ones that conflict:** open one PR for the combined branch, listing every
     Dependabot PR it carries. Merge it once CI is green; Dependabot closes the PRs it supersedes.
     Close any left behind, with a comment pointing to the PR that carried them.
4. **Clean up:**
   - delete the merged branches;
   - stop the local stack and anything else started for the smoke test;
   - remove the worktree.
5. **Production:** deploy the result the way the repo deploys, once the developer says go.

### Server, deploy and backup fixes

Only what the developer approved, one at a time. Before each change, say what you're about to run
and on which server. Afterwards, re-run the check that found the problem to prove it's fixed. A
reboot or an OS upgrade is scheduled with the developer, not done in passing.

## Step 4. Record

- Record every **defer** and **accept** where findings are recorded, with its reason and a revisit
  date. A finding that only lives in this conversation is lost.
- **Set `routine = <today, YYYY-MM-DD>` in `foundry.lock`**, but only when the run finished: every
  check ran, and every finding is fixed or recorded. Commit it with the run's dependency PR if there
  is one; otherwise ship it as its own small change the way the repo ships changes.
- Report:
  - what was checked;
  - what was merged, upgraded or fixed;
  - what was deferred or accepted, with links;
  - the date written to `foundry.lock`, or why it wasn't moved.
