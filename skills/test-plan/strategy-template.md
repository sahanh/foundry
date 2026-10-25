# Test strategy: <PRD title>

Source: <link to the PRD>

<!-- At merge, the implementer adds above this line:
**Merged in #<n>.** From here the code and its tests are the source of truth; this plan is history. -->

## Use cases

- **UC1** <the use case, as the actor would say it>
- **UC2** …

## UC1 <title>

Entry: <orchestration or service method>, called by <driving adapter: route, worker job, CLI command>
Layers: <orchestration> → <services, pure seams> → <adapters> → <effects: tables written, jobs, vendor calls>
Vendors: <the external adapters integration tests mock>
Not covered: <a behaviour-free layer, and why> | <exception — accepted by <who>: <reason>> | none

| ID | Risk | Level | Why this level | Spans | Mocks | Guard |
|---|---|---|---|---|---|---|
| <PFX-01> | <what could go wrong, in one line> | unit / integration | <where the decision is made> | <layers, for integration> | <vendors> | <lock · conditional write · uniqueness · rollback · refusal, or blank> |

| Question | Answer |
|---|---|
| Rules and branches | rows <IDs> |
| Boundaries | rows <IDs> |
| Clock | rows <IDs> \| n/a: <why the behaviour is absent> |
| Every path | rows <IDs> |
| Permissions | rows <IDs> |
| Side effects | rows <IDs> |
| Atomicity | rows <IDs> \| n/a: <why> |
| Concurrency | rows <IDs> \| n/a: <why> |
| Failure modes | rows <IDs> |
| Data shape | rows <IDs> \| n/a: <why> |
| Wiring | rows <IDs> |
| Seam contracts | rows <IDs> \| n/a: no seam |

Existing tests that already own a risk: <test file › title — the risk it owns> | none

## Seams

**<seam name>**
In: <inputs> · Out: <outputs>
Contract: <what consumers rely on>
Variation: <the cases that already exist and justify it>
Contract row: <ID>

## Decide first

- <behaviour the PRD doesn't specify> → **<the user's answer>** | open
