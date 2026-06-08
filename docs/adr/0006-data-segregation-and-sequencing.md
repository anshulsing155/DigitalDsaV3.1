# ADR-0006 — Data initiatives sequencing: DATA-3 → SEC-2 → DATA-2 → DATA-1

**Status**: Accepted
**Date**: 2026-05-16
**Session**: post-S104 follow-up
**Roadmap items affected**: DATA-1, DATA-2, DATA-3, SEC-2

---

## Context

S103 close added three data-themed roadmap items (DATA-1, DATA-2, DATA-3) without sequencing them against the already-queued SEC-2 (MongoDB field-level encryption, designed in ADR-0005). Each operates on PII to a different degree, and the order they ship in materially changes the data-exposure profile during the rollout. The slot for this ADR was reserved at S103 close as ADR-0006.

### What each item does

| Item | One-line | PII tier | Touches |
|---|---|---|---|
| **DATA-3** | Delete original uploaded files (bank stmts, ITRs) from ImageKit after Gemini extraction is verified-successful | Reduces existing PII surface (deletes files; keeps extracted fields) | `cases.lender_applications[*].document_checklist[*].upload` + new `ArtifactDeletionLog` collection |
| **SEC-2** | Atlas Queryable Encryption (QE) + AWS KMS (Mumbai region) for all PII fields across `DsaApplications`, `rmApplications`, `Applicant` snapshots, etc. | Encrypts existing + future PII in place | 7 collections, ~14 fields per ADR-0005 |
| **DATA-2** | Consented outreach vault — mobile + loan profile of customers who opt in to BT / DC offers from partner DSAs | Creates a NEW collection of high-tier PII (mobile + loan history + consent timestamps) | New `OutreachVault` collection + consent UX + DPDP §6 audit trail |
| **DATA-1** | Anonymized market intelligence dataset (loan amount, property type, geography, lender outcomes — all aggregated/anonymized) | Creates a NEW collection with **no PII** (anonymization is the point) | New `MarketIntelligence` collection populated via ETL from `cases` |

### What's at stake in the sequencing

Three considerations frame the decision:

1. **PII surface during the rollout.** While SEC-2 is in flight, PII fields are still in plaintext. Any work that *creates new* plaintext PII rows during that window expands the exposed surface; any work that *removes* PII (DATA-3) shrinks it.
2. **Migration cost.** Shipping DATA-2 before SEC-2 means building the `OutreachVault` collection in plaintext, then later running an encrypt-in-place migration (rewrites + downtime + index rebuild). Shipping DATA-2 after SEC-2 means launching the collection already wired for the encryption client — much cleaner.
3. **Time-to-value for the business.** DATA-1 (market intelligence) is the highest-leverage "we have something competitors don't" feature, but the lowest PII risk. DATA-2 (consented outreach) is the second-highest leverage and highest PII risk. SEC-2 has no direct user-visible value; it's pure risk reduction. DATA-3 is small and silent.

### Existing dependencies

- **DATA-3 depends on the Gemini extraction pipeline existing** ([`src/lib/server/aiService.ts`](../../src/lib/server/aiService.ts) currently does policy-document parsing only). The deletion machinery can ship before extraction goes live and stay dormant — see [`docs/specs/DATA-3-FILE-DELETION-SPEC.md`](../specs/DATA-3-FILE-DELETION-SPEC.md) §1. But the value of DATA-3 only realizes once extraction is firing.
- **SEC-2 depends on AWS KMS provisioning** ([ADR-0005](0005-mongodb-field-level-encryption.md)) — Mumbai region, multi-region key replication, IAM roles. ~1 week of ops setup before code lands.
- **DATA-2 depends on consent UX** (DPDP §6 + §7 require explicit, granular, revocable consent with audit trail). The collection schema can't be designed without first defining the consent state machine.
- **DATA-1 depends on nothing in this list.** ETL can run against the existing `cases` collection any time.

---

## Decision

Ship in this order:

