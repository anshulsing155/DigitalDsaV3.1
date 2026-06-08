# Post-Audit Implementation — Spec Progress Tracker

> Tracks which epics of `POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` are fully specified.
> **Phase 0 = specification (now, doc-only). Phase 1+ = execution (after pending roadmap clears).**
> **Created:** 2026-05-20

---

## Owner decisions locked (2026-05-20)

1. **Revenue model:** Pure subscription now; **corporate-DSA payout model planned** (receive from lenders, pay DSAs after TDS). → Epic D split into D-now (in scope) + D-later (specified, sequenced after this program).
2. **Recurring billing:** Spec both Razorpay-Subscriptions vs build-our-own; **recommendation = Subscriptions**; owner decides at Epic D execution.
3. **Epic order:** Blockers → Polish → Money → Compliance → Growth (A→B→C→D→E→F; G,H interleaved).
4. **Spec timing:** Write now, in parallel with pending roadmap (doc-only, no diversion).

---

## Spec progress

| Epic | Title | Spec status | Session |
| --- | --- | --- | --- |
| Scaffold | Program overview, methodology, sequencing, Razorpay matrix, corporate-DSA addendum, DoD template | ✅ done | 2026-05-20 |
| **A** | Blockers (RM Settings fix · Gap A admin-proxy capture) | ✅ done | 2026-05-20 |
| **B** | DSA-facing polish (6 items: case labels · enum→label · case-detail header · home cleanup · cases list · analytics) | ✅ done | 2026-05-20 |
| **C** | RM + Admin polish (8 items: RM home KPIs · policy search · broadcast metrics · surface impersonation · audit-log scope · lender-count reconcile · test-data sanitize · dup-render) | ✅ done | 2026-05-20 |
| **D** | Money — D-now (6: recurring billing both-ways · GST invoicing · refund · dunning · reconciliation · pricing-fence) + D-later (7: corporate-DSA payout ledgers/TDS/16A/payouts/earnings) | ✅ done | 2026-05-20 |
| **E** | Compliance (4: DPDP §11 data-export · admin TOTP 2FA · sessions UI+revoke · 6-yr money retention) | ✅ done | 2026-05-20 |
| **F** | Growth (5: referral codes · public eligibility checker · UTM/landing · drop-reason enum · NPS+exit survey) | ✅ done | 2026-05-20 |
| **G** | Integrations (5: webhooks · public read-API · DigiLocker · AA · CIBIL/NSDL/UIDAI — lighter scope+sequencing depth, later quarter) | ✅ done | 2026-05-20 |
| **H** | i18n + notifications + misc (4: hi/mr templates · 5–8 notification triggers · date-format helper · enable Queries/Communicate tabs) | ✅ done | 2026-05-20 |

---

## Key code facts discovered (carry forward)

- **Case label** is stored on `Case.label` (MongoDB), set from `data.label` in `POST /api/cases` (`src/routes/api/cases/+server.ts:223`), built client-side in `src/lib/utils/formSubmitHandler.ts`. → label fix = generator change + backfill script.
- **Loan type** renders raw `c.loan.type`; cases page has `STAGE_LABELS` but no `LOAN_TYPE_LABELS`. `PRODUCT_TYPE_LABELS` exists in `src/lib/types/policyEngine.ts` (policy-scoped).
- **Applicant PII is CSFLE-encrypted** (SEC-2) → search by mobile/PAN must use deterministic-equality lookup, not regex. Confirm whether applicant mobile/PAN use *deterministic* vs *random* encryption before building B.5 search. Name search falls back to the plaintext label (which carries the name after B.1).
- Cases sorted `updated_at: -1` only; no sort control today.

## Key code facts discovered (carry forward)

