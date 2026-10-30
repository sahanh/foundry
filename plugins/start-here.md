# Plugins — Start Here

`plugins/` holds the code that **ships to another platform and runs there**: a Zapier app, a WordPress
plugin, a Make or n8n node, a browser extension, a Shopify app. Each one is an independent codebase,
in whatever language its platform uses, that you upload or publish to the vendor's ecosystem. It
drives the system from there, through the published API.

> **This is a skippable branch.** If your work is not a plugin, you do **not** need to read this
> file. Where plugins sit beside `apps/` and `packages/` is
> [code-placement.md → The Topology](../code-placement.md#the-topology).

Foundry fixes where a plugin lives, what it may touch, and how it maps the rest of its integration.
**Inside its folder, the project decides**: layout, scripts, runbooks, tests, CI and release.

## Placement — one folder per platform

- **One folder per platform** (`plugins/zapier/`, `plugins/wordpress/`), named by the platform it
  runs on.
- **Only the code that ships to the platform lives here.** A vendor integration splits by
  direction: the endpoints the vendor calls back on (webhook subscriptions, REST hooks, an OAuth
  callback) are routes in `apps/api/`, because they need the core; anything the core pushes out to
  the vendor is a driven adapter in `system/`
  ([code-placement.md → Worked Examples](../code-placement.md#worked-examples)).
- **Its internal layout is the project's**, usually the platform's own scaffolding — Zapier's
  `triggers/` and `creates/`, a WordPress plugin's main file and `includes/`.

## The README maps the whole integration

An integration is wider than its plugin folder, so **every plugin folder has a `README.md` that maps
it**:

- every part of the integration that lives elsewhere — the `apps/api/` routes the vendor calls back
  on, the driven adapter that pushes to the vendor, any scheduled job — each by path;
- how it is built, tested and released, or a link to the runbook that says so.

A change that adds, moves or removes one of those parts updates the README in the same change. Why:
the parts live in different folders on purpose, and the README is the one place that shows the
integration whole.

## It reaches the system only through the published API

- **Every call goes to a route of the published API** — the routes `apps/api` exposes to outside
  callers ([apps/start-here.md → The published API](../apps/start-here.md#the-published-api)). Never
  an internal route, such as one only the repo's own web UI calls, and never the database, a queue
  or another service directly. Why: the plugin runs where your code doesn't, and an installed
  version keeps calling long after you deploy — only the published API is a promise you keep.
- **The route code in `apps/api` is the reference.** Each call's method, path, inputs and the
  response it reads match what that route accepts and returns.
- **It imports nothing from `apps/` or `packages/`, and nothing there imports it.** No domain code
  ships into a third-party runtime, and no call skips the API's checks.

## It holds no business rules

A plugin is exactly as thin as a controller: it maps the platform's input to an API call, and the
API's response to the platform's output shape. A rule may be *mirrored* for the platform's UI — a
dropdown filled from the API, an input hint — but the API decides; a rule that exists only in a
plugin fails, as it would in the web UI
([code-placement.md → Worked Examples](../code-placement.md#worked-examples)).

## It authenticates as the customer

The plugin calls the API with a credential the API issued to the customer's account — an API key or
an OAuth token, entered through the platform's own auth flow — and the API verifies it and resolves
the actor at its edge, like any other caller
([identity-and-access.md → Authentication is an edge concern](../packages/core/identity-and-access.md#authentication-is-an-edge-concern)).
The plugin never ships a secret of its own, and never holds a credential that skips the domain's
authorization.

## Toolchain, CI and release are the project's

- **A TypeScript plugin meets the tooling baseline** — strict types, the recommended lint presets,
  the formatter, no floating promises
  ([typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline)) —
  and the import wall above. Foundry's other TypeScript conventions and CI rules do not apply.
- **A plugin in another language** — a PHP WordPress plugin — meets none of the CI catalogue. The
  project decides its toolchain and its checks, from a syntax lint to a full suite
  ([ci-verification.md → Plugins in another language](../setup/ci-verification.md#plugins-in-another-language)).
- **Tests are the project's call** in either language.
- **It ships on the platform's cadence** — `zapier push`, a WordPress.org release — versioned on its
  own. The repo is its source; a publish step or a mirror repo that distributes it is fine.

Placement, the README map, the API-only rule, no business rules and authentication are
language-neutral: review checks them for every plugin.

When a change here is complete, verify against [end-here.md](./end-here.md). You are usually routed
there by the [review protocol](../review.md).
