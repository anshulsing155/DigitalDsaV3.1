---
type: database
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Migration Pattern

## Forward + rollback always

Every schema change ships two scripts: a forward migration and a rollback. Both are tested before the PR merges.

```
scripts/migrate/
  2026-08-15-1234-add-customer-collection/
    README.md                  Why this migration exists
    forward.ts                 Applies the change
    rollback.ts                Reverses the change (best-effort)
    test.ts                    Verifies forward + rollback round-trips
```

Naming convention: `YYYY-MM-DD-HHMM-<kebab-description>/`.

## Migration script structure

```typescript
// forward.ts
import { db } from '$lib/server/db';
import { logger } from '$lib/server/logger';

export async function up() {
  logger.info({ migration: '2026-08-15-add-customer-collection' }, 'start');

  // 1. Create collection with validator
  await db.createCollection('customers', {
    validator: { /* JSON Schema from Zod */ },
  });

  // 2. Create indexes
  await db.collection('customers').createIndex(
    { org_id: 1, 'mobile.blind_index': 1 },
    { unique: true, name: 'org_mobile_unique' }
  );
  await db.collection('customers').createIndex(
    { org_id: 1, 'pan.blind_index': 1 },
    { sparse: true, name: 'org_pan_sparse' }
  );

  // 3. Backfill if needed (none for new collection)

  logger.info({ migration: '...' }, 'done');
}
```

```typescript
// rollback.ts
export async function down() {
  await db.collection('customers').dropIndex('org_mobile_unique');
  await db.collection('customers').dropIndex('org_pan_sparse');
  await db.collection('customers').drop();
}
```

```typescript
// test.ts
import { test, expect } from 'vitest';
import { up } from './forward';
import { down } from './rollback';

test('forward + rollback round-trips', async () => {
  await up();
  expect(await db.collection('customers').indexExists('org_mobile_unique')).toBe(true);

  await down();
  expect(await db.listCollections({ name: 'customers' }).toArray()).toHaveLength(0);
});
```

## Migration runner

```bash
pnpm migrate up                  # apply all unapplied migrations
pnpm migrate up --to <date>      # apply up to specific migration
pnpm migrate down --to <date>    # rollback to specific migration
pnpm migrate status              # show applied + pending
```

Tracking collection `migrations_applied` records: `{ id, applied_at, applied_by, sha }`.

## Data backfill migrations

For migrations that need to update many existing documents:

```typescript
// forward.ts
export async function up() {
  // Schema update first
  await db.collection('cases').updateMany(
    { schema_version: { $ne: 2 } },
    { $set: { schema_version: 2 } }
  );

  // Backfill in batches
  const batchSize = 1000;
  let cursor = await db.collection('cases').find({ 'new_field': { $exists: false } });

  while (await cursor.hasNext()) {
    const batch = [];
    for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
      batch.push(await cursor.next());
    }

    const bulkOps = batch.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { new_field: computeNewField(doc) } },
      },
    }));

    await db.collection('cases').bulkWrite(bulkOps);
    logger.info({ processed: batch.length }, 'backfill batch');
  }
}
```

Backfill scripts:
- Resumable (track progress in a tracking collection)
- Idempotent (running twice gives same result)
- Rate-limited (don't hammer production)

## Pre-deploy testing

Every migration ships with a smoke test against:
1. A clean test DB (empty)
2. A staging clone of production data

The latter is critical for backfills — confirms the migration works on real-shape data.

## Dual-write window for risky migrations

For schema changes where data shape changes significantly:

```
Phase 1 (dual-write):  Service writes to both old and new fields. Old field remains source of truth.
Phase 2 (cutover):     Service reads from new field; old field maintained for safety.
Phase 3 (sunset):      Migration script drops old field. Service no longer writes it.
```

Each phase is a separate PR. ADR documents the sunset trigger.

Example: when V3 → V5 customer migration happens, the V5 case `optional_contact` blob is kept as a read-time alias for one release cycle, then sunset (see V5-IMPORT migration in Customer domain doc).

## Migration safety in CI

PR check for any schema-change PR:
1. Forward + rollback both run on test DB
2. Backfill verified on staging clone
3. Round-trip test passes
4. ADR is attached if the migration is high-risk

## Locks during migration

For production migrations:
1. Maintenance window scheduled (status page updated)
2. Read traffic continues
3. Write traffic paused only if necessary (rare — most migrations are online)
4. Migration runs in batches
5. Verify
6. Resume normal operations

For online migrations: no downtime; backwards-compatible reads during transition.

## Examples

### Adding a field (online)

1. Schema validator updated to allow the new field
2. Service writes new field on new records
3. Backfill script populates new field for old records (background)
4. Reads start using the new field
5. Old code paths removed in subsequent PR

### Renaming a field (dual-write)

1. Schema validator allows both old and new field
2. Service writes to both
3. Backfill copies old → new
4. Reads switch to new field
5. Validator drops the old field
6. Backfill removes the old field

### Dropping a collection

1. Service stops writing
2. Wait one release cycle (data is read-archive)
3. Backup the collection to S3
4. Drop with rollback ability (`renameCollection` to `_archived_<date>_<name>`)
5. After retention period, truly drop

## ClickHouse migrations

Similar pattern but ClickHouse:
- ALTER TABLE for column additions (online)
- ATTACH/DETACH PARTITION for bulk changes
- CREATE OR REPLACE for materialised views

Scripts under `etl/migrations/`.

## Migration history doc

Every migration has a README.md in its folder explaining:
- What changed
- Why
- Impact on running services
- Rollback considerations
- Author + date

These accumulate into project history without bloating CLAUDE.md.

## Related docs

- [01-MONGODB-SCHEMA.md](01-MONGODB-SCHEMA.md)
- [02-CLICKHOUSE-SCHEMA.md](02-CLICKHOUSE-SCHEMA.md)
- [../03-conventions/01-CODE-RULES.md](../03-conventions/01-CODE-RULES.md) — Rule 12 (migrations forward-only with rollback)