- Case label stored on `Case.label`, set in `POST /api/cases:223`, built in `formSubmitHandler.ts`. CSFLE-encrypted applicant PII → search by mobile/PAN = deterministic equality, not regex.
- RM home (`rm/+page.server.ts`) already imports Cases/RMSubmissions/PolicyVersions/PolicyRules/Lenders/etc. → KPIs are "surface what's loaded."
- Audit log = `PolicyAuditLog` (`src/lib/types/policyEngine.ts:518`), `target_type` is an 8-value union, 2-year TTL. Money rows will need 6-year retention → separate path (flagged in C.5 + Epic D/E).
- Impersonation built (`/api/admin/impersonate/start|exit`, `adminImpersonation.ts`, `AdminImpersonationBanner.svelte`), unsurfaced in Users table.
- "0 published policies" (registry health) is a real diagnostic, not just a counter — may be its own ticket (parked).

## Key code facts discovered (carry forward)

- Plans in `billing.ts`: Basic ₹999/10 · Pro ₹3,999/50 · Enterprise ₹9,999/∞. Trial 7d of Pro. DA tiers + top-up packs separate.
- **Paywall primitive already exists** (`getActiveCaseLimit`, per-plan `caseLimit`) — just not called at case creation. Fence = enforce, not build.
- Billing uses one-time Razorpay `orders` today; Subscriptions API not yet used; Razorpay SDK is a dependency.
- No annual duration, no GST field on plans today.
- Audit money-rows need 6-yr retention (≠ 2-yr policy-audit TTL) — separate path.

## Key code facts discovered (carry forward)

- `data3/retentionFloor.ts` = *document* retention (30/90/180/365 days); money 6-yr retention is a NEW separate policy.
- No TOTP lib installed → E.2 adds `otplib` + `qrcode`.
- JWT refresh tokens have a token ID + rotation → handle for the E.3 sessions registry.

## SPEC COMPLETE (2026-05-20)

All eight epics (A–H) are specified in `POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md`. See the "SPEC COMPLETE — what happens next" section at the end of that doc for the effort table, the path to execution, and the open decisions.

**In-scope core program (A–F + H):** ~75–90 dev-days. **G (integrations):** ~35+ days, later quarter. **D-later (corporate-DSA payout):** ~20–30 days, own program post-launch.

### Open decisions the owner must resolve before freeze
1. D.1 — Razorpay Subscriptions (recommended) vs build-our-own recurring billing.
2. B.6/D.6 — is Analytics a Pro feature? (resolved with the pricing-fence).
3. B.5 — applicant mobile/PAN encryption mode (deterministic = searchable; pre-build check).
4. E.4 — exact money-retention period + post-window redaction (CA/legal sign-off).
5. G — external partner/licensing choices (DigiLocker, AA TSP, CIBIL) before promoting to full specs.
6. C.6 — "0 published policies": counter bug vs stuck pipeline (parked diagnostic).

### Next steps
1. Owner reviews the full master spec; flags any changes NOW (cheap in spec, expensive mid-build).
2. Resolve the 6 open decisions.
3. Freeze.
4. Execution begins after the pending roadmap clears (DATA-4 → SEC-2 → DX-2/4 → PERF-3 → Android), except A.1 (RM Settings hotfix, authorized early).
5. Then PB-7 + PB-8 → launch.

No further spec sessions needed unless the owner reopens an epic for deeper detail or greenlights a G item for full-DoD promotion.

---

## How to resume

1. Open `POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md`, read §2 (Definition-of-Done) + Epic A (quality bar).
2. Pick the next ⏳ epic from the table above.
3. Investigate the relevant code (grep/read) so the spec matches reality.
4. Append the epic to the master spec under its `# EPIC X` heading.
5. Update this tracker's table + resume point.

---

## Reminder — this is Phase 0 (spec only)

No code is written during specification. Execution (Phase 1+) begins only after: (a) the full spec is frozen + owner-approved, and (b) the pending roadmap (DATA-4, SEC-2, DX-2/4, PERF-3, Android MOB-1/SEC-1/SEC-3) clears. The lone exception authorized to execute early is **Epic A.1 (RM Settings hotfix)** — a one-file live-bug fix that unblocks RM onboarding testing.
