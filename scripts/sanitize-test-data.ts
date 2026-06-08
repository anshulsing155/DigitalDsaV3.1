/**
 * C.7 PR-2 — Sanitize test data across collections that don't carry an
 * `is_test` marker yet.
 *
 * Background
 * ──────────
 * C.7 PR-1 (commit `25ecf442`) shipped the standing filter
 * (`PROD_ENTITY_FILTER`) and the name-pattern predicate
 * (`isTestEntityName`). New rows created after PR-1 are marked
 * correctly:
 *   - /api/test/e2e-auth stamps `is_test: true` at upsert time
 *   - Future test-named lenders would be flagged at write time
 *
 * But HISTORICAL rows pre-date the marker. The standing filter falls
 * back to `is_test: { $in: [false, null] }` so those rows still pass
 * through the filter (correct behaviour — we can't auto-classify them
 * at read time). This script does the one-shot backfill so PR-1's
 * filter becomes belt-and-suspenders instead of relying solely on the
 * `isTestEntityName()` render-boundary fallback.
 *
 * What it touches
 * ──────────────
 *   1. LenderRuleArtifacts — `lender_id` matches `/^sample-/` OR
 *      `artifact_id` matches `/^sec5-r1-/`. Sets `is_test: true`.
 *   2. RmLenderAssignments — `lenderName` matches TEST_NAME_PREFIXES
 *      from `src/lib/server/testEntityFilter.ts`. Sets `is_test: true`.
 *   3. DsaApplications + rmApplications + AdminUsers — `mobileNumber`
 *      in `E2E_TEST_MOBILE_NUMBERS`. Sets `is_test: true`.
 *   4. RMContacts — `lender_name` matches name patterns. NEVER mutates.
 *      Logs rows for human review. These are real user submissions
 *      (someone typed "xyz bank") and need judgment, not automation.
 *
 * Safety model
 * ────────────
 *   - **Dry-run by default.** Walks every row and reports what WOULD
 *     change. Only commits when `--execute` is passed explicitly.
 *   - **Target-env guard.** Refuses to run unless `--target-env <name>`
 *     matches `BACKFILL_TARGET_ENV` from the environment. Stops you
 *     from running prod intent against a dev MongoDB by accident.
 *   - **Idempotent.** Every filter excludes rows where `is_test` is
 *     already true. Re-runs after a crash or partial completion only
 *     touch the rows that were missed.
 *   - **No deletes.** Soft-flag via `is_test: true`. The standing
 *     filter hides them in prod surfaces; dev still sees them.
 *
 * Usage
 * ─────
 *   # Dry run (default — required first step):
 *   BACKFILL_TARGET_ENV=production \
 *   MONGODB_URI=<uri> \
 *     pnpm tsx scripts/sanitize-test-data.ts --target-env production
 *
 *   # Commit on a single collection:
 *   ... pnpm tsx scripts/sanitize-test-data.ts \
 *       --target-env production --collection lenders --execute
 *
 *   # Commit everything (use only after a clean dry-run):
 *   ... pnpm tsx scripts/sanitize-test-data.ts \
 *       --target-env production --collection all --execute
 *
 *   Collections: lenders | assignments | users | rmcontacts | all
 *
 * Reference: commit `25ecf442` body §"Deferred to follow-up PR-2".
 */

import {
	LenderRuleArtifacts,
	RmLenderAssignments,
	RMContacts,
	DsaApplications,
	rmApplications,
	AdminUsers
} from '../src/lib/database/mongo.js';
import {
	E2E_TEST_MOBILE_NUMBERS,
	isTestEntityName
} from '../src/lib/server/testEntityFilter.js';

// ── CLI argument parsing ──────────────────────────────────────────

type Collection = 'lenders' | 'assignments' | 'users' | 'rmcontacts' | 'all';

