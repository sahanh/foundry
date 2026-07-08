# Error Handling

The playbook's single strategy for failure. It governs how a failure is **raised** in the domain,
**presented** at every edge, **observed** in logs, and **unwound** by a transaction — so that every
layer's error rule below reads as an *application* of the same few principles, not a local invention.

> **Scope:** cross-cutting. This is a spine, like [code-placement.md](./code-placement.md) and the
> [review protocol](./review.md) — it spans the domain (which *raises* failures) and every driving adapter
> (which *presents* them). The per-layer docs named under [Applied across the stack](#applied-across-the-stack)
> own the detail; this doc owns the through-line they share.

## Core Principle

**A failure is raised in the domain's vocabulary and presented in the consumer's — and because a domain
failure is *anticipated*, it is a handled `4xx`, never a server error.** We throw because we wrote logic to
detect a condition we expected; that makes the failure explainable, not a crash. A `500` is reserved for
the genuinely *unanticipated* — a bug or an infrastructure fault the framework owns. The domain never
produces one.

---

## The principles

**1. A failure is raised, not returned.** Code that cannot proceed **throws** — it never returns `null`,
`false`, or a sentinel to signal failure. A returned failure is silently ignorable; a thrown one forces a
decision. Services, guards, and the schema library all throw; no caller branches on a magic value. (This
is the [silent-failures anti-pattern](./packages/core/implementation-validation.md#anti-patterns-to-avoid)
stated as a first principle.)

**2. "Error" is two anticipated classes — both handled, never a 500.** "An error" is not one thing. Two
kinds of failure are *anticipated by design*, and both are presented as a **`4xx`**:

- **Input-validation failure** — the incoming payload is malformed or invalid. In this stack that is the
  **schema (Zod)** at the service/orchestration boundary — the
  [schema library](./packages/core/implementation-validation.md#input-failures--the-schema-library) is the
  first line of defense. It is naturally **field-keyed and often several at once** (the whole input is
  checked, a message collected per offending field).
- **Domain-rule failure** — a business rule deeper in is violated (not found, uniqueness, invalid state,
  an authorization denial). This is the feature's
  [domain exception](./packages/core/implementation-validation.md#the-domain-exception) — one per feature,
  carrying structured context, typically a **single domain-specific message**.

Both are anticipated, so both are handled. A **`500`** is only for the *unanticipated* — see the table
below.

**3. Both classes normalize to one response shape at the edge.** They differ in origin and cardinality —
many field-keyed messages versus one domain message — but the caller should never have to care which
threw. The edge transforms **both into a single envelope: an array of (optionally field-scoped)
messages.** A validation failure is many entries, each keyed to its field; a domain failure is one entry
with no field. One shape, whatever the source. The concrete envelope is specified for HTTP in
[apps/transport-mapping.md](./apps/transport-mapping.md#the-error-response-structure).

**4. Detect at every boundary; guarantee in the domain.** Each consumer validates its input at its own
edge — fast and friendly — but the **domain re-checks the same rules as the guarantee**, because a service
is a standalone, multi-consumer library that trusts no caller
([defense in depth](./packages/core/implementation-validation.md#why-the-domain-layer-owns-validation)).
Edge validation is a convenience; domain validation is the guarantee. A malformed request may be rejected
at the edge *and* would be rejected again in the domain.

**5. A failure is loud inside, safe outside.** A failure is **logged once with full context** — the entity
ids, the attempted operation, the `traceId` — **before it crosses a boundary**, and is never swallowed
([logging](./packages/core/system/logging.md#what-to-log)). But only a **safe subset** of that context
crosses to the caller: stack traces, attempted values, and another tenant's ids stay in the logs, never on
the wire (the presentation analogue of
[never logging sensitive data](./packages/core/system/logging.md#what-not-to-log)). The `500` body is
generic; its detail lives in the logs, correlated by `traceId`.

---

## The handled / unanticipated line

The dividing line is not the HTTP verb — it is *did we anticipate this failure?* Everything the domain or
its boundary raises on purpose is handled and rich; everything else is a `500`.

| Failure | Anticipated? | Owned by | Response |
|---|---|---|---|
| malformed / invalid input (schema · Zod) | yes — at the boundary | the schema at the edge / domain boundary | **`4xx`** (422 default) · field-keyed messages |
| domain-rule violation (per-feature exception) | yes — in the domain | the domain raises → the edge presents | **`4xx`** (422 default) · one message |
| authentication failure (missing / invalid credential) | yes — at the edge | edge auth, before the domain runs | **`401`** (see [identity-and-access.md](./packages/core/identity-and-access.md#authentication-is-an-edge-concern)) |
| unexpected fault (bug, infra, an unhandled throw) | **no** | the framework / infrastructure | **`500`**, generic |

> **Status is edge policy; the invariants are not.** Both anticipated request-failure classes default to
> **`422`** with the unified shape. A project may instead route *structurally* malformed input to **`400`**
> and reserve `422` for semantic violations — that split is a project decision. What is **not** negotiable:
> one response shape for both classes, and *handled → `4xx`, never `500`*. Finer per-category statuses
> (`403` for an authorization denial, `404` for not-found, `409` for a conflict) are a **growth path** —
> they require the domain exception to carry a machine-readable failure category, deliberately not built
> yet; see [apps/transport-mapping.md → Growth path](./apps/transport-mapping.md#growth-path-per-category-statuses).

---

## Applied across the stack

This spine is realized by the docs that own each moment in a failure's life:

- **Raising** — the domain throws the feature exception (or the schema throws at the boundary) →
  [implementation-validation.md](./packages/core/implementation-validation.md).
- **Presenting** — the edge transforms the outcome into the transport's response →
  [apps/transport-mapping.md](./apps/transport-mapping.md) (the HTTP-canonical application of principles
  2–3).
- **Observing** — the failure is logged with full context before it crosses a boundary →
  [system/logging.md](./packages/core/system/logging.md).
- **Unwinding** — a throw inside a transaction is the rollback signal; the use case is all-or-nothing and
  post-commit effects never fire on failure → [atomicity.md](./packages/core/atomicity.md).

---

## Anti-Patterns

- **A handled failure surfacing as a 500** — letting a domain exception or a validation error bubble
  uncaught so the framework returns a generic `500`. This is the exact default this strategy exists to
  kill: the caller learns nothing, and the domain *had* the context to explain itself.
- **Returning a sentinel instead of throwing** — `return null` / `false` on failure, so a caller can
  silently skip the check.
- **Two shapes for the two classes** — a different error body for validation than for domain failures, so
  every consumer must special-case which one it got. One envelope, both classes.
- **Leaking internals on the wire** — stack traces, raw exception text, attempted values, or another
  tenant's ids in the response body. Those belong in the logs.
- **Validating only at the edge** — treating the controller's parse as the guarantee and skipping the
  domain re-check, so the worker / CLI / job path is unguarded.

---

**Verify:** the **error-handling** lens in the [review protocol](./review.md) (Step 4) covers this — it is
a cross-cutting invariant run against every change, not a per-file box.
