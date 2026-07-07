# End Here — `apps/`

The verify companion to [start-here.md](./start-here.md), for a **driving adapter** — an inbound entry point (HTTP/GraphQL controller, CLI command, queue consumer, MCP tool handler). `start-here` is where you begin; this is where you confirm the app stays thin and never absorbs business logic.

> `apps/start-here.md` is still a stub, so the authoritative rules live in [code-placement.md](../code-placement.md) (topology, "MCP is a driving adapter", thin-controller guidance). These checks distil them.

You usually arrive here routed by the root review protocol when it maps a touch under `apps/`. A box you cannot tick is a blocker.

---

## Placement → [code-placement.md](../code-placement.md)
- [ ] Does this inbound entry point live in `apps/` — **not** beside feature folders and **not** in `system/`?
- [ ] Does the app import the core (`@app/core`) and never the reverse — dependency points inward?

## Handler / controller → [code-placement.md](../code-placement.md)
- [ ] Is the handler **thin**: parse/receive the transport request → call a service or orchestration → format the response, with **no business rules**?
- [ ] Does it **reuse the core's Zod schemas** at the boundary rather than redefining input shapes (which silently drift from the domain's real constraints)?
- [ ] Is validation **delegated to the domain**, not duplicated in the controller?
- [ ] For an MCP server: is transport/bootstrap (server + session lifecycle + `AppContext` assembly) kept separate from the per-tool handlers?

## Entry-point logging → [system/logging.md](../packages/core/system/logging.md)
- [ ] Is a `traceId` ingested from the incoming request (or generated) and propagated into the `AppContext`?
- [ ] Is the incoming operation logged on entry, and the outcome logged with timing?

## Authentication & actor → [identity-and-access.md](../packages/core/identity-and-access.md)
- [ ] Is the caller's credential (session / token / API key) verified at the edge, with the auth-provider SDK kept **out of** `@app/core`?
- [ ] Is a vendor-neutral `actor` resolved and set on `AppContext` before any service or orchestration runs — the actor analogue of `traceId` ingestion above?
- [ ] Does the handler leave the real per-resource authorization decision to a domain guard, doing at most a coarse authN / route gate itself?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
