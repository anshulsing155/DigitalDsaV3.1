---
type: sprint
phase: V5-PHASE-2B
sprint: 13
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 13 — Documents Real 5-state + Customer Vault + Camera Scan (Weeks 27-28)

## Goal

Document checklist with 5 explicit states. Customer-level Vault (docs reusable across cases with consent). In-app camera scan flow.

## Scope

### 5-state checklist

- States: missing / pending / received / rejected / expired
- Status transitions audit-logged
- UI: status badges with colour + icon + word

### Customer Vault

- `VaultDocument` entity per Customer
- Reuse across cases gated by consent (DPDP)
- Attach-from-vault UI on case checklist
- File storage encrypted in S3 Mumbai

### Camera scan

- Capacitor Camera plugin
- Full-screen viewfinder on mobile
- Client-side perspective correction (opencv-wasm)
- Preview → confirm → upload
- Auto-attaches to vault + case checklist

### Expiry surfacing

- Expiry watcher cron
- Expiring docs auto-create follow-up
- Surfaced on Work Queue 14 days before expiry

### WhatsApp doc collection integration

- Already in Sprint 5; this sprint refines: inbound docs now land in vault, not just case
- Auto-attach to case checklist if matches expected doc kinds

## Tasks

| Task | Acceptance |
|---|---|
| 5-state schema with audit | Status transitions audit-logged |
| Vault entity + repository + service | CRUD + reuse + consent |
| Customer profile → Documents tab | Vault list |
| Case checklist → attach-from-vault | Tested |
| Camera flow (mobile) | Per Capacitor spec |
| Client-side perspective correction | Quality check on output |
| Expiry watcher cron | Tested |
| Inbound WA doc auto-attach to vault | Tested |

## Tests

- 5-state coverage + transitions
- Vault reuse audit chain
- Expiry alert lock test
- Camera flow mobile E2E
- Auto-attach correctness

## Exit criteria

- FR-DOC-1..6 satisfied (OCR remains schema-only)
- Customer vault is real (docs survive across cases)
- Camera UX smooth on Android

## Owner involvement

4-6 hours/day.
