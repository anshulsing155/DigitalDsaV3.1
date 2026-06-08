# Data Retention & Analytics Policy — Design Spec

> **Status:** Draft for review. No code changes until this is approved.
> **Author:** 2026-05-19 session
> **Why this exists:** Every privacy-related ticket (encryption migrations, purge jobs, erasure flows, analytics ETL) needs to know one thing — *when does the platform let go of real data, and where does it go afterwards?* This document answers that, in plain English, across all four data audiences (borrower, DSA, RM, analytics) before any code is written.
> **Scope:** Covers four interlocking pieces — **Part A** borrower PII, **Part B** DSA PII, **Part C** RM PII, **Part D** the de-identified analytics plane.

---

## Read me first (the one page that matters)

There are four kinds of people whose data lives on this platform, and they each get different retention rules. Lumping them together is the most common mistake — and it makes both privacy and audit story harder than it needs to be.

| Who | What they are to us | Retention principle (in one sentence) |
|---|---|---|
| **Borrower** | The customer of the DSA — the person actually getting the loan. The platform never talks to them directly. | Real PII kept while the case is in active business use, then stripped to hash + last-4 after a cooling-off window. |
| **DSA** | Our paying customer. The agent who uses the platform. | Real PII kept while the subscription is active OR commission/tax records require it, then stripped. |
| **RM** | A bank's relationship manager — partner of the DSA, not directly our customer (unless they log in). | Same rule as DSA if they log in; same rule as borrower (but per-mention, not per-case) if they're only referenced. |
| **Analytics** | Not a person — a de-identified copy of the operational data, used for business intelligence. | Never sees real PII to begin with; lives essentially forever in bucketed form. |

The single thing that drives the whole borrower policy: **after the platform picks a lender, the DSA often has to fill out that lender's own application form by hand for the borrower** (because not every lender is online). That form needs real PAN, Aadhaar, bank account number — not hashes. So the platform cannot adopt the "throw real borrower PII away right after extraction" pattern. We keep it while a case is active and let it go when business no longer needs it.

The rest of this document is the precise version of those rules, written so you can challenge any line of it.

---

## Section index

