---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# India Infrastructure — Data in Mumbai, App Anywhere

## The rule, in plain English

> Customer data lives in Mumbai. Always. App servers can run anywhere as long as they don't store, log, or cache anything that identifies a customer.

Think of the app server as a kitchen and the database as the fridge. The fridge stays in Mumbai. The kitchen can be anywhere — but no ingredients ever stay in the kitchen overnight. Cook the meal, serve it, clean the counter. Nothing personal stays behind.

## What's in Mumbai (locked)

| Service | Vendor | Region | What's in it |
|---|---|---|---|
| Primary database | MongoDB Atlas | ap-south-1 (Mumbai) | Customers, cases, conversations, all PII (CSFLE-encrypted) |
| Cache + queue | Redis (self-hosted) | Mumbai VPS | Sessions, rate-limits, BullMQ job state — no PII |
| Analytics DB | ClickHouse (self-hosted) | Mumbai VPS | Aggregated facts and dimensions — no raw PII columns |
| Object storage | AWS S3 | ap-south-1 (Mumbai) | Document files, backups, audit log archives |
| Key management | AWS KMS | ap-south-1 (Mumbai) | CSFLE keys (per-org KEKs) |
| Email | AWS SES | ap-south-1 (Mumbai) | Transactional email |
| Error tracking | Sentry (self-hosted) | Mumbai VPS | App errors with PII scrubbed |
| Status / monitoring | Uptime Kuma (self-hosted) | Mumbai VPS | Public status page |
| Internal BI | Metabase (self-hosted) | Mumbai VPS | Reads from ClickHouse |

## What can run anywhere (with discipline)

| Service | Vendor | Region | Discipline |
|---|---|---|---|
| App servers (SvelteKit SSR) | Vercel | Mumbai edge primary; global fallback | Logger refuses PII; PII never written to disk |
| WhatsApp BSP | Gupshup | India | Messages flow through Meta by nature; our copy stored Mumbai |
| SMS | MSG91 | India | OTP only, no PII payloads |
| Payments | Razorpay | India | PCI scope; we never store card data |
| File CDN | ImageKit | India HQ, global edge | Origin in Mumbai; edge serves encrypted blobs |
| Push notifications | FCM | Google US | Payload contains only "1 new task" — no PII |

## The Vercel honest situation

Vercel is a US company. Their control plane (deployments, logs aggregation) runs in the US. Their edge serves from wherever the user connects.

We accept this because:
1. We can pin compute to **Mumbai edge** in Vercel config
2. Our logger refuses PII, so what Vercel sees in their logs is structured events with IDs, not customer data
3. PII never lives in app-server disk or memory beyond a single request lifecycle
4. Vercel's TOS includes data-processing terms that satisfy DPDP for the non-PII operational data they handle

If a regulator ever tightens to "no operational metadata on US servers either," we have an escape hatch: migrate hosting to AWS Mumbai (Vercel runs on AWS underneath). The app code is portable; the migration is operationally significant but architecturally trivial.

For now: Vercel with strict PII discipline is the right balance of velocity, ops simplicity, and sovereignty.

## How PII discipline is enforced

### 1. The `Encrypted<T>` type

Every PII field in TypeScript is wrapped in a special type:

```typescript
type Encrypted<T> = {
  __brand: 'encrypted';
  ciphertext: Buffer;
  blind_index?: string;
};

interface Customer {
  org_id: ObjectId;
  full_name: Encrypted<string>;
  mobile: Encrypted<string>;
  pan?: Encrypted<string>;
  email?: Encrypted<string>;
  date_of_birth?: Date; // not PII alone
  // ...
}
```

TypeScript refuses to assign `Encrypted<string>` where `string` is expected. You can't accidentally pass a customer's mobile to a logger or a URL.

### 2. The logger refuses PII

```typescript
// packages/types/src/logger.ts
type Loggable = string | number | boolean | ObjectId | Date | { [k: string]: Loggable };

interface Logger {
  info(meta: Loggable, message: string): void;
  warn(meta: Loggable, message: string): void;
  error(meta: Loggable, message: string): void;
}
```

`Encrypted<T>` doesn't satisfy `Loggable`. The compile error is clear: "this field is encrypted, you can't log it."

### 3. Lint rules

