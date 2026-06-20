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
