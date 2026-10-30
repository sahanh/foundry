# Tool-Call Audit

Every MCP tool call leaves a **durable record**: who called which tool, through which client, when,
and how it ended. An assistant acts on a user's account with the user's authority, often with no
human watching each call, so the user, support and anyone investigating an incident need to answer
"what did an assistant do here, and when?" long after the logs have rotated.

> Part of the [MCP server](./start-here.md) subtree. Row-level history of the domain's own entities
> (who changed this record) is a separate, still-open concern; this doc covers tool calls only.

## Logs and audit records are different records

The [dispatcher](./start-here.md#the-tool-dispatcher) writes both, for every call:

| | **Logs** | **Audit record** |
|---|---|---|
| For | operators diagnosing the system | the user, support, security review, usage analytics (which connections are active, which tools are used) |
| Where | the log platform, through `ctx.system.logger` ([logging.md](../../packages/core/system/logging.md)) | a table in the project's database |
| Holds | entry and outcome lines, the failure's full context, the `traceId` | one row per call, a fixed set of fields |
| Kept | the log platform's retention, usually days or weeks | the audit retention window ([below](#retention--decided-from-the-business-case)) |
| Read by | log search, by `traceId` | a query by user, client, tool or time |

The audit record carries the call's `traceId`, so while the logs still exist, one row leads to the
whole story of the call.

## What a record holds

One row per `tools/call` that passed the token check (an unauthenticated request has no actor; the
logs record it):

- **id** — a prefixed id ([identifiers.md](../../packages/core/identifiers.md)); **occurredAt** — from
  the clock ([app-context.md → The Clock](../../packages/core/app-context.md#the-clock--ctxsystemclock));
- **the user** — `ctx.actor`'s id, and the tenant in a multi-tenant app (the table is tenant-owned:
  [multi-tenancy.md](../../packages/core/multi-tenancy.md));
- **the client** — the OAuth client id the token was issued to (which assistant), and the grant or
  connection id where the project models connections a user can revoke;
- **the tool** — the name as the caller sent it, so a call to an unknown tool is recorded too:
  control characters stripped, cut to a fixed length, and a placeholder (`(unnamed)`) when nothing is
  left;
- **the outcome** — `ok`, `refused` (a handled failure: validation, a domain exception, an unknown
  tool, the rate limit) or `error` (unanticipated), with the failure's `code`;
- **durationMs** and the **traceId**.

**Never the arguments or the result.** They can hold personal data and secrets, they grow without
bound, and the domain's own records already hold what changed. A project that needs them (forensics
on a regulated workload) records a redacted copy, under a shorter retention, as a recorded decision.

## How it is written

- **After the call, outside its transaction.** A call that fails and rolls back still leaves its
  record, and the record's write can never roll back or delay the call's own work
  ([atomicity.md](../../packages/core/atomicity.md)).
- **Every outcome.** Refusals are recorded like successes: a run of refused calls is the security
  signal an audit exists to catch.
- **Attributed from the token, never the arguments.** The user and the client come from the verified
  context; nothing a caller sends can make a record name someone else.
- **A failed write is logged, and the call still answers.** The audit write fails open: it logs at
  `error`, with the fields it would have written, and the caller gets the call's own result. A
  business that must not run an unaudited action instead writes the record before the tool runs and
  refuses the call when that write fails, as a recorded decision.
- **Append-only.** Records are inserted, never updated; they leave the table only through the
  retention purge or a user's erasure (below).

## Where the code lives

- **The records belong to a core feature** — the one that owns the project's assistant connections,
  or a feature of their own (`assistant-activity/`). Its service records a call, lists records, and
  purges expired ones; its table lives with the others in `system/db/`. The dispatcher calls the
  record method as its last step, as an edge records any outcome.
- **The records serve the product too.** A connection's "last used" comes from its latest record —
  no second table to keep in step. Past the retention window it is forgotten; a "last used" the
  product must show for longer lives on the connection itself.
- **Reads are authorized like any read**
  ([identity-and-access.md → Authorization is a domain concern](../../packages/core/identity-and-access.md#authorization-is-a-domain-concern)):
  a user sees the records of their own calls (an "assistant activity" view beside their
  connections); anything wider goes through an explicit elevated path.

## Retention — decided from the business case

How long records are kept is a **number the project decides and records**, never "forever" by
default. Pick the longest window any of these needs:

| The record is kept for | Window |
|---|---|
| Nothing beyond Foundry's default | **90 days** |
| An activity view the user reads | as far back as the view shows |
| Investigating abuse or a security incident | long enough to cover how late one is noticed; often a year |
| A contract, certification or regulation | what it requires, confirmed with whoever owns compliance |

The window is configuration, read at the purge, so changing it needs no migration.

**The purge.** A scheduled job in `apps/worker/` runs at least daily and calls the feature's purge
method, which deletes records older than the window in bounded batches (an index on `occurredAt`
keeps each batch cheap). Deletion is hard: audit records are never soft-deleted
([working-with-databases.md → Deletes](../../packages/core/working-with-databases.md#deletes)). The job
runs as the project's `system` actor
([identity-and-access.md → Growth path](../../packages/core/identity-and-access.md#growth-path-documented-deferrals)).

**Archive, when the window is long.** When the window outgrows what the database should hold, the job
exports expiring records to object storage before deleting them; the archive keeps the rest of the
window under its own retention. At high volume, a table partitioned by month, whose oldest partition
is dropped, replaces the batched delete.

**Erasure.** When a user's data is erased, their audit records follow the project's erasure policy:
deleted with them, or kept to the end of the window with the user reference removed, where a legal
basis allows. Decide which, and record it.

## Observability beyond the record

- **Per-call logs** carry the tool name, outcome, failure code, duration, client id and actor id as
  fields, never the arguments ([logging.md → What Not to Log](../../packages/core/system/logging.md#what-not-to-log)).
- **Metrics**, where the project has them: a count of calls and a duration histogram per tool and
  outcome, from the same point in the dispatcher.
- **Not MCP's own logging messages.** The protocol's `notifications/message` logging is deprecated
  (2026-07-28) and goes to the client, not to your operators.

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Tool-call audit*.
