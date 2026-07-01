# Logging

Logging is a required subsystem. Every application built on this playbook must implement the logging adapter before any feature work begins. It is not optional and must not be deferred — without it, failures and business-use-case traces cannot be diagnosed in production.

The logging adapter lives in `src/system/logger/` and is accessed through `ctx.system.logger`.

## Trace ID

Every operation — HTTP request, queue message, scheduled job — carries a **trace ID**. It is the single identifier that ties every log emitted during that operation together. To trace a full business use case, filter your log aggregator by `traceId` and see every step in sequence.

**Establishing the trace ID:**
- If the entry point receives one (e.g. an `X-Trace-ID` HTTP header), use it.
- If not, generate a UUID and set it on `AppContext.traceId` before the operation begins.

The logger reads `traceId` from the context automatically — services never pass it explicitly.

## Log Levels

| Level | When to use |
|---|---|
| `info` | Service method called, significant business event completed, infrastructure side effect dispatched (email sent, job queued) |
| `warn` | Something unexpected occurred but the operation continued (e.g. a retry succeeded, a fallback was used) |
| `error` | Operation could not complete — unhandled exception, failure with no recovery path. Log before re-throwing. |
| `debug` | Detailed tracing useful during development. Off in production. |

## Standard Fields

Every log entry carries these fields automatically:

| Field | Source |
|---|---|
| `traceId` | `AppContext.traceId` |
| `level` | Set by the log call |
| `timestamp` | Set by the adapter |
| `message` | Set by the log call |

Additional contextual fields are passed by the caller alongside the message:

```
ctx.system.logger.info('comment created', { todoId, commentId, authorId })
ctx.system.logger.error('failed to dispatch email', { todoId, ownerId, reason })
```

## What to Log

### At the service layer

- **Method entry** — log at `info` when a service method is called, with the entity IDs relevant to the operation.
- **Business events** — log at `info` when a significant outcome is reached (entity created, state changed, rule applied).
- **Infrastructure side effects** — log at `info` when the service triggers an email, queues a job, or performs any observable external action. Include enough context to confirm what was dispatched and to whom.
- **Errors** — log at `error` with full context before re-throwing. Include entity IDs, the attempted operation, and the failure reason.

### At the entry point (controller / queue consumer / scheduler)

- Log the incoming operation at `info` with the trace ID as confirmation it was received.
- Log the outcome at `info` (completed) or `error` (failed), with timing if available.

## What Not to Log

- **Sensitive data** — passwords, tokens, secrets, payment details, and any PII. Never log these, even at `debug`.
- **Noise** — log statements inside loops, repetitive low-value events, or anything that fires at high frequency without adding diagnostic value.
- **Duplicates** — if the adapter or framework already logs an event (e.g. HTTP request received), don't repeat it in the controller.

## Anti-Patterns

- **Logging without `traceId`** — a log entry with no trace ID cannot be linked to an operation and has limited diagnostic value.
- **Plain string messages with no fields** — `logger.info('failed for user 123')` embeds context in the message string, making it unsearchable. Use structured fields instead.
- **Swallowing errors silently** — catching an exception and not logging it hides failures. Always log at `error` before suppressing or re-throwing.
- **Logging sensitive data at `debug`** — `debug` is still a log level that can be enabled in production. Sensitive data must never be logged at any level.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Logger adapter.
