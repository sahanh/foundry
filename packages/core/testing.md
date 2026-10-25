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
| **Runs with** | No database, no network, no framework boot. Reading a realistic fixture file is fine. | The test `AppContext` below: the production database engine, persisted users, the internal queue running |
| **Mocks** | Nothing of its own; any lookup it is handed is stubbed | **Only external vendors** (email, payments, LLM, HTTP APIs), at their adapter. Never the database, your own services, internal events or the queue. |
| **Shape** | Table-driven and exhaustive — every variant, every boundary | Few tests, each proving something unit tests cannot observe |
| **File** | `<feature>/__tests__/<name>.unit.ts` | `<feature>/__tests__/<name>.integration.ts` |

## The Test Strategy

Every PRD that changes behaviour gets a test strategy, written before the code. **A PRD here is any bounded request that carries a change's context** — a product spec, an issue, a bug report, a refactor proposal. The strategy lives in the adopting repo at `docs/test-strategy/<prd-slug>.md` and opens by linking its PRD. A change that needs no new tests (a dependency bump) needs no strategy.

It is a **plan, not a checklist of test cases**: it names risks, the level that owns each and, for integration, the layers to span — never files or code. The combination of unit and integration tests the implementer writes must cover it; one test may cover several rows. Tests do not reference it; a reviewer maps tests to it by reading them.

**Scope** is the PRD's: the use cases it adds or changes and the risks they bring. Read the existing tests first; a risk an existing test already owns is cited, not planned again.

**On merge**, mark it at the top — *Merged in #123; from here the code and its tests are the source of truth* — and leave it as history. A later PRD gets its own strategy; nothing edits a merged one.

### Choosing the level

**Each risk has one owning level — the cheapest that can observe it — and an assertion that fails for that risk on its own.** Decide from the logic, never from the construct it lives in: a guard, a service and a helper can each need a unit test, an integration test, or both.

**Ask where the decision is made.**

- **In code** — branches over values the logic was given or looked up: a **unit** test, with the lookups stubbed, covering every branch.
- **In the database** — a `where` clause, a constraint, a lock, a transaction: an **integration** test on real rows. Stubbing the database here leaves nothing to assert but the SQL text.
- **Between layers** — the wiring of one use case: an **integration** test spanning those layers.
- **Both** — test each part where it is decided: the branches in a unit test, the query in one integration test.

*`assertCanEditPost` (archived posts never; admins always; authors within 24 hours) decides in code: a unit test covers the matrix with the post stubbed. `requireOrderOwner` is `select … where id = ? and customer_id = ?`, throwing on no row: the rule is the `where` clause, so only real rows — Bob's order, read as Ada — can observe it.* The test: **could someone break this rule by editing only the query?** Then it needs a real database.

**Never own a risk at two levels.** An integration test does not re-run the unit test's variants; a wiring row uses one representative input. Where both levels genuinely need the same assertion — a value that is both a function's output and a stored unique key — the strategy says why.

### Seams — structuring logic so unit tests carry it

