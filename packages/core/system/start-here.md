# System — Start Here

The `system/` folder holds the core's **non-domain infrastructure**: the **driven infrastructure adapters** the domain sits on, *and* the cross-cutting **foundational primitives** it is built from (see [Foundational Primitives](#foundational-primitives) below). A driven adapter is code the domain calls *out* to — a database, a logger, a clock, an email provider, a job queue. Each adapter lives in its own subfolder and exposes a clean interface the domain layer calls without knowing the underlying technology, reached through `AppContext` (see [app-context.md](../app-context.md)).

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

## Foundational Primitives

Beyond adapters, `system/` is the home for the core's **foundational primitives** — the cross-cutting, non-domain building blocks the whole domain rests on but that belong to no single feature:

```
system/
  id.ts          - newId minter (via the id-source) + entityId schema helper + the prefix registry
  pagination.ts  - Page<T>, cursor codec, resolveLimit, toPage
  app-context.ts - the AppContext type + the generic ctx.transaction / assembly factory
```

These are *not* adapters and *not* a fourth role — they are the substrate the three roles rest on (the contract adapters plug into, the id system every entity uses). Two rules govern them:

- **The non-domain invariant.** Everything in `system/` — adapter or primitive — carries **no business rules and no domain vocabulary**. A primitive that encodes a domain rule (a status machine, a normalization policy, a capability matrix) is *not* foundational; it belongs to the feature that owns the rule. This invariant is what keeps `system/` from becoming a junk drawer.
- **Two access modes.** An **adapter** is *injected* and reached only through `ctx.system.*`, never imported. A **foundational primitive** is reached one of two ways: as a **runtime helper** on `ctx.system.helpers.*` when it reads an injectable seam worth controlling in tests (`timestamps` from the clock, `newId` from the id-source), or as a **direct import** when it runs where there is no `ctx` (a schema helper like `entityId`, a type like `Page<T>` or `AppContext`, or a pure util like `resolveLimit`). The rule for choosing between them is in [app-context.md → Injectable helper vs direct import](../app-context.md).

## The Relationship Rule

The domain layer calls into adapters. Adapters never import from the domain layer.

An adapter's job is to translate between the domain's needs and the external system's API. The domain stays unaware of which technology is underneath — it calls the adapter's interface, and the adapter handles the rest. This keeps the domain portable and the infrastructure replaceable. (This is the *driven* half of the dependency law in [code-placement.md](../../../code-placement.md); inbound *driving* adapters — controllers, CLI, MCP servers — live in `apps/`, never here.)

## What Each Adapter Should Expose

- A focused interface that expresses what the domain needs, not a thin wrapper around the external library's full API.
- No business logic. An adapter that makes decisions about domain rules has crossed into the wrong layer.

## Docs in This Folder

- [database.md](./database.md) — table definitions, Drizzle conventions, and migration standards
- [logging.md](./logging.md) — trace ID, log levels, structured logging, and what to log
- [end-here.md](./end-here.md) — the verify companion: confirm a driven adapter stays a clean, replaceable seam. You are usually routed here by the [review protocol](../../../review.md).
