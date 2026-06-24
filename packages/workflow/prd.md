# Workflow Backend Plugin PRD

## Problem Statement

Teams building self-hosted applications need durable workflow execution without
adopting a hosted workflow platform. The current workflow package documents the
architecture goal, but it does not yet provide a shareable backend plugin that
other apps can install.

The target user wants Convex/Cloudflare-like workflow ergonomics while keeping
the stack self-hosted on PostgreSQL, Drizzle, and pg-boss. The plugin must make
long-running user actions durable, observable, retryable, cancelable, and safe
to resume after process restarts. It must also remain an infrastructure-layer
component: host domain services mutate domain tables, while the workflow runtime
owns execution state.

## Solution

Build a TypeScript backend workflow plugin with a runtime core, a PostgreSQL
store adapter, and a pg-boss queue adapter. Applications define workflows with
`ctx.task`, `ctx.sleep`, and `ctx.parallel`. The runtime persists workflow runs,
steps, attempts, events, logs, and capacity leases in PostgreSQL. A scheduler
derives due work from database state and sends disposable wake-up messages to
the queue adapter.

The runtime owns orchestration, retries, replay safety, cancellation, throughput
limits, and observability. pg-boss is used for queue delivery and worker
execution primitives, but workflow tables remain the source of truth.

The workflow handler returns `void`. Workflow results are represented through
domain state changes and user-facing events, not by returning a value to the
caller. `workflows.start(...)` creates a durable run and returns the workflow
run ID.

## User Stories

1. As an application developer, I want to define workflows in TypeScript, so
   that long-running application actions can be modeled near my service layer.
2. As an application developer, I want to call `workflows.start(...)` and get a
   run ID, so that HTTP handlers and services can trigger durable work without
   waiting for completion.
3. As an application developer, I want workflow handlers to return `void`, so
   that domain tables remain the source of product truth.
4. As an application developer, I want `ctx.task`, so that user-code work is a
   durable, retryable, observable execution unit.
5. As an application developer, I want task handlers to return either values or
   promises, so that synchronous and asynchronous work have the same workflow
   ergonomics.
6. As an application developer, I want task outputs persisted internally, so
   that workflow replay can continue after process restarts.
7. As an application developer, I want `ctx.sleep`, so that workflows can wait
   until a future time without holding a worker.
8. As an application developer, I want sleep handlers to return a `Date`, so
   that wake time is explicit and based on the runtime clock.
9. As an application developer, I want sleeps capped at one year, so that the
   workflow system does not accidentally become unbounded long-term scheduling.
10. As an application developer, I want `ctx.parallel`, so that independent
    tasks can fan out and then continue after all children complete.
11. As an application developer, I want parallel child results returned as an
    object keyed by task name, so that fan-in code is readable and safe.
12. As an application developer, I want parallel child keys validated as safe
    object keys, so that result objects are ergonomic and protected from unsafe
    names.
13. As an application developer, I want workflow names to support dotted domain
    names, so that workflows can be named like `company.enrich`.
14. As an application developer, I want default workflow and task pools, so that
    simple apps can start without capacity-planning ceremony.
15. As an application developer, I want tasks to override pools, so that one
    workflow can mix enrichment, email, and heavy work.
16. As an operator, I want global control and step concurrency limits, so that
    multiple worker processes cannot multiply throughput unexpectedly.
17. As an operator, I want pool-level `maxParallelism`, so that domain classes
    of work have independent throughput caps.
18. As an operator, I want capacity leases stored in PostgreSQL, so that global
    limits hold across worker processes and recover after crashes.
19. As an operator, I want workflow run IDs in every event and log, so that I
    can grep a full chronological history for one run.
20. As an operator, I want structured runtime logs, so that queueing, leasing,
    retries, stale jobs, and worker behavior are diagnosable.
21. As a product developer, I want user-facing workflow events, so that an app
    can show meaningful progress without exposing runtime internals.
22. As an operator, I want attempt history for every step advancement, so that
    successes, failures, retries, sleeps, and parallel coordination are
    auditable.
23. As an operator, I want stale queue jobs to be acknowledged and ignored, so
    that duplicate wake-up messages do not corrupt workflow state.
24. As an operator, I want workflow-driven retries, so that retry state is
    visible in workflow tables and portable across queue adapters.
25. As an application developer, I want `retry: false`, so that intentionally
    non-retriable tasks do not run more than once.
26. As an application developer, I want `NonRetryableWorkflowError`, so that a
    specific failure path can fail immediately without consuming remaining
    attempts.
27. As an operator, I want task timeouts enforced with `AbortSignal` and a
    timeout race, so that hung tasks do not hold leases forever.
28. As an operator, I want cancellation to be cooperative and idempotent, so
    that active work can stop safely while queued work is canceled.
