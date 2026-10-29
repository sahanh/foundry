---
name: elaborate-feature
argument-hint: "[the idea, or an issue to start from]"
description: Turn a feature idea into a published PRD with its test strategy, with the user, in a Foundry codebase. Takes the user's goal in their own words, grills the idea until every decision is settled (Matt Pocock's grilling and domain-modeling skills, which record the glossary and ADRs), drafts the PRD, writes its test strategy with test-plan, cuts the work into tracer-bullet slices that each own strategy rows, settles everything in one approval round, then commits the docs on the worktree branch and publishes the PRD for implement-prd. Plans only — never writes code or tests.
disable-model-invocation: true
---

# Elaborate feature

You take an idea from the user to a **published PRD**: their goal, the decisions the grilling settled,
the use cases, the test strategy and the slices `implement-prd` will build. Every rule the strategy
follows is owned by [testing.md](../../packages/core/testing.md) and applied by
[test-plan](../test-plan/SKILL.md); this file is the procedure around it.

**You plan; you don't build.** Never write code, tests or fixtures. The only files you write are the
glossary and ADRs (through `domain-modeling`), the test strategy (through `test-plan`) and the PRD.

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| PRDs live in | *issues on the tracker, e.g. GitHub issues in `<owner>/<repo>`; `docs/agents/issue-tracker.md` gives the commands. implement-prd needs an issue* |
| Label on a published PRD | *e.g. `ready-for-agent`; or none* |
| Test strategies live in | `docs/test-strategy/` |
| Domain vocabulary and decisions | *e.g. `GLOSSARY.md` and `docs/adr/`, as `docs/agents/domain.md` names them* |

It runs two skills Foundry doesn't own, `grilling` and `domain-modeling`; the repo installs them
([setup/agent-skills.md → Companion skills](../../setup/agent-skills.md#companion-skills)). Either one
missing: stop and say so.

## How to work

- **Facts are yours to find; decisions are the user's.** Look up anything the code, the docs or the
  tracker can answer. Put every decision to the user, with your recommended answer.
- **Proportion to the change.** A bug fix may be one use case and one slice; a new capability, the
  full set. Never pad a section to look thorough.
- **State once.** The use cases hold the detail. The slices point at use cases and strategy rows; the
  decisions point at ADRs and glossary terms. Nothing is written twice.
- **Keep it in one session.** The grilling, the PRD, the strategy and the slices build on the same
  thinking; don't clear or compact between them.

## Stage 0. A worktree

The grilling writes the glossary and ADRs as decisions settle, so work in a **worktree** on its own
branch, named after the feature, before the first question. Already in one: use it. Everything this
skill writes is committed there and ships in the PRD's plan PR.

## Stage 1. The goal

Before any grilling, ask the user for **the goal in a sentence or two: what the end state looks like
when this is done**, in their own words. Not a feature list — the outcome they want to see. Record it
exactly as they give it; it opens the PRD and later its plan PR, so the work can be checked against
it. An issue given as the starting point is read first, but the goal still comes from the user.

## Stage 2. Grill

Run the `grilling` skill on the idea, with `domain-modeling` running beneath it: terms settle into the
glossary, and hard-to-reverse decisions are offered as ADRs as they arise.

Before you stop, the grilling must have settled, **for every use case**, what
[test-plan](../test-plan/SKILL.md#stage-0-inputs) needs from a PRD: the actor, the trigger, the
expected outcome, the side effects, the rules and thresholds, and what happens when something fails.
A use case missing one of them gets another round. The session ends when the grilling's frontier is
empty and the user agrees you share an understanding.

## Stage 3. Draft the PRD

Draft it from [prd-template.md](prd-template.md), into a local file outside the repo until it is
published:

- **Goal** — the user's statement from Stage 1, verbatim.
- **Problem** and **Solution** — from the user's side.
- **Use cases** — UC1, UC2…, each a story with its trigger, outcome, rules, side effects and failure
  behaviour. These IDs are the strategy's too.
- **Decisions** — what the grilling settled, each linked to its ADR or glossary term where it has one.
- **Out of scope** — what this PRD leaves out.

No file paths, function names or code: they go stale, and the implementer decides them.

## Stage 4. The test strategy

Run [test-plan](../test-plan/SKILL.md) on the draft, through its Stage 4. Hold its Stage 5 questions
for the approval round below rather than asking them on their own; write the file (its Stage 6) only
once that round is settled. Behaviour the strategy finds unspecified goes back into the grilling as a
question, never into an assumed answer.

If test-plan finds the change needs no strategy — it alters no behaviour — the PRD's *Test strategy*
line says *none*, with the reason, and the slices own no rows.

## Stage 5. Slice it

Cut the work into **tracer-bullet slices**, after Matt Pocock's `to-tickets` (MIT). Each slice:

- **cuts a narrow but complete path through every layer it needs** — driving adapter, orchestration,
  services, database and effects — never one layer on its own;
- **can be demonstrated or verified on its own** once built;
- **fits one fresh context window**, since one agent builds it;
- **owns strategy rows:** the rows its tests will cover. Every row is owned by exactly one slice. An
  integration row spanning several slices belongs to the slice where its whole path first exists; a
  row an existing test already covers, to the slice whose change could break it.

Prefactoring that makes the change easy comes first, as its own slice. **A wide refactor** — one
mechanical change that breaks many call sites at once, such as renaming a column — can't be cut
vertically: sequence it expand, migrate in batches, contract, each its own slice.

For each slice give the use cases it covers (a part of one, named in brackets), the slices that block
it, and the rows it owns. Slices with no blocker between them can be built in parallel.

## Stage 6. One approval round

Show the user, in one message:

- the goal, as they gave it;
- the PRD draft;
- the strategy's use cases with their layer maps, its risk table and its proposed seams;
- the slice table;
- the open questions, numbered, each with your recommended answer: test-plan's Stage 5 questions,
  whether the slicing's granularity and blocking edges are right, and whether the goal still states
  what they want.

Revise until the user agrees. Answers go where they belong: a settled behaviour into its use case, a
strategy decision into the strategy (*settled with <who>*), a changed goal in the user's words.

## Stage 7. Publish

1. **Write the strategy** — test-plan's Stage 6 — into the strategies folder.
2. **Publish the PRD** to the tracker, with the label if the repo uses one. Fill its *Branch* line
   with the worktree's branch and its *Test strategy* line with the file's link on that branch.
3. **Point the strategy's Source line at the published PRD.**
4. **Commit** the glossary, the ADRs and the strategy on the worktree branch, and push it.

Then give the user the PRD's link and the branch, and the next step: `/implement-prd <PRD>`. Stop
there; opening the plan PR is `implement-prd`'s job.
