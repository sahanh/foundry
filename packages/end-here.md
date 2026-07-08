# End Here — `packages/`

The verify companion to [start-here.md](./start-here.md), for a **graduated driven adapter** (`packages/<name>/`). Authoritative rules: [code-placement.md](../code-placement.md) → *Building a driven adapter* and *Graduation*. A box you cannot tick is a blocker.

---

## The package earned its place → [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)
- [ ] Graduated on a real signal — reuse beyond the core, own lifecycle, or genuine engine — not anticipation — [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)
- [ ] Graduation moved delivery mechanics only — domain rules (e.g. "assignment *should* notify") stay in a core service — [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)

## It follows the driven-adapter standard → [code-placement.md](../code-placement.md#building-a-driven-adapter)
- [ ] All [system/end-here.md → Any driven adapter](./core/system/end-here.md) boxes still tick here (same standard governs a graduated package)
- [ ] Vendor SDK lives in *this* package's `package.json`, not the core's — [code-placement.md](../code-placement.md#building-a-driven-adapter)

## Dependency direction → [code-placement.md](../code-placement.md)
- [ ] `core` depends on this package as a driven port; the package never depends on `core`'s domain — [code-placement.md](../code-placement.md#layering-three-roles-one-direction)
- [ ] Non-domain consumers (e.g. an app) use it directly, not through a domain service — [code-placement.md](../code-placement.md)

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
