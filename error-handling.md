# Error Handling

The playbook's single strategy for failure: how a failure is **raised** in the domain, **presented**
at every edge, **observed** in logs, and **unwound** by a transaction. Every layer's error rule is an
application of these principles, not a local invention.

> **Scope:** cross-cutting spine (like [code-placement.md](./code-placement.md) and the
> [review protocol](./review.md)) spanning the domain, which *raises* failures, and every driving
> adapter, which *presents* them. The docs under [Applied across the stack](#applied-across-the-stack)
> own the detail; this doc owns the shared through-line.

## Core Principle

**A failure is raised in the domain's vocabulary and presented in the consumer's — and because a
domain failure is *anticipated*, it is a handled `4xx`, never a server error.** We throw because we
wrote logic to detect an expected condition; that makes the failure explainable, not a crash. A `500`
is reserved for the genuinely *unanticipated* — a bug or infrastructure fault the framework owns; the
domain never produces one. The default this strategy kills: a handled failure bubbling uncaught to a
generic `500`, telling the caller nothing though the domain had the context to explain itself.

## The principles

**1. A failure is raised, not returned.** Code that cannot proceed **throws** — never `return null` /
`false` / a sentinel a caller can silently skip. A returned failure is ignorable; a thrown one forces
a decision. Services, guards, and the schema library all throw; no caller branches on a magic value.
(The [silent-failures anti-pattern](./packages/core/implementation-validation.md#anti-patterns-to-avoid)
as a first principle.)

**2. "Error" is two anticipated classes — both handled, never a `500`.**

- **Input-validation failure** — malformed/invalid payload, caught by the **schema (Zod)** at the
  service/orchestration boundary
  ([schema library](./packages/core/implementation-validation.md#input-failures--the-schema-library),
  the first line of defense). Naturally **field-keyed, often several at once**.
- **Domain-rule failure** — a business rule violated deeper in (not found, uniqueness, invalid state,
  an authorization denial): the feature's
  [domain exception](./packages/core/implementation-validation.md#the-domain-exception) — one per
  feature, structured context, typically a **single message**.

**3. Both classes normalize to one envelope at the edge.** The caller never cares which class threw:
the edge transforms both into **an array of (optionally field-scoped) messages** — validation → many
field-keyed entries; domain failure → one entry, no field. One shape, both classes; a different body
per class forces every consumer to special-case. Concrete HTTP envelope:
[apps/transport-mapping.md](./apps/transport-mapping.md#the-error-response-structure).

**4. Detect at every boundary; guarantee in the domain.** Each consumer validates at its own edge —
fast and friendly — but the **domain re-checks the same rules as the guarantee**: a service is a
standalone, multi-consumer library that trusts no caller
([defense in depth](./packages/core/implementation-validation.md#why-the-domain-layer-owns-validation)).
Treating the edge parse as the guarantee leaves the worker / CLI / job path unguarded.

**5. Loud inside, safe outside.** A failure is **logged once with full context** — entity ids,
operation, `traceId` — **before it crosses a boundary**, never swallowed
([logging](./packages/core/system/logging.md#what-to-log)). Only a **safe subset** crosses to the
caller: stack traces, attempted values, and another tenant's ids stay in the logs, never on the wire
([never logging sensitive data](./packages/core/system/logging.md#what-not-to-log) is the
presentation analogue). The `500` body is generic; detail lives in the logs, correlated by `traceId`.

## The handled / unanticipated line

The dividing line is *did we anticipate this failure?* — raised on purpose → handled and rich;
everything else → server error.

| Failure | Anticipated? | Owned by |
|---|---|---|
| malformed / invalid input (schema · Zod) | yes — at the boundary | the schema at the edge / domain boundary |
| domain-rule violation (per-feature exception) | yes — in the domain | the domain raises → the edge presents |
| authentication failure (missing / invalid credential) | yes — at the edge | edge auth, before the domain runs ([identity-and-access.md](./packages/core/identity-and-access.md#authentication-is-an-edge-concern)) |
| unexpected fault (bug, infra, unhandled throw) | **no** | the framework / infrastructure |

Handled → **`4xx`**; unanticipated → generic **`500`**. Concrete statuses (HTTP defaults, the
`400`-vs-`422` split) are edge policy:
[apps/transport-mapping.md](./apps/transport-mapping.md#mapping-outcomes-to-a-response-http).
Non-negotiable: one response shape for both classes; *handled → `4xx`, never `500`*.

## Growth path: per-category statuses

Both handled classes present today at the transport's single default status (HTTP: `422`). Finer
statuses — `403` authorization denial, `404` not-found, `409` conflict — require the domain exception
to carry a **machine-readable failure category** a mapper can switch on. **Deferred: deliberately not
built yet**; until then the uniform default with rich messages is the contract. The `403` that
[identity-and-access.md](./packages/core/identity-and-access.md#authorization-is-a-domain-concern)
anticipates lands here.

## Applied across the stack

- **Raising** — the domain throws the feature exception; the schema throws at the boundary →
  [implementation-validation.md](./packages/core/implementation-validation.md).
- **Presenting** — the edge maps the outcome to the transport's response →
  [apps/transport-mapping.md](./apps/transport-mapping.md).
- **Observing** — logged with full context before crossing a boundary →
  [system/logging.md](./packages/core/system/logging.md).
- **Unwinding** — a throw inside a transaction is the rollback signal; all-or-nothing, post-commit
  effects never fire on failure → [atomicity.md](./packages/core/atomicity.md).

---

**Verify:** the **error-handling** lens in the [review protocol](./review.md) (Step 4) — a
cross-cutting invariant run against every change, not a per-file box.
