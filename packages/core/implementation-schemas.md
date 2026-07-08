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

- Schemas live in dedicated per-entity `*.schema.ts` files inside the feature folder (e.g. `orders/order.schema.ts` **and** `orders/orderNotes.schema.ts`), never inline in service methods — for reuse, visible contracts, and easier change.
- Standard types per entity: the stored entity shape, an input type (create/update), and an output type.

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
