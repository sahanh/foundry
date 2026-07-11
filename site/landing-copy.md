# Foundry — landing page copy

Source of truth for the landing page text. The page renders this; it does not paraphrase it.
Sections are numbered to match the `§` marginal numbers in the design.

---

## §0 — Masthead

**Wordmark:** Foundry

**Byline:** by @sahanh → <https://github.com/sahanh>

**Tagline:**

> An engineering standard for TypeScript, built for autonomous software factories.

---

## §1 — Origin

Foundry is the shape I kept arriving at. Over a decade of building systems I found myself
re-deriving the same structure on every project, so eventually I wrote it down. What turned those
notes into a standard was an experiment: how far can you push a coding agent to build software the
way I'd architect it myself? Far enough that it now runs inside software factories, where agents
take a PRD and build the whole thing.

---

## §2 — Setup

**Intro line:** Point your agent at it. Add this to your `AGENTS.md` or `CLAUDE.md`:

**Code block (copyable):**

```md
## Engineering standard

Before writing any code, read the Foundry README and follow it — https://github.com/sahanh/foundry
When the change is complete, run the review protocol, ideally in a sub-agent — https://github.com/sahanh/foundry/blob/main/review.md
```

---

## §3 — How it's structured

At the centre is a domain that knows nothing about the world around it. No framework, no transport,
no database driver reaches into it. Foundry's first job is to organise that domain: services are the
only seam that touches data, orchestrations coordinate them, schemas are the source of truth. Its
second job is the more opinionated one — saying where a rule is allowed to live, and how boundaries
inside the domain speak to one another, so that logic doesn't scatter across the edges of the
modules it half-belongs to.

Because the core is self-contained, everything that reaches it is an adapter. Foundry sets a
standard for those too: a tRPC router, a REST controller, an MCP tool handler, a web app, a CLI, a
queue consumer. Each one translates at the edge and calls in. Business logic never leaks into an
integration point, which means a new distribution channel is a new adapter rather than a second copy
of the rules — and modern software is expected to arrive through several channels at once.

Those channels have to live somewhere. The repository is a monorepo with exactly two homes — the
apps that drive the domain, and the packages it's built from — and the placement rule decides which
one a given piece of code belongs in, so the answer is derived rather than argued about.

Two concerns cut vertically through all of it. Failure is one strategy, not one per edge: the domain
raises, and every adapter maps what it's given onto its own transport, so consumers meet a
consistent error surface no matter which channel they came through. Identity is the other:
authentication resolves at the edge, authorization lives in the domain, and every operation runs as
an actor carried on a context of established facts.

Two properties fall out of the arrangement rather than being bolted onto it. The domain is testable,
because nothing has to be stood up or mocked to reach it. And the standard is stack-agnostic within
TypeScript: the examples reach for Zod and Drizzle because those are what I use today, but nothing
in the structure depends on them — the rule is that services are the only seam that touches data,
not what sits behind it.

---

## §4 — Why a guideline, not a framework

A framework would hand you most of this for free. But frameworks come and go, and they ship updates
on their own schedule rather than yours. Some projects take years to find their shape, and I'd
rather not spend those years on migrations I didn't ask for. Foundry is a guideline, not a
dependency: there's nothing to install and nothing to upgrade. Depending on the project I might
reach for a standard toolkit or assemble my own stack — the structure holds either way, because it
was never the framework's to hold.

---

## Footer

- The Standard → `./docs/` (the docs viewer)
- GitHub → <https://github.com/sahanh>
- X → <https://x.com/sahan_dsh>

---

## Notes on the copy

**Voice.** Descriptive, not promotional. Each claim states a rule and the reason it is a rule; no
outcome is promised to the reader. First person in §1 and §4, where the opinion is the point.

**Ordering.** Setup (§2) sits right after Origin so the one action a reader can take is reachable
before the long prose — the page earns attention with the backstory, then converts it immediately.
The structure section (§3) moves centre-outward — the domain, then what's inside it, then the
adapters around it, then the repository that holds them. Only after the layers are laid down do the
two *vertical spines* (failure, identity) get drawn through them, and the two *consequences*
(testability, stack-agnosticism) come last. Anything that is a consequence rather than a layer must
stay at the end, or it interrupts the progression.

**§4 sits last deliberately.** "Why not a framework" is an objection-handler. Answering it before
the reader knows what the thing does reads as defensiveness; answering it after they've read the
structure reads as a relief.

**Claims that depend on the guidelines staying strict.** §3's "nothing has to be stood up or mocked"
leans on `testing.md`, and "context of established facts" leans on the context-as-facts invariant in
`app-context.md`. If those rules ever soften into advice, the copy overstates what the standard
guarantees.

**No filenames in prose that could rot.** Document names are named only where they are load-bearing
(the Setup block). `named-decisions.md` → `branching-logic.md` has already happened once; the page
should survive the next rename without a changelog entry pointing at it.
