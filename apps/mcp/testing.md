# Testing an MCP Server

An MCP server is tested in layers, each with its own tool, because each catches a different failure:
a tool doing the wrong thing, the protocol answered wrongly, a schema a client can't read, a deploy
that broke sign-in, a description that makes the model pick the wrong tool.

> Part of the [MCP server](./start-here.md) subtree. What the tools *do* is business behaviour, tested
> in the core at the level its test strategy chooses
> ([testing.md](../../packages/core/testing.md#choosing-the-level)); this doc covers what the MCP
> edge adds, and the tooling for it.

| Layer | Catches | Tool | Runs |
|---|---|---|---|
| [Edge tests](#edge-tests--in-process-through-the-deployed-handler) | the dispatcher, the token check, the audit record | `@modelcontextprotocol/client` in Vitest | every PR |
| [Leak sweep](#the-leak-sweep) | a result exposing an internal id, a secret or another user's data | the edge-test harness, over every listed tool | every PR |
| [Tool-surface snapshot](#tool-surface-snapshot) | an unintended change to what the model reads | a Vitest snapshot of `tools/list` | every PR |
| [Protocol conformance](#protocol-conformance-and-portable-schemas) | protocol answered against the spec | `@modelcontextprotocol/conformance` | every PR |
| [Portable schemas](#protocol-conformance-and-portable-schemas) | a schema valid but unreadable to some clients | MCP Inspector CLI `--strict` | every PR |
| [Deploy smoke test](#deploy-smoke-test) | a deploy that broke the endpoint or its auth | MCP Inspector CLI, `curl` | after each deploy |
| [By hand](#by-hand) | what only a person sees | MCP Inspector UI | while building |
| [Evals](#evals--does-the-model-pick-the-right-tool) | descriptions that lead the model astray | a real agent runtime and a scorer | on description changes; before a release |

Pin every tool's version in CI, as any dependency: a range drifts to a release nobody tested with.

## Edge tests — in-process, through the deployed handler

A real `Client` from `@modelcontextprotocol/client` whose transport's `fetch` calls the handler you
deploy (`handler.fetch`), in-process, with no port. The whole stack runs — token check, dispatcher,
core, database — and nothing is mocked but what the core already fakes for its own tests. A tool
function is never called directly: that skips everything this layer exists to test.

Cover:

- `tools/list`: every tool's name, schema and annotations;
- for the dispatcher: a success, a handled failure, an invalid argument, an unknown tool and a call
  over the [rate limit](./start-here.md#rate-limiting), each with its envelope and its
  [audit record](./tool-call-audit.md);
- a refusal through the transport: field-level messages, each with its hint beside it
  ([tool-design.md → Refusals that guide](./tool-design.md#refusals-that-guide)), and no hint on a
  success or an unanticipated error;
- a request with no token answered `401` with its challenge, and one with a token for another
  audience;
- every protocol era the server serves: with the default legacy posture, the same calls from a
  2025-era client as well (`versionNegotiation` on the `Client`).

Run them on a database pool of **one connection**: a tool that takes a second connection while its
transaction holds the first then deadlocks in the test, instead of under load in production.

The token check needs tokens: the test setup issues real ones (signed with test keys for signed
tokens, a stored grant for opaque ones), and the check runs unchanged — never a bypass of it.

## The leak sweep

Output schemas keep each tool's result lean, but each is written by hand, and one careless field —
a foreign key, a token column, a row joined from another tenant — leaks into every transcript the
tool ever answers. The sweep is the one test that looks at **every tool at once**, so a new tool
can't ship without passing it.

1. **Seed canaries.** The sweep's setup seeds the calling user's data with every secret a record
   can hold (password hash, API key, token, webhook secret) set to a recognisable marker
   (`LEAK-CANARY-<column>`), and seeds a **second user** — in a multi-tenant app, a second tenant —
   with data of the same shapes and its own markers.
2. **Call every listed tool.** The tool set comes from `tools/list` itself, never a hand-kept list,
   so a new tool joins the sweep on its own. Each tool's arguments come from a fixture keyed by tool
   name, pointing at the seeded records; **a listed tool with no fixture fails the sweep**, so
   skipping one is a visible decision. A write tool runs against a fresh seed, or in a transaction
   rolled back after it.
3. **Also call each tool once with invalid arguments.** A refusal can leak too — an attempted value,
   another user's id in a "not found".
4. **Walk every value** of every result, `structuredContent` and text content alike, at every depth,
   and fail when:
   - a canary marker appears anywhere;
   - a key named as an id (`id`, `*Id`) holds anything but a public id, as the
     [prefix registry](../../packages/core/identifiers.md) parses it;
   - any of the second user's markers or ids appears — data the caller's own `ctx.actor` may not see.

A failure names the tool, the path in its result and what was found, so the fix starts at the right
output schema.

## Tool-surface snapshot

A snapshot test writes `tools/list` (sorted by name: names, titles, descriptions, schemas,
annotations) to a committed file. A description or schema change is a change in what every model
reads, so it shows up in review as a diff, never silently. A name gone from the snapshot is a broken
promise to every client ([tool-design.md → The tool set](./tool-design.md#the-tool-set)), and CI
rejects it (`MCP-04`) unless the name moves to the snapshot's list of retired names, on purpose.

## Protocol conformance and portable schemas

Both run in CI against a server started locally, on loopback, with the explicit local bypass of the
token check ([authentication.md](./authentication.md#the-token-check)).

- **Conformance** — `@modelcontextprotocol/conformance`, the protocol's own suite, acts as a client
  and checks the server's answers against the spec revision it serves
  (`… server --url http://127.0.0.1:<port>/mcp --requirements 2026-07-28`; its GitHub Action runs the
  same). A known failure goes in a committed baseline (`--expected-failures`) with its reason; the
  suite fails on a new failure, and on a baselined one that now passes, so the baseline can't go
  stale.
- **Portable schemas** — the MCP Inspector CLI's `--strict` mode (`--cli … --method tools/list
  --strict`) fails on a schema that is valid but some clients reject (a type union where `anyOf` is
  portable). The schemas are generated from Zod, so a dependency bump can change them unseen.

## Deploy smoke test

After each deploy, against the deployed URL, a script checks:

1. a request with no token gets `401` with a `WWW-Authenticate` challenge, and the metadata
   documents it points to are served (`curl`);
2. with a smoke-test account's token, the MCP Inspector CLI connects, lists the tools and makes one
   read-only call (`--cli --transport http --server-url … --header 'Authorization: Bearer …'
   --method tools/call … --format json`), failing on its exit code.

The smoke-test account is a real account with no access to anyone else's data, and its token a
secret of the deploy pipeline. A project without one runs step 1 only, and says so.

## By hand

While building, the MCP Inspector UI (`npx @modelcontextprotocol/inspector`) shows every tool, calls
it, and walks the OAuth flow step by step.

## Evals — does the model pick the right tool?

The tests above prove the server answers correctly; only an eval shows whether a model, reading the
descriptions, calls the right tool with the right arguments. A project with more than a handful of
tools keeps one:

- **20–50 tasks in users' own words**, each with the tool and arguments expected — including tasks
  that need no tool, and tasks where the model should ask the user first;
- run through a **real agent runtime** connected to a seeded server (Claude Code non-interactive, the
  Claude Agent SDK, or another the project's users run);
- **scored in code** where possible (tool chosen, arguments valid); a rubric or a model judge only for
  the final answer;
- run after a description change and before a release — **never a merge gate**: a model's answers
  vary from run to run, so a failure is read, not obeyed. A failing task is fixed in the descriptions,
  not in the eval's prompt.

Any harness that does the above will do; MCPJam, promptfoo and Braintrust ship one, and a short script
on an agent SDK is enough to start.

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Testing*.
