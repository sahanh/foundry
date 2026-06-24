# Workflow Test Implementation Plan

## Testing Principles

Tests should validate public behavior and durable state transitions. They should
not assert private implementation details unless those details are the contract
of an internal deep module.

Good workflow tests assert:

- database-visible state transitions
- queue messages produced by the scheduler
- attempts, events, and logs
- retry and timeout behavior under controlled time
- no duplicate execution under stale jobs or expired leases
- public API outputs

Avoid tests that only prove a private method was called. Prefer testing the
observable result of that call through the runtime, store, queue, or public
read API.

## Test Layers

### Core Unit Tests

Use fake store, fake queue, fake clock, and deterministic IDs.

Modules:

- runtime definition registry
- workflow context
- control runner
- step recorder
- step finalizer
- scheduler
- retention
- cancellation
- executor registry
- task executor
- sleep executor
- parallel executor
- retry policy
- lease helpers
- safe error extraction

Coverage:

- duplicate workflow definitions throw
- unknown workflow start throws
- input validation runs at start and execution
- workflow handlers enforce `void | Promise<void>`
- control pass stops at first unresolved top-level step
- common step creation occurs before executor advancement
- replay validates sequence, type, and key
- replay mismatch fails the run
- top-level completion marks run due
- child task completion marks parent parallel due
- task output is persisted for replay
- task output is not exposed through public reads
- workflow input is persisted but hidden from public reads
- `NonRetryableWorkflowError` fails immediately
- `retry: false` disables retries
- default retry policy uses three total attempts
- backoff supports constant, linear, and exponential
- jitter stays within expected bounds
- timeout wins over late task completion
- cancellation wins over late task success
- safe errors include explicit details but not arbitrary error fields

### Store Integration Tests

Use real PostgreSQL. The store tests must validate behavior that fake stores
cannot prove.

Modules:

- Postgres workflow store
- Drizzle table definitions
- SQL migrations

Coverage:

- migrations create all six tables
- inserts and reads for runs, steps, attempts, events, logs, and leases
- JSONB storage for input, options, output, event data, log data, and error
  details
- unique `(runId, parentStepId, sequence)` constraint
- unique child key constraint under parent parallel step
- scheduler indexes support due run and due step queries
- expired queue leases are eligible for requeue
- expired execution leases are recoverable
- expired capacity leases are cleaned up
- capacity lease acquisition respects global and pool caps
- fenced writes reject stale lease tokens
- retention deletes terminal runs older than retention window
- retention does not delete active runs
- retention cascades runtime-owned rows

### Queue Adapter Integration Tests

Use pg-boss against PostgreSQL.

Modules:

- pg-boss workflow queue adapter
- queue naming and prefix behavior
- worker registration

Coverage:

- starts and stops pg-boss lifecycle
- registers `workflow.control`
- registers one `workflow.steps.<pool>` worker per pool
- supports configurable queue prefix
- enqueues control jobs with type, run ID, and queue lease token
- enqueues step jobs with type, step ID, and queue lease token
- uses small bounded pg-boss infrastructure retry config
- does not encode workflow input or task output in queue payloads
- stop handle stops intake gracefully

### End-to-End Runtime Tests

Use real PostgreSQL plus pg-boss.

Coverage:

- start creates a run and returns the run ID
- scheduler picks up queued runs
- workers execute a task and complete the workflow
- sequential workflow executes task by task through control and step jobs
- task output is replayed into later tasks
- workflow handler return value is ignored/not part of contract
- user-facing events are persisted
- runtime logs are persisted
- host logger receives mirrored logs when configured

## Required Scenario Coverage

### Parallelism

Test workflow:

```text
task -> parallel -> task
```

Scenarios:

- first control pass creates first task only
- after first task completes, continuation reaches parallel
- parallel creates parent step and all child task rows
- child tasks execute through pool-specific step lanes
- child tasks can execute concurrently
- parent parallel remains waiting while any child is incomplete
- child completion marks parent parallel due
- parallel completes after all children complete
- parallel result object is keyed by child task names
- next top-level task receives parallel result
- duplicate child task keys are rejected
- child task failure fails parent parallel and workflow
- retrying child does not rerun successful sibling
- terminal child failure requests cooperative cancellation of unfinished siblings

### Failure Recovery

Workflow-level recovery:

