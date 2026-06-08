---
type: sprint
phase: V5-PHASE-2B
sprint: 9
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 9 — External Partner CRM (Weeks 19-20)

## Goal

External Partner CRM (builders, CAs, dealers, architects, existing customers) distinct from V3's DSA-to-DSA F.1 referral. Partner commission payable ledger. Source attribution chain end-to-end.

## Scope

### Partner entity

- Schema ([../../05-domains/08-PARTNER.md](../../05-domains/08-PARTNER.md))
- Type: builder / property_dealer / ca / architect / existing_customer / employee / other
- KYC (lighter B2B flavour)
- Per-partner commission terms (per loan type if needed)
- Status: active / inactive / archived

### Partner payable ledger

- `PartnerCommissionPayable` records (money-out)
- Auto-created when org's commission record is created with partner attribution
- States: accrued → approved_for_payment → paid
- Payment recording: bank transfer / UPI / cheque / cash / in-kind

### Source attribution chain

- Lead form: partner autocomplete (or quick + new)
- Lead → Case carries `source_partner_id`
- Case → Commission carries partner_split computation
- Reports slice by partner

### UI surfaces

- `/people/partners` list (mobile + desktop)
- Partner profile: contact, KYC, terms, leads sent, conversion funnel, payables ledger
- Lead form integration
- Money pillar: partner payables tab

### Principle 12 — bypass guards

- Partners never see customer mobile/PAN
- Partners see only their leads' status (Applied/Sanctioned/Disbursed/Rejected) and aggregate revenue
- No partner-to-customer direct contact path through us

## Tasks

| Task | Acceptance |
|---|---|
| Partner schema + repository + service | Per spec |
| Partner commission payable schema | Per spec |
| UI: partner list + detail | Mobile + desktop |
| Lead form partner autocomplete | Inline + new |
| Auto-create payable on commission | Tested |
| Reports: partner-attributed revenue | Slicing works |
| Partner-side data exposure guards | Q4 lock test passes |
| ClickHouse: dim_partners + fact_partner_attribution | Populated via CDC |

## Tests

- Partner CRUD
- Lead with partner attribution carries through to case + commission
- A-19 lock test variant: partner can't access customer PII
- Payable state transitions
- Commission with partner_split computes correctly

## Decisions needed

- D-10 ratified (subscription + flat fee + data-pool wall)

## Exit criteria

- FR-PART-1..4 satisfied
- Partner CRM distinct from F.1
- Partner attribution end-to-end working
- A-19 governance evidence in place

## Owner involvement

4-6 hours/day.
