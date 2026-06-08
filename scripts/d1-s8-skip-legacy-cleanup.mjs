#!/usr/bin/env node
/**
 * D.1 S8 (skipped) — legacy-data cleanup script
 * ══════════════════════════════════════════════════════════════════════
 * One-time idempotent cleanup. Operator runs this once per environment
 * (dev, staging, prod) after the code-side cleanup lands. Re-running is
 * a no-op once it has executed cleanly.
 *
 * What it does:
 *   1. `$unset` the legacy `subscription` field on every DsaApplications
 *      doc that still has it. (The field was the source of truth for the
 *      old one-time-pay model — now replaced by `BillingSubscriptions`.)
 *   2. Stamp `archived_at: <now>` on every BillingTransactions row that is
 *      `kind: 'legacy_one_time'` OR has no `kind` field at all (pre-D.1
 *      rows). Rows are retained on disk for 6-year audit compliance but
 *      filtered out of the new transactions UI.
 *
 * Required env vars (read from .env):
 *   MONGODB_URI  — full Mongo connection string
 *
 * Flags:
 *   --dry-run    — print counts without writing
 *
 * Usage:
 *   node scripts/d1-s8-skip-legacy-cleanup.mjs --dry-run     # preview
 *   node scripts/d1-s8-skip-legacy-cleanup.mjs               # execute
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S8 (skipped, 2026-05-28)
 * ══════════════════════════════════════════════════════════════════════
 */

import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';

// ── Args ───────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');

// ── .env loader (single quote / double quote / no quote) ───────────────
if (existsSync('.env')) {
	const envText = readFileSync('.env', 'utf-8');
	for (const line of envText.split(/\r?\n/)) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) {
			process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
		}
	}
}

if (!process.env.MONGODB_URI) {
	console.error('❌ MONGODB_URI not set in environment or .env');
	process.exit(1);
}

// ── Banner ─────────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log(`D.1 S8 (skipped) — legacy cleanup  ${DRY_RUN ? '[DRY RUN]' : '[EXECUTE]'}`);
console.log('═'.repeat(72));

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
const now = new Date();

try {
	// ── 1) DsaApplications.subscription → $unset ──────────────────────
	const dsaCol = db.collection('dsaApplications');
	const subscriptionMatchCount = await dsaCol.countDocuments({
		subscription: { $exists: true }
	});
	console.log(`\n[1/2] DsaApplications with .subscription field: ${subscriptionMatchCount}`);

	if (subscriptionMatchCount > 0 && !DRY_RUN) {
		const unsetResult = await dsaCol.updateMany(
			{ subscription: { $exists: true } },
			{ $unset: { subscription: '' } }
		);
		console.log(`      → unset on ${unsetResult.modifiedCount} doc(s)`);
	} else if (DRY_RUN) {
		console.log(`      → would $unset on ${subscriptionMatchCount} doc(s)`);
	} else {
		console.log('      → nothing to do');
	}

	// ── 2) BillingTransactions legacy → $set archived_at ─────────────
	// Match: rows with `kind: 'legacy_one_time'` OR rows that have no
	// `kind` field at all (the original pre-D.1 schema didn't have one).
	// Skip rows already stamped to keep the script idempotent.
	const txCol = db.collection('billingTransactions');
	const legacyFilter = {
		$and: [
			{ archived_at: { $exists: false } },
			{
				$or: [
					{ kind: 'legacy_one_time' },
					{ kind: { $exists: false } }
				]
			}
		]
	};
	const legacyMatchCount = await txCol.countDocuments(legacyFilter);
	console.log(`\n[2/2] BillingTransactions legacy rows un-archived: ${legacyMatchCount}`);

	if (legacyMatchCount > 0 && !DRY_RUN) {
		const stampResult = await txCol.updateMany(legacyFilter, {
			$set: { archived_at: now }
		});
		console.log(`      → archived_at stamped on ${stampResult.modifiedCount} row(s)`);
	} else if (DRY_RUN) {
		console.log(`      → would stamp archived_at on ${legacyMatchCount} row(s)`);
	} else {
		console.log('      → nothing to do');
	}

	console.log('\n═'.repeat(36));
	console.log(DRY_RUN ? '✅ Dry run complete — no writes made.' : '✅ Cleanup complete.');
	console.log('═'.repeat(36));
} catch (err) {
	console.error('\n❌ Cleanup failed:', err);
	process.exitCode = 1;
} finally {
	await client.close();
}
