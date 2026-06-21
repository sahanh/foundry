# TypeScript Coding Standards

Conventions for writing TypeScript in this codebase. These apply to new code and to changes in existing files.

## Arrow Functions for Top-Level Definitions

Use arrow function expressions for module-level definitions, not function declarations.

```typescript
// Good
const functionName = () => { /* ... */ };

// Avoid
function functionName() { /* ... */ }
```

**Applies to:**

- Module-level helpers
- Exported functions
- React-style callbacks

**Exceptions — leave as-is:**

- Class methods
- Convex `mutation` / `query` / `action` handlers

## `type` Over `interface`

Prefer `type` aliases to `interface` declarations for object shapes.

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

Only reach for `interface` when you specifically need declaration merging — which should be rare here.

## Enums vs String Literal Unions

Prefer string literal unions over TypeScript enums for enumerated values.

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

TypeScript enums introduce a runtime construct and have subtle edge cases (reverse mapping, `const enum` across module boundaries). A string literal union is a pure type — it compiles away, is immediately readable, and composes naturally with `z.enum()` in schemas (see implementation-schemas.md).

## Non-Null Assertion (`!`)

Do not use the non-null assertion operator. It silences the compiler without narrowing the type at runtime — if the value is actually null or undefined, the error surfaces later and further from the cause.

```typescript
// Avoid
const name = user!.name;

// Good — narrow explicitly
if (!user) throw new Error('...');
const name = user.name;
```

If you find yourself reaching for `!`, it usually means the type is wrong upstream or a guard is missing. Fix the root cause.

## Return Types on Exported Functions

Annotate return types explicitly on exported functions and service methods. Inference is fine for internal helpers, but public boundaries should state their contract.

```typescript
// Good — contract is visible at the definition
export const formatDate = (date: Date): string => { /* ... */ };

// Avoid — return type is implicit; callers rely on inference
export const formatDate = (date: Date) => { /* ... */ };
```

This makes the intended output type a checked assertion rather than a side effect of the implementation.

## Schema and Zod Conventions

Type definitions and Zod-specific conventions (inferring types from schemas, schema composition, avoiding `any`) are covered in [implementation-schemas.md](./implementation-schemas.md).
