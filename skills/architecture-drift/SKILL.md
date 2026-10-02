---
name: architecture-drift
argument-hint: "[PR number or URL | base ref]"
description: Drift check on a change in a Foundry codebase. Asks whether each concept the change adds or alters (table, column, stored field, status, guard, invariant, state-changing service method, feature boundary) still has exactly one home, and writes one evidence-backed question per place where the domain model or the architecture has drifted. Never proposes a solution — the developer decides. Use when the user asks to check a PR, branch or diff for architecture or domain drift, duplicated concepts or second homes, or whether a change contradicts an ADR, a recorded decision or the domain's terms.
---

# Architecture drift

You check a change for **drift**: whether each concept it adds or alters still has exactly one
home in the codebase, and whether the boundaries it moves were decided. You do not judge style,
tests or correctness, and you **never propose a solution**. Your job is to find evidence and ask
the developer questions. The developer decides.

**This is not the review protocol.** [review.md](../../review.md) grades the change against
Foundry's rules, and its findings are blockers. This skill asks about what conforming code can
still get wrong: a second field answering a question an existing field already answers, a status
that is an existing status for one case, a reader that will never see the new state. Code can
tick every `end-here` box and still drift. If you come across a breach of a Foundry rule while
searching, do not turn it into a question: list it under **Not examined**, name the owning doc,
and leave it to the review protocol.

Paths to Foundry docs in this file are relative to the Foundry repository.

## Inputs

`$ARGUMENTS` names the change:

- a PR number or URL → `gh pr view <n> --json title,body,baseRefName,headRefOid` and
  `gh pr diff <n>`; read the PR's comment thread too
- a base ref → the current branch against the merge-base with that ref
- nothing → the current branch against the merge-base with the default branch, uncommitted
  changes included

Base is the merge-base; head is the tip of the change. Every citation is a claim about the head.
If a PR is part of a stack (its base is not the default branch, or another open PR builds on its
head), read the rest of the stack before running the checks, because the Readers check asks what
a reader sees once the whole stack has merged. What you could not read goes under **Not
examined**.

Beyond the diff, read:

- The default branch: the table definitions, the features' schemas, and the existing readers and
  writers of whatever the change touches.
- The project's recorded decisions and vocabulary, wherever it keeps them: `docs/adr/`,
  `CONTEXT.md` or a glossary, architecture docs, `docs/agents/map-manifest.md`, and the
  project's `AGENTS.md` / `CLAUDE.md`. Foundry prescribes none of these. If the project has
  none, the vocabulary is the code's own names (feature folders, entities, enum members,
  tables); say so under **Not examined**.

Explore the codebase before asking the user anything. Only ask what it cannot answer.

## Principles (grounding only; do not cite these in the output)

