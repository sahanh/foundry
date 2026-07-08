# Database

Infrastructure conventions for the database layer — column and migration mechanics. How services interact with the database: [working-with-databases.md](../working-with-databases.md).

## Table Definitions

All Drizzle table definitions live in a single file at `src/system/db/` — the authoritative database contract (column types, constraints, defaults, relations). Drizzle table definitions (`src/system/db/`, database contract — what is stored and how) and Zod schemas (`src/<feature>/schemas/`, domain contract — business shapes and validation) are maintained separately: they overlap heavily but are never derived from each other; the service maps between them.

**Table naming:** plural (`todos`, `orders`) — the deliberate exception to the domain layer's singular convention (tables are collections; plural is standard SQL). Domain class and schema names stay singular; only the table name is plural.

**Primary keys:** the column holds the whole prefixed entity ID (e.g. `task_01HX…`) as a fixed-length `varchar` sized to the ID length. IDs are minted in the domain at creation, never by a column default — see [identifiers.md](../identifiers.md).

**Timestamps:** domain timestamp columns (`createdAt`, `updatedAt`, and similar) are `NOT NULL` with **no column default** — no `defaultNow()`, no `$defaultFn`. Like IDs, they are stamped in the domain at write time via `ctx.system.helpers` (the injected clock), never by the database: the injected clock stays the single source of time (deterministic tests), a forgotten stamp fails loud as a NOT-NULL violation instead of silently taking server time, and `defaultNow()` additionally stores microsecond precision that a JS `Date` truncates to milliseconds, breaking later timestamp comparisons. See [app-context.md → Persistence Timestamps](../app-context.md).

**Soft-delete tombstone:** a feature that soft-deletes marks the row with a nullable `deletedAt` column — `null` means live, a timestamp means deleted. It is the **one** nullable domain timestamp (its `null` carries meaning, so no `NOT NULL`), with **no column default**, stamped in the domain via `ctx.system.helpers` (`softDelete`). When to soft-delete at all (hard-delete is the default) and how the service behaves: [working-with-databases.md → Deletes](../working-with-databases.md#deletes).

**Enum columns:** a plain `varchar` sized to the longest member, guarded by the field's `z.enum([...])` — never Postgres `pgEnum`, which makes the database the first rejecter and turns every value added, removed, or reordered into an `ALTER TYPE` migration. Enum representation rule: [typescript-coding-standards.md → Enums vs String Literal Unions](../../../common/typescript-coding-standards.md#enums-vs-string-literal-unions).

**Tenant column (multi-tenant apps only):** every **tenant-owned** table carries a `NOT NULL` tenant-id column — the prefixed tenant entity id, a foreign key to the tenant table. The column name **must be uniform across every tenant-owned table**: `tenantId` is the recommended default, the exact name is a project decision (confirmed when tenancy is set up, like the `ctx.tenant` shape), but a per-table name would turn the single seam back into per-table config — the generic scoped `ctx.system.db` keys on that one predictable column, and a table without it falls outside the isolation guarantee. Exempt: the **tenant table itself** and **global reference tables** shared across all tenants. `tenantId` is stamped at write time by the **scoped seam** from `ctx.tenant` — never a service-passed value, never a column default or trigger — so a service cannot forge it and a raw default cannot silently mis-scope a row. Reflect it in the entity's Zod schema (`tenantId: entityId('tenant')`). The isolation guarantee is the app-level scoped seam, not the storage engine — no Postgres RLS or session variables: [multi-tenancy.md](../multi-tenancy.md).

**Column constraints mirror Zod schemas:** every column with a size or format constraint (e.g. `varchar(255)`) has the matching schema constraint (e.g. `.max(255)`) — the schema is the enforcer; the database is never the first rejecter. Rule owner: [implementation-schemas.md → Mirror Storage Constraints](../implementation-schemas.md).

## Migrations

- **Generate and apply** with `drizzle-kit generate` / `drizzle-kit migrate`. `drizzle-kit push` is local-development-only — against staging or production it applies changes with no traceable migration file, no audit trail, no rollback path.
- **Location:** generated migration files live in `src/system/db/migrations/`, co-located with the database contract and its history.
- **Ship together:** a change to the table definitions and its generated migration land in the same commit. Either one without the other is a broken state and must not be merged.
- **Append-only:** a committed migration file is immutable. Undo with a new migration — never edit or delete an existing one; the history is only trustworthy if never rewritten.
- **Deployment step, not app startup:** migrations run as an explicit pipeline step before the application starts. Running them at boot couples deployment to schema changes, makes failures harder to isolate, and a failed migration takes the application down with it.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Database adapter.
