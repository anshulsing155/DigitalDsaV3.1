/**
 * SEC-2 Phase C.1 — User-collection backfill CLI.
 *
 * Convert plaintext PII to ciphertext across the four user collections
 * that Phase B targets. Idempotent — safe to re-run after a crash or
 * partial completion. Each run is operator-launched, not on a cron.
 *
 * Pre-requisites (will refuse to start if any is missing):
 *   1. `CSFLE_ENABLED=true` — encryption must be active, otherwise the
 *      per-row encrypt would passthrough and the script would no-op silently.
 *   2. `QE_LOCAL_MASTER_KEY` — base64 CMK already wired in the environment.
 *   3. `MONGODB_URI` — pointing at the target Atlas environment.
 *   4. `BACKFILL_TARGET_ENV` — explicit name matching what you intend
 *      (e.g. `production`, `preview`, `dev`). This is a foot-shooting guard:
 *      if you run with the wrong MONGODB_URI by accident, the env name
 *      mismatch will force you to confirm before any write happens. Pass
 *      `--target-env <name>` on the CLI to compare against this var.
 *   5. DEKs must already exist in `encryption.__keyVault` — run
 *      `scripts/sec2-init-deks.ts` first.
 *
 * Usage:
 *   CSFLE_ENABLED=true \
 *   QE_LOCAL_MASTER_KEY=<base64> \
 *   MONGODB_URI=<uri> \
 *   BACKFILL_TARGET_ENV=production \
 *     pnpm tsx scripts/sec2-backfill-users.ts \
 *       --collection <Applicant|DsaApplications|rmApplications|AdminUsers|all> \
 *       --target-env production \
 *       [--batch-size 500] \
 *       [--dry-run]
 *
 * The `--dry-run` flag walks every row and reports what WOULD be
 * encrypted, without writing. Useful before the real run on production
 * to confirm row counts and per-collection coverage.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §3.6 Operator runbook.
 */

import { MongoClient } from 'mongodb';
import os from 'node:os';
import {
	Applicant,
	DsaApplications,
	rmApplications,
	AdminUsers
} from '../src/lib/database/mongo.js';
import {
	backfillCollection,
	ensureAuditIndex,
	listBackfillableFields,
	type BackfillCollectionResult
} from '../src/lib/server/csfle/index.js';

// ── CLI argument parsing ──────────────────────────────────────────

interface CliArgs {
	collection: string;
	targetEnv: string | null;
	batchSize: number;
	dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		collection: '',
		targetEnv: null,
		batchSize: 500,
		dryRun: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--collection') {
			args.collection = argv[++i] ?? '';
		} else if (arg === '--target-env') {
			args.targetEnv = argv[++i] ?? null;
		} else if (arg === '--batch-size') {
			args.batchSize = parseInt(argv[++i] ?? '500', 10);
		} else if (arg === '--dry-run') {
			args.dryRun = true;
		}
	}

	return args;
}

// ── Collection registry ──────────────────────────────────────────

const COLLECTIONS = {
	Applicant: Applicant,
	DsaApplications: DsaApplications,
	rmApplications: rmApplications,
	AdminUsers: AdminUsers
};

// ── Dry-run walker ──────────────────────────────────────────────
// Walks the collection without writing — counts how many rows have
// plaintext PII fields that WOULD be converted on a real run. Useful
// before production runs to confirm scope.

async function dryRun(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	collection: any,
	name: string,
	batchSize: number
): Promise<{ total: number; needs_backfill: number; sample_fields: string[] }> {
	let total = 0;
	let needs_backfill = 0;
	const fieldHits = new Set<string>();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let lastId: any = null;

	for (;;) {
		const filter = lastId ? { _id: { $gt: lastId } } : {};
		const docs = await collection.find(filter).sort({ _id: 1 }).limit(batchSize).toArray();
		if (docs.length === 0) break;

		for (const doc of docs) {
			total += 1;
			const fields = listBackfillableFields(doc);
			if (fields.length > 0) {
				needs_backfill += 1;
				for (const f of fields) fieldHits.add(f);
			}
		}

		lastId = docs[docs.length - 1]._id;
		if (docs.length < batchSize) break;
	}

	return {
		total,
		needs_backfill,
		sample_fields: [...fieldHits].sort()
	};
}

// ── Pretty printer ──────────────────────────────────────────────

