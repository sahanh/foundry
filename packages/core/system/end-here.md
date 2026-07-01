# End Here — `packages/core/system`

The verify companion to [start-here.md](./start-here.md), for a **driven adapter** (db, logger, clock, queue, email, …). `start-here` is where you begin; this is where you confirm the adapter stays a clean, replaceable seam and never leaks into the domain.

You usually arrive here routed by the root review protocol when it maps a touch inside `system/`. Run the section that matches what you changed. A box you cannot tick is a blocker.

---

## Any driven adapter → [start-here.md](./start-here.md) · [code-placement.md](../../../code-placement.md)
- [ ] Named by **capability, not vendor** (`email/` not `sendgrid/`, `queue/` not `bullmq/`)?
- [ ] Exposes a **focused interface** expressing what the domain needs — not a thin passthrough of the library's full API?
- [ ] **No business logic** inside the adapter — no decisions about domain rules?
- [ ] Reached by the domain **only through `ctx.system.*`** — never a direct import? ([app-context.md](../app-context.md))
- [ ] Still correctly in `system/` — or has it **graduated** on a real signal (reused beyond the core, owns its own lifecycle, a genuine engine)? Graduation is a refactor triggered by a signal, not an upfront guess.

## Database adapter → [database.md](./database.md)
- [ ] Drizzle table names are **plural** (`todos`, `orders`)?
- [ ] The primary-key column holds the **whole prefixed entity ID** (not split, not a bare UUID)?
- [ ] Domain timestamp columns are `NOT NULL` with **no column default** (stamped by the app clock, not the DB)?
- [ ] Column constraints are reflected in the Zod schemas (schema ≥ DB, schema rejects first)?
- [ ] Migrations shipped in the same commit as the schema change, and are append-only?

## Logger adapter → [logging.md](./logging.md)
- [ ] Logging implemented **before feature work** (it is a required subsystem)?
- [ ] Every entry carries a `traceId` and structured fields — no bare string messages?
- [ ] No sensitive data logged at any level?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
