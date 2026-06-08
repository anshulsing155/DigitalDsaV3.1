---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Code Architecture — Three Floors

## The shape

```
┌─────────────────────────────────────────────────────────┐
│  Top floor — Routes (src/routes/...)                    │
│  Thin. Receives HTTP. Calls a service. Returns response.│
│  No business logic. No database queries.                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Middle floor — Services (src/domains/<x>/service.ts)   │
│  Business rules live here.                              │
│  Knows about transactions, consent, principle 12 gates. │
│  Calls repositories. Calls other services.              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Ground floor — Repositories (src/domains/<x>/repo.ts)  │
│  Only file that talks to MongoDB / Redis / ClickHouse.  │
│  No business logic. Pure data access.                   │
└─────────────────────────────────────────────────────────┘
```

## Why three floors

In V3, route files frequently query MongoDB directly, run business logic, format responses — everything mixed. When the data layer needs to change, you hunt through 40 files.

In V5, the data layer change happens in one repository file. The service stays the same. The route stays the same.

**Plain example.** Suppose six months from now we add a read-replica for analytics queries. In V3 we'd touch dozens of routes. In V5 we touch one `CustomersRepository` to add a `getByIdReadReplica()` method, and the service decides when to use it.

## The Route layer

Routes live in `src/routes/...` as SvelteKit conventions (`+page.server.ts`, `+server.ts`, `+layout.server.ts`).

**A route does exactly four things:**
1. Parse the request (body, query, params, locals)
2. Resolve the right service from `locals.services`
3. Call one or more service methods
4. Format the response (`apiOk` / `apiError`)

**A route never:**
- Queries MongoDB directly
- Computes business rules
- Decodes auth tokens (that happens in `hooks.server.ts`)
- Sends WhatsApp messages or any external call

### Example

```typescript
// src/routes/api/internal/customers/+server.ts
import { apiOk, apiError } from '$lib/server/api';
import { parseJsonBody } from '$lib/server/parse';
import { CreateCustomerSchema } from '$domains/customers/schema';

export async function POST({ request, locals }) {
  const body = await parseJsonBody(request);
  const parsed = CreateCustomerSchema.safeParse(body);
  if (!parsed.success) return apiError('invalid_input', parsed.error.flatten(), 400);

  try {
    const customer = await locals.services.customers.create(parsed.data, locals.user);
    return apiOk({ customer });
  } catch (err) {
    return apiError('create_failed', err.message, 500);
  }
}
```

That's a full route file. Three imports, ~10 lines.

## The Service layer

Services live in `src/domains/<domain>/service.ts`. They encode the business rules of that domain.

**A service knows about:**
- Transactions and rollback
- Consent gates (DPDP)
- Principle 12 checks
- Cross-domain coordination (Customer create → triggers Conversation create → emits timeline event)
- Audit logging
- Calling external integrations via injected adapters

**A service does not know about:**
- HTTP, request bodies, status codes (that's the route's job)
- Direct database access (that's the repository's job)
- React/Svelte components

### Example

```typescript
// src/domains/customers/service.ts
import { CustomersRepository } from './repository';
import { ConversationsService } from '$domains/conversations/service';
import { AuditLogger } from '$lib/server/audit';
import { logger } from '$lib/server/logger';
import type { CreateCustomerInput, Customer } from './types';
import type { AuthenticatedUser } from '$lib/server/auth/types';

export class CustomersService {
  constructor(
    private repo: CustomersRepository,
    private conversations: ConversationsService,
    private audit: AuditLogger,
  ) {}

  async create(input: CreateCustomerInput, by: AuthenticatedUser): Promise<Customer> {
    // 1. Look for existing customer by normalised mobile
    const existing = await this.repo.findByMobileBlindIndex(by.org_id, input.mobile);
    if (existing) {
      logger.info({ org_id: by.org_id, customer_id: existing._id }, 'customer.found_existing');
      return existing;
    }

    // 2. Create new customer
    const customer = await this.repo.create({ ...input, org_id: by.org_id, created_by: by._id });

    // 3. Initialise an empty Conversation (Customer-owned thread)
    await this.conversations.createForCustomer(customer._id, by);

    // 4. Audit log
    await this.audit.record('customer.created', { customer_id: customer._id }, by);

    return customer;
  }
}
```

The service is the brain. Business decisions live here. Other services and adapters get injected via the constructor.

## The Repository layer

Repositories live in `src/domains/<domain>/repository.ts`. Only files allowed to query MongoDB.

