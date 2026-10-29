---
name: capture-fix
argument-hint: "[what you found, or an issue to finalise]"
description: File a contained fix found while working — a bug, an implementation gap or a test fix in something that already exists — as a self-contained issue an agent can build, in a Foundry codebase. When you come across one outside the task at hand, don't fix it on the side and don't run this skill unasked — first ask the user "Shall I invoke /capture-fix?" On yes it gathers the context from the conversation, works out the open questions a contained fix depends on with a recommendation for each, checks for duplicates, and files the issue, ready for implement or marked for a human to finalise. Run on an existing issue, it finalises one. Never fixes anything itself.
---

# Capture fix

You turn something found while working into an **issue that stands on its own**: an agent in a fresh
session, or a person, can act on it with nothing else. You don't fix it, and you don't derail the task
it was found in — capture is one quick step, then the work carries on.

**A fix** is a contained change to something that already exists, whose right behaviour is mostly
already decided — by a PRD, a spec, an ADR, or how the rest of the system behaves:

- **a bug** — it does the wrong thing;
- **an implementation gap** — a case the code doesn't handle yet: an error path, a permission check, an
  edge the PRD covered and the code skipped;
- **a test fix** — a missing test, a test that can't fail, a guard row with no evidence.

New behaviour is not a fix: it goes to [elaborate-feature](../elaborate-feature/SKILL.md).

## Project parameters

This file is a template: an adopting repo installs and adapts it ([setup/agent-skills.md](../../setup/agent-skills.md)).
Filled in when installed:

| Parameter | Value |
|---|---|
| Issues live in | *e.g. GitHub issues in `<owner>/<repo>`; `docs/agents/issue-tracker.md` gives the commands* |
| Fix labels | *the kind `fix`; ready `ready-for-agent`; needs a human `needs-triage`* |
| Domain vocabulary and decisions | *e.g. `GLOSSARY.md` and `docs/adr/`, as `docs/agents/domain.md` names them* |

## How to work

- **Ask first, always.** You never start on your own.
- **Stay light.** Read code, docs and the tracker; don't write code, create branches or commit. The
  reproduction is `implement`'s first failing test, not yours.
- **Portable.** Write behaviour, not procedure, in the domain's words. Anything tied to the code as it
  is now — a path, a function, an output — goes under *Evidence*, pinned to the commit you saw it at.
  Links go under *References* and are never needed to understand the issue.
- **Facts are yours to find; decisions are the user's.** Answer what the code and docs can answer; leave
  the rest as questions with your recommendation.

## Stage 0. Ask

Unless the user asked for this skill themselves, stop and ask, in one message, then wait:

> I found something that needs a fix outside this task: <one line — what's wrong, and where>. Shall I
> invoke `/capture-fix` to file it as an issue? (yes / no)

**No:** note it in your report and return to your task. **Yes:** go on. Run on an existing issue
(`/capture-fix #<n>`): go to Stage 6.

An agent running unattended, with no one to ask, doesn't run this skill: it lists the find under
*fixes found* in its report, and whoever reports to the user offers it there.

## Stage 1. Gather

From the conversation and the code, with no questions to the user:

- **Context** — what was being worked on, and how this surfaced.
- **Current behaviour** — what happens now, as observed.
- **Desired behaviour** — what should happen, and what decides it: the PRD or spec, an ADR, the
  glossary, or how the rest of the system already behaves.
- **Evidence** — the output, the request and response, the code path; the commit (`git rev-parse HEAD`).

## Stage 2. Is it a fix?

It is a fix when the desired behaviour is mostly decided already and the change fits one slice: one
use case's path, a test or two. If it needs new behaviour decided, or spans several use cases, it's
**bigger than a fix**: file it at Stage 5 marked for a human, with the note *"Bigger than a fix:
elaborate it with `/elaborate-feature`"* in place of the questions.

## Stage 3. Work out the open questions

Walk the decisions a contained fix depends on, the way [grilling](../grilling/SKILL.md) builds its
design tree — but put no question to the user. For each, answer from the code, the docs and the
decisions as a **recommendation** with its reason, or leave it **blank** with why the code and docs
can't settle it. The usual ones:

- each actor or case the fix touches — what is right for each;
- what happens on failure, and to input that arrives twice;
- data already wrong because of it — left, repaired, or flagged;
- anyone relying on the current behaviour.

A question whose answer the PRD, spec or an ADR already gives is not open: write the answer into the
desired behaviour. **No open questions** means the issue is ready.

## Stage 4. Check for duplicates

Search the open and recently closed issues — fixes and PRDs — by the concept, not just the words.

- **An open match:** add your evidence and context to it as a comment, tell the user its link, and stop.
- **A closed match** (fixed and back again, or rejected): file a new issue that references it.

## Stage 5. File it

From [issue-template.md](issue-template.md): kind, context, current and desired behaviour, acceptance
criteria, out of scope, evidence, references.

- **Ready** — no open questions: the fix label and the ready label.
- **Needs a human** — open questions, or bigger than a fix: the fix label and the needs-a-human label,
  with the *Needs a human to finalise* section listing each question and its recommendation, or blank.

Tell the user the link in one line, and return to the task you were on.

## Stage 6. Finalise an issue

Run on an existing issue that needs a human:

1. Read it in full, comments included.
2. Put its open questions to the user in **one round**, numbered, each with its recommendation; "yes"
   accepts them all. An answer that opens a new question gets one follow-up round.
3. Write the answers into *Desired behaviour* and *Acceptance criteria*, remove the *Needs a human to
   finalise* section, and swap the needs-a-human label for the ready one.
4. If the answers show it isn't a contained fix after all, say so, point to `/elaborate-feature` with
   the issue as its starting point, and leave it marked for a human.
