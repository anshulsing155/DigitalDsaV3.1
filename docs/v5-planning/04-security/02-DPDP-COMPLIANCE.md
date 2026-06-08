---
type: security
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# DPDP Act 2023 — Compliance Mechanism

## What DPDP requires

The Digital Personal Data Protection Act 2023 establishes:
1. **Notice and consent** for processing personal data
2. **Purpose limitation** — data used only for declared purpose
3. **Data subject rights** — access, correction, erasure
4. **Reasonable security safeguards**
5. **Breach notification** to Data Protection Board within prescribed time
6. **Specific protection for children's data** (we don't process children's data)
7. **Significant Data Fiduciary** (SDF) obligations if scale crosses threshold

We operate as a **Data Fiduciary** (we determine purpose and means). DSAs are joint Data Fiduciaries for their customer data — they're the ones taking consent face-to-face.

## How consent is captured

### At customer creation

When a DSA creates a customer record, they confirm one of:
- "I have a signed consent letter from this customer authorising me to process their data for loan sourcing." (uploaded scan)
- "I have a verbal consent recorded via WhatsApp message." (link to message)
- "I am only capturing this for a single case; will collect formal consent before processing." (consent grace period: 7 days)

The mode is recorded in `customer.consents[]`:

```typescript
interface Consent {
  _id: ObjectId;
  customer_id: ObjectId;
  purpose: 'loan_processing' | 'cross_case_kyc_reuse' | 'communication' | 'analytics_aggregate';
  granted_at: Date;
  granted_by_user_id: ObjectId;
  evidence_kind: 'signed_letter' | 'whatsapp_message' | 'in_person_verbal' | 'grace_period';
  evidence_ref?: string;            // S3 URL of scan / message ID
  revoked_at?: Date;
  revoked_reason?: string;
}
```

### For cross-case KYC reuse

Reusing a customer's KYC (PAN, Aadhaar, payslip, ITR) across multiple cases requires **separate consent**. UI prompts on second case creation:

> "Priya Singh has KYC documents from her earlier Home Loan case. Reuse them for this LAP? Reuse requires Priya's consent to use those documents for this purpose."
> [Confirm consent obtained] [Skip — collect fresh]

### For external partner sharing

If a Partner (builder/CA) needs visibility into the case status of leads they referred:
- Partner sees status only (Applied / Sanctioned / Disbursed / Rejected), not customer details
- Customer's mobile is never shown to Partner
- This sharing is **default-deny**; Partner sees status only if a specific opt-in is granted

## Data subject rights

| Right | How exercised | Response time |
|---|---|---|
| **Access** — get a copy of all my data | DSA submits a request via support; system runs full export | 7 days |
| **Correction** — fix wrong data | DSA updates via dashboard or support submits a ticket | Real-time / 3 days |
| **Erasure** — delete my data | DSA requests via support; verified erasure within 30 days | 30 days |
| **Withdraw consent** — stop processing | Revoke consent row; affected operations halt | Immediate |

### Erasure mechanism

Erasure is harder than deletion:

1. **Mark for erasure** — customer record gets `marked_for_erasure_at`. Downstream services treat as deleted.
2. **Cascade to related entities** — cases, conversations, documents, follow-ups all marked.
3. **Tombstone event emitted** — propagates to ClickHouse to remove from analytics aggregates.
4. **Encryption key rotation for that customer's DEK** — even backup copies become unreadable.
5. **Audit log entry** — what was erased, when, by whom.
6. **Backups expire** — backup retention is 90 days; after 90 days, the encrypted backup is unreadable without the rotated key, so practically erased.

A customer fully erased takes 90 days for backups to age out. We disclose this in the privacy notice.

## Breach notification

If a confirmed data breach occurs:

1. **Owner is paged immediately** (Sentry P0 + status page incident).
2. **Within 24 hours:** internal incident report drafted.
3. **Within 72 hours:** notification to Data Protection Board (DPB).
4. **Within 72 hours:** notification to affected data principals (the DSAs, who in turn notify their customers).
5. **Public post-mortem** within 14 days.

We maintain a breach runbook in `docs/runbooks/BREACH-RESPONSE.md`.

## Privacy notice and consent text

We provide a model consent form to DSAs in 4 languages (English, Hindi, Marathi, Hinglish). It declares:
- What data is collected
- Why it's collected (loan processing)
- Who it may be shared with (lenders the customer applies to)
- How long it's retained
- The customer's rights and how to exercise them
- Contact email for grievances

DSAs may use their own consent form; we provide the model as a baseline.

## Data residency

All personal data lives in Mumbai. The DPDP Act doesn't mandate India-only storage (the rules under the Act may, depending on category), but we choose Mumbai-only as a trust commitment to DSAs.

This is documented in our privacy notice as a commitment, not just compliance.

## Data Fiduciary register

We maintain a public register at `digitaldsa.com/privacy/fiduciary` listing:
- Our DPO contact
- Categories of personal data processed
- Categories of recipients (lenders, payment processors, communication providers)
- International transfers (none for PII; some for non-PII operational data via Vercel)
- Retention period per category
- Rights and how to exercise

Updated when scope changes; version-stamped.

## SDF obligations (if/when triggered)

If we cross the threshold for Significant Data Fiduciary:
- Appoint a DPO (Data Protection Officer)
- Conduct Data Protection Impact Assessments for high-risk processing
- Periodic audit by an independent auditor

We plan for this at ~100,000 active customers across the platform. Until then, we operate as a regular Data Fiduciary with DPO-equivalent role on owner.

## Children's data

We don't knowingly process data of minors. Loan applicants are by definition adults (18+). If a co-applicant is identified as a minor, the case workflow blocks until a guardian co-applicant is named instead.

## Related docs

- [01-PII-DISCIPLINE.md](01-PII-DISCIPLINE.md)
- [05-AUDIT-LOG.md](05-AUDIT-LOG.md)
- [../02-architecture/05-INDIA-INFRA.md](../02-architecture/05-INDIA-INFRA.md)
