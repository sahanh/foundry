# CI Verification

The **spec for a Foundry repo's CI**: every Foundry rule a tool can decide on its own — an import, a
file name, a column definition — listed as a check to build, so it never costs a reviewer's attention
again. It is a spec, not a template: you build each check with whatever tools fit the project's
stack (dependency-cruiser, ESLint, ls-lint, a schema test, a diff script — the examples below are
suggestions, never requirements).

The rules themselves live in the guidelines; each entry here carries a one-line echo, a link to the
rule's owner, and the **failure condition** — the exact shape the check must reject. Everything a
tool *cannot* decide stays with the [review protocol](../review.md) and the `end-here` checklists.

---

## How it fits together

- **The adopting repo's CI** runs every applicable check below on every pull request and blocks the
  merge on a failure.
- **A manifest** in the adopting repo, `foundry-ci.md` at its root, records which rules are enforced
  and how (*The manifest* below). It is how a reviewer knows what not to re-check.
- **The [review protocol](../review.md)** reads the manifest first: an enforced rule is CI's job; a rule
  not enforced (or no manifest at all) is checked by reading the diff against its failure condition
  here. That fallback keeps a repo without CI fully covered — just at a reviewer's cost.

## Setting it up

1. **Fill in the parameters** (below) from the repo — paths, names, the stack in use. Ask the user for
   any you cannot read from the code.
2. **Decide which rules apply.** *Always* rules apply to every repo; *Per adapter* rules apply when the
   project uses that kind of adapter; *Conditional* rules apply when their condition holds. Record a
   rule that does not apply as `n/a` with the reason, never by omission.
3. **Build each check** to reject the rule's failure condition. Import rules count **type-only imports
   and re-exports** too — a type import is still a dependency.
4. **Prove each check bites.** Introduce a deliberate violation, watch the check fail, revert. A check
   that has never failed may match nothing; until it is proven, the rule is not enforced.
5. **Wire one local command** that runs every check (e.g. `pnpm verify`), so an agent runs CI's checks
   before asking for review.
6. **Write the manifest.**

## The manifest — `foundry-ci.md`

Lives at the adopting repo's root; the reviewer and every later agent read it. It holds:

- **Synced to** — the newest [CHANGELOG](../CHANGELOG.md) entry the checks reflect (date + title).
  Entries after it may name rule IDs whose checks need updating.
- **Local command** — the one command from step 5.
- **Parameters** — every value below, as set for this repo.
- **Rules** — one row per rule ID: `enforced` / `n/a` / `deferred`, where the check lives (CI job or
  config file), and how its failure was proven.
- **Project rules** — `EXT-NN` checks the project added (*Extending* below).

## Parameters

| Parameter | Default |
|---|---|
| Core source root | `packages/core/src/` — every child except `system/` is a **feature** ("feature code" below means those folders, excluding `__tests__/`) |
| Foundational primitive modules | `system/id.ts`, `system/pagination.ts`, `system/app-context.ts` |
| Table-definition module | the single file under `system/db/` holding the table definitions |
| Context factory | the function that assembles an `AppContext` (e.g. `createAppContext`) |
| Domain npm allowlist | the schema library and the ORM's query-builder entry point (never a driver subpath) |
| Auth-provider packages | the identity vendor's SDKs (e.g. `@clerk/*`) |
| Server handler files | globs for route / command / tool / consumer handlers in server apps |
| Extra feature-folder entries | none — each one added records a user-confirmed exception |
| Tenancy | single-tenant (default) or multi-tenant; if multi: tenant column name (`tenantId`), tenant-exempt tables, unscoped-escape names (e.g. `db.unscoped()`) and the files allowed to call them |
| Formatter | the project's one formatter (e.g. Prettier, Biome) |
| Lint presets switched off | each preset rule turned off, with its reason — none by default |
| Shared styling files | the files that define the visual system's tokens and cross-app primitives (web apps only) |
| Shared component folder | `apps/web/src/components/shared/` — its siblings under `components/` are feature folders (web apps only) |

---

## Always

### Baseline

The floor every package and app meets, frontend and backend alike. Usually the type checker, ESLint
with typescript-eslint, and the formatter's check mode.

- **BASE-01 — Strict type-check.** Fails when a package or app compiles with `strict` (or a flag it
  enables) turned off, or the type checker reports an error (e.g. `tsc --noEmit` per package). Rule:
  [typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline).
