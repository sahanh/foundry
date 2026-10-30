# End Here — `apps/mcp` (MCP server)

Verify companion to [start-here.md](./start-here.md), for a change to the **MCP server**. It adds to
the server-side checks in [apps/end-here.md](../end-here.md), which apply too. A box you cannot tick
is a blocker.

Deterministic rules (tool calls dispatched only by the dispatcher, no session transport, audit
records append-only, no published tool name removed, protocol conformance, portable schemas, no `try`
in a tool file) are CI checks, not boxes —
[setup/ci-verification.md](../../setup/ci-verification.md); without CI for them,
[review.md](../../review.md) Step 0 checks them.

---

## Toolchain → [start-here.md](./start-here.md#the-toolchain--recommended-with-the-bar-a-substitute-must-clear)
- [ ] Each part of the toolchain is the recommended one, or a recorded substitute meeting every criterion in its row — [start-here.md](./start-here.md#the-toolchain--recommended-with-the-bar-a-substitute-must-clear)
- [ ] A new server is on the v2 SDK, never v1 (`@modelcontextprotocol/sdk`) — [start-here.md](./start-here.md#the-toolchain--recommended-with-the-bar-a-substitute-must-clear)

## Placement & transport → [start-here.md](./start-here.md#where-the-parts-live)
- [ ] `apps/mcp` only checks tokens; the authorization server lives with the project's auth, its sign-in and consent pages in `apps/web` — [start-here.md](./start-here.md#where-the-parts-live)
- [ ] Transport and bootstrap (`main.ts`, `server.ts`, `context.ts`, `dispatch.ts`) know no feature; a tool file knows no HTTP or token — [start-here.md](./start-here.md#where-the-parts-live)
- [ ] Tools grouped by core feature, one file per feature under `tools/` — [start-here.md](./start-here.md#where-the-parts-live)
- [ ] A fresh server per request from a side-effect-free factory; nothing per-caller held in memory between requests — [start-here.md](./start-here.md#the-transport--stateless-streamable-http)
- [ ] Mounted with the SDK's framework helper; `Host` and `Origin` validated, public hosts named when bound beyond loopback — [start-here.md](./start-here.md#the-transport--stateless-streamable-http)
- [ ] Requests in flight capped at what the database pool serves (`503` + `Retry-After`); body limit at or below the default — [start-here.md](./start-here.md#the-transport--stateless-streamable-http)
- [ ] The legacy-client posture (serve 2025 clients statelessly, or reject them) is the default or a recorded choice — [start-here.md](./start-here.md#the-transport--stateless-streamable-http)

## Authentication → [authentication.md](./authentication.md)
- [ ] The token check runs before the handler; a missing, invalid, expired or wrong-audience token is a `401` challenge naming the resource metadata URL, which is served — [authentication.md](./authentication.md#the-token-check)
- [ ] A token is accepted only for this server's audience, and never forwarded to another API — [authentication.md](./authentication.md#the-token-check)
- [ ] The verified subject resolves to `ctx.actor` (and `ctx.tenant`) read-only, before any tool runs — [identity-and-access.md](../../packages/core/identity-and-access.md#identity-lifecycle--where-a-user-comes-from)
- [ ] Any local bypass of the token check is explicit and refuses to start outside loopback — [authentication.md](./authentication.md#the-token-check)
- [ ] Clients register by CIMD; dynamic client registration off, or on with a recorded reason; one scope unless a recorded need — [authentication.md](./authentication.md#connections-and-tokens)
- [ ] Consent asked on every sign-in, naming the client, its metadata document's domain and the signed-in account — [authentication.md](./authentication.md#connections-and-tokens)
- [ ] Token lifetime (signed and short-lived, or opaque and checked per call) is the default or a recorded choice — [authentication.md](./authentication.md#connections-and-tokens)
- [ ] A substitute authorization server meets every criterion — [authentication.md](./authentication.md#authorization-server-criteria)

## Tools → [tool-design.md](./tool-design.md)
- [ ] Each tool makes one service or orchestration call; no tool for what the assistant can compute from another's results — [tool-design.md](./tool-design.md#the-tool-set)
- [ ] Names are `verb_noun` in snake case; no published name renamed (a replacement added beside it instead) — [tool-design.md](./tool-design.md#the-tool-set)
- [ ] All four annotations declared, and true: a tool that writes is never `readOnlyHint`; server `instructions` short, covering only what spans tools — [tool-design.md](./tool-design.md#the-tool-set)
- [ ] The description says what the tool does, when to choose it, what it returns, the caller's rules and hidden side effects, with one example tested against the tool's schemas — [tool-design.md](./tool-design.md#descriptions)
- [ ] Writes are retry-safe (set, not toggle); a batch is all or nothing and capped; a large draft has a check-only twin that writes nothing — [tool-design.md](./tool-design.md#writes)
- [ ] An `outputSchema` derived from the core's schema, only the fields an assistant acts on; the result parsed with it and returned as `structuredContent` with the same value as JSON text — [tool-design.md](./tool-design.md#results)
- [ ] Only public ids cross; a list tool returns `Page<T>` from the core's filter and pagination schema — [tool-design.md](./tool-design.md#results)

## Refusals that guide → [tool-design.md](./tool-design.md#refusals-that-guide)
- [ ] A refusal names every problem at once, each at its exact field path, saying nothing of the fields that are right; a tool taking a large payload checks all of it before refusing — [tool-design.md](./tool-design.md#refusals-that-guide)
- [ ] Each refusal message carries a hint beside it (a valid value's shape with an example, the tool that produces one, or the docs topic to read), or a deliberate none — [tool-design.md](./tool-design.md#refusals-that-guide)
- [ ] Hints added by one pure mapper in `apps/mcp`; the core's message unchanged and naming no tool — [tool-design.md](./tool-design.md#refusals-that-guide)
- [ ] A new or reworded core message, or a changed input schema, a tool can surface has its hint decided in the same change — [tool-design.md](./tool-design.md#refusals-that-guide)
- [ ] A test holds every refusal a tool can raise to a hint or a deliberate none, fails on a hint naming a tool the server lacks, and checks each example value is one the product accepts — [tool-design.md](./tool-design.md#refusals-that-guide)

## The tool dispatcher → [start-here.md](./start-here.md#the-tool-dispatcher)
- [ ] `tools/list` answers from the tool definitions, schemas derived from the same Zod schemas the calls are parsed with — [start-here.md](./start-here.md#the-tool-dispatcher)
- [ ] Each call: context with a `traceId`, entry logged, rate limit, unknown tool refused, arguments parsed, one core call, failure mapped, outcome logged with timing, call recorded — [start-here.md](./start-here.md#the-tool-dispatcher)
- [ ] Failures carry the envelope (field-keyed for invalid arguments); an unanticipated one, a schema failure from inside the core included, reaches the model as the generic message — [transport-mapping.md](../transport-mapping.md#other-transports)
- [ ] Rate limit per connection on a shared store (60 a minute, or a recorded value); over it, an `isError` result saying how long to wait — [start-here.md](./start-here.md#rate-limiting)

## Tool-call audit → [tool-call-audit.md](./tool-call-audit.md)
- [ ] One record per authenticated call, every outcome included: id, time, user (and tenant), client (and connection), sanitised tool name as sent, outcome and code, duration, `traceId` — [tool-call-audit.md](./tool-call-audit.md#what-a-record-holds)
- [ ] No arguments or results recorded, or a redacted copy under a recorded decision and shorter retention — [tool-call-audit.md](./tool-call-audit.md#what-a-record-holds)
- [ ] Written after the call, outside its transaction, attributed from the token; a failed write logged at `error` while the call still answers, or a recorded fail-closed decision — [tool-call-audit.md](./tool-call-audit.md#how-it-is-written)
- [ ] Records owned by a core feature, its table in `system/db/`; a user reads only their own, anything wider through an elevated path — [tool-call-audit.md](./tool-call-audit.md#where-the-code-lives)
- [ ] A retention window decided and recorded (90 days if nothing argues otherwise), read from configuration — [tool-call-audit.md](./tool-call-audit.md#retention--decided-from-the-business-case)
- [ ] A scheduled purge in `apps/worker/`, at least daily, hard-deleting expired records in bounded batches as the `system` actor; archived first when the window is long — [tool-call-audit.md](./tool-call-audit.md#retention--decided-from-the-business-case)
- [ ] The erasure policy for a user's audit records decided and recorded — [tool-call-audit.md](./tool-call-audit.md#retention--decided-from-the-business-case)

## Testing → [testing.md](./testing.md)
- [ ] Edge tests drive the deployed handler through a real `Client` in-process, never a tool function directly: `tools/list`; a success, a handled failure, an invalid argument, an unknown tool and a rate-limited call (each with its envelope and audit record); a refusal's hints; `401` without a token and for another audience; every protocol era served — [testing.md](./testing.md#edge-tests--in-process-through-the-deployed-handler)
- [ ] Tests use real tokens from the test setup, never a bypass of the check; run on a one-connection database pool — [testing.md](./testing.md#edge-tests--in-process-through-the-deployed-handler)
- [ ] The leak sweep seeds canaries and a second user, calls every listed tool (a tool with no fixture fails) with valid and invalid arguments, and fails on a canary, a non-public id or the other user's data — [testing.md](./testing.md#the-leak-sweep)
- [ ] A committed `tools/list` snapshot, updated in the same change as any description, schema or name — [testing.md](./testing.md#tool-surface-snapshot)
- [ ] A deploy smoke test: the `401` challenge and metadata documents, and with a smoke-test account, a list and one read-only call (or the gap stated) — [testing.md](./testing.md#deploy-smoke-test)
- [ ] A server with more than a handful of tools keeps an eval of tool choice, run on description changes and before a release, never as a merge gate — [testing.md](./testing.md#evals--does-the-model-pick-the-right-tool)
