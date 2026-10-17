# End Here — `packages/core/system`

Verify companion to [start-here.md](./start-here.md), for a **driven adapter** (db, logger, clock, queue, …). Run the section matching what you changed. A box you cannot tick is a blocker.

Deterministic rules (import direction, column definitions, migrations, tenant column) are CI checks, not boxes — [setup/ci-verification.md](../../../setup/ci-verification.md); without CI for them, [review.md](../../../review.md) Step 0 checks them.

---

## Any driven adapter → [start-here.md](./start-here.md) · [code-placement.md](../../../code-placement.md)
- [ ] Named by capability, not vendor (`email/` not `sendgrid/`) — [start-here.md](./start-here.md#what-lives-here)
- [ ] Focused interface — what the domain needs, not a full-API passthrough — [code-placement.md](../../../code-placement.md#building-a-driven-adapter)
- [ ] No business logic inside — [code-placement.md](../../../code-placement.md#building-a-driven-adapter)
- [ ] Still `system/`-worthy — graduation only on a real signal (reuse beyond core, own lifecycle, genuine engine), never upfront — [code-placement.md](../../../code-placement.md#graduation-when-a-driven-adapter-leaves-system)
- [ ] Any deterministic invariant the adapter brings (its vendor's rules, its storage contract) has a CI check, recorded in the repo's manifest — [ci-verification.md → Extending](../../../setup/ci-verification.md#extending)

> A credential-verification/policy adapter (present only on a real signal — [start-here.md](./start-here.md)) obeys these same boxes and holds **no authorization rules** (those are domain guards reading `ctx.actor` — [identity-and-access.md](../identity-and-access.md)); it only plumbs the question.

## Foundational primitive → [start-here.md](./start-here.md#foundational-primitives) · [app-context.md](../app-context.md)
- [ ] Genuinely non-domain — no business rules or vocabulary (status machine, normalization policy, capability matrix → feature) — [start-here.md](./start-here.md#foundational-primitives)
- [ ] Right access mode: test-controllable runtime seam → `ctx.system.helpers.*`; schema-time/type/pure primitive → direct import — [app-context.md](../app-context.md#injectable-helper-vs-direct-import)
- [ ] Id system defined once — `newId`/`entityId` and every prefix read the single `system/` registry, no feature-re-declared literals — [identifiers.md](../identifiers.md)

## Database adapter → [database.md](./database.md)
- [ ] Table names plural (`todos`); primary key holds the whole prefixed entity ID, never split across columns — [database.md](./database.md#table-definitions)
- [ ] Constraints mirrored in Zod (schema ≥ DB, rejects first); enum columns plain `varchar` guarded by `z.enum([...])` — [database.md](./database.md#table-definitions)
- [ ] Multi-tenant: tenant checks pass — see *Multi-tenancy* below

## Multi-tenancy → [multi-tenancy.md](../multi-tenancy.md)
> Multi-tenant apps only (`start-here` has no tenancy section yet); rules: [multi-tenancy.md](../multi-tenancy.md), [database.md](./database.md) → *Tenant column*.
- [ ] A new table classified correctly as tenant-owned or global (exempt) — the exempt list the CI check reads — [multi-tenancy.md](../multi-tenancy.md#reviewing-a-tenancy-change)
- [ ] Entity schema reflects the tenant column as `entityId('tenant')` — [database.md](./database.md#table-definitions)
- [ ] Scoped `ctx.system.db` derived at assembly — the base handle is the scoped one, scoping never opt-in — [multi-tenancy.md](../multi-tenancy.md#isolation-is-enforced-at-the-database-seam)
- [ ] Only unscoped path = an explicit elevated context, never an ad-hoc raw client — [multi-tenancy.md](../multi-tenancy.md#the-one-unscoped-path)

## Logger adapter → [logging.md](./logging.md)
- [ ] Logging implemented before feature work (required subsystem) — [logging.md](./logging.md)
- [ ] Every entry carries `traceId`, read from the context by the adapter; no sensitive data at any level — [logging.md](./logging.md#what-not-to-log)

---

Cross-cutting TypeScript standards and the tooling baseline apply here too — enforced in CI ([setup/ci-verification.md](../../../setup/ci-verification.md)).
