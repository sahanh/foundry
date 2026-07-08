# Transport Mapping

How a server-side driving adapter turns a domain outcome into a transport response — the one translation a
thin controller legitimately owns. This is the **edge application** of the
[error-handling strategy](../error-handling.md): principles 2–3 (two anticipated failure classes, one
response shape) made concrete for HTTP, with brief notes for the other transports.

> **Scope:** server-side transport only — HTTP/GraphQL controllers (`api/`), CLI commands, queue
> consumers/workers, MCP tool handlers. The **frontend** *consumes* this contract but does not define it;
> a change to the client UI is routed to [apps/web/](./web/start-here.md), not here. HTTP is the canonical
> worked example throughout; the [other transports](#other-transports) map the same outcomes to their own
> idioms.

## Core Principle

**The controller owns exactly one piece of logic: translation.** It maps a *neutral domain outcome* — a
thrown failure, a returned entity, a `Page<T>` — onto the transport's native response, and nothing more.
The translation branches only on **generic structure** (was this a validation failure? a domain exception?
a page?), never on business state — the instant it branches on domain data it has taken on business logic,
which belongs in a service
([code-placement.md](../code-placement.md#layering-three-roles-one-direction)). Everything else about the
request — the rules, the decisions — already happened in the domain before the controller sees an outcome.

---

## The error response structure

Both anticipated failure classes ([error-handling.md](../error-handling.md#the-principles) principle 2)
converge to **one envelope**, so a client parses a single shape whether it got five field errors or one
domain message. The exact field names are a project decision; the **invariants are not**:

- a single structure across **every** endpoint and every failure class;
- an **array of messages**, each optionally scoped to an input `field` (validation → many, field-scoped; a
  domain failure → one entry, no field);
- a stable, machine-readable `code` a client can branch on without parsing prose;
- only a **safe subset** of the failure's context — never a stack trace, a raw attempted value, or another
  tenant's id ([error-handling.md](../error-handling.md#the-principles) principle 5);
- the `traceId` echoed, so a caller can quote it and an operator can find the full context in the logs.

```json
{
  "error": {
    "code": "todo.not_found",
    "messages": [ { "field": "email", "message": "must be a valid email" } ],
    "traceId": "3f9c…"
  }
}
```

A domain failure fills `messages` with a single entry and no `field`; a validation failure fills it with
one entry per offending field.

---

## Mapping outcomes to a response (HTTP)

One **shared error handler** does the mapping — a single piece of edge middleware, **not** a `try/catch` in
every route. Each controller stays thin: parse, call the domain, and let a thrown outcome propagate to the
shared handler, which transforms it into the envelope above.

| Outcome reaching the edge | HTTP response |
|---|---|
| schema / validation failure (Zod at the boundary — includes an unknown filter/sort key) | **`422`** (project may use **`400`**) · field-keyed `messages` |
| a feature domain exception | **`422`** · a single `message` |
| authentication failure (missing / invalid credential) | **`401`** — rejected at the edge, [never reaches the domain](../packages/core/identity-and-access.md#authentication-is-an-edge-concern) |
| anything else — an unhandled throw, a bug, an infra fault | **`500`**, generic body; the full error is [logged](../packages/core/system/logging.md#what-to-log) with context, and **nothing internal leaks** |

The `500` row is the whole point of the strategy: a domain or validation failure must **never** land there.
If an uncaught domain exception is producing a `500`, the shared handler is missing or is not catching that
class — fix the handler, do not special-case the route.

### Other transports

The same neutral outcomes map to each transport's idiom — the *classification* (validation / domain /
unanticipated) is transport-agnostic; only the envelope changes:

- **CLI** — a nonzero **exit code** with the messages on `stderr`; an unanticipated fault is a distinct
  "internal error" exit code.
- **MCP tool** — an **`isError` result** carrying the messages, so the calling model sees a handled tool
  failure rather than a transport crash.
- **Queue worker** — a handled failure is a **permanent reject** (the message is malformed or violates a
  rule — retrying will not help); only an *unanticipated* fault is a **retry / redeliver**. Mapping a
  domain failure to a retry loops forever.

---

## Growth path: per-category statuses

Today every domain exception maps to a single **`422`**. Differentiating it — `403` for an authorization
denial, `404` for not-found, `409` for a conflict — requires the domain exception to carry a
**machine-readable failure category** a mapper can switch on. That discriminator is deliberately **not built
yet**; until it exists, the uniform `422` (with the rich, explanatory `messages`) is the contract. This is
where the `403` that
[identity-and-access.md](../packages/core/identity-and-access.md#authorization-is-a-domain-concern)
anticipates for an authorization denial will land.

---

## Collection endpoints — pagination, filtering, sorting

A collection endpoint has one extra job: bind request parameters into the typed input the domain expects,
and serialize the `Page<T>` it returns. The division of labour is strict — **the controller binds and
shapes; the service decides and queries.**

**The controller:**

1. Parses raw transport parameters (query string, CLI flags, MCP args).
2. Validates them against the **core's** filter/sort/pagination input schema — *reused*, never redefined at
   the edge ([apps/end-here.md](./end-here.md); a redefined shape drifts from the domain's real
   constraints). The schema is `.strict()`, so an **unknown filter or sort key is a validation failure**
   (→ the `422`/`400` row above), not silently ignored.
3. Resolves the page window with the
   [`system/` pagination primitives](../packages/core/system/start-here.md#foundational-primitives) —
   `resolveLimit` to clamp the limit, the cursor codec to **decode the opaque cursor** — reached by direct
   import ([app-context.md](../packages/core/app-context.md#injectable-helper-vs-direct-import)).
4. Calls the collection service with that typed input.
5. Serializes the returned `Page<T>` into the response — the items plus the **opaque `nextCursor`**; a
   client never constructs an offset.

**The collection service (domain)** owns the **set of legal filters and sorts** as a schema, applies the
predicates, and owns every *invisible* predicate the controller must never see — the `deletedAt IS NULL`
live-row filter ([working-with-databases.md](../packages/core/working-with-databases.md#deletes)), the
tenant scope, the authorization guard — returning a `Page<T>` via `toPage`. It **re-validates** the input
it is handed (defense in depth, [error-handling.md](../error-handling.md#the-principles) principle 4).

The line is bright: the controller passes a *validated, typed* input through. The instant it writes "if
param `X` is set, also filter by `Y`," it has authored a business rule, and that
[fails review](../code-placement.md#layering-three-roles-one-direction).

---

## Anti-Patterns

- **A `try/catch` in every route** — re-implementing the mapping per handler instead of one shared error
  handler. The mapping is uniform; centralize it.
- **A domain or validation failure returning 500** — the handler not catching the anticipated classes, so
  the framework's default swallows them. Handled failures are `4xx`.
- **HTTP status decided in the domain** — a service returning a status code, or throwing an HTTP-shaped
  error. Status is transport knowledge; the domain speaks only its own failures.
- **Leaking internals** — stack traces, raw exception text, attempted values, or another tenant's ids in
  the body.
- **Redefining the input or page shape at the edge** — a bespoke filter/sort/pagination schema instead of
  reusing the core's, or a hand-rolled page envelope instead of serializing `Page<T>`.
- **A client-constructed offset** — exposing a raw offset/limit the client increments, instead of the
  opaque cursor.
- **A controller inventing a predicate** — deriving a filter/sort the service's schema does not sanction;
  that is business logic in the controller.
- **An authentication failure modeled as a domain exception** — `401` is an edge decision before the domain
  runs, not a thrown feature exception.

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Response & error mapping* / *Collection
endpoints*.
