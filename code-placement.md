# Code Placement

**Read this first** — the repository's shape and the single rule for *where any piece of code belongs*. Guides underneath: **[packages/core/start-here.md](./packages/core/start-here.md)** · **[packages/core/system/start-here.md](./packages/core/system/start-here.md)** · **[apps/start-here.md](./apps/start-here.md)** · **[packages/start-here.md](./packages/start-here.md)** · **[satellites/start-here.md](./satellites/start-here.md)**.

Implementation complete → run the [review protocol](./review.md).

---

## The Topology

A monorepo with up to three top-level homes. Each is defined by **how the code reaches the system**:

| Home | Holds | How it reaches the system |
|---|---|---|
| **`apps/`** | the entry points of the integrated product, deployed with it | as part of the product: it imports the core, or calls the product's API, internal routes included |
| **`packages/`** | the core and the libraries the apps import | it is the system, or a library the system consumes; it never runs on its own |
| **`satellites/`** | independent codebases with their own build and release, shipped to a vendor's platform or deployed on their own | only over the published API; it imports nothing in the repo |

`satellites/` appears with the first satellite. No top-level `src/` — each app and package has its own `src/`.

```
apps/                  ← driving adapters: inbound entry points, each deployable
  api/                   HTTP/GraphQL controllers      →  import @app/core
  web/                   frontend client UI (React)    →  drives the core via api/ (or @app/core from server code)
  cli/                   command-line entry points     →  import @app/core
  worker/                queue consumers                →  import @app/core
  mcp/                   MCP server (tool handlers)     →  import @app/core
packages/              ← libraries: consumed, never run on their own
  core/                  the domain hexagon
    src/
      system/            driven adapters the core depends on (db, logger, clock)
      <feature>/         the domain layer (business logic)
  notifications/         a driven adapter that graduated out of core (example)
satellites/            ← independent codebases, own build and release (any language)
  zapier/                Zapier app                     →  calls api/'s published routes over HTTP
  wordpress/             WordPress plugin (PHP)         →  calls api/'s published routes over HTTP
```

**`packages/core` is the hexagon**: the framework-agnostic domain layer plus the driven infrastructure it cannot live without (`core/src/system/`). Its package identity (`@app/core`) lets any integration framework consume it by name.

## Layering: three roles, one direction

Every piece of code plays one of three roles:

| Role | What it is | Lives in |
|---|---|---|
| **Domain** | business logic — rules, calculations, entity transformations | `packages/core/src/<feature>/` |
| **Driven adapter** | infrastructure the domain calls *out* to (db, logger, clock, email, queue) | `packages/core/src/system/` — or its own `packages/<name>/` once graduated |
| **Driving adapter** | an inbound entry point that calls *into* the domain (HTTP, CLI, worker, MCP, web UI) | `apps/<name>/` when it is part of the product; `satellites/<name>/` when it is its own codebase calling the published API |

`system/` also holds the core's **foundational primitives** (`AppContext` + `ctx.transaction` factory, id helpers + prefix registry, pagination) — not a fourth role: non-domain substrate, imported directly (or via `ctx.system.helpers.*`), never injected, no business rules. See [system/start-here.md](./packages/core/system/start-here.md).

Business logic lives in the **service layer**, never in controllers or integration code, and is **integration-agnostic** — the same logic serves REST, GraphQL, workers, MCP tools. Build it first; wire delivery to it from apps.

At the boundary, a driving adapter **reuses the core's Zod schemas** rather than redefining input shapes — a redefined schema silently drifts from the domain's real constraints.

Dependencies point **one direction only**:

```
driving adapters   →   domain core   →   driven adapters
(apps/*)               (packages/core)    (core/src/system + graduated packages/*)
```

