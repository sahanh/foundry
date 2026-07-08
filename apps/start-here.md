# Apps — Start Here

`apps/` holds the **driving adapters** — the inbound entry points that call *into* the system. [code-placement.md](../code-placement.md) is the source of truth for what belongs here: each app is its own deployable unit, imports `packages/core` (and any graduated `packages/*`), holds no business rules, and is never imported by the core.

> **Which path is yours?** Doing **frontend/UI** work? Skip straight to **[apps/web/start-here.md](./web/start-here.md)** — the rest of this file is server-side only. Doing **backend transport** work (an HTTP route, a worker, a CLI, an MCP tool)? Stay here; you never need to open `apps/web/`.

Two families:

- **Server-side transport** — HTTP/GraphQL controllers (`api/`), CLI commands, queue consumers/workers, MCP servers. Each handler is thin: parse/receive → call a service or orchestration → format the response. The one translation it owns — outcome → response, error shape, and the collection contract — is **[transport-mapping.md](./transport-mapping.md)** (the edge application of [error-handling.md](../error-handling.md)). The rest of the edge's job is owned elsewhere: credential verification and actor resolution → [identity-and-access.md → Authentication is an edge concern](../packages/core/identity-and-access.md#authentication-is-an-edge-concern); tenant resolution (multi-tenant apps) → [multi-tenancy.md → Resolution is an edge concern](../packages/core/multi-tenancy.md#resolution-is-an-edge-concern); read-only `AppContext` assembly → [app-context.md → The Context Is a Statement of Fact](../packages/core/app-context.md#the-context-is-a-statement-of-fact); trace-ID ingestion and entry logging → [logging.md](../packages/core/system/logging.md).
- **The frontend client UI** (`web/`) — also a driving adapter, with its own subtree: **[apps/web/start-here.md](./web/start-here.md)**.

Deferred: general server-side app guidance beyond the docs above (bootstrap conventions, per-transport scaffolding) — until written, the owners linked above plus [end-here.md](./end-here.md) govern.

When a change to a **server-side** app is complete, verify against [end-here.md](./end-here.md); a **frontend** change verifies against [apps/web/end-here.md](./web/end-here.md). You are usually routed to the right one by the [review protocol](../review.md).
