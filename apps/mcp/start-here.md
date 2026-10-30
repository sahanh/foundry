# Start Here — `apps/mcp` (MCP server)

`apps/mcp` is the **MCP server**: the channel through which AI assistants (Claude Code, Codex, Cursor,
an agent of the project's own) drive the system. Like every app under `apps/`, it is a **driving
adapter**: each tool calls *into* a service or orchestration and holds no business rules. Structurally
it is a REST route whose caller is a model
([code-placement.md → Worked Examples](../../code-placement.md#worked-examples)).

> **This is a skippable branch.** If your work is not the MCP server, you do **not** need to read this
> file — stop at [apps/start-here.md](../start-here.md). MCP work reads both: the server-side rules
> there (thin handlers, outcome mapping, edge authentication, logging) apply here unchanged, and this
> subtree adds what is particular to MCP.

This file owns the toolchain, the layout, the transport and the dispatcher. **The concern docs:**

- **[authentication.md](./authentication.md)** — the MCP server as an OAuth resource server: the token
  check, connections, and the criteria for an authorization server.
- **[tool-design.md](./tool-design.md)** — what a tool offers and returns, writes that are safe for a
  model to make, and refusals that tell the model how to fix its call.
- **[tool-call-audit.md](./tool-call-audit.md)** — the durable record of every tool call, and its
  retention.
- **[testing.md](./testing.md)** — the test layers an MCP server adds, and the tooling for each.

## The toolchain — recommended, with the bar a substitute must clear

Every Foundry MCP server starts from the recommended toolchain, so projects share one set of patterns.
A project may pick something else when it has a reason (an identity provider it already runs, a
runtime the default doesn't support), **as long as the substitute meets every criterion in its row**
and the choice is recorded where the project records decisions.

| Concern | Recommended | A substitute must |
|---|---|---|
| **MCP SDK** | `@modelcontextprotocol/server` (v2), the protocol's official TypeScript SDK | implement the current spec revision (2026-07-28): stateless Streamable HTTP, a fresh server per request, tool input validated from a schema, tool failures as `isError` results |
| **HTTP mount** | the SDK's helper for the framework `apps/api` already uses: `@modelcontextprotocol/hono`, `/express`, `/fastify`, or `/node` (plain `node:http`) | validate the `Host` and `Origin` headers in front of the handler |
| **Schemas** | the core's own Zod schemas ([code-placement.md](../../code-placement.md#layering-three-roles-one-direction)) | — never a substitute: tool inputs reuse the core's schemas |
| **Authorization server** | Better Auth (`better-auth` with its `jwt()` plugin, `@better-auth/mcp`, `@better-auth/cimd`), mounted where the project's sign-in already lives | meet every [authorization-server criterion](./authentication.md#authorization-server-criteria) |
| **Token check** | Better Auth's `requireMcpAuth` (or `createMcpProtectedRequestHandler` when the MCP server runs apart from the auth server); the SDK's `requireBearerAuth` with another server | answer a missing or invalid token `401` with a `WWW-Authenticate` challenge naming the resource metadata URL; reject a token issued for another audience, or with no expiry |
| **Edge tests** | `@modelcontextprotocol/client` driving the deployed handler in-process, in Vitest | exercise the real handler and token check, not tool functions called directly |
| **Conformance** | `@modelcontextprotocol/conformance`, the protocol's own suite | check the server against the spec revision it serves |
| **Schemas, smoke tests, by hand** | the MCP Inspector (`@modelcontextprotocol/inspector`): CLI and UI | — |
| **Evals** | any harness running a real agent runtime ([testing.md → Evals](./testing.md#evals--does-the-model-pick-the-right-tool)) | score tool choice and arguments in code |

**Not on v1.** `@modelcontextprotocol/sdk` (v1, the pre-July 2026 package) gets only fixes, with
security fixes guaranteed until at least 2027-01-27. A new server starts on v2; a server already on v1
plans its upgrade before that date.

## Where the parts live

The MCP server only **checks** tokens. Everything that **issues** them belongs to the identity
provider, wherever the project's sign-in already lives:

- **`apps/mcp/`** — the MCP endpoint, the protected-resource metadata, the token check, the tools.
- **The authorization server** — Better Auth's OAuth endpoints, mounted with the rest of the
  project's auth (usually `apps/api/`). Its plugins and SDK stay at the edge, never in
  `packages/core` ([identity-and-access.md → Authentication is an edge concern](../../packages/core/identity-and-access.md#authentication-is-an-edge-concern)).
- **The sign-in and consent pages** — screens like any other, in `apps/web/`.

Inside `apps/mcp/src/`:

```
main.ts              the process: configuration, the HTTP host, the routes
server.ts            the factory: a fresh McpServer per request, with the dispatcher installed
context.ts           the verified token → actor (and tenant) → AppContext, read-only
dispatch.ts          the tool dispatcher: answers tools/list and every tools/call
tools/
  tool.ts            what a tool definition is
  index.ts           every tool, in the order tools/list answers them
  <feature>.ts       the tools over one core feature, mirroring packages/core/src/<feature>/
instructions.ts      the server's instructions text (when it has any)
```

Transport and bootstrap stay apart from the tools: `main.ts`, `server.ts`, `context.ts` and
`dispatch.ts` know nothing of any feature, and a tool file knows nothing of HTTP or tokens.

## The transport — stateless Streamable HTTP

- **One handler from a per-request factory.** `createMcpHandler(factory)` builds a fresh `McpServer`
  for every request and holds nothing between them. The server keeps no session map and no per-caller
  state in memory, so any instance serves any request and it scales behind a plain load balancer.
  Shared resources (the database pool, the logger) are created once at module scope; the factory stays
  cheap and has no side effects.
- **Mounted, never hand-wired.** Mount the handler with the SDK's helper for the framework
  (`createMcpHonoApp`, `createMcpExpressApp`, …), which validates `Host` and `Origin`. Bound beyond
  loopback, name the public hosts (`allowedHosts`). Building the transport, sessions and routing on
  raw `node:http` re-implements what the SDK already ships, and a 2025-era session map pins every
  client to one process.
- **Legacy clients are a recorded choice.** The handler's default (`legacy: 'stateless'`) also serves
  2025-era clients, statelessly; `legacy: 'reject'` serves only 2026-07-28. Keep the default while a
  client the project targets still speaks 2025 protocol, and record when you switch.
- **Load is bounded before the token is read.** Cap the requests in flight at what the database pool
  can serve, answering the rest `503` with `Retry-After`, and keep the transport's body limit
  (`maxRequestBodySize`) at or below its default. A health check sits outside the cap.
- **Its own deployable.** Like every app, `apps/mcp` is its own process, so tool traffic and the API
  never share load or restarts.
- **stdio only for a local server.** A server that runs on the user's machine (one that reads local
  files) speaks stdio (`serveStdio`) from the same factory. A server reaching the system's data is
  remote, over HTTP, behind the token check.

## The tool dispatcher

Every tool call goes through **one dispatcher** (`dispatch.ts`), the MCP equivalent of the API's
shared error handler. The factory installs it as the handler for `tools/list` and `tools/call` on the
server's protocol layer (`mcp.server.setRequestHandler`); tools are never registered one by one with
`registerTool`.

Why not `registerTool`: for a registered tool, the SDK rejects bad arguments and turns a thrown error
into a result itself, before any code of yours sees the call. A refused call would then escape the
logs and the [audit record](./tool-call-audit.md), a validation failure would not carry the envelope,
and an unanticipated error's own text would reach the model. With one dispatcher, every call passes
through code you own, an unknown tool's included.

`tools/list` answers from the tool definitions, each tool's input and output schema turned into JSON
Schema from the core's Zod schema (`z.toJSONSchema`), so what is advertised and what is parsed are one
schema. For each `tools/call` the dispatcher:

1. assembles the call's `AppContext` from the verified token, with its own `traceId`;
2. logs the call on entry
   ([logging.md → At the entry point](../../packages/core/system/logging.md#at-the-entry-point-controller--queue-consumer--scheduler));
3. applies the [rate limit](#rate-limiting), before anything else is read;
4. finds the tool by name, refusing an unknown one with the names there are;
5. parses the arguments with the tool's input schema;
6. runs the tool's one service or orchestration call, and shapes the result with its output schema;
7. maps any failure to an `isError` result
   ([transport-mapping.md → Other transports](../transport-mapping.md#other-transports)), a refusal's
   messages each with their hint
   ([tool-design.md → Refusals that guide](./tool-design.md#refusals-that-guide));
8. logs the outcome with its timing, and records the call
   ([tool-call-audit.md](./tool-call-audit.md)).

A tool file therefore holds only definitions: name, title, description, input and output schema,
annotations, and a one-line call into the core. Resources and prompts, when a server has them, may use
`registerResource` and `registerPrompt`: their failures are protocol errors the model never sees.

## Rate limiting

A model can loop, so every tool call counts against a limit **per connection** (one user's one
client), not per user: one runaway assistant doesn't block the same user's others. The default is 60
calls a minute in a fixed window, on the store the project already shares between instances (Redis);
change it as a recorded decision. A call over the limit is refused as an ordinary `isError` result
saying how many seconds to wait, never an HTTP `429` the model can't read, and it is
[audited](./tool-call-audit.md) like any refusal.

## Not yet covered

Resources, prompts, elicitation, sampling and subscriptions are not yet standardised. A server adds
them when a real need appears, in the same factory and following the rules above.

When a change here is complete, verify against [end-here.md](./end-here.md) — and the server-side
checks in [apps/end-here.md](../end-here.md), which apply too. You are usually routed there by the
[review protocol](../../review.md).
