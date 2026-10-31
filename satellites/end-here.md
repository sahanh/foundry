# End Here — `satellites/`

Verify companion to [start-here.md](./start-here.md), for a **satellite** — an independent codebase
that reaches the system only through its published API (a Zapier app, a WordPress plugin, a codebase
you deploy on its own). A box you cannot tick is a blocker. The boxes apply to a satellite in any
language.

Deterministic rules (the import wall, the README existing) are CI checks, not boxes —
[setup/ci-verification.md → Satellites](../setup/ci-verification.md#satellites); without CI for them,
[review.md](../review.md) Step 0 checks them.

---

## Placement → [start-here.md](./start-here.md#placement--one-folder-per-satellite)
- [ ] Its own codebase, reaching the system only over the published API, at `satellites/<name>/`, one folder per satellite — [code-placement.md](../code-placement.md#the-topology), [start-here.md](./start-here.md#placement--one-folder-per-satellite)
- [ ] Holds only the satellite's own codebase — callback endpoints (webhooks, REST hooks, OAuth callback) are `apps/api/` routes; pushes to the vendor are a driven adapter — [code-placement.md](../code-placement.md#worked-examples)
- [ ] A new satellite is listed in the CI manifest's *Satellites* parameter — [start-here.md](./start-here.md#adding-a-satellite)

## README map → [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)
- [ ] The README names, by path, every part of the product outside the folder that the satellite relies on or that relies on it, and how it is built, tested and released (or links the runbook) — [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)
- [ ] A change that adds, moves or removes one of those parts — in this folder or elsewhere — updates the README in the same change — [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)

## Through the published API only → [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)
- [ ] Every call goes to a route of the published API in `apps/api` — none to an internal route, the database, a queue or another service — [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)
- [ ] Each call's method, path, inputs and the response it reads match the `apps/api` route it calls, checked against that route's code — [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)
- [ ] Repo tooling reaches it only by running its commands or reading its build output, never by importing its source — [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)

## No business rules → [start-here.md](./start-here.md#it-holds-no-business-rules)
- [ ] Each trigger, action, hook or form maps its input to an API call and the response to its own output, and decides nothing else — [start-here.md](./start-here.md#it-holds-no-business-rules)
- [ ] Any rule mirrored for its UI has its owner in the core; none exists only here — [code-placement.md](../code-placement.md#worked-examples)

## Credentials → [start-here.md](./start-here.md#it-carries-only-credentials-the-api-issued)
- [ ] Where a route needs a credential, the call carries one the API issued to the customer's account, through the platform's auth flow; no secret ships in the satellite — [start-here.md](./start-here.md#it-carries-only-credentials-the-api-issued)
- [ ] No credential reaches the system around the API's authorization — [identity-and-access.md](../packages/core/identity-and-access.md#authorization-is-a-domain-concern)

---

Layout, scripts, tests, CI beyond the rules above, and release are the project's call — not boxes
([start-here.md](./start-here.md#toolchain-ci-and-release-are-the-projects)).
