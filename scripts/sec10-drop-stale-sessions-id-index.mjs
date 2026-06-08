#!/usr/bin/env node
/**
 * SEC-10 — Drop the orphan `id_1` unique index on the sessions collection.
 * ══════════════════════════════════════════════════════════════════════
 * Background: an earlier schema (long pre-SEC-10) created a unique index on
 * a bare `id` field that no current code path writes. Every recordSession()
 * insert from check-dsa / verify-otp picks up `id: null` implicitly, hits
 * the unique-on-null constraint, fails with E11000, and falls through to
 * recordSession's warn-and-proceed branch — leaving the Sessions collection
 * empty. SEC-10's conflict detection + kicked-side poll both depend on rows
 * landing in Sessions, so the orphan index silently bricks the whole feature.
 *
 * This script is one-shot, idempotent, and safe to run repeatedly. It:
 *   1. Lists current indexes on digitaldsa.sessions (visibility)
 *   2. Drops `id_1` if present; logs a no-op message if already gone
 *   3. Re-lists indexes (confirmation)
 *
 * Reads MONGODB_URI from .env using Node's built-in process loader.
 *
 * Usage:
 *   pnpm tsx scripts/sec10-drop-stale-sessions-id-index.mjs
 *   # OR
 *   node --env-file=.env scripts/sec10-drop-stale-sessions-id-index.mjs
 *
 * Related: docs/PITFALLS.md entry (to be added) on "stale unique-on-null
 * index masquerading as a 'feature not working' bug".
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadMongoUriFromEnv() {
	if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
	for (const file of ['.env', '.env.local']) {
		try {
			const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
			for (const line of raw.split(/\r?\n/)) {
				const m = line.match(/^\s*MONGODB_URI\s*=\s*(.+?)\s*$/);
				if (m) return m[1].replace(/^['"]|['"]$/g, '');
			}
		} catch {
			// File missing — fine, try the next.
		}
	}
	return null;
}

const STALE_INDEX_NAME = 'id_1';
const DB_NAME = 'digitaldsa';
const COLLECTION_NAME = 'sessions';

async function main() {
	const uri = loadMongoUriFromEnv();
	if (!uri) {
		console.error(
			'❌ MONGODB_URI not found in process.env, .env, or .env.local. Aborting.'
		);
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	const coll = client.db(DB_NAME).collection(COLLECTION_NAME);

	const before = (await coll.indexes()).map((i) => i.name);
	console.log(`📋 Indexes BEFORE on ${DB_NAME}.${COLLECTION_NAME}:`);
	for (const name of before) console.log(`   - ${name}`);

	if (!before.includes(STALE_INDEX_NAME)) {
		console.log(
			`\n✅ No-op: '${STALE_INDEX_NAME}' is not present. Nothing to drop.`
		);
		await client.close();
		return;
	}

	console.log(`\n🧹 Dropping '${STALE_INDEX_NAME}' ...`);
	const result = await coll.dropIndex(STALE_INDEX_NAME);
	console.log(`   drop result:`, result);

	const after = (await coll.indexes()).map((i) => i.name);
	console.log(`\n📋 Indexes AFTER:`);
	for (const name of after) console.log(`   - ${name}`);

	console.log(`\n✅ Done. Login flows should now write Sessions rows cleanly.`);
	await client.close();
}

main().catch((err) => {
	console.error('❌ Failed:', err?.stack || err?.message || String(err));
	process.exit(1);
});
