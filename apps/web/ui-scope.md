# UI Scope

Treat the user's request as the **boundary** for the first pass. Implement the requested feature surface well; do not invent adjacent product surfaces without confirmation. This is the frontend reading of the core's discipline to *confirm boundaries with the user* rather than expand unilaterally.

## Implement the named pattern's essentials

When the user names a known UI pattern, build the normal essentials of that pattern without asking for every low-level detail. For a Kanban board, that includes columns, cards, card ordering, empty states, scrolling, and responsive behavior — these are part of making the named pattern work.

## Ask before adjacent surfaces

Ask before adding UI **outside** the requested pattern — metrics, dashboards, summaries, explanatory subtitles, filters, bulk actions, charts, timeline panels, or extra workflow controls. If an adjacent surface seems useful, **propose it separately** instead of adding it immediately.

## Enforcement

- Do not infer product requirements from common SaaS page templates.
- Do not add dashboard-like elements just because the page has room.
- Do not ask for every low-level detail of a well-known requested pattern.
- Ask at the **feature-surface** level, not the styling-detail level.
- When unsure whether an element is part of the requested pattern or an adjacent enhancement, ask before adding it.
