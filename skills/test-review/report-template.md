## Test review: <PR #n or branch> — <title>

Base `<base-sha>` → head `<head-sha>`. PRD: <link>. Strategy: <path> | **none — derived** (fails
core/end-here → Testing) | none needed: <why the change needs no new tests>.
Harness read: <test AppContext builder file>, <adapter files>; defaults that matter: <e.g. "audience
spy disabled unless enabled: true">.
CI: <result>. Mutation: <score>, mutating <paths>; excludes <paths> — no evidence for rows there |
scheduled, not run on this change | none.
Citations verified against `<head-sha>`.

**Summary:** <N> rows covered · <N> stop short · <N> missing · <N> wrong level · <N> holes in the plan.
Guard evidence: <N> evidenced · <N> weak · <N> none.

### 1. Strategy rows

| Row | Use case | Risk | Level | Verdict | Test (file:line › title) | What it asserts | Gap |
|---|---|---|---|---|---|---|---|
| <ID> | <UC> | <risk> | unit / integration | ✅ covered · 🟡 stops short · ❌ missing · ↕ wrong level | <path:line › title> | <the outermost assertion> | #<n> |

### 2. Category questions

| Use case | Question | Strategy's answer | Verdict | Gap |
|---|---|---|---|---|
| <UC> | Rules · Boundaries · Clock · Every path · Permissions · Side effects · Atomicity · Concurrency · Failure modes · Data shape · Wiring · Seam contracts | rows <IDs> \| n/a: <reason> | ✅ answered · ❌ skipped · ⚠ n/a hides behaviour | #<n> |

*Not covered:* <each entry> → ✅ behaviour-free · ✅ accepted by <who> · ❌ hides behaviour (#<n>).

### 3. New or changed tests no row explains

| Test (file:line › title) | Level | Reading | Gap |
|---|---|---|---|
| <path:line › title> | <level> | a risk the plan missed · owned at two levels (also <path:line>) | #<n> |

### 4. Code findings with no row

| Production (file:line) | Finding | Gap |
|---|---|---|
| <path:line> | <the changed path, race, failure mode or effect> | #<n> |

### 5. Guard evidence

| Row | Guard | Coverage | PR's break-it record | Evidence |
|---|---|---|---|---|
| <ID> | <lock / conditional write / uniqueness / rollback / refusal> | ✅ · 🟡 · ❌ (from table 1) | <baseline passed; what was disabled; which assertion failed> \| none | ✅ evidenced · 🟡 weak · ❌ none |

---

### Gaps

**<n>. <one line, as a user or operator would say it>** — <severity: high | medium | low>
Production: <path:line, the condition or effect>
Nearest test: <path:line › title> — asserts <what it asserts> | none
Why it matters: <the consequence, never a testing truism>
How to close it:
  - Extend <path> | new file next to <sibling>
  - Reuse <AppContext builder, seed helper, spy, clock control> from <file>
  - Trigger: <entry-point call, actor, clock>
  - Assert on: <the row, dispatch and effect, vendor call or exception that flips if the code is wrong>
  - <"Decide first: …" with the options, when the PRD doesn't specify the behaviour>

### Checked and sound

- <row, test or path>: <why it holds> (<path:line>)