**A repository:**
- Has methods like `findById`, `findByMobileBlindIndex`, `create`, `update`, `list`, `delete`
- Always scopes queries by `org_id`
- Handles CSFLE encryption/decryption transparently
- Computes blind indexes when writing PII fields
- Returns typed domain objects, not raw Mongo documents

**A repository never:**
- Calls another repository
- Calls a service
- Knows about HTTP, sessions, or users
- Implements business rules

### Example

```typescript
// src/domains/customers/repository.ts
import { Collection, ObjectId } from 'mongodb';
import { hmacIndex } from '$lib/server/crypto/blind-index';
import { normaliseMobile } from '$lib/normalise/mobile';
import type { Customer, CreateCustomerInput } from './types';

export class CustomersRepository {
  constructor(private col: Collection<Customer>) {}

  async findByMobileBlindIndex(org_id: ObjectId, mobile: string): Promise<Customer | null> {
    const blind = await hmacIndex('mobile', normaliseMobile(mobile));
    return this.col.findOne({ org_id, 'mobile.blind_index': blind });
  }

  async create(input: CreateCustomerInput & { org_id: ObjectId; created_by: ObjectId }): Promise<Customer> {
    const now = new Date();
    const doc: Omit<Customer, '_id'> = {
      org_id: input.org_id,
      full_name: { ciphertext: await encrypt(input.full_name) },
      mobile: {
        ciphertext: await encrypt(input.mobile),
        blind_index: await hmacIndex('mobile', normaliseMobile(input.mobile))
      },
      // ... other fields
      created_at: now,
      updated_at: now,
      created_by: input.created_by,
      schema_version: 1,
    };
    const result = await this.col.insertOne(doc as Customer);
    return { ...doc, _id: result.insertedId } as Customer;
  }

  async findById(org_id: ObjectId, id: ObjectId): Promise<Customer | null> {
    return this.col.findOne({ _id: id, org_id });
  }
}
```

Notice: org_id on every query. CSFLE encryption inline. No business decisions.

## Per-domain folder

Every domain is self-contained:

```
src/domains/customers/
  schema.ts          # Zod schema (single source of truth)
  types.ts           # TS types derived from schema
  repository.ts      # MongoDB access
  service.ts         # Business rules
  routes.ts          # Capability key + route registry
  __tests__/
    schema.test.ts
    service.test.ts
    repository.test.ts
    factories.ts     # Test data factories
  CLAUDE.md          # How Claude should think about this domain
  README.md          # Engineer-facing overview
```

An engineer working on Customer lives in `src/domains/customers/`. They don't need to understand other domains to ship a Customer change.

## Service injection

`locals.services` is built once per request in `hooks.server.ts`. All services and repositories are constructed there with their dependencies.

```typescript
// src/hooks.server.ts
import { db } from '$lib/server/db';
import { CustomersRepository } from '$domains/customers/repository';
import { CustomersService } from '$domains/customers/service';
// ... etc

export const handle = async ({ event, resolve }) => {
  // Auth
  event.locals.user = await authenticate(event);

  // Build services
  const customersRepo = new CustomersRepository(db.collection('customers'));
  const conversationsRepo = new ConversationsRepository(db.collection('conversations'));
  const audit = new AuditLogger(db.collection('audit_events'));

  const conversations = new ConversationsService(conversationsRepo, audit);
  const customers = new CustomersService(customersRepo, conversations, audit);

  event.locals.services = { customers, conversations /* ... */ };

  // Capability gate (see capability-runtime doc)
  if (!isCapabilityAllowedForRoute(event)) return new Response('Not Found', { status: 404 });

  return resolve(event);
};
```

This pattern makes everything testable. In tests, services get constructed with in-memory or mock repositories.

## When you'd be tempted to skip a layer

| Temptation | The right answer |
|---|---|
| "Just query Mongo from the route, it's faster" | No — write a repo method, takes 2 extra lines, gains testability + swappability |
| "This is just a simple update, no service logic" | Use a service method anyway — audit logging, telemetry, future-proofing |
| "I'll cross-call from one repo to another" | No — call services from services, services orchestrate |
| "Just put the logic in `+page.server.ts`'s `load`" | No — keep load thin, push to service |

The discipline is what keeps the codebase clean over months.

## Related docs

- [03-MONOREPO-LAYOUT.md](03-MONOREPO-LAYOUT.md) — Where this all lives
- [../03-conventions/01-CODE-RULES.md](../03-conventions/01-CODE-RULES.md) — Locked rules
- [../03-conventions/02-TYPESCRIPT-PATTERNS.md](../03-conventions/02-TYPESCRIPT-PATTERNS.md) — Encrypted<T>, Zod patterns
- [../05-domains/](../05-domains/) — Per-domain specs
