# Entity Identifiers

How every persisted entity gets its `id`. Schema representation is covered in [implementation-schemas.md](./implementation-schemas.md); the primary-key column is covered in [system/database.md](./system/database.md).

## Core Principle

**Identifiers are typed and self-describing.** Every entity `id` is a Stripe-style prefixed string — a short prefix naming the entity, then a sortable random body — stored whole as the primary key. The same value appears in the database, in logs, and in API responses, so an `id` tells you what it refers to without a lookup.

```
task_01HXMERZ8KQ3F7G9VBN2C4YD5E
  ▲    ▲
prefix  ULID body (26 chars, time-sortable)
```

## Format

`<prefix>_<ulid>`

- **prefix** — short, lowercase, derived from the entity's **singular** domain name (`task`, `user`, `order`). It is defined **once per entity** in a single prefix registry so prefixes never collide or drift apart from the entities they name. This registry is a plain `system/` module (see [system/start-here.md](./system/start-here.md)); both the runtime `newId` minter and the import-time `entityId` schema helper read it, so the prefix is defined once and cannot drift between minting and validation.
- **separator** — a single underscore `_`.
- **ulid** — a 26-character [ULID](https://github.com/ulid/spec): Crockford base32 (uppercase, excludes `I`, `L`, `O`, `U`), lexicographically sortable by creation time. This gives good index locality (no random B-tree fragmentation) and lets rows sort by creation order without a separate timestamp.

The total length is fixed per entity: `len(prefix) + 1 + 26`.

## Stored Whole

The full string (`task_01HX…`) **is** the primary-key column value. There is no separate bare-UUID column and no adding/stripping of the prefix at the API boundary — the database, logs, and API all carry the identical self-describing identifier.

## Generated in the Domain, Not the Database

IDs are minted at entity creation, inside the service, through the **injected id-source** on the context — `ctx.system.helpers.newId('task')` — never by a database column default. The ID is therefore known before the insert (so it can be returned, logged, and referenced in the same operation), and because the source is injected, ID generation is controllable: production defaults to a ULID generator, a test injects a deterministic one so ids are stable and assertable — the same rationale as the injected clock (see [app-context.md → Minting IDs](./app-context.md)).

```typescript
ctx.system.helpers.newId('task'); // → "task_01HXMERZ8KQ3F7G9VBN2C4YD5E"
```

Minting runs at runtime with `ctx` in hand, so it is a **helper**; shape *validation* runs at schema-definition time with no `ctx`, so `entityId` (below) is a **direct import** instead — see [app-context.md → Injectable helper vs direct import](./app-context.md).

## Schema Representation

Replace `z.string().uuid()` with a validated, prefix-checked string via `entityId` — a direct-import schema helper from the `system/` id module (it runs at schema-definition time, where there is no `ctx`, so it is imported, not reached through the context):

```typescript
// shared id helper (system/ id module — imported directly)
const entityId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`));

const TaskSchema = z.object({
  id: entityId('task'),
  // ...
});
```

The regex encodes the prefix and the exact body alphabet and length, so a malformed or mis-prefixed ID is rejected at the boundary. This is the same enforcement that backs the fixed-length `varchar` primary-key column — see [implementation-schemas.md → Mirror Storage Constraints](./implementation-schemas.md).

```
id: entityId('task')      ✓
id: z.string().uuid()     ✗   (opaque; not self-describing)
```

## Operation IDs Are Not Entity IDs

`AppContext.traceId` stays a UUID (see [system/logging.md](./system/logging.md) and [app-context.md](./app-context.md)). It identifies an *operation*, not a persisted entity, and is out of scope for this convention. Do not apply the prefixed-ID format to trace IDs, and do not use a UUID for an entity `id`.

## Anti-Patterns

- **Bare `z.string().uuid()` on a new entity `id`** — opaque, not self-describing, and (UUIDv4) bad for index locality.
- **Exposing sequential integer primary keys** — leaks volume and enables enumeration.
- **DB-generated IDs** (column default) instead of domain-minted — the ID isn't known until after the write, and generation can't be tested in isolation.
- **A prefix that doesn't match the entity, or one prefix reused across entities** — defeats the self-describing purpose.
- **Storing the prefix and body in separate columns** — the ID is one value; split it and every join, log, and URL has to reassemble it.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Schemas (the `id` check).