- Every concept has exactly one owner. Foundry already says so for tables
  ([working-with-databases.md → Feature Ownership](../../packages/core/working-with-databases.md#feature-ownership)),
  for types ([implementation-schemas.md](../../packages/core/implementation-schemas.md)) and for
  rules ([logic-placement.md → Where the Promoted Thing Lives](../../packages/core/logic-placement.md#where-the-promoted-thing-lives)).
  This skill holds the same line for what those rules cannot see: meaning.
- A special case of an existing concept is a variant of it, not a parallel copy.
- Moving or duplicating where a concept lives, or moving a feature boundary, is an
  architectural decision, and a decision is recorded somewhere a later reader can find it.

## Stage 1. Concepts

List every concept the change **introduces or alters**. Name each one as the plain-language
question it answers ("can this task still be claimed?", "does this tenant owe an invoice?"),
not by its identifier.

Look in production code only. Tests, fixtures, docs and CI add no concept of their own.

Some shapes are a concept by definition, so a change that has any of them never has an empty
list. Treat each as at least one concept, then name the question it answers:

- the table definitions under `packages/core/src/system/db/` touched (a table, column or index
  added or altered), or a new file under `src/system/db/migrations/`
- a stored field added to an entity schema in a feature's `schemas/`, or a new `z.enum` member
  on a stored field
- an added write through `ctx.system.db` (insert, update, delete), or a new service method that
  changes state
- a new guard in a feature's `shared/validation.ts`, a new cross-entity invariant in an
  orchestration, or a new named decision or Strategy
- an added post-commit effect (a job enqueued, an email, an outbound call), or a new worker
  consumer or scheduled job
- a new feature folder under `packages/core/src/`, a new adapter under `system/`, a new
  `packages/<name>/` or `apps/<name>/`
- a new ADR, or a change to the project's glossary or map manifest

Other changes need judgement. The test is whether the change alters **who answers an existing
question** or **what a stored value means**: a changed default, threshold, transition condition
or eligibility rule is a concept even when it touches one constant. A shape derived from an
existing schema (`.pick()`, `.omit()`, `.partial()`) is not a concept; a new member on a
read-side or presentation shape is not one on its own, and on a stored field it is. A rule
decided in an app handler or in the UI counts like any other: where it sits is part of what is
being asked. When in doubt, it is a concept: a needless question costs minutes, a missed one
costs a second home in the model.

**Nothing in scope.** If the list is empty, skip Stages 2 and 3 and say so in the report: the
files examined, with a one-line verdict per file, so a reader can disagree.

## Stage 2. Search by meaning

For each concept, search the default branch **by meaning**, not by name: matching literal
values, synonyms, parallel timestamps and flags, guards that return the same verdict, service
methods that perform the same transition. The places a second home hides in a Foundry codebase:

- the table definitions: a column on another table, or a sibling column on the same one
- every feature's `schemas/`: enum members, and fields that encode the same fact
- every feature's `shared/validation.ts`, and the cross-entity invariants in `orchestrations/`
- service methods across features, including collection services
- `apps/*`: a rule decided in a handler, or a UI mirror that has become the only copy

Confirm each hit is about the same entity and the same question, not a same-named field on an
unrelated table. Read the recorded decisions the change cites or that govern what it touches.

## Stage 3. The eight checks

Run all eight on each concept:

1. **Ownership**: does something already answer this question?
2. **Special case**: is this "existing X, but for case Y"?
3. **Answer count**: after merge, how many places answer the question?
4. **Change cost**: list every place that writes this state (each creation and each transition).
   Is any transition written in more than one place?
5. **Readers**: list every reader of the existing owner, meaning every service read, guard,
   orchestration, handler, screen, worker or tool that shows or acts on this state. For each
   one, decide whether it will see the new case once the change, and the rest of its stack, has
   merged.
6. **Terminology**: does the name contradict the domain's vocabulary, a recorded decision, or
   the name the same thing already carries elsewhere in the code?
7. **Boundary**: does the change open or move a boundary, meaning a new feature folder, a table
   or rule changing its owning feature, a new dependency from one feature on another, or a new
   adapter, package or app? If so, is that decision recorded anywhere (the change's description,
   an ADR, the thread)?
8. **Recorded decision**: does the change rest on, reinterpret or contradict an ADR ruling or
   another recorded decision?

Back every finding with evidence at `file:line`, pinned to the head. A check with no evidence
passes. An answer count above 1, a transition written in more than one place, a reader that
won't see the new case, or a moved boundary with no recorded decision counts as a failed check.

Write one question per failed check. If several concepts fail the same check for the same
reason, write one question covering them.

**Already decided.** If the change's description, a recorded decision, the PR thread or the
user in this conversation has already answered what a question would ask, it is decided, not a
question. List it under **Already decided** with the source and do not ask it again.

Before writing the report, re-open every cited file at the head and confirm each `file:line`
still points at the quoted code. A citation that does not resolve is removed, and the finding is
dropped if no evidence remains.

## Rules for headlines

- Every question starts with a headline: one full sentence of up to about 25 words. Length is
  fine; vagueness is not.
- Default to the **consequence** form: what goes wrong, and for whom. Connect the change to its
  effect with "so".
  - "Whether a task can still be claimed will live in two fields, so every screen, worker and
    report has to check both or it will silently offer tasks that are gone."
  - "The inbox lists tasks waiting on a human but will not list the new `escalated` ones, so an
    escalated task has no screen where anyone sees it."
- For Terminology and Recorded decision, the **tension** form is also allowed: name the two
  things that conflict.
  - "ADR-0004 says a run is never retried, but the new status is called `retrying` and the
    service moves a run back into it."
- For Change cost and Boundary, the **trade-off** form is also allowed: ask the question the
  developer has to weigh.
  - "Is a separate `archive` feature for closed todos worth a second owner for every transition
    that closes one?"
- Never a bare topic or noun phrase ("Name versus ruling", "Cost of one more state").
- Description test: if the sentence could appear unchanged in the change's description, it is a
  description, not a concern. Add what goes wrong, for whom, or what must be decided.
- The headline must make sense without the body.
- The never-suggest rule applies to headlines too.

## Rules for questions

- **Never suggest.** No "consider", "should", "why not", "could instead", and no alternative
  designs phrased as questions. Ask about intent, scope and trade-offs.
- One decision per question. If a question contains two question marks, split it.
- At most two sentences.
- At most three `file:line` citations. Readers and Change cost tables are exempt, and must list
  every entry.
- Ask only what the code and the recorded decisions can't answer. If you can verify something,
  verify it and state it as evidence.
- Each question must be one the developer can answer in a sentence or with a decision.
- Every question must be readable on its own. Never refer to an ID, a table row or another
  section.

## Output format

The report is your reply. Output exactly this, with every section present, in this order.

```
## Architecture drift: <PR #n or branch> — <title>

Head `<head-sha>`, against `<base>`.
**Summary:** <number> questions. <The main concern, in consequence form.>

### Questions

#### 1. <Headline>
<Question body>

- **Today:** <what already exists> — `file:line`
- **This change:** <what the change adds> — `file:line`
- **Decision:** <the recorded decision, quoted in ≤15 words, with its source> (omit the line if none)
- **Check:** <label — meaning, exactly as in the list below>

#### <n>. <Headline for a Readers question, stating the count of **No** rows>
<Question body>

| Reader | What it shows or does | Reads | Sees the new case? |
|---|---|---|---|
| <plain name> | <user-visible effect> | `file:line` | **No** / Not verified / No (N/A: <reason>) / Yes (<how>) |

- **Check:** Readers — existing code that reads this state won't see the new case

#### <n>. <Headline for a Change cost question>
<Question body>

| Transition | Existing path | This change's path |
|---|---|---|
| <plain name, e.g. "assignee completes it"> | `file:line` | `file:line` |

- **Check:** Change cost — one more state or transition means editing several places

(Questions ordered by check, in the list order below. If none: "None: no failed checks.")

### Already decided
- <What would have been asked> — <the decision, quoted or closely paraphrased> (<source>)
(or "Nothing.")

### Not examined
- <anything out of scope or unreachable: a stacked PR not read, no ADRs or glossary found, a
  suspected breach of a Foundry rule with its owning doc, left to the review protocol>
(or "Nothing.")

<details><summary>Reference: concepts reviewed</summary>

| Concept (plain-language question) | This change adds | Existing owner | Verdict |
|---|---|---|---|
| <question> | `feature` · `table.column` or method | `feature` · `table.column` or — | New / Extends owner / Second home / Unclear / Decided |

</details>
```

When Stage 1 found nothing in scope, replace **Questions** and the concepts table with:

```
**Summary:** No concept in scope. <One sentence: which rule applied.>

### Files examined

| File | Verdict |
|---|---|
| `<path>` | <≤15 words: what it changes and why that is not a concept> |
```

### Check labels (use exactly these on the Check line)

1. Ownership — something already answers this question
2. Special case — this is an existing concept, but for one case
3. Answer count — more than one place will answer this question
4. Change cost — one more state or transition means editing several places
5. Readers — existing code that reads this state won't see the new case
6. Terminology — the name contradicts the domain's vocabulary or a recorded decision
7. Boundary — a feature or package boundary moved and no decision records it
8. Recorded decision — the change relies on, reinterprets or contradicts a recorded decision

### Table rules

- Readers: list every reader. Sort **No** first, then Not verified, then No (N/A), then Yes.
  The headline count includes only **No** rows.
- Change cost: one row per creation or transition, including every place the change writes the
  new state.

**Analysis only.** Do not modify code, write ADRs or open issues. If the developer's answer asks
for a change to be made, that is a new request, not part of this skill.
