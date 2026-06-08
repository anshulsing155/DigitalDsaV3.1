---
type: sprint
phase: V5-PHASE-2B
sprint: 16
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 16 — Trust Hardening + Tamper-Evident Audit (Weeks 33-34)

## Goal

Trust architecture, not trust promises. SEC-7 credential rotation. Merkle audit chain. One-click export. Principle 12 CI enforcement final.

This is the final sprint of Phase 2B. After this, V5 is "complete" — further work is iteration on customer feedback.

## Scope

### Tamper-evident audit log

- Every mutating event hashed and chained
- Daily Merkle root computed
- Root anchored to S3 Mumbai with versioned filename
- Optional: anchored to a public log (deferred until needed)
- Verification API + DSA-facing audit view

### SEC-7 — credential rotation (mandatory before public scale)

- All credentials rotated: Atlas, Razorpay, MSG91, Gupshup, ImageKit, JWT, HMAC, CSRF
- Old credentials archived securely
- Rotation runbook documented
- Verified all services keep working

### "We cannot see your data" stance

- CSFLE keys held per-org
- Decryption rate-limited + logged
- Logged decryptions appear in DSA's audit view ("Support viewed your customer X's profile")

### One-click data export

- Settings → Export all data
- Generates encrypted archive
- Available for download
- DPDP compliance + lock-in defence

### Principle 12 CI gate final

- CI script enforced on every PR
- Q4 = "yes" without owner Co-approved-by trailer blocks merge
- A-22 acceptance

### Penetration test + DPDP audit

- External pen test commissioned
- Findings resolved before merge
- DPDP compliance documented end-to-end

## Tasks

| Task | Acceptance |
|---|---|
| Audit event chain implementation | Hash chain unbroken across day |
| Daily Merkle root computation | Cron tested |
| Verification API endpoint | Verifies chain integrity |
| DSA audit view | Shows events + decryption log |
| SEC-7 credential rotation | All rotated; runbook signed off |
| One-click export | Downloadable archive works |
| Principle 12 CI gate enforced | Lock test on PR with missing block |
| A-22 acceptance | Passes |
| External pen test commissioned + cleared | Report on file |
| DPDP audit | Legal sign-off |

## Tests

- Audit chain unbroken across 24h test data
- Erasure + chain consistency
- Decryption logging visibility
- Export archive integrity (encrypted, decryptable with org key)
- Principle 12 CI gate on a deliberately malformed PR

## Decisions needed

- D-11 (reputation + CSFLE stance) — finalised

## Exit criteria

- Trust architecture documented and demonstrable
- All §13.4 commitments live
- Penetration test cleared
- DPDP fully audited
- Phase 2B complete
- V5 is GA-ready for public scale

## Owner involvement

4-6 hours/day. This is the trust story; owner attention to detail matters.
