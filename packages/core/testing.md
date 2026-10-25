# Testing

Tests exist to **remove the risk that shipped logic is wrong, at the lowest cost.** A coverage number is not the goal: a suite can touch every line and still miss the race, the rollback or the refusal that matters, and a suite that repeats every case at every level only makes CI slower. **Every piece of logic is tested; which level owns each risk is decided by a test strategy, written before the code.**

Three parts work together:

- **Unit tests** — cheap, so they carry as many cases as possible.
- **Integration tests** — expensive, so each one proves something only the real backend can show.
- **Logic structured for both** — a rule with many cases sits behind a pure seam, so unit tests can cover it exhaustively instead of paying for an integration test per case.

Running the suites is infrastructure, not strategy: the adopting repo's CI runs them ([setup/ci-verification.md](../../setup/ci-verification.md)).

## The Two Levels

| | **Unit** | **Integration** |
|---|---|---|
| **Tests** | One pure piece of logic: a rule, calculator, parser, mapper, policy | One use case, or one service method, through the real backend layers |
| **Runs with** | No database, no network, no framework boot. Reading a realistic fixture file is fine. | The test `AppContext` below: the production database engine, a persisted actor, the internal queue running |
| **Mocks** | Nothing of its own; any lookup it is handed is stubbed | **Only external vendors** (email, payments, LLM, HTTP APIs), at their adapter. Never the database, your own services, internal events or the queue. |
| **Shape** | Table-driven and exhaustive — every variant, every boundary | Few tests, each proving something unit tests cannot observe |
| **File** | `<feature>/__tests__/<name>.unit.ts` | `<feature>/__tests__/<name>.integration.ts` |

## The Test Strategy

Before building a feature or a change, write its test strategy to `docs/test-strategy/<feature>.md` in the adopting repo. It is a **plan, not an implementation guide**: it names risks and the level that owns each, never files or code. Tests do not reference it; a reviewer maps tests to it by reading them.

### Choosing the level

**Each risk has exactly one owning test, at the cheapest level that can observe it.** Decide from the logic, never from the construct it lives in — a guard, a service and a helper can each need a unit test, an integration test, or both.

**Ask where the decision is made.**

- **In code** — branches over values the logic was given or looked up: a **unit** test, with the lookups stubbed, covering every branch.
- **In the database** — a `where` clause, a constraint, a lock, a transaction: an **integration** test on real rows. Stubbing the database here leaves nothing to assert but the SQL text.
- **Between layers** — the wiring of one use case: an **integration** test spanning those layers.
- **Both** — test each part where it is decided: the branches in a unit test, the query in one integration test.

*`assertCanEditPost` (archived posts never; admins always; authors within 24 hours) decides in code: a unit test covers the matrix with the post stubbed. `requireOrderOwner` is `select … where id = ? and customer_id = ?`, throwing on no row: the rule is the `where` clause, so only real rows — Bob's order, read as Ada — can observe it.* The test: **could someone break this rule by editing only the query?** Then it needs a real database.

**Never own a risk twice.** An integration test does not re-run the unit test's variants; a wiring row uses one representative input. Where both levels genuinely need the same assertion — a value that is both a function's output and a stored unique key — the strategy says why.

### Seams — structuring logic so unit tests carry it

