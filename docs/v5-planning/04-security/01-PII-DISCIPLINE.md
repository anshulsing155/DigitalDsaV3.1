---
type: security
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# PII Discipline — Compile-Time, Lint-Time, Runtime

PII = customer name, mobile, PAN, Aadhaar (last 4 OK), email, address, financial numbers, anything case-specific that identifies a person.

## The five lines of defence

```
1. TypeScript:    Encrypted<T> can't be assigned where T is expected
2. Logger:        accepts only Loggable; rejects Encrypted<T>
3. ESLint:        custom rules for URL / log / fetch construction
4. Pre-commit:    pattern scan for hardcoded PII
5. Sentry scrub:  beforeSend replaces residual PII with [REDACTED]
6. Nightly audit: scans logs and Sentry events
```

(Six, technically. Worth it.)

## How encryption happens

1. **Field marked `Encrypted<T>` in schema.** Zod schema declares it.
2. **Service receives plaintext** in `CreateInput`.
3. **Repository encrypts via CSFLE** during `create()` / `update()`.
4. **Stored ciphertext + blind index** in MongoDB.
5. **Read decryption is in-memory** in the app server.
6. **Decrypted value never crosses a logger / URL / cache boundary.**

## CSFLE configuration

```typescript
// packages/db/src/csfle.ts
import { MongoClient, AutoEncryptionOptions } from 'mongodb';

const csfleOptions: AutoEncryptionOptions = {
  keyVaultNamespace: 'encryption.__keyVault',
  kmsProviders: {
    aws: {
      accessKeyId: process.env.AWS_KMS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_KMS_SECRET_ACCESS_KEY,
    },
  },
  schemaMap: csfleSchemaMap,  // per-collection field encryption rules
};
```

Per-org KEKs are derived from a master KEK in AWS KMS Mumbai. Per-field DEKs are stored in `encryption.__keyVault`. Rotation is per-DEK; an emergency rotation re-encrypts the affected fields without touching others.

## Blind indexes

For equality search on encrypted fields:

```typescript
function blindIndex(field: string, value: string): string {
  const key = getKmsKeyForField(field);  // per-field HMAC key
  return hmacSha256(key, normalise(value));
}
```

**What blind indexes leak:** only "are these two values the same?" — never the value itself.
**What they enable:** searching customers by mobile, PAN, or email without decrypting any document.
**What they don't enable:** range queries, substring matches, fuzzy search. For name search we use a separate normalised-name field (lowercased, accent-stripped) which we accept as lower-sensitivity (an ADR documents the tradeoff).

## Aadhaar — special treatment

Aadhaar is the most sensitive ID in India. Rules:

1. **Full Aadhaar is never persisted.** We capture during KYC, validate (Verhoeff check), store only `aadhaar_last4` and a verification status.
2. **Display always masked.** UI component `<MaskedAadhaar value={last4} />` renders `XXXX XXXX 1234`.
3. **PDF render lock test.** Every PDF generated from V5 is asserted to never contain a full Aadhaar pattern.
4. **Form input is ephemeral.** Form state holds plaintext for one request lifecycle, never logged, never stored.

See `03-AADHAAR-MASKING.md` for the implementation.

## What goes in logs (examples)

| Good log | Bad log |
|---|---|
| `logger.info({ org_id, customer_id, case_id }, 'case created')` | `logger.info({ name: customer.full_name }, 'case created')` |
| `logger.warn({ user_id, error_code: 'duplicate_mobile' }, 'create failed')` | `logger.warn({ mobile: input.mobile }, 'create failed')` |
| `logger.error({ tx_id, lender }, 'engine eval failed')` | `logger.error({ borrower_pan }, 'engine eval failed')` |

The discipline: **log identifiers (which always point back to data we own), never values.**

## What goes in URLs

| Good URL | Bad URL |
|---|---|
| `/customers/65f4abcd` | `/customers/?mobile=9811556664` |
| `/cases/65f5...` | `/cases/?pan=ABCDE1234F` |
| `/search?q=<opaque-token>` | `/search?q=Rahul%20Sharma` |

The search input is sent as a POST body, not a query string. The browser address bar never sees PII. Browser history never holds PII.

## What goes in caches

| Cacheable | Not cacheable |
|---|---|
| Case ID, status, stage | Customer name, mobile |
| Lender list (public) | Customer profile |
| Capability flags per org | Conversation contents |
| UI preferences | Document file content |

Sensitive responses have `Cache-Control: no-store, no-cache, must-revalidate`. The CDN never sees them.

## What goes in error reports (Sentry)

Sentry's `beforeSend`:

```typescript
beforeSend(event) {
  // Strip stack traces of variable values
  if (event.exception) {
    event.exception.values?.forEach((ex) => {
      ex.stacktrace?.frames?.forEach((frame) => {
        delete frame.vars;
      });
    });
  }

  // Pattern scrub on all string fields
  walkEventStrings(event, (str) => {
    return str
      .replace(/\b\d{10}\b/g, '[MOBILE]')              // 10-digit mobile
      .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]')     // PAN pattern
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]') // Aadhaar pattern
      .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]'); // Email pattern
  });

  return event;
}
```

Defence in depth: even if PII slips through earlier gates, Sentry sees only scrubbed payloads.

## Nightly PII audit

A scheduled job (BullMQ daily 03:00 IST):

1. Pulls last 24h of Sentry events
2. Pulls last 24h of Vercel logs (via API)
3. Pulls last 24h of `audit_events` collection
4. Pattern-scans for mobile / PAN / Aadhaar / email patterns
5. If any found: opens a P1 alert to owner

Tested by deliberately submitting an event with PII pattern in a sandbox app and verifying the alert fires.

## What an engineer does when they need to use PII

If a service genuinely needs to read the plaintext of an encrypted field:

```typescript
// In a service method
const customer = await this.repo.findById(this.org_id, customerId);
if (!customer) return err('not_found');

// Explicit decryption call — auditable
const plainMobile = await this.decryptor.decrypt(customer.mobile);

// Use plainMobile in this scope only
await this.gupshupAdapter.sendMessage({ to: plainMobile, body });

// Don't:
//   - assign plainMobile to a top-level variable
//   - pass plainMobile through a job queue payload
//   - log plainMobile
```

`Decryptor` is a service that wraps CSFLE decryption with rate-limiting and audit logging.

## Related docs

- [../02-architecture/05-INDIA-INFRA.md](../02-architecture/05-INDIA-INFRA.md)
- [02-DPDP-COMPLIANCE.md](02-DPDP-COMPLIANCE.md)
- [03-AADHAAR-MASKING.md](03-AADHAAR-MASKING.md)
- [05-AUDIT-LOG.md](05-AUDIT-LOG.md)
- [../03-conventions/02-TYPESCRIPT-PATTERNS.md](../03-conventions/02-TYPESCRIPT-PATTERNS.md)
