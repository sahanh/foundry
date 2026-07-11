# Schema Management (Typed Languages)

Managing schemas and types in typed languages (TypeScript with a schema library such as Zod). The schema is the single source of truth for both validation and typing.

## Core Principle

**Define once, derive everywhere** — this doc owns that rule. Schemas serve two roles: runtime validation at service boundaries and static typing via inference. Types are inferred from schemas (`z.infer`), never maintained separately — separate hand-written types drift.

## Canonical Example

```typescript
// Base entity schema — the shape stored in the database
const UserSchema = z.object({
  id: entityId('user'),              // prefixed id helper, never a bare UUID — see identifiers.md
  email: z.string().email(),
  name: z.string().min(1).max(255),  // mirrors varchar(255) — see Mirror Storage Constraints
  createdAt: z.date(),
  updatedAt: z.date(),
});

type User = z.infer<typeof UserSchema>;   // inferred, not hand-written

// Variants derived with utilities, not redefined
const CreateUserInput = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });
const UpdateUserInput = CreateUserInput.partial();   // explicitly partial for updates
type UserResponse = z.infer<typeof UserSchema>;      // full entity as output
```

Full `entityId('…')` convention: [identifiers.md](./identifiers.md).

## Schema Organization

- **What this governs: boundary/contract types** — the persisted-entity shape and its projections, and any type exported across a module boundary (a read-side/presentation shape counts). These live in the feature's dedicated `*.schema.ts` file(s) (e.g. `orders/order.schema.ts` **and** `orders/orderNotes.schema.ts`), **never inline in a service, orchestration, mapper, or any other non-schema module** — for reuse, visible contracts, and easier change. A *local implementation-only* type — a function's options bag, an internal intermediate — may stay inline; it is not a boundary type ([No types without validation](#schema-discipline)). **Sole exception:** an exported output DTO sealed by a module-private brand symbol stays with its only constructor — relocating it would break the single-constructor guarantee.
- Standard types per entity: the stored entity shape, an input type (create/update), an output type, and any **presentation/read-side** shape a read edge serializes. The presentation shape lives in the same schema place and is **derived** from the base where they overlap (`.pick()/.partial()/.omit()`, see [Avoiding Duplication](#avoiding-duplication)), never a hand-written twin.
- **Schema files graduate with the feature.** Start with one schema file (often mirroring the table); split into additional dedicated files — e.g. a presentation schema file — only on a real signal, exactly as a service graduates `{Entity}Service` → `{Entity}CollectionService` as logic grows ([service-first-architecture.md](./service-first-architecture.md#granularity-scales-with-scope), [logic-placement.md](./logic-placement.md)). The invariant is *one dedicated place, never inline* — not "one file forever."

## Avoiding Duplication

Before writing a new schema, derive overlapping shapes from the base with utilities (shared fields like a `TimestampFields` object compose in via `.merge()`):

| Utility | Purpose |
|---------|---------|
| `.pick()` | Select subset of fields |
| `.omit()` | Exclude specific fields |
| `.partial()` | Make all fields optional |
| `.extend()` | Add fields to existing schema |
| `.merge()` | Combine two schemas |

## Schema Discipline

- **Optionality is domain truth, not convenience.** A field is required unless genuinely optional in that context; create inputs state required fields, update inputs are made `.partial()` explicitly — never blanket `.optional()` for convenience.
- **Never `any`.** For genuinely dynamic shapes use `z.unknown()` with runtime narrowing, `z.record()` for key-value structures, or an explicit union of known variants. Overuse of optional/any/unknown without narrowing is loose typing and defeats the schema.
- **No types without validation** — a boundary type must be backed by a runtime-parsed schema.

### Mirror Storage Constraints

This doc owns this rule. Zod field constraints must match or be stricter than the corresponding DB column constraints — **the schema is the enforcer; the database must never be the first thing that rejects input.** Every string field backed by a sized column encodes the limit (`title varchar(255)` → `z.string().min(1).max(255)`); a bare `z.string()` on such a field is a violation. **Default when requirements state no limit: the DB column limit *is* the limit — encode it.**

Content rules (e.g. no embedded links, no HTML) are input-shape rules, not business rules: implement them as `.refine()` validators on the schema field — e.g. `z.string().max(1000).refine(v => !/<a\s|https?:\/\//i.test(v), { message: 'Links are not allowed' })` — not in `shared/validation.ts`. This validation tier sits between raw type-checking and business rules.

### Explicit Over Implicit

Enumerated values use `z.enum(['pending', 'confirmed', …])`, never a bare `z.string()`. At the type level, prefer string-literal unions over TypeScript `enum` — rule owned by [typescript-coding-standards.md](../../common/typescript-coding-standards.md).

## Service Method Contracts

Every service method has schema-derived input and output types and parses its input (`Schema.parse(input)`) before business logic. When adding a method: reuse or extend existing schemas first (pick/omit/partial before a new definition), and keep any new schema in the entity's schema file.

---

**Verify:** when done, check [end-here.md](./end-here.md) → Schemas.
