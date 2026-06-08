# ADR-0018 — Free-trial abuse defense via identifier hashing (mobile + PAN + GST + device)

**Status**: ✅ Approved (2026-05-28) — implementation shipped same day alongside the trial feature. **Amended 2026-05-28** to add device-id as a fourth identifier.
**Date**: 2026-05-28
**Session**: 2026-05-28 trial-feature build (initial 3 identifiers + device-id extension)

## Context

After D.1 (recurring billing) closed, the owner asked for a **30-day free trial** for every new DSA, Pro-tier, with the constraint *"one trial per DSA — even if they cancel and come back."*

That requires an abuse-defense gate. The naive option is to flag `is_trial_used: true` on the DsaApplications doc, but that's trivially gamed: delete the row (via support, account closure, or test-tooling) → sign up again with the same phone → fresh trial.

We need a gate that's **identity-bound rather than account-bound**, so spinning up a new DSA account with the same human behind it doesn't reset eligibility.

### Constraints

- **Cannot rely on the bank's KYC layer.** That's a Razorpay/issuer concern, fires too late (after authorization), and isn't queryable by us.
- **Cannot hold a second plaintext copy of PII.** Mobile / PAN / GST are sensitive — adding a plaintext sibling for the gate would mean two attack surfaces.
- **Must work for DSAs without GST** (individuals + small partnerships). GST is optional in our onboarding.
- **Must be reversible by admins** for genuine support cases (false positives from family-shared phones, partnership dissolutions, etc.).

## Decision

Build a **defense-in-depth gate on hashed identifiers**: mobile, PAN, GST — block trial if ANY of the three matches a prior trial.

### Architecture

1. **Single collection: `trialIdentifierBlocklist`** (registered in `src/lib/database/mongo.ts`). Schema in `src/lib/types/billingSubscription.ts` → `TrialIdentifierBlocklistDoc`:
   - `identifier_kind: 'mobile' | 'pan' | 'gst'`
   - `identifier_hash: string` — SHA-256(normalized_value || pepper) hex
   - `dsa_id: ObjectId` — who claimed this identifier
   - `granted_at: Date`
   - `source: 'auto' | 'admin_override'`
   - `revoked_at?: Date` — set by the admin-override endpoint

2. **Two compound indexes**:
   - `(identifier_kind, identifier_hash)` — UNIQUE. Eligibility check is O(1) by this key. Uniqueness defends the insert path against race conditions (E11000 on concurrent webhook deliveries).
   - `(dsa_id, granted_at: -1)` — admin tooling lookup ("show me every trial this DSA has ever claimed").

3. **Hash scheme**: SHA-256 over `normalized_value + pepper`. The pepper comes from env var `TRIAL_PEPPER` (≥16 chars required in prod; warned + dev fallback in `import { dev }` mode).
   - **Normalization** is deterministic across input forms — `'+91 98765 43210'` and `'9876543210'` hash identically; `'aaaaa1234a'` and `'AAAAA1234A'` hash identically. See `normalizeIdentifier()` in `src/lib/server/billing/trialEligibility.ts`.
   - **Pepper, not just salt**: pepper is global + server-side + never co-located with the hashes. A leaked dump of the blocklist alone is useless without also exfiltrating the env var.

4. **Eligibility check** (`checkTrialEligibility`): reads the DSA's three identifiers, hashes them, checks the blocklist with `revoked_at: { $exists: false }`. Returns the first match found (deterministic, callers can rely on order for telemetry) or `eligible: true`.

5. **Grant recording** (`recordTrialGrant`): inserts one row per non-null hash. Catches `E11000` cleanly — concurrent inserts and admin-grant-after-revoke flows are both safe to retry.

6. **PAN is required for trial.** Without PAN, the gate is too weak (mobile-only is one-SIM-away from circumvention). DSAs without PAN see `'pan_missing'` and are prompted to complete onboarding first. GST stays optional.

7. **Admin override endpoint** (`POST /api/admin/billing/grant-trial`): admin-only, audit-logged, requires a reason string (min 10 chars). Stamps `revoked_at` on every blocklist row matching the target DSA's identifiers; the next eligibility check then returns clean.

### Why this works

- **Mobile** catches the obvious case (same person, same phone — most attempts).
- **PAN** catches the "use a different phone" case. Government-issued, near-impossible to fake for an adult without committing identity fraud.
- **GST** (when present) catches the "I changed PANs but it's the same business" case (e.g., proprietor PAN swapped for a new firm PAN).
- **Device-id** (added in the 2026-05-28 amendment) catches the "different SIM, borrowed PAN, but same physical device" case. Client-generated UUIDv4 stored in localStorage (web) / WebView storage (Capacitor mobile). Stable as long as site data isn't cleared. WEAKER than the 3 PII identifiers — browser fingerprints reset on cookie clear / incognito / browser switch / factory reset — so this is a "lazy abuser" layer that combines with the others rather than standing on its own.

A determined abuser would need to fake **all four at once** — different phone, different PAN, different GST, fresh device. That's identity fraud territory, which is the bank's KYC problem to detect, not ours.

### Where the gate fires

