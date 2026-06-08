---
type: convention
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# TypeScript Patterns

## Schema-first with Zod

Every domain type is **derived from a Zod schema**. The Zod schema is the single source of truth — TypeScript types, runtime validation, and database validation all derive from it.

```typescript
// domains/customers/schema.ts
import { z } from 'zod';
import { EncryptedString, Mobile, PAN, ObjectIdSchema } from '$types/primitives';

export const CustomerSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  full_name: EncryptedString,
  mobile: Mobile,                         // Encrypted + blind-indexed
  pan: PAN.optional(),
  email: EncryptedString.optional(),
  date_of_birth: z.date().optional(),
  // ...
  created_at: z.date(),
  updated_at: z.date(),
  schema_version: z.literal(1),
});

export const CreateCustomerSchema = CustomerSchema.omit({
  _id: true,
  created_at: true,
  updated_at: true,
  schema_version: true,
});

// Derived TS types
export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
```

When a field is added, you edit the schema. The TS type updates. The validation updates. The database expectation updates. One change, three places aligned.

## Encrypted<T> primitive

The most important TypeScript pattern in V5.

```typescript
// packages/types/src/primitives.ts

const ENCRYPTED_BRAND = Symbol('encrypted');

export interface Encrypted<T extends string> {
  readonly [ENCRYPTED_BRAND]: true;
  readonly ciphertext: Buffer;
  readonly blind_index?: string;
  readonly _phantom?: T; // for type discrimination
}

// Type guards
export function isEncrypted(v: unknown): v is Encrypted<string> {
  return typeof v === 'object' && v !== null && ENCRYPTED_BRAND in v;
}

// Constructor (only callable from approved encryption module)
export function asEncrypted<T extends string>(ciphertext: Buffer, blind_index?: string): Encrypted<T> {
  return { [ENCRYPTED_BRAND]: true, ciphertext, blind_index } as Encrypted<T>;
}
```

Usage:

```typescript
// domain types
export type EncryptedString = Encrypted<string>;
export const EncryptedString: z.ZodType<EncryptedString> = z.custom(isEncrypted);

// In a domain
export interface Customer {
  full_name: EncryptedString;   // can't be passed where string is expected
  mobile: EncryptedString;
  // ...
}
```

If an engineer tries:

```typescript
logger.info({ name: customer.full_name }, 'customer found');  // TYPE ERROR
```

The compiler rejects it because `Encrypted<string>` doesn't satisfy `Loggable` (defined to exclude branded encrypted types).

## Loggable type

```typescript
// packages/types/src/logger.ts
type Primitive = string | number | boolean | null | undefined;
type LoggableValue = Primitive | Date | ObjectId | Array<LoggableValue> | { [k: string]: LoggableValue };

// Note: Encrypted<T> is NOT in this union
export type Loggable = LoggableValue;

export interface Logger {
  info(meta: Loggable, msg: string): void;
  warn(meta: Loggable, msg: string): void;
  error(meta: Loggable, msg: string): void;
  fatal(meta: Loggable, msg: string): void;
}
```

Compile-time PII discipline. Try to log an `Encrypted<T>` — compiler refuses.

## Branded primitives for common values

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };

export type Rupees = Brand<number, 'Rupees'>;
export type Paise = Brand<number, 'Paise'>;
export type PercentBp = Brand<number, 'PercentBp'>;       // basis points
export type Pincode = Brand<string, 'Pincode'>;
export type NormalisedMobile = Brand<string, 'NormalisedMobile'>;

// Conversions are explicit
export function rupeesToPaise(rs: Rupees): Paise {
  return (rs * 100) as Paise;
}

export function paiseToRupees(p: Paise): Rupees {
  return (p / 100) as Rupees;
}
```

Prevents mistakes like adding paise to rupees or treating a basis-point rate as a percentage.

## Result type for service methods

Services return `Result<T, E>` instead of throwing for expected failures.

```typescript
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; detail?: unknown };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E, detail?: unknown): Result<never, E> {
  return { ok: false, error, detail };
}
```

Routes pattern-match on results:

```typescript
const result = await locals.services.customers.create(input, locals.user);
if (!result.ok) return apiError(result.error, result.detail, 400);
return apiOk({ customer: result.value });
```

Throws are reserved for genuinely unexpected errors (DB connection failure, encryption failure).

## Discriminated unions for state machines

Commission states:

```typescript
type CommissionState =
  | { kind: 'expected'; amount_inr: Rupees; expected_at: Date }
  | { kind: 'approved'; amount_inr: Rupees; approved_at: Date; evidence_ref: string }
  | { kind: 'received'; amount_inr: Rupees; received_at: Date; bank_ref: string }
  | { kind: 'disputed'; amount_inr: Rupees; reason: string; disputed_at: Date };
```

State transitions become typed functions:

```typescript
function approve(c: Extract<CommissionState, { kind: 'expected' }>, evidence: string): Extract<CommissionState, { kind: 'approved' }> {
  return { kind: 'approved', amount_inr: c.amount_inr, approved_at: new Date(), evidence_ref: evidence };
}
```

Compiler enforces "can only approve an expected commission."

## Svelte 5 runes — patterns

### Local state

```svelte
<script lang="ts">
  let count = $state(0);
  let label = $derived(`Count is ${count}`);

  $effect(() => {
    console.log('count changed', count); // BUT — see Code Rule #3, use logger
  });
</script>
```

### Props with derived

```svelte
<script lang="ts">
  let { customer } = $props<{ customer: Customer }>();
  let displayName = $derived(customer.full_name.ciphertext.length > 0 ? 'Has name' : 'No name');
</script>
```

### Class-based stores when needed

```typescript
// stores/work-queue.svelte.ts
export class WorkQueueStore {
  items = $state<WorkItem[]>([]);
  loading = $state(false);

  async load() {
    this.loading = true;
    try {
      const res = await secureFetch('/api/internal/work-queue');
      const data = await res.json();
      this.items = data.items;
    } finally {
      this.loading = false;
    }
  }
}

// Singleton instance
export const workQueue = new WorkQueueStore();
```

## Async patterns

Prefer `async/await` over Promise chains. Top-level await OK in route loaders.

```typescript
export async function load({ locals }) {
  const [customer, conversations, cases] = await Promise.all([
    locals.services.customers.findById(id),
    locals.services.conversations.findByCustomer(id),
    locals.services.cases.listByCustomer(id),
  ]);
  return { customer, conversations, cases };
}
```

## Error handling

```typescript
// Expected failures: return err()
async function findByMobile(mobile: string): Promise<Result<Customer, 'not_found'>> {
  const c = await this.repo.findByMobileBlindIndex(this.org_id, mobile);
  if (!c) return err('not_found');
  return ok(c);
}

// Unexpected failures: throw
async function create(input: CreateCustomerInput): Promise<Customer> {
  const encrypted = await encrypt(input.mobile);  // throws on KMS failure — that's appropriate
  return await this.repo.create({ ...input, mobile: encrypted });
}
```

## Generic constraints over `any`

```typescript
// Bad
function pluck(obj: any, key: string) { return obj[key]; }

// Good
function pluck<T extends Record<string, unknown>, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

`any` is banned in non-test code. Use `unknown` and narrow with type guards.

## Related docs

- [01-CODE-RULES.md](01-CODE-RULES.md)
- [../05-domains/](../05-domains/) — Examples of schema-first per domain
- [../04-security/01-PII-DISCIPLINE.md](../04-security/01-PII-DISCIPLINE.md) — Encrypted<T> motivation