The core never imports an app; a driven adapter never imports the domain. A satellite imports none of them: it reaches the system over HTTP, and nothing imports it ([satellites/start-here.md](./satellites/start-here.md#it-reaches-the-system-only-through-the-published-api)).

## The Placement Criteria

Three questions, in order. **Classify the code *you* write, not the npm package** — the SDK is just a `package.json` dependency; you place the adapter you author around it.

```
Q1 — Is it business logic (rules/decisions about your entities)?
     YES → packages/core, as a feature.            ← it's domain, stop here
     NO  → go to Q2.

Q2 — Which way does the dependency point?
     It calls INTO the domain (inbound entry point)?   ← driving adapter
          Part of the product                      → apps/<name>/
          Its own codebase, over the published API → satellites/<name>/
     The domain calls OUT to it (infrastructure)?
          → go to Q3.                               ← driven adapter

Q3 — (driven only) Does it earn its own package, or stay in core?
     Default → packages/core/src/system/<capability>/   ← wired via AppContext
     Graduate to packages/<name>/ when ANY signal is REAL:
        • reused beyond the core (another app/package needs it directly)
        • heavy enough to own its lifecycle/versioning (a real engine)
        • a swappable implementation you want to version on its own
```

Q2 classifies by **which way the dependency points, never by vendor or technology** — one technology can split (queue *enqueue* is outbound → `system/queue/`; the *worker* calling services is inbound → `apps/worker/`). So can one vendor: see *Vendor integration* under the trip-ups below.

Q3 is [logic-placement.md](./packages/core/logic-placement.md)'s promotion philosophy — climb on a real signal, never in anticipation; graduation is a refactor, not a guess.

## Worked Examples

| Thing you're placing | Q1 logic? | Q2 direction | Q3 weight | **Lands in** |
|---|---|---|---|---|
| MCP server (tools call your services) | no | inbound | — | `apps/mcp/` |
| REST API (Express/Hono routes) | no | inbound | — | `apps/api/` |
| Frontend web UI (React SPA / client) | no | inbound | — | `apps/web/` |
| Queue worker (consumes jobs) | no | inbound | — | `apps/worker/` |
| Zapier app, WordPress plugin, browser extension, or a codebase deployed on its own that calls your API | no | inbound, over the published API | — | `satellites/<name>/` |
| Webhook from a vendor (Stripe event, Zapier REST-hook subscribe) | no | inbound | — | `apps/api/` (a route) |
| Sync records out to a vendor (push contacts to a CRM) | no | outbound | one capability → stays (until it grows) | `packages/core/src/system/<capability>/` |
| Notifications (templates, multi-channel, read by a settings page) | no | outbound | own lifecycle + non-domain consumer → **graduates** | `packages/notifications/` |
| Database (Drizzle/Postgres) | no | outbound | baseline → stays | `packages/core/src/system/db/` |
| Logger | no | outbound | baseline → stays | `packages/core/src/system/logger/` |
| Clock (injectable now-source) | no | outbound | baseline → stays | `packages/core/src/system/clock/` |
| Enqueue a job | no | outbound | baseline → stays | `packages/core/src/system/queue/` |
| Email send | no | outbound | one capability → stays (until it grows) | `packages/core/src/system/email/` |
| "Can this task be claimed?" rule | **yes** | — | — | `packages/core/src/<feature>/` (a service) |

Common trip-ups:

- **MCP server** — feels like infrastructure but **imports the domain** (each tool calls a service) → driving, structurally a REST route: `apps/mcp/`, never `system/`. Its toolchain, layout, authentication and tool design: [apps/mcp/start-here.md](./apps/mcp/start-here.md).
- **Frontend** — `apps/web/` drives the core via `api/` over HTTP (or `@app/core` server-side); direction still inward → driving. No business rules here — the UI may *mirror* a rule for fast feedback; the core stays source of truth. Internal structure (skippable subtree): [apps/web/start-here.md](./apps/web/start-here.md).
- **Vendor integration** — one vendor, up to three homes, split by direction: code that **ships to the vendor's platform** (a Zapier app, a WordPress plugin) is a satellite in `satellites/<name>/`, reaching the system only through the published API; the endpoints the vendor **calls back** on are routes in `apps/api/`, because they need the core; what the core **pushes out** to the vendor is a driven adapter, named by capability. The satellite's README maps the parts outside its folder. Rules: [satellites/start-here.md](./satellites/start-here.md).
- **Multi-tenancy** — splits by face: tenant-as-*scope* (`ctx.tenant`, the scoped `ctx.system.db`) is system-level; tenant-as-*entity* (org/plan/members and their rules) is a domain feature. See [multi-tenancy.md](./packages/core/multi-tenancy.md).

### Graduation: when a driven adapter leaves `system/`

An adapter leaves `system/` only on a real Q3 signal; email → `packages/notifications/` is canonical. Growing weight (templates, channels, digests) is soft — stay. The tip: a **non-domain consumer needs it directly** (an `apps/web` settings page reads templates directly) or it grows **its own lifecycle** (a digest scheduler). After: `core` depends on it as a driven port, `apps/web` directly; the provider SDK moves to *its* `package.json`.

Graduation moves **delivery mechanics, never the decision**: "a task assignment *should* notify the assignee" stays in a core service (post-commit effect); the package decides only rendering and delivery.

## Building a driven adapter

Same rules in `core/src/system/` and graduated `packages/<name>/`:

- **Name it by capability, not vendor** — `email/` not `sendgrid/`, `queue/` not `bullmq/`; a vendor swap stays inside the adapter.
- **Expose a focused interface** — what the domain needs, not a passthrough of the library's full API.
- **No business logic** — an adapter that decides domain rules has crossed layers.
- **The domain reaches it through `AppContext`** (`ctx.system.*`), never a direct import — see [app-context.md](./packages/core/app-context.md).

## Folder rules

- **Organize by feature/domain, not technical layer** — one capability, one feature folder under the core's `src/`; a new feature adds a folder, not edits across `services/`, `schemas/`, `exceptions/` directories.
- **`packages/core/src/system/` is the core's non-domain infrastructure** — driven adapters plus the foundational primitives above. Invariant: **no business rules, no domain vocabulary** (see [system/start-here.md](./packages/core/system/start-here.md)). Every *other* child of the core's `src/` is a feature folder.
- **`apps/` is reserved for driving adapters.** Nothing inbound belongs inside the core.
- **`satellites/` is reserved for independent codebases that reach the system only over the published API** — one folder per satellite; inside it, the project decides ([satellites/start-here.md](./satellites/start-here.md)).
- **Any folder fitting *none* of these categories requires explicit confirmation from the user before it is created** — a shared-utilities or cross-cutting-helpers folder is not the developer's unilateral call; stop and confirm. Applies at every level of the tree.
