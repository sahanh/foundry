# Schema Management (Typed Languages)

Strategy for managing schemas and types in typed languages like TypeScript. Schemas serve as the single source of truth for both validation and type inference.

## Core Principle

**Define once, derive everywhere.** Schemas define the shape of data. Types are inferred from schemas, not maintained separately. This eliminates drift between what's validated and what's typed.

---

## Dual Purpose of Schemas

Schemas serve two roles:

1. **Runtime validation** — Validate inputs at service boundaries
2. **Static typing** — Infer TypeScript types for compile-time safety

Using schema libraries (e.g., Zod, Yup, io-ts), you define the schema once and derive the type:

```typescript
// Schema definition
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

// Type inference — not manually defined
type User = z.infer<typeof UserSchema>;
```

---

## Schema Organization

### Separate Schema Files

Schemas live in dedicated files, not inline within service methods. This enables:

- Reuse across multiple services
- Clear visibility of data contracts
- Easier maintenance when requirements change

### Structure
Schema files are created based on the entities used within a feature. In below example note now order and orderNotes have 2 schema files.
```
/features
  /users
    user.schema.ts
    user.service.ts
  /orders
    order.schema.ts
    orderNotes.schema.ts
    order.service.ts
    orderNotes.service.ts
```

---
## Standard Types to Define
Usually every entity would have types created through schemas for following.
1. The shape of the entitiy, usually what's stored in database.
2. A type to represent input, common in crud context.
3. A type to represent output shape.


## Avoiding Schema Duplication

When services have multiple methods with overlapping data shapes, avoid defining redundant schemas.

### Use Utility Types

Leverage schema library utilities and TypeScript's built-in utility types:

| Utility | Purpose |
|---------|---------|
| `.pick()` | Select subset of fields |
| `.omit()` | Exclude specific fields |
| `.partial()` | Make all fields optional |
| `.extend()` | Add fields to existing schema |
| `.merge()` | Combine two schemas |

### Example: Base Schema with Variations

```typescript
// Base entity schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input for creation — no id, no timestamps
const CreateUserInput = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Input for update — partial, no id
const UpdateUserInput = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial();

// Response — full entity
type UserResponse = z.infer<typeof UserSchema>;
```

### Composition Over Duplication

When multiple entities share common fields, extract them:

```typescript
// Shared timestamp fields
const TimestampFields = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Compose into entity schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
}).merge(TimestampFields);

const OrderSchema = z.object({
  id: z.string().uuid(),
  total: z.number(),
}).merge(TimestampFields);
```

---

## Schema Discipline

### Avoid Overusing `optional`

Optional fields should reflect genuine optionality in the domain, not laziness in schema design.

**Ask:** Is this field truly optional, or is it required in this context?

```typescript
// Bad — everything optional for convenience
const UserInput = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
});

// Good — clear about what's required
const CreateUserInput = z.object({
  email: z.string().email(),  // Required for creation
  name: z.string().min(1),    // Required for creation
});

const UpdateUserInput = z.object({
  email: z.string().email(),  // Optional for update
  name: z.string().min(1),
}).partial();                  // Explicitly partial for updates
```

### Never Use `any`

The `any` type defeats the purpose of typed schemas. If the shape is truly dynamic, use:

- `z.unknown()` with runtime narrowing
- `z.record()` for key-value structures
- Explicit union types for known variants

```typescript
// Bad
const Config = z.object({
  settings: z.any(),
});

// Good — explicit about structure
const Config = z.object({
  settings: z.record(z.string(), z.unknown()),
});
```

### Explicit Over Implicit

When schema intent isn't obvious, be explicit:

```typescript
// Unclear — why is this a string?
const OrderSchema = z.object({
  status: z.string(),
});

// Clear — enumerated values
const OrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
});
```

---

## Service Method Contracts

Every service method should have clear input and output schemas:

```typescript
class OrderService {
  constructor(private order: Order) {}

  // Input and output types derived from schemas
  applyDiscount(input: ApplyDiscountInput): DiscountResult {
    const validated = ApplyDiscountSchema.parse(input);
    // ... business logic
  }
}
```

When adding new methods:
1. Check if existing schemas can be reused or extended
2. Use utilities (pick, omit, partial) before creating new schemas
3. Document any new schemas in the appropriate schema file

---

## Anti-Patterns to Avoid

- **Inline schemas** — Defining schemas inside service methods
- **Duplicate definitions** — Same shape defined in multiple places
- **Manual type maintenance** — Separate type definitions that drift from schemas
- **Loose typing** — Overuse of optional, any, or unknown without narrowing
- **Missing validation** — Types without runtime validation at boundaries
