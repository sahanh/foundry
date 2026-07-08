# TypeScript Coding Standards

Conventions for all TypeScript in this codebase — new code and changes to existing files.

## Arrow Functions for Top-Level Definitions

Use arrow function expressions for module-level definitions (helpers, exported functions, React-style callbacks), not function declarations.

```typescript
// Good
const functionName = () => { /* ... */ };

// Avoid
function functionName() { /* ... */ }
```

**Exceptions — leave as-is:** class methods; Convex `mutation` / `query` / `action` handlers.

## `type` Over `interface`

Prefer `type` aliases to `interface` for object shapes.

```typescript
// Good
export type Foo = {
  id: string;
  name: string;
};

// Avoid
export interface Foo {
  id: string;
  name: string;
}
```

Reach for `interface` only for declaration merging — rare here.

## Enums vs String Literal Unions

**This doc is the single owner of this rule** (other docs carry one-line echoes). Prefer string literal unions over TypeScript enums for enumerated values.

```typescript
// Good
type Status = 'pending' | 'confirmed' | 'shipped' | 'delivered';

// Avoid
enum Status {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
  Delivered = 'delivered',
}
```

Enums are a runtime construct with edge cases (reverse mapping, `const enum` across module boundaries); a string literal union compiles away, reads directly, and composes with `z.enum()` in schemas ([implementation-schemas.md](../packages/core/implementation-schemas.md) → Explicit Over Implicit).

## Non-Null Assertion (`!`)

Never use the non-null assertion operator. It silences the compiler without runtime narrowing — an actually-null value then errors later, far from the cause.

```typescript
// Avoid
const name = user!.name;

// Good — narrow explicitly
if (!user) throw new Error('...');
const name = user.name;
```

Reaching for `!` means the type is wrong upstream or a guard is missing — fix the root cause.

## Return Types on Exported Functions

Annotate return types on exported functions and service methods — public boundaries state their contract as a checked assertion, not a side effect of the implementation; inference is fine for internal helpers.

```typescript
// Good — contract is visible at the definition
export const formatDate = (date: Date): string => { /* ... */ };

// Avoid — callers rely on inference
export const formatDate = (date: Date) => { /* ... */ };
```

## Schema and Zod Conventions

Inferring types from schemas, schema composition, and avoiding `any` are owned by [implementation-schemas.md](../packages/core/implementation-schemas.md).

---

**Verify:** the TypeScript sweep in the [review protocol](../review.md) (Step 4) covers this.
