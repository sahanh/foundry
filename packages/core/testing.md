# Testing

How to test a feature. Baseline only — the high-value layers, not the whole pyramid: **business rules get unit tests; services and orchestrations get integration tests.** Controllers, end-to-end flows, and exhaustive edge-case matrices come later; this is the floor, not the ceiling.

## What to Test Where

| Target | Test type | File | Why |
|--------|-----------|------|-----|
| `shared/validation.ts` — domain-level business-rule guards | **Unit** | `<name>.unit.ts` | The business rules in isolation — a cheap, exhaustive surface. Stub any lookup a guard performs. |
| Services | **Integration** | `<name>.integration.ts` | Runs logic over dependencies; test wired to real or in-memory adapters. |
| Orchestrations | **Integration** | `<name>.integration.ts` | Composes multiple services; test the composed flow. |

Tests live in `<feature>/__tests__/` with the `.unit.ts` / `.integration.ts` suffixes (see start-here.md → File Naming).

## Integration Test Setup — AppContext

Every service receives an `AppContext` through its constructor ([app-context.md](./app-context.md)). Integration tests construct a **test AppContext** for the service under test — no service code changes between production and test; only the context differs.

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

- **Database** — real test database or in-memory equivalent. Never stub `ctx.system.db` at the call level — that collapses the test into a unit test.
- **Infrastructure side effects** — every system adapter that dispatches a side effect gets a capture/spy adapter in the test context; assert on what the spy recorded. This is the mechanism behind "every infrastructure side effect must be asserted".
- **Atomicity** — a use case inside a transaction boundary ([atomicity.md](./atomicity.md)) must be tested all-or-nothing: force a mid-flow failure (e.g. the second service throws) → assert **no** rows written and **no** side-effect spy called (effects dispatch only after commit); happy path → every write present, each effect fired exactly once, after commit.

## Integration Test Flavours

Both flavours live in the same `.integration.ts` file; signal intent with `describe` blocks — e.g. `describe('CommentService / service layer')` vs `describe('CommentService / leave comment use case')`.

- **Service-layer** — verifies a method's cross-cutting behaviour: correct wiring with repositories, job queues, and downstream services; confidence the full chain holds, not one method boundary.
- **Use-case** — shaped as a user story with a named actor and a named scenario; reads like a spec, not a method-call sequence.

Each row is a rule as check and disqualifier: tick every **Do** before marking the test done; any **Not** disqualifies it as an integration test.

| Flavour | Do | Not |
|---|---|---|
| Service-layer | Call the real service method, with repositories and adapters real or in-memory | Mocking the method or stubbing its own repos/queues at the call level — a unit test in integration clothes |
| Service-layer | Simulate the clock for time-bound logic; cover before, at, and after the threshold | Hardcoded timestamps without clock control — temporal cases untested |
| Service-layer | Assert every infrastructure side effect (job queued, email dispatched) | Asserting only the return value, or only that it didn't throw — not behavioural |
| Use-case | Name the test after the scenario — `owner receives email when a different user comments` | Naming it after a method — `createComment` |
| Use-case | Cover both positive and negative polarities | Happy path only — the most important boundary untested |
| Use-case | Time simulation reflects a realistic moment the logic is designed to handle | Arbitrary convenient values (epoch zero, far future) |
| Use-case | Assert side effects as part of the scenario's contract — sent or not sent, queued or not queued | Checking persistence only — silent on the most user-visible behaviour |

---

**Verify:** when done, check [end-here.md](./end-here.md) → Testing.
