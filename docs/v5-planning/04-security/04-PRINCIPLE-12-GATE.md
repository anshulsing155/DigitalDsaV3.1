---
type: security
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Principle 12 Gate — The Four Questions on Every Feature

## The principle (verbatim from the SRS)

> The platform amplifies, never replaces, the DSA.

Every feature is tested against four questions. Questions 1-3 are reasons *to* build (helping on any is good). **Question 4 is an absolute veto.** A "yes" on #4 cannot be outweighed by any amount of "yes" on 1-3.

## The four questions

1. **Does it help the DSA earn more?**
2. **Does it help the DSA work faster?**
3. **Does it strengthen the DSA-customer relationship?**
4. **Could this feature ever bypass the DSA — let a lender, builder, partner, customer, or DigitalDSA itself transact around them?**

Q4 must be answered **No**, with reasoning, or the feature does not ship.

## Where the gate runs

| When | How |
|---|---|
| **Design** — before code is written | Run the questions during the spec discussion. If Q4 is uncertain, the spec is paused for design review. |
| **PR submission** — in the PR template | Engineer fills in the four-question block. CI checks the block is present. |
| **CI** — automated check | Greps PR body for the question block; fails if missing or if Q4 = "yes" without `Co-approved-by: owner` trailer. |
| **Code review** — owner + Claude | Re-evaluate against domain knowledge; reject if reasoning is weak. |
| **Quarterly review** — sweep | Sample 10 random features; re-run the gate cold. If Q4 should have been "yes" and we missed it, the feature is removed or restructured. |

## CI check

```yaml
# .github/workflows/principle12.yml
name: Principle 12 Gate
on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR body for Principle 12 block
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.pull_request.body || '';
            const hasBlock = body.includes('Principle 12 four-question gate');
            const hasAllFour = ['1. **Does it help', '2. **Does it help', '3. **Does it strengthen', '4. **Could this'].every(s => body.includes(s));
            const q4Yes = /4\..*[Yy]es/.test(body);
            const ownerApproval = /Co-approved-by:\s*owner/i.test(body);

            if (!hasBlock || !hasAllFour) {
              core.setFailed('PR body missing Principle 12 gate block. Use the PR template.');
            }
            if (q4Yes && !ownerApproval) {
              core.setFailed('Q4 = "yes" requires owner Co-approval. Feature cannot merge.');
            }
```

## Worked examples

### Feature: "Show DSA which CorpDSA pays them most for this file"

| Q | A |
|---|---|
| Q1 (earn more) | Yes — DSA picks the CorpDSA with the highest payout for this file |
| Q2 (faster) | Yes — no need to ring each CorpDSA |
| Q3 (relationship) | N/A |
| Q4 (bypass) | **No** — DSA still owns the customer, still files the case, still gets paid; DigitalDSA's facilitation fee is flat regardless of which CorpDSA is picked, so we don't bias the comparison |

**Verdict: ship.** This is the §13 aligned-by-construction feature.

---

### Feature: "Let the customer upload documents directly via a portal"

| Q | A |
|---|---|
| Q1 (earn more) | No direct effect |
| Q2 (faster) | Yes — DSA doesn't have to chase doc collection |
| Q3 (relationship) | Mixed — convenience is good, but the customer-portal becomes a relationship surface that isn't the DSA |
| Q4 (bypass) | **Concerning** — a customer portal that shows the customer their case status, who the lender is, what's missing — invites the customer to engage the lender directly bypassing the DSA |

**Verdict: don't build a customer portal.** Instead: secure upload link via WhatsApp (customer scans/uploads docs, but doesn't see lender or status). Same convenience, no bypass surface. (This is the FR-COMM-5 / FR-DOC-2 design in the SRS.)

---

### Feature: "Builder embeds eligibility widget; we route leads to nearby high-rated DSAs"

| Q | A |
|---|---|
| Q1 (earn more) | Yes — new lead channel for DSAs in builder pools |
| Q2 (faster) | Yes — leads pre-qualified |
| Q3 (relationship) | Yes — DSA owns the relationship from first contact |
| Q4 (bypass) | **No, conditionally:** the consumer sees an indicative range (never a confident single-number commitment), the actual assessment happens with the DSA, and **white-label builders are independently signed by us, never harvested from any DSA's partner list.** |

**Verdict: ship with guardrails.** The data-pool wall (signed builder contracts as evidence) is what makes Q4 a "no."

---

### Feature: "Show DSA their conversion rate vs. peers"

| Q | A |
|---|---|
| Q1 (earn more) | Indirect — competitive benchmarking might motivate improvement |
| Q2 (faster) | No |
| Q3 (relationship) | No |
| Q4 (bypass) | **No, but adjacent risk:** if conversion rate becomes a public leaderboard, it becomes a surveillance signal, gameable, and invites lenders to "shop" DSAs around us. |

**Verdict: ship a private dashboard view.** No public leaderboard, no sharing with lenders. (This is §14 — reputation is earned and portable, never imposed.)

---

### Feature: "AI-suggested customer follow-up scripts"

| Q | A |
|---|---|
| Q1 (earn more) | Slight — better follow-ups improve conversion |
| Q2 (faster) | Yes — fewer keystrokes |
| Q3 (relationship) | Mixed — risk of a homogenised, robotic feel |
| Q4 (bypass) | **No** — AI helps DSA write better messages; doesn't bypass them |

**Verdict: ship with discipline:** suggestion is a draft, never auto-sent. DSA reviews and edits. No LLM call from client (server-side with PII redaction). See `07-TECH-STACK.md` "No client-side AI" rule.

## The cultural meaning

The four questions aren't compliance theatre. They're how we hold ourselves accountable.

The temptation will come — "let's let builders see customer contacts, it'll make routing faster" — and the four-question gate is the structural answer to "no." When we publish the four questions and enforce them via CI, our customers (DSAs) know we can't quietly drop the rule. Their trust comes from the rule being mechanically enforced, not from our promise.

## Related docs

- [../01-strategy/01-VISION.md](../01-strategy/01-VISION.md)
- [../03-conventions/04-PR-PROCESS.md](../03-conventions/04-PR-PROCESS.md) — PR template
- [../10-decisions/OPEN-DECISIONS.md](../10-decisions/OPEN-DECISIONS.md) — D-10, D-11 (revenue + reputation principles)
