# Testing

How to test a feature. This is the starting baseline — the high-value layers — not the whole pyramid; expand later.

## What to Test Where

| Target | Test type | File | Why |
|--------|-----------|------|-----|
| `shared/validation.ts` — domain-level business-rule guards | **Unit** | `<name>.unit.ts` | The business rules in isolation — a cheap, exhaustive surface. Stub any lookup a guard performs. |
| Services | **Integration** | `<name>.integration.ts` | A service runs its logic over dependencies (repositories, etc.); test it wired to real or in-memory adapters. |
| Workflows | **Integration** | `<name>.integration.ts` | A workflow composes multiple services; test the composed flow. |

Tests live in `<feature>/__tests__/` with the `.unit.ts` / `.integration.ts` suffixes (see start-here.md → File Naming).

## Starting Point

The rule for now: **business rules get unit tests; services and workflows get integration tests.** Controllers, end-to-end flows, and exhaustive edge-case matrices come later — this baseline is the minimum worth having, not the ceiling.

## Integration Test Setup — AppContext

Every service receives an `AppContext` through its constructor (see [app-context.md](./app-context.md)). Integration tests construct a **test AppContext** and supply it when instantiating the service under test. No service code changes between production and test — only the context differs.

```
testCtx = {
  traceId: 'test-trace-id',
  system: {
    db: testDatabaseClient,      // real test DB or in-memory
    logger: noopLogger,          // silent in tests unless debugging
    // add spy adapters for any other system adapters the service uses
  }
}

service = new TodoCommentService(comment, testCtx)
```

**Database** — use a real test database or an in-memory equivalent. Do not stub `ctx.system.db` at the call level; that collapses an integration test into a unit test.

**Infrastructure side effects** — for any system adapter that dispatches a side effect, use a capture/spy adapter in the test context. After the service method runs, assert on what the spy recorded. This is the concrete mechanism behind the rule that every infrastructure side effect must be asserted.

**Atomicity** — a use case that runs inside a transaction boundary (see [atomicity.md](./atomicity.md)) must be tested for all-or-nothing behaviour:

- **Rollback** — force a failure partway through the use case (e.g. the second service throws) and assert that **no** rows were written — every write from earlier steps is rolled back — and that **no** side-effect spy was called, since effects are dispatched only after commit.
- **Commit** — on the happy path, assert that every write is present and each side effect fired exactly once, after the boundary committed.

## Integration Test Flavours

Both flavours live in the same `.integration.ts` file. Use `describe` blocks to signal intent — e.g. `describe('CommentService / service layer')` vs `describe('CommentService / leave comment use case')`.

### Service-layer

Verifies the cross-cutting behaviour of a service method — that it wires together correctly with repositories, job queues, downstream services, and any other collaborators. The goal is confidence that the full chain holds, not just the logic at a single method boundary.

- Repositories and adapters must be real or in-memory — not stubbed at the call level.
- If the method contains time-bound logic, simulate the clock. Cover all relevant temporal cases: before the threshold, at the threshold, and after it.
- Every infrastructure side effect (job queued, email dispatched) must be asserted — not just the return value.

### Use-case

Shaped as a user story with a named actor and a named scenario. The test should read like a spec, not a method call sequence.

- Both positive and negative polarities must exist. A use case with only a happy path is incomplete.
- If time simulation is needed, it must reflect a realistic scenario — a real-world moment that the logic is designed to handle, not an arbitrary value chosen for convenience.
- Infrastructure side effects (email sent or not sent, job queued or not queued) must be asserted as part of the scenario's contract.

## Integration Test Checklist

Run through the relevant column before marking an integration test done.

| Service-layer | Use-case |
|---|---|
| The real service method is called — not a mock of it | The test is named after a scenario, not a method |
| Repositories and adapters are real or in-memory | Both positive and negative polarities are covered |
| Time-bound logic uses a simulated clock | Time simulation (if any) maps to a real-world scenario |
| All temporal cases are covered: before, at, and after the threshold | Infrastructure side effects are asserted — sent or not sent, queued or not queued |
| Every infrastructure side effect is asserted | |

## What Doesn't Count as an Integration Test

### Service-layer anti-patterns

- **Mocking the service's own dependencies** — if repositories and queues are stubbed at the call level, it's a unit test wearing integration clothes.
- **Asserting only the return value** — if a job was supposed to be queued or an email dispatched and you didn't assert it, the test is incomplete.
- **Hardcoded times without clock simulation** — if the method branches on time and the test uses a fixed timestamp without controlling the clock, the temporal cases are untested.
- **Asserting that the method didn't throw** — that's not a behavioural assertion; it tells you nothing about what the method actually produced.

### Use-case anti-patterns

- **Named after a method** — `createComment` is a method name; `owner receives email when a different user comments` is a use case. If the name doesn't describe a scenario, it's not a use case test.
- **Only the happy path** — a use case test with no negative case leaves the most important boundary untested.
- **Arbitrary time values** — picking a timestamp because it's convenient (epoch zero, far future) rather than because it represents a real moment the logic is designed to handle produces tests that don't reflect reality.
- **Checking persistence but not side effects** — if the scenario's contract includes sending an email and you only asserted that the record was saved, the test is silent on the most user-visible part of the behaviour.