- **BASE-02 — Recommended lint presets.** Fails on a violation of ESLint's and typescript-eslint's
  recommended presets (the type-aware set), except rules on the *Lint presets switched off* list. Rule:
  [typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline).
- **BASE-03 — Formatted.** Fails when a file differs from the formatter's output (`prettier --check`,
  `biome format`). Rule:
  [typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline).
- **BASE-04 — No floating promises.** Fails on a promise that is neither awaited, returned, nor
  explicitly handled, or passed where a non-promise is expected (typescript-eslint:
  `no-floating-promises`, `no-misused-promises`). Rule:
  [typescript-coding-standards.md → No Floating Promises](../common/typescript-coding-standards.md#no-floating-promises).
- **BASE-05 — Framework presets.** Fails on a violation of the recommended lint preset of each
  framework an app uses — React: `react-hooks` (rules of hooks, exhaustive deps) and `jsx-a11y` —
  except rules on the *Lint presets switched off* list. `n/a` for an app whose frameworks ship none.
  Rule: [typescript-coding-standards.md → Tooling Baseline](../common/typescript-coding-standards.md#tooling-baseline).

### Repo shape

- **REPO-01 — Two top-level homes.** Fails when a top-level `src/` exists, or application source sits
  anywhere but `apps/*` and `packages/*` (repo-wide tooling config excepted). Rule:
  [code-placement.md → The Topology](../code-placement.md#the-topology).
- **REPO-02 — pnpm only.** Fails when a `package-lock.json` or `yarn.lock` exists, or the root
  `packageManager` field is not pnpm. Rule: [README.md → Conventions](../README.md#conventions).

### Import direction

Usually one dependency-graph tool (dependency-cruiser, eslint-plugin-boundaries, Nx module boundaries).

- **IMP-01 — Nothing imports an app.** Fails when any file under `packages/` imports from `apps/`.
  Rule: [code-placement.md → Layering](../code-placement.md#layering-three-roles-one-direction).
- **IMP-02 — Driven adapters never import the domain.** Fails when a file under `system/` or a
  graduated `packages/<name>/` imports feature code. Rule:
  [code-placement.md → Layering](../code-placement.md#layering-three-roles-one-direction).
- **IMP-03 — Features reach `system/` only through primitives and table definitions.** Fails when
  feature code imports any `system/` module other than the foundational primitive modules and the
  table-definition module; adapters are reached through `ctx.system.*`. Rules:
  [app-context.md → Structure](../packages/core/app-context.md#structure),
  [database.md → Table Definitions](../packages/core/system/database.md#table-definitions).
- **IMP-04 — Cross-feature crossings take the sanctioned shapes.** Fails when feature A imports from
  feature B anything other than: B's `shared/validation.ts` (any of A's code); B's `services/` (A's
  `orchestrations/` only); B's `schemas/` (A's `orchestrations/` and `schemas/` only). Rule:
  [implementation-validation.md → Cross-Feature Guards](../packages/core/implementation-validation.md#cross-feature-guards).
- **IMP-05 — The feature graph is acyclic.** Fails when the feature-to-feature dependency graph (every
  edge IMP-04 allows) has a cycle. Rule:
  [implementation-validation.md → Cross-Feature Guards](../packages/core/implementation-validation.md#cross-feature-guards).
- **IMP-06 — Services never import services.** Fails when a `*.service.ts` imports another
  `*.service.ts`; sole exception, a `<name>-collection.service.ts` importing its own
  `<name>.service.ts`. Rules:
  [orchestration.md → Services Never Call Each Other](../packages/core/orchestration.md#2-services-never-call-each-other),
  [core/start-here.md → Service naming](../packages/core/start-here.md#service-naming).
- **IMP-07 — Domain code imports only allowlisted packages.** Fails when feature code imports an npm
  package not on the domain npm allowlist. The allowlist never takes an HTTP framework, an
  auth-provider SDK, a raw database driver, or a vendor SDK — those are what the check keeps out.
  Rules: [service-first-architecture.md → Lifecycle Management](../packages/core/service-first-architecture.md#2-lifecycle-management),
  [multi-tenancy.md → Isolation](../packages/core/multi-tenancy.md#isolation-is-enforced-at-the-database-seam).
- **IMP-08 — Auth-provider SDKs stay at the edge.** Fails when an auth-provider package is imported
  outside `apps/` (a graduated, capability-named policy adapter is recorded as an exception). Rule:
  [identity-and-access.md → Authentication is an edge concern](../packages/core/identity-and-access.md#authentication-is-an-edge-concern).

### Naming and layout

Usually a file-structure linter (ls-lint, eslint-plugin-check-file).

- **NAME-01 — kebab-case.** Fails when a file or folder under the core source root is not kebab-case
  (`__tests__` excepted). Rule: [core/start-here.md → File Naming](../packages/core/start-here.md#file-naming).
- **NAME-02 — Feature folder layout.** Fails when a feature folder holds anything but `exceptions.ts`,
  `services/`, `orchestrations/`, `schemas/`, `shared/`, `__tests__/` (plus recorded extra entries); or
  a file in `services/` is not `*.service.ts`, in `orchestrations/` not `*.orchestration.ts`, in
  `schemas/` not `*.schema.ts`, in `shared/` not `validation.ts` / `utils.ts`. Sub-feature folders
  inside `services/` follow the same suffix rule. Rules:
  [core/start-here.md → Feature Structure](../packages/core/start-here.md#feature-structure),
  [code-placement.md → Folder rules](../code-placement.md#folder-rules).
- **NAME-03 — Class suffixes.** Fails when a class in a `*.service.ts` does not end in `Service`, in an
  `*.orchestration.ts` does not end in `Orchestration`, or a class exported from `exceptions.ts` does
  not end in `Exception`. Rules: [core/start-here.md → Service naming](../packages/core/start-here.md#service-naming),
  [orchestration.md → Naming](../packages/core/orchestration.md#naming).
- **NAME-04 — Test files.** Fails when a test in the core lives outside a feature's `__tests__/`, or a
  file there is not `*.unit.ts` / `*.integration.ts` (no `*.test.ts`, `*.spec.ts`). Rule:
  [testing.md → The Two Levels](../packages/core/testing.md#the-two-levels).

### TypeScript

Usually ESLint with typescript-eslint. Scope: all TypeScript in the repo.

- **TS-01 — Arrow functions at module level.** Fails on a module-level `function` declaration
  (exported or not). Rule: [typescript-coding-standards.md](../common/typescript-coding-standards.md#arrow-functions-for-top-level-definitions).
- **TS-02 — `type` over `interface`.** Fails on an `interface` declaration outside a
  declaration-merging block (`declare module` / `declare global`). Rule:
  [typescript-coding-standards.md](../common/typescript-coding-standards.md#type-over-interface).
- **TS-03 — No enums.** Fails on any `enum` or `const enum`. Rule:
  [typescript-coding-standards.md](../common/typescript-coding-standards.md#enums-vs-string-literal-unions).
- **TS-04 — No non-null assertions.** Fails on a postfix `!`. Rule:
  [typescript-coding-standards.md](../common/typescript-coding-standards.md#non-null-assertion-).
- **TS-05 — Return types on public boundaries.** Fails when an exported function, or a public method of
  an exported class, has no explicit return type. Rule:
  [typescript-coding-standards.md](../common/typescript-coding-standards.md#return-types-on-exported-functions).
- **TS-06 — No `any`.** Fails on an explicit `any`. Rule:
  [implementation-schemas.md → Schema Discipline](../packages/core/implementation-schemas.md#schema-discipline).

### Domain code

Usually ESLint (`no-restricted-syntax`, `no-restricted-imports`) or Semgrep. Scope: feature code unless
stated.

- **CODE-01 — Time only from the clock.** Fails on `new Date()` with no arguments or `Date.now()`. Rule:
  [app-context.md → The Clock](../packages/core/app-context.md#the-clock--ctxsystemclock).
- **CODE-02 — The context factory runs only at the edge and in tests.** Fails when the context factory
  is called anywhere under `packages/` outside its own definition in `system/` and `__tests__/`. Rule:
  [app-context.md → Wiring](../packages/core/app-context.md#wiring).
- **CODE-03 — No bare UUIDs as ids.** Fails on a UUID schema (`z.string().uuid()`, `z.uuid()`), a UUID
  generator call (`crypto.randomUUID()`), or a UUID-library import. Rules:
  [identifiers.md → Schema Representation](../packages/core/identifiers.md#schema-representation),
  [identifiers.md → Generated in the Domain](../packages/core/identifiers.md#generated-in-the-domain-not-the-database).
- **CODE-04 — Timestamps never hand-stamped.** Fails when the object passed to a database insert or
  update (Drizzle: `.values(…)` / `.set(…)`) has a literal `createdAt`, `updatedAt` or `deletedAt` key —
  those come only from the `ctx.system.helpers` stampers. Rule:
  [app-context.md → Persistence timestamps](../packages/core/app-context.md#persistence-timestamps).
- **CODE-05 — The context is never written.** Fails on an assignment to a property of `ctx` (or any
  `AppContext`-typed value) in `packages/`, outside the context factory in `system/`. Rule:
  [app-context.md → Actor & Tenant](../packages/core/app-context.md#actor--tenant--ctxactor--ctxtenant).
- **CODE-06 — The `AppContext` type states its guarantees.** Fails when the `AppContext` type lets
  `actor` be absent or `undefined`, or leaves `traceId`, `actor` or `tenant` writable (not `readonly`).
  Usually a type-level test. Rule:
  [app-context.md → Actor & Tenant](../packages/core/app-context.md#actor--tenant--ctxactor--ctxtenant).
- **CODE-07 — Services and orchestrations take `AppContext` by constructor.** Fails when a class in a
  `*.service.ts` or `*.orchestration.ts` has no constructor parameter typed `AppContext`. Rule:
  [app-context.md → Constructor Injection](../packages/core/app-context.md#constructor-injection).
- **CODE-08 — No self-instantiation or module state.** Fails, in `*.service.ts` / `*.orchestration.ts`,
  on a static member holding or returning an instance of its own class (`getInstance()`,
  `static instance`), or a module-level `let`/`var` or `new` expression. Rule:
  [service-first-architecture.md → Lifecycle Management](../packages/core/service-first-architecture.md#2-lifecycle-management).
- **CODE-09 — Structured logs only.** Fails when a `ctx.system.logger.<level>(…)` call passes no fields
  object after the message, or on any `console.*` call under `packages/core/`. Rule:
  [logging.md → Anti-Patterns](../packages/core/system/logging.md#anti-patterns).
- **CODE-10 — Tests control time through the clock.** Fails, in test files, on a test runner's fake
  system time (`vi.setSystemTime`, `vi.useFakeTimers`, `jest.useFakeTimers`). Rule:
  [app-context.md → The Clock](../packages/core/app-context.md#the-clock--ctxsystemclock).

### Edge and tests

- **APP-01 — No per-handler error handling.** Fails on a `try` statement in a server handler file;
  failures propagate to the one shared error handler. Rule:
  [transport-mapping.md → Mapping outcomes](../apps/transport-mapping.md#mapping-outcomes-to-a-response-http).
- **TEST-01 — Every domain unit has a test.** Fails when a `*.service.ts`, `*.orchestration.ts` or
  `shared/validation.ts` is not imported directly by any test file (`*.unit.ts` or `*.integration.ts`).
  Which level, or which combination, is the test strategy's call, never CI's. Pure helpers
  (`shared/utils.ts`) are left to the test strategy and review, since many are trivial. Rule:
  [testing.md](../packages/core/testing.md#the-test-strategy).

---

## Per adapter

These rules are stated against the **storage contract**, not a vendor. Each carries the reading for
Drizzle + Postgres, the stack the guidelines use as their example; for another stack, build the
equivalent check against its schema definitions or migration snapshots, or record `n/a` with the
reason when the store has no such concept.

### Database

Usually a schema-contract test that walks the table definitions (Drizzle: `getTableColumns`) or the
generated migration snapshot, plus a diff script for migrations.

- **DB-01 — Primary keys hold the prefixed id.** Fails when a primary-key column is not a
  fixed-length string, or has a database default. Drizzle + Postgres: `varchar` with `length`; no
  `defaultRandom()`, `uuid()`, `serial()`, identity, or `$defaultFn`. Rules:
  [database.md → Table Definitions](../packages/core/system/database.md#table-definitions),
  [identifiers.md → Stored Whole](../packages/core/identifiers.md#stored-whole).
- **DB-02 — The clock stamps time, not the database.** Fails when any timestamp column has a database
  default, when `createdAt` / `updatedAt` are nullable, or when `deletedAt` is `NOT NULL`. Drizzle +
  Postgres: no `defaultNow()`, `default(sql…)` or `$defaultFn` on a `timestamp`. Rule:
  [database.md → Table Definitions](../packages/core/system/database.md#table-definitions).
- **DB-03 — No database-native enums.** Fails on a database enum type. Drizzle + Postgres: any
  `pgEnum`. Rule: [database.md → Table Definitions](../packages/core/system/database.md#table-definitions).
- **DB-04 — Migrations are append-only.** Fails when a pull request modifies or deletes an existing
  migration file (e.g. `git diff --diff-filter=MD <base> -- <migrations dir>` is non-empty). Rule:
  [database.md → Migrations](../packages/core/system/database.md#migrations).
- **DB-05 — Schema and migrations move together.** Fails when regenerating migrations from the table
  definitions produces a change. Drizzle: `drizzle-kit generate` then `git diff --exit-code` on the
  migrations dir (or `drizzle-kit check`). Rule:
  [database.md → Migrations](../packages/core/system/database.md#migrations).
- **DB-06 — Migrations run in the pipeline, never at boot.** Fails when application runtime code
  imports or invokes the migration runner (Drizzle: a `*/migrator` import under `apps/*/src` or
  `packages/*/src`), or a CI/deploy pipeline runs a schema push (`drizzle-kit push`). Rule:
  [database.md → Migrations](../packages/core/system/database.md#migrations).

---

## Conditional

### Multi-tenant apps

Skip (`n/a — single-tenant`) unless the app is multi-tenant.

- **TEN-01 — Every tenant-owned table carries the tenant column.** Fails when a table not on the
  tenant-exempt list lacks the tenant column under its uniform name, or that column is nullable, has
  a database default or trigger, or is not a foreign key to the tenant table. Rules:
  [database.md → Table Definitions](../packages/core/system/database.md#table-definitions),
  [multi-tenancy.md → Isolation](../packages/core/multi-tenancy.md#isolation-is-enforced-at-the-database-seam).
- **TEN-02 — Feature code never touches the tenant column.** Fails when feature code references the
  tenant column of a table definition (in a filter, join or select) or writes a literal tenant-column
  key into an insert or update. Rule:
  [multi-tenancy.md → Isolation](../packages/core/multi-tenancy.md#isolation-is-enforced-at-the-database-seam).
- **TEN-03 — The unscoped escape is called only where sanctioned.** Fails when an unscoped-escape
  name is called outside the files allowed to call it. Rule:
  [multi-tenancy.md → The one unscoped path](../packages/core/multi-tenancy.md#the-one-unscoped-path).

### Web apps

Skip unless `apps/web` (or another client UI app) exists. The style checks (`WEB-01`, `WEB-02`) run in
the style linter and depend on the styling system — usually Stylelint plus the styling system's lint
plugin; `WEB-03` runs in the same dependency-graph tool as the import rules.

- **WEB-01 — No raw colors.** Fails on a literal color outside the shared styling files: hex, `rgb()`,
  `hsl()` or a named CSS color in styles, or an arbitrary color value in a utility class (Tailwind:
  `bg-[#…]`). Rule:
  [visual-system.md → Semantic tokens over raw values](../apps/web/visual-system.md#semantic-tokens-over-raw-values).
- **WEB-02 — Scrollbars come from the shared default.** Fails on scrollbar styling outside the shared
  styling files: a `::-webkit-scrollbar*` selector, a `scrollbar-width` / `scrollbar-color` /
  `scrollbar-gutter` declaration, or a utility class or arbitrary variant producing one (Tailwind:
  `[&::-webkit-scrollbar]:…`, a scrollbar plugin's classes). Rule:
  [visual-system.md → Enforcement](../apps/web/visual-system.md#enforcement).
- **WEB-03 — Shared components never reach back into a feature.** Fails when a file in the shared
  component folder imports from any feature component folder. Rule:
  [component-placement.md → Ownership after promotion](../apps/web/component-placement.md#ownership-after-promotion).

---

## Extending

The catalogue above is the floor. A project grows deterministic invariants of its own — an adapter
with a rule its vendor imposes, a second datastore, a styling system, a convention the user set.
**Whenever a change introduces one, the change also adds its check:**

1. Build the check and prove it fails on a violation.
2. Record it in the manifest as `EXT-NN`, linking the rule it enforces — a Foundry doc, or the
   project's own.
3. If the invariant is a Foundry rule this catalogue lacks, raise it as a gap ([README → When in
   doubt](../README.md#when-in-doubt)).

The same goes for picking an adapter: the *Per adapter* rules are written for the adapter's role, so
choosing or swapping one (a different ORM, a different store) means re-reading those rules and
rebuilding their checks for it.

**Keeping current.** When a [CHANGELOG](../CHANGELOG.md) entry newer than the manifest's *Synced to*
names a rule ID, update that check, then move *Synced to* forward.
