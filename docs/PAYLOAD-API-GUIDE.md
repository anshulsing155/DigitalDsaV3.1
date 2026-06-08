# Payload API Integration Guide

> How to use `buildLoanPayload()` and `enrichPayload()` in API routes and components.

---

## Overview

The payload system has two stages:

1. **Building** (`buildLoanPayload`) — Transforms raw form data into clean `LoanApplicationPayload`. Runs client-side or server-side.
2. **Enriching** (`enrichPayload`) — Computes derived `_computed` fields for rule evaluation. Server-side only.

```
Raw Form Data ──> buildLoanPayload() ──> Clean Payload ──> enrichPayload() ──> Enriched Payload ──> Rule Engine
```

---

## Imports

### From Components (Client-Side)

```typescript
import {
  buildLoanPayload,
  comparePayloads
} from '$lib/utils/payloadBuilder';
```

### From API Routes (Server-Side)

```typescript
import { buildLoanPayload } from '$lib/utils/payloadBuilder';
import { enrichPayload } from '$lib/ruleEngine/payloadEnricher';
```

### Type Imports

```typescript
import type {
  LoanApplicationPayload,
  LoanTransactionPayload,
  ApplicantPayload,
  CleanIncomeEntry,
  ObligationEntry,
  RelationshipEntry,
  FinancialsData,
  DirectorInfo,
  GPADetails
} from '$lib/utils/payloadBuilder';
```

---

## Building a Payload

### In a Svelte 5 Component

```typescript
import { buildLoanPayload } from '$lib/utils/payloadBuilder';

// Using Svelte 5 runes
let loanFormAnswers = $state<Record<string, unknown>>({});
let applicants = $state<Array<Record<string, unknown>>>([]);
let applicationMeta = $state<Record<string, unknown>>({});

// Build payload reactively
let payload = $derived.by(() => {
  return buildLoanPayload(loanFormAnswers, applicants, applicationMeta);
});

// Or build on-demand in an event handler
function handleSubmit() {
  const payload = buildLoanPayload(
    loanFormAnswers,
    applicants,
    applicationMeta
  );
  // Send to API...
}
```

### In an API Route

```typescript
// src/routes/api/assessment/+server.ts
import { json } from '@sveltejs/kit';
import { buildLoanPayload } from '$lib/utils/payloadBuilder';
import { enrichPayload } from '$lib/ruleEngine/payloadEnricher';
import { evaluateRules } from '$lib/ruleEngine/evaluationEngine';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireAuth } from '$lib/server/guards';
import { logger } from '$lib/server/logger';

export async function POST({ request, locals }) {
  try {
    // Step 1: Auth check
    const authResult = requireAuth(locals);
    if (!authResult.ok) return authResult.response;

    // Step 2: Parse request body
    const body = await parseJsonBody(request);
    if (!body) return apiError('Invalid request body', 400);

    const { loanData, applicants, applicationData } = body;

    // Step 3: Build clean payload from raw form data
    const payload = buildLoanPayload(loanData, applicants, applicationData);

    // Step 4: Enrich with computed fields (server-side only)
    const enrichedPayload = enrichPayload(payload);

    // Step 5: Run rule engine
    const results = evaluateRules(enrichedPayload);

    return apiOk({ assessment: results });
  } catch (error) {
    logger.error({ error }, 'Assessment API failed');
    return apiServerError('Assessment failed');
  }
}
```

---

## Function Signatures

### `buildLoanPayload()`

```typescript
function buildLoanPayload(
  loanData: Record<string, unknown>,     // Raw form answers (bindsTo keys)
  applicants: Record<string, unknown>[],  // Array of applicant data
  applicationData: Record<string, unknown>,    // Application-level metadata
  relationships?: Array<{                 // Inter-applicant relationships (optional)
    fromId: string;
    toId: string;
    relationType: string;
    category?: string;
  }>
): LoanApplicationPayload
```

**Parameters:**

