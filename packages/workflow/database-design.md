# Workflow Database Design

## Overview

The workflow runtime persists execution truth in PostgreSQL. Domain tables remain
owned by the host application. Workflow tables store durable run state, durable
step state, attempt history, product-facing events, operational logs, and
capacity leases.

The queue is not the source of truth. Queue jobs are disposable wake-up messages.
Workers always load and claim current state from PostgreSQL before doing work.

## Tables

V1 uses six tables:

```text
workflow_runs
workflow_steps
workflow_attempts
workflow_events
workflow_logs
workflow_leases
```

There is no run-output table or column in v1. Workflow handlers return
`void | Promise<void>`. Task output is stored only for replay.

## `workflow_runs`

`workflow_runs` stores the top-level lifecycle for one workflow execution.

Core columns:

```text
id
workflowName
status
input
error
currentStepId
currentStepKey
currentStepStatus
nextRunAt
nextRunReason
queueLeaseToken
queueLeaseUntil
leaseOwner
leaseToken
leaseExpiresAt
leaseHeartbeatAt
createdAt
updatedAt
startedAt
completedAt
canceledAt
blockedAt
```

Responsibilities:

- Store durable workflow input.
- Track public run status.
- Track the current step summary for safe status reads.
- Carry scheduler due information.
- Carry queue lease information.
- Carry active control execution lease information.
- Store safe terminal error summary.

Non-responsibilities:

- Do not store workflow output.
- Do not store every step attempt.
- Do not store task outputs.
- Do not mutate host domain state.

Public run statuses:

```text
queued
running
waiting
completed
failed
canceled
blocked
```

`running` means a control worker currently owns the run. Durable waiting uses
`waiting`, not `running`.

## `workflow_steps`

`workflow_steps` is the unified execution table. It stores every durable
workflow primitive.

Supported types:

```text
task
sleep
parallel
```

Core columns:

```text
id
runId
parentStepId
type
key
sequence
status
pool
options
output
error
attemptCount
maxAttempts
nextRunAt
nextRunReason
queueLeaseToken
queueLeaseUntil
leaseOwner
leaseToken
leaseExpiresAt
leaseHeartbeatAt
sleepUntil
createdAt
updatedAt
startedAt
completedAt
canceledAt
blockedAt
```

Responsibilities:

- Represent one durable unit inside a workflow run.
- Store task outputs required for replay.
- Store sleep wake time.
- Store parallel parent state and child task linkage.
- Store effective option snapshots.
- Track retry scheduling.
- Track queue and execution leases.

Hierarchy rules:

- Top-level steps have `parentStepId = null`.
- Only `type = task` rows may have `parentStepId`.
- If set, `parentStepId` must reference a `type = parallel` step.
- Parallel children are task-only in v1.
- Nested parallel is out of scope in v1.

Public step statuses:

```text
queued
running
waiting
waitingRetry
completed
failed
canceled
blocked
```

`running` means a worker currently owns and advances the step. Durable waits use
`waiting` or `waitingRetry`.

## `workflow_attempts`

`workflow_attempts` stores audit history for each attempt to advance a
`workflow_steps` row.

Core columns:

```text
id
stepId
attemptNumber
status
workerId
leaseToken
startedAt
completedAt
durationMs
errorName
errorMessage
errorStack
errorDetails
retryable
createdAt
updatedAt
```

Attempt statuses:

```text
running
completed
failed
timedOut
canceled
```

Rules:

- Attempt numbers are monotonic per step.
- Attempts are created after the worker claims the step and acquires required
  capacity leases.
- Task attempts map to user-code invocation attempts.
- Sleep attempts map to sleep advancement passes.
- Parallel attempts map to parallel coordination passes.
- Workflow control passes do not create attempt rows; they are represented in
  logs.

## `workflow_events`

`workflow_events` stores product/user-facing progress timeline entries.

Core columns:

```text
id
runId
stepId
message
data
createdAt
```

Rules:

- Events are emitted by `ctx.event(message, data?)`.
- `data` is optional strict JSON.
- Events do not have log levels or event types in v1.
- Events should be safe to show in product/admin UI.

## `workflow_logs`

`workflow_logs` stores operational telemetry.

Core columns:

```text
id
runId
stepId
attemptId
level
message
data
createdAt
```

Rules:

- Logs include runtime-generated entries and author-created `ctx.log(...)`
  entries.
- Logs may be mirrored to an injected host logger.
- Logs include workflow run ID and relevant step/attempt IDs.
- Logs do not include task outputs by default.
- Logs may include safe structured error information.

## `workflow_leases`

`workflow_leases` stores global and pool capacity leases.

Core columns:

```text
id
scope
pool
runId
stepId
ownerId
token
expiresAt
heartbeatAt
createdAt
updatedAt
```

Lease scopes:

```text
control
step_global
step_pool
```

Responsibilities:

- Enforce global control concurrency.
- Enforce global step concurrency.
- Enforce pool `maxParallelism`.
- Recover capacity after crashes through lease expiry.

