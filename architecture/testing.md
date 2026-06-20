# Testing

How to test a feature. This is the starting baseline — the high-value layers — not the whole pyramid; expand later.

## What to Test Where

| Target | Test type | File | Why |
|--------|-----------|------|-----|
| `shared/validation.ts` — domain-level business-rule guards | **Unit** | `<name>.unit.ts` | The business rules in isolation — a cheap, exhaustive surface. Stub any lookup a guard performs. |
| Services | **Integration** | `<name>.integration.ts` | A service runs its logic over dependencies (repositories, etc.); test it wired to real or in-memory adapters. |
| Workflows | **Integration** | `<name>.integration.ts` | A workflow composes multiple services; test the composed flow. |

Tests live in `<feature>/__tests__/` with the `.unit.ts` / `.integration.ts` suffixes (see start-here.md → File Naming).

## Starting Point

The rule for now: **business rules get unit tests; services and workflows get integration tests.** Controllers, end-to-end flows, and exhaustive edge-case matrices come later — this baseline is the minimum worth having, not the ceiling.
