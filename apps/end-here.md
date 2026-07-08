# End Here — `apps/` (server-side transport)

Verify companion to [start-here.md](./start-here.md), for a **server-side driving adapter** (HTTP/GraphQL controller, CLI command, queue consumer, MCP tool handler). A box you cannot tick is a blocker.

> **Frontend change?** `apps/web/` verifies against [apps/web/end-here.md](./web/end-here.md) instead.

---

## Placement → [code-placement.md](../code-placement.md)
- [ ] Inbound entry point lives in `apps/` — not beside feature folders, not in `system/` — [code-placement.md](../code-placement.md#the-topology)
- [ ] App imports the core (`@app/core`), never the reverse — [code-placement.md](../code-placement.md#layering-three-roles-one-direction)

## Handler / controller → [code-placement.md](../code-placement.md)
- [ ] Handler thin: parse request → call service/orchestration → format response, no business rules — [transport-mapping.md](./transport-mapping.md)
- [ ] Core's Zod schemas reused at the boundary, input shapes never redefined (why: redefinitions drift) — [code-placement.md](../code-placement.md)
- [ ] Business-rule validation owned by the domain — controller parses with reused schemas, declares no rules — [error-handling.md](../error-handling.md#the-principles) (principle 4)
- [ ] MCP server: transport/bootstrap (server, session lifecycle, `AppContext` assembly) separate from per-tool handlers — [code-placement.md](../code-placement.md)

## Response & error mapping → [transport-mapping.md](./transport-mapping.md)
- [ ] One shared error handler (no per-route `try/catch`); one envelope for validation failures (field-keyed) and domain exceptions (one message); `traceId` echoed on it — [transport-mapping.md](./transport-mapping.md#the-error-response-structure)
- [ ] Every anticipated failure a `4xx` — validation and domain exceptions both `422` (or a project-chosen 400/422 split), never `500` — [transport-mapping.md](./transport-mapping.md#mapping-outcomes-to-a-response-http)
- [ ] `500` reserved for the unanticipated — logged with full context, generic body (no stack, attempted value, or other tenant's id) — [transport-mapping.md](./transport-mapping.md#mapping-outcomes-to-a-response-http)
- [ ] Authentication failure = `401` decided at the edge, not a domain exception mapped downstream — [transport-mapping.md](./transport-mapping.md#mapping-outcomes-to-a-response-http)
- [ ] Non-HTTP: handled/unanticipated split maps to the transport idiom — CLI exit code, MCP `isError`, queue permanent reject (never retry a domain failure) — [transport-mapping.md](./transport-mapping.md#other-transports)
- [ ] Handled failure (`4xx`) logged at `warn` with the failure code + `traceId` — never silent — [logging.md](../packages/core/system/logging.md#at-the-entry-point-controller--queue-consumer--scheduler)

## Collection endpoints → [transport-mapping.md](./transport-mapping.md)
- [ ] Core's filter/sort/pagination schema reused (`.strict()` — unknown key fails), not redefined; limit/cursor via `system/` primitives (`resolveLimit`, cursor codec), cursor opaque, never a client offset — [transport-mapping.md](./transport-mapping.md#collection-endpoints--pagination-filtering-sorting)
- [ ] `Page<T>` serialized (items + `nextCursor`); service owns the legal filter/sort set and every invisible predicate (`deletedAt IS NULL`, tenant scope, authorization) — [transport-mapping.md](./transport-mapping.md#collection-endpoints--pagination-filtering-sorting)
- [ ] Controller invents no predicate ("if param `X`, also filter `Y`" is business logic → service) — [transport-mapping.md](./transport-mapping.md#collection-endpoints--pagination-filtering-sorting)

## Entry-point logging → [system/logging.md](../packages/core/system/logging.md)
- [ ] `traceId` ingested from the request (or generated) and propagated into `AppContext` — [logging.md](../packages/core/system/logging.md#trace-id)
- [ ] Operation logged on entry; outcome with timing — [logging.md](../packages/core/system/logging.md#at-the-entry-point-controller--queue-consumer--scheduler)

## Authentication & actor → [identity-and-access.md](../packages/core/identity-and-access.md)
- [ ] Credential (session/token/API key) verified at the edge; auth-provider SDK kept out of `@app/core` — [identity-and-access.md](../packages/core/identity-and-access.md#authentication-is-an-edge-concern)
- [ ] Vendor-neutral `actor` resolved and set on `AppContext` before any service/orchestration runs — [identity-and-access.md](../packages/core/identity-and-access.md#the-actor--ctxactor)
- [ ] Assembly read-only — verified claims resolved to an existing actor (and tenant), no writes on the binding path — [app-context.md](../packages/core/app-context.md#the-context-is-a-statement-of-fact)
- [ ] Verified-but-unprovisioned identity rejected or routed to onboarding; provisioning confined to the dedicated identity-flow adapter (webhook/onboarding), no other handler creating a user — [identity-and-access.md](../packages/core/identity-and-access.md#identity-lifecycle--where-a-user-comes-from)
- [ ] Per-resource authorization left to a domain guard; handler does at most coarse authN/route gating — [identity-and-access.md](../packages/core/identity-and-access.md#authorization-is-a-domain-concern)

## Tenant scope → [multi-tenancy.md](../packages/core/multi-tenancy.md)
> Multi-tenant apps only; single-tenant apps skip (no `ctx.tenant`).
- [ ] `ctx.tenant` set during assembly from the request, before any service runs; never set/overridden by a service — [multi-tenancy.md](../packages/core/multi-tenancy.md#resolution-is-an-edge-concern)
- [ ] Request resolving to no tenant (when required) rejected at the edge, not passed to the domain — [multi-tenancy.md](../packages/core/multi-tenancy.md#resolution-is-an-edge-concern)
- [ ] Cross-tenant / platform-admin paths use an explicit elevated context, never a handler-constructed unscoped `ctx.system.db` — [multi-tenancy.md](../packages/core/multi-tenancy.md#the-one-unscoped-path)

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless.
