# Code Placement

**Read this first.** It defines the shape of the whole repository and the single rule for deciding *where any piece of code belongs* — before you reach for a folder, before you add a library. Every other guide sits underneath this one:

- **[packages/core/start-here.md](./packages/core/start-here.md)** — how to build the domain core (services, orchestrations, validation, schemas, testing).
- **[packages/core/system/start-here.md](./packages/core/system/start-here.md)** — the driven infrastructure inside the core (db, logger, clock).
- **[apps/start-here.md](./apps/start-here.md)** — the driving adapters (HTTP, CLI, workers, MCP servers).
- **[packages/start-here.md](./packages/start-here.md)** — libraries, including driven adapters that graduated out of the core.

When implementation is complete, run the [review protocol](./review.md) — it maps what you touched and validates each area against its `end-here`.

---

## The Topology

The repository is a monorepo with exactly two top-level homes: **`apps/`** and **`packages/`**. There is no top-level `src/` — each app and each package has its *own* internal `src/`, so nothing ever fights over the name.

```
apps/                  ← driving adapters: inbound entry points, each deployable
  web/                   HTTP/GraphQL controllers      →  import @app/core
  cli/                   command-line entry points     →  import @app/core
  worker/                queue consumers                →  import @app/core
  mcp/                   MCP server (tool handlers)     →  import @app/core
packages/              ← libraries: consumed, never run on their own
  core/                  the domain hexagon
    src/
      system/            driven adapters the core depends on (db, logger, clock)
      <feature>/         the domain layer (business logic)
  notifications/         a driven adapter that graduated out of core (example)
```

**`packages/core` is the hexagon**: the domain layer (framework-agnostic business logic) together with the driven infrastructure it cannot live without (`core/src/system/`). It is meant to be reusable and to sit *beside* an integration framework — which ships its own `src/` — and be consumed by it. That is why it has a package identity (`@app/core`) rather than being a loose `src/` folder: you import it by name, the way you import any dependency.

## Layering: three roles, one direction

Every piece of code plays one of three roles:

| Role | What it is | Lives in |
|---|---|---|
| **Domain** | business logic — rules, calculations, entity transformations | `packages/core/src/<feature>/` |
| **Driven adapter** | infrastructure the domain calls *out* to (db, logger, clock, email, queue) | `packages/core/src/system/` — or its own `packages/<name>/` once graduated |
| **Driving adapter** | an inbound entry point that calls *into* the domain (HTTP, CLI, worker, MCP) | `apps/<name>/` |

Alongside the driven adapters, `packages/core/src/system/` also holds the core's **foundational primitives** — the `AppContext` type and `ctx.transaction` factory, the id helpers and prefix registry, and pagination. These are *not* a fourth role: they are the non-domain substrate the three roles rest on (the contract adapters plug into, the id system every entity uses). They differ from an adapter only in how the domain reaches them — imported directly rather than injected — and, like adapters, they hold no business rules. See [system/start-here.md](./packages/core/system/start-here.md).

Business logic lives in the **service layer** — never in controllers or integration code. The service layer is **integration-agnostic**: the same logic works behind REST, GraphQL, a worker, a scheduled job, or an MCP tool. Build it first, then wire a delivery mechanism to it from an app.

Dependencies point in **one direction only**:

```
driving adapters   →   domain core   →   driven adapters
(apps/*)               (packages/core)    (core/src/system + graduated packages/*)
```

The core never imports an app. A driven adapter never imports the domain. This one-way flow is what makes the core portable: any number of apps can drive it, and its infrastructure can be swapped, without the domain knowing.

## Driving vs Driven — the direction test

The two kinds of adapter differ only by *which way the dependency points*:

- **Driven (outbound):** the domain calls *out* to it. The domain *depends on* it. → lives inside the core (`system/`) or graduates to its own package.
- **Driving (inbound):** it calls *into* the domain. It *depends on* the domain. → lives in `apps/`.

A single technology can split across both by direction. A job queue is the clean example:

- **Enqueuing** a job — a service calls `ctx.system.queue.enqueue(...)`. The domain calls *out*. → driven → `core/src/system/queue/`.
- **The worker** that consumes jobs and calls a service. It calls *into* the domain. → driving → `apps/worker/`.

Same library, two homes — because you classify each *piece of code by its direction*, not the vendor.

## The Placement Criteria

Given any piece of code or any library you're bringing in, run these three questions in order. **Classify the code *you* write, not the npm package** — a library like an MCP SDK or a database driver is just a dependency in some `package.json`; what gets *placed* is the adapter you author around it.

```
Q1 — Is it business logic (rules/decisions about your entities)?
     YES → packages/core, as a feature.            ← it's domain, stop here
     NO  → go to Q2.

Q2 — Which way does the dependency point?
     It calls INTO the domain (inbound entry point)?
          → apps/<name>/                            ← driving adapter
     The domain calls OUT to it (infrastructure)?
          → go to Q3.                               ← driven adapter

Q3 — (driven only) Does it earn its own package, or stay in core?
     Default → packages/core/src/system/<capability>/   ← wired via AppContext
     Graduate to packages/<name>/ when ANY signal is REAL:
        • reused beyond the core (another app/package needs it directly)
        • heavy enough to own its lifecycle/versioning (a real engine)
        • a swappable implementation you want to version on its own
```

