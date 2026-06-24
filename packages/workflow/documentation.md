# Workflow API Developer Experience

## Overview

The workflow package should feel like a small durable-execution runtime that
application code can wire into an existing self-hosted backend. The developer
defines workflows in TypeScript, starts them from application code, and runs a
scheduler plus workers in background processes.

The workflow runtime owns execution state. Host services own domain state.

```text
Application code
  -> workflows.start(...)
  -> returns workflow run ID

Workflow runtime
  -> schedules durable steps
  -> executes tasks through workers
  -> records events, logs, attempts, retries, and cancellation

Host services
  -> mutate domain tables
  -> remain the source of product truth
```

## Runtime Setup

Applications create one workflow runtime by wiring a store adapter, queue
adapter, concurrency budgets, pools, and an app context factory.

```ts
const workflows = createWorkflowRuntime({
  store: createPostgresWorkflowStore(db),
  queue: createPgBossWorkflowQueue({
    connectionString,
    queuePrefix: "workflow",
  }),

  concurrency: {
    control: 10,
    steps: 10,
  },

  pools: {
    default: { maxParallelism: 10 },
    enrichment: { maxParallelism: 20 },
    email: { maxParallelism: 100 },
  },

  createAppContext: async () => ({
    services: {
      company: companyService,
      email: emailService,
    },
    system: {
      logger,
    },
  }),
});
```

If no pools are configured, the runtime creates a `default` pool whose
`maxParallelism` matches global step concurrency.

## Defining Workflows

Workflows are registered on the runtime instance.

```ts
workflows.define({
  name: "company.enrich",
  input: companyEnrichInput,
  pool: "enrichment",
}).handler(async (ctx, input): Promise<void> => {
  await ctx.event("Looking up website");

  const website = await ctx.task("normalizeWebsite", () => {
    return normalizeWebsite(input.website);
  });

  await ctx.event("Fetching homepage");

  const homepage = await ctx.task("fetchHomepage", {
    retry: {
      maxAttempts: 5,
      initialDelayMs: 1000,
      backoff: "exponential",
      jitter: true,
    },
  }, async () => {
    return fetchHomepage(website);
  });

  const assets = await ctx.parallel("collectAssets", () => [
    ctx.task("extractProfile", async () => {
      return extractProfile(homepage);
    }),

    ctx.task("fetchLogo", async () => {
      return fetchLogo(homepage);
    }),
  ]);

  await ctx.task("saveCompany", async () => {
    await ctx.app.services.company.applyProfile(input.companyId, {
      profile: assets.extractProfile,
      logo: assets.fetchLogo,
    });
  });

  await ctx.event("Company enrichment complete");
});
```

Workflow handlers return `void`. They do not return values to the caller.
Domain state changes should happen through host services inside tasks.

## Starting Workflows

Application code starts a workflow and receives a run ID.

```ts
const runId = await workflows.start("company.enrich", {
  companyId,
  website,
});
```

`start` validates input and stores a durable run. It does not execute the
workflow inline and does not return workflow output.

The scheduler later picks up the queued run and sends wake-up jobs to the queue
adapter.

## Tasks

`ctx.task` is the primitive for user-code work.

```ts
const profile = await ctx.task("fetchProfile", async () => {
  return fetchProfile(input.website);
});
```

Task rules:

- Task names must be valid safe object identifiers.
- Task outputs must be strict JSON.
- Task outputs are persisted for replay.
- Task outputs are not exposed by standard public read APIs.
- Tasks are treated as idempotent by contract.
- Retries are enabled by default.

Task options:

```ts
await ctx.task("sendEmail", {
  pool: "email",
  timeoutMs: 30_000,
  retry: false,
}, async () => {
  await ctx.app.services.email.sendWelcome(input.userId);
});
```

Use `retry: false` when a task must never retry.

Throw `NonRetryableWorkflowError` when a specific failure should fail
immediately:

```ts
await ctx.task("fetchProfile", async () => {
  const response = await fetch(input.url);

  if (response.status === 404) {
    throw new NonRetryableWorkflowError("Website not found", {
      details: { url: input.url },
    });
  }

  if (!response.ok) {
    throw new Error("Temporary upstream failure");
  }

  return response.json();
});
```

