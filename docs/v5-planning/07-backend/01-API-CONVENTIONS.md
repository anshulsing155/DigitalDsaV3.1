---
type: backend
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# API Conventions

## Three API surfaces

| Surface | Audience | Auth | Versioning |
|---|---|---|---|
| `/api/internal/...` | The three SvelteKit apps | JWT session cookie | Change freely; clients are us |
| `/api/v1/...` | External integrations (partners, CorpDSAs, large DSAs) | API key | Semver; breaking changes require new version |
| `/embed/v1/...` | Builder embed widget | Per-builder JWT | Versioned |
| `/api/webhooks/...` | External services (WA, Razorpay, lenders) | Signature verification | Stable |

## Response envelope (all surfaces)

Every API response uses one envelope shape:

```typescript
type ApiResponse<T> =
  | { ok: true; data: T; meta?: ResponseMeta }
  | { ok: false; error: string; detail?: unknown; meta?: ResponseMeta };

interface ResponseMeta {
  request_id: string;          // for support tracing
  timestamp_iso: string;
  api_version?: string;        // for public APIs
}
```

Helpers in every route:

```typescript
import { apiOk, apiError, apiServerError } from '$lib/server/api';

return apiOk({ customer });
return apiError('not_found', { id }, 404);
return apiServerError(err);   // catches and logs; returns 500
```

## HTTP method conventions

| Method | When | Idempotent? |
|---|---|---|
| GET | Read | Yes |
| POST | Create or trigger action | No |
| PATCH | Partial update | No |
| PUT | Full replacement (rare) | Yes |
| DELETE | Mark for deletion or archive (no hard delete in V5) | Yes |

## URL conventions

- Resources are plural: `/customers`, `/cases`, not `/customer`
- Sub-resources nest: `/customers/:id/cases`
- Actions on a resource: POST verb to a sub-path: `/cases/:id/stage`, `/leads/:id/convert`
- Filters as query params: `/customers?status=active&dormant=true`
- Pagination: `?cursor=<opaque>&limit=20`

## Status codes

| Code | When |
|---|---|
| 200 | Success with body |
| 201 | Created (rare; we use 200 with the resource in `data`) |
| 204 | Success no body (rare) |
| 400 | Client validation error (Zod parse failure) |
| 401 | Not authenticated |
| 403 | Authenticated but not authorised (role check) |
| 404 | Not found OR capability disabled |
| 409 | Conflict (e.g., duplicate) |
| 410 | Gone (archived, can't be re-used) |
| 422 | Business rule violation (e.g., illegal state transition) |
| 429 | Rate limited |
| 500 | Server error (logged to Sentry) |
| 503 | Dependency down (engine, BSP) — retry later |

`404` is used both for "not found" and "capability disabled" — disabled capabilities don't reveal their existence.

## Auth in `/api/internal/`

JWT in HttpOnly cookie. `hooks.server.ts` decodes; sets `event.locals.user`.

```typescript
// In route
export async function GET({ locals }) {
  if (!locals.user) return apiError('unauthenticated', null, 401);
  // ...
}

// Or with a helper
export const GET = withAuth(async ({ locals, user }) => {
  // user is non-null here
});
```

## Auth in `/api/v1/` (public)

API keys are `Bearer` tokens in Authorization header. Key has scopes:

```typescript
interface ApiKey {
  _id: ObjectId;
  org_id: ObjectId;
  key_hash: string;            // argon2 hash
  scopes: string[];            // e.g., ['cases.read', 'commissions.read']
  rate_limit_per_minute: number;
  created_at: Date;
  revoked_at?: Date;
  last_used_at?: Date;
}
```

Per-key rate limit + per-org rate limit + per-endpoint rate limit.

## Webhook signatures

For inbound webhooks (Razorpay, Gupshup, lender settlement files):

```typescript
function verifyWebhookSignature(provider: 'razorpay'|'gupshup'|'lender_x', body: Buffer, signature: string): boolean {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

Routes verify before processing:

```typescript
export async function POST({ request }) {
  const body = await request.arrayBuffer();
  const signature = request.headers.get('x-signature');
  if (!verifyWebhookSignature('gupshup', Buffer.from(body), signature)) {
    return apiError('invalid_signature', null, 401);
  }
  // ... process
}
```

## CSRF for state-changing browser requests

Client uses `secureFetch`:

```typescript
import { secureFetch } from '$lib/csrf';

const res = await secureFetch('/api/internal/customers', {
  method: 'POST',
  body: JSON.stringify(input),
});
```

`secureFetch` reads a CSRF cookie set on session start and adds an `X-CSRF-Token` header. Server middleware verifies on every non-GET request.

## Rate limiting

Tiers:

| Surface | Default rate |
|---|---|
| `/api/internal/` | 60 req/min per user; 1000 req/min per org |
| `/api/v1/` | Per API key (configurable) |
| `/embed/v1/` | Per builder (configurable); 5 submissions/min per IP |
| `/api/webhooks/` | None (rely on signature verification) |

429 response includes `Retry-After` header.

## Idempotency keys

For POST endpoints that should be safe-retry:

```
POST /api/internal/cases/:id/stage
X-Idempotency-Key: <uuid>
```

Server caches `(idempotency_key, response)` in Redis for 24 hours; duplicate requests get the cached response.

## Pagination

Cursor-based (more reliable than offset for large datasets):

```typescript
// Request
GET /api/internal/customers?limit=20&cursor=<opaque>

// Response
{
  ok: true,
  data: {
    items: [...],
    next_cursor: '<opaque>',  // null if end
    has_more: true,
  },
  meta: { ... }
}
```

The cursor opaque string encodes (last_id, sort_key) — clients don't parse it.

## Sorting and filtering

```
GET /api/internal/cases?stage=processing&sort=-updated_at,case_number
```

- `?sort=field` ascending
- `?sort=-field` descending
- Multiple fields comma-separated
- Whitelist of sortable fields enforced per route

## Field selection (sparse fieldsets)

For bandwidth-sensitive mobile:

```
GET /api/internal/customers?fields=id,full_name,mobile,last_contacted_at
```

Server returns only requested fields. Reduces over-fetch.

## Cache headers

| Resource type | Cache-Control |
|---|---|
| Static asset | `public, max-age=31536000, immutable` |
| Capability list, lender list (public, slow-changing) | `private, max-age=300` |
| Customer detail | `private, no-store` |
| Search results | `private, no-store` |
| Engine result (cached on case) | `private, max-age=60` |

CDN (Vercel) is told `no-store` for anything sensitive.

## Error format

```typescript
{
  ok: false,
  error: 'validation_error',           // machine-friendly code
  detail: {                            // structured details
    field_errors: [
      { field: 'mobile', issue: 'invalid_format' },
      { field: 'pan', issue: 'required' },
    ],
  },
  meta: { request_id, timestamp_iso },
}
```

Error codes are kebab-case identifiers. Documented per endpoint.

## OpenAPI spec

The `/api/v1/` surface has an OpenAPI 3.1 spec generated from Zod schemas. Hosted at `digitaldsa.com/docs/api/v1/`.

## Related docs

- [../03-conventions/01-CODE-RULES.md](../03-conventions/01-CODE-RULES.md) — apiOk discipline
- [02-WHATSAPP-DISPATCH.md](02-WHATSAPP-DISPATCH.md)
- [04-CAPABILITY-RUNTIME.md](04-CAPABILITY-RUNTIME.md)
