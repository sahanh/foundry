# App Shell & Container

The authenticated layout is a **shared application boundary**, not something each section recreates. App-level layout decisions have **one home** — the shell and container — the same way the backend gives every piece of code exactly one home.

Composition is the default:

```tsx
<AppShell>
  <Container>
    <PageContent />
  </Container>
</AppShell>
```

## What the shell owns

- **Global navigation, auth controls, and page landmarks** — centralized in the authenticated shell.
- **Sidebar behavior**, including expanded and icon-only modes — shell behavior, not a per-page concern.
- **Page width and horizontal padding** — the shared container. Feature pages compose *inside* it; they do not define new width or padding systems.

## Features stay layout-agnostic

Feature components compose inside the current page structure rather than owning app-level layout. A feature reaching outside its container is a signal to improve the shared primitive, not to special-case the feature.

## Extend the shared layer before forking it

- If a new section seems to need a different shell or container, **first improve the shared layout primitives** so the whole app benefits.
- Add a **new** layout primitive only when the existing shared components genuinely cannot represent the need — the frontend reading of *climb on a real signal, not in anticipation*.

## Enforcement

Before introducing a page-level wrapper, max-width rule, sidebar, header, or navigation model, check whether it belongs in the shared shell/container layer. Prefer extending that layer over creating a local variant. A second variant of an app-level layout primitive is a **confirm-with-the-user** decision, not a local call.