A rule with many cases, reached only through a use case, makes every case an integration test. Extract it into a pure seam and the cases move to a unit table. **Extract before writing the code only when the strategy can point to variation that already exists** — cases the PRD lists, a format someone else owns and changes, rows of a published table. "It might vary later" is not variation; otherwise write it inline and extract when the branching shows itself ([branching-logic.md](./branching-logic.md#apply-as-a-refactor-not-upfront-design)). A seam stays with the service that owns it until a second caller promotes it ([branching-logic.md](./branching-logic.md#its-an-extraction-not-an-escape-hatch)).

**Genuine — extract upfront:**

- **A vendor-owned format.** *A bank statement parser: the bank owns the export and already writes a cheque return two ways.* The cases exist and change without the import use case changing; a pure parser takes every format in a unit table, and a format change touches only the parser and its tests.
- **A rule the PRD lists many cases for.** *Shipping cost by zone and weight band: the carrier's 40-cell rate table plus a free-shipping threshold.* A pure `shippingCost(zone, weight, subtotal)` takes one table row per cell and boundary, where the checkout use case would need a seeded database per case.
- **Many inputs that each map differently.** *A payments webhook whose PRD names seven event types, each mapping to a different subscription state.* A pure `stateForEvent(event, current)` covers the seven and the unknown event; integration keeps the wiring and one row per transactional write path.

**False positives — don't extract upfront:**

- **Hypothetical variation.** *"We might support other banks later."* One bank today: the pure parser is still right (its cases exist now), but a parser interface, factory and registry is speculation — build the second implementation when a second bank's real export arrives.
- **A rule too small for a seam.** *"Only admins can delete a project."* One branch, two outcomes, already observed by the use case's integration tests; a helper adds a file and a test and removes no cost.
- **A rule that lives in the query.** *"List the subscriptions active on a date."* The logic is the `where` clause; a pure twin duplicates the SQL or tests nothing real. The boundary belongs to an integration test on real rows.
- **Pure, but already observed for free.** *A notification subject with two variants.* The use case's integration test already asserts the notification and its content; asserting both variants there costs nothing, so a seam is ceremony.

Each seam states its **contract** — the output shape and the invariants its consumers rely on (*`parseCoupon` returns `{ code, percent }` with `0 < percent ≤ 100`, or `null`; it never throws*) — and the strategy gives the contract its own unit row. A change that keeps the contract touches only the seam's unit tests; a change to the contract also revisits the integration rows that consume it.

### What the strategy contains

- **Source** — a link to the PRD.
- **Per use case:**
  - **Entry point** — the orchestration or service method a driving adapter calls, and which adapter.
  - **Layer map** — the path through the backend, known from Foundry's topology before the code exists: orchestration → services and pure seams → adapters → the effects left behind.
  - **Vendors** — the external adapters integration tests mock.
  - **Not covered** — only a layer with no behaviour of its own (*a route that parses params into the orchestration's input*), or an exception the user accepted, recorded as *accepted by <who>: <reason>*. Any other layer no row spans is a hole in the plan.
- **Seams** — each one's inputs, its outputs, the contract its consumers rely on, and the variation that justified it. No signature: names and types are the implementer's call.
- **Risks** — one row each: an ID, the risk, the owning level, why that level, and for an integration row the layers it **spans** and what it **mocks**. The IDs are for the plan and its review; tests never cite them.
- **Decide first** — behaviour the PRD does not specify, raised with the user before the test can be written.

**Plan in two passes.** First walk the PRD's own rules and branches, one by one. Then put every question below to every use case — they are the minimum a plan answers, not the whole of it. Each question gets its rows or a one-line `n/a` with the reason. `n/a` means the behaviour the question asks about is absent from the use case (*Concurrency — n/a: the use case only reads*); a rule that exists but is unspecified goes to *Decide first* instead. A question skipped in silence is a hole in the plan.

| Category | The question, for every use case |
|---|---|
| **Rules and branches** | For every rule, branch and input format: which cases exist? Usually a unit table. |
| **Boundaries** | For every threshold — time, money, counts: what happens just before, exactly at and just after it? At unit level when the rule is pure, at integration level when it lives in SQL. |
| **Clock** | Does a rule depend on how many times, or when, the clock is read (*read the time once; stamp rows with the run's start*)? Then the test needs an advancing clock: a pinned one returns the same instant to one read and to a thousand. |
| **Every path** | For every transactional write path, event type and refusal: is it its own row? *A webhook with three event types writing in three transactions has three rollback rows, not one* — one table-driven test can cover them. |
| **Permissions** | For every actor type: is it allowed, or refused? Does a refused write leave nothing written? Are reads scoped to what the actor may see ([identity-and-access.md](./identity-and-access.md#authorization-is-a-domain-concern))? |
| **Side effects** | For every effect: is it asserted both sent and not sent? An internal job dispatched **and** run, its effect checked; a vendor call on its spy. |
| **Atomicity** | For every transactional path: does a forced mid-flow failure leave no rows and no effects? On success, does each effect fire exactly once, after commit — proven by an ordering check, never a sleep ([atomicity.md](./atomicity.md))? |
| **Concurrency** | For every read, then decide, then write, and every write a uniqueness guard protects: what if two requests run it at once — whether or not the PRD mentions races? Plan a test that makes the two overlap deterministically and asserts an outcome that would be wrong without the guard (*two redemptions of a single-use coupon: exactly one succeeds*). |
| **Failure modes** | For every effect after a commit: what if it fails (*the order committed; enqueueing the receipt failed*)? For every loop or run: what if one step fails? For every input: what if it arrives twice? Unspecified behaviour goes to *Decide first*. |
| **Data shape** | Does the logic depend on the data's shape? Then plan realistic data: gaps in ids for paging, whitespace and collation variants for a unique index, the largest realistic batch. |
| **Wiring** | Which integration rows span the use case's layer map, entry point to effects? A layer no row spans goes under *Not covered* — and only if it qualifies there. |
| **Seam contracts** | For every seam: which unit row pins its contract? |

**Example — `docs/test-strategy/checkout-v1.md` (excerpt):**

```markdown
Source: https://github.com/acme/shop/issues/42 (Checkout v1)

## UC1 Place an order
Entry: CheckoutOrchestration.place, called by POST /orders (apps/api)
Layers: orchestration → PricingService, InventoryService, parseCoupon (pure)
        → db: orders, stock → queue: SendReceipt → worker handler → db: receipts
Vendors: payments
Not covered: the HTTP route (parses params into the orchestration's input; no logic of its own)

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

**A test must fail when the behaviour it names breaks.** Check it from both directions:

- **From the behaviour:** break it — delete the guard, reword the message, throw the wrong error — and watch the test go red.
- **From each assertion:** ask whether it could ever fail. An assertion nothing in the setup could violate proves nothing.

**A guard row needs evidence, not a reading.** For every risk row about a lock, a conditional write, a uniqueness guard, a rollback or a refusal, the implementer breaks the guard, runs its test, watches it fail, and reverts — and records it in the PR: what was broken, and which test failed. A mutation score is no substitute: it is evidence only for the code it mutates, and never for a race or a rollback.

Every test, at both levels:

| Do | Not |
|---|---|
| Expected values are literals, independent of the code | The code's own constant, template or helper as the expected value — *`toBe(MESSAGES.couponExpired)` still passes after the message is reworded* |
| Assert the precise failure: the exception's class, code or status | An assertion the wrong failure also satisfies — *`toThrow(Error)` when the claim is "an unanticipated error"* |
| Assert everything the test's name claims | A name promising more than the assertions check — *"refused, nothing read or written" checking only the writes; a database that throws on any use proves the reads* |
| Prove a guard by an outcome that depends on it | A test that still passes with the guard removed — *two creates that never conflict "testing" a lock; a 300 ms sleep standing in for "blocked"* |
| Run a negative assertion — "not sent", "nothing queued", "nothing written" — in a setup where the effect would happen if the code were wrong | A "nothing sent" check where the effect could never happen — *"not queued" with the adapter disabled by default, so it passes whatever the code does* |
| Watch the object the code actually uses | A spy on a handle the code never touches — *a spy on `ctx.system.db.update` while the write goes through the transaction's own handle* |
| Assert what a consumer observes | Pinning internal structure — key order nothing serialises, a library's internal issue code, how often a factory was called |

## The Test AppContext

Every service receives an `AppContext` through its constructor ([app-context.md](./app-context.md)). Integration tests build a **test AppContext** for the code under test — no service code changes between production and test; only the context differs:

- **Database** — the **production engine** (a container in dev and CI), each test starting from a known empty state. Never an in-memory substitute: it accepts writes the real engine rejects and ignores row locks, so constraint and concurrency tests prove nothing. Never a fake that returns data or simulates behaviour; a **tripwire** that throws on any use — to prove an operation reads nothing — is allowed.
- **Actor** — a `user` actor is a **persisted user**: skip the login, never the record. A helper writes the same rows production does, roles and permissions included (through the auth provider's own server API when one owns them), and the actor is read from those rows the way the edge resolves it ([identity-and-access.md](./identity-and-access.md#identity-lifecycle--where-a-user-comes-from)). Other actor types — `anonymous`, `system`, the project's own — are built the way the edge builds them.
- **Clock and id-source** — pinned clock and deterministic ids by default; an advancing clock where the strategy calls for one.
- **Tenant** — fixed, in multi-tenant apps, with a second tenant seeded where reads or writes are scoped ([multi-tenancy.md](./multi-tenancy.md)).
- **Internal queue** — an in-process adapter that records each dispatch (job and payload) and runs the real handler on the serialised payload — after commit, or straight away when there is no transaction — so a test asserts both the dispatch and its effect. A real broker is needed only to test the queue's own mechanics: retries, backoff, scheduling.
- **External vendors** — spy adapters recording each call (email, payments, LLM, outbound HTTP); assert on what they recorded.

**Atomicity mechanics** ([atomicity.md](./atomicity.md)): force the mid-flow failure inside the boundary (e.g. the second service throws) → assert no rows, no vendor calls, no job dispatched; on success, assert each effect fired exactly once, after the commit.

**Concurrency mechanics:** make the overlap deterministic, never timed — for a lock, hold the first transaction open and wait until the database reports the second blocked; for a conditional write, start both operations from the same read and let both write; for an insert a unique constraint guards, start both inserts together and let both try to commit — exactly one succeeds. Holding a transaction open here is test synchronisation; production transactions still never wait ([atomicity.md](./atomicity.md#what-a-transaction-cannot-span)).

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

**Verify:** when done, check [end-here.md](./end-here.md) → Testing; a reviewer runs the [test-review](../../skills/test-review/SKILL.md) procedure.