29. As an operator, I want cancellation to win over late task success, so that
    canceled workflows do not advance future work after cancellation.
30. As an application developer, I want public read APIs to hide workflow input
    and task outputs, so that sensitive payloads are not exposed casually.
31. As an operator, I want `getRun`, `listRuns`, `getRunSteps`,
    `getRunEvents`, and `getRunLogs`, so that workflow state can be inspected
    without direct table access.
32. As an operator, I want `getRunSteps` to include attempt summaries, so that
    retry and coordination history is available with the step timeline.
33. As an application developer, I want the runtime to fail incompatible replay
    history, so that code changes do not silently reinterpret persisted state.
34. As an application developer, I want missing workflow definitions to fail
    runs clearly, so that deployment mistakes are visible.
35. As a package adopter, I want Drizzle table definitions and migrations, so
    that the plugin fits normal PostgreSQL deployment flows.
36. As a package adopter, I want fixed workflow table names in v1, so that the
    adapter and migrations remain simple.
37. As a package adopter, I want queue names to support a configurable prefix,
    so that shared pg-boss installations can avoid queue-name collisions.
38. As a maintainer, I want store and queue adapter interfaces, so that the
    runtime can later support different infrastructure without changing the
    workflow authoring API.
39. As a maintainer, I want an internal executor strategy registry, so that
    task, sleep, and parallel behavior stay isolated and testable.
40. As a maintainer, I want fake store, fake queue, and fake clock utilities, so
    that core runtime behavior can be tested deterministically.
41. As an operator, I want retention cleanup, so that old terminal workflow
    history does not grow forever.
42. As an operator, I want retention to skip active work, so that queued,
    waiting, running, retrying, and blocked workflows are never deleted.
43. As an application developer, I want host services injected through an app
    context factory, so that workflow code can call domain services without
    persisting live objects.
44. As an application developer, I want workflow input validated at start and
    execution time, so that persisted runs remain safe to replay.
45. As an operator, I want graceful shutdown handles, so that scheduler and
    worker processes can stop without corrupting leases.

## Implementation Decisions

- Build a runtime core with separate persistence and queue adapter interfaces.
- Ship one package in v1, with the core, adapters, executor strategies,
  testing fakes, and public exports grouped under one package.
- Expose `createWorkflowRuntime`, `createPostgresWorkflowStore`,
  `createPgBossWorkflowQueue`, public types, runtime errors, Drizzle table
  definitions, and migrations.
- Register definitions on the runtime instance with
  `workflows.define(...).handler(...)`.
- Duplicate workflow names throw during registration.
- `workflows.start(name, input)` requires the workflow definition to be
  registered on that runtime instance.
- `start` validates input, stores the run, and returns only the workflow run ID.
- `start` does not enqueue queue jobs directly. The scheduler derives work from
  database state.
- Workflow handlers return `void | Promise<void>`. Run-level output is not a v1
  concept.
- Workflow input is persisted on `workflow_runs` for replay but hidden from
  standard public reads.
- Task outputs are persisted on `workflow_steps` for replay but hidden from
  public reads and logs.
- Public primitives are `ctx.task`, `ctx.sleep`, and `ctx.parallel`.
- Do not expose `ctx.step` as an alias in v1.
- Store all primitives in `workflow_steps` with `type: task | sleep | parallel`.
- Common runtime code creates or loads a persisted step row before passing it to
  the type-specific executor.
- Executors receive the persisted step plus explicit runtime services and do
  not use globals.
- Use an internal executor strategy registry for `task`, `sleep`, and
  `parallel`.
- Keep custom public step types out of v1.
- Control passes replay until the first unresolved top-level step, schedule or
  advance that step, then exit.
- Top-level steps have `parentStepId = null`.
- Only task rows may have a parent, and the parent must be a parallel step.
- Parallel children are task-only in v1.
- Do not support nested parallel in v1.
- `ctx.parallel` uses a synchronous descriptor handler. Async work inside the
  parallel declaration is not allowed.
- `ctx.parallel` returns an object keyed by child task name.
- Parallel child task keys must be unique within their parent.
- Top-level replay safety uses sequence order; top-level keys are recommended
  to be descriptive but do not need DB uniqueness.
- `ctx.sleep` uses key/options/handler shape and the handler returns a wake
  `Date`.
- Sleep dates at or before now complete immediately.
- Sleeps are capped at one year.
- Task handlers may return a value or promise. The persisted output must be
  strict JSON.
- Workflow and step names are validated. Step and parallel keys must be safe
  JavaScript object identifiers and reject prototype-pollution keys. Workflow
  names may be dotted identifiers.
- Queue jobs are disposable wake-up hints. PostgreSQL workflow tables are the
  source of truth.