A rule with many cases, reached only through a use case, makes every case an integration test. Extract it into a pure seam and the cases move to a unit table. **Extract before writing the code only when the strategy can point to variation that already exists** — cases the spec lists, a format someone else owns and changes, rows of a published table. "It might vary later" is not variation; otherwise write it inline and extract when the branching shows itself ([branching-logic.md](./branching-logic.md#apply-as-a-refactor-not-upfront-design)).

**Genuine — extract upfront:**

- **A vendor-owned format.** *A bank statement parser: the bank owns the export and already writes a cheque return two ways.* The cases exist and change without the import use case changing; a pure parser takes every format in a unit table, and a format change touches only the parser and its tests.
- **A rule the spec lists many cases for.** *Shipping cost by zone and weight band: the carrier's 40-cell rate table plus a free-shipping threshold.* A pure `shippingCost(zone, weight, subtotal)` takes one table row per cell and boundary, where the checkout use case would need a seeded database per case.
- **Many inputs that each map differently.** *A payments webhook whose spec names seven event types, each mapping to a different subscription state.* A pure `stateForEvent(event, current)` covers the seven and the unknown event; integration keeps the wiring and one row per transactional write path.

**False positives — don't extract upfront:**

- **Hypothetical variation.** *"We might support other banks later."* One bank today: the pure parser is still right (its cases exist now), but a parser interface, factory and registry is speculation — build the second implementation when a second bank's real export arrives.
- **A rule too small for a seam.** *"Only admins can delete a project."* One branch, two outcomes, already observed by the use case's integration tests; a helper adds a file and a test and removes no cost.
- **A rule that lives in the query.** *"List the subscriptions active on a date."* The logic is the `where` clause; a pure twin duplicates the SQL or tests nothing real. The boundary belongs to an integration test on real rows.
- **Pure, but already observed for free.** *A notification subject with two variants.* The use case's integration test already asserts the notification and its content; asserting both variants there costs nothing, so a seam is ceremony.

Each seam states its **contract** — the output shape and the invariants its consumers rely on (*`parseCoupon` returns `{ code, percent }` with `0 < percent ≤ 100`, or `null`; it never throws*) — and the strategy gives the contract its own unit row. A change that keeps the contract touches only the seam's unit tests; a change to the contract also revisits the integration rows that consume it.

### What the strategy contains

- **Source** — the PRD, issue or stories it plans for.
- **Per use case:**
  - **Entry point** — the orchestration or service method a driving adapter calls, and which adapter.
  - **Layer map** — the path through the backend, known from Foundry's topology before the code exists: orchestration → services and pure seams → adapters → the effects left behind.
  - **Vendors** — the external adapters integration tests mock.
  - **Not covered** — any layer no test spans, and why.
- **Seams** — each one's signature, its contract, and the variation that justified it.
- **Risks** — one row each: an ID, the risk, the owning level, why that level, and for an integration row the layers it **spans** and what it **mocks**.
- **Decide first** — behaviour the source does not specify, raised with the user before the test can be written.

**Every use case is walked through every category below.** Each category gets its rows or a one-line `n/a` with the reason — a category skipped in silence is a hole in the plan.

| Category | What the plan must answer |
|---|---|
| **Rules and branches** | Every rule and branch, every variant of an input format — usually a unit table. |
| **Boundaries** | Before, at and after every threshold: time, money, counts. At unit level when the rule is pure; at integration level when it lives in SQL. Time comes from the pinned clock; when a rule says "read the time once" or "rows carry the run's start", an advancing clock, because a pinned one cannot tell one read from a thousand. |
| **Every path** | Each transactional write path, each event type, each refusal is its own row. *A webhook with three event types writing in three transactions gets three rollback rows, not one* — a table-driven test keeps that cheap. |
| **Permissions** | Each actor type allowed and refused; a refused write leaves nothing written; reads scoped to what the actor may see ([identity-and-access.md](./identity-and-access.md#authorization-is-a-domain-concern)). |
| **Side effects** | Each effect sent and not sent. An internal job is asserted dispatched **and** run — its effect checked; a vendor call is asserted on its spy. |
| **Atomicity** | For each transactional path, a forced mid-flow failure leaves no rows and no effects; on success each effect fires exactly once, after commit, proven by an ordering check, never a sleep ([atomicity.md](./atomicity.md)). |
| **Concurrency** | Every lock, conditional write or unique constraint guarding a race: a test that forces the overlap — hold the first transaction, wait until the database reports the second blocked — and asserts an outcome that would be wrong without the guard. *Two redemptions of a single-use coupon: exactly one succeeds.* |
| **Failure modes** | A step failing partway through a loop or run; a failure after commit (*the order committed, enqueueing the receipt failed*); a redelivered or retried input. Unspecified behaviour goes to *Decide first*. |
| **Data shape** | Data realistic where the logic depends on it: gaps in ids for paging, whitespace and collation variants for a unique index, the largest realistic batch. |
| **Wiring** | Which integration rows span the use case's layer map, entry point to effects. A layer no row spans goes under *Not covered*, with the reason. |
| **Seam contracts** | One unit row per seam contract. |

**Example — `docs/test-strategy/checkout.md` (excerpt):**

```markdown
## UC1 Place an order
Entry: CheckoutOrchestration.place, called by POST /orders (apps/api)
Layers: orchestration → PricingService, InventoryService, parseCoupon (pure)
        → db: orders, stock → queue: SendReceipt → worker handler → db: receipts
Vendors: payments
Not covered: the HTTP route (no logic of its own)

| ID     | Risk                                             | Level       | Why                         | Spans                                                | Mocks    |
|--------|--------------------------------------------------|-------------|-----------------------------|------------------------------------------------------|----------|
| CHK-01 | each coupon format parses (`SAVE10`, ` save10 `) | unit        | pure, changes with marketing | —                                                    | —        |
| CHK-02 | parseCoupon's contract holds for any input       | unit        | seam contract               | —                                                    | —        |
| CHK-03 | free shipping at $49.99 / $50.00 / $50.01        | unit        | pure threshold              | —                                                    | —        |
| CHK-04 | order saved, stock −1, receipt job runs          | integration | wiring, queue               | orchestration → services → db → queue → handler → db | payments |
| CHK-05 | payment declined → no order, no stock change, no job | integration | rollback                | orchestration → services → db                        | payments |
| CHK-06 | two buyers, one item left → exactly one order    | integration | the lock is in the database | orchestration → services → db                        | payments |
| CHK-07 | cancelling another customer's order is refused   | integration | ownership is a query        | orchestration → services → db                        | —        |
```

## What a Test Must Prove

**A test must fail when the behaviour it names breaks.** Check it by breaking the behaviour — delete the guard, reword the message, throw the wrong error — and watching the test go red. Every test, at both levels:

| Do | Not |
|---|---|
| Expected values are literals, independent of the code | The code's own constant, template or helper as the expected value — *`toBe(MESSAGES.couponExpired)` still passes after the message is reworded* |
| Assert the precise failure: the exception's class, code or status | An assertion the wrong failure also satisfies — *`toThrow(Error)` when the claim is "an unanticipated error"* |
| Assert everything the test's name claims | A name promising more than the assertions check — *"refused, nothing read or written" checking only the writes; a database that throws on any use proves the reads* |
| Prove a guard by an outcome that depends on it | A test that still passes with the guard removed — *two creates that never conflict "testing" a lock; a 300 ms sleep standing in for "blocked"* |
| Assert what a consumer observes | Pinning internal structure — key order nothing serialises, a library's internal issue code, how often a factory was called |

## The Test AppContext

Every service receives an `AppContext` through its constructor ([app-context.md](./app-context.md)). Integration tests build a **test AppContext** for the code under test — no service code changes between production and test; only the context differs:

- **Database** — the **production engine** (a container in dev and CI), each test starting from a known empty state. Never an in-memory substitute: it accepts writes the real engine rejects and ignores row locks, so constraint and concurrency tests prove nothing. Never a fake that returns data or simulates behaviour; a **tripwire** that throws on any use — to prove an operation reads nothing — is allowed.
- **Actor** — a **persisted user**: skip the login, never the record. A helper writes the same rows production does, roles and permissions included (through the auth provider's own server API when one owns them), and the actor is read from those rows the way the edge resolves it ([identity-and-access.md](./identity-and-access.md#identity-lifecycle--where-a-user-comes-from)).
- **Clock and id-source** — pinned clock and deterministic ids by default; an advancing clock where the strategy calls for one.
- **Tenant** — fixed, in multi-tenant apps, with a second tenant seeded where reads or writes are scoped ([multi-tenancy.md](./multi-tenancy.md)).
- **Internal queue** — an in-process adapter that records each dispatch (job and payload) and runs the real handler on the serialised payload after commit, so a test asserts both the dispatch and its effect. A real broker is needed only to test the queue's own mechanics: retries, backoff, scheduling.
- **External vendors** — spy adapters recording each call (email, payments, LLM, outbound HTTP); assert on what they recorded.

**Atomicity mechanics** ([atomicity.md](./atomicity.md)): force the mid-flow failure inside the boundary (e.g. the second service throws) → assert no rows, no vendor calls, no job dispatched; on success, assert each effect fired exactly once, after the commit.

## Integration Test Flavours

Both flavours live in the same `.integration.ts` file; signal intent with `describe` blocks — e.g. `describe('CommentService / service layer')` vs `describe('CommentService / leave comment use case')`.

- **Service-layer** — one service or orchestration method's behaviour over its real dependencies.
- **Use-case** — a story with a named actor and scenario, entering at the use case's entry point; reads like a spec, not a method-call sequence.

| Flavour | Do | Not |
|---|---|---|
| Service-layer | Call the real method with the test `AppContext` | Mocking the method or stubbing its own database calls — a unit test in integration clothes |
| Service-layer | Assert every effect the method leaves: rows, dispatches, vendor calls | Asserting only the return value, or only that it didn't throw |
| Use-case | Name the test after the scenario — `owner receives email when a different user comments` | Naming it after a method — `createComment` |
| Use-case | Set the clock to a realistic moment the logic is built for | Arbitrary convenient values (epoch zero, far future) |

---

**Verify:** when done, check [end-here.md](./end-here.md) → Testing.
