# Working with Databases

How the service layer interacts with the database. Infrastructure specifics (table definitions, migrations) are covered in [system/database.md](../system/database.md).

## Core Principle

**Services are the database seam.** There is no repository layer between a service and the database. A service calls the database directly via `ctx.system.db`, and it is the only entry point for data operations on its entity. The Drizzle client reaches the service through AppContext — see [app-context.md](./app-context.md).

A service always uses `ctx.system.db` without knowing whether a transaction is open. When a use case spans multiple writes, they go through a single atomic boundary owned by the outermost caller — `ctx.system.db` then resolves to that transaction. See [atomicity.md](./atomicity.md).

## Feature Ownership

Each table belongs to exactly one feature — a feature can own multiple tables, but a table cannot belong to more than one feature. The services within that feature are the only code that reads from or writes to those tables. This boundary is how business rules stay co-located with the data they govern — bypassing the service to access its tables skips validation, constraint checks, and domain logic.

## Cross-Feature Data Access

If feature A needs data owned by feature B, it goes through feature B's service. Direct database access across feature boundaries is not allowed.

This mirrors the rule that services within a feature coordinate through workflows — cross-feature data access follows the same principle: go through the owning service, not around it.

## Anti-Patterns

- **Repository wrapping the database client** — a class that proxies database calls without adding domain logic. The service already provides this abstraction.
- **Cross-feature table access** — a service querying or writing to a table owned by a different feature, bypassing that feature's service and its business rules.
- **Business logic in query construction** — complex conditionals embedded in a database call that should live in the service method or a named decision helper instead.