Q3 is the same "climb on a real signal, not in anticipation" ladder used for services and sub-features. Default is in-`system/`; graduation is a refactor triggered by a signal, not an upfront guess.

## Worked Examples

| Thing you're placing | Q1 logic? | Q2 direction | Q3 weight | **Lands in** |
|---|---|---|---|---|
| MCP server (tools call your services) | no | inbound | — | `apps/mcp/` |
| REST API (Express/Hono routes) | no | inbound | — | `apps/rest-api/` |
| Queue worker (consumes jobs) | no | inbound | — | `apps/worker/` |
| Notifications (templates, multi-channel, read by a settings page) | no | outbound | own lifecycle + non-domain consumer → **graduates** | `packages/notifications/` |
| Database (Drizzle/Postgres) | no | outbound | baseline → stays | `packages/core/src/system/db/` |
| Logger | no | outbound | baseline → stays | `packages/core/src/system/logger/` |
| Clock (injectable now-source) | no | outbound | baseline → stays | `packages/core/src/system/clock/` |
| Enqueue a job | no | outbound | baseline → stays | `packages/core/src/system/queue/` |
| Email send | no | outbound | one capability → stays (until it grows) | `packages/core/src/system/email/` |
| "Can this task be claimed?" rule | **yes** | — | — | `packages/core/src/<feature>/` (a service) |

### MCP is a driving adapter, not infrastructure

An MCP server *feels* like infrastructure — it's a protocol — so the instinct is to file it under `system/`. That is wrong: `system/` is for adapters the domain calls *out* to, and an MCP server does the opposite — an LLM client invokes its tools, each tool parses input, calls a service or orchestration, and formats the result. It **imports** the domain. That makes it a *driving* adapter, structurally identical to a REST route or a CLI command, and its home is `apps/mcp/`.

A well-built MCP server keeps the transport/bootstrap (server + session lifecycle + `AppContext` assembly) separate from the per-tool handlers, and each handler stays thin: parse → call the domain → format, with **no business logic**. It also **reuses the core's Zod schemas** at the boundary rather than redefining input shapes — a redefined schema silently drifts from the domain's real constraints. None of this changes the placement rule: however cleanly it is built, an inbound transport belongs in `apps/`, never beside the feature folders and never in `system/`.

### Graduation: when a driven adapter leaves `system/`

An adapter starts in `core/src/system/` and moves to its own package only when a real signal appears. Email is the canonical walk:

- **Day 1** — `core/src/system/email/` wraps a provider's `send()`. One capability, one method. Stays.
- **It grows** — templates, multiple channels (email + push + Slack), digests. Weight alone is a soft signal; keep watching.
- **The tip** — a **non-domain consumer needs it directly** (a settings/preview page in `apps/web` reads templates and preferences without going through a domain service) *or* it grows **its own lifecycle** (a digest scheduler running on its own cadence). Now it's an engine, reused beyond the core.
- **After** — `packages/notifications/`. `core` depends on it as a driven port; `apps/web` depends on it directly; the provider SDK moves to *its* `package.json`.

What graduation moves is **delivery mechanics**, never the **decision**. "A task assignment *should* notify the assignee" is a business rule — it stays in a core service (as a post-commit effect). The package only decides *how* a notification is rendered and delivered. If a domain rule leaked into the package, you'd have rebuilt the original mistake — business logic outside the core — one package over.

## Building a driven adapter

Wherever a driven adapter lives — inside `core/src/system/` or as a graduated `packages/<name>/` — the same rules hold, so a package that leaves the core keeps following the standard without reaching back into it:

- **Name it by capability, not vendor** — `email/` not `sendgrid/`, `queue/` not `bullmq/`. Swapping the vendor is then a change inside the adapter, invisible to the domain.
- **Expose a focused interface** that expresses what the domain needs — not a thin passthrough of the library's full API.
- **No business logic.** An adapter that makes decisions about domain rules has crossed into the wrong layer.
- **The domain reaches it through `AppContext`** (`ctx.system.*`), never a direct import — see [app-context.md](./packages/core/app-context.md).

## Folder rules

- **Organize by feature/domain, not by technical layer.** Everything for one capability lives in one feature folder under the core's `src/`; adding a feature means adding a folder, not editing scattered `services/`, `schemas/`, `exceptions/` directories.
- **`packages/core/src/system/` is the core's non-domain infrastructure** — driven adapters (db, logger, clock, …) *and* the cross-cutting **foundational primitives** the domain is built on (the `AppContext` type + `ctx.transaction` factory, the id helpers + prefix registry, pagination). The invariant across everything here: it carries **no business rules and no domain vocabulary** — adapters are injected via `ctx.system.*`, foundational primitives are imported directly or exposed as `ctx.system.helpers.*` (see [system/start-here.md](./packages/core/system/start-here.md)). Every *other* child of the core's `src/` is a feature folder.
- **`apps/` is reserved for driving adapters.** Nothing inbound belongs inside the core.
- **Any folder that fits *none* of these categories requires explicit confirmation from the user before it is created.** A shared-utilities folder, a cross-cutting helpers folder — anything that is not a domain feature, not a driven adapter, and not a driving-adapter app — is not the developer's call to make unilaterally. Stop and confirm. This applies at every level of the tree, not just the top.
