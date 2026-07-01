# End Here — `packages/`

The verify companion to [start-here.md](./start-here.md), for a **graduated driven adapter** — a `system/` adapter that outgrew the core and earned its own top-level `packages/<name>/`. `start-here` is where you begin; this is where you confirm the package still follows the driven-adapter standard without reaching back into the core.

> `packages/start-here.md` is still a stub, so the authoritative rules live in [code-placement.md](../code-placement.md) → "Building a driven adapter" and "Graduation". These checks distil them.

You usually arrive here routed by the root review protocol when it maps a touch under a graduated `packages/<name>/`. A box you cannot tick is a blocker.

---

## The package earned its place → [code-placement.md](../code-placement.md)
- [ ] Did it graduate on a **real signal** — reused beyond the core, heavy enough to own its lifecycle, or a genuine engine — not in anticipation?
- [ ] Does the graduation move **delivery mechanics only**? A domain rule ("assignment *should* notify the assignee") stays in a core service — it must not have leaked into the package.

## It follows the driven-adapter standard → [code-placement.md](../code-placement.md)
- [ ] Named by **capability, not vendor**?
- [ ] Exposes a **focused interface**, not a passthrough of the library's full API?
- [ ] **No business logic** inside?
- [ ] The vendor SDK moved to *this* package's `package.json` (out of the core)?

## Dependency direction → [code-placement.md](../code-placement.md)
- [ ] `core` depends on this package as a driven port; this package **never depends on `core`'s domain**?
- [ ] Any non-domain consumer (e.g. an app) that uses it directly does so without going through a domain service?

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
