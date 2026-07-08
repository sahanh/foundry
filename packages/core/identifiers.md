# Entity Identifiers

How every persisted entity gets its `id`. Schema representation is covered in [implementation-schemas.md](./implementation-schemas.md); the primary-key column in [system/database.md](./system/database.md).

## Core Principle

**Identifiers are typed and self-describing.** Every entity `id` is a Stripe-style prefixed string — a short prefix naming the entity, then a sortable random body — stored whole as the primary key. The same value appears in the database, in logs, and in API responses, so an `id` tells you what it refers to without a lookup. Never a bare UUID for an entity `id` (opaque, and UUIDv4 has bad index locality), and never an exposed sequential integer key (leaks volume, enables enumeration).

```
task_01HXMERZ8KQ3F7G9VBN2C4YD5E
  ▲    ▲
prefix  ULID body (26 chars, time-sortable)
```

## Format

`<prefix>_<ulid>`

- **prefix** — short, lowercase, derived from the entity's **singular** domain name (`task`, `user`, `order`). One prefix per entity — never reused across entities or mismatched with the entity it names (that defeats the self-describing purpose). It is defined **once** in a single prefix registry — a plain `system/` module (see [system/start-here.md](./system/start-here.md)) read by both the runtime `newId` minter and the import-time `entityId` schema helper, so minting and validation cannot drift.
- **separator** — a single underscore `_`.
- **ulid** — a 26-character [ULID](https://github.com/ulid/spec): Crockford base32 (uppercase, excludes `I`, `L`, `O`, `U`), lexicographically sortable by creation time — good index locality (no random B-tree fragmentation) and creation-order sorting without a separate timestamp.

The total length is fixed per entity: `len(prefix) + 1 + 26`.

## Stored Whole

The full string (`task_01HX…`) **is** the primary-key column value. No separate bare-UUID column, no adding/stripping the prefix at the API boundary, and never prefix and body in separate columns — the ID is one value; split it and every join, log, and URL has to reassemble it. Database, logs, and API carry the identical self-describing identifier.

## Generated in the Domain, Not the Database

IDs are minted at entity creation, inside the service, through the **injected id-source** on the context — `ctx.system.helpers.newId('task')` — never by a database column default (the ID would be unknown until after the write, and generation untestable in isolation). Because the source is injected, a test supplies a deterministic generator — the same rationale as the injected clock: [app-context.md → Minting IDs](./app-context.md).

```typescript
ctx.system.helpers.newId('task'); // → "task_01HXMERZ8KQ3F7G9VBN2C4YD5E"
```

Minting runs at runtime with `ctx` in hand, so it is a **helper**; shape *validation* runs at schema-definition time with no `ctx`, so `entityId` (below) is a **direct import** instead — see [app-context.md → Injectable helper vs direct import](./app-context.md).

## Schema Representation

Replace `z.string().uuid()` with the validated, prefix-checked `entityId` — a direct-import schema helper from the `system/` id module:

```typescript
// shared id helper (system/ id module — imported directly)
const entityId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`));

const TaskSchema = z.object({
  id: entityId('task'),
  // ...
});
```

The regex encodes the prefix and the exact body alphabet and length, so a malformed or mis-prefixed ID is rejected at the boundary — the same enforcement that backs the fixed-length `varchar` primary-key column ([implementation-schemas.md → Mirror Storage Constraints](./implementation-schemas.md)).

```
id: entityId('task')      ✓
id: z.string().uuid()     ✗   (opaque; not self-describing)
```

## Operation IDs Are Not Entity IDs

`AppContext.traceId` stays a UUID (see [system/logging.md](./system/logging.md) and [app-context.md](./app-context.md)) — it identifies an *operation*, not a persisted entity, and is out of scope for this convention. Never apply the prefixed format to trace IDs; never use a UUID for an entity `id`.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Schemas (the `id` check).
