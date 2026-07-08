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

> A credential-verification or policy adapter — present **only** on a real signal (see [start-here.md](./start-here.md)) — is governed by these same boxes, and above all holds **no authorization rules**: those are domain guards reading `ctx.actor` ([identity-and-access.md](../identity-and-access.md)); the adapter only plumbs the question to the external engine.

## Foundational primitive → [start-here.md](./start-here.md#foundational-primitives) · [app-context.md](../app-context.md)
- [ ] Is it genuinely non-domain — **no business rules, no domain vocabulary** (a status machine, normalization policy, or capability matrix belongs to a feature, not here)?
- [ ] Right **access mode** — a runtime seam worth controlling in tests is a helper on `ctx.system.helpers.*` (`newId`, `timestamps`); a schema-time / type / pure primitive (`entityId`, `Page<T>`, `resolveLimit`) is a direct import (per [Injectable helper vs direct import](../app-context.md))?
- [ ] Is the id system defined **once** — `newId` / `entityId` and every prefix read the single `system/` id module/registry, not a literal re-declared in a feature?

## Database adapter → [database.md](./database.md)
- [ ] Drizzle table names are **plural** (`todos`, `orders`)?
- [ ] The primary-key column holds the **whole prefixed entity ID** (not split, not a bare UUID)?
- [ ] Domain timestamp columns are `NOT NULL` with **no column default** (stamped by the app clock, not the DB)?
- [ ] Is any soft-delete column a **nullable** `deletedAt` tombstone (the one nullable domain timestamp) — no column default, stamped in the domain?
- [ ] Column constraints are reflected in the Zod schemas (schema ≥ DB, schema rejects first)?
- [ ] Are enum-valued columns stored as `varchar` guarded by the schema's `z.enum([...])` — **not** `pgEnum`?
- [ ] Migrations shipped in the same commit as the schema change, and are append-only?
- [ ] (Multi-tenant app) Does a **tenant-owned** table carry a `NOT NULL` tenant-id FK **and** an RLS policy — see *Multi-tenancy* below?

## Multi-tenancy → [multi-tenancy.md](../multi-tenancy.md)
> Multi-tenant apps only. `start-here` does not yet carry a tenancy section — the authoritative rules live in [multi-tenancy.md](../multi-tenancy.md) and [database.md](./database.md) → *Tenant column & RLS*.
- [ ] Does every **tenant-owned** table have a `NOT NULL` tenant-id column (FK to the tenant table) **and** an RLS policy keyed on the `app.current_tenant` session variable — with the **tenant table itself and global reference tables exempt**?
- [ ] Is the tenant column named **identically on every tenant-owned table** — the app's one chosen name (`tenantId` by default), which the generic scoped seam and RLS key on?
- [ ] Is the tenant column stamped by the **scoped seam** (never a service value, never a column default or trigger) and reflected in the entity's Zod schema (`entityId('tenant')`)?
- [ ] Is the scoped `ctx.system.db` derived at **assembly** — the app-level filter plus `SET LOCAL app.current_tenant` issued **inside** the transaction — so isolation is at the seam, not per-query discipline?
- [ ] Did the tenant column **and** its RLS policy ship in the **same append-only migration**?
- [ ] Is the only unscoped path an **explicit elevated context**, never an ad-hoc raw client?

## Logger adapter → [logging.md](./logging.md)
- [ ] Logging implemented **before feature work** (it is a required subsystem)?
- [ ] Every entry carries a `traceId` and structured fields — no bare string messages?
- [ ] No sensitive data logged at any level?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
