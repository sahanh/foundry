# System — Start Here

The `system/` folder holds the **driven infrastructure adapters** that live inside the domain core. A driven adapter is code the domain calls *out* to — a database, a logger, a clock, an email provider, a job queue. Each adapter lives in its own subfolder and exposes a clean interface the domain layer calls without knowing the underlying technology, reached through `AppContext` (see [app-context.md](../app-context.md)).

> **Where this fits.** These are the *driven* (outbound) adapters the core depends on. The full picture — driving vs driven adapters, the one-direction dependency law, and when an adapter stays here versus **graduates** to its own top-level `packages/<name>/` — is in [code-placement.md](../../../code-placement.md). This folder is the default home for a driven adapter; it graduates out only on a real signal (reused beyond the core, heavy enough to own its lifecycle, an engine).

## What Lives Here

Each subfolder is one adapter:

```
system/
  db/       - database (see database.md)
  logger/   - logging — required (see logging.md)
  clock/    - injectable now-source (see app-context.md → The Clock)
```

**Required adapters** must be implemented before any feature work begins:
- `logger/` — logging is mandatory in every application. See logging.md.

Additional adapters are added as the application needs them — one subfolder per capability. The subfolder name should describe the capability, not the vendor (`email/` not `sendgrid/`, `queue/` not `bullmq/`).

## The Relationship Rule

The domain layer calls into adapters. Adapters never import from the domain layer.

An adapter's job is to translate between the domain's needs and the external system's API. The domain stays unaware of which technology is underneath — it calls the adapter's interface, and the adapter handles the rest. This keeps the domain portable and the infrastructure replaceable. (This is the *driven* half of the dependency law in [code-placement.md](../../../code-placement.md); inbound *driving* adapters — controllers, CLI, MCP servers — live in `apps/`, never here.)

## What Each Adapter Should Expose

- A focused interface that expresses what the domain needs, not a thin wrapper around the external library's full API.
- No business logic. An adapter that makes decisions about domain rules has crossed into the wrong layer.

## Docs in This Folder

- [database.md](./database.md) — table definitions, Drizzle conventions, and migration standards
- [logging.md](./logging.md) — trace ID, log levels, structured logging, and what to log
