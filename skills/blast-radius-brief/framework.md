# Blast-Radius Brief — framework v3 (converged)

A **Blast-Radius Brief** is a single self-contained HTML page that sits on top of a text-heavy
PRD/epic and lets a reviewer absorb it visually in ~60 seconds: what it is, what it touches, what's
risky at the schema/domain level, how it flows at runtime, what order it builds in, and what's
deliberately not happening. It is a *technical* document with keynote copy density — short
declarative lines, no narrative — not a marketing page.

The reviewer this serves is **schema-first**: when reviewing, they skim the whole, spot the schema
or domain change, and zoom into that before anything else. Every structural choice below exists to
serve that skim-then-double-click motion.

## Inputs

1. **The PRD** (problem, solution, user stories, implementation decisions, child tickets,
   out-of-scope, notes).
2. **The repo** — you must ground every component name in the actual codebase. Never invent
   structure. If the repo has a **map manifest** (see below), use it verbatim.
3. **The map manifest** (per-repo, created once, reused by every future brief): the fixed geography
   of the constant map — its bands, its nodes, their labels and order. **Canonical location:**
   `docs/agents/map-manifest.md` in the target repo. Look there first; if absent, derive one per
   "Deriving a map manifest" below, write it to that path, and tell the user it was bootstrapped —
   it is a durable, committed file, not a per-brief scratch artifact. Never derive a fresh manifest
   when one exists at the canonical path; extend it (append-only) instead.

## Deriving a map manifest (first brief in a repo)

One manifest per repo, derived from the repo itself — never from any single PRD. It lists what
*exists*, neutrally; PRDs only paint it.

- **Bands are fixed**: APPS (driving adapters/edges) → PACKAGES (shared libs/ports) → DOMAIN CORE
  (domain districts) → INFRA (platform). Source of truth: the workspace layout (`apps/*`,
  `packages/*`), the core package's top-level source directories for districts, and the deploy/env
  config plus vendor SDKs for infra. (A repo with a different topology maps its own layers onto the
  same four altitudes: edges → shared libraries → domain → platform.)
