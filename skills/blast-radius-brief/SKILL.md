---
name: blast-radius-brief
description: Generate a Blast-Radius Brief — a visual, 60-second-skimmable executive summary of a PRD/epic (architecture touch map, schema delta, wiring scenarios, build DAG, grouped stories) published as an HTML artifact. Use when the user wants to visualize a PRD, epic, or spec before implementation, or says "blast radius". Takes an issue number or a PRD file/text.
---

# Blast-Radius Brief

Render a text-heavy PRD/epic as a visual executive summary a reviewer absorbs in ~60 seconds,
then knows where to double-click. The full specification lives in [framework.md](framework.md)
in this skill's directory — **read it in full before doing anything**; it defines the page
skeleton (L0 promise → constant map → schema → build DAG → street level), the paint vocabulary,
interaction contracts, copy budgets, flex rules per PRD nature, and the verification checklist.
This file only covers the operational workflow around it.

## Inputs

- `$ARGUMENTS`: a GitHub issue number (fetch with `gh issue view N --json title,body`), a file
  path, or inline PRD text. For an epic, also fetch its child tickets — they carry the
  implementation detail; the bundle is "the PRD".
- The current repo is the target codebase. Ground every component/table/tool name in it, per the
  framework's derivation guide. If the PRD is not yet implemented, the repo shows the pre-state:
  ground existing seams in code, take the delta from the PRD, and mark schema details the PRD
  leaves open with a subtle "proposed" cue.

## Map manifest

Look for `docs/agents/map-manifest.md` in the target repo — the constant map's fixed geography.

- **Found**: use it verbatim; if the PRD touches components with no node, extend it append-only.
- **Absent**: bootstrap it per the framework's "Deriving a map manifest" section, write it to
  that exact path, and tell the user it was created (it's a durable, committed file). Never
  derive a fresh manifest when one exists.

## Workflow

1. Read framework.md, fetch/assemble the PRD bundle, resolve the manifest (above).
2. **Delegate generation to an Opus subagent** (this is the proven pattern — generation is a
   large, self-contained build): give it the framework path, the manifest path, the PRD bundle,
   and repo access. It writes one self-contained HTML file (inline CSS/JS, hand-built SVG
   diagrams, light + dark via `prefers-color-scheme` plus `data-theme` overrides).
3. **Verify in a real browser** before delivering — run the framework's verification checklist:
   every wiring scenario stepped through, story regroup toggle, schema-chip anchor, both themes,
   no horizontal page scroll. Use the BrowserClaw MCP if available (never the agent-browser
   skill); look at actual screenshots, don't assume.
4. **Publish** the verified page with the Artifact tool (new URL per PRD; keep one stable emoji
   favicon per brief) and return the URL with a 2–3 line summary of the blast radius: what's NEW,
   what's the schema hazard, what dies, critical-path depth.
5. Iterating on an existing brief: edit the same file and republish to the same artifact URL —
   never mint a new URL for a revision.

## Quality bar

The framework's checklist is mandatory, not advisory. The two failure modes that matter most:
prose creeping in (if a section reads like a narrative, it failed — cut words, not meaning) and
dishonest diagrams (flows must cross the repo's real seams; exceptions rendered loud). When the
PRD's nature makes a section empty, collapse or drop it per the flex rules — never pad.
