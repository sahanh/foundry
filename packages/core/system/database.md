# Database

Infrastructure conventions for the database layer. For how services interact with the database, see [working-with-databases.md](../working-with-databases.md).

## Table Definitions

All Drizzle table definitions live in a single file at `src/system/db/`. This file is the authoritative database contract — column types, constraints, defaults, and relation definitions all live here.

Drizzle table definitions and Zod schemas serve different purposes and are maintained separately:

| | Location | Purpose |
|---|---|---|
| Drizzle table definitions | `src/system/db/` | Database contract — what is stored and how |
| Zod schemas | `src/<feature>/schemas/` | Domain contract — business shapes and validation |

They will overlap heavily but are not derived from each other. The service maps between them when needed.

**Table naming:** Drizzle table names use plural (`todos`, `orders`). This is the deliberate exception to the domain layer's singular convention — tables are collections, and plural is standard SQL practice. Domain class and schema names remain singular; only the table name is plural.

**Primary keys:** the primary-key column holds the whole prefixed entity ID (e.g. `task_01HX…`) as a fixed-length `varchar`, sized to the ID length. IDs are minted in the domain at creation, never by a column default. See [identifiers.md](../identifiers.md) for the format and generation rule.

**Timestamps:** domain timestamp columns (`createdAt`, `updatedAt`, and similar) are `NOT NULL` with **no column default** — no `defaultNow()`, no `$defaultFn`. Like IDs, they are stamped in the domain at write time, via `ctx.system.helpers` (which reads the injected clock), never by the database. This makes the injected clock the single source of time — so timestamps are controllable in tests — and makes a forgotten stamp fail loud as a NOT-NULL violation rather than silently taking server time. See [app-context.md](../app-context.md) → Persistence Timestamps.

**Soft-delete tombstone:** a feature that soft-deletes (see [working-with-databases.md](../working-with-databases.md) → Deletes) marks the row with a nullable `deletedAt` column — `null` means live, a timestamp means deleted. This is the **one** domain timestamp that is nullable: unlike `createdAt`/`updatedAt`, `deletedAt`'s `null` carries meaning, so it takes no `NOT NULL`. It is still stamped in the domain via `ctx.system.helpers` (`softDelete`) with **no column default** — never `defaultNow()`. Hard-delete is the default; a `deletedAt` column with no recoverability signal is a rung climbed too early.

**Enum columns:** a column whose domain type is an enum is stored as a plain `varchar` (sized to its longest member), guarded by the field's `z.enum([...])` — the same schema-is-the-enforcer rule as the size constraints below. Do **not** use Postgres `pgEnum`: it makes the database the first rejecter and turns every value added, removed, or reordered into an `ALTER TYPE` migration. See [implementation-schemas.md](../implementation-schemas.md) → Explicit Over Implicit.

**Tenant column & RLS (multi-tenant apps only):** in a multi-tenant application (see [multi-tenancy.md](../multi-tenancy.md)), every **tenant-owned** table carries a `NOT NULL` tenant-id column — the prefixed tenant entity id, a foreign key to the tenant table — **and** a Postgres **Row-Level Security policy** keyed on the per-transaction session variable (`app.current_tenant`) the AppContext factory sets. **The column name must be uniform across every tenant-owned table.** `tenantId` is the recommended default, but the exact name is a project decision (confirmed when tenancy is set up, like the `ctx.tenant` shape); what is **not** optional is that it is the *same* on every table — the generic scoped `ctx.system.db` and the RLS policies key on that one predictable column, so a per-table name would turn the single seam back into per-table config. (This doc uses `tenantId` as the running example.) The two together are the isolation guarantee: the app-level scoped `ctx.system.db` filters, and RLS backstops it at the database. Exempt from both: the **tenant table itself** (it defines tenants) and **global reference tables** shared across all tenants. Like the id and timestamps, `tenantId` is stamped in the domain at write time — here by the scoped seam, not a service and never a column default. Reflect the column in the entity's Zod schema (`tenantId: entityId('tenant')`), the same schema-is-the-enforcer rule as every other column. RLS is a **defense-in-depth security boundary**, not the first rejecter of business input — distinct from the `pgEnum` anti-pattern below, where the DB wrongly rejects ordinary values first. A tenant-owned table's `tenantId` column **and its RLS policy** are part of the schema change, so they ship in the **same append-only migration** (see Migrations below).

**Column constraints must be reflected in Zod schemas:** every column with a size or format constraint (e.g. `varchar(255)`) must have a corresponding constraint in its Zod schema field (e.g. `.max(255)`). The schema is the enforcer — the database must never be the first thing that rejects input. See implementation-schemas.md → Mirror Storage Constraints.

## Migrations

### Generating and applying migrations

Use `drizzle-kit generate` to produce migration files from schema changes, and `drizzle-kit migrate` to apply them. `drizzle-kit push` is acceptable for local development only — it must not be used against staging or production environments, as it applies changes without a traceable migration file.

### Where migration files live

Generated migration files live in `src/system/db/migrations/`. This keeps the database contract and its history co-located.

### Schema changes and migrations ship together

When the table definition in `src/system/db/` changes, the generated migration file ships in the same commit. A schema change without a migration, or a migration without the matching schema update, is a broken state and must not be merged.

### Migration files are append-only

Once a migration file is committed, it is immutable. If a change needs to be undone, write a new migration — never edit or delete an existing one. The migration history is only trustworthy if it is never rewritten.

### Migrations run as a deployment step

Migrations run as an explicit step in the deployment pipeline before the application starts. Running migrations on application startup couples the application boot to schema changes and makes failures harder to isolate and recover from.

## Anti-Patterns

- **Using `push` outside local development** — no audit trail, no rollback path, and changes can't be reliably replicated.
- **Editing a committed migration file** — breaks the integrity of the migration history.
- **Schema change without a migration** — the table definition and migration history go out of sync.
- **Migration on app startup** — ties deployment concerns to application boot; a failed migration takes the application down with it.
- **`defaultNow()` / a column default on a domain timestamp column** — bypasses the injected clock (breaking deterministic tests), and `defaultNow()` also stores microsecond precision that a JS `Date` truncates to milliseconds, breaking later timestamp comparisons. Stamp in the domain via `ctx.system.helpers` instead.
- **`pgEnum` for a domain enum** — puts the value set in the database as the first rejecter and forces an `ALTER TYPE` migration to add, remove, or reorder a value. Store a `varchar` guarded by the schema's `z.enum([...])` instead.
- **Soft-delete by default** — a `deletedAt` column on an entity with no recoverability signal. Hard-delete is the default; adopt a tombstone only on a real signal, and filter it in the owning service. See [working-with-databases.md](../working-with-databases.md) → Deletes.
- **Tenant-owned table without `tenantId` + RLS** — in a multi-tenant app, relying on the app-level scoped client alone. Without the RLS policy, one raw query or hand-written join is a cross-tenant read. The tenant table and global reference tables are the only exemptions. See [multi-tenancy.md](../multi-tenancy.md).
- **Service-set or DB-default `tenantId`** — a service passing `tenantId` on an insert, or a column default / trigger filling it. It is stamped by the scoped seam from `ctx.tenant`, so the service cannot forge it and a raw default cannot silently mis-scope a row.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Database adapter.
