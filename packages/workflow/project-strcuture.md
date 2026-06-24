# Workflow Package Project Structure

## Overview

The workflow package is a shareable backend plugin. Its core runtime must not
depend on Drizzle, pg-boss, or host application domain code. Infrastructure is
introduced through adapters.

The package should be organized around deep modules with narrow, stable
interfaces:

- Runtime core for public workflow authoring.
- Orchestrator for durable replay and state movement.
- Executor strategies for `task`, `sleep`, and `parallel`.
- Store adapter for durable state.
- Queue adapter for wake-up delivery and worker registration.
- Testing fakes for deterministic core coverage.

## Proposed Layout

```text
packages/workflow/
  README.md
  prd.md
  database-design.md
  project-strcuture.md
  test-implementation-plan.md
  package.json
  tsconfig.json

  src/
    index.ts

    core/
      runtime.ts
      definition-registry.ts
      workflow-context.ts
      errors.ts
      types.ts

    orchestrator/
      control-runner.ts
      step-recorder.ts
      step-finalizer.ts
      scheduler.ts
      retention.ts
      cancellation.ts

    executors/
      executor-registry.ts
      task-executor.ts
      sleep-executor.ts
      parallel-executor.ts

    retry/
      retry-policy.ts
      backoff.ts

    leases/
      execution-leases.ts
      capacity-leases.ts

    observability/
      events.ts
      logs.ts
      safe-error.ts

    adapters/
      store/
        workflow-store.ts
        postgres/
          postgres-workflow-store.ts
          schema.ts
          migrations/
            0001_workflow_runtime.sql

      queue/
        workflow-queue.ts
        pg-boss/
          pg-boss-workflow-queue.ts

    testing/
      fake-clock.ts
      fake-workflow-store.ts
      fake-workflow-queue.ts
      test-runtime.ts

  tests/
    core/
      retry-policy.unit.ts
      scheduler.unit.ts
      replay.unit.ts
      parallel.unit.ts
      cancellation.unit.ts

    store/
      postgres-workflow-store.integration.ts

    queue/
      pg-boss-workflow-queue.integration.ts

    e2e/
      workflow-runtime.integration.ts
```

The filename `project-strcuture.md` intentionally follows the requested name.

## Public Exports

`src/index.ts` should expose the supported package surface:

- `createWorkflowRuntime`
- `createPostgresWorkflowStore`
- `createPgBossWorkflowQueue`
- `NonRetryableWorkflowError`
- public runtime types
- public status types
- public config types
- Drizzle workflow table definitions

Internal modules should not be exported unless they are needed by tests or
adapters. Keep executor internals, scheduler internals, replay internals, and
lease helpers private to the package.

## Core

`core/` owns the author-facing runtime API.

Responsibilities:

- Create the workflow runtime instance.
- Register workflow definitions on the runtime instance.
- Validate duplicate workflow names.
- Provide the workflow context used by handlers.
- Define public errors and public types.
- Enforce `void | Promise<void>` workflow handlers.

The runtime instance is the definition registry. There is no global registry.
Worker processes must import and register definitions before starting workers.

Core depends on adapter interfaces, not adapter implementations.

## Orchestrator

`orchestrator/` owns durable execution movement.

Responsibilities:

- Run workflow control passes.
- Replay workflow handlers.
- Stop at the first unresolved top-level step.
- Create or load `workflow_steps` rows through common runtime logic.
- Validate replay sequence, type, and key.
- Centralize post-completion routing.
- Mark child task completion as parent parallel due.
- Mark top-level step completion as workflow run due.
- Run scheduler ticks.
- Run recovery work.
- Run retention cleanup.
- Handle cancellation.

Important modules:

- `control-runner.ts` replays workflow handlers and advances runs.
- `step-recorder.ts` creates/loads persisted step rows before execution.
- `step-finalizer.ts` centralizes completion/failure/cancellation routing.
- `scheduler.ts` scans due rows, writes queue lease tokens, and enqueues jobs.
- `retention.ts` deletes old terminal workflow data.
- `cancellation.ts` implements cooperative cancellation semantics.

## Executors

`executors/` implements the internal strategy pattern for step types.

Step types:

```text
task
sleep
parallel
```

Executor responsibilities:

- Receive an already persisted step row.
- Advance that row according to its type.
- Create attempt rows after row claim and capacity leases.
- Persist results, errors, and next scheduling state.
- Avoid duplicating common replay or row-creation logic.

`task-executor.ts`:

- Runs user task handlers.
- Handles strict JSON output.
- Applies timeout and cooperative cancellation.
- Records retryable and non-retryable failures.

`sleep-executor.ts`:

- Persists wake `Date` on first advancement.
- Moves future sleeps to `waiting`.
- Completes due sleeps.
- Enforces one-year max sleep horizon.

