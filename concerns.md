# Concerns

**Maintainer-facing.** This file is not part of the agent reading path — an agent that hits a gap
raises it (per the README's *When in doubt*); it does not read this file wholesale.

Open gaps in the playbook. Per the README, gaps are **documented, not silently decided**. Each item
carries a **status** — `open` (no coverage), `partial` (some coverage, named gap remains), or
`softened` (risk acknowledged in a doc but not closed) — and an **anchor** to the doc(s) that own
the decision. Resolved items live in git history and the changelog.

---

## Domain layer

### 7. AppContext per-request construction mechanics are unwritten — `partial`

The context contract is specified (facts not claims, edge-only factory, read-only binding —
`app-context.md`), but the per-request mechanics are not: no trace-ID middleware pattern, no worked
example of building a fresh `AppContext` per request.

**Anchor:** `app-context.md`, `system/logging.md`, `apps/start-here.md`.

## Reliability & operations

### 8. Post-commit side effects can be silently lost — no outbox story — `softened`

`atomicity.md` names the philosophy (effects reconcile toward the database) but neither prescribes a
transactional outbox nor names the crash-between-commit-and-dispatch window. Document an outbox
pattern or explicitly accept that loss window.

**Anchor:** `atomicity.md`.

### 9. Observability beyond logs is absent — `open`

Logging is the only implemented pillar. No metrics, alerting, health checks, or tracing spans;
`review.md` has no observability node.

**Anchor:** `system/logging.md`, `packages/core/todo.md`.

### 10. Concurrency control beyond the uniqueness-race note is missing — `partial`

`atomicity.md` covers only the check-then-insert race. No optimistic locking / version columns, no
idempotency keys for retried inbound API calls, no isolation-level expectations.

**Anchor:** `atomicity.md`.

### 11. Audit trails are undecided — `partial`

Timestamps, deletes, and enum columns are decided. An audit-trail convention (row-level who/what/when
history, attributable to `ctx.actor`) remains unwritten — raise it as its own concern when a feature
needs one.

**Anchor:** `working-with-databases.md`, `system/database.md`, `app-context.md`.

## Scaling / five-year pressure points

### 14. Cross-feature reads — direction decided, spec still missing — `open`

Cross-entity queries (dashboards, search, reporting) belong in a dedicated read-only layer, but no
spec exists: the read-only contract (enforced via a read-only DB role, not convention), a sanctioned
folder home, shared predicates against domain-definition drift, and structural tenant scoping (the
layer must inherit the scoped `ctx.system.db`, never a raw client) all need writing.

**Anchor:** `working-with-databases.md`, `code-placement.md`, `packages/core/start-here.md`.

## Frontend

### 17. Frontend discipline beyond structure is unwritten — `open`

`apps/web/` covers structure only. Data fetching, client state, forms/client-side validation
(mirrored rules derived from the core's Zod schemas, not re-encoded), accessibility, and frontend
testing have no convention yet — raise the specific gap when a feature needs one.

**Anchor:** `apps/web/start-here.md`, `apps/web/end-here.md`.

## Smaller items

- **Test coverage & lifecycle** — `open`. Controller/e2e tests are deferred with nothing tracking
  when "later" arrives; test-DB lifecycle (migrate/reset between runs) is unspecified. Verify
  against `testing.md`.
