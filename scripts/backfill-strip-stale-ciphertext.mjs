/**
 * Backfill: strip stale `payload_encrypted` from FormSnapshots rows where the
 * plaintext `payload` is present and parseable.
 * ────────────────────────────────────────────────────────────────────────────
 * Background (Pitfall #68, 2026-05-18 → 2026-06-01 incident):
 *   - CSFLE_ENABLED was true during that window with dual-write active —
 *     every FormSnapshot was written with BOTH plaintext payload and
 *     ciphertext payload_encrypted.
 *   - The master-key state became inconsistent (orphan DEKs in __keyVault).
 *   - CSFLE_ENABLED was unset on 2026-06-01 to restore login + read paths.
 *   - Result: rows from that window carry payload_encrypted ciphertext that
 *     no longer decrypts under the current master-key state. The plaintext
 *     payload is still the source of truth and intact.
 *
 * What this script does:
 *   For every FormSnapshots row where BOTH fields are set:
 *     1. Verify plaintext `payload` is a non-empty object.
 *     2. UNSET `payload_encrypted` (and `_pe_alg` if present — internal marker).
 *     3. Plaintext stays untouched.
 *
 * Skipped automatically:
 *   - Rows with no payload_encrypted (already clean).
 *   - Rows with no plaintext payload (DO NOT touch — these are the only
 *     surviving copy of the data, even if undecryptable for now).
 *   - Rows where plaintext payload is malformed (logged + skipped, manual
 *     review needed).
 *
 * Safety guarantees:
 *   - Preview-first by default. Pass --confirm to actually write.
 *   - Per-row try/catch — one bad row doesn't stop the run.
 *   - Idempotent — re-running is a no-op once a row is cleaned.
 *   - Read-then-update pattern uses _id (stable) so concurrent writes
 *     (unlikely on snapshots — they're immutable post-insert) can't race.
 *
 * Usage:
 *   Preview:  node scripts/backfill-strip-stale-ciphertext.mjs
 *   Apply:    node scripts/backfill-strip-stale-ciphertext.mjs --confirm
 *
 * Reads MONGODB_URI + MONGODB_DB_NAME from .env. The script targets
 * whatever environment .env points at — VERIFY before running with
 * --confirm against production.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

const CONFIRM = process.argv.includes('--confirm');
const COLLECTION = 'formSnapshots';

// ── Load env (mirrors the diagnose-csfle-state.mjs pattern) ────────────
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
console.log('  Stale-ciphertext stripper for formSnapshots');
console.log('═'.repeat(72));
console.log(`  Database  : ${MONGODB_DB_NAME}`);
// Node's WHATWG URL parser rejects multi-host mongodb:// URIs (Atlas
// replica-set form: host-00,host-01,host-02). Pull the first host segment
// with a regex so the header works for both srv and multi-host forms.
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
	const snapshots = db.collection(COLLECTION);

	// Pull only the fields we need to decide + identify the row.
	// Projection keeps memory + bandwidth bounded on large collections.
	const cursor = snapshots.find(
		{ payload_encrypted: { $exists: true, $ne: null } },
		{ projection: { _id: 1, case_id: 1, version: 1, payload: 1, payload_encrypted: 1 } }
	);

	let inspected = 0;
	let candidates = 0;
	let stripped = 0;
	let skippedNoPlaintext = 0;
	let skippedMalformed = 0;
	let errors = 0;

	for await (const doc of cursor) {
		inspected++;

		// Decision tree.
		const hasPlaintext =
			doc.payload &&
			typeof doc.payload === 'object' &&
			!Array.isArray(doc.payload) &&
			Object.keys(doc.payload).length > 0;

		if (!hasPlaintext) {
			skippedNoPlaintext++;
			console.log(
				`  ⏭  skip (no plaintext) ${doc.case_id}@v${doc.version} _id=${doc._id} — KEEP ciphertext as only copy`
			);
			continue;
		}

		// Defensive structural check — plaintext should look like a form payload.
		// Cheap heuristic: must have at least one of the known top-level fields.
		const KNOWN_TOP_LEVEL = ['loanType', 'loanTransaction', 'applicants', 'loanData'];
		const looksLikePayload = KNOWN_TOP_LEVEL.some((k) => k in doc.payload);
		if (!looksLikePayload) {
			skippedMalformed++;
			console.log(
				`  ⚠  skip (suspicious plaintext shape) ${doc.case_id}@v${doc.version} _id=${doc._id} — manual review`
			);
			continue;
		}

		candidates++;

		if (CONFIRM) {
			try {
				const res = await snapshots.updateOne(
					{ _id: doc._id },
					{ $unset: { payload_encrypted: '', _pe_alg: '' } }
				);
				if (res.modifiedCount === 1) {
					stripped++;
					console.log(
						`  ✅ stripped ${doc.case_id}@v${doc.version} _id=${doc._id}`
					);
				} else {
					console.log(
						`  ❓ no-modify ${doc.case_id}@v${doc.version} _id=${doc._id} (matched=${res.matchedCount})`
					);
				}
			} catch (err) {
				errors++;
				console.error(`  ❌ error on _id=${doc._id}:`, err.message);
			}
		} else {
			console.log(
				`  📋 would strip ${doc.case_id}@v${doc.version} _id=${doc._id} (plaintext is intact)`
			);
		}
	}

	console.log('');
	console.log('═'.repeat(72));
	console.log('  Summary');
	console.log('═'.repeat(72));
	console.log(`  Rows inspected (had payload_encrypted set)  : ${inspected}`);
	console.log(`  Candidates (plaintext present + structurally valid) : ${candidates}`);
	console.log(`  Skipped: no plaintext (kept ciphertext)     : ${skippedNoPlaintext}`);
	console.log(`  Skipped: suspicious plaintext shape         : ${skippedMalformed}`);
	if (CONFIRM) {
		console.log(`  Stripped (payload_encrypted removed)        : ${stripped}`);
		console.log(`  Errors                                       : ${errors}`);
	} else {
		console.log(`  (Preview only — no rows modified.)`);
		console.log(`  To apply: re-run with --confirm`);
	}
	console.log('═'.repeat(72));

	if (skippedNoPlaintext > 0) {
		console.log('');
		console.log('⚠️  Some rows have ciphertext as the ONLY copy of the data.');
		console.log(`   ${skippedNoPlaintext} row(s) skipped. These need separate handling:`);
		console.log('   - If they predate the dual-write window: legitimately encrypted-only.');
		console.log('   - If they were dual-write rows: plaintext field was unexpectedly dropped.');
		console.log('   Investigate before deciding their fate.');
	}
} finally {
	await client.close();
}
