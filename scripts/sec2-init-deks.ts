/**
 * SEC-2 — Initialize Data Encryption Keys (DEKs) in the MongoDB key vault.
 *
 * Run once per environment after QE_LOCAL_MASTER_KEY is set in env. Idempotent —
 * skips DEKs that already exist. Safe to re-run if you add new keys to CSFLE_KEYS.
 *
 * Usage:
 *   CSFLE_ENABLED=true QE_LOCAL_MASTER_KEY=<base64-cmk> MONGODB_URI=<uri> \
 *     pnpm tsx scripts/sec2-init-deks.ts
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md §6 Phase A
 */

import { MongoClient } from 'mongodb';
import { ensureDeksExist } from '../src/lib/server/csfle/index.js';

async function main() {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error('[sec2-init-deks] MONGODB_URI is not set — aborting');
		process.exit(1);
	}

	if (process.env.CSFLE_ENABLED !== 'true') {
		console.error(
			'[sec2-init-deks] CSFLE_ENABLED is not "true" — set it to enable DEK creation, then re-run'
		);
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	console.log('[sec2-init-deks] connected to MongoDB');

	try {
		const result = await ensureDeksExist(client);
		console.log('[sec2-init-deks] result:');
		console.log(`  created:        ${result.created.length} key(s)`);
		console.log(`  already existed: ${result.alreadyExisted.length} key(s)`);
		if (result.created.length > 0) {
			console.log('  new keys:');
			for (const k of result.created) console.log(`    - ${k}`);
		}
	} finally {
		await client.close();
		console.log('[sec2-init-deks] done');
	}
}

main().catch((err) => {
	console.error('[sec2-init-deks] FAILED:', err);
	process.exit(1);
});