- Scheduler-only queueing is the v1 model.
- `tick()` performs bounded scheduling, recovery, and retention work.
- `scheduler()` loops over `tick()`.
- `workers()` starts queue workers.
- `work()` starts scheduler and workers as a local-development convenience.
- Production can run scheduler and workers in separate processes.
- Multiple schedulers may run concurrently, guarded by database queue leases and
  conditional updates.
- Queue payloads contain job type, target ID, and queue lease token only.
- Stale queue jobs are acknowledged and debug-logged.
- Default queue names are `workflow.control` and `workflow.steps.<pool>`.
- Queue names support a configurable prefix. Database table names are fixed in
  v1.
- Register one pg-boss step worker lane per pool.
- Runtime concurrency uses global control and step budgets plus pool
  `maxParallelism`.
- Defaults are `control: 10`, `steps: 10`, and a built-in `default` pool whose
  `maxParallelism` equals global step concurrency.
- Pool limits are caps, not reservations.
- Unknown pool names throw early.
- Row execution leases live on `workflow_runs` and `workflow_steps`.
- Global and pool capacity leases live in `workflow_leases`.
- Task execution claims the row first, then global step capacity, then pool
  capacity.
- Control execution claims the run row first, then global control capacity.
- Capacity misses release row claims and set a short jittered delay.
- Default queue lease duration is 30 seconds.
- Default heartbeat interval is 15 seconds.
- Execution leases use attempt timeout plus buffer and are heartbeated while
  active.
- Worker state mutations are fenced by lease token.
- Default task timeout is 10 minutes.
- Late task completion after timeout cannot overwrite workflow state.
- Default retry policy is `maxAttempts: 3`, `initialDelayMs: 1000`,
  `backoff: "exponential"`, and `jitter: true`.
- `maxAttempts` means total tries, including the first try.
- User-visible retries are workflow-driven. pg-boss retries are small bounded
  infrastructure retries only.
- `NonRetryableWorkflowError` fails immediately.
- `retry: false` disables retries for a task.
- Attempt rows are created after row claim and required capacity leases, before
  executor work begins.
- `workflow_attempts` belongs to `workflow_steps`, not workflow control passes.
- Control passes are logged with start and outcome entries.
- Events are simple product/user-facing timeline entries with message, optional
  JSON data, IDs, and timestamp.
- Logs are structured operational telemetry and may also be mirrored to an
  injected host logger.
- All logs and events include workflow run ID.
- Public `getRun` exposes a safe run summary and no input/output.
- Public `listRuns` filters by workflow name and status and uses offset
  pagination.
- Public `getRunSteps` returns a flat ordered list with parent IDs and attempt
  summaries.
- Public read APIs do not expose raw task output or workflow input.
- No admin/debug internals API in v1.
- `cancel(runId)` returns a boolean and is idempotent.
- Cancellation marks non-running work canceled, requests cooperative cancel for
  active tasks, and prevents future scheduling.
- If cancellation is requested before completion write, cancellation wins over
  late success.
- Retention defaults to 90 days for terminal runs and cascades runtime-owned
  rows.
- Scheduler runs bounded retention daily by default, and a public cleanup API is
  also available.

## Testing Decisions

- Test external behavior and durable state transitions rather than private
  implementation details.
- Use fake store, fake queue, fake clock, and deterministic IDs for core runtime
  tests.
- Use real PostgreSQL for store integration tests.
- Use pg-boss against PostgreSQL for queue adapter integration tests.
- Use real PostgreSQL plus pg-boss for end-to-end runtime tests.
- Cover parallelism at workflow level and child task level.
- Cover failure recovery for workflow runs and all step types.
- Cover throughput limits for global control, global steps, and pool
  `maxParallelism`.
- Cover logging traceability from control passes, scheduler work, task attempts,
  retry scheduling, parallel coordination, stale jobs, and host logger mirroring.
- Cover stale workflows and stale steps of all types, with fake-clock time
  advance to prove progression.
- Cover sleeps, retries, cancellation, retention, replay mismatch, and stale
  queue token behavior.

## Out of Scope

- Frontend hooks or UI ingestion.
- Run-level workflow output.
- Public raw input/output inspection APIs.
- Custom public step types.
- Nested parallelism.
- Sleep inside parallel.
- Wait-for-external-event primitive.
- Pause/resume controls.
- Non-Postgres persistence adapters.
- Non-pg-boss queue adapters.
- Runtime auto-migrations.
- Start metadata.
- Direct workflow runtime mutation of host domain tables.

## Further Notes

- The runtime is infrastructure-layer code. Host domain services own domain
  tables and business rules.
- Queue adapters deliver wake-up messages. The store adapter owns durable state.
- pg-boss pool lanes are operational lanes, not the source of concurrency truth.
- The README should lead with DX quickstart, then setup/migrations, then
  architecture and operational details.