```
1. DATA-3  (file deletion infrastructure — dormant until extraction lands)
2. SEC-2   (field-level encryption — Atlas QE + AWS KMS Mumbai)
3. DATA-2  (consented outreach vault — built on encrypted fabric)
4. DATA-1  (anonymized market intelligence — independent)
```

### Why DATA-3 first

- **Smallest** (1–2 days across 3 sub-sessions; design spec already written this session).
- **Reduces** PII surface — every file deleted is one fewer copy of PAN/Aadhaar/account-numbers sitting at a CDN URL. Shipping this *before* SEC-2 means SEC-2 has fewer artifacts to think about when it ships.
- **Independent of SEC-2 sequencing.** DATA-3 operates on file blobs (ImageKit) and adds a new audit-log collection. The audit log has no PII (it stores file IDs + metadata + timestamps). SEC-2's encryption work is orthogonal — when SEC-2 lands, it'll encrypt the existing case collection fields; the audit log doesn't need encryption.
- **Dark-launch friendly.** The deletion machinery ships behind `DATA3_DELETION_ENABLED=false` (per spec §3 invariant 6). The state machine populates and audit collection comes online without doing any actual deletions. We get the production wiring in place before the extraction pipeline that would trigger it.

### Why SEC-2 second (not first)

In a vacuum, SEC-2 first is appealing: encrypt everything, then layer new features on top. Two reasons we still put DATA-3 first:

- **DATA-3 is faster.** The design is settled (spec written), it's bounded at ~1–2 days, and it ships infrastructure that DATA-2 will lean on (the same audit-log pattern, the same retention-floor primitives). Doing the smaller fast thing first reduces decision overhead on the larger thing.
- **SEC-2 has external dependencies.** AWS KMS provisioning (Mumbai region key + IAM roles) is partner-blocked — ops + AWS account work. We can't sequence based on this work alone; we need to start the AWS conversation in parallel with DATA-3 development, then converge.

But SEC-2 absolutely comes before DATA-2, which is the load-bearing claim of this ADR:

### Why DATA-2 third (not second)

DATA-2 creates the most PII-dense net-new collection on the platform — every customer who opts in to BT/DC outreach contributes (mobile, loan profile, consent timestamp, revocation history). Shipping that before SEC-2 means:

- Two-step migration later: build plaintext → run encrypt-in-place → drop plaintext indexes → rebuild encrypted indexes. Each step has a downtime window and a rollback plan.
- A window of weeks-to-months where the highest-value PII collection on the platform is sitting in plaintext while we wait for SEC-2.

Conversely, **shipping DATA-2 after SEC-2 means the collection launches already encryption-aware.** Atlas Queryable Encryption defines per-field encryption at *collection creation* time — a fresh collection takes ~zero migration overhead to set up encrypted. Equality / range queries that DATA-2 needs (lookup by mobile, filter by loan type) are supported under QE without an unencrypted path.

### Why DATA-1 last

DATA-1 has the lowest urgency for two reasons:

1. **No PII** in the output. The anonymization step is the entire feature — strip applicant identity, aggregate by geography + loan type + property type + price bucket. The resulting collection has no exposure even in worst-case breach scenarios.
2. **Value compounds with case volume.** Market intelligence is most useful when there are thousands of cases to aggregate from. Shipping it now would generate thin charts; shipping it after a few months of cases gives meaningful data. There's no urgency to start the timer.

DATA-1 is parallelizable — it has no dependencies on any of the other three — so if a contributor has bandwidth during a SEC-2 or DATA-2 lull, it can fill a gap. But it's not on the critical path.

---

## Consequences

### Positive

- **No DATA-2 plaintext window.** The riskiest new PII collection launches encrypted from day one.
- **PII surface monotonically shrinks** during the rollout. DATA-3 removes files; SEC-2 encrypts what remains; DATA-2 lands encrypted; DATA-1 adds no PII.
- **Compliance story is clean** for DPDP / RBI inspections. The audit trail of decisions (this ADR + ADR-0005) plus the implementation artifacts (deletion logs, encryption metadata, consent ledger) tell a coherent story of "we treated PII with appropriate care at every step."
- **Decision overhead reduced.** Each sub-session has one item to focus on, with clear "this depends on / this precedes" boundaries set here.

