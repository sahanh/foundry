# System — Start Here

The `system/` folder holds the infrastructure adapters for the application. An infrastructure adapter is code that connects the application to an external system — a database, an email provider, a job queue. Each adapter lives in its own subfolder and exposes a clean interface that the domain layer calls without knowing the underlying technology.

This folder is the counterpart to `architecture/` — where architecture covers the domain layer (services, workflows, validation), system covers the infrastructure layer those services sit on top of.

## What Lives Here

Each subfolder is one adapter:

```
system/
  db/       - database (see database.md)
  logger/   - logging — required (see logging.md)
```

**Required adapters** must be implemented before any feature work begins:
- `logger/` — logging is mandatory in every application. See logging.md.

Additional adapters are added as the application needs them — one subfolder per capability. The subfolder name should describe the capability, not the vendor (`email/` not `sendgrid/`, `queue/` not `bullmq/`).

## The Relationship Rule

The domain layer calls into adapters. Adapters never import from the domain layer.

An adapter's job is to translate between the domain's needs and the external system's API. The domain stays unaware of which technology is underneath — it calls the adapter's interface, and the adapter handles the rest. This keeps the domain portable and the infrastructure replaceable.

## What Each Adapter Should Expose

- A focused interface that expresses what the domain needs, not a thin wrapper around the external library's full API.
- No business logic. An adapter that makes decisions about domain rules has crossed into the wrong layer.

## Docs in This Folder

- [database.md](./database.md) — table definitions, Drizzle conventions, and migration standards
- [logging.md](./logging.md) — trace ID, log levels, structured logging, and what to log