function logBatch(name: string) {
	return (b: { batch_n: number; read_count: number; encrypted_count: number; skipped_count: number; ms_elapsed: number }) => {
		console.log(
			`  [${name}] batch ${b.batch_n.toString().padStart(4)}: ` +
				`read=${b.read_count} encrypted=${b.encrypted_count} ` +
				`skipped=${b.skipped_count} (${b.ms_elapsed}ms)`
		);
	};
}

function printSummary(r: BackfillCollectionResult) {
	console.log(`\n[${r.collection}] summary:`);
	console.log(`  read:      ${r.total_read}`);
	console.log(`  encrypted: ${r.total_encrypted}`);
	console.log(`  skipped:   ${r.total_skipped} (already-encrypted or no PII)`);
	console.log(`  errors:    ${r.total_errors}`);
	console.log(`  batches:   ${r.batches.length}`);
	console.log(`  duration:  ${(r.duration_ms / 1000).toFixed(1)}s`);
	console.log(`  run_id:    ${r.run_id}`);
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
	const args = parseArgs(process.argv.slice(2));

	// Pre-flight guards.
	if (!args.collection) {
		console.error('[sec2-backfill] --collection is required (or "all")');
		process.exit(1);
	}
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error('[sec2-backfill] MONGODB_URI is not set');
		process.exit(1);
	}
	if (process.env.CSFLE_ENABLED !== 'true') {
		console.error(
			'[sec2-backfill] CSFLE_ENABLED must be "true" — without it, encryption passes through and the backfill is a no-op'
		);
		process.exit(1);
	}
	const envName = process.env.BACKFILL_TARGET_ENV;
	if (!envName) {
		console.error(
			'[sec2-backfill] BACKFILL_TARGET_ENV is not set. Set it to the env name you intend (e.g. "production") as a foot-shooting guard.'
		);
		process.exit(1);
	}
	if (args.targetEnv && args.targetEnv !== envName) {
		console.error(
			`[sec2-backfill] --target-env=${args.targetEnv} does not match BACKFILL_TARGET_ENV=${envName}. Refusing to start.`
		);
		process.exit(1);
	}

	// Resolve which collections to walk.
	const requested = args.collection === 'all' ? Object.keys(COLLECTIONS) : [args.collection];
	const unknown = requested.filter((c) => !(c in COLLECTIONS));
	if (unknown.length > 0) {
		console.error(`[sec2-backfill] unknown collection(s): ${unknown.join(', ')}`);
		console.error(`  known: ${Object.keys(COLLECTIONS).join(', ')}`);
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	console.log(`[sec2-backfill] connected — target env: ${envName}`);

	const ranBy = `${os.hostname()}/${process.env.USER ?? process.env.USERNAME ?? 'unknown'}`;
	const runId = new Date().toISOString();

	if (args.dryRun) {
		console.log(`[sec2-backfill] DRY RUN — no writes will be made\n`);
		for (const name of requested) {
			const coll = COLLECTIONS[name as keyof typeof COLLECTIONS];
			console.log(`[${name}] scanning...`);
			const r = await dryRun(coll, name, args.batchSize);
			console.log(`  total rows:       ${r.total}`);
			console.log(`  needs backfill:   ${r.needs_backfill}`);
			console.log(`  fields touched:   ${r.sample_fields.join(', ') || '(none)'}`);
		}
		await client.close();
		console.log(`\n[sec2-backfill] dry run complete`);
		return;
	}

	// Real run.
	try {
		await ensureAuditIndex();
		console.log(`[sec2-backfill] audit TTL index ensured\n`);

		const results: BackfillCollectionResult[] = [];
		for (const name of requested) {
			const coll = COLLECTIONS[name as keyof typeof COLLECTIONS];
			console.log(`[${name}] starting...`);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const r = await backfillCollection(coll as any, name, {
				ranBy,
				runId,
				batchSize: args.batchSize,
				onBatch: logBatch(name)
			});
			printSummary(r);
			results.push(r);
		}

		console.log(`\n[sec2-backfill] all collections complete`);
		console.log(
			`  grand total: read=${results.reduce((s, r) => s + r.total_read, 0)} ` +
				`encrypted=${results.reduce((s, r) => s + r.total_encrypted, 0)} ` +
				`skipped=${results.reduce((s, r) => s + r.total_skipped, 0)} ` +
				`errors=${results.reduce((s, r) => s + r.total_errors, 0)}`
		);
	} finally {
		await client.close();
	}
}

main().catch((err) => {
	console.error('[sec2-backfill] FAILED:', err);
	process.exit(1);
});
