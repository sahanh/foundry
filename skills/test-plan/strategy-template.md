# Test strategy: <PRD title>

Source: <link to the PRD>

<!-- At merge, the implementer adds above the Source line:
**Merged in #<n>.** From here the code and its tests are the source of truth; this plan is history. -->

## Use cases

- **UC1** <the use case, as the actor would say it>
- **UC2** …

## UC1 <title>

Entry: <the orchestration or service method a driving adapter calls>, called by <driving adapter: route, worker job, CLI command>
Layers: <orchestration> → <services, pure seams> → <adapters> → <effects: tables written, jobs, vendor calls>
Vendors: <the external adapters integration tests mock>
Not covered: <a behaviour-free layer, and why> | <exception — accepted by <who>: <reason>> | none

| ID | Risk | Source | Level | Why this level | Spans | Mocks | Guard | Existing test |
|---|---|---|---|---|---|---|---|---|
| <PFX-01> | <what could go wrong, in one line> | <PRD § / existing code / settled with <who>> | unit / integration | <where the decision is made; for an overlap at both levels, why> | <layers, for integration> | <vendors> | <lock · conditional write · uniqueness · rollback · refusal, or blank> | <file › title, when an existing test already owns it; else blank> |

Every question gets rows or an `n/a` naming the behaviour that is absent from this use case:

| Question | Answer |
|---|---|
| Rules and branches | rows <IDs> \| n/a: <absent behaviour> |
| Boundaries | rows <IDs> \| n/a: <absent behaviour> |
| Clock | rows <IDs> \| n/a: <absent behaviour> |
| Every path | rows <IDs> \| n/a: <absent behaviour> |
| Permissions | rows <IDs> \| n/a: <absent behaviour> |
| Side effects | rows <IDs> \| n/a: <absent behaviour> |
| Atomicity | rows <IDs> \| n/a: <absent behaviour> |
| Concurrency | rows <IDs> \| n/a: <absent behaviour> |
| Failure modes | rows <IDs> \| n/a: <absent behaviour> |
| Data shape | rows <IDs> \| n/a: <absent behaviour> |
| Wiring | rows <IDs> \| n/a: <absent behaviour> |
| Seam contracts | rows <IDs> \| n/a: no seam |

## Seams

**<seam name>**
In: <inputs> · Out: <outputs>
Contract: <what consumers rely on>
Variation: <the cases that already exist and justify it>
Contract row: <ID>

## Decide first

- <behaviour the PRD doesn't specify> → **<the user's answer>** | open
