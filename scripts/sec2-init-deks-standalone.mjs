/**
 * SEC-2 — Standalone DEK initializer (Node-runnable, no Vite/SvelteKit deps).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Variant of scripts/sec2-init-deks.ts that does not depend on the SvelteKit
 * `$env/dynamic/private` import — runnable directly via `node`. Created
 * 2026-05-19 because the original .ts script can only run inside the Vite
 * context, which made operator-side bootstrapping awkward.
 *
 * Behavior is identical: idempotent creation of the 10 CSFLE_KEYS entries
 * (mobile, email, pan, rm-official-email, name, aadhaar, dob, address, gst,
 * payload) in `encryption.__keyVault` using the local KMS CMK.
 *
 * Usage:
 *   node scripts/sec2-init-deks-standalone.mjs
 *
 * Required env vars (read from process.env — set via .env / .env.local before
 * invocation, or pass inline):
 *   - MONGODB_URI
 *   - CSFLE_ENABLED       (must equal 'true')
 *   - QE_LOCAL_MASTER_KEY (base64, decodes to exactly 96 bytes)
 *   - CSFLE_KEY_VAULT_NAMESPACE (optional, defaults to 'encryption.__keyVault')
 *
 * Safety: writes only to the key vault collection. Existing keys are skipped.
 * No PII is read or written. Safe to re-run.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

// ── Manual .env loader (no dotenv dep required) ──────────────────────────────
// Reads .env then .env.local; .env.local wins on conflict (matches Vite's order).
async function loadEnvFiles() {
	const root = resolve(process.cwd());
	const files = ['.env', '.env.local'];
	for (const f of files) {
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
			// Strip surrounding quotes if balanced
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			// .env first, .env.local overrides (this loop replays in order)
			process.env[key] = value;
		}
	}
}

// ── CSFLE key registry (mirror of src/lib/server/csfle/keys.ts) ──────────────
// Kept in sync manually with the canonical list — adding/removing keys there
// MUST be reflected here. The TS version is the source of truth for the app;
// this list exists only so this script can run without TS compilation.
const DETERMINISTIC = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
const RANDOM = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';

const CSFLE_KEYS = [
	{ keyAltName: 'mobile-key', purpose: 'Mobile numbers — login + duplicate-check' },
	{ keyAltName: 'email-key', purpose: 'Email addresses — login + duplicate-check' },
	{ keyAltName: 'pan-key', purpose: 'PAN numbers — duplicate-check' },
	{ keyAltName: 'rm-official-email-key', purpose: 'RM bank email — identity lookup' },
	{ keyAltName: 'name-key', purpose: 'Names across all collections' },
	{ keyAltName: 'aadhaar-key', purpose: 'Aadhaar numbers' },
	{ keyAltName: 'dob-key', purpose: 'Date of birth' },
	{ keyAltName: 'address-key', purpose: 'Addresses' },
	{ keyAltName: 'gst-key', purpose: 'GST numbers' },
	{ keyAltName: 'payload-key', purpose: 'formSnapshots.payload JSON blob' }
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	await loadEnvFiles();

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error('[sec2-init-deks] MONGODB_URI is not set — aborting');
		process.exit(1);
	}
	if (process.env.CSFLE_ENABLED !== 'true') {
		console.error('[sec2-init-deks] CSFLE_ENABLED is not "true" — aborting');
		process.exit(1);
	}
	const cmkBase64 = process.env.QE_LOCAL_MASTER_KEY;
	if (!cmkBase64) {
		console.error('[sec2-init-deks] QE_LOCAL_MASTER_KEY is not set — aborting');
		process.exit(1);
	}

	const cmk = Buffer.from(cmkBase64, 'base64');
	if (cmk.length !== 96) {
		console.error(
			`[sec2-init-deks] QE_LOCAL_MASTER_KEY decodes to ${cmk.length} bytes, expected 96 — aborting`
		);
		process.exit(1);
	}

	const keyVaultNamespace = process.env.CSFLE_KEY_VAULT_NAMESPACE || 'encryption.__keyVault';

	console.log(`[sec2-init-deks] connecting to MongoDB...`);
	const client = new MongoClient(uri);
	await client.connect();

	// Lazy-load ClientEncryption (requires the mongodb-client-encryption native
	// binding to be present at node_modules/mongodb-client-encryption/build).
	const { ClientEncryption } = await import('mongodb');
	const ce = new ClientEncryption(client, {
		keyVaultNamespace,
		kmsProviders: { local: { key: cmk } }
	});

	console.log(`[sec2-init-deks] key vault namespace: ${keyVaultNamespace}`);
	console.log(`[sec2-init-deks] checking ${CSFLE_KEYS.length} DEK(s)...`);

	const created = [];
	const alreadyExisted = [];

	for (const def of CSFLE_KEYS) {
		const existing = await ce.getKeyByAltName(def.keyAltName);
		if (existing) {
			alreadyExisted.push(def.keyAltName);
			console.log(`  [skip] ${def.keyAltName} — already exists`);
			continue;
		}
		await ce.createDataKey('local', { keyAltNames: [def.keyAltName] });
		created.push(def.keyAltName);
		console.log(`  [+]   ${def.keyAltName} — created (${def.purpose})`);
	}

	console.log('');
	console.log(`[sec2-init-deks] done.`);
	console.log(`  created:        ${created.length} (${created.join(', ') || '—'})`);
	console.log(`  already exists: ${alreadyExisted.length}`);

	await client.close();
	process.exit(0);
}

main().catch((err) => {
	console.error('[sec2-init-deks] fatal:', err);
	process.exit(1);
});
