Make sure named-decisions.md explicitly cover not embedding business rules, rather it's wraps unit like logic under domain terms.

Review
4. Monitoring
7. Default validation (eg: payload lengths)
8. datetime



 Why ctx.now() instead of new Date()

    The problem with scattering new Date() through the services is that time becomes an uncontrollable, hidden input. Every service call silently reaches out to the wall clock, which makes the state machine impossible to test deterministically:

      1. Deterministic state-machine tests — The whole point of this project is a "perfect state machine." To assert exact ordering, timestamps, and transitions in tests, you need to control "now." With an injectable clock, a test can pin time to a fixed instant and assert that a task's createdAt, a run's startedAt, and an activity's stamp all equal that exact instant — which is precisely what the new clock-injection.integration.ts test does.
      2. A single seam for "now" — Instead of N independent calls to the global clock, there's one place time enters the domain (ctx.now()), riding on AppContext exactly like actor and traceId already do. It's the same dependency-injection pattern the codebase uses everywhere else: the domain reaches infrastructure only through the context.
       3. It threads through transactions — Because createAppContext passes the now factory into the transaction-derived context, an injected clock flows into every nested service call on the same boundary. So a whole workflow runs against one consistent, controllable clock.

      In production it's omitted, so it defaults to () => new Date() — real wall-clock time, zero behavior change.

      Where new Date() deliberately remained

      Three categories were intentionally left:

    - The seam's own default factory — app-context.ts (~line 68): () => new Date() is the real-clock default. This is the definition of the seam, not a usage of it.
      - Cursor decoding, not timestamp stamping — task-collection.service.ts (~lines 89–90): new Date(after.createdAt) parses a numeric pagination cursor value back into a Date for the findByStatus WHERE comparison. It's decoding an input, not stamping a row.
      - Outside the domain layer — Postgres-side defaultNow() column defaults (those are DB-side, not JS), plus infra like the MCP bootstrap, src/index.ts, and the logger. D17 scopes clock injection to domain services stamping domain rows.

      The rule of thumb the implementation followed: if a service or workflow stamps a domain row's timestamp (createdAt/updatedAt/startedAt/finishedAt), use ctx.now(); otherwise leave the raw new Date(). The converted spots were the create/update paths across user, agent, project, task, run, and activity services (including supersedeActiveRuns and the activity+attachments persist).