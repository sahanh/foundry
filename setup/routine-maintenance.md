# Routine Maintenance

A Foundry repo's code stands still between changes, but what it runs on doesn't: dependencies,
the runtime, the server and its containers age, and backups fail without anyone noticing. **Routine
maintenance** is the recurring pass that catches this: a developer runs it every so often, works
through what it finds, and records the date it last finished.

## Dependabot

Every adopting repo on GitHub runs Dependabot, set up with the repo:

- **Alerts and security updates are on** (repo *Settings → Code security*), so a vulnerable
  dependency gets an alert and a fix PR without anyone looking for it.
- **Version updates** are configured in `.github/dependabot.yml`. Configure one entry per ecosystem
  the repo has:
  - `npm` at the workspace root (it reads `pnpm-lock.yaml`);
  - `docker` for each directory with a Dockerfile, which covers the Node base image;
  - `docker-compose` for each directory with Compose files;
  - `github-actions` at the root.
- **Schedule:** weekly. **Group** minor and patch updates per ecosystem into one PR, and leave
  majors ungrouped, so each major is its own decision.

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    groups:
      minor-and-patch: { update-types: [minor, patch] }
  # docker, docker-compose and github-actions entries in the same shape
```

## The routine

The **[routine-maintenance](../skills/routine-maintenance/SKILL.md)** skill is the procedure
([agent-skills.md](./agent-skills.md) installs it). It runs locally, launched by a developer who
can bring up the dev stack and reach the deployed server, and it covers:

- **Dependency updates:** merge Dependabot's PRs once they're proven against the local stack. When
  there are none, probe the production dependencies directly.
- **The runtime:** Node, pnpm and TypeScript, the toolchain Foundry fixes.
- **The deployed server:** its OS, its container runtime and images, and its health.
- **Deploys and backups:** whether they're succeeding, and whether a backup actually restores.

Run it on a cadence the team picks; monthly is a sensible ceiling. It works with the developer:
nothing it finds is fixed on production, merged or deferred without them.

## The last run — `routine` in `foundry.lock`

When a run finishes, it sets `routine = <YYYY-MM-DD>` in `foundry.lock`
([staying-in-sync.md → The pin](./staying-in-sync.md#the-pin--foundrylock)). A run has finished when
every check has run and every finding is either fixed or recorded with a reason. A run that stops
partway leaves the date where it was.