- queued run with expired queue lease is requeued by `tick`
- running run with expired execution lease is recovered
- stale control queue message with old token is acknowledged and ignored
- missing workflow definition fails run
- replay mismatch fails run

Step-level recovery:

- queued task with expired queue lease is requeued
- running task with expired execution lease is recovered
- retryable task failure moves to `waitingRetry`
- fake clock advances past `nextRunAt`
- `tick` moves retry step to `queued`
- retry succeeds and workflow continues
- retry exhaustion fails workflow
- stale step queue message with old token is acknowledged and ignored
- late task success after timeout does not overwrite state

### Throughput Limits

Scenarios:

- global control cap is respected with multiple worker processes/fakes
- global step cap is respected
- pool `maxParallelism` cap is respected
- task requires both global step and pool capacity
- capacity acquisition order is row, global, pool
- capacity miss releases row claim
- capacity miss schedules jittered retry
- parallel fan-out cannot exceed global or pool capacity
- expired capacity leases free slots

### Logging and Traceability

Scenarios:

- every log includes workflow run ID
- control pass logs start and outcome
- scheduler logs due work and enqueue decisions
- scheduler logs stale/expired lease recovery
- stale queue jobs are debug-logged
- task attempt logs include step ID and attempt ID
- retry scheduled logs include next run time
- timeout logs include attempt ID and timeout
- parallel coordination logs child completed/expected counts
- cancellation logs requested and final outcomes
- host logger receives mirrored logs with workflow run ID
- task outputs are not logged

### Stale and Due Progression

Create rows directly through the store, then advance fake time and call `tick`.

Scenarios:

- queued workflow run with expired queue lease progresses
- waiting workflow run with due `nextRunAt` becomes queued
- queued task with expired queue lease progresses
- waiting retry task with due `nextRunAt` becomes queued
- waiting sleep due in the past becomes queued and then completed
- waiting parallel with completed children becomes queued and then completed
- running task with expired execution lease is recovered
- running control with expired execution lease is recovered
- non-due sleep remains waiting
- non-due retry remains waitingRetry

### Sleep

Scenarios:

- sleep handler returns future `Date`
- sleep row stores `sleepUntil`
- sleep waits without holding worker
- due sleep completes and marks run due
- past sleep completes immediately
- sleep over one year fails validation
- sleep handler is evaluated only on first creation

### Cancellation

Scenarios:

- cancel returns true for active run
- repeated cancel is safe
- cancel returns false for terminal or missing run
- queued steps are marked canceled
- waiting steps are marked canceled
- waitingRetry steps are marked canceled
- active task receives cooperative abort signal
- no future work is scheduled after cancellation
- cancellation wins over late success
- cancellation is visible through public run and step reads

### Retention

Scenarios:

- terminal completed run older than 90 days is deleted
- terminal failed run older than 90 days is deleted
- terminal canceled run older than 90 days is deleted
- active queued run is retained
- active running run is retained
- waiting run is retained
- blocked run is retained
- runtime-owned steps, attempts, events, logs, and leases cascade with deleted
  runs
- public cleanup API can run manually
- scheduler runs bounded daily cleanup by default

## Public API Tests

`getRun`:

- returns safe summary
- does not include input
- does not include output
- includes current step summary
- includes safe error summary

`listRuns`:

- filters by workflow name
- filters by status
- supports limit and offset
- does not include input/output

`getRunSteps`:

- returns flat ordered rows
- includes parent step IDs
- includes attempt summaries
- excludes task output
- includes safe error summaries

`getRunEvents`:

- returns timeline entries ordered by creation time
- includes message and optional JSON data
- includes workflow run ID and optional step ID

`getRunLogs`:

- returns structured logs ordered by creation time
- includes workflow run ID
- includes step and attempt IDs when available
- includes levels and safe data

## Acceptance Criteria

- The workflow runtime can run a sequential workflow from start to completion
  with scheduler-only queueing.
- The workflow runtime can run a workflow with parallel child tasks and fan-in.
- Workflow retries are visible in `workflow_steps` and `workflow_attempts`.
- pg-boss retries are not the source of user-visible task retry state.
- Stale queue jobs cannot execute current work because queue lease tokens are
  checked.
- Global and pool concurrency are enforced by database leases.
- Logs and attempts provide a full chronological trace by workflow run ID.
- No standard public read API exposes workflow input or task output.
- Tests cover the failure, recovery, throughput, and stale-row cases listed
  above.