| Param | Description |
|---|---|
| `loanData` | Raw answers from the loan form. Keys are `bindsTo` keys (e.g., `propertyStateName`, `loanAmount`) |
| `applicants` | Array of applicant objects, each containing identity, employment, income, obligation data |
| `applicationData` | Application-level metadata (structure type, preferences, etc.) |
| `relationships` | Optional array of relationships between applicants. Uses `fromId`/`toId` (applicant IDs), resolved to index-based `RelationshipEntry[]` internally |

**Returns:** Clean `LoanApplicationPayload` with:
- `loanTransaction` — All loan/property/transaction fields
- `allApplicantDetails` — Array of cleaned applicant objects
- `relationships` — Inter-applicant relationships (resolved to index-based, if provided)

### `buildStructuredPayload()`

```typescript
function buildStructuredPayload(
  schema: Schema,                         // Form schema definition
  loanAnswers: Record<string, unknown>,
  applicants: Record<string, unknown>[],
  applicationData: Record<string, unknown>,
  relationships?: Array<{ fromId: string; toId: string; relationType: string; category?: string }>,
  groupOverrides?: Record<string, string>
): StructuredPayload
```

**Returns:** Schema-driven grouped answers + applicants + relationships + backward-compat `loanTransaction`.

### `enrichPayload()`

```typescript
function enrichPayload(
  payload: LoanApplicationPayload
): EnrichedPayload
```

**Returns:** The same payload structure with:
- `_computed` object added with all derived fields
- Top-level backward-compatibility fields added (`isSCST`, `hasBlackMoney`, etc.)
- EMI shares recomputed server-side

### `comparePayloads()`

```typescript
function comparePayloads(
  oldPayload: Record<string, unknown>,
  newPayload: Record<string, unknown>
): PayloadDiff

interface PayloadDiff {
  added: string[];     // Fields in new but not old
  removed: string[];   // Fields in old but not new
  changed: Array<{     // Fields that changed value
    path: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}
```

**Use case:** Debugging payload changes during development.

---

## Common Patterns

### Pattern 1: Form Submission

```svelte
<script lang="ts">
  import { buildLoanPayload } from '$lib/utils/payloadBuilder';
  import { secureFetch } from '$lib/utils/secureFetch';

  // Props from form wizard
  let { loanData, applicants, applicationData } = $props();

  async function submitForAssessment() {
    // Build clean payload
    const payload = buildLoanPayload(loanData, applicants, applicationData);

    // Send to assessment API
    const response = await secureFetch('/api/assessment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      // Handle assessment results...
    }
  }
</script>
```

### Pattern 2: Payload Preview (Development)

```svelte
<script lang="ts">
  import { buildLoanPayload, comparePayloads } from '$lib/utils/payloadBuilder';

  let { loanData, applicants, applicationData } = $props();

  // Live payload preview during development
  let currentPayload = $derived.by(() => {
    return buildLoanPayload(loanData, applicants, applicationData);
  });

  // Compare with a saved snapshot
  let previousSnapshot = $state<Record<string, unknown> | null>(null);
  let diff = $derived.by(() => {
    if (!previousSnapshot) return null;
    return comparePayloads(previousSnapshot, currentPayload);
  });

  function takeSnapshot() {
    previousSnapshot = $state.snapshot(currentPayload);
  }
</script>
```

### Pattern 3: Server-Side Validation

```typescript
// Validate payload completeness before processing
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';

function validatePayload(payload: LoanApplicationPayload): string[] {
  const errors: string[] = [];

  // Core fields
  if (!payload.loanTransaction.loanName) {
    errors.push('Loan name is required');
  }
  if (!payload.loanTransaction.loanAmount || payload.loanTransaction.loanAmount <= 0) {
    errors.push('Valid loan amount is required');
  }

  // Applicants
  if (!payload.allApplicantDetails.length) {
    errors.push('At least one applicant is required');
  }

  // Primary applicant
  const primary = payload.allApplicantDetails[0];
  if (!primary?.fullName) {
    errors.push('Primary applicant name is required');
  }
  if (!primary?.creditScore && primary?.creditScore !== 0) {
    errors.push('Credit score is required');
  }

  return errors;
}
```

### Pattern 4: Accessing Enriched Fields in Rules

