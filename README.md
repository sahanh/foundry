# Engineering Playbook

This is the engineering standard for this project. It is not a reference to consult occasionally — it is the specification to follow when building any part of the codebase. If you are new to the project, read it before writing code.

The playbook is organised into two concerns:

- **[architecture/](./architecture/start-here.md)** — how to structure and build features: services, orchestrations, validation, schemas, testing, and the rules that govern the domain layer. Start here.
- **[system/](./system/start-here.md)** — the infrastructure layer that the domain sits on top of: database, email, queue, and other adapters.

When implementation is complete, run **[checklist.md](./checklist.md)** before considering the work done. It is mandatory — not a suggestion.

Renamed or removed concepts are recorded in **[CHANGELOG.md](./CHANGELOG.md)** — if something you expected is gone, look there for what replaced it and how to migrate.

## Conventions

- **Package manager:** use `pnpm`. Do not use `npm` or `yarn`.

## When in doubt

The playbook is the answer. If the playbook does not cover a case, raise it — the gap should be documented, not silently decided.
