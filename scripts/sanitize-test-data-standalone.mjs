/**
 * C.7 PR-2 — Standalone sanitize-test-data backfill (Node-runnable).
 * ════════════════════════════════════════════════════════════════════
 *
 * Variant of scripts/sanitize-test-data.ts that does not depend on the
 * SvelteKit `$lib/database/mongo` (which imports `$env/static/private`)
 * or `$lib/server/testEntityFilter` (which imports `$app/environment`).
 * Both unresolvable from a plain `node` / `tsx` context.
 *
 * Same pattern as scripts/sec2-init-deks-standalone.mjs — the .ts stays
 * as the type-checked declarative contract; this .mjs is the runnable
 * form. Behavior is identical:
 *
 *   1. LenderRuleArtifacts — lender_id ~ /^sample-/ OR
 *      artifact_id ~ /^sec5-r1-/ → set is_test:true
 *   2. RmLenderAssignments — lenderName matches isTestEntityName()
 *      → set is_test:true
 *   3. DsaApplications + rmApplications + AdminUsers — mobileNumber
 *      in E2E_TEST_MOBILE_NUMBERS → set is_test:true
 *   4. RMContacts — lender_name matches name patterns → LOG ONLY
 *
 * Usage:
 *   BACKFILL_TARGET_ENV=dev \
 *     node scripts/sanitize-test-data-standalone.mjs --target-env dev
 *
 *   # Commit on a single collection:
 *   ... node scripts/sanitize-test-data-standalone.mjs \
 *       --target-env dev --collection lenders --execute
 *
 *   # Commit everything (only after a clean dry-run):
 *   ... node scripts/sanitize-test-data-standalone.mjs \
 *       --target-env dev --collection all --execute
 *
 *   Collections: lenders | assignments | users | rmcontacts | all
 *   Default: dry-run on all collections.
 *
 * Required env vars (read from process.env or .env / .env.local):
 *   - MONGODB_URI
 *   - BACKFILL_TARGET_ENV   (must match --target-env)
 *
 * Safety: dry-run by default, idempotent, no deletes, target-env guard.
 * Reference: commit 543c445b body + scripts/sanitize-test-data.ts header.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

// ── Manual .env loader (no dotenv dep) ────────────────────────────────────
// Reads .env then .env.local; .env.local wins on conflict (matches Vite's
// order). Same loader as scripts/sec2-init-deks-standalone.mjs.
async function loadEnvFiles() {
	const root = resolve(process.cwd());
	for (const f of ['.env', '.env.local']) {
		const path = resolve(root, f);
		if (!existsSync(path)) continue;
		const text = await readFile(path, 'utf-8');
		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			const eq = line.indexOf('=');
			if (eq <= 0) continue;
			const key = line.slice(0, eq).trim();
			let value = line.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			process.env[key] = value;
		}
	}
}

// ── Test-entity predicates (mirror of src/lib/server/testEntityFilter.ts) ─
// Kept in sync manually with the canonical source — changes there MUST be
// reflected here. The TS version is the source of truth for the app; this
// duplication exists only so this script can run without SvelteKit aliases.
const TEST_NAME_PREFIXES = /^(sample |sec5-r1-test-|test |e2e )/i;
const TEST_NAME_SUBSTRINGS = /\bxyz bank\b|\btesting\b/i;
const E2E_TEST_MOBILE_NUMBERS = [9999900000, 9999900001, 9999900002];

function isTestEntityName(name) {
	if (!name) return false;
	const trimmed = String(name).trim();
	if (!trimmed) return false;
	if (TEST_NAME_PREFIXES.test(trimmed)) return true;
	if (TEST_NAME_SUBSTRINGS.test(trimmed)) return true;
	return false;
}

// ── CLI argument parsing ──────────────────────────────────────────────────

function parseArgs(argv) {
	const args = { collection: 'all', targetEnv: null, execute: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--collection') {
			const v = argv[++i] ?? '';
			if (!['lenders', 'assignments', 'users', 'rmcontacts', 'all'].includes(v)) {
				throw new Error(
					`Invalid --collection "${v}". Use: lenders | assignments | users | rmcontacts | all`
				);
			}
			args.collection = v;
		} else if (arg === '--target-env') {
			args.targetEnv = argv[++i] ?? null;
		} else if (arg === '--execute') {
			args.execute = true;
		} else if (arg === '--dry-run') {
			args.execute = false; // explicit default
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('--')) {
			throw new Error(`Unknown flag: ${arg}. Try --help.`);
		}
	}
	return args;
}

function printUsage() {
	console.log(`
Usage:
  node scripts/sanitize-test-data-standalone.mjs \\
    --target-env <name> \\
    [--collection lenders|assignments|users|rmcontacts|all] \\
    [--execute]

Defaults to --dry-run unless --execute is passed.
Set BACKFILL_TARGET_ENV in the environment to match --target-env.
`);
}

function validateTargetEnv(args) {
	const envName = process.env.BACKFILL_TARGET_ENV;
	if (!envName) {
		throw new Error(
			'BACKFILL_TARGET_ENV is not set. Set it to the same value as --target-env (e.g. "production") to confirm intent.'
		);
	}
	if (!args.targetEnv) {
		throw new Error('Missing --target-env <name>. Required to confirm intent.');
	}
	if (envName !== args.targetEnv) {
		throw new Error(
			`Mismatch — BACKFILL_TARGET_ENV="${envName}" but --target-env="${args.targetEnv}". Refusing to proceed.`
		);
	}
}

// ── Result aggregation ────────────────────────────────────────────────────

function logResult(r, execute) {
	const verb = execute ? 'Updated' : 'WOULD update';
	console.log(
		`  [${r.collection}] matched=${r.matched} ${verb}=${r.modified}` +
			(r.sampleNames.length ? `  sample: ${r.sampleNames.slice(0, 5).join(', ')}` : '')
	);
}

// ── Per-collection sanitizers ─────────────────────────────────────────────

async function sanitizeLenderArtifacts(db, execute) {
	const coll = db.collection('lenderRuleArtifacts');
	const filter = {
		is_test: { $ne: true },
		$or: [{ lender_id: /^sample-/i }, { artifact_id: /^sec5-r1-/i }]
	};
	const matches = await coll
		.find(filter, { projection: { lender_id: 1, artifact_id: 1 } })
		.toArray();
	const sampleNames = matches.slice(0, 5).map((m) => m.lender_id || m.artifact_id || '?');
	if (!execute) {
		return { collection: 'LenderRuleArtifacts', matched: matches.length, modified: 0, sampleNames };
	}
	const res = await coll.updateMany(filter, { $set: { is_test: true } });
	return {
		collection: 'LenderRuleArtifacts',
		matched: matches.length,
		modified: res.modifiedCount,
		sampleNames
	};
}

async function sanitizeRmAssignments(db, execute) {
	const coll = db.collection('rmLenderAssignments');
	const candidates = await coll
		.find({ is_test: { $ne: true } }, { projection: { _id: 1, lenderName: 1 } })
		.toArray();
	const flagged = candidates.filter((c) => isTestEntityName(c.lenderName));
	const sampleNames = flagged.slice(0, 5).map((c) => c.lenderName ?? '?');
	if (!execute || flagged.length === 0) {
		return {
			collection: 'RmLenderAssignments',
			matched: flagged.length,
			modified: 0,
			sampleNames
		};
	}
	const res = await coll.updateMany(
		{ _id: { $in: flagged.map((f) => f._id) } },
		{ $set: { is_test: true } }
	);
	return {
		collection: 'RmLenderAssignments',
		matched: flagged.length,
		modified: res.modifiedCount,
		sampleNames
	};
}

async function sanitizeUserCollection(db, collName, displayName, execute) {
	const coll = db.collection(collName);
	const filter = {
		is_test: { $ne: true },
		mobileNumber: { $in: E2E_TEST_MOBILE_NUMBERS }
	};
	const matches = await coll.find(filter, { projection: { mobileNumber: 1 } }).toArray();
	const sampleNames = matches.slice(0, 5).map((m) => String(m.mobileNumber ?? '?'));
	if (!execute) {
		return { collection: displayName, matched: matches.length, modified: 0, sampleNames };
	}
	const res = await coll.updateMany(filter, { $set: { is_test: true } });
	return {
		collection: displayName,
		matched: matches.length,
		modified: res.modifiedCount,
		sampleNames
	};
}

async function flagRmContactsForReview(db) {
	const coll = db.collection('rmContacts');
	const candidates = await coll
		.find({}, { projection: { _id: 1, lender_name: 1, contact_name: 1 } })
		.toArray();
	const flagged = candidates.filter((c) => isTestEntityName(c.lender_name));
	if (flagged.length > 0) {
		console.log(`\n[RMContacts] ${flagged.length} rows flagged for HUMAN review:`);
		for (const c of flagged) {
			console.log(
				`  _id=${c._id}  lender_name="${c.lender_name}"  contact_name="${c.contact_name ?? ''}"`
			);
		}
		console.log(
			'  No automatic mutation. Decide per-row whether to soft-deactivate (is_active=false) via the admin UI.'
		);
	}
	return {
		collection: 'RMContacts',
		matched: flagged.length,
		modified: 0,
		sampleNames: flagged.slice(0, 5).map((c) => c.lender_name ?? '?')
	};
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
	await loadEnvFiles();
	const args = parseArgs(process.argv.slice(2));
	validateTargetEnv(args);

	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) throw new Error('MONGODB_URI is not set.');

	const mode = args.execute ? 'EXECUTE (will write)' : 'DRY-RUN (no writes)';
	console.log(`\n── sanitize-test-data (standalone) ──`);
	console.log(`  target-env: ${args.targetEnv}`);
	console.log(`  collection: ${args.collection}`);
	console.log(`  mode:       ${mode}\n`);

	const client = new MongoClient(mongoUri);
	await client.connect();
	try {
		// The app uses the default "test" DB selected by URI; mongo.ts derives it
		// via `client.db()` with no name, which honors the URI's path. Mirror that.
		const db = client.db();
		const results = [];
		const want = (c) => args.collection === 'all' || args.collection === c;

		if (want('lenders')) {
			results.push(await sanitizeLenderArtifacts(db, args.execute));
			logResult(results[results.length - 1], args.execute);
		}
		if (want('assignments')) {
			results.push(await sanitizeRmAssignments(db, args.execute));
			logResult(results[results.length - 1], args.execute);
		}
		if (want('users')) {
			for (const [collName, displayName] of [
				['DsaApplications', 'DsaApplications'],
				['rmApplications', 'rmApplications'],
				['adminUsers', 'AdminUsers']
			]) {
				results.push(await sanitizeUserCollection(db, collName, displayName, args.execute));
				logResult(results[results.length - 1], args.execute);
			}
		}
		if (want('rmcontacts')) {
			results.push(await flagRmContactsForReview(db));
			logResult(results[results.length - 1], false);
		}

		const totalMatched = results.reduce((s, r) => s + r.matched, 0);
		const totalModified = results.reduce((s, r) => s + r.modified, 0);
		console.log(`\n── summary ──`);
		console.log(`  total matched:  ${totalMatched}`);
		console.log(`  total modified: ${totalModified}`);
		if (!args.execute && totalMatched > 0) {
			console.log(`\n  Dry-run only. Re-run with --execute to commit.`);
		}
	} finally {
		await client.close();
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('\n[sanitize-test-data-standalone] FAILED:', err);
		process.exit(1);
	});
