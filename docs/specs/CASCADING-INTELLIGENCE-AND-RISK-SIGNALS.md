# Cascading Intelligence & Risk Signals Specification

## Session 32 Analysis — All Loan Types

---

## Part A: Impossible/Infeasible Combinations Found

### HOME LOAN (7 HIGH, 2 MEDIUM)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 1 | Compliance | NA pending + "NA conversion order" in doc multi-select | HIGH | Filter doc options based on NA status |
| 2 | Compliance | "None collected yet" + other docs selected simultaneously | HIGH | Make "None" exclusive toggle in multi-select |
| 3 | Legal | Title chain CURRENT_MISSING + LOST_BY_OWNER → EC + mutation still show | HIGH | Hide downstream when case is dead |
| 4 | Compliance | NA not applied → mutation question still shows | MEDIUM | Hide mutation when NA not applied |
| 5 | Compliance | NA pending → PropertyStage allows "Ready To Move" | HIGH | RTM impossible if NA pending |
| 6 | Legal | OC/CC question missing for New Loan + direct_from_authority + RTM | HIGH | Add showWhen for this path |
| 7 | Property | Mortgage tenure allows 40yr on 30+ year old property | MEDIUM | Dynamic max tenure by property age |
| 8 | Existing Loan | BT flow: no EMI count question after disbursement date | HIGH | Add EMI count Q, block if <6 |
| 9 | BT Registry | Registry <6 months → compliance questions still show | MEDIUM | Block until 6-month check passes |

### LAP (3 findings)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 10 | Property | Mixed-use property → single construction type forced | HIGH | Multi-select for Mixed category |
| 11 | Property | Leasehold: loan tenure can exceed remaining lease | MEDIUM | Cap tenure to leaseRemaining-5 |
| 12 | Legal | GPA transfer → succession questions still show | MEDIUM | Hide inheritance Q for non-inherited |

### PLOT LOAN (2 findings)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 13 | Compliance | NA conversion → no boundary demarcation question | HIGH | Add boundary marking Q |
| 14 | Construction | Self-construction → no contractor/plan approval Q | HIGH | Add contractor + building plan Qs |

### CROSS-LOAN (3 findings)

| # | Scope | Issue | Severity | Fix |
|---|-------|-------|----------|-----|
| 15 | All secured | No negative area detection beyond pincode | MEDIUM | Cross-check against negative area DB |
| 16 | All secured | No age vs PropertyStage validation | MEDIUM | Validate age range by property stage |
| 17 | All secured | Non-authorized property + no sale deed = no legal standing | MEDIUM | Require sale deed for non-authorized |

### PERSONAL LOAN (4 findings)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 18 | Loan Req | CC/OD facility + Medical/Education purpose = contradiction | HIGH | Filter purpose by facility type |
| 19 | Loan Req | CC tenure allows 7yr but CC renews annually | MEDIUM | Warn when CC tenure > 1yr |
| 20 | Loan Req | DC urgency=immediate + no loan amount = not credible | HIGH | Require amount for urgent requests |
| 21 | Loan Req | Medical purpose + 7yr tenure = excessive interest | MEDIUM | Warn medical > 3yr tenure |

### BUSINESS LOAN (8 findings)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 22 | Business Profile | Vintage <1yr + turnover ₹5Cr+ + 50 employees = fabrication | CRITICAL | Add vintage-gated turnover/employee warnings |
| 23 | Business Profile | GST not registered + turnover ₹50L+ = illegal (mandatory above ₹40L) | CRITICAL | Block or warn high turnover without GST |
| 24 | Business Profile | Construction sector + vintage <1yr = no track record | HIGH | Add industry-specific vintage warning |
| 25 | Business Profile | Proprietorship + employee count question = redundant | MEDIUM | Hide for proprietorship |
| 26 | Loan Req | CC/OD facility + Equipment/Inventory purpose = wrong facility type | HIGH | Warn equipment needs term loan not CC |
| 27 | Loan Req | Low turnover (₹25L) + high loan (₹50L) = will auto-fail FOIR | CRITICAL | Warn amount vs turnover mismatch |
| 28 | Loan Req | DC flow doesn't capture which bank being taken over | HIGH | Show bank relationship for DC too |
| 29 | Loan Req | Bank accounts don't validate against business location | MEDIUM | Future: cross-validate bank vs location |

### PROFESSIONAL LOAN (8 findings)

| # | Page | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 30 | Profile | DM/MCh qualification + <1yr practice = impossible (needs 5+yr training) | HIGH | Add qualification-gated vintage warning |
| 31 | Profile | Employed professional + expired registration ≠ always disqualifying | MEDIUM | Soften warning for employed professionals |
| 32 | Profile | Practice type "Both" lacks concurrent vs sequential clarification | MEDIUM | Add clarification warning |
| 33 | Profile | Category "Other" + professional practice income = broken mapping | HIGH | Fix income profile coherence |
| 34 | Loan Req | Duplicate professionalCategory question (asked in both pages) | HIGH | Remove from loanRequirement |
| 35 | Loan Req | Clinic setup purpose + employed practice type = contradiction | HIGH | Warn setup loans need independent practice |
| 36 | Loan Req | Urgency=immediate + empty loan amount = not credible | MEDIUM | Warn/require amount for urgent |
| 37 | Loan Req | DC flow doesn't capture takeover bank (same as Business #28) | HIGH | Show bank relationship for DC |

