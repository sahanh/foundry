# Tool Design

A tool is read by a model, not a developer: its name, description and schema are the only manual the
model gets, and it chooses and calls tools by reading them. When a call is refused, the refusal is the
next thing the model reads. This doc covers what a tool offers, returns, and says when it refuses.

> Part of the [MCP server](./start-here.md) subtree. A tool's handler is as thin as any controller
> ([transport-mapping.md](../transport-mapping.md)); everything about one call that isn't the tool's
> own business — parsing, mapping, logging, the audit record — is the
> [dispatcher's](./start-here.md#the-tool-dispatcher).

## The tool set

- **One tool, one service or orchestration call.** A tool maps a user-meaningful operation onto the
  core; it is not a mirror of every REST route, and not a generic "query anything" tool. When a task
  an assistant needs spans several core calls, that is an orchestration in the core, which the tool
  then calls — never a handler chaining services
  ([code-placement.md](../../code-placement.md#layering-three-roles-one-direction)).
- **No tool for what the assistant can work out.** A summary, count or report the assistant can
  compute from a list tool's results is not a tool of its own.
- **Named `verb_noun`**, in snake case (`list_projects`, `create_task`), unique on the server.
  **A published name is stable**: assistants' permission lists and saved prompts refer to it, so a
  rename breaks them. Add the new name and retire the old one later.
- **Annotations are honest.** Every tool declares `readOnlyHint`, `destructiveHint`, `idempotentHint`
  and `openWorldHint`. A host may run a read-only tool without asking the user, so a tool that writes
  and claims to be read-only bypasses the user's confirmation.
- **Instructions stay short.** The server's `instructions` cover what spans tools (what the system is
  for, the order to call things in); anything about one tool belongs in its description.

## Descriptions

The description says what the tool does, when to use it instead of its neighbours, what it returns,
any rule the caller must follow, and any side effect the caller can't see in the result — in a few
sentences, then **one example call and its result**, as JSON. A test parses every example with the
tool's own schemas, so an example can't drift from what the tool accepts. A field's meaning is its
schema's `.describe()` — on the core schema when every consumer benefits, added at the edge otherwise,
never changing a constraint.

## Writes

- **Retries are safe.** A write sets a value rather than toggling it, so a call repeated after a lost
  response does no harm.
- **A batch is all or nothing**, capped in size: nothing is written unless every item is valid.
- **A large draft gets a check-only twin.** When a write takes a whole configuration at once, a
  second tool validates the same input, writes nothing (no counters, no usage, no records), and
  returns every problem at once plus a preview. The write itself re-runs every check.
- **Recommended: a write's result links to the record in the app,** so the user can check the
  assistant's work.

## Refusals that guide

A model fixes a refused call by reading the refusal, and only that. So a refusal says **exactly which
part of the input is wrong and how to make it right** — never only that the input was invalid.

- **Field by field, all at once.** Each problem is its own message, scoped to the exact path it is
  about (`agents[2].fieldValues.region`, not `agents`), and every problem in the input comes back in
  the one refusal — not just the first one found. Nothing is said about the fields that are right, so
  the model changes only what the messages name. This matters most for a tool taking a large payload:
  it validates the whole of it before refusing.
- **Each message carries a hint.** Beside the message, a `hint` written for the assistant says how to
  fix it, pointing at whichever helps most:
  - **the shape a valid value takes**, with an example;
  - **the tool that produces a valid value** — "call `parse_territory` to turn a place name into a
    territory, then pass its result";
  - **where to read more** — a specific topic in the docs for agents (`llms.txt`, an API doc, a
    `get_docs` topic): a signal of where the answer is, not the whole section pasted in.
- **The message stays the app's; the hint is the edge's.** The core's message is the same one the web
  app shows, and the core knows nothing of tool names. Hints are added in `apps/mcp`, by one pure
  mapper the [dispatcher](./start-here.md#the-tool-dispatcher) runs over every refusal, choosing by
  the refusal's code, field path, message and the tool called. The hint texts live together, with the
  server's other text for assistants.
- **Every refusal is decided.** Each refusal a tool can raise has a hint, or a deliberate none where
  the message already says everything. A test lists every refusal the tools can raise — the core's
  exported messages, each tool's input schema, the server's own refusals — and fails on one with
  neither, or on a hint naming a tool the server doesn't have. A value a hint shows as an example is
  one the product accepts, checked by the same test.

The hint rides in the [envelope](../transport-mapping.md#other-transports) beside each message:
`{ "field": "agents.2.fieldValues.region", "message": "…", "hint": "…" }`.

## Results

- **Lean and structured.** A tool declares an `outputSchema`, derived from the core's schema by
  picking only the fields an assistant acts on; the dispatcher parses the result with it, which drops
  every other field, and returns it as `structuredContent` plus the same value as JSON text, for
  clients that read only text. Bookkeeping the assistant never acts on stays out: every field
  returned costs its context.
- **Only public ids cross**, in arguments and results alike
  ([identifiers.md](../../packages/core/identifiers.md)), never an internal key. Output schemas
  enforce it per tool, and the
  [leak sweep](./testing.md#the-leak-sweep) checks every listed tool.
- **Collections page.** A list tool takes the core's filter and pagination schema and returns
  `Page<T>` with its opaque cursor
  ([transport-mapping.md → Collection endpoints](../transport-mapping.md#collection-endpoints--pagination-filtering-sorting)).

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Tools* and *Refusals that guide*.