**Foundations (read once, applies to everything)**
1. [The three lifecycle states](#1-the-three-lifecycle-states)
2. [The three encryption tiers we already have](#2-the-three-encryption-tiers-we-already-have)

**Part A — Borrower PII**
3. [The offline-lender constraint](#3-the-offline-lender-constraint)
4. [Borrower fields and how each behaves](#4-borrower-fields-and-how-each-behaves)
5. [Case-stage → storage-state mapping](#5-case-stage--storage-state-mapping)
6. [Borrower right-to-erasure short-circuit](#6-borrower-right-to-erasure-short-circuit)

**Part B — DSA PII**
7. [DSA PII overview — different drivers, different rules](#7-dsa-pii-overview)
8. [DSA fields and how each behaves](#8-dsa-fields-and-how-each-behaves)
9. [DSA lifecycle: subscription → cancel → strip](#9-dsa-lifecycle-subscription--cancel--strip)
10. [DSA right-to-erasure interaction with commission records](#10-dsa-right-to-erasure-interaction-with-commission-records)

**Part C — RM PII**
11. [RM PII overview — the AD-04 wrinkle](#11-rm-pii-overview)
12. [RM fields and how each behaves](#12-rm-fields-and-how-each-behaves)
13. [RM retention by usage type (logged-in vs referenced-only)](#13-rm-retention-by-usage-type)
14. [RM right-to-erasure](#14-rm-right-to-erasure)

**Part D — Analytics Plane**
15. [Purpose, audiences, boundary](#15-purpose-audiences-boundary)
16. [Where it lives (store choice)](#16-where-it-lives-store-choice)
17. [What lands in it — three feeds](#17-what-lands-in-it--three-feeds)
18. [Schema sketch](#18-schema-sketch)
19. [The ETL pipeline](#19-the-etl-pipeline)
20. [The one-way bridge — `person_id` derivation](#20-the-one-way-bridge--person_id-derivation)
21. [Analytics retention + re-identification review](#21-analytics-retention--re-identification-review)

**Cross-cutting**
22. [How the audit trail survives PII strip-down (across all four)](#22-how-the-audit-trail-survives-pii-strip-down)
23. [What we deliberately do NOT do](#23-what-we-deliberately-do-not-do)
24. [Open questions you need to decide](#24-open-questions-you-need-to-decide)
25. [Tickets that fall out of this spec](#25-tickets-that-fall-out-of-this-spec)
26. [Cross-references](#26-cross-references)

---

# Foundations

## 1. The three lifecycle states

Every piece of personal data on this platform — whether it belongs to a borrower, a DSA, or an RM — passes through up to three states during its lifetime.

### State A — Active (full PII, recoverable)

- The real value is stored, encrypted at rest using CSFLE (the per-field encryption infrastructure SEC-2 introduced).
- The application can decrypt it on demand for legitimate reads (DSA viewing the profile, file builder rendering the lender form, DSA logging in, RM checking their submissions).
- This is the only state where "fill out the lender's PDF" / "send the DSA a payout receipt" / "let the RM into their portal" actually works.

### State B — Cold (stripped to hash + last-4 + first-name-only)

- The real value is **deleted**. What survives:
  - A SHA-256 hash of the value, salted with a server-side secret (the "pepper") — used for "have we seen this person before" checks, and nothing else.
  - The last 4 characters of the original (or first name for names) — used for human-readable display ("PAN: \*\*\*\*\*\*1F").
- The application **cannot** reconstruct the real value from what remains. This is a one-way step.

### State C — Erased (record-keeping row only)

- Triggered by DPDP §13 right-to-erasure: the data subject (borrower via DSA, or DSA themselves, or RM) asks to be forgotten.
- The hash + last-4 also go away. What remains is a tombstone in the audit log saying "data existed for this person and was erased on date X."
- The analytics-plane row (if one exists) loses its `person_id` link — the row stays for aggregate trend integrity, but it can't be tied back to any individual.

**The entire retention policy is just deciding when each piece of data moves from A → B → C.** Different actor types have different triggers; the rest of this spec lays each one out.

---

## 2. The three encryption tiers we already have

This spec sits on top of three existing protections. Worth recapping because the retention rules reference them.

- **Disk encryption at rest** (MongoDB Atlas WiredTiger). Protects against someone walking off with the physical disk. Always on, no per-field configuration.
- **CSFLE Deterministic** (SEC-2). Same value always encrypts to the same ciphertext. Used for fields we need to *search* by — mobileNumber, email, PAN. Slight equality-leak in exchange for query-ability.
- **CSFLE Random** (SEC-2). Same value encrypts to a different ciphertext each time. Strongest privacy. Used for fields we only ever read after we've already found the record — full name, address, Aadhaar, bank account, income figures, full form payload.

The retention policy in this spec adds a **fourth tier** that sits below these:

- **Hash + last-4 only.** The real value is gone. What remains is a one-way SHA-256 with a server pepper, plus 4 characters for display. Equivalent privacy to "we never collected it" if the pepper is well-protected. Use only when business no longer needs to read the value back.

---

# Part A — Borrower PII

This is the borrower — the customer of the DSA, the person actually getting the loan. The platform never communicates with them directly; the DSA does, on their behalf.

## 3. The offline-lender constraint

A pure eligibility calculator could throw away the borrower's real PAN/Aadhaar/bank-account numbers right after extraction. We can't, because of this:

1. DSA enters/uploads the borrower's details
2. Rule engine recommends lenders
3. DSA picks a lender
4. DSA enters the loan application with that lender — through the lender's API if available, **or by filling the lender's own PDF/paper form** if not
5. Lender processes → eventually disburses or rejects

Step 4 needs the real values. Filling out HDFC's home-loan PDF needs the actual Aadhaar number, not its hash. So **while a case is active, the platform holds real values (encrypted)**, and the DSA can read them back to fill forms. Once the case is finally closed, the business need goes away — that's when stripping happens.

One sentence: **real borrower PII lives as long as the case is in active business use, and no longer.**

## 4. Borrower fields and how each behaves

| Field | While case is Active (State A) | When case goes Cold (State B) | Notes |
|---|---|---|---|
| Full PAN number | CSFLE deterministic | **Strip → pan_hash + pan_last4** | Lender form needs real value while active |
| Full Aadhaar number | CSFLE random | **Strip → aadhaar_hash + aadhaar_last4** | Same |
| Bank account number | CSFLE random | **Strip → bank_account_hash + bank_account_last4** | Same |
| IFSC code | Plaintext | Stays plaintext | Not sensitive on its own |
| Full name | CSFLE random | **Strip → first name only** | First name lets the DSA recognize old customers; last + middle removed |
| Date of birth | CSFLE random | **Strip → keep age bracket only** | "35–40" is enough for past-history display |
| Full address | CSFLE random | **Strip → keep pincode + city only** | Same logic as DATA-1's locality bucket |
| Monthly income | CSFLE random | Stays CSFLE | DSA may re-quote a closed case |
| Other financial numbers (obligations, property value) | CSFLE random | Stays CSFLE | Same |
| Employer name | CSFLE random | **Strip → keep industry category only** | Specific employer can re-identify; industry is fine |
| Source documents (file metadata, not the documents themselves) | Plaintext | Stays plaintext | extractor_version + confidence — no PII |
| Original uploaded images / PDFs | DATA-3 governs (deleted after extraction once verified) | Already deleted by DATA-3 | Not in scope for this spec |

**Reading the table:** the rows marked "Strip" are where the real values get deleted at cold-down. Everything else either stays encrypted (because there's still a business reason to read it back) or was never sensitive on its own.

## 5. Case-stage → storage-state mapping

The platform has 11 case stages (per `src/lib/types/case.ts`). Each maps to a single borrower-PII state.

| Case stage | PII state | What this means |
|---|---|---|
| `intake` | State A | DSA entering data; no lender picked yet |
| `profiling` | State A | Eligibility being computed |
| `file_building` | State A | DSA filling lender's form (the constraint that drives this whole spec) |
| `submitted` | State A | Form submitted; lender may come back with queries needing real values |
| `processing` | State A | Lender reviewing |
| `query` | State A | Lender raised a query; DSA may need to resubmit with real values |
| `sanctioned` | State A | Lender said yes but disbursement may still need the form |
| `disbursed` | **State A → State B after cooling-off** | Money landed; business use of real PII is done |
| `closed` | **State A → State B after cooling-off** | Case finished |
| `rejected` | **State A → State B after cooling-off** | DSA may re-route to another lender (Open Q1) |
| `dropped` | **State A → State B after cooling-off** | Case abandoned |

**Cooling-off window:** time between "case reached a final stage" and "real PII gets stripped." Proposed default: **90 days**. Round number, aligns with most lender post-disbursal query windows, short enough to limit blast radius. Tunable per DSA subscription tier if needed.

The strip-down runs as a nightly job, idempotent, audit-logged.

## 6. Borrower right-to-erasure short-circuit

DPDP §13 gives the borrower the right to ask for their data to be erased. The DSA forwards the request through a support flow.

When it happens:

1. Move the case from whatever state it's in to **State C** immediately — no cooling-off wait.
2. Clear the hash + last-4 as well (in State B those survived; in State C they don't).
3. The case audit log gets a row saying "erasure requested on date X by [actor], processed on date Y."
4. The analytics-plane row (if one exists) loses its `person_id` field.

**What does NOT get erased:**

- The case's stage history (timestamps + transitions). Required for AD-05 audit trail.
- The DSA's internal case ID assignment (e.g., `HL-2026-0042`). DSA needs it for their records.
- The amount eventually disbursed (if any). Required for DSA commission accounting.
- The lender selection record. Non-PII business data.

What's left after erasure: "a case happened, here are its dates and money, no idea who the borrower was."

---

# Part B — DSA PII

The DSA is our paying customer. The relationship is continuous, and the retention drivers are completely different from a borrower's.

## 7. DSA PII overview

A DSA is **not** like a borrower. Key differences:

- **They have an active relationship with us.** They log in, they pay subscription fees, we send them payouts, they share cases with RMs.
- **We have legal obligations to retain some of their data even after they leave.** GST records, payout history, anti-money-laundering audit (if it ever becomes relevant).
- **They consented directly when signing up.** We don't need a DSA-as-intermediary to obtain consent (the DSA's consent path is directly between them and us).
- **Their PII is the platform's identity key.** Their mobileNumber is the login. Stripping it while their account is active breaks their login.

So the rule "strip after cooling-off" doesn't apply the same way. A DSA's PII lives **as long as they're an active customer**, AND **as long as financial / tax records require retention**, whichever is longer.

## 8. DSA fields and how each behaves

| Field | While subscription is Active (State A) | After cancellation + retention window (State B) | Notes |
|---|---|---|---|
| `mobileNumber` | CSFLE deterministic (login key) | **Strip → mobile_hash + mobile_last4** | Login no longer needed once subscription is cancelled and the retention window passes |
| `email` | CSFLE deterministic | **Strip → email_hash + email_local_part** | "j\*\*\*@gmail.com" enough for "have we seen this email" |
| DSA's own PAN | CSFLE deterministic | **Strip → pan_hash + pan_last4** | Needed for GST / tax compliance during active relationship |
| Full name | CSFLE random | **Strip → first name only** | Same rule as borrower |
| Date of birth | CSFLE random | **Strip → age bracket only** | If we even collect it (Open Q DSA-1) |
| Business / firm name | CSFLE random | **Strip → industry category only** | Same as employer-name treatment for borrowers |
| Address (residential + business) | CSFLE random | **Strip → city + state only** | Pincode optional if we want finer-grained analytics-side aggregation |
| Aadhaar (if collected) | CSFLE random | **Strip → aadhaar_hash + aadhaar_last4** | Aadhaar should arguably never be collected from DSAs — see Open Q DSA-2 |
| Bank account for payouts | CSFLE random | **Strip → bank_hash + last4** AFTER all payouts have settled | Payout reconciliation must finish first |
| Razorpay customer ID / GSTIN | Plaintext (it IS the business identifier) | Stays plaintext | Not sensitive on its own — they're business identifiers, used for legal/tax record-keeping |
| Subscription tier, plan history | Plaintext | Stays plaintext | Business records, not PII |
| Payout history (amount, date, reference) | Plaintext | **Stays plaintext for 6+ years** | GST + Income Tax record retention; PII fields within payout (name, account) get the strip-down treatment above |

## 9. DSA lifecycle: subscription → cancel → strip

A DSA's PII state-machine:

| Lifecycle event | PII state action |
|---|---|
| DSA signs up | All fields enter State A (encrypted, recoverable) |
| DSA renews subscription | No change — stays State A |
| DSA cancels subscription | No immediate change — enters a **post-cancellation retention window** |
| Post-cancellation retention window elapses | All fields move to State B (strip-down), except the payout history retained for tax/GST reasons (those keep their PII fields stripped, but the financial line items survive) |
| DSA reactivates within the window | Resumes State A — like nothing happened |

**Post-cancellation retention window:** This is the DSA-side equivalent of the borrower cooling-off window. Proposed default: **6 years**. Rationale: Indian Income Tax Act + GST require 6-year retention of taxable transaction records, and the DSA's payout history is a taxable transaction. Their PII attached to those records can be stripped (the records survive without name/address details), but doing it earlier than the retention window risks an audit asking "whose payout was this?"

This is significantly longer than the borrower cooling-off window. That's intentional — the DSA is on our books, the borrower is not.

## 10. DSA right-to-erasure interaction with commission records

DPDP gives DSAs the right to erasure too. But the tax / GST retention requirements are a competing legal obligation. The reconciliation:

- **Erasure clears the DSA's PII** (name, address, contact, PAN-as-personal-id) immediately on request.
- **Commission / payout transaction lines survive**, but with the PII fields **already stripped** (name → first name, mobile → hash, etc.). Each line still has the rupee amount, date, GST treatment, payout reference number.
- The transaction lines effectively become "a DSA was paid ₹X on date Y for case Z," with no individual identification.
- The platform documents this in the public consent text: "Even if you ask us to forget you, we are legally required to retain commission and tax records in a non-identifying form for [N] years."

This is the same shape as how banks handle deceased / closed-account customers — the financial line items survive in a form that satisfies tax auditors but cannot identify the individual.

---

# Part C — RM PII

The RM (relationship manager at a bank) is the third actor. They get **two completely different sets of rules** depending on how they appear on the platform — and that distinction is the key insight of Part C.

## 11. RM PII overview

There are two paths an RM can show up on this platform:

1. **The RM logs in** to the RM Portal. They have an account, a subscription (free or paid), they manage their assigned lenders' policies, they review submissions from DSAs.
2. **The RM is referenced as a contact** by a DSA — a DSA shared a case with "Rajesh Kumar, HDFC, +91-98...", or recorded an RM contact card, but Rajesh himself never logged in.

These two RMs have **different consent stories**. The logged-in RM consented directly. The referenced-only RM never agreed to be on our platform — the DSA added their info as part of using our CRM-like features.

This shapes everything that follows in Part C.

### The AD-04 wrinkle

CLAUDE.md AD-04 says the RM database is **centralized and crowdsourced from all DSAs, shared globally, non-competitive**. That means RM contact records aren't per-DSA — they're platform-wide. If DSA A enters "Rajesh, HDFC" and DSA B independently enters "Rajesh, HDFC," the platform may merge them.

The wrinkle: the RM didn't consent to being a platform-wide entity. They consented (if at all) to being one DSA's contact.

Reconciliation: the merged RM record exists for **search by other DSAs**, but the identifying details (mobile, email) follow the strictest privacy rule among all the DSAs who contributed. If any contributing DSA marks the RM as "do not share more widely," the wider visibility is suppressed.

## 12. RM fields and how each behaves

| Field | Logged-in RM (active) | Referenced-only RM (active mention) | When the case mentioning them goes Cold |
|---|---|---|---|
| `mobileNumber` | CSFLE deterministic | CSFLE deterministic | **Strip → hash + last4** |
| Official email (e.g. rajesh.kumar@hdfc.com) | CSFLE deterministic | CSFLE deterministic | **Strip → hash + domain only** ("\*\*\*@hdfc.com" — bank affiliation survives as non-PII) |
| Full name | CSFLE random | CSFLE random | **Strip → first name only** |
| Bank affiliation (lender_id) | Plaintext | Plaintext | Stays plaintext (it's the RM's professional identity, not PII) |
| Lender assignments (which products at which bank) | Plaintext | N/A (not collected for referenced-only) | Stays plaintext |
| Personal mobile / WhatsApp (if separate from official) | CSFLE random | CSFLE random | **Strip → hash + last4** |
| LinkedIn URL (if recorded) | CSFLE random | CSFLE random | **Strip entirely** — no last-4 equivalent for URLs |

## 13. RM retention by usage type

### Logged-in RMs (same shape as DSAs)

Same lifecycle as a DSA:
- Active account: State A
- Account inactive for [N] months (proposed: 18 months — long enough that occasional RMs don't lose access): warning email
- Account inactive past warning + grace period: State B
- Erasure request: State C immediately

The retention window for logged-in RMs is **shorter than DSAs** because RMs aren't transacting through the platform — there's no tax retention requirement.

### Referenced-only RMs (where the AD-04 wrinkle matters)

The retention is **per-mention**, not per-RM. A referenced RM exists because **some DSA mentioned them on some case**. The mention's lifetime is tied to that case's lifetime:

- Case mentioning the RM is in State A → the RM mention stays in State A
- Case goes Cold (State B) → the RM mention goes Cold for that case
- If the RM is mentioned on multiple cases → the RM record stays in State A as long as ANY mentioning case is in State A; only when the last mentioning case goes Cold does the RM record itself transition

When the last mentioning case goes Cold, the RM record gets stripped to:
- Bank affiliation (lender_id) — survives
- Hashed mobile + last-4 — for "have we seen this RM before"
- Hashed email + domain — for "this RM works at HDFC"
- First name — for display

The crowdsourced RM database thus accumulates **professional information** about each RM (bank, products) while shedding **personal information** (full mobile, email) over time.

## 14. RM right-to-erasure

DPDP applies to RMs equally. The wrinkle: an RM who's only been referenced (never logged in) probably doesn't know they're on the platform. We have two obligations:

1. **Honor erasure requests** the moment they arrive (via the RM directly, OR via a referencing DSA on the RM's behalf).
2. **Don't surface RM contact info to other DSAs without consent** — the AD-04 sharing has to respect "do not share" markers.

The mechanism is the same as for borrowers — immediate strip to State C, audit row, analytics row loses its link.

---

# Part D — Analytics Plane

The fourth audience is not a person — it's a downstream data store that exists to answer business questions without ever touching identifying information.

## 15. Purpose, audiences, boundary

**Purpose:** Make the platform's data useful to two audiences without anyone needing to handle real PII.

| Audience | What they want to know |
|---|---|
| **Internal business** | Lender market share by region, conversion funnel by DSA segment, which loan types are growing, what's the average ticket size in Tier-2 cities, where are the dropped cases concentrated, etc. |
| **DSA-facing** | Each DSA gets a dashboard of their own performance compared against anonymous peer averages: "your average eligible amount is ₹14L vs peer average of ₹11L in your region." |

**Boundary:** The analytics plane **never sees real PII**. Ever. Not encrypted PII, not raw PII. Only de-identified, bucketed, aggregated data crosses the bridge.

- Names → first-name dropped completely on the analytics side
- Mobile / email / PAN / Aadhaar → never appears, not even hashed
- Date of birth → becomes age bracket
- Full address → becomes pincode + city + state + region tier
- Employer name → becomes industry category

The operational plane and the analytics plane share **one anonymous identifier per person** (`person_id`) so that "how many unique borrowers did we serve" works, but the `person_id` is a one-way hash of the borrower's `pan_hash` salted with an analytics-only pepper — even with full operational DB access, you cannot compute the analytics-side `person_id`s without the pepper.

## 16. Where it lives (store choice)

Three options:

| Option | Pros | Cons |
|---|---|---|
| **MongoDB analytics database (separate DB on same Atlas cluster)** | Same infra, same connection logic, no new ops burden. Reuses existing CSFLE-disabled connection. | Mongo is not built for analytical queries — large GROUP BY operations are slow vs Postgres / BigQuery. |
| **PostgreSQL (separate instance)** | Built for analytical queries. Schema enforces shape — easier to spot bad data. | New infra, new ops burden, new connection layer, new query language. |
| **BigQuery** | Built for very large analytical queries, columnar, serverless, cheap to query. | Most foreign to current stack. Requires GCP project setup. |

**Proposed default for v1:** MongoDB analytics database — a new logical database (e.g. `digitaldsa_analytics`) on the existing Atlas cluster. Same ops, same connection, same backup. Easy to migrate later if analytical query volume justifies it.

**Migrate to BigQuery when:** monthly query volume crosses a threshold (e.g. 1M rows scanned per query, daily). At that point the Atlas cost for analytical workloads outweighs BigQuery's per-query billing.

## 17. What lands in it — three feeds

Three separate ETL feeds, one per actor type:

### Feed 1 — Case analytics (borrower-derived, the largest feed)

One row per case. Created when the case reaches `submitted` (the point at which we know enough to be useful). Updated on each subsequent stage transition.

### Feed 2 — DSA analytics

One row per DSA. Created at DSA signup. Updated on subscription tier change, plan renewal, churn.

### Feed 3 — RM analytics

One row per (logged-in) RM. Created at RM signup or first mention. Updated on lender assignment changes, submission counts.

Referenced-only RMs don't get their own analytics row — they show up only as aggregate counts ("HDFC RMs handled X cases in Mumbai in Q1") in the case-analytics feed.

## 18. Schema sketch

A starting point — adjust during implementation based on actual query needs.

### `analytics_cases`

```
case_id              (string, the operational case_id, NOT secret)
person_id            (string, anonymous hash — see §20)
dsa_id               (ObjectId, links to analytics_dsa)
rm_id                (ObjectId, optional, links to analytics_rm)
opened_at            (date)
closed_at            (date, nullable while case is open)
final_stage          (enum: disbursed | closed | rejected | dropped)
loan_type            (enum: home | lap | plot | personal | business | professional)
loan_amount_requested  (number, exact)
loan_amount_eligible   (number, exact)
loan_amount_sanctioned (number, exact, nullable)
loan_amount_disbursed  (number, exact, nullable)
tenure_months        (number, exact)
emi_amount           (number, exact)
interest_rate_band   (enum: <9% | 9-10% | 10-11% | ... )

# Borrower demographics (bucketed)
borrower_age_bracket (enum: 18-25 | 25-30 | 30-35 | ... | 65+)
borrower_gender      (enum, optional)
borrower_marital     (enum: single | married | other, optional)
borrower_employment_type  (enum: salaried | self_employed | business)
borrower_industry    (enum: derived from employer name; ~30 categories)
borrower_income_exact     (number)
borrower_income_bracket   (enum, for k-anonymity grouping)
borrower_obligations_exact (number)
borrower_obligation_ratio  (number, ratio not raw amount)

# Geography (bucketed)
borrower_pincode     (string, 6 digits — already a 2-10 km² bucket)
borrower_city        (string)
borrower_state       (string)
borrower_region_tier (enum: Tier 1 | Tier 2 | Tier 3 | Rural)

# Property / asset (if applicable)
has_property         (boolean)
property_type        (enum: apartment | independent | plot | commercial)
property_value_bracket  (enum)
property_pincode     (string, 6 digits)

# Lender selection (the analytics gold)
recommended_banks    (array of {bank, score, reason})
top_bank             (string)
top_bank_score       (number)
selected_bank        (string, nullable until sanctioned)
selection_reason     (enum: best_offer | dsa_preference | borrower_preference | only_option)

# Calculation engine version (for reproducibility)
engine_version       (string)
created_at           (date)
updated_at           (date)
```

### `analytics_dsa`

```
dsa_id               (ObjectId)
dsa_region           (string, derived from DSA address city)
dsa_state            (string)
dsa_subscription_tier (enum)
dsa_signed_up_at     (date)
dsa_status           (enum: active | inactive | cancelled)
total_cases          (number, denormalized counter)
total_disbursed_amount (number, denormalized)
last_active_at       (date)
```

### `analytics_rm`

```
rm_id                (ObjectId)
rm_lender_id         (string, which bank)
rm_lender_products   (array of strings)
rm_signed_up_at      (date)
rm_status            (enum: active | inactive | referenced_only)
submission_count     (number, denormalized)
last_active_at       (date)
```

## 19. The ETL pipeline

**Trigger pattern:** Nightly batch (proposed for v1). Upgrade to real-time MongoDB Change Streams only if a real business need surfaces.

**Pipeline shape:**

1. **Read** from operational stores — Cases (with stage in {submitted, processing, query, sanctioned, disbursed, closed, rejected, dropped}), DsaApplications, rmApplications, latest FormSnapshots per case.
2. **Decrypt** the CSFLE fields needed for de-identification (full name, DOB, address, employer name, income figures).
3. **De-identify** per the tables in §4 / §8 / §12.
4. **Compute** the derived bucketed fields (age bracket from DOB, region tier from city, income bracket from amount, industry category from employer name).
5. **Hash** the `pan_hash` with the analytics-only pepper to produce `person_id`.
6. **Discard** all real PII — no real PAN, no name, no full address ever lands.
7. **Upsert** the analytics row by `case_id`. New rows for new cases; updates for stage transitions on existing cases.

**Error handling:**
- A failed row is logged + retried on the next night. Never block the rest of the batch on one bad row.
- A row that consistently fails (5+ nights) is flagged for manual review.

**Idempotency:**
- Re-running the ETL on the same source rows must produce identical output. Achieved by deterministic de-identification (same input → same bucket) and HMAC `person_id` (same `pan_hash` → same `person_id`).

## 20. The one-way bridge — `person_id` derivation

The single thing that makes the operational and analytics planes structurally separated is the `person_id` derivation. Plain English:

- The operational store has `pan_hash` (already a salted SHA-256 with one pepper — let's call it the "operational pepper").
- The analytics store has `person_id`, which is a SHA-256 HMAC of `pan_hash` using a **different** pepper (the "analytics pepper").
- The analytics pepper is held by the ETL job only. It is never available to the operational application code, and not available to anyone who can read the analytics warehouse.

Practical consequences:

1. Operational DB breach → attacker gets `pan_hash` values. Cannot compute `person_id` without the analytics pepper. Cannot correlate analytics rows back to the operational rows.
2. Analytics DB breach → attacker gets `person_id` values. Cannot reverse to `pan_hash` (HMAC is one-way). Cannot reverse from `pan_hash` to PAN (already one-way per operational design).
3. Both DBs breached → attacker has both. Still cannot reverse to PAN without breaking SHA-256. The peppers being unknown make brute-force computationally infeasible.

This is the structural privacy guarantee. It survives any access-control failure.

## 21. Analytics retention + re-identification review

Analytics data is **de-identified by construction**, so retention can be effectively forever (5–10 years as a practical default — long enough for "lender trend over the past 3 years" queries).

**But — re-identification risk grows over time** as the dataset accumulates rare combinations. A 2-year-old row with `age_bracket=70+` + `pincode=400089` + `employer_industry=academia` + `income_bracket=>50L` may be unique enough to identify a single retired professor.

**Quarterly de-identification review** — a recurring task to check:
- Any combinations of fields that now uniquely identify <5 rows in the entire dataset? If yes, re-bucket those fields more coarsely (e.g., age 70+ collapses to 60+).
- Any new fields added to the schema that need their own bucketing rules?
- Any aggregates surfaced in dashboards that drill down too far (a "DSA performance" view showing data on only one DSA's customers may inadvertently re-identify if the DSA has few customers)?

This review is operational hygiene, not one-time architecture. Schedule it.

---

# Cross-cutting

## 22. How the audit trail survives PII strip-down

Your CLAUDE.md §2 has **AD-05: every edit = new version, snapshots never deleted, audit trail mandatory**. The retention rules in Parts A through D **don't violate AD-05** — but they refine it.

The refinement, in plain English: **the audit trail tracks the existence and shape of events. It is NOT a long-term store for real PII content.**

Concretely:

- `FormSnapshots` row created at time T1 → exists forever. Its `payload_hash` exists forever. Its `payload` (encrypted JSON blob) **has its PII fields stripped** at cooling-off, but the row, its hash, and its non-PII fields survive.
- `TimelineEvents` rows exist forever — they describe state changes, never carried PII content.
- `Cases.stage_history` survives forever — all timestamps and stage names.
- New audit rows added by this spec (strip-down events, erasure events, RM contribution events) are append-only.

The result: a regulator can answer "did this case happen, who handled it, what stage transitions did it go through, when did its PII get cleared, who requested erasure when?" — every one of those questions is answerable from rows that survive.

The only thing that does NOT survive is **the real PII content itself**, past the point where business has no legitimate need for it. That's not a violation of AD-05; it's data minimization, which DPDP requires.

**Needs an ADR update** that refines AD-05 with this clarification.

## 23. What we deliberately do NOT do

Scope discipline. The following are explicitly **out of scope** for this policy:

- **A separate tokenization vault.** Hash + last-4 is sufficient; no need for a third store holding raw PAN/Aadhaar.
- **Cross-DSA borrower dedup.** `pan_hash` is peppered with `dsa_id` — DSA A and DSA B independently seeing the same borrower get different hashes. By design, not a bug.
- **Lender-side PII** (loan officer names, sanction signatories). Not collected.
- **Treatment of lender business data** (rate cards, policy documents). That's `PmsLenderPolicies` territory — different docs entirely.
- **WORM-storage** style append-only physical media. Mongo's append-only collections are sufficient.
- **HSM (hardware security module).** KMS-level key storage is sufficient for our threat model.

## 24. Open questions you need to decide

Flagged separately by part so you can answer one at a time.

### Borrower (Part A)

- **B-1.** Cooling-off window length (proposed 90 days). Should it differ per DSA tier or lender category?
- **B-2.** "Re-route after rejection" — should starting a new lender application on a rejected case reset the strip-down clock?
- **B-3.** Borrower returns 6 months later — is stripped State-B data enough to "recognize" them, or should we keep real PII longer for power-DSAs who serve repeat customers?
- **B-4.** File-builder behavior on Cold cases — refuse the rebuild, or prompt DSA to re-enter stripped fields?

### DSA (Part B)

- **D-1.** Post-cancellation retention window length (proposed 6 years — the GST retention floor). Should it be longer for DSAs in regulated states?
- **D-2.** Do we ever collect Aadhaar from DSAs? If yes, why? If no, this can be deleted from §8 entirely.
- **D-3.** When a DSA cancels mid-month, what happens to cases that are still active (in States `intake` through `sanctioned`)? Treat as orphaned → the cooling-off clock for those cases starts immediately? Or freeze them indefinitely?

### RM (Part C)

- **R-1.** Logged-in RM inactivity threshold (proposed 18 months). Right for the market?
- **R-2.** Referenced-only RM appearing on cases for multiple DSAs — confirm the "stay in State A while ANY mentioning case is in State A" rule. Alternative: per-DSA mentions strip independently.
- **R-3.** Should a referenced RM be **notified** that they exist on our platform? GDPR-style notification (the borrower-equivalent didn't apply here since DSAs handle consent, but RMs are different — they're professionals whose data we hold without their direct consent). DPDP §5 says the data fiduciary should give notice... lawyer-confirm.

### Analytics (Part D)

- **A-1.** Store choice for v1 — MongoDB analytics DB on same cluster (default proposal) vs PostgreSQL vs BigQuery. Confirm.
- **A-2.** ETL trigger — nightly batch (default) vs MongoDB Change Streams (real-time). Confirm nightly for v1.
- **A-3.** DSA dashboards using the analytics plane — what's the smallest set of charts that would deliver real value to a DSA? Will drive what bucketing fields matter.
- **A-4.** Internal business dashboards — same question, different audience.
- **A-5.** Quarterly de-identification review — who owns it? Engineering / DPO / a rotation?
- **A-6.** Backup + access policies for analytics — same region as operational (Mumbai)? Separate role boundary so analytics access doesn't grant operational access?

### Cross-cutting

- **C-1.** Right-to-erasure SLA (industry norm 30 days). OK to commit publicly?
- **C-2.** Audit log retention — cap at 7 years and roll older entries into compressed archives? Or keep indefinitely?
- **C-3.** Data Processor vs Data Fiduciary. The other-tool doc flagged this; needs legal counsel. I lean Data Fiduciary — the platform makes substantive decisions (rule engine, lender ranking, lead routing). Affects the consent text.

## 25. Tickets that fall out of this spec

In rough dependency order. None should start until this spec is approved.

### Foundation
1. **ADR-NNNN: Refine AD-05 with PII strip-down.** Short ADR formally clarifying that "snapshots never deleted" means "snapshots survive forever; their PII fields are stripped at cooling-off per the retention policy." Updates `CLAUDE.md §2`.
2. **Add `final_stage_at` timestamp on `Cases`.** Cooling-off clock needs this.
3. **Hash + last-4 helper utilities.** Mirror DATA-1's bucketing utilities. Pepper from env var, deterministic, well-tested.
4. **General-purpose log redaction middleware.** Mentioned in the prior Tier-1 list — applies cross-cutting; doesn't need the policy spec approved first.

### Borrower (Part A)
5. **Nightly borrower-PII strip-down job.** Scans for cases past cooling-off, strips per §4, writes audit row.
6. **Erasure request endpoint + workflow (borrower).** DSA-facing UI → backend → audit.
7. **File-builder behavior on Cold cases.** Implements the Q B-4 decision.

### DSA (Part B)
8. **Subscription-cancellation lifecycle.** Tracks cancellation date, schedules State-B transition for 6 years out.
9. **Nightly DSA-PII strip-down job** (separate from borrower job — different rules).
10. **Erasure request endpoint + workflow (DSA-side).**
11. **Commission record PII strip** — keeps line items, strips name/account fields.

### RM (Part C)
12. **RM lifecycle tracker** — distinguishes logged-in vs referenced-only.
13. **Nightly RM-PII strip-down job.** Logged-in inactive path + referenced-only-per-case path.
14. **AD-04 cross-DSA visibility respect.** "Do not share" markers honored on RM contact records.
15. **Erasure request endpoint + workflow (RM-side, possibly initiated by referencing DSA).**

### Analytics (Part D)
16. **Analytics DB / collections set up.** New `digitaldsa_analytics` database; collections per §18.
17. **ETL pipeline — case analytics.** Nightly batch; idempotent; de-identification per §4.
18. **ETL pipeline — DSA + RM analytics.** Smaller feeds; same shape.
19. **`person_id` HMAC derivation.** New env var for analytics pepper; key rotation procedure documented.
20. **Quarterly de-identification review process.** Calendar reminder + runbook.
21. **Internal business dashboards.** Builds on §18 schema.
22. **DSA-facing peer benchmark dashboards.** Same source data, different audience.

## 26. Cross-references

- `CLAUDE.md` §2 — AD-05 (every edit = new version) — this spec proposes refining the wording
- `CLAUDE.md` §13 — AD-04 (centralized RM database) — referenced in Part C
- `docs/adr/0006-data-segregation-and-sequencing.md` — current data-area sequencing decision
- `docs/specs/SEC-2-CSFLE-PLAN.md` — the encryption infrastructure this policy sits on top of
- `docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md` — the bucketing/k-anonymity patterns this spec extends to broader analytics
- `docs/specs/DATA-3-FILE-DELETION-SPEC.md` — already-shipped doc-deletion lifecycle; this spec is its post-extraction counterpart for structured PII
- `src/lib/types/case.ts` — the Case + stage definitions referenced in Part A §5
- `src/lib/server/csfle/keys.ts` — the existing CSFLE field key registry
- The original document the user shared from another tool — referenced as architectural inspiration; this spec diverges on the offline-lender constraint and adds Parts B / C / D.

---

*End of spec. Awaiting review. Mark with section-by-section comments or "approve this section" / "rewrite this section" so we can iterate. Implementation tickets do not start until this is signed off.*
