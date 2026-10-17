# End Here — `packages/`

The verify companion to [start-here.md](./start-here.md), for a **graduated driven adapter** (`packages/<name>/`). Authoritative rules: [code-placement.md](../code-placement.md) → *Building a driven adapter* and *Graduation*. A box you cannot tick is a blocker.

Import direction is a CI check, not a box — [setup/ci-verification.md](../setup/ci-verification.md); without CI for it, [review.md](../review.md) Step 0 checks it.

---

## The package earned its place → [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)
- [ ] Graduated on a real signal — reuse beyond the core, own lifecycle, or genuine engine — not anticipation — [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)
- [ ] Graduation moved delivery mechanics only — domain rules (e.g. "assignment *should* notify") stay in a core service — [code-placement.md](../code-placement.md#graduation-when-a-driven-adapter-leaves-system)

## It follows the driven-adapter standard → [code-placement.md](../code-placement.md#building-a-driven-adapter)
- [ ] All [system/end-here.md → Any driven adapter](./core/system/end-here.md) boxes still tick here (same standard governs a graduated package)
- [ ] Vendor SDK lives in *this* package's `package.json`, not the core's — [code-placement.md](../code-placement.md#building-a-driven-adapter)
- [ ] Any deterministic invariant the package brings has a CI check, recorded in the repo's manifest — [ci-verification.md → Extending](../setup/ci-verification.md#extending)

## Dependency direction → [code-placement.md](../code-placement.md)
- [ ] `core` depends on this package as a driven port, reached through `ctx.system.*` — [code-placement.md](../code-placement.md#layering-three-roles-one-direction)
- [ ] Non-domain consumers (e.g. an app) use it directly, not through a domain service — [code-placement.md](../code-placement.md)

---

Cross-cutting TypeScript standards apply here too; the review protocol runs that sweep regardless of what you touched.
