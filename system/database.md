# Database

Infrastructure conventions for the database layer. For how services interact with the database, see [architecture/working-with-databases.md](../architecture/working-with-databases.md).

## Table Definitions

All Drizzle table definitions live in a single file at `src/system/db/`. This file is the authoritative database contract — column types, constraints, defaults, and relation definitions all live here.

Drizzle table definitions and Zod schemas serve different purposes and are maintained separately:

| | Location | Purpose |
|---|---|---|
| Drizzle table definitions | `src/system/db/` | Database contract — what is stored and how |
| Zod schemas | `src/<feature>/schemas/` | Domain contract — business shapes and validation |

They will overlap heavily but are not derived from each other. The service maps between them when needed.

**Table naming:** Drizzle table names use plural (`todos`, `orders`). This is the deliberate exception to the domain layer's singular convention — tables are collections, and plural is standard SQL practice. Domain class and schema names remain singular; only the table name is plural.

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