```typescript
import { enrichPayload } from '$lib/ruleEngine/payloadEnricher';

const enriched = enrichPayload(payload);

// Access computed fields
const totalIncome = enriched._computed._total_gross_monthly;
const maxCibil = enriched._computed._max_cibil;
const isBusinessFile = enriched._computed._is_business_file;

// Access top-level derived fields
const isSCST = enriched.isSCST;              // "Yes" or "No"
const hasBlackMoney = enriched.hasBlackMoney; // true or false
```

---

## Sanitizer Utilities

Available from `$lib/utils/payloadBuilder`:

```typescript
import { toNumber, toBoolean, deriveTitle } from '$lib/utils/payloadBuilder';

// Indian number format -> number
toNumber("12,50,000")     // -> 1250000
toNumber("75.5")          // -> 75.5
toNumber("")              // -> null
toNumber(undefined)       // -> null

// String/value -> boolean
toBoolean("Yes")          // -> true
toBoolean("No")           // -> false
toBoolean("true")         // -> true
toBoolean(1)              // -> true
toBoolean(0)              // -> false
toBoolean(undefined)      // -> false

// Auto-derive title from gender + marital status
deriveTitle("Male", "Married")     // -> "Mr."
deriveTitle("Male", "Single")      // -> "Mr."
deriveTitle("Female", "Married")   // -> "Mrs."
deriveTitle("Female", "Single")    // -> "Ms."
deriveTitle("Others", "Single")    // -> "" (no title)
```

---

## Important Rules

### DO

- Always use `buildLoanPayload()` to transform raw form data — never manually construct the payload
- Always call `enrichPayload()` server-side before rule evaluation
- Use `toNumber()` for any user-input number strings (handles Indian comma format)
- Import types from `$lib/utils/payloadBuilder` for type safety
- Use `comparePayloads()` during development to verify changes

### DON'T

- Never call `enrichPayload()` on the client — it's server-side only
- Never trust client-computed `applicantEmiShare` — the enricher recomputes it
- Never call `fetch` at module scope (SvelteKit SSR warning) — always in `onMount` or event handlers
- Never construct payload manually — always use `buildLoanPayload()`
- Never use `JSON.parse(JSON.stringify())` for cloning — use `$state.snapshot()` or `structuredClone()`

---

## Error Handling

The payload builder is designed to be resilient:

- Missing fields produce `undefined` (not errors)
- Invalid numbers via `toNumber()` return `null`
- Empty arrays/objects are omitted from output
- The builder never throws — it always returns a valid structure

However, the **enricher** may log warnings for:
- Missing credit scores (defaults to 0)
- Missing employment type (defaults to empty string)
- Obligation entries without EMI or limit values

Always wrap enricher calls in try/catch in API routes:

```typescript
try {
  const enriched = enrichPayload(payload);
  // proceed...
} catch (error) {
  logger.error({ error, payload }, 'Payload enrichment failed');
  return apiServerError('Failed to process application');
}
```

---

## File Reference

| File | Import Path | Purpose |
|---|---|---|
| `payloadBuilder/index.ts` | `$lib/utils/payloadBuilder` | Barrel export — all builder functions + types |
| `payloadBuilder/types.ts` | (via barrel) | TypeScript interfaces |
| `payloadBuilder/sanitizers.ts` | (via barrel) | `toNumber`, `toBoolean`, `deriveTitle` |
| `payloadBuilder/activityProfiles.ts` | (via barrel) | Profile builders |
| `payloadBuilder/incomePayload.ts` | (via barrel) | Income entry extraction |
| `payloadBuilder/obligationPayload.ts` | (via barrel) | Obligation cleaning |
| `payloadBuilder/applicantPayload.ts` | (via barrel) | Single applicant builder |
| `payloadBuilder/loanTransaction.ts` | (via barrel) | Loan transaction + main `buildLoanPayload()` |
| `payloadBuilder/comparePayloads.ts` | (via barrel) | `comparePayloads()` diff utility |
| `ruleEngine/payloadEnricher.ts` | `$lib/ruleEngine/payloadEnricher` | `enrichPayload()` |
| `ruleEngine/systemConfig.ts` | `$lib/ruleEngine/systemConfig` | Centralized enricher constants |
