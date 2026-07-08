# Transport Mapping

How a server-side driving adapter turns a domain outcome into a transport response. The **edge
application** of the [error-handling strategy](../error-handling.md), made concrete for HTTP with
notes for the other transports.

> **Scope:** server-side transport only — HTTP/GraphQL controllers (`api/`), CLI commands, queue
> consumers/workers, MCP tool handlers. The **frontend** consumes this contract but does not define
> it — client-UI changes route to [apps/web/](./web/start-here.md). HTTP is the canonical example;
> [other transports](#other-transports) map the same outcomes to their idioms.

## Core Principle

**The controller owns exactly one piece of logic: translation.** It maps a *neutral domain outcome* —
a thrown failure, a returned entity, a `Page<T>` — onto the transport's native response, nothing
more, branching only on **generic structure** (validation failure? domain exception? a page?), never
on business state: the instant it branches on domain data it has taken on business logic, which
belongs in a service ([code-placement.md](../code-placement.md#layering-three-roles-one-direction)).

## The error response structure

Both anticipated failure classes
([error-handling.md](../error-handling.md#the-principles), principle 2) converge to **one envelope**
— five field errors or one domain message parse the same. Field names are a project decision; the
invariants are not:

- a single structure across **every** endpoint and failure class;
- an **array of messages**, each optionally scoped to an input `field` — validation: many,
  field-scoped; domain failure: one entry, no `field`;
- a stable, machine-readable `code` a client can branch on without parsing prose;
- only a **safe subset** of context — never a stack trace, attempted value, or another tenant's id
  ([error-handling.md](../error-handling.md#the-principles), principle 5);
- the `traceId` echoed — a caller quotes it; an operator finds the full context in the logs.

```json
{
  "error": {
    "code": "todo.not_found",
    "messages": [ { "field": "email", "message": "must be a valid email" } ],
    "traceId": "3f9c…"
  }
}
```

## Mapping outcomes to a response (HTTP)

One **shared error handler** does the mapping — edge middleware, **not** a `try/catch` per route.
Controllers stay thin: parse, call the domain, let a thrown outcome propagate to the shared handler.

| Outcome reaching the edge | HTTP response |
|---|---|
| schema / validation failure (Zod at the boundary — includes an unknown filter/sort key) | **`422`** (project may use **`400`**) · field-keyed `messages` |
| a feature domain exception | **`422`** · a single `message` |
| authentication failure (missing / invalid credential) | **`401`** — an edge decision, [before the domain runs](../packages/core/identity-and-access.md#authentication-is-an-edge-concern); never a thrown feature exception |
| anything else — unhandled throw, bug, infra fault | **`500`**, generic body — full error [logged](../packages/core/system/logging.md#what-to-log) with context; **nothing internal leaks** |

- The `500` row is the point: a handled failure must **never** land there — if one does, fix the
  shared handler (missing, or not catching that class), never special-case the route.
- **Status is edge policy; the invariants are not.** Both handled classes default to **`422`**; a
  project may route *structurally* malformed input to **`400`**, reserving `422` for semantic
  violations. Non-negotiable
  ([error-handling.md](../error-handling.md#the-handled--unanticipated-line)): one shape for both
  classes; handled → `4xx`, never `500`.
- **Status is transport knowledge** — a service never returns a status code or throws an HTTP-shaped
  error.
- **Per-category statuses (`403`/`404`/`409`): deferred growth path**, awaiting a machine-readable
  failure category —
  [error-handling.md → Growth path](../error-handling.md#growth-path-per-category-statuses).

### Other transports

The classification is transport-agnostic; only the envelope changes:

- **CLI** — nonzero **exit code**, messages on `stderr`; an unanticipated fault gets a distinct
  "internal error" exit code.
- **MCP tool** — an **`isError` result** carrying the messages, so the calling model sees a handled
  tool failure, not a transport crash.
- **Queue worker** — a handled failure is a **permanent reject** (malformed or rule-violating —
  retrying will not help); only an *unanticipated* fault is a **retry / redeliver**. A domain failure
  mapped to a retry loops forever.

## Collection endpoints — pagination, filtering, sorting

A collection endpoint adds one job: bind request parameters into the typed input the domain expects
and serialize the returned `Page<T>`. Strict division: **the controller binds and shapes; the service
decides and queries.**

**The controller:**

1. Parses raw transport parameters (query string, CLI flags, MCP args).
2. Validates them against the **core's** filter/sort/pagination schema — *reused*, never redefined at
   the edge (a bespoke schema drifts from the domain's constraints;
   [apps/end-here.md](./end-here.md)). It is `.strict()`: an **unknown filter or sort key is a
   validation failure** (the `422`/`400` row), not silently ignored.
3. Resolves the page window via the
   [`system/` pagination primitives](../packages/core/system/start-here.md#foundational-primitives):
   `resolveLimit` clamps the limit; the cursor codec decodes the **opaque cursor** — direct import
   ([app-context.md](../packages/core/app-context.md#injectable-helper-vs-direct-import)).
4. Calls the collection service with that typed input.
5. Serializes the returned `Page<T>` — items plus the **opaque `nextCursor`**; never a raw
   offset/limit the client constructs or increments.

**The collection service (domain)** owns the **set of legal filters and sorts** as a schema, applies
the predicates, and owns every *invisible* predicate the controller must never see — the
`deletedAt IS NULL` live-row filter
([working-with-databases.md](../packages/core/working-with-databases.md#deletes)), the tenant scope,
the authorization guard — returning `Page<T>` via `toPage`. It **re-validates** its input
([error-handling.md](../error-handling.md#the-principles), principle 4).

The line is bright: the controller passes a *validated, typed* input through. Writing "if param `X`
is set, also filter by `Y`" — a predicate the service's schema does not sanction — authors a business
rule and [fails review](../code-placement.md#layering-three-roles-one-direction).

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Response & error mapping* / *Collection
endpoints*.