### Negative

- **DATA-1 (market intelligence) is months out.** It's the most marketable feature of the four — "we have benchmark pricing data competitors don't" — and it's last. Mitigation: it's parallelizable; a hackathon-style sprint can squeeze it in alongside SEC-2 or DATA-2 if a quiet period appears.
- **SEC-2 ops setup runs in the background.** Starting the AWS KMS conversation now (during DATA-3 implementation) is the only way the sequence holds. If ops slips, DATA-2 slips with it. Mitigation: kick off the AWS conversation in parallel with DATA-3 sub-session (b), not after.
- **No quick PII-reduction win visible to users.** DATA-3 runs silently, SEC-2 is invisible by design. DATA-2 is the first user-visible "data" feature, and it's third. Mitigation: this is correct — building infrastructure before features is the right sequencing even when it's less satisfying.

### Risks

- **DATA-2 design surfaces a SEC-2 gap.** If the consent vault needs a field encryption primitive that ADR-0005's QE plan doesn't cover (e.g. case-insensitive search on consented mobile across regions), SEC-2 may need to extend before DATA-2 can finalize. Mitigation: prototype DATA-2's read patterns during SEC-2 implementation, not after.
- **DATA-3 deletion semantics interact with DATA-2.** If a customer who consented to outreach later asks for deletion under DPDP §13 (right to erasure), the deletion has to cascade through DATA-3's audit log + DATA-2's consent ledger + the cases collection. Need a clear cross-document deletion pattern; defer to a future ADR if necessary.

---

## Alternatives Considered

### A. SEC-2 first, DATA-3 / DATA-2 / DATA-1 after

The "infrastructure-first orthodoxy" answer. Rejected because:

- **AWS KMS provisioning is partner-blocked.** Sitting idle while ops sets up Mumbai keys + IAM is wasted developer cycles. DATA-3 is shovel-ready and fills that window productively.
- **DATA-3 reduces what SEC-2 has to encrypt.** Files deleted by DATA-3 don't need SEC-2's encryption layer. Sequencing DATA-3 first means SEC-2 has a smaller surface.

### B. DATA-1 first

The "show business value fast" answer. Rejected because:

- DATA-1's value compounds with case volume; shipping it now produces thin output.
- It does nothing for PII risk. Putting it ahead of SEC-2 + DATA-3 means weeks of work that doesn't reduce the exposure we know exists.

### C. DATA-2 and DATA-3 in parallel

Tempting because they're both "data minimization adjacent" and could land in the same few weeks. Rejected because:

- DATA-2 needs SEC-2 (as argued above). Parallelizing it with DATA-3 means starting it before SEC-2 — exactly the plaintext-window risk this ADR is designed to prevent.
- Sequential is more legible. The next session knows exactly what's next.

### D. Defer the sequencing decision; let each session pick

What happened pre-ADR — every session-close gestured at "DATA-3 next" without locking it. Rejected because the user explicitly reserved the ADR slot at S103 close, indicating this needs a written decision.

---

## References

- [`docs/specs/DATA-3-FILE-DELETION-SPEC.md`](../specs/DATA-3-FILE-DELETION-SPEC.md) — full DATA-3 design (state machine, verification gate, retention, audit, failure recovery, implementation skeleton)
- [ADR-0005](0005-mongodb-field-level-encryption.md) — SEC-2 design (Atlas QE + AWS KMS Mumbai; 4-phase implementation plan)
- [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — roadmap items DATA-1, DATA-2, DATA-3, SEC-2 with status, effort, priority
- DPDP Act 2023 §6 (consent), §7 (purpose limitation), §13 (right to erasure) — driver for DATA-2's consent ledger requirement
- RBI Master Direction on Information Security 2023 — implicit anchor for SEC-2's encryption-at-rest mandate