| Event | What happens |
|---|---|
| DSA clicks "Start free trial" → `POST /api/billing/subscribe-recurring { trial: true, device_id: '...' }` | Server runs `checkTrialEligibility` (passes the device_id through). On match: `409 { code: 'TRIAL_INELIGIBLE', blocking_identifier?: 'device' }`. UI renders one of two friendly notes — generic for PII match, device-specific when `blocking_identifier === 'device'`. |
| Razorpay webhook delivers `mandate.authorized` for a trial sub | Server reads `pending_device_id_hash` from the sub doc, runs `recordTrialGrant` with all hashes (mobile/PAN/GST from `DsaApplications` + device from the pending field). Inserts up to 4 rows. Then `$unset`s `pending_device_id_hash` from the sub. Concurrent webhook deliveries: E11000 caught, treated as success. |
| Trial-end charge succeeds (day 30) | `chargeEngine.handleSuccess` `$unset`s `is_trial` + `trial_until` on the sub doc. Blocklist rows stay — that's the point. |
| Admin support case ("my brother got the trial on his phone, can I get one too?") | `POST /api/admin/billing/grant-trial { dsa_id, reason }`. Stamps `revoked_at` on the matching rows + writes audit row. **Note**: admin override revokes rows by the target DSA's mobile/PAN/GST hashes; the device-id row stays in place because the admin endpoint has no way to know the original client device-id. In practice this is fine — the next subscribe-click from the target DSA on a *different* device clears cleanly; from the *same* device, a second admin pass would be needed. |

### Why hashed rather than encrypted

CSFLE would be more reversible (re-encrypt under a key, lookups via deterministic encryption) but adds:

- A second DEK per identifier kind
- A CSFLE-bound query path for `findOne`
- Operational dependency on the CSFLE-aware Mongo driver build (which we already had a worktree-only Pitfall #48 around)

Hashing wins because:
1. We never need to **read** the identifier back — only **compare** new lookups against existing rows.
2. SHA-256 is built into Node; no library, no driver dependency, no key-rotation ceremony.
3. The pepper-based scheme is privacy-preserving by design — even with full DB read access, an attacker can't reverse hashes to identifiers without also exfiltrating the pepper from production env.

## Consequences

### Positives
- Identity-bound gate that survives account deletion / re-signup.
- Privacy-preserving — no plaintext PII duplicated.
- Operator escape hatch via admin override (audit-logged).
- O(1) eligibility check via indexed lookup.
- No new external dependencies; no library; no driver impact.

### Negatives
- **Family / partnership false positives.** Two real DSAs at the same address sharing a phone, or a partnership that splits into two firms with overlapping PAN/GST history, will trigger the gate. **Mitigation**: admin override exists; expected to be rare (< 1% of signups).
- **Device-id false positives are wider** than the PII ones. A cybercafé where multiple DSAs sign up from the same machine, a family-run brokerage where siblings share a laptop, an employee borrowing the owner's phone — each of these gets blocked on a second trial attempt. The friendly note "This device has been used for a free trial" is honest about the cause, and admin override clears it. Expected to be lower-volume than the PII false positives because in practice each DSA's primary work device differs.
- **PAN required.** DSAs who haven't entered PAN yet can't start a trial. **Mitigation**: surface a clear "complete onboarding to start trial" message; PAN is needed for invoicing later anyway.
- **Pepper rotation is non-trivial.** Changing `TRIAL_PEPPER` invalidates all existing hashes — i.e., everyone becomes eligible for another trial. **Mitigation**: pepper should be treated as an irrevocable secret; only rotate in a coordinated trial-amnesty window if ever needed.

### Retention

**`TrialIdentifierBlocklist` rows are kept indefinitely** — no TTL is set on the collection. The "one trial per DSA" rule is a forever rule by design: a DSA who consumed a trial today should still match the gate ten years from now. Hashes are tiny (64 bytes each), so the storage cost is negligible even at scale — a million trials = ~256 MB across the 4 hashes, well within any reasonable Atlas tier.

This intentionally diverges from `BillingTransactions` and `BillingAuditLogs` (both kept for 6 years per §11 Q1 of the D.1 spec, driven by GST regulatory requirements). The blocklist isn't a financial record; it's a gating mechanism. There's no legal requirement to delete or expire its rows, and there's a strong product reason to keep them forever.

## Alternatives considered

| Option | Why rejected |
|---|---|
| **Flag on DsaApplications (`is_trial_used: true`)** | Trivially gamed by re-signup with same phone. Doesn't survive account deletion. |
| **Bind to Razorpay customer_id** | The mandate authorizes a `customer_id`, but the same human can register multiple Razorpay customer ids with different emails. Not identity-bound. |
| **Bind to bank-account number from mandate response** | We don't store the account number (Razorpay holds it). Even if we did, the bank account can change. |
| **Plaintext identifiers in a sibling collection** | Adds a second PII attack surface. Privacy hit not worth the ~5ms savings vs hashing. |
| **CSFLE-encrypted identifiers** | Reversibility is unnecessary (we don't need to read back). Adds operational complexity (DEK, driver, etc.) for no win. |
| **Skip the gate entirely; accept some abuse** | Owner's explicit ask: one-trial-per-DSA. The abuse cost (~₹4,000 per gamed trial) is high enough that the gate pays for itself if it catches ~1 abuser/month. |

## References

- `src/lib/server/billing/trialEligibility.ts` — the module
- `src/lib/types/billingSubscription.ts` → `TrialIdentifierBlocklistDoc` — the schema
- `src/lib/testing/__tests__/billing/trialEligibility.test.ts` — locks the contract
- `src/routes/api/billing/subscribe-recurring/+server.ts` — where the gate fires on click
- `src/routes/api/billing/webhook/razorpay/+server.ts` (line ~285) — where blocklist hashes are recorded on successful authorization
- `src/routes/api/admin/billing/grant-trial/+server.ts` — admin override endpoint
- `docs/specs/D-1-RECURRING-BILLING-SPEC.md` §4 S8 — original (skipped) S8 spec + the trial addendum
