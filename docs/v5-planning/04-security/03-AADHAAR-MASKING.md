---
type: security
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Aadhaar Masking

## What UIDAI says

UIDAI guidelines:
- The full 12-digit Aadhaar number must not be displayed without specific authorisation
- The standard mask shows the first 8 digits as `X` and reveals only the last 4: `XXXX XXXX 1234`
- Stored Aadhaar in databases should be encrypted or tokenised
- Aadhaar may only be requested for purposes where its collection is legally permitted

## What V5 does

### Capture
- Form accepts Aadhaar input client-side
- Validation: Verhoeff checksum
- The full Aadhaar is sent to server in a single request body, never stored client-side

### Persistence
- We persist **only `aadhaar_last4`** as a 4-character string
- Verification status (`aadhaar_verified: boolean`)
- Verification timestamp
- A hash of the full Aadhaar (HMAC, for dedup) — irreversible
- **The full 12-digit Aadhaar is never written to disk**

### Display
- `<MaskedAadhaar value={last4} />` is the only component that renders Aadhaar
- All other surfaces (PDFs, exports, audit logs) use this component or a string formatter that takes the last 4

```svelte
<!-- packages/ui/src/MaskedAadhaar.svelte -->
<script lang="ts">
  let { value } = $props<{ value: string }>(); // last 4 digits only
</script>
<span class="font-mono">XXXX XXXX {value}</span>
```

If anyone tries to pass a 12-digit value to this component, it errors loudly at runtime (the prop is typed as a 4-character string).

### In PDFs
- The file builder PDF render uses `<MaskedAadhaar>` for any Aadhaar reference
- Lock test: any generated PDF is scanned for 12-digit number patterns; fails if found

### In API responses
- The `Customer` JSON returned by `/api/internal/customers/:id` includes `aadhaar_last4` and `aadhaar_verified`, never the full number
- Builder portal API responses never include Aadhaar in any form

### In logs
- `Encrypted<Aadhaar>` type prevents logging
- Sentry scrub strips any 12-digit sequence that matches Aadhaar pattern

## The verification flow (KYC)

When a DSA captures Aadhaar for a customer:

```
1. User types Aadhaar in form
   ↓
2. Client validates Verhoeff checksum
   ↓
3. Client sends full Aadhaar to backend (single request)
   ↓
4. Backend computes:
   - HMAC hash (for dedup within org)
   - Last-4 (for storage)
   ↓
5. Backend stores:
   { aadhaar_last4, aadhaar_hmac, aadhaar_verified: false }
   ↓
6. Backend triggers UIDAI offline verification (if integrated)
   or marks aadhaar_verified: true on operator manual review
   ↓
7. Full Aadhaar value is dropped — never persisted
```

## Why we don't keep the full number

If we kept it (even encrypted), a compromise of the encryption key would leak Aadhaars. The penalty under DPDP and the reputation cost would be severe.

Trade-off: we can't re-verify a customer's Aadhaar offline later. But for the loan-sourcing workflow, last-4 + verification status is sufficient — the lender does their own verification on submission.

## Common mistakes to avoid

| Mistake | Why bad |
|---|---|
| Storing Aadhaar in form-state for session reuse | Could be paged to disk by Svelte SSR |
| Aadhaar in URL during KYC submit | Could end up in Vercel logs, browser history |
| Aadhaar in audit log entries | Audit logs are append-only — can't be deleted later |
| Aadhaar in WhatsApp messages | Goes through Meta servers, can't be unsent |
| Aadhaar shown to RM via UI | RMs do their own KYC; don't share through us |

## Test: lock down the rule

`packages/ui/src/__tests__/MaskedAadhaar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import MaskedAadhaar from '../MaskedAadhaar.svelte';

describe('MaskedAadhaar', () => {
  it('renders mask + last 4', () => {
    const { getByText } = render(MaskedAadhaar, { props: { value: '1234' } });
    expect(getByText('XXXX XXXX 1234')).toBeInTheDocument();
  });

  it('throws on 12-digit input', () => {
    expect(() => render(MaskedAadhaar, { props: { value: '123456789012' } }))
      .toThrow();
  });
});
```

And in CI: scan every generated PDF for any 12-digit sequence:

```typescript
// __tests__/pdf-aadhaar-scan.test.ts
describe('PDF Aadhaar scan', () => {
  it('no full Aadhaar in any generated PDF across 90-case fixture', async () => {
    for (const fixture of fixtures90) {
      const pdf = await renderPdf(fixture);
      const text = await extractText(pdf);
      expect(text).not.toMatch(/\b\d{12}\b/);
    }
  });
});
```

## Related docs

- [01-PII-DISCIPLINE.md](01-PII-DISCIPLINE.md)
- [02-DPDP-COMPLIANCE.md](02-DPDP-COMPLIANCE.md)
