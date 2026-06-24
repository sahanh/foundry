# Workflow-Native Application Architecture

A self-hosted, Convex-like/CF Workflow pattern where user actions create durable workflows,
workflows mutate domain state, and frontend hooks abstract polling or future
realtime delivery.

## Business Goal

Build a sharable plugin where most meaningful user actions are handled
as durable workflows rather than synchronous request-response operations.

- Workflows can run for seconds, minutes, or longer.
- Users receive meaningful progress feedback while present.
- Users can leave and return later without losing context.
- Frontend renders domain state, not workflow internals.
- Workflow execution is a reusable platform capability across modules.
- The system remains self-hosted using Postgres, workers, and frontend hooks.

## Core Principle

Frontend reads domain state. Workflows mutate domain state. Workflow events
provide progress context.

For example, the settings page should read `company.enrichmentStatus`. It should
not need to know which workflow is running or how many internal steps exist.

## Architecture Flow

```text
User Action
  |
  v
Workflow Definition
  |
  v
Workflow Runtime
  |
  v
Queue / Worker
  |
  v
Domain Tables + Workflow Events
  |
  v
Frontend Hooks
  |
  v
UI
```

## Persistence Model

### Domain Tables

Represent product truth.

```text
companies
contacts
projects
quotes
```

### Workflow Tables

Represent execution truth.

```text
workflow_runs
workflow_events
workflow_steps // optional
```

### Example company model

```text
Company {
  id
  website
  name
  logoUrl
  industry

  enrichmentStatus:
    "pending"
    | "enriching"
    | "ready"
    | "failed"
}
```

## Workflow Tables

### `workflow_runs`

```text
{
  id
  workflowName
  workflowVersion

  entityType
  entityId

  status
  input
  output
  error
  currentPhase

  createdAt
  updatedAt
}
```

### `workflow_events`

```text
{
  id
  runId

  level
  type
  message
  data

  createdAt
}
```

## Pseudo-code: Workflow Definition

```ts
defineWorkflow({
  name: "company.enrich",
  version: 1,

  async execute(ctx, input) {
    await db.company.update(input.companyId, {
      enrichmentStatus: "enriching"
    })

    ctx.event("Looking up website")
    const website = await normalizeWebsite(input.website)

    ctx.event("Fetching homepage")
    const page = await fetchHomepage(website)

    ctx.event("Extracting company details")
    const profile = await extractProfile(page)

    await db.company.update(input.companyId, {
      name: profile.name,
      industry: profile.industry,
      logoUrl: profile.logoUrl,
      enrichmentStatus: "ready"
    })

    ctx.event("Company enrichment complete")
  }
})
```

## Workflow Runtime Responsibilities

| Capability | Meaning |
| --- | --- |
| Dispatching | Start a workflow from a user action, webhook, cron, or backend call. |
| Execution | Run the workflow outside the request lifecycle. |
| Retries | Retry failed steps or runs where safe. |
| Cancellation | Allow workflows to be stopped when appropriate. |
| Versioning | Keep old runs tied to the workflow version they started with. |
| Progress tracking | Emit user-facing and debug events. |
| Persistence | Store run status, inputs, outputs, errors, and events. |

## Frontend Hooks

The frontend should feel similar to Convex's `useQuery`, but implemented using
TanStack Query, tRPC or REST, and polling first.

### Domain hook

```ts
const company = useCompany(companyId)
```

### Possible implementation

```ts
function useCompany(companyId) {
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: fetchCompany,

    refetchInterval(data) {
      return data?.enrichmentStatus === "enriching"
        ? 2000
        : false
    }
  })
}
```

### Workflow hook

```ts
const enrichment = useWorkflow({
  workflow: "company.enrich",
  entityType: "company",
  entityId: companyId
})
```

## UI Process

### Onboarding

```text
User enters messy website input
  |
  v
Create company record
  |
  v
Set company.enrichmentStatus = "enriching"
  |
  v
Start company.enrich workflow
  |
  v
Show onboarding progress screen
  |
  v
Workflow fills company fields
  |
  v
Set company.enrichmentStatus = "ready"
  |
  v
Dashboard loads
```

### User leaves and returns

The workflow continues. When the user returns, the frontend loads the company
record. If `enrichmentStatus` is `ready`, it shows the dashboard. If it is
`failed`, it shows fallback fields or recovery actions.

## Recommended Self-hosted Stack

| Layer | Recommendation |
| --- | --- |
| Frontend | React |
| Client query/cache | TanStack Query |
| Typed API | tRPC or REST wrapper |
| Database | Postgres |
| Background jobs | pg-boss or Graphile Worker |
| Custom platform layer | Workflow runtime + workflow hooks |

## Final Rule

Generic workflow tables store execution. Domain tables store truth. Hooks
abstract transport. Polling is the first implementation detail; realtime can be
added later.