interface CliArgs {
	collection: Collection;
	targetEnv: string | null;
	execute: boolean;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		collection: 'all',
		targetEnv: null,
		execute: false
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--collection') {
			const v = argv[++i] ?? '';
			if (!['lenders', 'assignments', 'users', 'rmcontacts', 'all'].includes(v)) {
				throw new Error(
					`Invalid --collection "${v}". Use: lenders | assignments | users | rmcontacts | all`
				);
			}
			args.collection = v as Collection;
		} else if (arg === '--target-env') {
			args.targetEnv = argv[++i] ?? null;
		} else if (arg === '--execute') {
			args.execute = true;
		} else if (arg === '--dry-run') {
			// No-op: dry-run is the default. Accepted for explicitness.
			args.execute = false;
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('--')) {
			throw new Error(`Unknown flag: ${arg}. Try --help.`);
		}
	}
	return args;
}

function printUsage(): void {
	console.log(`
Usage:
  pnpm tsx scripts/sanitize-test-data.ts \\
    --target-env <name> \\
    [--collection lenders|assignments|users|rmcontacts|all] \\
    [--execute]

Defaults to --dry-run unless --execute is passed.
Set BACKFILL_TARGET_ENV in the environment to match --target-env.
`);
}

// ── Foot-shooting guard ───────────────────────────────────────────

