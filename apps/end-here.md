# End Here — `apps/` (server-side transport)

The verify companion to [start-here.md](./start-here.md), for a **server-side driving adapter** — an inbound transport entry point (HTTP/GraphQL controller, CLI command, queue consumer, MCP tool handler). `start-here` is where you begin; this is where you confirm the app stays thin and never absorbs business logic.

> **Frontend change?** These boxes are for server-side transport. A change to the frontend client UI (`apps/web/`) verifies against **[apps/web/end-here.md](./web/end-here.md)** instead — the review protocol routes you to the right one.

> `apps/start-here.md` is still a stub, so the authoritative rules live in [code-placement.md](../code-placement.md) (topology, "MCP is a driving adapter", thin-controller guidance). These checks distil them.

You usually arrive here routed by the root review protocol when it maps a touch under `apps/`. A box you cannot tick is a blocker.

---

## Placement → [code-placement.md](../code-placement.md)
- [ ] Does this inbound entry point live in `apps/` — **not** beside feature folders and **not** in `system/`?
- [ ] Does the app import the core (`@app/core`) and never the reverse — dependency points inward?

## Handler / controller → [code-placement.md](../code-placement.md)
- [ ] Is the handler **thin**: parse/receive the transport request → call a service or orchestration → format the response (the one translation it owns — see [transport-mapping.md](./transport-mapping.md)), with **no business rules**?
- [ ] Does it **reuse the core's Zod schemas** at the boundary rather than redefining input shapes (which silently drift from the domain's real constraints)?
- [ ] Is validation **delegated to the domain**, not duplicated in the controller?
- [ ] For an MCP server: is transport/bootstrap (server + session lifecycle + `AppContext` assembly) kept separate from the per-tool handlers?

## Response & error mapping → [transport-mapping.md](./transport-mapping.md)
> The edge application of the [error-handling strategy](../error-handling.md). See [transport-mapping.md](./transport-mapping.md) → *The error response structure* / *Mapping outcomes to a response*.
- [ ] Does a **single shared error handler** (not a per-route `try/catch`) turn a thrown outcome into the response — with **one envelope shape** for both a validation failure (field-keyed messages) and a domain exception (one message)?
- [ ] Is every **anticipated** failure a `4xx` — a schema/validation failure and a domain exception both `422` (or a project-chosen 400/422 split) — and **never** a `500`?
- [ ] Is a `500` reserved for the **unanticipated** (a bug, an infra fault), logged with full context and returning a **generic** body that leaks no stack trace, attempted value, or other tenant's id?
- [ ] Is the `traceId` echoed on the error response, so a caller can quote it back to the logs?
- [ ] Is an **authentication** failure a `401` decided at the edge, not a domain exception mapped downstream?

## Collection endpoints → [transport-mapping.md](./transport-mapping.md)
- [ ] Does the handler **reuse the core's** filter/sort/pagination input schema (`.strict()`, so an unknown key is a validation failure) rather than redefining it at the edge?
- [ ] Are the limit and cursor handled via the `system/` pagination primitives (`resolveLimit`, the cursor codec) — the cursor **opaque**, never a client-constructed offset?
- [ ] Is the returned **`Page<T>`** serialized (items + `nextCursor`), with the service — not the controller — owning the legal filter/sort set and every invisible predicate (`deletedAt IS NULL`, tenant scope, authorization)?
- [ ] Does the controller **invent no predicate** (an "if param `X`, also filter `Y`" is business logic, and belongs in the service)?

## Entry-point logging → [system/logging.md](../packages/core/system/logging.md)
- [ ] Is a `traceId` ingested from the incoming request (or generated) and propagated into the `AppContext`?
- [ ] Is the incoming operation logged on entry, and the outcome logged with timing?

## Authentication & actor → [identity-and-access.md](../packages/core/identity-and-access.md)
- [ ] Is the caller's credential (session / token / API key) verified at the edge, with the auth-provider SDK kept **out of** `@app/core`?
- [ ] Is a vendor-neutral `actor` resolved and set on `AppContext` before any service or orchestration runs — the actor analogue of `traceId` ingestion above?
- [ ] Is `AppContext` assembly **read-only** — verified claims resolved to an existing actor (and tenant), with no user/workspace writes on the binding path? ([app-context.md](../packages/core/app-context.md) → *The Context Is a Statement of Fact*)
- [ ] Is a verified-but-unprovisioned identity rejected or routed to onboarding at the edge, with provisioning confined to the **dedicated identity-flow adapter** (webhook / onboarding endpoint) — no other handler creating a user on the way to its real work? ([identity-and-access.md](../packages/core/identity-and-access.md) → *Identity lifecycle*)
- [ ] Does the handler leave the real per-resource authorization decision to a domain guard, doing at most a coarse authN / route gate itself?

## Tenant scope → [multi-tenancy.md](../packages/core/multi-tenancy.md)
> Multi-tenant apps only — a single-tenant app has no `ctx.tenant` and skips this section.
- [ ] Is `ctx.tenant` derived from the request and set during `AppContext` assembly **before any service or orchestration runs** — never set or overridden by a service (the tenant analogue of actor resolution above)?
- [ ] Is a request that resolves to **no** tenant (when one is required) rejected at the edge, not passed to the domain with an absent scope?
- [ ] Is every cross-tenant / platform-admin path an **explicit elevated context**, not an ad-hoc unscoped `ctx.system.db` a handler constructs itself?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
