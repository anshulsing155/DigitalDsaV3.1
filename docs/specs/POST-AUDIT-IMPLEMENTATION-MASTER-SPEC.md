# DigitalDSA — Post-Audit Implementation Master Spec

> **Status:** SPECIFICATION IN PROGRESS (doc-only; no code until frozen & approved).
> **Created:** 2026-05-20
> **Owner:** Product/Sales/Marketing owner + engineering.
> **Source of findings:** `PRODUCT-AUDIT-PASS-2-REPORT.md` (plain-English) + `PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md` (technical).
> **Companion:** `POST-AUDIT-IMPLEMENTATION-PROGRESS.md` (which epics are specced, resume points).

---

## 0. The deal (read this first)

This document defines **everything to be built in response to the Pass-2 product audit, before any code is written.** The rule is simple and the user set it explicitly:

> *"I need everything defined first before execution, even the tiniest UI and UX in picture first. No diversion allowed in between."*

So this spec is the contract. Each item is defined to the point where an engineer can build it without making product decisions. Once an epic is **frozen** (reviewed + approved by the owner), execution runs straight through it with **zero scope changes mid-flight**. New ideas that surface during execution go into a parking lot for a future round — they do not interrupt the frozen batch.

### Two phases, deliberately separated

- **Phase 0 — Specification (now).** Writing this document. It touches **zero code** and therefore **diverts zero execution.** It can be written *in parallel* while the team grinds through the already-planned pending roadmap (DATA-4, SEC-2 completion, etc.). This is how we honor both "define everything first" *and* "no diversion": the plan is written now; it is run later.
- **Phase 1+ — Execution (later).** Begins only after (a) this spec is frozen and (b) the pending roadmap clears. Runs epic-by-epic in the frozen order.

---

## 1. When this runs — execution sequencing

### The pending roadmap (runs FIRST — already planned & in-flight)

From `ARCHITECTURE-EVOLUTION.md` and `DEVELOPMENT-PLAN.md` as of 2026-05-20:

| Order | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | **DATA-4** analytics warehouse v1 (8 slices, ~6 days) | 🟡 ready, next | Scheduled next per user direction |
| 2 | **SEC-2** completion — read-site migration (~30 min) + operator Atlas backfills | 🟢 in-flight | Encryption read paths + prod/preview backfill |
| 3 | **DX-2 / DX-4** incremental — Zod schemas + apiOk migration (~111 routes) | 🟢 in-flight | Ongoing, opportunistic |
| 4 | **PERF-3** closure flip | 🟢 eligible | Admin smoke verified |
| 5 | **Android session** — MOB-1, SEC-1, SEC-3 | 🟡 ready (P0 mobile) | Needs emulator session |
| 6 | **PB-7 + PB-8** — credential rotation + email hardening | ⚪ deferred (P0) | *"Do LAST before launch"* |

### Where the audit program slots

```
Pending roadmap (items 1–5)
        │
        ▼
   ┌─────────────────────────────────────┐
   │  POST-AUDIT IMPLEMENTATION PROGRAM   │  ◄── this spec
   │  Epic A → B → C → D → E → F (→ G,H)   │
   └─────────────────────────────────────┘
        │
        ▼
PB-7 + PB-8 (final pre-launch lock)
        │
        ▼
     LAUNCH
```

**Two deviations from "strictly after," both deliberate:**

1. **RM Settings hotfix (Epic A.1) is pulled forward — execute NOW or in the next available slot.** It's a live bug (every new RM hits "Profile not found"), it's ~half a day, and it blocks the RM onboarding you'll want to test *during* the pending roadmap. This is not a diversion — it's a one-file hotfix that unblocks testing.

2. **The audit program runs BEFORE PB-7/PB-8.** Credential rotation + email hardening are the final lock-down; you don't rotate everything and then keep building features that touch credentials and email.

### Epic order (locked by owner decision 2026-05-20)

**Blockers → Polish → Money → Compliance → Growth**, i.e.:

`A (Blockers) → B (DSA polish) → C (RM+Admin polish) → D (Money) → E (Compliance) → F (Growth)`

Epics **G (Integrations)** and **H (i18n/notifications/misc)** are interleaved opportunistically — G is a later-quarter workstream; H items are small and can ride alongside whichever epic touches the same screen.

---

## 2. What "fully defined" means — the Definition-of-Done template

Every item in every epic is specified against this template. If a section is genuinely N/A, it says "N/A — <reason>", never blank.

```
### <Epic>.<n> — <Item name>

**Problem (from audit).** One paragraph: what's wrong today, with the concrete example from the audit.

**Outcome.** One sentence: what's true after this ships.

**Screen(s).** Every screen touched, as a written/ASCII mockup. Every element named:
  - Headings, labels, placeholder text, button text (exact words)
  - Field types (text / select / radio / file / toggle) + constraints (min/max/maxLength/regex)
  - Layout order top-to-bottom

**States.** Each of:
  - Empty (no data yet) — exact copy + CTA
  - Loading — skeleton or spinner, which
  - Error — exact message + recovery path ("Retry" / "Contact support")
  - Success — toast / inline / redirect, which + exact copy
  - Disabled — and the reason shown to the user (per CLAUDE.md Pitfall #26: disabled Next always has a reason)

**Data model.** New/changed collections and fields — exact names, types, indexes. Migration note if existing data needs backfill.

**API.** Each endpoint: method + path + auth gate + rate limit + request shape + response shape + validation rules (Zod) + error codes.

**Business logic.** The rules in plain steps. Calculations spelled out with example numbers.

**Edge cases.** Enumerated explicitly. "What if X is empty / huge / duplicate / concurrent / offline."

**Parity checklist.** Per CLAUDE.md §5: does this apply to other loan types / Individual vs Company / single vs multi applicant / DSA vs RM vs Admin? If yes, propagate. If no, why not.

**i18n.** Which strings are new → must be added to en/hi/mr (374-key system).

**Test plan.** Unit tests + the one manual scenario that proves it works.

**Effort.** Dev-days estimate. **Dependencies.** Which other items must ship first.

**Provenance / audit.** What gets written to the audit log (especially for admin-on-behalf actions).
```

---

## 3. Cross-cutting decision — recurring billing architecture (speced both ways per owner request)

The owner asked to see both options before deciding. This decision shapes all of Epic D's recurring-payment items. **Decision required before Epic D execution begins.**

### Option 1 — Migrate to Razorpay Subscriptions (recommended)

**What changes.** Today billing uses one-time Razorpay `orders` (`/api/razorpay/order` + `/api/billing/subscribe`). We migrate to **Razorpay Subscriptions + Payment Mandates**.

**What Razorpay then handles for us:**
- eNACH / UPI-AutoPay / card-mandate registration (the customer authorizes once)
- Automatic recurring debit each cycle
- Smart retries on a failed charge
- Webhooks: `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `payment.failed`

**What we still build:**
- A webhook listener at `/api/razorpay/webhook` (HMAC-verified) that updates our subscription state from Razorpay's events
- Dunning emails (triggered off `payment.failed` / `subscription.pending`)
- GST invoice generation (Razorpay doesn't issue our tax invoice — see Epic D)
- The Razorpay Plan objects (one per pricing tier) created once via their API/dashboard

**Pros:** eNACH + auto-pay + retry essentially free. Less code to maintain. Industry-standard. DSAs pay once, then never think about it.
**Cons:** Migration effort (~3 days). Tie-in to Razorpay's subscription model. Existing one-time-paid users need a migration path (grandfather them until renewal, then move to mandate).

### Option 2 — Keep one-time orders, build recurring ourselves

**What we build:** mandate registration via Razorpay's standalone eMandate API, a cron that initiates each cycle's debit, our own retry logic, our own failure-state machine, plus everything in Option 1's "we still build" list.

**Pros:** Full control of the recurring flow. No dependence on Razorpay's subscription object model.
**Cons:** Significantly more code (~8–10 days vs ~3). We own retry/dunning logic that Razorpay would otherwise handle. More surface area for bugs in the money path — the worst place to have them.

### Recommendation

**Option 1.** The money path is the worst place to hand-roll logic Razorpay already battle-tests. Migrate to Subscriptions; spend the saved week on GST invoicing and the corporate-DSA payout layer instead. Epic D is written assuming Option 1, with Option-2 deltas noted inline.

---

## 4. Revenue-model addendum — dual horizon (subscription now, corporate-DSA later)

Owner clarified the model is **two-horizon**:

- **Horizon 1 (now):** Pure subscription. DSAs pay ₹999–₹9,999/mo. We never pay them. → No TDS, no Form 16A, no commission ledger needed yet.
- **Horizon 2 (planned):** **Corporate-DSA model.** We become a DSA ourselves — receive payouts *from lenders*, and pay DSAs their share *after deducting government obligations (TDS etc.)*. → This adds a whole financial sub-system.

**Implication for the spec.** Epic D is split:

- **D-now (in scope for this program):** subscription billing, GST invoicing, refunds, dunning, reconciliation, pricing-fence. Sequenced in the Money epic.
- **D-later (defined here, sequenced AFTER this program):** the corporate-DSA payout sub-system. **Fully specified so it's not a surprise**, but executed as its own program once you flip to corporate-DSA. It includes:
  - **Lender receivables ledger** — what each lender owes us per disbursed case
  - **Commission ledger** — what we owe each DSA per case
  - **TDS deduction engine** — compute + withhold TDS at the correct rate per DSA's PAN status; track for quarterly filing
  - **Form 16A generation** — TDS certificate per DSA per quarter
  - **DSA payout flow** — Razorpay Payouts / RazorpayX to disburse net amounts to DSA bank accounts
  - **DSA "My Earnings" page** — gross, TDS withheld, net, payout status, downloadable Form 16A
  - **Admin reconciliation** — lender-paid vs DSA-paid vs platform-margin
  - **Compliance** — 6-year retention of all payout + TDS records (already flagged in Epic E)

D-later is detailed in Epic D under a clearly-marked "Horizon 2" heading so the data model can be designed now to not paint us into a corner, even though we build it later.

---

## 5. Epic index

| Epic | Title | Items | Sequence | Spec status |
| --- | --- | --- | --- | --- |
| **A** | Blockers & Critical | RM Settings fix · Gap A admin-proxy capture | 1st | ✅ specced (this doc) |
| **B** | DSA-facing polish | case labels · enum→label · case-detail header · home cleanup · cases list · analytics fixes | 2nd | ⏳ pending |
| **C** | RM + Admin polish | RM Home KPIs · policy search · broadcast metrics · surface impersonation · audit-log scope · lender-count reconcile · test-data sanitize · dup-render bug | 3rd | ⏳ pending |
| **D** | Money (now + corporate-DSA later) | subscriptions · GST invoicing · refunds · dunning · reconciliation · pricing-fence  +  [Horizon 2: payout sub-system] | 4th | ⏳ pending |
| **E** | Compliance | DPDP §11 export · admin 2FA · sessions UI · 6-yr retention | 5th | ⏳ pending |
| **F** | Growth | referral · public eligibility check · UTM/landing · drop-reason · NPS/exit survey | 6th | ⏳ pending |
| **G** | Integrations | webhooks · public read-API · DigiLocker · AA · CIBIL/NSDL/UIDAI | later quarter | ⏳ pending |
| **H** | i18n + notifications + misc | hi/mr templates · 5–8 notification triggers · date-format helper · Queries/Communicate tabs | interleaved | ⏳ pending |

---

# EPIC A — Blockers & Critical

**Why first:** A.1 is a live bug blocking RM onboarding. A.2 (Gap A) is the single highest-value capability for ops and lender coverage — the thing you specifically flagged the first audit missed.

---

### A.1 — Fix the RM "Profile not found" error (auto-provision + graceful fallback)

**Problem (from audit).** Logged in as an RM, the Settings page (`/dashboard/rm/settings`) shows *"Profile not found — Unable to load your profile. Please try again later."* Root cause confirmed in code: `src/routes/dashboard/rm/settings/+page.server.ts` looks up `rmApplications.findOne({ _id: user.id })`. But a user who holds the RM *role* without a dedicated `rmApplications` document — e.g. an admin-mirror account, or a user granted RM via `/api/set-role` — has no such document, so the lookup returns null and the page renders the error. A real partner who signs up via `/partner-signup` *does* get an `rmApplications` doc, but any role-granted RM does not. **Any RM whose profile wasn't created at signup hits a dead end on their own Settings page.**

**Outcome.** Every user with the RM role can open Settings and see a working profile — either their real one, or a "complete your profile" setup state — never a raw error.

**Screens.**

The Settings page gets **three** possible renders instead of today's two (profile / error):

**(a) Profile exists — the normal case (unchanged from today's happy path):**
```
┌─ Settings ──────────────────────────────────────────────┐
│ Manage your RM profile information                       │
│                                                          │
│  RM Profile                                              │
│  ┌────┐  Name           [ Neha Verma            ]        │
│  │ NV │  Official email [ neha@icicibank.com    ]        │
│  └────┘  Bank           ICICI Bank  (read-only badge)    │
│          Designation    [ Relationship Manager   ]       │
│          Working city   [ Mumbai                 ]        │
│          Mobile         9716015757  (read-only)          │
│          Language       (•) English ( ) हिन्दी ( ) मराठी  │
│          Member since   10 May 2026  (read-only)         │
│                                          [ Save changes ]│
└──────────────────────────────────────────────────────────┘
```

**(b) Profile missing but role is RM — NEW "complete your profile" setup state** (replaces today's error):
```
┌─ Settings ──────────────────────────────────────────────┐
│ Complete your RM profile                                 │
│ We need a few details to set up your partner account.    │
│                                                          │
│  Name *           [                          ]           │
│  Official email * [                          ]           │
│     (helper: "Use your bank email so we can verify you") │
│  Bank *           [ Select your bank ▾        ]           │
│  Designation      [                          ]           │
│  Working city *   [                          ]           │
│  Mobile           9811556664  (read-only, from login)    │
│                                    [ Create my profile ] │
└──────────────────────────────────────────────────────────┘
```

**(c) Genuine load failure (DB down) — keep an error, but a better one:**
```
┌─ Settings ──────────────────────────────────────────────┐
│  ⚠  We couldn't load your profile right now.             │
│     This is on us, not you. Please try again.            │
│                                   [ Retry ]              │
└──────────────────────────────────────────────────────────┘
```

**States.**
- **Empty / missing profile** → render (b) the setup form. Copy as above.
- **Loading** → skeleton rows where the fields will be (not a spinner — skeleton matches the form shape).
- **Error (DB exception)** → render (c). Distinguish "no profile found" (→ setup form) from "query threw" (→ retry error). Today's code collapses both into "Profile not found"; the fix must split them.
- **Success on "Create my profile"** → inline toast "Profile created" + transition the page to render (a).
- **Disabled** → "Create my profile" button disabled until required fields (Name, Official email, Bank, Working city) are filled; tooltip on hover: "Fill the required fields marked *".

**Data model.** No new collection. `rmApplications` already has the fields. The fix is in *provisioning* + *read fallback*, not schema. One new helper:

```
ensureRmProfile(user): Promise<RmProfile>
  // src/lib/server/rmHelpers.ts (extend existing resolveRmDoc)
  // If an rmApplications doc exists for this user → return it.
  // If not, and the user has the RM role → create a minimal stub:
  //    { _id: <admin-mirror id or new>, mobileNumber, name: '', email: user.email||'',
  //      bankName: '', status: 'profile_incomplete', createdAt: now,
  //      provisioned_by: 'auto_role_grant' }
  // Return the stub.