function validateTargetEnv(args: CliArgs): void {
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

// ── Result aggregation ────────────────────────────────────────────

interface SanitizeResult {
	collection: string;
	matched: number;
	modified: number;
	sampleNames: string[];
}

function logResult(r: SanitizeResult, execute: boolean): void {
	const verb = execute ? 'Updated' : 'WOULD update';
	console.log(
		`  [${r.collection}] matched=${r.matched} ${verb}=${r.modified}` +
			(r.sampleNames.length ? `  sample: ${r.sampleNames.slice(0, 5).join(', ')}` : '')
	);
}

// ── Per-collection sanitizers ─────────────────────────────────────

/**
 * 1. LenderRuleArtifacts — sample-* lender_ids and sec5-r1-* artifacts.
 * The hardcoded SAMPLE_PVT/GOV/NBFC docs were leaking into evaluations
 * pre-PR-1; SEC-5 R1 seed left "sec5-r1-test-*" rows behind.
 */
async function sanitizeLenderArtifacts(execute: boolean): Promise<SanitizeResult> {
	const filter = {
		is_test: { $ne: true },
		$or: [{ lender_id: /^sample-/i }, { artifact_id: /^sec5-r1-/i }]
	};
	const matches = await LenderRuleArtifacts.find(filter, {
		projection: { lender_id: 1, artifact_id: 1 }
	}).toArray();
	const sampleNames = matches.slice(0, 5).map((m) => m.lender_id || m.artifact_id || '?');
	if (!execute) {
		return {
			collection: 'LenderRuleArtifacts',
			matched: matches.length,
			modified: 0,
			sampleNames
		};
	}
	const res = await LenderRuleArtifacts.updateMany(filter, { $set: { is_test: true } });
	return {
		collection: 'LenderRuleArtifacts',
		matched: matches.length,
		modified: res.modifiedCount,
		sampleNames
	};
}

/**
 * 2. RmLenderAssignments — lenderName matches TEST_NAME_PREFIXES /
 * TEST_NAME_SUBSTRINGS via the shared predicate. Walks rows in memory
 * because the predicate combines two regexes; a single Mongo $regex
 * would diverge from `isTestEntityName()` and create a future
 * maintenance trap.
 */
async function sanitizeRmAssignments(execute: boolean): Promise<SanitizeResult> {
	const candidates = await RmLenderAssignments.find(
		{ is_test: { $ne: true } },
		{ projection: { _id: 1, lenderName: 1 } }
	).toArray();
	const flagged = candidates.filter((c) => isTestEntityName(c.lenderName));
	const sampleNames = flagged.slice(0, 5).map((c) => c.lenderName ?? '?');
	if (!execute) {
		return {
			collection: 'RmLenderAssignments',
			matched: flagged.length,
			modified: 0,
			sampleNames
		};
	}
	if (flagged.length === 0) {
		return { collection: 'RmLenderAssignments', matched: 0, modified: 0, sampleNames };
	}
	const res = await RmLenderAssignments.updateMany(
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

/**
 * 3. User collections — mobileNumber in E2E_TEST_MOBILE_NUMBERS.
 * /api/test/e2e-auth started stamping is_test:true in PR-1; this
 * catches rows the dev-only endpoint created before PR-1 landed.
 */
async function sanitizeUserCollection(
	name: string,
	coll: typeof DsaApplications | typeof rmApplications | typeof AdminUsers,
	execute: boolean
): Promise<SanitizeResult> {
	const filter = {
		is_test: { $ne: true },
		mobileNumber: { $in: E2E_TEST_MOBILE_NUMBERS as unknown as number[] }
	};
	const matches = await coll
		.find(filter, { projection: { mobileNumber: 1 } as Record<string, 1> })
		.toArray();
	const sampleNames = matches.slice(0, 5).map((m) => String(m.mobileNumber ?? '?'));
	if (!execute) {
		return { collection: name, matched: matches.length, modified: 0, sampleNames };
	}
	const res = await coll.updateMany(filter, { $set: { is_test: true } });
	return { collection: name, matched: matches.length, modified: res.modifiedCount, sampleNames };
}

/**
 * 4. RMContacts — read-only flag-for-review. RMContact rows are
 * crowdsourced user submissions; "xyz bank" / "testing" could be
 * test noise OR a real (sloppy) DSA submission. We list them so a
 * human can decide whether to soft-deactivate (`is_active: false`)
 * — never auto-flip.
 */
async function flagRmContactsForReview(): Promise<SanitizeResult> {
	const candidates = await RMContacts.find(
		{},
		{ projection: { _id: 1, lender_name: 1, contact_name: 1 } }
	).toArray();
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

// ── Main ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	validateTargetEnv(args);

	const mode = args.execute ? 'EXECUTE (will write)' : 'DRY-RUN (no writes)';
	console.log(`\n── sanitize-test-data ──`);
	console.log(`  target-env: ${args.targetEnv}`);
	console.log(`  collection: ${args.collection}`);
	console.log(`  mode:       ${mode}\n`);

	const results: SanitizeResult[] = [];
	const want = (c: Collection) => args.collection === 'all' || args.collection === c;

	if (want('lenders')) {
		results.push(await sanitizeLenderArtifacts(args.execute));
		logResult(results[results.length - 1]!, args.execute);
	}
	if (want('assignments')) {
		results.push(await sanitizeRmAssignments(args.execute));
		logResult(results[results.length - 1]!, args.execute);
	}
	if (want('users')) {
		for (const [name, coll] of [
			['DsaApplications', DsaApplications],
			['rmApplications', rmApplications],
			['AdminUsers', AdminUsers]
		] as const) {
			results.push(await sanitizeUserCollection(name, coll, args.execute));
			logResult(results[results.length - 1]!, args.execute);
		}
	}
	if (want('rmcontacts')) {
		results.push(await flagRmContactsForReview());
		logResult(results[results.length - 1]!, false);
	}

	// ── Summary ───────────────────────────────────────────────
	const totalMatched = results.reduce((s, r) => s + r.matched, 0);
	const totalModified = results.reduce((s, r) => s + r.modified, 0);
	console.log(`\n── summary ──`);
	console.log(`  total matched:  ${totalMatched}`);
	console.log(`  total modified: ${totalModified}`);
	if (!args.execute && totalMatched > 0) {
		console.log(`\n  Dry-run only. Re-run with --execute to commit.`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('\n[sanitize-test-data] FAILED:', err);
		process.exit(1);
	});