`parallel-executor.ts`:

- Calls the synchronous descriptor handler.
- Creates child task rows.
- Marks children due.
- Coordinates fan-in.
- Completes parent when all children complete.
- Fails parent when a child fails terminally.

## Retry

`retry/` is a deep module for retry policy.

Responsibilities:

- Merge runtime, workflow, and task retry defaults.
- Snapshot effective retry config onto steps.
- Calculate next retry times.
- Apply constant, linear, and exponential backoff.
- Apply jitter.
- Handle `retry: false`.
- Handle `NonRetryableWorkflowError`.

No retry functions should depend on queue or database implementations.

## Leases

`leases/` separates row execution ownership from global capacity.

`execution-leases.ts`:

- Claim run rows.
- Claim step rows.
- Heartbeat active execution leases.
- Fence writes with lease tokens.
- Release row leases.

`capacity-leases.ts`:

- Acquire global control leases.
- Acquire global step leases.
- Acquire pool leases.
- Release capacity leases.
- Expire stale capacity leases.

Capacity leases are backed by `workflow_leases`. Row execution leases live on
`workflow_runs` and `workflow_steps`.

## Observability

`observability/` owns safe event and log writing.

`events.ts`:

- Implements `ctx.event(message, data?)`.
- Persists product/user-facing timeline entries.
- Validates optional strict JSON data.

`logs.ts`:

- Writes runtime logs.
- Implements `ctx.log(level, message, data?)`.
- Mirrors logs to an optional host logger.
- Ensures workflow run ID is included.

`safe-error.ts`:

- Extracts safe error name, message, stack, retryable flag, and explicit details.
- Avoids serializing arbitrary error objects.

## Adapters

All infrastructure implementations live under `adapters/`.

### Store Adapter

`adapters/store/workflow-store.ts` defines the persistence interface used by
core and orchestrator code.

The interface covers:

- run creation and claiming
- step creation and claiming
- attempt creation and completion
- scheduler scans
- queue lease writes
- execution lease writes
- capacity lease writes
- event and log persistence
- retention cleanup
- safe public reads

`adapters/store/postgres/` implements the interface with Drizzle and PostgreSQL.

It exports:

- `createPostgresWorkflowStore`
- Drizzle table definitions
- SQL migrations

The store adapter is named for PostgreSQL, even though the v1 implementation
accepts a Drizzle PostgreSQL client.

### Queue Adapter

`adapters/queue/workflow-queue.ts` defines the queue interface.

The interface covers:

- starting/stopping queue infrastructure
- registering control workers
- registering step workers per pool
- enqueueing control jobs
- enqueueing step jobs

`adapters/queue/pg-boss/` implements the interface with pg-boss.

The pg-boss adapter owns:

- queue naming
- queue prefix handling
- pg-boss lifecycle
- worker registration
- pool lane registration
- small bounded infrastructure retry config

The queue adapter does not decide workflow retries or workflow state.

## Testing Support

`testing/` contains test utilities for package tests and optionally consumers.

Fakes:

- fake clock for deterministic sleeps/retries/retention
- fake workflow store for core state-machine tests
- fake workflow queue for scheduler and stale-job tests
- test runtime helper for wiring common test scenarios

Testing helpers must not become production dependencies or hidden globals.

## Process Model

The runtime exposes four process-level methods:

```text
tick()
scheduler()
workers()
work()
```

`tick()`:

- Runs one bounded scheduling, recovery, and retention pass.
- Can be called by tests, cron, or operators.

`scheduler()`:

- Loops over `tick()` on a configurable cadence.
- Default cadence is one second.
- Returns a stop handle.

`workers()`:

- Starts queue workers through the queue adapter.
- Registers one control worker lane.
- Registers one step worker lane per pool.
- Returns a stop handle.

`work()`:

- Starts scheduler and workers together.
- Intended as local-development convenience.
- Returns a stop handle.

Production should be able to run scheduler and workers as separate processes
under PM2, containers, or another process manager.

## Dependency Direction

Allowed dependencies:

```text
core -> adapter interfaces
orchestrator -> core types, adapter interfaces, executors, retry, leases, observability
executors -> adapter interfaces, retry, leases, observability
adapters -> adapter interfaces and external libraries
```

Disallowed dependencies:

```text
core -> pg-boss
core -> Drizzle-specific implementation
executors -> pg-boss
host domain services -> package internals
adapters -> host domain code
```

Host services are accessed only through the app context factory and `ctx.app`.

## Naming and Style

- Use kebab-case filenames.
- Prefer `type` aliases over interfaces.
- Use top-level arrow function exports.
- Exported functions should have explicit return types.
- Avoid non-null assertions.
- Keep comments sparse and focused on non-obvious runtime invariants.
