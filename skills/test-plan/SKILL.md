---
name: test-plan
argument-hint: "[PRD issue, URL or path]"
description: Write a PRD's test strategy before any code, with the user, in a Foundry codebase. Reads the PRD and the existing tests, maps each use case's layers, walks the PRD's own rules and then twelve risk questions for every use case, proposes the owning level for each risk and any seams the known variation justifies, settles the open points with the user, and writes docs/test-strategy/<prd-slug>.md in testing.md's format. Plans only: never writes tests or code. Use before implementing a PRD, spec, issue or bug fix that changes behaviour, when asked to plan tests or a test strategy, or when a planning workflow reaches its testing step.
---

# Test plan

You write the **test strategy** for one PRD, before any code exists, by working it through with the
user. The format and every rule are owned by [testing.md → The Test Strategy](../../packages/core/testing.md#the-test-strategy);
this file is the procedure that produces one. The strategy is later checked against the change by
[test-review](../test-review/SKILL.md).

**You plan; you don't build.** Never write tests, code or fixtures. Name risks, levels, layers and
seams — never files, functions or types: those are the implementer's call.

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| PRDs live in | *e.g. GitHub issues; `docs/prd/`* |
| Test strategies live in | `docs/test-strategy/` |
| Driving adapters | *the apps that call the core: e.g. `apps/api`, `apps/worker`* |
| External vendors | *the adapters integration tests mock: e.g. email, payments, LLM* |

## How to work

- **Ask questions of the PRD, not of your memory.** Every risk you plan cites the PRD sentence, or the
  existing code or test, that it comes from — or is marked as an open point for the user.
- **One file per read** when reading existing code and tests, so references stay accurate.
- **Propose, then settle.** Draft the whole strategy, show it, and settle the open points with the
  user before writing the file. Ask each question with a recommended answer.
- **Proportion to the PRD.** A bug fix may need two rows; a new capability, the full plan. Never pad
  a category to look thorough — an honest `n/a` is better.

## Stage 0. Inputs

- **The PRD:** the one given (an issue → `gh issue view <n> --comments`; a URL or path → read it).
  None given: ask which. Read it in full, comments included.
- **Does it need a strategy?** A change that needs no new tests — a dependency bump, a change with no
  behaviour — needs none ([testing.md](../../packages/core/testing.md#the-test-strategy)). Say so, with
  the reason, and stop.
- **An existing strategy for this PRD:** extend it rather than start a second. One marked *merged*
  belongs to an earlier PRD — leave it alone; this PRD gets its own.
- **What the PRD must give you, per use case:** the actor, the trigger, the expected outcome, the side
  effects, the rules and thresholds, and what should happen when something fails. Anything missing
  goes to the open points.

## Stage 1. Ground it in the code

- **The existing code** the PRD touches: the features, services and orchestrations it extends, and
  the adapters it will reach. This gives each use case its layer map before the new code exists.
- **The existing tests** of that code: what each already owns. A risk an existing test owns is
  cited, not planned again.
- **The test harness:** how the test `AppContext` is built, which adapters it fakes, what its defaults
  are ([testing.md → The Test AppContext](../../packages/core/testing.md#the-test-appcontext)). A
  harness that cannot do what a row needs — a queue that never runs its handler, an in-memory
  database — is an open point, not a reason to drop the row.

## Stage 2. Map each use case

For every use case the PRD adds or changes
([testing.md → What the strategy contains](../../packages/core/testing.md#what-the-strategy-contains)):

- **Entry point** — the orchestration or service method a driving adapter will call, and which one.
- **Layer map** — orchestration → services and pure seams → adapters → the effects left behind.
- **Vendors** — the external adapters to mock.
- **Not covered** — only a layer with no behaviour of its own, or an exception the user accepts.

## Stage 3. Walk the risks — two passes

**Pass one, the PRD's own rules.** Go through the PRD sentence by sentence: every rule, branch,
threshold, refusal and effect it states becomes a risk, or joins one.

**Pass two, the questions.** Put every question in [testing.md's table](../../packages/core/testing.md#what-the-strategy-contains)
to every use case — they are the minimum, not the whole: Rules and branches · Boundaries · Clock ·
Every path · Permissions · Side effects · Atomicity · Concurrency · Failure modes · Data shape ·
Wiring · Seam contracts. Each gets its rows, or an `n/a` whose behaviour is truly absent from the use
case. The three that pass one most often misses:

- **For every read, then decide, then write, and every write a uniqueness guard protects:** what if
  two requests run it at once — whether or not the PRD mentions races?
- **For every effect after a commit:** what if it fails? **For every loop:** what if one step fails?
  **For every input:** what if it arrives twice?
- **For every transactional path, event type and refusal:** is it its own row?

Behaviour the PRD leaves unspecified goes to **Decide first**, never into an assumed answer.

## Stage 4. Levels and seams

- **Owning level** for each risk: the cheapest that can observe it, chosen by where the decision is
  made — in code, in the database, or between layers
  ([testing.md → Choosing the level](../../packages/core/testing.md#choosing-the-level)). For each
  integration row, the layers it spans and what it mocks.
- **Never at two levels.** Unit variants are not re-run at integration; a wiring row uses one
  representative input.
- **Seams:** propose one only where the variation already exists — cases the PRD lists, a format
  someone else owns, a published table — never for "it might vary later"
  ([testing.md → Seams](../../packages/core/testing.md#seams--structuring-logic-so-unit-tests-carry-it)).
  Give its inputs, outputs, contract and the variation that justifies it, and a unit row for the
  contract.
- **Guard rows** — a lock, a conditional write, a uniqueness guard, a rollback, a refusal: mark them.
  The implementer owes each one break-it evidence in the PR
  ([testing.md → What a Test Must Prove](../../packages/core/testing.md#what-a-test-must-prove)).

## Stage 5. Settle with the user

Show the draft as one message: the use cases with their layer maps, the risk table, the proposed
seams, and the open points. Ask, each with a recommendation:

- every **Decide first** item;
- every proposed **seam** — the variation it rests on;
- any level that could reasonably go either way;
- any **Not covered** exception, which only the user can accept.

Revise until the user agrees. Don't write the file before then.

## Stage 6. Write it

Write `<strategies folder>/<prd-slug>.md` from [strategy-template.md](strategy-template.md):

- the PRD linked on the first line;
- every use case, every category answered, every risk with its level and reason;
- the user's decisions recorded where they apply (*accepted by <who>: <reason>*; a Decide-first item
  with its answer).

Then tell the user where it is, and remind them of the two duties it hands the implementer: break-it
evidence for every guard row, and marking the strategy *Merged in #N* at merge. Commit it only if the
user asks. After that, stop.
