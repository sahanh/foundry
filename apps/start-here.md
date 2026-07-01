# Apps — Start Here

> **Stub.** This folder's guidelines are not written yet. For now, [code-placement.md](../code-placement.md) is the source of truth for what belongs here and why.

`apps/` holds the **driving adapters** — the inbound entry points that call *into* the domain core: web/HTTP controllers, CLI commands, queue consumers/workers, and MCP servers. Each app is its own deployable unit with its own `src/`, and imports `packages/core` (and any graduated `packages/*`). The core never imports an app.

An app is thin: parse/receive the transport request, call a service or orchestration, format the response. It holds no business rules.

**Content to follow.** This doc will eventually collect the driving-adapter guidance that currently lives scattered elsewhere — thin-controller rules, entry-point logging and trace-ID ingestion, "validation in integrators only," and reusing the core's schemas at the boundary rather than redefining input shapes.

When a change here is complete, verify against [end-here.md](./end-here.md) — the verify companion to this file. You are usually routed there by the [review protocol](../review.md).
