---
type: convention
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Testing Strategy

## The three layers

| Layer | Tool | What it tests | Coverage target |
|---|---|---|---|
| **Unit** | Vitest | Schema validation, service logic, repository data shaping, utilities | 80% line, 90% branch on services |
| **Integration** | Vitest + MongoDB Memory Server | Repository + service against a real Mongo instance | All service public methods |
| **End-to-end** | Playwright | Critical user flows in a real browser | The 5 critical paths (below) |

Plus:
- **Visual regression** via Storybook Chromatic-style snapshots (or Lost Pixel)
- **Type-check** as a CI step (`tsc --noEmit`)
- **PII audit** on logs and Sentry events
- **Migration safety** test for every schema change

## What gets tested where

### Service tests (the most important)

Every service method has at least one happy-path test and one failure-path test.

```typescript
// domains/customers/__tests__/service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomersService } from '../service';
import { customerFactory, mockUser } from './factories';
import { InMemoryCustomersRepository } from './fakes';

describe('CustomersService.create', () => {
  let service: CustomersService;
  let repo: InMemoryCustomersRepository;

  beforeEach(() => {
    repo = new InMemoryCustomersRepository();
    service = new CustomersService(repo, mockConversations(), mockAudit());
  });

  it('creates a new customer when mobile is not found', async () => {
    const input = customerFactory.build();
    const result = await service.create(input, mockUser());
    expect(result.ok).toBe(true);
    expect(result.value._id).toBeDefined();
    expect(repo.items).toHaveLength(1);
  });

  it('returns existing customer when mobile already exists', async () => {
    const existing = customerFactory.build({ org_id: mockUser().org_id });
    await repo.create(existing);

    const input = customerFactory.build({ mobile: existing.mobile });
    const result = await service.create(input, mockUser());

    expect(result.ok).toBe(true);
    expect(result.value._id).toEqual(existing._id);  // same customer
    expect(repo.items).toHaveLength(1);              // no duplicate
  });

  it('isolates customers per org', async () => {
    const userA = mockUser({ org_id: 'orgA' });
    const userB = mockUser({ org_id: 'orgB' });

    await service.create(customerFactory.build({ mobile: '9811556664' }), userA);
    await service.create(customerFactory.build({ mobile: '9811556664' }), userB);

    expect(repo.items).toHaveLength(2);  // two separate customers, same mobile, different orgs
  });
});
```

### Schema tests

Every Zod schema is tested for accept and reject cases.

```typescript
// domains/customers/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { CreateCustomerSchema } from '../schema';

describe('CreateCustomerSchema', () => {
  it('accepts valid input', () => {
    const result = CreateCustomerSchema.safeParse({
      org_id: '6571abcd...',
      full_name: 'Rahul Sharma',
      mobile: '9811556664',
      pan: 'ABCDE1234F',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid PAN', () => {
    const result = CreateCustomerSchema.safeParse({
      org_id: '6571abcd...',
      full_name: 'Rahul Sharma',
      mobile: '9811556664',
      pan: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});
```

### Repository tests

Tested against an in-memory Mongo (mongodb-memory-server).

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { CustomersRepository } from '../repository';

let mongo: MongoMemoryServer;
let client: MongoClient;
let repo: CustomersRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongo.getUri());
  repo = new CustomersRepository(client.db('test').collection('customers'));
});

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

describe('CustomersRepository', () => {
  it('finds by blind-indexed mobile', async () => {
    const customer = await repo.create(/* ... */);
    const found = await repo.findByMobileBlindIndex(customer.org_id, '9811556664');
    expect(found?._id).toEqual(customer._id);
  });
});
```

### End-to-end tests (Playwright)

Only the 5 critical user flows have E2E coverage. They run on every PR.

| Critical flow | What it verifies |
|---|---|
| 1. Login → Home loads | Auth, session, capability load, Home render |
| 2. Create a case | Lead form → conversion → case → engine result |
| 3. Send a WhatsApp doc request | Compose → backend dispatch → BSP API mocked → delivery confirmation |
| 4. Record a commission state transition | Commission row Expected → Approved → Received with evidence |
| 5. Search for a customer | Universal search → result panel → deep link |

```typescript
// tests/e2e/critical-create-case.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsDsa } from './helpers/auth';
import { mockEngineResponse } from './helpers/mocks';

test('DSA can create a case from a lead and see engine result', async ({ page }) => {
  await loginAsDsa(page, 'rahul-test');

  await page.goto('/leads/new');
  await page.fill('input[name="mobile"]', '9811556664');
  await page.fill('input[name="full_name"]', 'Priya Singh');
  await page.selectOption('select[name="loan_type"]', 'home_loan');
  await page.fill('input[name="estimated_amount"]', '5000000');

  await page.click('button:has-text("Save Lead")');
  await page.click('button:has-text("Convert to Case")');

  await expect(page).toHaveURL(/\/cases\/[a-f0-9]+/);
  await expect(page.locator('text=5,00,000')).toBeVisible();  // Indian format

  await mockEngineResponse(page, { offers: [/* mock */] });
  await page.click('button:has-text("Run Engine")');

  await expect(page.locator('[data-testid="offer-card"]')).toHaveCount(5);
});
```

### Visual regression

Each Storybook story gets a snapshot. PRs that change UI generate diffs for human review.

## Test data factories

Every domain has `__tests__/factories.ts`:

```typescript
// domains/customers/__tests__/factories.ts
import { Factory } from 'fishery';
import type { Customer } from '../types';

export const customerFactory = Factory.define<Customer>(({ sequence }) => ({
  _id: new ObjectId(),
  org_id: new ObjectId(),
  full_name: encryptedFactory('Test Customer ' + sequence),
  mobile: mobileEncryptedFactory(`98115566${(60 + sequence).toString().padStart(2, '0')}`),
  pan: undefined,
  email: undefined,
  created_at: new Date(),
  updated_at: new Date(),
  schema_version: 1,
}));
```

Reduces test boilerplate; enforces consistency.

## Mocks for external services

`MSW` (Mock Service Worker) for HTTP mocks in frontend tests and dev:

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/internal/customers', () => {
    return HttpResponse.json({ ok: true, data: { customer: customerFactory.build() } });
  }),
];
```

For backend service mocks, use **manual fakes** (in-memory implementations of repositories) rather than mocking libraries. Faster and clearer.

## Coverage gates

CI fails the PR if:
- Service files drop below 80% line coverage
- Branch coverage drops below 90% on services
- New service methods have no test
- Critical-path E2E breaks

## What's deliberately NOT tested

| Skipped | Reason |
|---|---|
| Trivial getters/setters | Low signal, high noise |
| Routes (the thin layer) | If the service is tested + the route is 10 lines, the integration is implicit |
| Third-party library internals | Trust the library, mock its surface |
| Exact HTML structure | Brittle; visual regression covers this |
| Console output formatting | Style, not behaviour |

## Test naming

Format: `<method>: <expected behaviour> when <condition>`

Good:
- `create: returns existing customer when mobile already exists`
- `transition: rejects illegal state transition (received → expected)`

Bad:
- `test customer create`
- `it works`

## Performance tests

Not part of every PR, but a nightly job runs:
- Engine evaluation p95 on 1000-case fixture
- Customer search p95 on 100k-customer org
- Work Queue load p95 on 500-active-case org

Regressions outside p95 budget alert owner.

## Related docs

- [01-CODE-RULES.md](01-CODE-RULES.md)
- [04-PR-PROCESS.md](04-PR-PROCESS.md)