Row execution ownership leases still live directly on `workflow_runs` and
`workflow_steps`. `workflow_leases` is only for shared capacity budgets.

## Status Flows

Task:

```text
queued -> running -> completed
queued -> running -> waitingRetry -> queued -> running -> completed
queued -> running -> failed
```

Sleep:

```text
queued -> running -> waiting
waiting -> queued -> running -> completed
```

Parallel:

```text
queued -> running -> waiting
waiting -> queued -> running -> completed
waiting -> queued -> running -> failed
```

Run:

```text
queued -> running -> waiting
waiting -> queued -> running -> waiting
running -> completed
running -> failed
queued|waiting|running -> canceled
non-terminal -> blocked
```

## Scheduling Model

Runs and steps use a common scheduler shape:

```text
nextRunAt
nextRunReason
queueLeaseToken
queueLeaseUntil
```

The scheduler:

1. Finds due `workflow_runs` where status is `queued` or `waiting`.
2. Finds due `workflow_steps` where status is `queued`, `waiting`, or
   `waitingRetry`.
3. Conditionally marks due waiting rows as `queued`.
4. Writes a queue lease token and expiry.
5. Sends queue messages containing type, target ID, and queue lease token.

Workers claim only rows whose status is `queued` and whose queue lease token
matches the message. Stale messages are acknowledged and debug-logged.

## Execution Leases

Execution leases prevent duplicate work on the same row.

Control jobs:

1. Claim the `workflow_runs` row.
2. Acquire a global control capacity lease.
3. Run a control pass.
4. Release leases and update status.

Task jobs:

1. Claim the `workflow_steps` row.
2. Acquire a global step capacity lease.
3. Acquire a pool capacity lease.
4. Create an attempt row.
5. Run the executor.
6. Release leases and update status.

All worker writes are fenced by the execution lease token.

## Replay Constraints

Replay safety uses ordered step slots.

Constraints:

- `workflow_steps` has unique `(runId, parentStepId, sequence)`.
- For child tasks under parallel, also enforce unique `(runId, parentStepId,
  key)`.
- Replay validates that stored `type`, `key`, and `sequence` match current code.
- Replay mismatch fails the run.
- Missing workflow definitions fail the run.

Top-level keys do not need to be unique beyond sequence. Parallel child keys
must be unique because they become result object keys.

## Retry State

Retry policy is workflow-driven and stored as an effective snapshot on the step.

Default:

```text
maxAttempts: 3
initialDelayMs: 1000
backoff: exponential
jitter: true
```

Rules:

- `maxAttempts` means total tries.
- `retry: false` disables retries.
- `NonRetryableWorkflowError` fails immediately.
- Retry scheduling writes `status = waitingRetry` and `nextRunAt`.
- pg-boss retry is only a small bounded infrastructure fallback.

## Sleep State

Sleep steps use `type = sleep`.

Rules:

- The sleep handler returns a `Date`.
- The date is stored in `sleepUntil`.
- Dates at or before now complete immediately.
- Future dates put the step in `waiting`.
- Sleep is capped at one year from the runtime clock.
- Sleep handlers are evaluated only when the sleep step is first created.

## Parallel State

Parallel steps use `type = parallel`.

Rules:

- The parallel handler synchronously returns child task descriptors.
- The parent parallel row is created first.
- Child task rows are created with `parentStepId` pointing at the parallel row.
- Child tasks execute through normal task workers.
- Child completion marks the parent parallel step due.
- The parallel executor coordinates fan-in.
- When all child tasks complete, the parent parallel step completes and stores
  the aggregated internal result.
- One terminal child failure fails the parent parallel step and the workflow.
- Successful sibling child tasks are not rerun when another child retries.

## Indexes and Constraints

Required indexes include:

```text
workflow_runs(status, nextRunAt)
workflow_runs(queueLeaseUntil)
workflow_runs(workflowName, status)

workflow_steps(runId, parentStepId, sequence)
workflow_steps(status, nextRunAt)
workflow_steps(queueLeaseUntil)
workflow_steps(parentStepId)

workflow_attempts(stepId, attemptNumber)

workflow_events(runId, createdAt)
workflow_logs(runId, createdAt)
workflow_logs(stepId, createdAt)
workflow_logs(attemptId, createdAt)

workflow_leases(scope, pool)
workflow_leases(expiresAt)
workflow_leases(ownerId)
```

Required uniqueness:

```text
workflow_steps unique(runId, parentStepId, sequence)
workflow_steps unique(runId, parentStepId, key) where parentStepId is not null
workflow_attempts unique(stepId, attemptNumber)
```

Exact Drizzle and SQL syntax can be finalized during implementation.

## Retention

Retention defaults to 90 days.

Rules:

- Delete terminal runs older than the configured retention window.
- Terminal statuses are `completed`, `failed`, and `canceled`.
- Cascade runtime-owned steps, attempts, events, logs, and leases.
- Never delete queued, running, waiting, retrying, blocked, or otherwise active
  runs.
- Scheduler runs bounded retention cleanup daily by default.
- A public cleanup API is also exposed for explicit operator use.
