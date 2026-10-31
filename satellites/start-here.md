# Satellites — Start Here

`satellites/` holds **independent codebases that reach the system only through its published API**:
a Zapier app, a WordPress plugin, a Make or n8n node, a browser extension, or a codebase you deploy on
its own. Each has its own toolchain, build and release, in whatever language its runtime uses, and
runs wherever it is shipped or deployed: on a vendor's platform or on a host of yours.

> **This is a skippable branch.** If your work is not a satellite, you do **not** need to read this
> file. Where satellites sit beside `apps/` and `packages/` is
> [code-placement.md → The Topology](../code-placement.md#the-topology).

Foundry fixes where a satellite lives, what it may touch, and how it maps the rest of its integration.
**Inside its folder, the project decides**: layout, scripts, runbooks, tests, CI and release.

## Adding a satellite

1. **Check it is one.** It is its own codebase, and it reaches the system only over the published
   API ([code-placement.md → The Placement Criteria](../code-placement.md#the-placement-criteria)).
2. **Create `satellites/<name>/`**, named for the platform it ships to (`zapier`, `wordpress`) or
   for its role when you deploy it yourself.
3. **Write its README map** ([below](#the-readme-maps-the-whole-integration)).
4. **Make sure every route it calls is on the published API**, and publish any it needs in the same
   change ([apps/start-here.md → The published API](../apps/start-here.md#the-published-api)). A
   route it calls that the repo files as internal is reclassified as published.
5. **Set up its toolchain and CI** ([below](#toolchain-ci-and-release-are-the-projects)), and update
   the repo's CI manifest: list it under the *Satellites* parameter, and build and prove the checks
   that apply to it — `SAT-02` for every satellite, `SAT-01` for a TypeScript one. Where no check
   covers its imports, review checks the wall instead
   ([ci-verification.md → Satellites](../setup/ci-verification.md#satellites)). A repo check that
   allows only root tool configs gets a carve-out for the satellite's own.

## Placement — one folder per satellite

- **One folder per satellite**, under `satellites/`, named as in step 2 above.
- **Only the satellite's own codebase lives here.** A vendor integration splits by direction: the
  endpoints the vendor calls back on (webhook subscriptions, REST hooks, an OAuth callback) are
  routes in `apps/api/`, because they need the core; anything the core pushes out to the vendor is a
  driven adapter in `system/`
  ([code-placement.md → Worked Examples](../code-placement.md#worked-examples)).
- **Its internal layout is the project's**, usually its platform's or framework's own scaffolding —
  Zapier's `triggers/` and `creates/`, a WordPress plugin's main file and `includes/`.
- **A satellite rebuilt as part of the product, following the app guidelines, becomes an app** and
  moves to `apps/`.

## The README maps the whole integration

An integration is wider than its satellite folder, so **every satellite folder has a `README.md` that
maps it**:

- every part of the product it relies on, or that relies on it, outside the folder — the published
  routes it calls, the `apps/api/` routes a vendor calls back on, the driven adapter that pushes to
  the vendor, its step in the repo's deploy pipeline — each by path;
- how it is built, tested and released, or a link to the runbook that says so.

A change that adds, moves or removes one of those parts updates the README in the same change. Why:
the parts live in different folders on purpose, and the README is the one place that shows the
integration whole.

## It reaches the system only through the published API

- **Every call goes to a route of the published API** — the routes `apps/api` exposes to callers
  outside the product's own apps
  ([apps/start-here.md → The published API](../apps/start-here.md#the-published-api)). Never an
  internal route, such as one only the product's own apps call, and never the database, a queue or another
  service directly. Why: a satellite builds and ships apart from the product, and an installed or
  deployed version keeps calling after the product changes — only the published API is a promise
  you keep.
- **The route code in `apps/api` is the reference.** Each call's method, path, inputs and the
  response it reads match what that route accepts and returns.
- **It imports nothing from outside its folder in the repo, and nothing outside imports it** — no
  app, package, repo tooling or other satellite. The third-party packages it installs are fine; a
  workspace package is repo source however it is linked. Repo tooling may run a satellite's
  commands or read its build output, never import its source. Why: an import would let the
  satellite's code and the governed code reach into each other, which the published API exists to
  prevent. Import tools often can't parse a UI framework's own component files, so for such a
  satellite `SAT-01` usually stays deferred and review checks the wall
  ([ci-verification.md → Satellites](../setup/ci-verification.md#satellites)).

## It holds no business rules

A satellite is exactly as thin as a controller: it maps its own input to an API call, and the API's
response to its own output. A rule may be *mirrored* for its UI — a dropdown filled from the API, an
input hint — but the API decides; a rule that exists only in a satellite fails, as it would in the
web UI ([code-placement.md → Worked Examples](../code-placement.md#worked-examples)).

## It authenticates the way the API allows

Each call authenticates the way the called route supports — a customer's API key or OAuth token
(through the platform's own auth flow, where there is one), a user's session from the product's
sign-in, or a service identity the API issued — and the API verifies it and resolves the actor at its
edge, like any other caller
([identity-and-access.md → Authentication is an edge concern](../packages/core/identity-and-access.md#authentication-is-an-edge-concern)).
A public route takes no product credential, though it may still require evidence it asks for, such
as a bot-check token.

- **No secret ships in code the satellite distributes** to a user's browser, device or a vendor's
  platform. A deployment or server-side secret lives in its host's secret store.
- **No credential reaches the system around the domain's authorization.**

## Toolchain, CI and release are the project's

- **A TypeScript satellite meets the tooling baseline** — strict types, the recommended lint presets,
  the formatter, no floating promises
  ([typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline)) —
  using its framework's own checker, lint preset and formatter plugin where it has them, and the
  import wall above. Foundry's other TypeScript conventions and CI rules do not apply.
- **Workspace membership is the project's call.** A JavaScript or TypeScript satellite may join the
  repo's package-manager workspace, sharing its lockfile and catalog versions, or pin its own.
  Membership manages its dependencies and imports nothing, so the wall still holds.
- **A satellite in another language** — a PHP WordPress plugin — meets none of the CI catalogue but
  the README rule. The project decides its toolchain and its checks, from a syntax lint to a full
  suite ([ci-verification.md → Satellites in another language](../setup/ci-verification.md#satellites-in-another-language)).
- **Tests are the project's call** in either language.
- **It ships on its own cadence** — `zapier push`, a WordPress.org release, or its own step in the
  repo's deploy pipeline — versioned on its own. The repo is its source; a publish step or a mirror
  repo that distributes it is fine.

Placement, the README map, the API-only rule, no business rules and authentication are
language-neutral: review checks them for every satellite.

When a change here is complete, verify against [end-here.md](./end-here.md). You are usually routed
there by the [review protocol](../review.md).