## Sleep

`ctx.sleep` creates a durable wait without holding a worker.

```ts
await ctx.sleep("waitBeforeFollowup", () => {
  return ctx.clock.fromNow({ days: 3 });
});
```

Sleep rules:

- The handler returns a `Date`.
- The wake date is persisted when the sleep is first created.
- Replays reuse the persisted wake date.
- Dates at or before now complete immediately.
- Sleeps are capped at one year.

## Parallel

`ctx.parallel` runs child tasks concurrently and waits for all of them.

```ts
const result = await ctx.parallel("collectAssets", () => [
  ctx.task("fetchProfile", async () => {
    return fetchProfile(input.website);
  }),

  ctx.task("fetchLogo", async () => {
    return fetchLogo(input.website);
  }),
]);

result.fetchProfile;
result.fetchLogo;
```

Parallel rules:

- The parallel handler is synchronous.
- The handler returns an array of `ctx.task` descriptors.
- Child task keys must be unique within the parallel call.
- The result is an object keyed by child task name.
- Child tasks retry independently.
- Successful children are not rerun when another child retries.
- One terminal child failure fails the parallel step and the workflow.
- Nested parallel is not supported in v1.
- Sleep inside parallel is not supported in v1.

## Events and Logs

Use `ctx.event` for user-facing progress.

```ts
await ctx.event("Fetching company homepage");
await ctx.event("Company profile extracted", { companyId: input.companyId });
```

Events are simple timeline entries. They do not have log levels in v1.

Use `ctx.log` for operational context.

```ts
await ctx.log("info", "provider request started", {
  provider: "clearbit",
});
```

The runtime also writes automatic logs for control passes, scheduler work,
attempts, retries, stale jobs, cancellation, and parallel coordination.

Every event and log includes the workflow run ID.

## Running Background Processes

The runtime exposes process-level methods.

```ts
await workflows.tick();
```

Runs one bounded scheduling, recovery, and retention pass.

```ts
const scheduler = await workflows.scheduler({
  intervalMs: 1000,
});
```

Runs `tick` on a loop.

```ts
const workers = await workflows.workers();
```

Starts queue workers through the queue adapter.

```ts
const workerRuntime = await workflows.work();
```

Starts scheduler and workers together. This is useful for local development.

Production can split processes:

```text
web process
  calls workflows.start(...)

workflow-scheduler process
  calls workflows.scheduler(...)

workflow-worker process
  calls workflows.workers(...)
```

Each long-running method returns a stop handle.

```ts
const workers = await workflows.workers();

process.on("SIGTERM", async () => {
  await workers.stop();
});
```

## Inspecting Runs

Standard read APIs expose safe summaries.

```ts
const run = await workflows.getRun(runId);
```

`getRun` returns status, current step summary, safe error summary, and
timestamps. It does not return workflow input or task output.

```ts
const runs = await workflows.listRuns({
  workflowName: "company.enrich",
  status: "waiting",
  limit: 50,
  offset: 0,
});
```

`listRuns` filters by workflow name and status.

```ts
const steps = await workflows.getRunSteps(runId);
```

`getRunSteps` returns a flat ordered list with `parentStepId` and attempt
summaries. It does not return task outputs.

```ts
const events = await workflows.getRunEvents(runId);
const logs = await workflows.getRunLogs(runId);
```

Events are product-facing progress. Logs are operational telemetry.

## Cancellation

Cancellation is idempotent.

```ts
const canceled = await workflows.cancel(runId);
```

Cancellation behavior:

- queued and waiting steps are marked canceled
- running tasks receive cooperative cancellation through `ctx.signal`
- no future work is scheduled
- late success cannot overwrite canceled state

## Authoring Rules

- Treat every retriable task as idempotent.
- Pass IDs and strict JSON through workflow input.
- Access services through `ctx.app`, not workflow input.
- Put domain state changes in host services.
- Use `ctx.event` for product progress.
- Use `ctx.log` for operational details.
- Do not rely on workflow handler return values.
- Do not expose task outputs through product APIs unless a future explicit
  inspection helper is introduced.
