/**
 * SEC-10 backfill: mark pre-SEC-10 Sessions rows with 'legacy' fingerprints.
 * ────────────────────────────────────────────────────────────────────────────
 * Background:
 *   The Sessions collection (E.3 — "Active devices" UI, shipped S206) has
 *   been writing one row per refresh-token issuance for months. Those rows
 *   carry user_agent / device_label / geo but NOT the SEC-10 fingerprint
 *   fields (device_fingerprint, browser_fingerprint, client_class).
 *
 *   Commit B's conflict-detection helper treats absent fingerprints as
 *   "can't decide → never conflicts" (defensive default so existing
 *   logged-in users don't get unexpectedly kicked when the feature flips).
 *
 *   For audit clarity we mark pre-SEC-10 rows with the literal 'legacy'
 *   string in each of the three new fields. Detection behavior is identical
 *   to "absent" (a real SHA-256 hash will never equal 'legacy'), but
 *   ops + admin dashboards can now distinguish "this user predated SEC-10"
 *   from "this user's client failed to compute fingerprints".
 *
 * What this script does:
 *   For every active Sessions row (revoked_at == null) missing
 *   device_fingerprint:
 *     1. $set device_fingerprint = 'legacy'
 *     2. $set browser_fingerprint = 'legacy'
 *     3. $set client_class = 'web'   (matches the only client surface
 *        that existed before MOB-1 — no Android logins pre-SEC-10)
 *
 * Skipped automatically:
 *   - Revoked rows (revoked_at != null) — already inactive, no audit value
 *     to marking them.
 *   - Rows that already have device_fingerprint set — idempotent.
 *
 * Safety guarantees:
 *   - Preview-first by default. Pass --confirm to actually write.
 *   - 3-second hold before --confirm writes so Ctrl-C still rescues you.
 *   - Idempotent — re-running is a no-op once a row is backfilled.
 *   - One bulk updateMany — fast and atomic per shard.
 *
 * Usage:
 *   Preview:  node scripts/sec10-backfill-session-fingerprints.mjs
 *   Apply:    node scripts/sec10-backfill-session-fingerprints.mjs --confirm
 *
 * Reads MONGODB_URI + MONGODB_DB_NAME from .env. The script targets
 * whatever environment .env points at — VERIFY before running with
 * --confirm against production.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §3.3
 * ADR : docs/adr/0028-single-session-enforcement.md
 * ────────────────────────────────────────────────────────────────────────────
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

const CONFIRM = process.argv.includes('--confirm');
const COLLECTION = 'Sessions';

// ── Load env (mirrors the backfill-strip-stale-ciphertext.mjs pattern) ─
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
	const envContent = await readFile(envPath, 'utf-8');
	for (const line of envContent.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
	console.error('FATAL: MONGODB_URI and MONGODB_DB_NAME must be set in .env');
	process.exit(1);
}

// ── Pretty header ──────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('  SEC-10 backfill: mark pre-SEC-10 Sessions rows as legacy');
console.log('═'.repeat(72));
console.log(`  Database  : ${MONGODB_DB_NAME}`);
// Node's WHATWG URL parser rejects multi-host mongodb:// URIs (Atlas
// replica-set form). Regex out the first host segment so the header
// works for both srv and multi-host forms.
const uriHostMatch = MONGODB_URI.match(/mongodb(?:\+srv)?:\/\/(?:[^@]+@)?([^/?,]+)/);
const uriHost = uriHostMatch ? uriHostMatch[1] : '<unparseable>';
console.log(`  URI host  : ${uriHost}`);
console.log(`  Mode      : ${CONFIRM ? '🔥 APPLY (will modify rows)' : '👁  PREVIEW (read-only)'}`);
console.log('═'.repeat(72));
console.log('');

if (CONFIRM) {
	console.log('⚠️  Running with --confirm. Will write to the database in 3 seconds...');
	console.log('   Press Ctrl-C now to abort.');
	await new Promise((r) => setTimeout(r, 3000));
	console.log('');
}

const client = new MongoClient(MONGODB_URI);

try {
	await client.connect();
	const db = client.db(MONGODB_DB_NAME);
	const sessions = db.collection(COLLECTION);

	// The selection filter: active rows that haven't been backfilled yet.
	// We use $exists on device_fingerprint as the idempotency key — a row
	// with the field set (to 'legacy' OR a real hash) is left untouched.
	const filter = {
		revoked_at: null,
		device_fingerprint: { $exists: false }
	};

	// Total active row count — useful context for the operator.
	const totalActive = await sessions.countDocuments({ revoked_at: null });
	const candidates = await sessions.countDocuments(filter);

	console.log(`  Total active rows           : ${totalActive}`);
	console.log(`  Already backfilled / fresh  : ${totalActive - candidates}`);
	console.log(`  Candidates to mark legacy   : ${candidates}`);
	console.log('');

	if (candidates === 0) {
		console.log('Nothing to do — every active Sessions row already has a fingerprint field.');
		await client.close();
		process.exit(0);
	}

	if (!CONFIRM) {
		console.log('PREVIEW only — no writes. Pass --confirm to apply the backfill.');
		console.log('');
		console.log(`Would $set on ${candidates} row(s):`);
		console.log('   device_fingerprint  = "legacy"');
		console.log('   browser_fingerprint = "legacy"');
		console.log('   client_class        = "web"');
		await client.close();
		process.exit(0);
	}

	// Apply. One bulk updateMany — fast + atomic per shard.
	const result = await sessions.updateMany(filter, {
		$set: {
			device_fingerprint: 'legacy',
			browser_fingerprint: 'legacy',
			client_class: 'web'
		}
	});

	console.log(`  Matched   : ${result.matchedCount}`);
	console.log(`  Modified  : ${result.modifiedCount}`);
	console.log('');
	console.log('✅ SEC-10 backfill complete.');
} catch (err) {
	console.error('FATAL: backfill failed', err);
	process.exit(1);
} finally {
	await client.close();
}