A custom ESLint rule scans for patterns like `customer.name`, `customer.mobile`, etc. in URL construction, log calls, or `JSON.stringify` calls. CI fails the PR if it finds one.

### 4. Pre-commit hook

Husky runs a pattern-based scan for hardcoded mobile numbers, PAN strings (5 letters + 4 digits + 1 letter), Aadhaar (12-digit sequences). Blocks the commit.

### 5. Sentry `beforeSend` scrub

Even with the above, defensive scrub. Sentry's `beforeSend` walks the event payload and replaces any mobile/PAN/Aadhaar/email pattern with `[REDACTED]`.

### 6. Nightly PII audit

A scheduled job scans Sentry events, Vercel logs (via Vercel API), and Mongo audit collection for the past 24 hours. Any PII pattern found triggers an alert to owner.

## CSFLE — encryption at the field level

MongoDB CSFLE (Client-Side Field-Level Encryption) means encryption happens in the MongoDB driver on the app server, **before** data is sent to Atlas.

- Atlas operators see ciphertext only
- The encryption key is held in AWS KMS Mumbai
- Per-org KEKs (Key Encryption Keys) so a leaked org's key doesn't expose others
- Per-field DEKs (Data Encryption Keys) for fine-grained rotation

Decryption happens in-memory in the app server when the data is read. The decrypted value lives for the request's lifetime — never written to disk, never logged, never cached.

## Blind indexes for search

Encrypted fields can't be queried directly. To find "customer with mobile 9811556664":

1. Normalise the mobile (strip +91, spaces, dashes → 10 digits)
2. Compute HMAC with a KMS-managed index key: `blind_index = HMAC-SHA256(index_key, '9811556664')`
3. Query `db.customers.findOne({ org_id, 'mobile.blind_index': blind_index })`

The blind index leaks **only the equality relationship** ("are these two mobiles the same?"). It doesn't reveal the value. Different orgs use different index keys, so a blind index from Org A can't be tested against Org B's data.

## DPDP compliance

- **Consent capture** at signup (encrypted, evidence-linked)
- **Consent ledger** records every grant + revocation
- **Cross-case KYC reuse** requires explicit per-purpose consent
- **One-click full export** for data subject access requests
- **Erasure** propagates from MongoDB to ClickHouse via tombstone events; backups are encrypted and key-rotatable for time-limited retention

See `04-security/02-DPDP-COMPLIANCE.md` for the detailed mechanism.

## What happens if Mumbai goes down

- **MongoDB Atlas Mumbai** uses replica set with nodes in 3 ap-south-1 AZs. AZ outage: automatic failover.
- **Full region outage:** rare event (last ap-south-1 region outage was hours). Atlas can be configured with a Singapore (ap-southeast-1) read-replica for emergency read access — but this requires owner approval (Singapore is foreign region). For Phase 2A, we accept the regional dependency.
- **Self-hosted services (Redis, ClickHouse, Sentry)** run on AWS Mumbai EC2 with snapshots. Single-AZ today; multi-AZ when scale justifies.
- **Vercel** as the app tier: if Mumbai edge is down, Vercel routes to next-nearest edge automatically. App stays up; database unavailability becomes an "we're investigating" page.

## Status page

`status.digitaldsa.com` — Uptime Kuma instance on a Mumbai VPS. Public. Monitored services:
- Web app (HTTPS check)
- API health endpoint
- MongoDB connectivity (synthetic query)
- WhatsApp BSP (test message dispatch)
- Email (test send)
- Payment gateway (Razorpay API ping)

## Vendor data agreements

For each vendor that touches our data path, we maintain a signed data-processing agreement (DPA) covering:
- Region commitments (Mumbai-only for data-at-rest)
- DPDP compliance certification
- Sub-processor transparency
- Breach notification SLA

Filed in `docs/legal/vendor-dpas/`. Reviewed annually.

## Related docs

- [01-SYSTEM-OVERVIEW.md](01-SYSTEM-OVERVIEW.md)
- [07-TECH-STACK.md](07-TECH-STACK.md)
- [../04-security/01-PII-DISCIPLINE.md](../04-security/01-PII-DISCIPLINE.md) — Full PII regime
- [../04-security/02-DPDP-COMPLIANCE.md](../04-security/02-DPDP-COMPLIANCE.md) — DPDP mechanism