- **Node granularity**: APPS — one node per app. PACKAGES — one per package (only real packages;
  the domain-core package itself is the CORE band, never a PACKAGES node). CORE — one per domain
  district (top-level domain dir); the dominant district lists its stable sub-areas as indented
  sub-node rows (they render as that district's small sub-nodes on the map). The core area hosting
  the domain's **ports/adapters seam** (a `system` / SystemAdapters module) IS a node even though
  it isn't a business domain — seams are the map's subject; pure cross-cutting helpers (logging,
  id minting, shared schema fragments) stay off. INFRA — one node per platform service the repo
  actually provisions or calls (database, object store, auth vendor, scheduler…), not every SaaS
  the docs mention. A provisioned **execution context** — a cron accessory, scheduled-job runner,
  queue worker — is an infra node even when it runs the repo's own image: the map cares that work
  originates outside the request path, not whether a vendor sells it.
- **Node format**: a stable name (repo path or proper noun) + a neutral one-line note saying what
  it *is* — never what some PRD does to it.
- **Ordering** within a band: most user-facing / most-touched first ("user" = human). Break ties
  deterministically — follow the deploy/routing config's role order, else alphabetical — so two
  independent derivations agree. Once set, the order is permanent — spatial memory is the point.
- **Completeness over relevance**: include every node even when no current work touches it; the
  dimmed untouched nodes are what make the map a map.
- **External consumers** (skills, CLIs, clients living outside the repo) are not listed up front;
  append one — rendered dashed, marked "consumer" — the first time a PRD touches it.
- **Append-only forever**: extend when stale; never rename, remove, or reshuffle existing nodes.
  Only a fundamental repo restructure justifies a new manifest version, recorded as a deliberate
  break.
- **Size guardrail**: a band approaching ~8–10 nodes gets grouped nodes (`workspace · user`),
  not more nodes.

## Output

One HTML file. Inline CSS/JS only, no external requests. Light + dark theme aware
(`prefers-color-scheme` **and** `:root[data-theme="dark"]` / `:root[data-theme="light"]`
overrides). No horizontal page scroll — wide diagrams scroll inside their own `overflow-x: auto`
container. Keyboard: ←/→ drive any step-through when its section is in view.
`prefers-reduced-motion` disables draw animations. Hand-built HTML/CSS/SVG diagrams (not mermaid) —
you need full control of routing and paint.

## The paint vocabulary (used identically everywhere on the page)

| State | Treatment |
| --- | --- |
| **NEW** | green accent — border/tag/dot |
| **MODIFIED** | amber accent |
| **SCHEMA / MIGRATION** | amber + a `⚠` hazard marker — the loudest paint on the page |
| **RETIRED** (demolition) | struck-through label + rubble/hatch texture |
| **untouched** | present but dimmed — never removed; the dim parts are what make a map a map |

Scenario flows each get one distinct accent color (e.g. upload / read / sweep), declared in a small
legend. Legends are contextual: touch legend in the touch coat, flow legend in wiring coats.

## Page skeleton — zoom levels

Fixed order. A thin fixed **zoom rail** (L0…Ln) scroll-spies the reviewer's altitude; each level has
a mono "eyebrow" kicker. Levels renumber when a section is dropped (see Flexing).

```
L0  The promise        — hero line + scope signature
L1  The map            — one constant map, two coats: touch + wiring scenarios
L2  The schema         — data-model delta as an ERD with paint
L3  The build          — child-ticket dependency DAG
L4  Street level       — grouped stories · demolition & trade-offs · not doing
```

Section head grammar (same for every level): mono eyebrow (`L2 · THE SCHEMA`), a title
(≤ 8 words), one plain sub-line (≤ 20 words). Nothing else before the visual.

### L0 — The promise

- Hero line: what the feature does, **≤ 10 words**. One sub-line, ≤ 15 words. Optionally one
  minimal before→after glyph (two small labeled states and an arrow).
- **Scope signature**: a strip of stat chips that fingerprint the PRD's nature at a glance —
  `N apps · N new packages · N new infra/external deps · N schema changes · N demolitions ·
  N tickets · critical path N deep`. New infrastructure or a new external dependency (a bucket, a
  scheduler, an auth vendor, a first-of-its-kind job) each get a chip — first-of-its-kind infra is
  exactly the fingerprint a reviewer scans for. A merged `N new infra` chip is fine provided every
  dep is named in the label and N ≤ 3; beyond that, split per dep. Only chips with non-zero counts
  appear. The schema
  chip uses hazard styling and **anchors to L2** on click. A backend-only PRD, a rework, and a
  small feature must *look different in this strip alone*.

### L1 — The map (the centerpiece; spend the most effort here)

One diagram, two coats, one control strip. Never two separate diagrams for "what it touches" and
"how it flows" — that is the redundancy this framework exists to kill.

**The constant map.** Horizontal bands, top to bottom: **APPS** (driving adapters/edges) →
**PACKAGES** (shared libs/ports) → **DOMAIN CORE** (its districts: the domain areas, with the ones
that have inner structure shown as small sub-nodes) → **INFRA** (databases, buckets, auth vendor,
scheduler). Node positions come from the map manifest and stay fixed across every PRD so reviewers
build spatial memory. Every manifest node renders every time — untouched ones dimmed.

**Node grammar**: state tag (NEW / MODIFIED / MIGRATION / RETIRED — untouched nodes carry no tag),
name, and a one-line sub-label saying *what changes here* (or "untouched"). Schema-bearing nodes
carry the `⚠`. The migration is painted at **both** ends: the domain table node in core *and* the
database node in infra. **Every retired/demolished component named in the PRD renders as its own
RETIRED node on the map** — split a district into a finer sub-node if the manifest has no node for
it. A demolition that appears only in L0/L4 but not on the map is a defect: the map is where the
absence must be made legible. Never list a paint state in the legend that no node on the map uses.

**Coat A — "Where it lands" (default view).** The touch painting, no arrows. Below the map, a
one-line "zoom-first rule" footnote: which nodes a reviewer should open first and why (hazards
first). Count the hazards.

**Coat B — wiring scenarios.** The control strip above the map lists the runtime scenarios (the
feature's 2–4 primary flows, e.g. `Upload · Read · Sweep`) next to `Where it lands`. Selecting a
scenario repaints the same map as a flow diagram:

- Only that scenario's arrows exist (no all-arrows composite; if you offer an `All`, it must never
  be the default).
- **Step-through**: `‹ back` / `next ›` controls + a step counter (`3 / 6`) + a one-line caption
  for the current hop, all in a **stepbar sitting on top of the diagram** (between control strip
  and map). Each advance draws the next arrow with a stroke-draw animation, lights the involved
  nodes in the flow's color, and de-emphasizes prior hops (~40%) so the current one is unmistakable.
  Numbered badges on the arrows are clickable to jump. Reset to step 1 on scenario switch.
- Touch state survives as a whisper under the wiring coat: NEW nodes keep a small green dot, the
  schema node keeps a small `⚠` badge — a reviewer mid-flow never loses "this hop enters a NEW
  component / touches the schema".
- Route arrows orthogonally (Manhattan, rounded elbows) on a consistent grid; per-scenario
  decluttering means routes never need to dodge another scenario's lines — use the space.
- Flows must be **architecturally honest**: every hop crosses the real seams (an edge never reaches
  infra except through the core's ports, if that's the repo's rule). If two edges converge on one
  core seam, show the convergence — that's exactly the fact the reviewer wants. Physical exceptions
  (e.g. bytes going client→bucket directly) should be visually loud, because the exception *is* the
  design.
- Flow-coverage obligations: only **NEW** nodes must be visited by some scenario — touch paint on a
  MODIFIED node is not a flow obligation, and a port-hosting node may be painted for the touch coat
  yet legitimately bypassed in wiring when the concrete adapter/package node carries the hop. When a
  district was split into finer NEW sub-nodes, light the specific sub-node a hop actually enters,
  not just the district's orchestration seam.

### L2 — The schema

The hazard from the map, expanded. An ERD of only the tables the PRD touches **plus their direct
context tables** (dimmed), hand-drawn:

- **Modified table**: existing columns dimmed in place; new columns as a distinctly painted band;
  new constraints/indexes as their own painted band. Hazard treatment on the card header.
- **Untouched-but-relevant table**: dimmed card explicitly tagged `NO DDL CHANGE` — absence of
  migration is information. If it gains new *row semantics* (a new enum/type value, a new key
  inside a jsonb column), paint just those entries green inside the dimmed card.
- **Edges**: solid lines for real FKs (labeled with cardinality, e.g. `N:1`, `1:1 · UNIQUE`);
  **dashed** lines for soft references that live in data, labeled "not a FK". Draw them as
  connectors between the table cards; a textual relationship list is a fallback, not the target.
  Name constraints/indexes by their real identifiers where the repo defines them.
- **Invariant callouts**: XOR/uniqueness/lifecycle rules the columns encode, as 1-line callout
  chips (≤ 12 words each).
- **Lifecycle strip**: if nullable timestamp columns encode a state machine (created/redacted/
  purged…), draw the states as a small horizontal strip with transitions, labeling which column
  drives each state.
- No DDL anywhere in the PRD → this section is dropped (see Flexing), and the scope signature
  shows no schema chip.

### L3 — The build

The child-ticket dependency DAG, full content width (same width as the map — never narrower):

- Critical path as a bold accent chain across the top run, left → right; parallel branches hang
  below with dashed edges.
- **Every node carries**: the ticket number, its area tag (core/api/web/mcp/infra), and a
  **one-line description of what it does** — the DAG must read without opening the tracker.
- A one-line legend: `critical path · N deep` / `parallelizable off #X`. Depth counts nodes;
  hops count edges (N−1) — never label a 4-node path "4 hops".
- Sub-line above states the shape in one sentence ("Six tickets. #74 → #75 → #77 → #79 is the
  critical path; #76 and #78 parallelize off #75.").

### L4 — Street level

Three panels: stories (widest), demolition & trade-offs, not doing.

- **Stories** are never a flat list. Roll them into **clusters** with: icon, capability name
  (≤ 5 words), count badge, and the member stories as one-liners. Clusters are **always fully
  expanded** — no accordions. Provide a **group-by toggle** (`By capability · By actor`) that
  re-buckets the same story set; actor lanes come from the PRD's "As a …" phrasing (person / agent
  / operator / anyone — add lanes as the PRD demands; never force a story into a wrong lane, but
  merge any lane that would hold a single story into a broader one **unless** the PRD's distinction
  is load-bearing — a different permission or role boundary. Never split for phrasing alone).
  Compress each story to its essence — drop the "As a X, I want" scaffolding in display; the
  capability/lane already carries the actor.
- **Demolition & trade-offs**: what gets retired (strike-through + rubble, matching the map), and
  each *deliberately accepted* risk/trade-off as one blunt line. Reworks live and die on this panel.
- **Not doing**: the out-of-scope list as a slim strip of one-liners. Scoping sessions settle these
  deliberately; honor them with their own box, not a footnote.

## Copy rules

- Hero ≤ 10 words. Section sub-lines ≤ 20 words. Node sub-labels ≤ 8 words. Step captions one
  line. Callouts ≤ 12 words. If any element needs a second sentence, it's two elements or it's cut.
- Technical, not promotional. Real identifiers in mono (`postWithAttachments`, `storage_key`).
  Never say "seamlessly", "powerful", "robust".
- Numbers over adjectives: "5 new columns", not "several new columns".

## Flexing by PRD nature

The skeleton is fixed; sections **re-weight, collapse, or drop** — they are never padded.

- **Rework / replacement PRD** (something dies): demolition is promoted — the scope signature leads
  with the retirement, the map will show a large RETIRED district (the constant map makes the
  absence legible), and the demolition panel grows to co-lead L4. Stories often 25+: the group-by
  toggle is mandatory, clusters stay expanded.
- **Small feature**: the map shows one or two painted nodes on a quiet grid — that quietness *is*
  the message; the DAG degrades to a 2–3 node chain (keep it, tiny); thin sections merge (demolition
  + not-doing can share a row).
- **Backend-only**: apps band mostly dim; scenarios may collapse to one; stories may group better
  by capability than actor.
- **No schema change**: drop L2 entirely, renumber levels, no hazard chips anywhere.
- **No meaningful runtime flow** (pure refactor/docs): drop the wiring coat; the map keeps only the
  touch coat and the control strip disappears.

## Derivation guide (PRD → page)

1. Read the PRD fully. List: new components, modified components, retired components, schema deltas
   (DDL and row-semantics), runtime flows, child tickets + dependency edges, stories + actors,
   accepted trade-offs, out-of-scope items.
2. Ground every component in the repo: real package/dir names, real table/column names, real
   tool/endpoint names. The PRD states the delta; the repo confirms the names. Where they conflict,
   the repo wins for names, the PRD wins for the delta.
3. Load or derive the map manifest; assign each touched component to its manifest node. A component
   with no node = the manifest is stale → extend it (append, don't reshuffle existing geography).
4. Choose 2–4 wiring scenarios. Visiting every NEW component is the coverage **floor**, not the
   selection rule. Within the 2–4 cap, include a flow when it (a) is a primary user-facing behavior
   central to the PRD's value, or (b) reveals edge topology no other flow shows — even if it
   revisits already-covered nodes. Drop any flow that only re-treads another flow's path.
5. Compute the scope signature from what you found — the chips are *derived*, never invented.
6. Build, then verify against the checklist below.

## Verification checklist (run in a real browser, light AND dark, before delivering)

- [ ] Default state: map shows "Where it lands", no arrows; stepbar hidden or inert.
- [ ] Every wiring scenario: step through every step; captions match arrows; no crossing/colliding
      connectors or labels; badges jump correctly; ←/→ work; switching scenarios resets.
- [ ] Whisper underlay (green dots, `⚠`) visible in wiring coats.
- [ ] Scope-signature schema chip anchors to L2. Zoom rail highlights each section as you scroll.
- [ ] DAG spans the full content width; every node has its one-liner.
- [ ] Story group-by toggle re-buckets; counts correct; clusters expanded; no accordions anywhere
      in L4.
- [ ] No horizontal page scroll at 1280px and at 400px. No console errors.
- [ ] Word budgets: hero ≤ 10, sub-lines ≤ 20, no paragraph anywhere below L0.