```

**API.**
- **Change `/api/set-role`** (`src/routes/api/set-role/+server.ts`): when the granted role is `rm`, call `ensureRmProfile(user)` so the doc exists before the dashboard loads. Auth: existing (requireAuthApi + admin-extra-roles guard). No new rate limit.
- **New `POST /api/rm/profile/complete`** — for render (b)'s "Create my profile" submit.
  - Auth: `requireRoleApi('rm')`, CSRF, rate-limit 5/hr/user.
  - Request (Zod): `{ name: string(2..100), officialEmail: email, bankName: string, designation?: string(0..60), workingCity: string }`
  - Response: `{ profile: RmProfile }`
  - Validation errors → `apiValidationError`.
- **Change `/dashboard/rm/settings/+page.server.ts`**: split the catch — a thrown query is `{ profileError: true }` (render c); a null result with RM role is `{ profile: null, canSetup: true }` (render b).

**Business logic.** Provisioning happens at two trigger points so no RM ever lands without a doc: (1) at role grant via set-role, (2) lazily on first Settings load if somehow still missing. The "complete profile" form upgrades `status: 'profile_incomplete'` → `'active'` once required fields are saved.

**Edge cases.**
- Admin-mirror user (`user.id` is an `AdminUsers._id`, not `rmApplications._id`) → stub is keyed by the same id so future lookups by `_id` succeed. (This is the exact case the dev account hits.)
- Concurrent set-role + settings-load → `ensureRmProfile` must be idempotent (upsert, not insert).
- A user who is *both* DSA and RM → RM stub must not collide with their DSA application doc (different collections, safe).
- Mobile stored as Number vs string → reuse the existing `$in: [Number(x), x]` dual-lookup already in the code.

**Parity checklist.** DSA Settings and Admin Settings — verify they don't have the same missing-doc trap. (Admin Settings rendered fine in the audit; DSA profile is the 5-step wizard, different path. Confirm both at build.)

**i18n.** New strings: "Complete your RM profile", "We need a few details…", "Use your bank email so we can verify you", "Create my profile", "Profile created", "We couldn't load your profile right now." → add to en/hi/mr.

**Test plan.**
- Unit: `ensureRmProfile` returns existing doc when present; creates idempotent stub when absent; doesn't duplicate on concurrent calls.
- Unit: settings load returns `canSetup: true` for null-profile-with-RM-role; `profileError: true` for thrown query.
- Manual: log in as the dev account (9811556664, all-roles) → switch to RM → open Settings → see setup form (not error) → fill + submit → see populated profile.

**Effort.** ~1 day (0.5 fix + 0.5 setup form & tests). **Dependencies.** None. **Provenance.** Stub creation logs `provisioned_by: 'auto_role_grant'`; profile completion writes an audit row `rm_profile_completed`.

**Severity.** Blocker — ship before any new RM is onboarded.

---

### A.2 — Gap A: Admin-proxy structured policy capture

**Problem (from audit).** Many RMs (PSU banks, small NBFCs, old-school lenders) will never log into the portal — they'll WhatsApp/fax/email a policy sheet to your admin team. Today the admin has **no way to type a policy in on an RM's behalf** through a structured form. They can upload a PDF for AI parsing, review RM submissions, or hand-edit raw JSON — none of which is "key in the 25 fields from a faxed sheet." Confirmed missing: walked all 11 `src/routes/dashboard/admin/policies/**` routes; none is a structured-capture wizard. The RM-side wizard exists at `/dashboard/rm/policy-capture/new` (component `PolicyCaptureWizard.svelte`, 10 steps: CoreParameters → Eligibility → IncomeAssessment → Obligations → CreditCibil → PropertyRules → BTTopup → FeesPolicies → Deviations → ReviewSubmit).

**Outcome.** An admin can open a wizard, pick which RM/lender the policy is for, key in all policy fields exactly as the RM would, and submit it — tagged as "captured by admin on behalf of RM" with a full provenance trail the RM can later see and edit.

**Screens.**

**New route: `/dashboard/admin/policies/proxy-capture/new`** — reuses `PolicyCaptureWizard.svelte` with a **new Step 0** prepended:

```
┌─ Capture policy on behalf of an RM ─────────────────────────┐
│ Step 0 of 11 · Who is this for?                             │
│                                                             │
│  Which RM provided this policy? *                           │
│  ( ) Existing RM   [ Search RM by name / bank / email ▾ ]   │
│  ( ) RM not on platform yet — create a stub                 │
│        Name *        [                    ]                 │
│        Bank *        [ Select lender ▾    ]                 │
│        Official email[                    ]  (optional)     │
│        Mobile        [                    ]  (optional)     │
│                                                             │
│  How did this policy arrive? *                              │
│  [ ▾ WhatsApp / Email / Fax / Phone call / In-person ]      │
│                                                             │
│  Reference note (optional)                                  │
│  [ e.g. "WhatsApp from Mr. Sharma, SBI Andheri, 18 May" ]   │
│                                                             │
│                                      [ Cancel ] [ Next → ]  │
└─────────────────────────────────────────────────────────────┘
```

Steps 1–10 are the **existing** `PolicyCaptureWizard` steps, unchanged in layout. The only differences from the RM flow:
- A persistent banner at the top of every step: `Capturing on behalf of: <RM name> · <Bank> · source: WhatsApp` (so the admin never forgets whose policy this is).
- **No OTP gate** at submit (the RM-side flow may require OTP; admin proxy is gated by admin auth instead).
- The final ReviewSubmit step's button reads **"Submit on behalf of RM"** (not "Submit").

**An entry point** on `/dashboard/admin/policies` — a button next to "Upload New Policy":
```
[ Upload New Policy ]   [ Capture on behalf of RM ]
```
And in the admin dashboard Quick Actions panel, a tile: `📝 Proxy Capture`.

**Where the RM sees it later:** when a stub-or-real RM opens `/dashboard/rm/policies`, an admin-captured policy shows with a badge:
```
  SBI Home Loan   ·   Verified
  ⓘ Entered by DigitalDSA admin on your behalf · 18 May 2026 · [Review & confirm]
```
Clicking "Review & confirm" opens the same wizard pre-filled, lets the RM edit, and on save flips provenance from `admin_manual_proxy` to `rm_confirmed`.

**States.**
- **Empty RM search** → "No RMs match. Create a stub instead." with the radio auto-switching to "RM not on platform yet."
- **Loading** (saving draft) → "Saving draft…" inline; the existing wizard already autosaves drafts — reuse that.
- **Error** (submit fails) → toast "Couldn't submit — your draft is saved. Try again." Draft persists.
- **Success** → redirect to `/dashboard/admin/policies/pms` (the review queue) with toast "Policy captured on behalf of <RM name>. It's now in the review queue."
- **Disabled** → "Next" on Step 0 disabled until an RM is chosen/created AND a source is picked; tooltip names what's missing.

**Data model.**
- Reuse the existing policy-capture / PolicyRules pipeline. Add to the captured policy's record:
  ```
  provenance: {
    source_type: 'admin_manual_proxy',
    captured_by: <AdminUsers._id>,
    captured_for_rm: <rmApplications._id | stub id>,
    arrival_channel: 'whatsapp' | 'email' | 'fax' | 'phone' | 'in_person',
    reference_note: string(0..280),
    captured_at: Date
  }
  ```
- If "RM not on platform yet" → create an `rmApplications` stub via the same `ensureRmProfile` helper from A.1, with `status: 'stub_admin_created'`.
- Confirmation flips `provenance.source_type` → `'rm_confirmed'` and records `confirmed_at` + `confirmed_by`.

**API.**
- **New `POST /api/admin/policies/proxy-capture`** — creates the capture + provenance.
  - Auth: `requireRoleApi('admin')` + `requireAdminPermission('rule_authoring')`, CSRF, rate-limit 30/hr/admin.
  - Request (Zod): `{ rmRef: { mode: 'existing', rmId } | { mode: 'stub', name, bankName, email?, mobile? }, arrivalChannel, referenceNote?, policyPayload: <existing capture schema> }`
  - Response: `{ captureId, rmId }`
  - Writes audit row `policy_captured_on_behalf` (target_type: `rm_submission`, includes `captured_for_rm`).
- **New `GET /api/admin/rm-search?q=`** — typeahead for the RM picker (name/bank/email). Auth: admin. Rate-limit 60/min.
- **Extend the RM-side policy detail** to allow confirm: `POST /api/rm/policies/[id]/confirm-proxy` — flips provenance, RM-auth + ownership gate.

**Business logic.** Admin-captured policies enter the **same review/approval queue** as RM-submitted ones (`/dashboard/admin/policies/pms`), so there's no separate trust path — the difference is purely provenance. A policy can be: captured-by-admin → reviewed/approved → published, and independently → confirmed-by-RM (provenance upgrade) at any later time.

**Edge cases.**
- Admin captures for an RM who *later* signs up with a different email → match on mobile or let admin merge. (Merge is out of scope for v1; document as a known follow-up.)
- Two admins capture the same lender/product → the existing dedup/version logic in the PMS pipeline applies; surface "a capture already exists for this lender+product — open it?" on Step 0.
- Stub RM never confirms → policy stays live with `admin_manual_proxy` provenance indefinitely; that's acceptable (the data is still good), but Registry Health should be able to filter "unconfirmed proxy policies" for follow-up.

**Parity checklist.** The wizard is loan-product-aware already (it handles all 6 product types). Confirm Step 0 + the banner render correctly for every product type. Confirm the RM-side confirm flow works whether the RM is a real account or a promoted stub.

**i18n.** New strings for Step 0, the banner, the "Entered by admin on your behalf" badge, and all toasts → en/hi/mr.

**Test plan.**
- Unit: provenance object written correctly; stub creation idempotent; confirm flips provenance.
- Unit: `/api/admin/policies/proxy-capture` rejects non-admin, rejects missing rmRef, accepts both existing+stub modes.
- Manual: as admin, capture a policy for an existing RM end-to-end → see it in review queue → approve → switch to that RM → see the "entered on your behalf" badge → confirm → badge clears.

**Effort.** ~3–5 days (Step 0 + RM picker + provenance + RM-side confirm + tests; wizard steps reused). **Dependencies.** A.1 (shares `ensureRmProfile`). **Provenance/audit.** Every proxy capture and every confirmation writes an audit row — this is the whole point of the feature.

**Severity.** Serious — highest-value admin capability; unlocks the paper-based-RM lender segment.

---

# EPIC B — DSA-facing polish

**Why second:** the DSA dashboard is the most-used surface and scored lowest on polish (76% median). These six items remove the "v0.8 internal tool" feel. Three of them (B.1, B.2, B.3) compound — fixing the case label and the enum display cleans up the home page, the cases list, *and* the case detail header at once.

**Shared code facts (verified in audit):**
- A case's display title is stored on `Case.label` (MongoDB), set from `data.label` in `POST /api/cases` (`src/routes/api/cases/+server.ts:223`). The client builds that string in `src/lib/utils/formSubmitHandler.ts` at case creation. So **fixing labels = change the generator + backfill existing cases.**
- Loan type renders raw from `c.loan.type` (e.g. `home_loan`). The cases page already has a `STAGE_LABELS` map (`src/routes/dashboard/dsa/cases/+page.server.ts:14`); there is no equivalent `LOAN_TYPE_LABELS`. A `PRODUCT_TYPE_LABELS` map exists in `src/lib/types/policyEngine.ts` but is policy-engine-scoped.
- Applicant PII (name, mobile, PAN) is **CSFLE-encrypted** (SEC-2). This constrains search: you cannot regex-match an encrypted mobile. Equality lookup on a deterministically-encrypted field works; substring/regex does not. **This shapes B.5's search design.**

---

### B.1 — Case-label generator: applicant name + city, not ISO date

**Problem (from audit).** Cases are labelled by creation date — the Cases list shows "Home Loan — 2026-05-06" four times in a row, and the same date-label appears on the home page attention list and as the case-detail H1. A DSA thinks in customer names. *Example:* a DSA scanning 45 cases sees a wall of near-identical date-titles and cannot tell them apart.

**Outcome.** Every case is titled by its primary applicant + city + loan type — e.g. **"Rajesh K. — Mumbai · Home Loan"** — generated at creation and backfilled for existing cases.

**Screen(s).** No new screen. The label string changes everywhere `Case.label` renders: Cases list cards, Home "Needs Attention" + "Recent Cases", Case detail H1, Shared Links, RM "Cases Received", share-with-RM email subject.

New label format (precise rule):
```
<PrimaryApplicantShortName> — <City> · <LoanTypeLabel>
   e.g.  "Rajesh K. — Mumbai · Home Loan"
   e.g.  "Sharma Industries — Pune · Business Loan"   (company applicant)
```
- **PrimaryApplicantShortName** = first name + last-initial for an individual ("Rajesh K."); company/firm name for a company applicant ("Sharma Industries Pvt Ltd" → truncate to 30 chars).
- **City** = the case-route city (`propertyCityName` for secured, `residenceCityName` for unsecured, `businessCityName` for professional — per CLAUDE.md §10 Case Route Tracker Keys).
- **LoanTypeLabel** = the human label from B.2's map.
- **Fallback chain** (when a field is missing at creation time): if no applicant name yet → `"Untitled <LoanTypeLabel> · <date>"`; if no city yet → omit the city segment. Never produce a bare date again.

**States.**
- **Empty / incomplete at creation** → fallback chain above (a case created before the applicant step still gets a sensible title).
- **Edited** → the label is editable by the DSA (today `PATCH /api/cases/[case_id]` accepts `data.label` — `+server.ts:139`). A DSA can override the auto-label. Once manually edited, **do not auto-regenerate** (add `label_is_custom: true` flag so a later name change doesn't clobber the DSA's chosen title).

**Data model.**
- No schema change to `Case.label` itself. Add `Case.label_is_custom: boolean` (default false) to protect manual edits.
- **Backfill migration:** a one-time script `scripts/backfill-case-labels.ts` that, for every case where `label_is_custom` is falsy, regenerates the label from the stored applicant + city. Dry-run flag mandatory (per the operator-script convention in the codebase). Reads applicant name via the CSFLE decrypt path (the script runs server-side with `CSFLE_ENABLED`).

**API.**
- No new endpoint. Change the **generator** in `src/lib/utils/formSubmitHandler.ts` (creation) to call a new shared helper `buildCaseLabel(applicants, city, loanType)` in `src/lib/utils/caseLabel.ts`.
- Same helper is reused by the backfill script — single source of truth for the format.

**Business logic.** `buildCaseLabel` is a pure function: takes the primary applicant object, the case-route city, and the loan type; returns the formatted string with the fallback chain. Primary applicant = the one flagged primary, else the first applicant.

**Edge cases.**
- Multi-applicant case → use the primary; the card already shows "— 2 applicants" as a separate sub-line, keep that.
- Company applicant with no individuals → use firm name.
- Name contains only one word → "Rajesh" (no initial).
- Very long firm name → truncate at 30 chars + "…".
- Applicant renamed after creation → only regenerate if `label_is_custom` is false (and only via an explicit "reset label" action, not silently, to avoid surprising the DSA).
- CSFLE: backfill script must decrypt names; confirm it runs in a context with DEK access.

**Parity checklist.** All 6 loan types (city key differs per family — use the §10 mapping). Individual vs Company applicant. Single vs multi applicant. Confirm RM "Cases Received" and Shared Links also pick up the new label (they read the same `Case.label`).

**i18n.** The format separators are language-neutral; `LoanTypeLabel` comes from B.2 (translated). "Untitled" fallback → en/hi/mr.

**Test plan.**
- Unit: `buildCaseLabel` across individual / company / single-word-name / long-firm-name / missing-city / missing-applicant.
- Unit: manual edit sets `label_is_custom`; regeneration skips custom labels.
- Manual: create a case end-to-end → verify the title is "Name — City · Loan Type" on the cases list, home, and detail header. Run backfill dry-run on dev → spot-check 5 cases.

**Effort.** ~2 days (helper + generator wiring + backfill script + tests). **Dependencies.** B.2 (uses its loan-type label map). **Provenance.** Backfill writes a one-line audit summary (count of cases relabelled).

---

### B.2 — Enum → display label at the boundary

**Problem (from audit).** Raw enum values leak into the UI: `home_loan` appears in the Cases list loan-type filter, on each card's Type field, and in the Case detail "Type" field. *Example:* the loan-type filter dropdown literally shows "home_loan" between "Professional Loan" and "All Lenders".

**Outcome.** Loan types always render as human labels ("Home Loan"), fixed once at the data boundary so no consumer ever sees the raw enum (CLAUDE.md §16 rule 11 — fix at source, not per-consumer).

**Screen(s).** No new screen. Affects: Cases list loan-type filter + cards, Case detail Type field, CRM, RM encode wizard "Loan Product" field (shows `home` — see Epic C parity), anywhere `loan.type` / `product_type` renders.

**Data model.** No DB change. Add one canonical map:
```
// src/lib/config/loanTypeLabels.ts
export const LOAN_TYPE_LABELS: Record<string, string> = {
  home_loan: 'Home Loan',
  lap: 'Loan Against Property',
  plot_loan: 'Plot & Construction Loan',
  personal_loan: 'Personal Loan',
  business_loan: 'Business Loan',
  professional_loan: 'Professional Loan',
  // + BT / top-up variants
};
export function loanTypeLabel(t: string): string {
  return LOAN_TYPE_LABELS[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
```
The fallback title-cases unknown values so a new enum never shows as raw `snake_case` even before the map is updated.

**API.** Apply `loanTypeLabel()` at the **server load boundary**, not in templates: in `computeCaseFields` (`cases/+page.server.ts`) return both `loan_type` (raw, for filtering) and `loan_type_label` (display). The filter `<option>` uses label for display, raw value for the query param. Same treatment in CRM load, case-detail load, RM encode load.

**Business logic.** Filtering stays keyed on the raw enum (so URLs/queries are stable); only display switches to the label.

**Edge cases.**
- Unknown/legacy enum → title-cased fallback (never raw).
- BT / top-up variants → ensure the map covers them (grep `loan.type` writes).
- The filter must send the raw value as the query param even though it shows the label (classic value/label split).

**Parity checklist.** Every surface that renders `loan.type` or `product_type`. Includes RM encode wizard's "home" display (Epic C references this same fix). Single source: the map.

**i18n.** `LOAN_TYPE_LABELS` values should resolve through the i18n `t()` system so hi/mr get translated labels — wire the map keys to i18n keys.

**Test plan.**
- Unit: `loanTypeLabel` for every known enum + an unknown value (fallback).
- Manual: Cases filter shows "Home Loan" not "home_loan"; selecting it still filters correctly (raw value in URL).

**Effort.** ~1 day. **Dependencies.** None (B.1 depends on this). **Provenance.** N/A.

---

### B.3 — Case-detail header: applicant identity

**Problem (from audit).** The case-detail page header shows only the loan + case ID. *Example:* a DSA on the phone with a bank has no applicant name/mobile visible without scrolling. The H1 also duplicates the same string as the first H3 below it.

**Outcome.** The case-detail header shows the applicant's name + mobile + loan summary at a glance; no duplicated heading.

**Screen(s).** Case detail header (`src/routes/dashboard/dsa/cases/[case_id]/+page.svelte`):
```
┌──────────────────────────────────────────────────────────┐
│ ‹ Cases                                                    │
│ Rajesh Kumar  ·  📱 98XXXXXX64        [Intake] [⋯ actions] │
│ Home Loan · ₹40 L · 19 yr · Mumbai      CS-2026-0055       │
└──────────────────────────────────────────────────────────┘
```
- Line 1: applicant name (bold) + masked mobile (tap to reveal/copy) + stage badge + actions menu.
- Line 2: loan summary (type · amount · tenure · city) + case ID (de-emphasized).
- Remove the duplicate H3 that repeats the title.

**States.**
- **Multi-applicant** → show primary + "+1 more" chip that expands the applicant list.
- **Mobile masked by default** (last 4 shown) with a copy button — respects PII-minimization; full reveal is a deliberate tap (and could be audit-logged later).
- **Company applicant** → firm name on line 1, authorized-signatory mobile if present.

**Data model.** None — reads existing applicant data already loaded for the page.

**API.** None — the case-detail load already fetches applicants; surface name + mobile in the header view-model.

**Edge cases.** No applicant yet (early-stage case) → "Untitled case" + prompt "Add applicant details". Mobile missing → omit the phone chip.

**Parity checklist.** All loan types. Individual vs Company. Confirm the masked-mobile reveal works on mobile viewport (one-handed).

**i18n.** "Cases" back-link, "more", "Add applicant details" → en/hi/mr.

**Test plan.** Manual: open a case → name + masked mobile in header → reveal/copy works → no duplicated title. Multi-applicant shows "+N more".

**Effort.** ~1 day. **Dependencies.** B.1/B.2 for the loan summary label. **Provenance.** (Optional, later) log full-mobile reveals.

---

### B.4 — Home page cleanup

**Problem (from audit).** Four issues on the DSA home: (a) the "Needs Attention" list showed five identical-looking rows; (b) the notification bell has no count badge despite 8 cases needing attention; (c) "Delete Account" sits permanently in the sidebar (mis-click risk); (d) no global search.

**Outcome.** Attention list is scannable, the bell shows a count, Delete Account is moved to a settings danger-zone, and a global search box sits in the top bar.

**Screen(s).**
- **Needs Attention** — each row uses the new B.1 label (so they're no longer identical) + a distinct reason chip ("Stuck 86d", "3 docs pending", "Query open"). Collapse duplicates of the *same* reason into "5 cases stuck in Intake →" group headers when more than 3 share a reason. Replace "+3 more items" with "View all 8 →".
- **Notification bell** — red dot with count when unread > 0; number badge up to "9+".
- **Delete Account** — removed from sidebar; relocated to `/dashboard/dsa/profile` → new "Danger Zone" section at the bottom with a confirm dialog.
- **Global search** — top-bar search input, placeholder "Search cases by name, mobile, PAN, or ID" (wired to B.5's search).

**States.**
- Attention empty → "You're all caught up 🎉 — nothing needs attention today."
- Bell zero unread → no badge.
- Search empty/no results → "No cases match '<query>'."

**Data model.** None new (notification count already computed by NotificationBell's query).

**API.** Global search reuses B.5's endpoint. Notification count already exists (NotificationBell uses a `createQuery` per PERF-3 work).

**Edge cases.** Attention list with mixed reasons → group only when ≥3 share a reason, else list individually. Delete Account confirm must require typing "DELETE" (destructive-action guard).

**Parity checklist.** Confirm Delete Account removal doesn't orphan the only deletion entry point — the profile danger-zone is now canonical (ties to Epic E account-deletion work).

**i18n.** All new copy → en/hi/mr.

**Test plan.** Manual: home shows grouped attention with distinct labels; bell shows count; Delete Account gone from sidebar, present in profile danger-zone behind confirm; search box routes to results.

**Effort.** ~2 days. **Dependencies.** B.1 (labels), B.5 (search endpoint). **Provenance.** Account-deletion audit handled in Epic E.

---

### B.5 — Cases list: search, sort, bulk, list-view

**Problem (from audit).** Search only matches case label or ID — not mobile/PAN/name (how DSAs actually search). No sort control, no bulk actions, no table/list view for high-volume DSAs.

**Outcome.** DSAs can find a case by customer mobile/PAN/name, sort the list, act on several cases at once, and switch to a dense list view.

**Screen(s).**
```
┌─ My Cases (45) ──────────────────────────── [+ New Case] ─┐
│ [🔎 name, mobile, PAN, or ID]  Sort:[Updated ▾]  ⊞ ☰     │
│ [All Stages▾] [All Types▾] [All Lenders▾]   ✕ Clear (2)   │
│ ☐ Select all                                              │
│ ☐ Rajesh K. — Mumbai · Home Loan   Intake   ₹40L  1w ago │
│ ☐ Priya S. — Pune · LAP            Profiling ₹80L 3d ago │
│ ...                                                       │
│ [ When ≥1 selected:  Move to ▾ | Export | Share ]         │
└────────────────────────────────────────────────────────────┘
```
- **Search**: placeholder "name, mobile, PAN, or ID". Behavior split (see edge cases — encrypted fields use exact match, label/ID use substring).
- **Sort**: Updated (default) / Created / Amount high-low / Stuck-longest / Name A-Z.
- **View toggle**: ⊞ cards (default) / ☰ dense list rows.
- **Bulk**: checkbox per row + "select all"; action bar appears when ≥1 selected — "Move to stage ▾", "Export (CSV)", "Share".
- **Clear filters**: shows count of active filters with an ✕.

**States.**
- No results → "No cases match. Try a mobile number or PAN." + clear-filters link.
- Bulk action in progress → row-level spinners; disable the action bar until done.
- Export → downloads CSV of the filtered set (respels PII rules — see edge cases).

**Data model.** None new for sort. For mobile/PAN search on encrypted fields: rely on the existing CSFLE **deterministic** encryption to do equality lookup (the same pattern DATA-2 uses for mobile dedup). If name is randomly-encrypted (not deterministic), name search must match the **plaintext label** (which now contains the name via B.1) rather than the encrypted field.

**API.** Extend `cases/+page.server.ts` + `GET /api/cases`:
- Add `sort` param (whitelist: `updated`/`created`/`amount`/`stuck`/`name`).
- Search: if the query looks like a 10-digit mobile → deterministic-encrypt it and equality-match the applicant mobile field; if it looks like a PAN (regex `[A-Z]{5}[0-9]{4}[A-Z]`) → same; otherwise regex-match `label` + `case_id` (label now carries the name). This keeps it CSFLE-safe.
- New `POST /api/cases/bulk` for stage-move on multiple case IDs (ownership-gated per case, audit row each).
- New `GET /api/cases/export.csv` for the filtered set.

**Business logic.** Search-type detection by input shape (10 digits → mobile; PAN regex → PAN; else text). This avoids trying to regex an encrypted column.

**Edge cases.**
- Mobile stored as Number vs string → reuse dual-lookup pattern.
- Encrypted-field equality only works if the field is deterministically encrypted; confirm which SEC-2 DEK mode applies to applicant mobile/PAN. If randomly encrypted → fall back to label-based name match and document the limitation.
- CSV export must obey PII rules — exclude fields the DSA shouldn't export in bulk (align with the v1-PDF-no-PII principle; export case-management fields, not raw borrower PII unless consented).
- Bulk stage-move must validate each transition is legal for that case's current stage.

**Parity checklist.** RM "Cases Received" should get the same search/sort treatment (Epic C). Don't double-build — share the endpoint.

**i18n.** All controls + empty states → en/hi/mr.

**Test plan.**
- Unit: search-type detection (mobile/PAN/text); sort whitelist rejects junk.
- Unit: bulk stage-move rejects illegal transitions; ownership-gated.
- Manual: search by a known applicant mobile finds the case; sort by amount works; select 3 → move to Profiling; export CSV opens.

**Effort.** ~3 days. **Dependencies.** B.1 (label carries name for text search), SEC-2 (confirm encryption mode). **Provenance.** Bulk actions + exports each write an audit row.

---

### B.6 — Analytics page fixes

**Problem (from audit).** Three credibility bugs on `/dashboard/dsa/analytics`: (a) "Total Sanctioned Amount" target is ₹1,000 — nonsensical for home loans; (b) when a metric has no data it shows "Excellent — 100%", rewarding inactivity; (c) the page is labelled "PRO / unlocks later" in the sidebar but is fully accessible.

**Outcome.** Targets are sensible, no-data shows as neutral (not "Excellent"), and the PRO label matches reality.

**Screen(s).** Same page; three corrections:
- Sanctioned-amount target → a realistic default per loan mix (or remove the absolute target and show trend instead). *Example:* target "₹2 Cr disbursed value/month" configurable, not ₹1K.
- No-data metric → render "—  No data yet" with neutral grey, **not** a green "Excellent". Status only computes once there's ≥1 data point.
- PRO gating → either (a) actually gate the page behind Pro and show an upgrade prompt to free users, or (b) remove the "unlocks later/PRO" label. **Decision needed: is Analytics a Pro feature?** If yes → gate it + upsell screen. If no → drop the label. (Flag for owner at execution.)

**States.**
- Free user + Analytics-is-Pro → upgrade screen: "Analytics is a Pro feature. See your performance trends, conversion, and lender insights. [Upgrade to Pro]".
- New user, no data → all metrics show "— No data yet" + a one-line "Your stats appear as you work cases."

**Data model.** Targets move to config (`src/lib/config/analyticsTargets.ts`) with sane defaults; ideally per-tier or per-DSA-volume-bucket.

**API.** None new — fix the target source + the status computation (no-data → neutral).

**Business logic.** Status thresholds (Critical/Needs-Improvement/Excellent) only apply when `dataPoints ≥ 1`; otherwise status = `none`.

**Edge cases.** Brand-new DSA (everything zero) → all neutral, encouraging copy, not "Critical 34/100" (the score itself should also account for tenure — soft-start for first 90 days).

**Parity checklist.** RM Analytics (Epic C) has the same empty-state pattern — apply the no-data-neutral rule there too.

**i18n.** "No data yet", upgrade copy → en/hi/mr.

**Test plan.** Unit: status = none when no data; sensible target defaults. Manual: new account shows neutral metrics, not "Excellent"; PRO label resolved per decision.

**Effort.** ~1 day (+0.5 if Pro-gating screen is built). **Dependencies.** Pricing-fence decision overlaps Epic D. **Provenance.** N/A.

---

**Epic B effort total:** ~10–11 dev-days. **Hard dependency:** B.2 before B.1; SEC-2 encryption-mode confirmation before B.5.

---

# EPIC C — RM + Admin polish

**Why third:** these surfaces scored 78% (RM) / 80% (Admin). The RM dashboard has a standout page (encode wizard, 25/25) but a barren home and one broken page; the admin dashboard is strong but has blind spots (user-action auditing, surfaced impersonation) and trust-eroding test-data leaks. Epic C raises the floor on both.

**Shared code facts (verified in audit + this session):**
- RM home (`src/routes/dashboard/rm/+page.server.ts`) **already imports** Cases, RMSubmissions, PolicyVersions, PolicyRules, Lenders, LenderProducts, ProductVariations, DsaApplications. So KPIs are mostly "compute + surface what's already loaded," not new queries.
- The admin audit log is `PolicyAuditLog` (`src/lib/types/policyEngine.ts:518`) with `target_type` as an 8-value union (`lender|product|variation|geo_scope|policy_rule|policy_version|rm_submission|comment`) and a 2-year TTL. Extending it = widen that union + add the new write sites.
- Admin impersonation is built: `/api/admin/impersonate/start`, `/api/admin/impersonate/exit`, `src/lib/server/adminImpersonation.ts`, `AdminImpersonationBanner.svelte`. **Not surfaced in the Users table** — only "Suspend" shows.
- Lender counts diverge by source: `Lenders` collection (status filter), `PolicyRules`, `RmLenderAssignments`, and "published policies." Reconciliation = name them, pick the canonical.

---

### C.1 — RM Home KPIs (turn the barren home into a workspace)

**Problem (from audit).** The RM home shows only a greeting and one "Find DSAs Near You" button. An RM whose job is reviewing cases and maintaining policies sees nothing actionable. *Example:* "Good evening, there." + empty state, even though the load already has the data to say "3 cases waiting for you."

**Outcome.** The RM home opens with a compact KPI strip + an "attention" list, mirroring the DSA home's usefulness.

**Screen(s).**
```
┌─ Good evening, Neha ─────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 3        │ │ 2        │ │ 78       │ │ 4.6★     │     │
│  │ Cases    │ │ Policies │ │ Lenders  │ │ Reputation│     │
│  │ to review│ │ need     │ │ you own  │ │ score     │     │
│  │          │ │ verify   │ │          │ │           │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                          │
│  NEEDS YOUR ATTENTION                                    │
│  • SBI verification due in 6 days        [Verify →]      │
│  • 3 cases shared by DSAs await review   [Review →]      │
│  • 1 policy suggestion from a DSA        [View →]        │
│                                                          │
│  [ Find DSAs Near You ]   [ Capture a Policy ]           │
└────────────────────────────────────────────────────────────┘
```
- Four KPI cards: cases-to-review, policies-needing-verification, lenders-owned, reputation-score (the last shows "—" until rated).
- An attention list (verification-due, cases-awaiting-review, DSA suggestions).
- Two CTAs (the existing "Find DSAs" + a new "Capture a Policy" pointing at the policy-capture wizard — the second core RM workflow).
- Greeting falls back to mobile if no name (fixes "there.").

**States.**
- All-zero (brand-new RM) → KPIs show 0 with encouraging copy; attention list shows "Nothing needs you yet — set up your first policy" with the Capture CTA highlighted.
- Reputation not yet rated → "—" not "0".
- Loading → skeleton KPI cards.

**Data model.** None new — counts derive from already-loaded collections (cases assigned to this RM's lenders, policies with verification-due dates, owned lenders count, reputation from analytics).

**API.** Extend the existing `+page.server.ts` return with `kpis` + `attention[]`. No new endpoint.

**Business logic.** "Cases to review" = cases shared to this RM in a review-pending state. "Policies need verify" = owned policies past/near their verification-due date (the same data driving the existing "SBI due in 6 days" banner). "Lenders you own" = count of RmLenderAssignments. Reputation = from RM analytics.

**Edge cases.** RM with no profile (pre-A.1) → A.1 must land first so the home doesn't error. RM owning 0 lenders → KPI shows 0 + "Capture a Policy" CTA.

**Parity checklist.** Greeting fallback (mobile) should match the DSA pattern. The attention-list pattern mirrors DSA home (B.4) — reuse the component.

**i18n.** All KPI labels + attention copy + "Capture a Policy" → en/hi/mr.

**Test plan.** Manual: log in as RM with assigned lenders → see KPI counts + attention items; brand-new RM → encouraging empty state, no error.

**Effort.** ~2 days. **Dependencies.** A.1 (RM profile must exist). **Provenance.** N/A.

---

### C.2 — Policy Library: search + last-verified date

**Problem (from audit).** 78 lenders with no search box — browser Ctrl+F only. Every entry shows "Verified" with no date, so the badge is meaningless. *Example:* finding "HDFC" among 78 means scrolling.

**Outcome.** Search/filter the library, and the badge shows when each was last verified.

**Screen(s).** Add to `/dashboard/rm/policies`:
```
┌─ Policy Library ───────────────── [+ Add Lender] ─────────┐
│ [🔎 Search lenders]   Type:[All ▾]  Sort:[Recently verified ▾]│
│ ⚠ SBI verification due in 6 days  [Verify now →]          │
│  HDFC Bank        PVT   ✓ Verified 2mo ago   [Open]       │
│  ICICI Bank       PVT   ⚠ Verify soon (5d)   [Open]       │
│  ...                                                      │
└────────────────────────────────────────────────────────────┘
```
- Search box (client-side filter on the loaded list — 78 is small enough to filter in-memory).
- Type filter (NBFC/HFC/GOV/PVT/SFB).
- Sort: recently-verified / due-soonest / A-Z.
- Badge: "✓ Verified <relative time>" or "⚠ Verify soon (Nd)" or "⛔ Overdue".

**States.** No search match → "No lenders match '<query>'." Overdue verification → red badge sorts to top.

**Data model.** Uses an existing `last_verified_at` on the lender-assignment/policy record. If absent, **add `last_verified_at: Date`** and backfill from the most recent verification audit entry.

**API.** None new (data already loaded). If `last_verified_at` is added, the verification action must stamp it.

**Edge cases.** Lender never verified → "Not yet verified" neutral badge, sorts appropriately.

**Parity checklist.** Same search/sort/relative-time pattern as B.5 cases list — reuse the relative-time helper (`formatTimeAgo` exists per CLAUDE.md §14).

**i18n.** Badge phrases + sort labels → en/hi/mr.

**Test plan.** Manual: search "HDFC" filters instantly; badge shows real relative dates; overdue sorts to top.

**Effort.** ~1.5 days (+0.5 if `last_verified_at` backfill needed). **Dependencies.** None. **Provenance.** Verification action stamps `last_verified_at`.

---

### C.3 — Broadcasts: reach preview + delivery metrics

**Problem (from audit).** The RM Broadcasts feature doesn't say how many DSAs a broadcast reaches or whether anyone read it. *Example:* an RM sends an update into a void.

**Outcome.** Before sending, the RM sees the reach count; after sending, open/click metrics.

**Screen(s).**
- Compose screen adds: "This will reach **23 connected DSAs**" above the send button.
- Sent-broadcast list adds per-row metrics: "Sent 23 · Opened 12 · Clicked 4".

**States.** Zero connected DSAs → send disabled with reason "You have no connected DSAs yet — connect with DSAs first." Metrics pending → "Delivering…".

**Data model.** Add a `broadcast_recipients` sub-record or `delivery_stats: { sent, opened, clicked }` on the broadcast doc. Open tracking via a tracking pixel or read-receipt on the in-app notification; click tracking via wrapped links.

**API.** Extend the broadcast create endpoint to compute + store recipient count (it already resolves `target_dsa_ids` — `src/routes/api/rm/broadcasts/+server.ts:81`). New lightweight `GET /api/rm/broadcasts/[id]/stats`.

**Business logic.** Reach = count of connected DSAs at send time (frozen). Opened = distinct DSAs who viewed. Clicked = distinct link clicks.

**Edge cases.** DSA disconnects after a broadcast → historical reach count stays frozen (it reflects send-time truth).

**Parity checklist.** Mirrors the DSA Communication Hub's eventual analytics (Epic H i18n templates note usage analytics) — keep the metric shape consistent.

**i18n.** "will reach N DSAs", "Opened", "Clicked", disabled reason → en/hi/mr.

**Test plan.** Manual: compose shows reach count; send; list shows sent/opened/clicked.

**Effort.** ~2 days. **Dependencies.** None. **Provenance.** N/A.

---

### C.4 — Surface Impersonation in the admin Users table

**Problem (from audit).** Admin impersonation is fully built in code but the Users table only offers "Suspend" — admins can't actually start an impersonation session from where they need to. *Example:* support gets "DSA Rajesh can't see his results"; the admin has no button to log in as Rajesh and look.

**Outcome.** Each user row has an "Impersonate" action that starts a consented, audited impersonation session.

**Screen(s).** Users table Actions column gains a button:
```
  Name      Phone        Last Active   Status   Actions
  Rajesh K  98XXXXXX64   19 May        Active   [Impersonate] [Suspend ▾]
```
Clicking "Impersonate" → confirm dialog:
```
  Log in as Rajesh Kumar?
  You'll see their dashboard exactly as they do. This action is
  logged. A banner will show you're impersonating; click "Exit"
  to return to admin.
  Reason (required): [ Debugging reported results issue        ]
                                          [ Cancel ] [ Start ]
```
The existing `AdminImpersonationBanner.svelte` already handles the in-session banner + exit.

**States.** Suspended/deleted user → Impersonate disabled with reason. Self → no Impersonate on own row.

**Data model.** None new — `adminImpersonation.ts` exists. Add the `reason` to the impersonation audit row.

**API.** Wire the button to the existing `POST /api/admin/impersonate/start` (pass `reason`); banner's exit uses `/exit`. No new endpoint; add `reason` to the start payload + audit.

**Business logic.** Impersonation must write an audit row at start AND exit (start: who, whom, reason, when; exit: duration). This is the consent+audit requirement from the audit's Lens 13.

**Edge cases.** Impersonating an admin → block (no admin-impersonates-admin). Session timeout during impersonation → auto-exit + audit.

**Parity checklist.** Ties to C.5 (the impersonation audit rows need the expanded audit-log scope to be queryable).

**i18n.** Dialog copy + button → en/hi/mr.

**Test plan.** Manual: impersonate a DSA → see their dashboard + banner → exit → back to admin; audit log shows start+exit with reason. Confirm can't impersonate an admin or self.

**Effort.** ~1 day (wire-up + reason + audit). **Dependencies.** C.5 (audit-log scope) for queryability. **Provenance.** The whole point — start+exit audit rows.

---

### C.5 — Expand Audit Log scope to user/payment/admin actions

**Problem (from audit).** The audit log (`PolicyAuditLog`) only tracks policy state transitions. Admin actions on people and money — suspend, refund, impersonation, role grant, permission change — are invisible. *Example:* an admin suspends a DSA; nothing records who/when/why.

**Outcome.** One audit stream covers policy AND user/payment/admin actions, queryable in the existing Audit Log UI.

**Screen(s).** The existing Audit Log page (`/dashboard/admin/audit`) gains the new target types in its "Target Type" filter dropdown and renders the new action rows. No layout change — just more values.

**Data model.** Widen `PolicyAuditLog.target_type` (rename concept to `AuditLog` if desired) to add: `user`, `payment`, `refund`, `impersonation`, `permission_change`, `subscription`. Add matching `AuditAction` values (`user_suspended`, `user_reactivated`, `refund_issued`, `impersonation_started`, `impersonation_ended`, `permission_granted`, `permission_revoked`, `role_changed`). Keep the 2-year TTL — **but** payment/refund rows need 6-year retention (Epic E), so either give those rows a different TTL or move money-events to a separate non-TTL collection. **Decision flagged for Epic D/E:** money-audit rows must not be TTL-deleted at 2 years.

**API.** Add audit writes at each new action site: suspend (admin/users), refund (Epic D), impersonation start/exit (C.4), permission toggle (admin settings), role grant (set-role). A shared `writeAuditLog(entry)` helper centralizes it.

**Business logic.** Every privileged admin action calls `writeAuditLog`. The Audit Log UI query already filters by target_type/action — it just gets more values.

**Edge cases.** High-volume actions (e.g. bulk suspend) → batch audit writes. Money rows → routed to the 6-year-retention path.

**Parity checklist.** C.4 (impersonation) and Epic D (refund) and Epic E (retention) all write through this helper. Single source.

**i18n.** New action labels in the filter dropdown → en/hi/mr.

**Test plan.** Unit: `writeAuditLog` writes correct shape per action; money rows get long retention. Manual: suspend a user → row appears in Audit Log filtered by `user`; refund → appears under `refund`.

**Effort.** ~2 days. **Dependencies.** Touches C.4, Epic D, Epic E (shared helper). **Provenance.** This IS the provenance infrastructure.

---

### C.6 — Lender-count reconciliation

**Problem (from audit).** "How many lenders" reports differently per page: 288 (admin policies header), 78 (RM library), 62 (admin stat card), 0 published (registry health). *Example:* you can't answer "how many banks do we cover?" consistently — a number you'll quote to customers and investors.

**Outcome.** One canonical "lenders covered" number with a clear definition, surfaced consistently; the other counts are relabeled to say what they actually mean.

**Screen(s).** No new screen. Relabel the existing counts so each is unambiguous:
- "288 lender records" → the raw Lenders collection (master list).
- "78 lenders with an assigned RM" → RmLenderAssignments.
- "62 active lenders" → Lenders with status=active.
- "X lenders with ≥1 published policy" → the real coverage number (currently 0 — see C.6 note below).
- The customer/investor-facing number = **"lenders with ≥1 published policy"** (the only one that means "we can actually evaluate against this bank").

**Data model.** None new — these are different queries on existing collections. The fix is labeling + picking the canonical.

**API.** A shared `getLenderCoverageStats()` helper returning all four counts with their definitions, used wherever a lender count renders.

**Business logic.** Define canonical coverage = distinct lenders having at least one `PolicyRule` in published state.

**Edge cases.** The "0 published" finding (registry health) — **this is a real diagnostic, not just a labeling issue.** If 78 lenders have RMs but 0 policies are published, the encode→submit→approve→publish pipeline is stuck. **C.6 includes a diagnostic task:** trace why published count is 0; fix the pipeline or the counter. (May spill into its own ticket if the pipeline is genuinely broken.)

**Parity checklist.** Every page showing a lender count uses `getLenderCoverageStats()`.

**i18n.** The clarified labels → en/hi/mr.

**Test plan.** Unit: `getLenderCoverageStats` returns the four counts correctly on seed data. Manual: every page's lender count matches its label; investor number = published-policy count.

**Effort.** ~1 day labeling + reconciliation; **+ unknown** for the "0 published" pipeline diagnostic (could be 0.5 day if a counter bug, or its own ticket if the pipeline is broken). **Dependencies.** None. **Provenance.** N/A.

---

### C.7 — Test-data sanitization

**Problem (from audit).** Test/sample data appears in production-shaped UI across RM and Admin surfaces: "Sample GOV Bank / NBFC / PVT Bank", "SEC-5 R1 Test Lender A", "Test RM" (4 confirmations), "xyz bank", "testing", duplicate "LIC Housing Finance" and "State Bank of India" in dropdowns, "E2E Test User/Admin" in the Users table. *Example:* a real DSA could mistake "xyz bank" for a real lender and attach a customer to it.

**Outcome.** Test/sample/E2E data is flagged and excluded from all production-facing UI; dropdowns are deduplicated.

**Screen(s).** No new screen — affected lists (RM Contacts, lender dropdowns, Users table, policy library) stop showing test entries in non-dev environments.

**Data model.** Ensure every seedable entity carries `is_sample` / `is_test` (Cases already have `is_sample` per AD-08). Add `is_test` to: Lenders, rmApplications, RM contacts where missing. Dedupe the Lenders collection (the LIC/SBI duplicates are real data-hygiene bugs — a one-time merge).

**API.** Every production-facing query adds `{ is_test: { $in: [false, null] } }` (and `is_sample` exclusion where the surface shouldn't show demo data). A shared query-filter helper prevents per-query drift.

**Business logic.** Two layers: (1) a one-time **cleanup migration** that flags/merges existing junk (`scripts/sanitize-test-data.ts`, dry-run mandatory); (2) a **standing filter** so future test data never leaks (queries exclude `is_test`).

**Edge cases.** Dev environment should still SHOW test data (so the team can test) — the filter is environment-aware (`dev` shows all; prod excludes test). E2E accounts must keep working in the E2E env.

**Parity checklist.** Every list across DSA/RM/Admin that shows lenders/RMs/users/cases. Audit each surface.

**i18n.** N/A (data, not copy).

**Test plan.** Unit: the standing filter excludes `is_test` in prod, includes in dev. Manual (prod-like env): RM Contacts, lender dropdowns, Users table show no "Sample"/"Test"/"xyz" entries; LIC/SBI appear once.

**Effort.** ~2 days (cleanup script + standing filter + audit each surface). **Dependencies.** None. **Provenance.** Cleanup script logs what it flagged/merged.

---

### C.8 — Duplicate-render diagnosis & fix

**Problem (from audit).** Repeated identical rows: "🧪AU Small Finance Bank" appeared 4× on the admin home Quick-Test list; the DSA home "Needs Attention" showed 5 identical "Home Loan — stuck 86 days" rows. *Example:* both read as "broken UI."

**Outcome.** No surface shows accidental duplicate rows; genuinely-multiple items are grouped or distinguished.

**Diagnosis first (this item is investigate-then-fix, not assume-a-fix).** Three candidate causes, to be confirmed during execution:
1. **Genuine duplicate data** — the DSA-home "5 identical" may be 5 real seed cases sharing the date-fallback label (→ **fixed by B.1's real labels**; verify after B.1 lands).
2. **One-row-per-product not grouped** — "AU Small Finance Bank ×4" may be one row per loan product (Home/LAP/etc.) that should be grouped under the lender (→ group by lender, show product count).
3. **Missing `{#each}` key** — if neither of the above, a Svelte keyed-each is missing/duplicated (→ add a stable key).

**Screen(s).** Admin Quick-Test list groups by lender ("AU Small Finance Bank · 4 products"). DSA attention list is handled by B.4's grouping.

**Data model.** None.

**API.** None (presentation).

**Business logic.** Group repeated lender rows; rely on B.1 for case-label distinctness.

**Edge cases.** A lender genuinely with 1 product → no group header needed.

**Parity checklist.** Check every dashboard list for the same pattern once the root cause is known.

**i18n.** "N products" → en/hi/mr.

**Test plan.** Manual: admin home shows each lender once with a product count; DSA attention rows are distinct after B.1.

**Effort.** ~1 day (diagnosis + the grouping fix). **Dependencies.** B.1 (resolves cause #1). **Provenance.** N/A.

---

**Epic C effort total:** ~12–13 dev-days (+ the unbounded "0 published policies" diagnostic in C.6, which may spin into its own ticket). **Key dependency:** A.1 before C.1; B.1 before C.8.

---

# EPIC D — Money (subscription now + corporate-DSA payout later)

**Why fourth:** after blockers and polish, the revenue machinery is the next thing real operations will lean on. The subscription engine works, but the CFO surface around it (invoices, refunds, dunning, reconciliation, an enforced paywall) isn't built. This epic is split into **D-now** (build in this program) and **D-later** (fully specified, executed as its own program when you flip to the corporate-DSA model).

**Shared code facts (verified this session):**
- Plans in `src/lib/config/billing.ts`: Basic (₹999, 10 cases) / Pro (₹3,999, 50) / Enterprise (₹9,999, ∞). Trial = 7 days of Pro features. DA (Doc Assessment) tiers + top-up packs exist separately.
- **The paywall primitive already exists** — `getActiveCaseLimit(sub)` and per-plan `caseLimit`. The audit found 43 active cases on a no-plan account because **nothing calls this at case creation.** The fence fix is *enforcement*, not new logic.
- No annual duration (`durationMonths: 1` only). No GST field on plans.
- Billing today uses one-time Razorpay `orders` (`/api/razorpay/order` + `/api/billing/subscribe`), HMAC-verified, idempotent, with `BillingTransactions` audit rows. Razorpay SDK (`razorpay`) is already a dependency; the Subscriptions API is **not** yet used.
- Cancel is cancel-at-period-end. Trial/renewal reminders exist (`/api/billing/trial-reminder`). No refund, no GST invoice, no dunning, no reconciliation today.

---

## D-NOW (in scope for this program)

### D.1 — Recurring billing (speced both ways; recommendation = Razorpay Subscriptions)

**Problem (from audit).** DSAs pay manually every month (one-time orders). No auto-pay, no eNACH, no retry on a failed renewal. *Example:* a DSA forgets to re-pay, silently loses access mid-month.

**Outcome.** DSAs authorize once; renewals debit automatically; failures retry; our system stays in sync via webhooks.

**This item is speced BOTH ways per owner request (§3 of this doc). Decision required before execution.**

#### Option 1 — Razorpay Subscriptions (recommended)

**Screen(s).**
- Billing page "Subscribe" flow changes from a one-time checkout to a **mandate authorization**: "Set up auto-pay — you'll be charged ₹3,999 every month. Cancel anytime." The Razorpay checkout handles the eNACH/UPI-AutoPay/card-mandate UI.
- A new "Manage subscription" panel on the Billing page: current plan, next charge date, payment method, "Pause" / "Cancel" / "Switch plan".

**Data model.** On the DSA's `subscription` object add: `razorpay_subscription_id`, `mandate_status` (`created|authenticated|active|paused|halted|cancelled`), `next_charge_at`, `payment_method` (masked). Keep `status`/`expires_at`/`plan`/`case_limit` for compatibility.

**API.**
- **New `POST /api/billing/subscribe-recurring`** — creates a Razorpay Subscription against the plan's Razorpay Plan ID, returns the checkout token. Auth: `requireRoleApi('dsa')`, CSRF, rate-limit 5/hr.
- **New `POST /api/razorpay/webhook`** — HMAC-verified (Razorpay webhook secret). Handles `subscription.activated`, `subscription.charged` (extend `expires_at`, write BillingTransaction + GST invoice via D.2), `subscription.pending`/`payment.failed` (trigger dunning D.4), `subscription.halted`/`subscription.cancelled` (downgrade). **Idempotent** by Razorpay event ID.
- **Razorpay Plan objects** — created once per tier (Basic/Pro/Enterprise + annual variants) via Razorpay dashboard/API; their IDs stored in config/env.

**Business logic.** The webhook is the source of truth for subscription state — we never assume a charge succeeded; we wait for `subscription.charged`. Each successful charge → extend access + generate invoice. Each failure → dunning.

**Migration path (existing one-time-paid users).** Grandfather them: keep their current `expires_at`; at their next renewal, prompt "Switch to auto-pay" instead of a manual re-pay. No forced migration mid-cycle.

**Edge cases.** Mandate authentication abandoned → subscription stays `created`, no access granted. Webhook arrives before our DB write completes → idempotent handler retries safely. Razorpay and our DB disagree → webhook wins; a daily reconcile (D.5) catches drift.

#### Option 2 — Keep one-time orders, build recurring ourselves

**Delta from Option 1.** We register an eNACH mandate via Razorpay's standalone eMandate API, run a cron that initiates each cycle's debit, implement our own retry schedule + failure state machine, and still build everything in Option 1's "we build" list (webhook, dunning, invoices). ~8–10 days vs ~3.

**States (both options).** Mandate pending / active / paused / failed / cancelled — each with clear Billing-page copy. Failed → dunning banner "Update your payment method".

**Parity checklist.** DA top-up purchases (`da-topup`) stay one-time (they're consumable packs, not recurring) — only the subscription goes recurring.

**i18n.** Auto-pay setup copy, manage-subscription panel, mandate-status labels → en/hi/mr.

**Test plan.** Unit: webhook handler idempotency + each event type. Manual (Razorpay test mode): set up a mandate → simulate `subscription.charged` → access extends + invoice generated; simulate `payment.failed` → dunning fires.

**Effort.** Option 1 ~3 days · Option 2 ~8–10 days. **Dependencies.** D.2 (invoice on charge), D.4 (dunning on failure). **Provenance.** Every charge/failure → BillingTransaction + audit row.

---

### D.2 — GST invoice generation

**Problem (from audit).** No tax invoice is issued to the DSA. *Example:* a GST-registered DSA pays ₹3,999 and gets only a "thanks" email — they're legally entitled to a GST invoice they can claim.

**Outcome.** Every successful payment (subscription charge or top-up) generates a compliant GST invoice PDF, stored and emailed.

**Screen(s).**
- Billing page → new "Invoices" section: a list of past invoices with date, amount, "Download PDF".
- The invoice PDF itself: our legal entity + GSTIN, the DSA's name + GSTIN (if provided), invoice number (sequential, per-FY), HSN/SAC code **998314** (SaaS), taxable value, CGST+SGST or IGST split (intra- vs inter-state by the DSA's state vs ours), total.

**Data model.** New `Invoices` collection: `{ invoice_number, dsa_id, billing_transaction_id, issue_date, taxable_value, cgst, sgst, igst, total, gstin_buyer, gstin_seller, hsn_sac, pdf_url, fy }`. Sequential invoice numbering per financial year (gapless — a legal requirement; use an atomic counter).

**API.**
- Invoice generation runs inside the payment-success path (D.1 webhook + da-topup). New `src/lib/server/billing/invoice.ts` → `generateInvoice(billingTransaction)`.
- **New `GET /api/billing/invoices`** (list, DSA-scoped) + **`GET /api/billing/invoices/[id]/pdf`** (download, ownership-gated).
- PDF via `pdf-lib` (already in stack) OR Razorpay Invoices API (decision: self-render gives full control of format; Razorpay Invoices auto-handles numbering but less layout control — **recommend self-render with pdf-lib** for format control + because numbering must be our gapless sequence).

**Business logic.** Tax split: if DSA's state == our registered state → CGST 9% + SGST 9%; else → IGST 18%. Invoice number gapless per FY via an atomic `findOneAndUpdate` counter. Issued on payment success only (never on a failed/pending charge).

**Edge cases.** DSA has no GSTIN → still issue invoice (B2C), no buyer GSTIN line. Refund (D.3) → issue a credit note referencing the original invoice. Inter-state vs intra-state determined by DSA's stored state — if missing, default to IGST (safer) and flag for correction.

**Parity checklist.** Subscription charges AND DA top-ups both generate invoices. Refunds generate credit notes.

**i18n.** Invoice is a legal doc — English (with the option of a bilingual header). The Billing "Invoices" section UI → en/hi/mr.

**Test plan.** Unit: tax split intra vs inter-state; gapless numbering under concurrency; B2C (no GSTIN) path. Manual: pay → invoice appears in list → PDF downloads with correct GST breakup.

**Effort.** ~3 days. **Dependencies.** D.1 (charge event triggers it). **Provenance.** Invoice issuance → audit row (money-retention path, 6 years).

---

### D.3 — Refund (admin button + Razorpay API + audit) — ⛔ ABANDONED 2026-05-28

**Decision** (owner, 2026-05-28). D.3 is permanently dropped. No in-app refund UI, no `/api/admin/billing/refund` endpoint, no `Refunds` collection, no credit-note counter, no DSA refund-notification email will be built.

**Rationale.** Billing only fires AFTER the 30-day Pro trial ends (ADR-0018 / D.1 S2). The trial period IS the buyer's-remorse window — by the time a charge lands, the DSA has had 30 days of full access to evaluate fit. There is no class of routine "I changed my mind after paying" that the trial doesn't already cover.

**Edge-case handling without an in-app feature.**
- A DSA who believes a charge is genuinely wrong (duplicate debit caused by our system, payment success but service unavailable for an extended outage, etc.) emails `billing@digitaldsa.com` / `support@digitaldsa.com`.
- Operator handles the rare case manually via the Razorpay dashboard. No automation, no engineering surface.
- This volume is expected to be near-zero; if it grows, revisit.

**Policy pages that need realignment** (deferred to the landing-page revamp, NOT shipping inline with this decision):
1. `src/routes/(legal)/refund/+page.svelte` — currently advertises 7-day full refund + prorated downtime refund + case-by-case carve-outs. Needs full rewrite to a no-refund policy citing the 30-day trial.
2. `src/routes/(legal)/terms/+page.svelte` §357-358 — "Refunds — case-by-case basis" line needs alignment with the new stance.
3. `src/lib/components/landing-revamp/DisclaimerSection.svelte:9` — says "14-day trial period"; actual trial is 30 days. Drift.
4. `src/lib/components/landing-revamp/HeroSection.svelte:140` + `FinalCTASection.svelte:56` — both say "7-day trial". Same drift.

**Action.** None today. The 4 surfaces above get a single coordinated pass during landing-page finalization. Spec entry below preserved for historical context; do not implement.

~~**Problem (from audit).** The refund policy page promises refunds but there's no in-app way to issue one — support presumably does it manually in Razorpay's dashboard, off the books.~~

~~**Outcome.** An admin can issue a full/partial refund from the platform; it calls Razorpay, records an audit row, issues a credit note, and notifies the DSA.~~

~~**Screen(s).** In admin → a transaction's detail (or the DSA's billing history visible to admin), a "Refund" button → dialog: amount (full/partial), reason (required, dropdown + free-text), confirm.~~

~~**Data model.** Refund record on `BillingTransactions` (or a `Refunds` collection): `{ original_transaction_id, razorpay_refund_id, amount, reason, issued_by, issued_at, credit_note_id }`.~~

~~**API.** **New `POST /api/admin/billing/refund`** — `requireRoleApi('admin')` + `requireAdminPermission`, CSRF, rate-limit. Calls `razorpay.payments.refund(paymentId, { amount })`. Writes audit row (`refund_issued`, via C.5 helper, money-retention). Triggers credit-note generation (D.2) + DSA notification.~~

~~**Business logic.** Partial refund allowed (amount ≤ original). Idempotent by `razorpay_refund_id`. Updates subscription state if the refund implies access revocation (configurable — usually a refund within trial/7-day window cancels access).~~

~~**Edge cases.** Refund a payment already refunded → reject. Refund exceeds original → reject. Refund after access consumed → policy decision (refund-with-revocation vs goodwill refund-without).~~

~~**Parity checklist.** Refund path must produce a GST credit note (D.2 parity). Audit via C.5.~~

~~**i18n.** Admin dialog + DSA notification copy → en/hi/mr.~~

~~**Test plan.** Unit: partial/full validation; idempotency; audit written. Manual (Razorpay test mode): issue refund → Razorpay reflects it → credit note generated → DSA notified → audit row present.~~

~~**Effort.** ~1.5 days. **Dependencies.** C.5 (audit), D.2 (credit note). **Provenance.** Core — `refund_issued` audit, 6-year retention.~~

---

### D.4 — Dunning (failed-payment escalation)

**Problem (from audit).** A failed renewal does nothing today — no reminder, no grace, no lockout.

**Outcome.** A failed charge triggers a clear escalation: update-card prompt → grace reminders → eventual downgrade, all by email + in-app banner.

**Screen(s).** In-app banner on every dashboard page when `mandate_status` is `pending`/`halted`: "⚠ Your last payment failed. Update your payment method to keep access. [Update]". Emails at each step.

**Data model.** `subscription.dunning_state`: `none|failed|grace|final_notice|downgraded` + `dunning_started_at`.

**API.** Driven by D.1's webhook (`payment.failed` → set `failed`) + a daily cron that advances the dunning state machine and sends the right email.

**Business logic (the sequence).**
- Day 0 (`payment.failed`) → state `failed`; email "Payment failed — update your card"; Razorpay smart-retry continues (Option 1).
- Day 3 → state `grace`; email "Still can't process payment — 4 days of access left".
- Day 7 → state `final_notice`; email "Access ends tomorrow".
- Day 8 → state `downgraded`; downgrade to free tier (keep data, restrict per case-limit); email "Downgraded — resubscribe anytime".

**Edge cases.** Payment succeeds mid-dunning (retry works) → reset to `none`, clear banner, thank-you email. DSA updates card → re-attempt immediately.

**Parity checklist.** The downgrade must respect the pricing-fence (D.6) — a downgraded DSA over the free limit can view but not create new cases.

**i18n.** All four emails + the banner → en/hi/mr.

**Test plan.** Unit: state-machine transitions; success-mid-dunning reset. Manual: simulate `payment.failed` → banner + day-0 email → advance cron → grace → final → downgrade.

**Effort.** ~3 days. **Dependencies.** D.1 (failure webhook). **Provenance.** Each transition → audit row.

---

### D.5 — Reconciliation

**Problem (from audit).** No daily check that our records match Razorpay's settlements.

**Outcome.** A daily job compares `BillingTransactions` against Razorpay settlement reports and flags discrepancies for admin.

**Screen(s).** Admin → a "Reconciliation" view: per-day "matched / unmatched / discrepancy" with drill-down on mismatches.

**Data model.** `ReconciliationRuns` collection: `{ date, matched_count, unmatched[], discrepancies[], status }`.

**API.** New cron `/api/cron/billing-reconcile` (secret-protected like other crons) → pulls Razorpay settlements for the day, matches by payment ID, records mismatches. Admin `GET /api/admin/billing/reconciliation`.

**Business logic.** Match each Razorpay settled payment to a BillingTransaction; flag any in one but not the other; flag amount mismatches.

**Edge cases.** Refunds/credit notes in the settlement → matched against refund records. Timezone boundaries → use Razorpay's settlement date.

**Parity checklist.** N/A.

**i18n.** Admin view labels → en/hi/mr.

**Test plan.** Unit: matching logic with synthetic settlement data (matched / missing-on-our-side / amount-mismatch). Manual: run cron on test data → admin view shows results.

**Effort.** ~2 days. **Dependencies.** D.1/D.2 (transaction + invoice records to match against). **Provenance.** Each run logged.

---

### D.6 — Pricing-fence enforcement + annual + GST disclosure + recommendation ✅ SHIPPED 2026-05-28 (annual sub-feature REMOVED 2026-05-29 — owner decision)

**Implementation shipped 2026-05-28** across 4 slices, 4 commits, +72 tests (`eea241b0` plan helpers + dual-badge removal, `8339d317` 80% soft-warn ladder, `f76189ef` SubscribeRecurringSection redesign, `6cea603c` end-to-end upgrade modal + `?recommend=` deep-link). Server returns structured 402 `case_limit_reached` carrying the recommended-plan payload; client auto-opens ConfirmModal with spec D.6 copy; Upgrade routes to billing page with the recommended plan pre-selected.

**Annual billing REMOVED 2026-05-29** (`cb0f3139`) per owner decision: monthly only, no annual product. The annual toggle UI from Slice 3 + the four annual-cycle helpers (`BillingCycle` type, `ANNUAL_PRICE_MULTIPLIER`, `getAnnualPrice`, `getAnnualSavings`) are gone. Tests reshaped from "annual works" assertions to "annual is absent" removal locks. The rest of D.6 — single Recommended badge replacing dual-badge, GST disclosure per ADR-0019, feature dedup, 80% soft-warn ladder, upgrade modal — all preserved. **Treat the original spec text below as historical reference for the annual portion; the rest is current.**

**Problem (from audit).** The paywall has no teeth (43 cases on no-plan; Basic caps at 10). Two competing badges ("MOST POPULAR" + "BEST VALUE"). No annual option, no GST disclosure, no plan recommendation, feature lists 80% identical.

**Outcome.** Case creation is gated by the plan's `caseLimit`; the Billing page offers annual pricing, discloses GST, recommends a plan, and shows only meaningful differences.

**Screen(s).** Billing page redesign:
```
  Monthly  [ Annual — save 2 months ]   ← toggle
  ┌ Basic ──────┐ ┌ Pro ★ Recommended ┐ ┌ Enterprise ──┐
  │ ₹999/mo     │ │ ₹3,999/mo          │ │ ₹9,999/mo    │
  │ +18% GST    │ │ +18% GST           │ │ +18% GST     │
  │ 10 cases    │ │ 50 cases           │ │ Unlimited    │
  │             │ │ + Priority support │ │ + Dedicated  │
  │             │ │                    │ │   acct mgr   │
  │ [Choose]    │ │ [Choose]           │ │ [Choose]     │
  └─────────────┘ └────────────────────┘ └──────────────┘
  You have 43 active cases → Pro or Enterprise recommended.
```
- Only ONE badge (Recommended), placed by the DSA's actual usage (43 cases → Pro/Enterprise).
- GST shown ("+18% GST" or "₹4,719 incl. GST").
- Monthly/Annual toggle (annual = 10× monthly, i.e. 2 months free).
- Feature cards show base + only the *additional* features per tier (strip the 80% duplication).

**The fence itself:** when a DSA tries to create the 11th active case on Basic:
```
  ┌─ You've hit your plan limit ──────────────────────────┐
  │ Basic includes 10 active cases. You have 10.          │
  │ Upgrade to Pro (50 cases) to add more.                │
  │                              [ Not now ] [ Upgrade → ]│
  └────────────────────────────────────────────────────────┘
```

**Data model.** Add `durationMonths: 12` annual variants to `PLANS` (or an `annual` flag + computed price). No other change — `caseLimit` + `getActiveCaseLimit` exist.

**API.** **Enforce at case creation** (`POST /api/cases`): before insert, count the DSA's active cases; if `>= getActiveCaseLimit(sub)` → return `402`/`403` with an upgrade-required payload. The client shows the upgrade modal. Soft-warn at 80% ("2 cases left on your plan").

**Business logic.** Active = the same non-terminal stages used elsewhere. Recommendation = lowest tier whose `caseLimit` ≥ current active count. Annual price = `priceMonthly × 10`.

**Edge cases.** Existing DSAs already over a limit (grandfathered) → don't retroactively block; warn + recommend, block only *new* creations beyond limit going forward (configurable grace). Trial users → use Pro limit during trial. Downgraded (D.4) DSA over free limit → view-only.

**Parity checklist.** Resolves the B.6 "is Analytics Pro?" question — once the fence is real, PRO-labeled features (analytics, etc.) gate consistently. The "UNLOCKS LATER" labels (Lens 3) align with actual tier gating.

**i18n.** Pricing page + limit modal + soft-warn → en/hi/mr.

**Test plan.** Unit: limit enforcement at boundary (10th OK, 11th blocked on Basic); recommendation logic; annual price. Manual: as a Basic DSA with 10 cases, try to create an 11th → upgrade modal; toggle annual → prices update; GST shown.

**Effort.** ~2.5 days. **Dependencies.** Overlaps B.6 (PRO gating). **Provenance.** N/A.

---

## D-LATER (corporate-DSA payout model — fully specified, executed as its own program AFTER this one)

> Owner confirmed: you plan to become a corporate DSA — receive payouts from lenders, pay DSAs after deducting TDS. This sub-system is **defined now so the data model below doesn't paint you into a corner**, but it is sequenced as its own program after the post-audit work. Treat D.7–D.13 as the blueprint, not this program's build list.

**Design principle:** introduce a **double-entry-style ledger** now (even if unused) so money always has a provenance trail. Two ledgers: **receivables** (lender → us) and **payables** (us → DSA), bridged by a case's disbursement event.

### D.7 — Lender receivables ledger
Per disbursed case: what the lender owes us (commission % of disbursed amount, per lender agreement). Model: `Receivables { case_id, lender_id, disbursed_amount, commission_rate, gross_receivable, status (pending|invoiced|received), received_at }`. We invoice the lender (GST output — we're the supplier of referral services).

### D.8 — Commission ledger (us → DSA)
Per disbursed case: what we owe the originating DSA (their share of our receivable). Model: `Payables { case_id, dsa_id, gross_commission, tds_amount, net_payable, status (accrued|approved|paid), paid_at }`.

### D.9 — TDS deduction engine
Compute TDS on each DSA payable per the DSA's PAN status (e.g. 194H commission TDS at the prevailing rate; higher rate if PAN not provided per §206AA). Track withheld TDS per DSA per quarter for filing (26Q). Model: `TdsLedger { dsa_id, fy, quarter, gross, tds_rate, tds_withheld, deposited, challan_ref }`.

### D.10 — Form 16A generation
Per DSA per quarter: a TDS certificate (Form 16A) PDF, generated from the TDS ledger after the quarterly TDS return is filed and the challan is available. Stored + downloadable by the DSA.

### D.11 — DSA payout flow
Disburse `net_payable` to the DSA's bank account via **RazorpayX / Razorpay Payouts** (IMPS/NEFT). Requires collecting + verifying DSA bank details (penny-drop verification). Model: payout records linked to `Payables`. Idempotent; webhook-confirmed.

### D.12 — DSA "My Earnings" page
New DSA dashboard page: per-case gross commission, TDS withheld, net, payout status, plus a quarterly summary and Form 16A downloads. The DSA's view into the entire payables/TDS/payout chain.

### D.13 — Admin reconciliation (corporate-DSA)
Admin view tying it together: lender-received vs DSA-paid vs platform margin, per period; flags cases where we've paid the DSA but not yet received from the lender (cash-flow exposure).

**D-later effort (indicative, NOT this program):** ~20–30 dev-days + legal/CA review of TDS logic + RazorpayX onboarding. Sequenced after the post-audit program when the corporate-DSA model goes live.

**Compliance link:** all D-later money records inherit the **6-year retention** from Epic E (not the 2-year audit TTL).

---

**Epic D effort total (D-now only):** ~15 dev-days (Option 1 for D.1) or ~22 (Option 2). **D-later:** separate ~20–30 day program. **Key decision before execution:** D.1 Option 1 vs 2.

---

## Parking lot (ideas surfaced — NOT in any frozen epic)

Anything that comes up mid-execution lands here, never interrupts a batch:
- Performance Score "soft-start for first 90 days" (surfaced in B.6) — refine the scoring model so new DSAs aren't shown "Critical 34/100" on day one. Small, but a scoring-model change; park for a focused pass.
- **"0 published PMS policies" pipeline diagnostic** (surfaced in C.6) — if the encode→submit→approve→publish pipeline is genuinely stuck (not just a counter bug), this is its own investigation ticket, larger than a labeling fix.
- **DA (Doc Assessment) tier rationalization** (surfaced in D.6) — the DA tiers (`basic_da`, `pro_da`, `enterprise_da`) + top-up packs are a parallel pricing axis to the main plans; worth a future pass to confirm they're coherent with the redesigned pricing page.

---

# EPIC E — Compliance

**Why fifth:** these aren't broken-today, but they're the gaps a regulator, a security reviewer, or an enterprise customer's procurement team will probe. None has caused an incident yet — but each is the kind of thing you want done *before* a formal request forces it.

**Shared code facts (verified this session):**
- `data3/retentionFloor.ts` governs *document* retention (financial 30d / kyc 90d / property 180d / high_stakes 365d). It is **not** a money-records policy — the 6-year money retention (E.4) is a *new, separate* policy.
- **No TOTP/2FA library** is installed (`otplib`/`speakeasy` absent). E.2 adds `otplib` + `qrcode`.
- JWT service mints refresh tokens with a unique token ID (`generateTokenId`) and rotates them. That token ID is the handle for a revocable sessions registry (E.3). Confirm during build whether refresh tokens are stored server-side; if stateless, E.3 adds a server-side `Sessions` registry keyed by token ID.

---

### E.1 — DPDP §11 data export ("Download my data")

**Problem (from audit).** India's DPDP Act §11 gives a user the right to a copy of their personal data in a structured, machine-readable format. There's no way to fulfil that today. *Example:* a DSA formally requests their data; the platform has no path, which is a regulator-visible failure.

**Outcome.** A DSA (and RM) can request a full export of their data; the system assembles it, excludes other parties' PII, and emails a time-limited download link.

**Screen(s).** In DSA profile → a new "Your data & privacy" section:
```
┌─ Your data & privacy ────────────────────────────────────┐
│ Download a copy of your DigitalDSA data (DPDP Act §11).   │
│ Includes your profile, cases, contacts, payments, and     │
│ communications. Borrower personal details are included    │
│ only where consent allows.                                │
│ You can request once every 30 days.                       │
│                                  [ Request my data export ]│
│ Last export: 2 May 2026 · [Download] (expires in 4 days)  │
└────────────────────────────────────────────────────────────┘
```

**States.**
- No prior export → just the request button.
- Export in progress → "Preparing your export… we'll email you when it's ready (usually a few minutes)."
- Ready → "Download" link + expiry countdown.
- Rate-limited (within 30 days) → button disabled, "You can request again on <date>."
- Expired link → "This export expired. Request a new one."

**Data model.** New `DataExports` collection: `{ user_id, role, requested_at, status (pending|ready|expired), file_url, expires_at }`. The export file is a ZIP of JSON documents (profile.json, cases.json, contacts.json, payments.json, communications.json) + a README.

**API.**
- **New `POST /api/account/data-export`** — `requireAuth`, CSRF, rate-limit **1 per 30 days per user**. Enqueues the export (or runs inline if small), returns status.
- **New `GET /api/account/data-export/[id]/download`** — ownership-gated, link valid 7 days, single-use-ish (logged each download).
- Assembly helper `src/lib/server/account/dataExport.ts` → `buildUserExport(userId, role)`.

**Business logic.** Aggregate all of the user's own data via the CSFLE decrypt path. **Exclude or redact other parties' PII**: borrower data the DSA collected is included only for fields the borrower consented to share with the DSA (align with the v1-PDF-no-PII + DATA-2 consent model). RM exports include their policies + submissions, not other RMs' data.

**Edge cases.** Huge accounts → run async (cron/queue), email when ready, don't block the request. Concurrent requests → the 30-day rate limit + a single in-flight guard. Link sharing → link is unguessable + expires + download is logged.

**Parity checklist.** DSA and RM both. (Borrower erasure/access is already handled by DATA-1/2/3; this is the *DSA/RM self-export*.)

**i18n.** All section copy + states → en/hi/mr.

**Test plan.** Unit: export assembles the right collections; excludes non-consented borrower PII; rate limit enforced. Manual: request export → receive email → download ZIP → verify contents + that other users' data isn't present.

**Effort.** ~3–4 days. **Dependencies.** None (uses CSFLE decrypt path). **Provenance.** Each export request + download → audit row (who exported what, when).

---

### E.2 — Admin 2FA (TOTP)

**Problem (from audit).** Admins log in with the same phone-OTP as everyone else. An account that can manage all users and edit lending rules should have a second factor. *Example:* a SIM-swap on an admin's phone = full platform compromise today.

**Outcome.** Admin accounts require a TOTP second factor (authenticator app) in addition to OTP login; DSA/RM are unchanged.

**Screen(s).**
- Admin Settings → "Two-factor authentication" section: enrollment shows a QR code + manual key + a "Enter 6-digit code to confirm" field; once enrolled, shows "2FA is on" + "View recovery codes" + "Disable (requires code)".
- At login, after OTP, an admin sees a "Enter your authenticator code" step.
```
┌─ Two-factor authentication ──────────────────────────────┐
│ Scan this QR code with Google Authenticator / Authy:     │
│   [ QR ]   or enter key: JBSW Y3DP EHPK 3PXP             │
│ Enter the 6-digit code to turn on 2FA:  [ _ _ _ _ _ _ ]  │
│                                          [ Turn on 2FA ] │
│ Recovery codes (save these): 8 single-use codes shown    │
│ once on enrollment.                                       │
└────────────────────────────────────────────────────────────┘
```

**States.** Not enrolled (admin) → prompt to enroll (optionally enforce after a grace window). Enrolling → QR + confirm. Enrolled → status + recovery + disable. Login 2FA step → code entry, with "use a recovery code" fallback. Lockout after N wrong codes → rate-limited.

**Data model.** On the admin user: `twofa: { enabled, secret (encrypted via CSFLE), recovery_codes (hashed), enrolled_at }`.

**API.**
- **New `POST /api/admin/2fa/enroll`** (returns secret + QR data), **`POST /api/admin/2fa/confirm`** (verify first code, enable, return recovery codes), **`POST /api/admin/2fa/disable`** (requires a valid code), **`POST /api/admin/2fa/verify`** (login step).
- Library: `otplib` (TOTP) + `qrcode` (QR generation). Add to deps.
- The login flow (`hooks.server.ts` / login page) gates admin sessions behind a verified 2FA step.

**Business logic.** Standard TOTP (30s window, ±1 step tolerance). Recovery codes are single-use, hashed. Secret stored encrypted (CSFLE). Optionally: enforce 2FA for admin after a grace period (config flag).

**Edge cases.** Lost authenticator → recovery codes; lost both → another admin disables it for them (audited). Clock drift → ±1 step tolerance. Brute force → rate-limit + lockout.

**Parity checklist.** DSA/RM explicitly unchanged (OTP only). Only the admin role gets the extra factor. The corporate-DSA payout admin (D-later) especially benefits.

**i18n.** Enrollment + login-step copy → en/hi/mr (admin UI is English-first but keep keys).

**Test plan.** Unit: TOTP verify (valid/expired/drift); recovery-code single-use; disable requires code. Manual: enroll with a real authenticator app → log out → log in → OTP then TOTP step → access; test a recovery code.

**Effort.** ~3 days. **Dependencies.** C.5 (audit 2FA enable/disable). **Provenance.** Enroll/disable/recovery-code-use → audit rows.

---

### E.3 — Active sessions UI + revoke

**Problem (from audit).** No way to see or revoke active sessions. A lost/stolen device stays logged in until the JWT expires. *Example:* a DSA's phone is stolen; they can't force-logout that device.

**Outcome.** Every user can see their active sessions (device, last-seen, rough location) and revoke any one or "all others."

**Screen(s).** Profile/Settings → "Active sessions":
```
┌─ Active sessions ────────────────────────────────────────┐
│ • This device · Chrome on Windows · Mumbai · now          │
│ • Android app · Pixel 7 · Mumbai · 2h ago    [Log out]    │
│ • Chrome on Mac · Pune · 3 days ago          [Log out]    │
│                                  [ Log out all other devices ]│
└────────────────────────────────────────────────────────────┘
```

**States.** One session → just "this device". Revoking → the row disappears + that token is invalidated. Revoke-all-others → confirm, then all but current are killed.

**Data model.** New `Sessions` registry: `{ session_id (= refresh token ID), user_id, device_label, user_agent, ip_city, created_at, last_seen_at, revoked_at }`. On login, create a record; on refresh, update `last_seen_at`; on revoke, set `revoked_at` and reject future refreshes for that token ID.

**API.**
- **`GET /api/account/sessions`** (list own), **`POST /api/account/sessions/[id]/revoke`**, **`POST /api/account/sessions/revoke-others`**. All `requireAuth` + ownership.
- `hooks.server.ts` refresh path checks the session isn't revoked before issuing a new access token.

**Business logic.** Refresh-token rotation already exists; tie each refresh token to a `Sessions` row by its token ID. Revoking sets `revoked_at`; the refresh check rejects revoked sessions, forcing re-login on that device.

**Edge cases.** Current session must be clearly marked + can't accidentally revoke itself via "others". IP→city lookup is approximate (label as "rough location"). Mobile app session vs web session — distinguish by user-agent/platform.

**Parity checklist.** DSA, RM, Admin all get it. Admin impersonation (C.4) sessions should appear distinctly or be excluded (decide: impersonation is short-lived; likely exclude from the impersonated user's list but audit separately).

**i18n.** Section + actions → en/hi/mr.

**Test plan.** Unit: revoked session's refresh is rejected; revoke-others spares current. Manual: log in on two browsers → see both → revoke one → that browser is logged out on next action.

**Effort.** ~3 days. **Dependencies.** None (builds on existing refresh-token rotation). **Provenance.** Revoke actions → audit row.

---

### E.4 — 6-year retention for money records

**Problem (from audit).** Tax/financial records need ~6-year retention (Income Tax Act + GST). The 2-year audit-log TTL and the DATA-3 document floors don't cover this, and there's no explicit money-retention policy. *Example:* a GST audit two years out asks for invoices the 2-year TTL already deleted.

**Outcome.** All money records (BillingTransactions, Invoices, Refunds, credit notes, and D-later payout/TDS records) are retained for 6 years, explicitly, separate from PII cool-down and audit TTL.

**Screen(s).** None (policy + infrastructure). Optionally an admin "Retention policy" read-only info panel.

**Data model.** A new retention policy module `src/lib/server/retention/moneyRetention.ts` defining `MONEY_RETENTION_YEARS = 6` (configurable per legal advice). Money collections must **not** carry the 2-year audit TTL index. If audit rows for money events live in the shared audit log (C.5), those specific rows route to a separate non-TTL collection (`MoneyAuditLog`) or carry a per-document `expire_at` set to 6 years.

**API.** No new endpoint. A guard/test asserting money collections have no short-TTL index. The eventual deletion (after 6 years) is a future sweep, not built now — the point now is to *not delete early*.

**Business logic.** Money records are exempt from: the DATA-3 document sweep, the DATA-2 grace-period hard-delete, the 2-year audit TTL, and the PII cool-down redaction (financial figures aren't PII to redact, though buyer name/GSTIN may be minimized after the active window — confirm with CA). Retention clock starts at the end of the financial year of the transaction.

**Edge cases.** A DSA's account deletion (DPDP §13) vs the 6-year money-retention obligation → **money records survive account deletion** for the legal retention window (this is a lawful basis exception under DPDP — document it). The export (E.1) and erasure paths must both respect this.

**Parity checklist.** Applies to D-now (invoices/refunds) AND D-later (payout/TDS/16A records). The C.5 audit log's money rows route here.

**i18n.** N/A (policy).

**Test plan.** Unit/CI: a test asserting no money collection has a ≤2-year TTL index; account-deletion preserves money records. Manual: confirm an invoice from >2 years ago (seeded) survives the audit TTL window.

**Effort.** ~1.5 days. **Dependencies.** C.5 (audit routing), D.2/D.3 (the records to retain). **Provenance.** The policy itself is the provenance guarantee.

---

**Epic E effort total:** ~11–12 dev-days. **Key dependency:** C.5 (audit) underpins E.2/E.3/E.4 provenance; legal/CA review for E.4's exact retention period + post-window redaction.

---

# EPIC F — Growth

**Why sixth:** with the product solid, paid, and compliant, the last gap is that it can only grow by direct sales + word of mouth. This epic adds the self-serve growth loops: invite-a-DSA, capture-a-lead-before-signup, know-where-signups-came-from, learn-why-deals-are-lost, and measure-satisfaction.

**Shared code facts (verified this session):**
- Signup (`/api/auth/signup`, `dsa-onboarding`) stores **no attribution** today — UTM/referral are net-new fields on the DSA record.
- The case stage endpoint validates via `stageUpdateSchema` (`stage` + optional `notes`) and `validateTransition` (`/api/cases/[case_id]/stage`). The drop-reason hook attaches cleanly here.
- The public eligibility checker (F.2) needs the rule engine to run a **thin anonymous estimate** without a full case — confirm during build whether the engine supports a lightweight mode; if not, build a capped estimator that uses a subset of policies.
- Anything public (F.2 checker, F.3 landing pages) must respect the 8-layer anti-scraping (AD-14) while still allowing legitimate anonymous use.

---

### F.1 — Referral codes (DSA-acquires-DSA)

**Problem (from audit).** No referral program — a happy DSA can't invite another and earn anything. *Example:* your most-organic growth channel (DSA word-of-mouth) has no in-product mechanism.

**Outcome.** Every DSA has a unique referral link; when an invited DSA subscribes, both get a reward (e.g. a free month or DA top-up).

**Screen(s).** DSA dashboard → new "Refer & earn" section:
```
┌─ Refer & earn ───────────────────────────────────────────┐
│ Invite other DSAs. When they subscribe, you both get 1    │
│ free month.                                               │
│ Your link:  digitaldsa.com/r/RAJESH7K   [Copy] [WhatsApp] │
│ Invited: 4 · Joined: 2 · Subscribed: 1 · Rewards: 1 month │
│ ─ Your referrals ─                                        │
│ • +91 98XXXX · Joined 12 May · Trial                      │
│ • +91 97XXXX · Subscribed 8 May · ✓ reward credited       │
└────────────────────────────────────────────────────────────┘
```

**States.** No referrals yet → "Share your link to get started." Reward pending (invitee in trial) → "Reward credits when they subscribe." Reward credited → confirmation.

**Data model.** On DSA: `referral_code` (unique, generated at signup), `referred_by` (the code that referred them). New `Referrals` collection: `{ referrer_dsa_id, referred_dsa_id, code, joined_at, subscribed_at, reward_status (pending|credited|void), reward_type }`.

**API.**
- `referral_code` minted at signup (extend signup).
- The signup flow captures `?ref=` (from the link) → sets `referred_by` + creates a `Referrals` row.
- Reward trigger: in the subscription-success path (D.1), if the new subscriber has a `referred_by`, credit both (idempotent).
- **`GET /api/dsa/referrals`** (own stats), public route `/r/[code]` → redirects to signup with `?ref=` set.

**Business logic.** Reward credits only on the invitee's **first paid** subscription (not trial), to prevent gaming. Self-referral blocked (same mobile/device heuristics). Reward = configurable (1 free month default).

**Edge cases.** Invitee never subscribes → reward stays pending (or voids after N days). Fraud (same person, many accounts) → device/mobile dedup + a cap on rewards per period. Invitee already had an account → no reward.

**Parity checklist.** Reward crediting hooks the same subscription-success path as D.1/D.2 — keep it idempotent alongside invoice generation.

**i18n.** All "Refer & earn" copy + share message → en/hi/mr.

**Test plan.** Unit: code uniqueness; reward credits on first paid sub only; self-referral blocked. Manual: copy link → open in incognito → sign up → subscribe → both accounts show the reward.

**Effort.** ~3 days. **Dependencies.** D.1 (subscription-success hook). **Provenance.** Reward credits → audit row.

---

### F.2 — Public anonymous eligibility checker (lead capture)

**Problem (from audit).** A curious person can't try the product before a full mobile-OTP signup. The only taste is the "Demo Dashboard". *Example:* a DSA evaluating tools bounces because they can't see value without committing.

**Outcome.** A public `/check-eligibility` page where anyone enters a few details and sees a teased eligibility result, capturing them as a lead and nudging signup.

**Screen(s).**
```
┌─ Check loan eligibility — free, no signup ───────────────┐
│ Loan type   [ Home Loan ▾ ]                              │
│ Loan amount [ ₹40,00,000        ]                        │
│ City        [ Mumbai            ]                        │
│ Monthly income [ ₹1,20,000      ]                        │
│ Mobile (to send your result) [ __________ ]             │
│                                   [ Check eligibility → ]│
│                                                          │
│ RESULT (teased):                                         │
│   ✓ You'd likely qualify at ~8 of 40 lenders            │
│   Estimated eligible amount: ₹35–42 L                    │
│   [ Sign up free to see exact lenders & rates → ]        │
└────────────────────────────────────────────────────────────┘
```

**States.** Pre-submit → form. Submitting → "Checking against 40+ lender policies…". Result → teased counts + ranges, NOT specific lender names (those require signup). No match → "Based on these details, options are limited — sign up and we'll help structure it." Rate-limited (anti-scraping) → friendly throttle message.

**Data model.** New `Leads` collection: `{ mobile, loan_type, amount, city, income, estimated_lenders, estimated_range, created_at, utm, converted_to_dsa_id? }`. Mobile captured as the lead handle.

**API.** **New public `POST /api/public/eligibility-check`** — no auth, **heavy rate-limit + anti-scraping budget** (reuse `formGuard.ts`), input-validated. Runs a thin rule-engine estimate. Stores a `Leads` row.

**Business logic.** Thin estimate: run a subset of the rule engine (eligibility gates only, no full income profiling) against published policies; return counts + ranges, never specific lender names or exact numbers (that's the signup incentive + protects the moat). If the engine has no thin mode, build a capped estimator.

**Edge cases.** Anti-scraping: this is a public compute endpoint — must be rate-limited per IP + fingerprinted (AD-14) to prevent policy-scraping via brute-force queries. Garbage input → validation. Same mobile repeatedly → dedupe the lead, throttle.

**Parity checklist.** Must NOT leak the kind of specifics the anti-scraping system protects in the authenticated form. Teased output only.

**i18n.** Whole page → en/hi/mr (this is public-facing, so translation matters for reach).

**Test plan.** Unit: thin estimate returns counts/ranges not names; rate-limit fires. Manual: fill the form anonymously → see teased result → lead row created → "Sign up" carries context into signup.

**Effort.** ~5 days. **Dependencies.** Rule-engine thin mode (investigate). **Provenance.** Lead creation logged; conversion tracked via `converted_to_dsa_id`.

---

### F.3 — UTM + campaign landing pages

**Problem (from audit).** No way to tell which ad/campaign brought which signup. *Example:* you run a campaign and can't measure which one converted.

**Outcome.** Signups carry their UTM attribution; per-campaign landing pages exist.

**Screen(s).** Landing pages live under a new `(landing)` route group — marketing-controlled templates (hero + value props + CTA) that pass UTM params through to signup. No dashboard UI change beyond an admin "Acquisition" report (counts by source).

**Data model.** On DSA: `attribution: { utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, first_seen_at }`. New `Leads` (F.2) also carries `utm`.

**API.** Capture `utm_*` from the URL at first touch (cookie), attach to the signup payload, store on the DSA record. Admin **`GET /api/admin/acquisition`** → signups grouped by source/campaign.

**Business logic.** First-touch attribution (store the first UTM seen, not the last). Persist across the signup funnel via a first-party cookie.

**Edge cases.** No UTM (direct/organic) → `source: 'direct'`. UTM on a referral link → both `referred_by` (F.1) and UTM stored; referral takes precedence for reward attribution.

**Parity checklist.** F.1 referral + F.2 lead + F.3 UTM all feed the same attribution picture — keep the field shape consistent across DSA, Leads, and Referrals.

**i18n.** Landing pages → en/hi/mr (marketing reach).

**Test plan.** Unit: first-touch persists; direct → 'direct'. Manual: visit a landing page with `?utm_source=fb&utm_campaign=x` → sign up → DSA record carries the attribution → admin acquisition report counts it.

**Effort.** ~3 days (capture + report; landing-page templates are incremental, marketing-authored). **Dependencies.** None. **Provenance.** N/A.

---

### F.4 — Drop-reason on dropped cases (win/loss intelligence)

**Problem (from audit).** When a DSA drops a case, no reason is captured — so you never learn why deals are lost. *Example:* you can't tell whether cases die from applicant drop-off, lender rejection, or losing to a competitor.

**Outcome.** Moving a case to "Dropped" requires a structured reason, feeding a win/loss view.

**Screen(s).** When a DSA selects "Dropped" in the stage changer → a required follow-up:
```
┌─ Why are you dropping this case? ────────────────────────┐
│ ( ) Applicant changed their mind / went silent          │
│ ( ) Lender rejected                                     │
│ ( ) Lost to a competitor (another DSA / direct)         │
│ ( ) Didn't qualify                                      │
│ ( ) Other  [ ____________________ ]                     │
│                                      [ Cancel ] [ Drop ] │
└────────────────────────────────────────────────────────────┘
```
And a CRM "Win/Loss" mini-report: dropped cases grouped by reason.

**States.** Reason required → "Drop" disabled until a reason is picked (Pitfall #26 — disabled has a visible reason). "Other" → free-text required.

**Data model.** On Case: `drop_reason: enum + drop_reason_note?`. Add to the stage transition record.

**API.** Extend `stageUpdateSchema` (`/api/cases/[case_id]/stage`): when `stage === 'dropped'`, require `drop_reason` (Zod refinement). Store on the case + stage_history entry. CRM report aggregates dropped cases by reason.

**Business logic.** Reason mandatory only for the `dropped` transition; other transitions unaffected. Enum: `applicant_dropped | lender_rejected | competitor_won | qualification_failed | other`.

**Edge cases.** Bulk drop (B.5) → ask once, apply the same reason to all selected (or per-case). Re-opening a dropped case → keep the historical reason in stage_history.

**Parity checklist.** Applies wherever a case is dropped — single-drop, bulk-drop (B.5), and admin-on-behalf (Lens 1 stuck-case closure). All paths must capture the reason.

**i18n.** Reason options + dialog → en/hi/mr.

**Test plan.** Unit: stage→dropped without reason rejected; with reason stored. Manual: drop a case → required reason → appears in CRM win/loss report.

**Effort.** ~1.5 days. **Dependencies.** B.5 (bulk drop parity). **Provenance.** Drop reason in stage_history (immutable audit per AD-02).

---

### F.5 — NPS + exit survey

**Problem (from audit).** No satisfaction measurement and no learning when someone cancels. *Example:* churn happens silently; you never hear why.

**Outcome.** A lightweight NPS survey at day-30 + day-180, and an exit survey when a DSA cancels.

**Screen(s).**
- NPS (in-app, dismissible): "How likely are you to recommend DigitalDSA to another DSA? [0–10]" + optional "What's the main reason?".
- Exit survey (on cancel, before confirming): "Before you go — why are you cancelling? [reasons + free text]" (optional, doesn't block cancel).

**States.** NPS shown once per window, dismissible, never nags. Exit survey skippable.

**Data model.** New `SurveyResponses` collection: `{ user_id, type (nps|exit), score?, reason?, text?, created_at }`.

**API.** **`POST /api/surveys/nps`** + **`POST /api/surveys/exit`** (auth, rate-limited, idempotent per window). NPS trigger via the existing notification/cron timing; exit survey shown inline in the cancel flow (D.1/cancel).

**Business logic.** NPS day-30 + day-180 from signup, once each, dismissible. Exit survey optional — cancel proceeds regardless (don't hold the user hostage). Admin sees aggregate NPS + exit-reason breakdown.

**Edge cases.** User dismisses NPS → don't re-show in that window. Cancel + skip survey → cancel still completes. Re-subscribe later → NPS windows reset appropriately.

**Parity checklist.** Exit survey ties into the D.1 cancel flow + D.4 downgrade — capture reason at voluntary cancel (not at involuntary dunning-downgrade, which has its own signal).

**i18n.** Both surveys → en/hi/mr.

**Test plan.** Unit: NPS shows once per window; exit survey never blocks cancel. Manual: trigger NPS → submit → admin sees it; cancel → exit survey → skip works.

**Effort.** ~2 days. **Dependencies.** D.1 (cancel flow for exit survey). **Provenance.** N/A (analytics data).

---

**Epic F effort total:** ~14–15 dev-days. **Key dependency:** D.1 (subscription hooks for F.1 reward + F.5 exit survey); rule-engine thin mode for F.2.

---

# EPIC G — Integrations (later-quarter workstream)

**Why lighter detail:** these are larger, mostly post-launch, and several (AA, CIBIL) require external registration/licensing. They are specified here at **scope + sequencing + key-decision** depth — not pixel-level — because they're a separate quarter and the tiniest-UI detail would be premature before the external dependencies are secured. When one is greenlit, it gets promoted to a full DoD spec of its own.

**Shared facts:** admin Settings already has an empty "API Key Management" panel (the hook for G.2). The notification/event system (`createNotification`, `src/lib/server/notifications.ts`) is where webhook events (G.1) would fire from.

### G.1 — Outbound webhooks
**Scope.** Let a DSA/RM/global admin register webhook URLs that fire on key events: `case_created`, `case_stage_changed`, `case_disbursed`, `payment_received`, `policy_published`. HMAC-signed payloads, delivery retries with backoff, a delivery log.
**Build shape.** New `Webhooks` collection (subscriber URLs + secret), a `dispatchWebhook(event, payload)` helper called alongside `createNotification` at each event site, a delivery worker (cron or queue) with retry, an admin/DSA UI to register + see delivery status.
**Key decisions before promotion.** Per-DSA vs global-only in v1? Sync inline vs queued delivery? (Recommend: global + per-RM in v1, queued.)
**Effort (indicative).** ~5 days. **Sequence.** First integration — it's the foundation others lean on.

### G.2 — Public read-API
**Scope.** `/api/v1/public/*`, API-key auth (keys minted in the admin Settings panel that's already stubbed). Start read-only: a DSA's own cases + statuses, so their accounting/CRM tools (Tally, Zoho, Excel) can pull data.
**Build shape.** API-key model (hashed, scoped, revocable), a key-auth middleware distinct from the cookie/JWT path, versioned read endpoints, rate-limited per key, documented contract.
**Key decisions.** Read-only v1 (no writes)? Per-key scopes? (Recommend: read-only, scoped to the issuing DSA's data.)
**Effort (indicative).** ~5 days. **Sequence.** After webhooks.

### G.3 — DigiLocker document upload
**Scope.** Let a customer fetch KYC/property documents from DigiLocker instead of manual upload — removes the biggest file-collection friction. **Highest customer-value integration.**
**Build shape.** DigiLocker OAuth + the document-pull API, mapped into the existing document-checklist system; consent-gated; respects DATA-3 retention.
**Key decisions.** Meripehchaan/DigiLocker partner onboarding (external dependency). Which document types in v1 (PAN/Aadhaar/property)?
**Effort (indicative).** ~10 days + partner onboarding. **Sequence.** High-value; prioritize once webhooks/API land.

### G.4 — Account Aggregator (RBI AA)
**Scope.** Consented bank-statement pull for income verification via the RBI AA framework — replaces manual bank-statement collection.
**Build shape.** Integrate an AA gateway/TSP; consent flow; map pulled statements into income profiling. **Requires RBI/FIU-style registration or a TSP partner.**
**Key decisions.** Which AA/TSP partner? Regulatory posture (we're a data consumer). **External dependency — quarter-scale.**
**Effort (indicative).** ~15+ days + registration. **Sequence.** Strategic; after the simpler integrations.

### G.5 — CIBIL / NSDL / UIDAI
**Scope.** Bureau credit pull (CIBIL) + PAN verification (NSDL) + Aadhaar/DigiLocker verification (UIDAI). **Regulated** — CIBIL pull falls under the RBI Credit Information Companies Act; needs a licensing/partner path.
**Build shape.** Per-bureau API integration behind consent; cache per retention rules.
**Key decisions.** Licensing path for CIBIL (the gating dependency). Whether to pull bureau directly or via a lender's pull.
**Effort (indicative).** Unknown until licensing clarified — treat as its own workstream, **do not over-spec now.**
**Sequence.** Last; gated on legal/licensing.

**Epic G effort total (indicative):** ~35+ dev-days across a quarter + external onboarding. Each item promotes to a full DoD spec when greenlit.

---

# EPIC H — i18n + notifications + misc

**Why interleaved:** these are small, cross-cutting, and naturally ride alongside whichever epic touches the same screen. Grouped here so none is forgotten.

**Shared facts:** Queries/Communicate tabs are `disabled: true` at `dashboard/dsa/cases/[case_id]/+layout.svelte:128-129` — the data models (`lender_applications[].queries[]`, `CommunicationThreads`) exist; it's purely a UI gap. `createNotification` (`src/lib/server/notifications.ts`) is the trigger hook; only 2 triggers are wired today.

### H.1 — Hindi/Marathi communication templates

**Problem (from audit).** The 16 customer/RM/source message templates (DSA Communication Hub) are English-only, despite a full 374-key en/hi/mr system. Most borrowers prefer a regional language.

**Outcome.** Every message template has hi + mr variants; the DSA picks the language (or it follows the customer's preferred language).

**Screen(s).** Communication Hub template cards gain a language selector (En/हिं/मर); the filled message renders in the chosen language before WhatsApp share.

**Data model.** Templates move from English-only strings to per-locale variants (en/hi/mr) — extend the existing template config.

**API.** None new — uses the existing `t()` i18n system; templates become i18n keys with 3 locale entries.

**Edge cases.** Variable interpolation (`{{customer_name}}`) must work identically across locales. A template missing an hi/mr variant → fall back to en + flag for translation.

**Parity checklist.** All 16 templates (6 customer + 5 RM + 5 source). The RM-side and source-broker templates too.

**i18n.** This item *is* the i18n work — author hi/mr for all 16.

**Test plan.** Unit: interpolation works per locale; missing-variant falls back. Manual: pick हिं → message renders in Hindi with the name interpolated.

**Effort.** ~2 days (engineering) + translation time (the hi/mr copy itself, ideally native-reviewed).

### H.2 — The 5–8 missing notification triggers

**Problem (from audit).** Only 2 notification triggers are wired; the product feels inert. *Example:* a case gets disbursed and the DSA isn't told.

**Outcome.** Notifications fire on the events that make the product feel alive.

**Screen(s).** No new screen — the existing NotificationBell + list render the new types. (Pairs with B.4's bell count badge.)

**Data model.** Extend the `NotificationType` enum. New types: `case_stage_changed`, `case_disbursed`, `payment_succeeded`, `payment_failed`, `subscription_expiring`, `lender_policy_changed`, `rm_suggestion_received` (RM), `rm_broadcast_received` (DSA).

**API.** Call `createNotification(...)` at each event site: stage endpoint (H pairs with F.4), disbursement, billing webhook (D.1), policy publish (C.6), RM suggestion (PMS Phase 9), broadcast send (C.3). A shared mapping of event→notification keeps it consistent.

**Business logic.** Each trigger has a clear recipient (DSA or RM) + a deep link to the relevant page. Respect a per-user notification-preference (don't spam).

**Edge cases.** Bulk events (B.5 bulk stage-move) → coalesce into one summary notification, not N. De-dupe rapid repeats.

**Parity checklist.** Web Push (handoff §8 follow-up) — the UI exists but delivery code doesn't; when push delivery is built, these same triggers feed it. SMS hub (post-DLT) likewise. Keep the trigger layer delivery-channel-agnostic.

**i18n.** Notification copy per type → en/hi/mr.

**Test plan.** Unit: each trigger creates the right notification for the right recipient with a deep link. Manual: change a case stage → DSA sees a notification; disburse → notification; payment fails → notification.

**Effort.** ~2–3 days. **Dependencies.** Touches D.1 (payment events), C.3 (broadcast), C.6 (policy publish), F.4 (stage).

### H.3 — Date-format consistency helper

**Problem (from audit).** Dates render inconsistently — "6 May" vs "6 May 2026" on the same case-detail page; "17/2/2026, 5:30:00 am" with no zero-padding in admin settings.

**Outcome.** One `formatDate()` helper used everywhere, with a consistent Indian-context format.

**Screen(s).** No new screen — every date display routes through the helper.

**Data model.** None.

**API.** New `src/lib/utils/formatDate.ts` → `formatDate(d, style)` with styles: `short` (06 May 2026), `long` (6 May 2026, 5:30 PM), `relative` (delegates to existing `formatTimeAgo`). Locale-aware (en/hi/mr month names).

**Business logic.** Standardize on `DD MMM YYYY` for dates, `DD MMM YYYY, h:mm A` for datetimes. Zero-pad consistently.

**Edge cases.** Timezone — display in IST consistently. Relative vs absolute — use relative for "ago" contexts, absolute for records.

**Parity checklist.** Audit every date render across DSA/RM/Admin and route through the helper (a grep-and-replace sweep).

**i18n.** Month names per locale.

**Test plan.** Unit: each style + locale. Manual: case-detail dates are consistent; admin settings date is zero-padded.

**Effort.** ~1.5 days (helper + sweep).

### H.4 — Enable Queries & Communicate tabs

**Problem (from audit).** The case-detail Queries and Communicate tabs are disabled, though the data models exist. *Example:* a DSA can't manage lender queries or message in-context, even though the backend supports it.

**Outcome.** Both tabs are enabled and functional.

**Screen(s).** The two tabs (`/cases/[case_id]/queries`, `/communicate`) get real content: Queries = the lender-application query threads (`lender_applications[].queries[]`) with raise/resolve; Communicate = `CommunicationThreads` messaging tied to the case.

**Data model.** None new — `lender_applications[].queries[]` and `CommunicationThreads` already exist.

**API.** Endpoints for queries already exist (`/lender-applications/[id]/queries`); wire the UI. Communicate needs the thread read/post endpoints surfaced.

**Business logic.** Queries: list open/resolved per lender app, raise + resolve. Communicate: threaded messages on the case (DSA ↔ RM, per the RM Communication inbox in Lens 4).

**Edge cases.** Remove the `disabled: true` flags at `+layout.svelte:128-129`; ensure permission-gating (team `cases_edit`).

**Parity checklist.** Communicate ties to the RM-side Communication inbox (Lens 4) — the two ends of the same threads.

**i18n.** Tab content + actions → en/hi/mr.

**Test plan.** Manual: open a case → Queries tab shows lender queries, can raise/resolve; Communicate tab shows/sends messages.

**Effort.** ~3–4 days (it's real feature work, not just un-disabling). **Dependencies.** None. **Provenance.** Query raise/resolve + messages in timeline (AD-02).

**Epic H effort total:** ~9–11 dev-days (+ translation time for H.1).

---

# SPEC COMPLETE — what happens next

All eight epics (A–H) are now specified. Summary of the program:

| Epic | Items | Effort (dev-days) | When |
| --- | --- | --- | --- |
| A — Blockers | 2 | ~4–6 | First (A.1 hotfix can go now) |
| B — DSA polish | 6 | ~10–11 | 2nd |
| C — RM+Admin polish | 8 | ~12–13 | 3rd |
| D — Money (D-now) | 6 | ~15 (Option 1) | 4th |
| E — Compliance | 4 | ~11–12 | 5th |
| F — Growth | 5 | ~14–15 | 6th |
| G — Integrations | 5 | ~35+ | later quarter |
| H — i18n/notif/misc | 4 | ~9–11 | interleaved |
| **D-later** — corporate-DSA payout | 7 | ~20–30 | own program, post-launch |

**In-scope core program (A–F + H):** roughly **75–90 dev-days** of build. G and D-later are separate later programs.

### The path to execution
1. **Owner review + freeze.** Read the spec; flag anything to change *now* (changes are cheap in spec, expensive mid-build).
2. **Resolve the open decisions** (collected below).
3. **Freeze.** Once frozen, execution runs A→B→C→D→E→F (+H interleaved) with no scope changes; new ideas go to the parking lot.
4. **Execution begins** only after the pending roadmap (DATA-4, SEC-2, DX-2/4, PERF-3, Android) clears — except A.1 (RM Settings hotfix), authorized to go early.
5. **Then** PB-7 + PB-8 (credential rotation + email hardening) → launch.

### Open decisions the owner must resolve before/at freeze
1. **D.1 — recurring billing:** Razorpay Subscriptions (recommended) vs build-our-own.
2. **B.6 / D.6 — is Analytics a Pro feature?** (Gate it + upsell, or drop the PRO label.) — resolved together with the pricing-fence.
3. **B.5 — applicant mobile/PAN encryption mode** (deterministic = searchable; random = label-fallback) — a pre-build check, not a product choice.
4. **E.4 — exact money-retention period + post-window redaction** — needs CA/legal sign-off.
5. **G items** — external partner/licensing choices (DigiLocker, AA TSP, CIBIL) — gate their promotion to full specs.
6. **C.6 — "0 published policies"** — diagnose whether it's a counter bug or a stuck pipeline (parked; may become its own ticket).

### Parking lot (carried — not in any frozen epic)
- Performance Score soft-start for first 90 days (from B.6).
- "0 published PMS policies" pipeline diagnostic (from C.6).
- DA (Doc Assessment) tier rationalization vs the redesigned pricing page (from D.6).

---

*End of master spec — all epics A–H specified. Ready for owner review and freeze.*