---

## Part B: Risk Signals Architecture

### Problem
Warnings show during form filling → DSA reads → DSA forgets → offers generated without this context → lender gets a case with issues they'd reject. No memory between form warnings and offer calculation.

### Solution: Schema-Defined Risk Signals

Each option that indicates a risk carries a `riskSignal` declaration:

```typescript
// On schema option
{
  label: 'Current docs missing',
  value: 'CURRENT_MISSING',
  riskSignal: {
    id: 'TITLE_CHAIN_INCOMPLETE',
    severity: 'high',           // critical | high | medium
    impact: 'nbfc_only',        // all_excluded | nbfc_only | terms_adjusted | info_only
    label: 'Current ownership documents missing'
  }
}
```

### Signal Severity Levels

| Severity | Meaning | Example | Rule Engine Effect |
|----------|---------|---------|-------------------|
| `critical` | No lender can proceed | Docs lost by owner | Hard gate: exclude ALL lenders |
| `high` | Banks excluded, only NBFCs | Previous chain missing | Gate: exclude Classification=GOV,PVT |
| `medium` | Reduced options, adjusted terms | Minor deviations | Parameter adjustment: LTV -10% |
| `info` | Captured but no auto-filter | "Not sure" answers | Flagged for manual review |

### Data Flow

```
Schema Option                     Form Filling                    Offer Generation
─────────────                     ────────────                    ────────────────
option.riskSignal defined    →    User selects option        →    payloadEnricher reads
                                  riskSignal accumulated          answers, derives
                                  in answers alongside            _riskSignals[] array
                                  form data                  →    evaluatePayload() uses
                                                                  _riskSignals in hard gates
                                                             →    Lender rules can reference:
                                                                  { "not": { "in": ["TITLE_CHAIN_INCOMPLETE",
                                                                    { "var": "_riskSignals" }] } }
```

### Accumulation: Where Risk Signals Live

**NOT a separate store.** Risk signals are derived from existing answers:

```typescript
// In payloadEnricher.ts (server-side, during offer calculation)
function deriveRiskSignals(answers: AnswersMap, schema: RawSchemaPage[]): RiskSignal[] {
  const signals: RiskSignal[] = [];
  for (const page of schema) {
    for (const question of page.questions) {
      const answer = answers[question.bindsTo];
      if (!answer) continue;
      const selectedOption = question.options?.find(o => o.value === answer);
      if (selectedOption?.riskSignal) {
        signals.push(selectedOption.riskSignal);
      }
    }
  }
  return signals;
}
```

**On the client** (for DSA visibility during form filling):
```typescript
// Derived reactively from visible questions + answers
let riskSignals = $derived.by(() => {
  return visibleQuestions
    .flatMap(q => q.options ?? [])
    .filter(opt => opt.riskSignal && opt.value === currentAnswers[q.bindsTo])
    .map(opt => opt.riskSignal);
});
```

### Integration Points

1. **Schema**: Add `riskSignal` to option type (`ClientOption` / `RawSchemaQuestion.options[]`)
2. **payloadEnricher.ts**: Derive `_riskSignals[]` from answers before evaluation
3. **evaluationEngine.ts**: Pass `_riskSignals` as part of enriched payload data
4. **Bank rule docs**: Add hard gates referencing risk signals
5. **Client**: Show risk signal summary panel (optional, Phase 2)

### Why Schema-Defined (Not Code-Defined)

- **Single source of truth**: The option that causes the risk also declares the signal
- **No mapping table**: No separate module that maps "if answer X = Y then signal Z"
- **Self-documenting**: Reading the schema tells you exactly what risks each answer produces
- **Rule engine compatible**: Bank rules can reference signals by ID using existing JSON-Logic
- **Extensible**: Add new signals by adding `riskSignal` to options — no engine changes

### Existing `riskType` Field

The current `riskType` on options (e.g., `riskType: 'NON_NA_LAND'`) is used for NBFC crowdsourcing only. The new `riskSignal` replaces and extends this:

- `riskType` → migrated to `riskSignal.id`
- NBFC crowdsourcing continues to work (reads `riskSignal.id`)
- Rule engine now also reads it

---

## Implementation Priority

### Phase 1: Cascading showWhen (Form Intelligence)
Fix the 17 impossible combinations with showWhen rules + option filtering.
No backend changes. Schema-only.

### Phase 2: Risk Signal Schema Definition
Add `riskSignal` to options across all loan types.
Extend `ClientOption` type. No evaluation changes yet.

### Phase 3: Risk Signal Accumulation + Rule Engine Integration
Wire `_riskSignals[]` into payloadEnricher → evaluationEngine.
Add bank rule gates that reference signals.

### Phase 4: Client Risk Summary Panel (Optional)
Show DSA a live "risk signals detected" panel during form filling.
