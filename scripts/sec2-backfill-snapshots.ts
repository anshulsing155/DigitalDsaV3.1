/**
 * SEC-2 Phase C.2 — formSnapshots payload backfill CLI.
 *
 * Walks every snapshot in `formSnapshots` and populates the
 * `payload_encrypted` field for rows missing it. Idempotent — rows
 * already converted by a previous run (or by new dual-write inserts)
 * are detected via the `payload_encrypted` check and skipped.
 *
 * Pre-requisites (identical to the user-collection backfill CLI):
 *   1. `CSFLE_ENABLED=true` — otherwise encryption passes through.
 *   2. `QE_LOCAL_MASTER_KEY` — base64 CMK in environment.
 *   3. `MONGODB_URI` — Atlas connection string.
 *   4. `BACKFILL_TARGET_ENV` matching `--target-env` arg — foot-shooting guard.
 *   5. DEKs (including the new `payload-key`) must exist in the key
 *      vault — re-run `scripts/sec2-init-deks.ts` if `payload-key` was
 *      added after the initial Phase A init.
 *
 * Usage:
 *   CSFLE_ENABLED=true \
 *   QE_LOCAL_MASTER_KEY=<base64> \
 *   MONGODB_URI=<uri> \
 *   BACKFILL_TARGET_ENV=production \
 *     pnpm tsx scripts/sec2-backfill-snapshots.ts \
 *       --target-env production \
 *       [--batch-size 200] \
 *       [--dry-run]
 *
 * NOTE: payloads are large (50KB+ each is normal). Batch size defaults
 * to 200 here vs. 500 for user rows — keeps per-batch memory footprint
 * bounded.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §4.4 + §3.6 operator runbook.
 */

import { MongoClient } from 'mongodb';
import os from 'node:os';
import { FormSnapshots } from '../src/lib/database/mongo.js';
import {
	backfillSnapshots,
	ensureAuditIndex,
	type BackfillCollectionResult
} from '../src/lib/server/csfle/index.js';

interface CliArgs {
	targetEnv: string | null;
	batchSize: number;
	dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = { targetEnv: null, batchSize: 200, dryRun: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--target-env') args.targetEnv = argv[++i] ?? null;
		else if (arg === '--batch-size') args.batchSize = parseInt(argv[++i] ?? '200', 10);
		else if (arg === '--dry-run') args.dryRun = true;
	}
	return args;
}

async function dryRun(batchSize: number) {
	let total = 0;
	let needs_backfill = 0;
	let already_encrypted = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let lastId: any = null;

	for (;;) {
		const filter = lastId ? { _id: { $gt: lastId } } : {};
		const docs = await FormSnapshots.find(filter as never, {
			projection: { payload_encrypted: 1, _id: 1 }
		})
			.sort({ _id: 1 })
			.limit(batchSize)
			.toArray();
		if (docs.length === 0) break;
		for (const d of docs) {
			total += 1;
			if (
				(d as { payload_encrypted?: unknown }).payload_encrypted !== null &&
				(d as { payload_encrypted?: unknown }).payload_encrypted !== undefined
			) {
				already_encrypted += 1;
			} else {
				needs_backfill += 1;
			}
		}
		lastId = docs[docs.length - 1]._id;
		if (docs.length < batchSize) break;
	}

	return { total, needs_backfill, already_encrypted };
}

function logBatch(b: {
	batch_n: number;
	read_count: number;
	encrypted_count: number;
	skipped_count: number;
	ms_elapsed: number;
}) {
	console.log(
		`  batch ${b.batch_n.toString().padStart(4)}: ` +
			`read=${b.read_count} encrypted=${b.encrypted_count} ` +
			`skipped=${b.skipped_count} (${b.ms_elapsed}ms)`
	);
}

function printSummary(r: BackfillCollectionResult) {
	console.log(`\n[formSnapshots] summary:`);
	console.log(`  read:      ${r.total_read}`);
	console.log(`  encrypted: ${r.total_encrypted}`);
	console.log(`  skipped:   ${r.total_skipped} (already-encrypted or missing payload)`);
	console.log(`  errors:    ${r.total_errors}`);
	console.log(`  batches:   ${r.batches.length}`);
	console.log(`  duration:  ${(r.duration_ms / 1000).toFixed(1)}s`);
	console.log(`  run_id:    ${r.run_id}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error('[sec2-backfill-snapshots] MONGODB_URI is not set');
		process.exit(1);
	}
	if (process.env.CSFLE_ENABLED !== 'true') {
		console.error(
			'[sec2-backfill-snapshots] CSFLE_ENABLED must be "true" — otherwise encryption passes through and backfill is a no-op'
		);
		process.exit(1);
	}
	const envName = process.env.BACKFILL_TARGET_ENV;
	if (!envName) {
		console.error(
			'[sec2-backfill-snapshots] BACKFILL_TARGET_ENV is not set. Set it to the env name you intend (e.g. "production") as a foot-shooting guard.'
		);
		process.exit(1);
	}
	if (args.targetEnv && args.targetEnv !== envName) {
		console.error(
			`[sec2-backfill-snapshots] --target-env=${args.targetEnv} does not match BACKFILL_TARGET_ENV=${envName}. Refusing to start.`
		);
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	console.log(`[sec2-backfill-snapshots] connected — target env: ${envName}`);

	const ranBy = `${os.hostname()}/${process.env.USER ?? process.env.USERNAME ?? 'unknown'}`;
	const runId = new Date().toISOString();

	if (args.dryRun) {
		console.log(`[sec2-backfill-snapshots] DRY RUN — no writes will be made\n`);
		const r = await dryRun(args.batchSize);
		console.log(`  total snapshots:     ${r.total}`);
		console.log(`  already encrypted:   ${r.already_encrypted}`);
		console.log(`  needs backfill:      ${r.needs_backfill}`);
		await client.close();
		console.log(`\n[sec2-backfill-snapshots] dry run complete`);
		return;
	}

	try {
		await ensureAuditIndex();
		console.log(`[sec2-backfill-snapshots] audit TTL index ensured\n`);

		console.log('[formSnapshots] starting...');
		const r = await backfillSnapshots(FormSnapshots, {
			ranBy,
			runId,
			batchSize: args.batchSize,
			onBatch: logBatch
		});
		printSummary(r);
	} finally {
		await client.close();
	}
}

main().catch((err) => {
	console.error('[sec2-backfill-snapshots] FAILED:', err);
	process.exit(1);
});
