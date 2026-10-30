# End Here — `plugins/`

Verify companion to [start-here.md](./start-here.md), for a **plugin** — code that ships to another
platform and runs there (a Zapier app, a WordPress plugin). A box you cannot tick is a blocker. The
boxes apply to a plugin in any language.

Deterministic rules (the import wall, the README existing) are CI checks,
not boxes — [setup/ci-verification.md → Plugins](../setup/ci-verification.md#plugins); without CI for
them, [review.md](../review.md) Step 0 checks them.

---

## Placement → [start-here.md](./start-here.md#placement--one-folder-per-platform)
- [ ] The vendor's platform runs it, and it lives at `plugins/<platform>/`, one folder per platform — [code-placement.md](../code-placement.md#the-topology), [start-here.md](./start-here.md#placement--one-folder-per-platform)
- [ ] Holds only the code that ships to the platform — callback endpoints (webhooks, REST hooks, OAuth callback) are `apps/api/` routes; pushes to the vendor are a driven adapter — [code-placement.md](../code-placement.md#worked-examples)

## README map → [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)
- [ ] The README names, by path, every part of the integration outside the folder, and how the plugin is built, tested and released (or links the runbook) — [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)
- [ ] A change that adds, moves or removes one of those parts — in this folder or elsewhere — updates the README in the same change — [start-here.md](./start-here.md#the-readme-maps-the-whole-integration)

## Through the published API only → [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)
- [ ] Every call goes to a route of the published API in `apps/api` — none to an internal route, the database, a queue or another service — [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)
- [ ] Each call's method, path, inputs and the response it reads match the `apps/api` route it calls, checked against that route's code — [start-here.md](./start-here.md#it-reaches-the-system-only-through-the-published-api)

## No business rules → [start-here.md](./start-here.md#it-holds-no-business-rules)
- [ ] Each trigger, action or hook maps the platform's input to an API call and the response to the platform's output, and decides nothing else — [start-here.md](./start-here.md#it-holds-no-business-rules)
- [ ] Any rule mirrored for the platform's UI has its owner in the core; none exists only here — [code-placement.md](../code-placement.md#worked-examples)

## Authentication → [start-here.md](./start-here.md#it-authenticates-as-the-customer)
- [ ] Calls carry a credential the API issued to the customer's account, through the platform's auth flow; no secret ships in the plugin — [start-here.md](./start-here.md#it-authenticates-as-the-customer)
- [ ] No credential reaches the system around the API's authorization — [identity-and-access.md](../packages/core/identity-and-access.md#authorization-is-a-domain-concern)

---

Layout, scripts, tests, CI beyond the rules above, and release are the project's call — not boxes
([start-here.md](./start-here.md#toolchain-ci-and-release-are-the-projects)).
