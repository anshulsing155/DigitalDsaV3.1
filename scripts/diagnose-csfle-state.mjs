/**
 * READ-ONLY CSFLE state diagnostic.
 * ────────────────────────────────────────────────────────────────────────
 * Inspects the production key vault + a sample dsaApplications row to
 * triangulate the root cause of the MongoCryptError HMAC validation
 * failure on /api/auth/detect-roles.
 *
 * Prints SHAPE/TYPE info only — no PII values. Safe to run.
 *
 * Usage: node scripts/diagnose-csfle-state.mjs
 *
 * Reads MONGODB_URI + MONGODB_DB_NAME from .env (which currently points
 * at production Atlas).
 * ────────────────────────────────────────────────────────────────────────
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient, Binary } from 'mongodb';

async function loadEnv() {
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

function typeOf(v) {
	if (v === null) return 'null';
	if (v === undefined) return 'undefined';
	if (v instanceof Binary) return `Binary(subtype=${v.sub_type}, length=${v.length()})`;
	if (v instanceof Date) return `Date(${v.toISOString()})`;
	if (Array.isArray(v)) return `Array(length=${v.length})`;
	if (typeof v === 'string') return `string(length=${v.length})`;
	if (typeof v === 'number') return `number`;
	if (typeof v === 'boolean') return `boolean`;
	if (typeof v === 'object') return `object(keys=${Object.keys(v).length})`;
	return typeof v;
}

async function main() {
	await loadEnv();

	const uri = process.env.MONGODB_URI;
	const dbName = process.env.MONGODB_DB_NAME || 'digitaldsa';
	if (!uri) {
		console.error('FATAL: MONGODB_URI not set');
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	console.log(`Connected to ${uri.replace(/:\/\/[^@]+@/, '://<creds>@').split('?')[0]}`);
	console.log(`Primary db: ${dbName}\n`);

	// ── 1. Key vault inspection ─────────────────────────────────────────
	console.log('═══ 1. encryption.__keyVault ═══');
	const keyVault = client.db('encryption').collection('__keyVault');
	const deks = await keyVault.find({}, {
		projection: { keyAltNames: 1, masterKey: 1, creationDate: 1, updateDate: 1, status: 1 }
	}).toArray();
	console.log(`DEK count: ${deks.length}`);
	for (const d of deks) {
		console.log(`  - keyAltNames: ${JSON.stringify(d.keyAltNames)}`);
		console.log(`    masterKey:   ${JSON.stringify(d.masterKey)}`);
		console.log(`    creationDate: ${d.creationDate?.toISOString?.() ?? d.creationDate}`);
		if (d.updateDate && d.updateDate.getTime?.() !== d.creationDate?.getTime?.()) {
			console.log(`    updateDate:  ${d.updateDate?.toISOString?.() ?? d.updateDate}`);
		}
	}
	console.log();

	// ── 2. Sample DsaApplications row shape ─────────────────────────────
	console.log('═══ 2. Sample DsaApplications row (one doc) ═══');
	const db = client.db(dbName);
	const sampleDsa = await db.collection('DsaApplications').findOne(
		{},
		{
			projection: {
				_id: 1,
				mobileNumber: 1,
				name: 1,
				firstName: 1,
				lastName: 1,
				email: 1,
				panNumber: 1,
				aadhaarNumber: 1,
				createdAt: 1
			}
		}
	);
	if (!sampleDsa) {
		console.log('  (no DsaApplications docs found)');
	} else {
		console.log(`  _id: ${sampleDsa._id}`);
		console.log(`  createdAt:     ${typeOf(sampleDsa.createdAt)}`);
		console.log(`  mobileNumber:  ${typeOf(sampleDsa.mobileNumber)}`);
		console.log(`  name:          ${typeOf(sampleDsa.name)}`);
		console.log(`  firstName:     ${typeOf(sampleDsa.firstName)}`);
		console.log(`  lastName:      ${typeOf(sampleDsa.lastName)}`);
		console.log(`  email:         ${typeOf(sampleDsa.email)}`);
		console.log(`  panNumber:     ${typeOf(sampleDsa.panNumber)}`);
		console.log(`  aadhaarNumber: ${typeOf(sampleDsa.aadhaarNumber)}`);
	}
	console.log();

	// ── 3. mobileNumber type distribution across all 4 auth collections ─
	console.log('═══ 3. mobileNumber type distribution (all 4 auth collections) ═══');
	for (const coll of ['userApplications', 'DsaApplications', 'rmApplications', 'adminUsers']) {
		const c = db.collection(coll);
		const total = await c.countDocuments({});
		const asString = await c.countDocuments({ mobileNumber: { $type: 'string' } });
		const asLong = await c.countDocuments({ mobileNumber: { $type: 'long' } });
		const asInt = await c.countDocuments({ mobileNumber: { $type: 'int' } });
		const asDouble = await c.countDocuments({ mobileNumber: { $type: 'double' } });
		const asBin = await c.countDocuments({ mobileNumber: { $type: 'binData' } });
		console.log(
			`  ${coll}: total=${total}, string=${asString}, long=${asLong}, int=${asInt}, double=${asDouble}, binData=${asBin}${asBin > 0 ? '  ← ENCRYPTED' : ''}`
		);
	}
	console.log();

	// ── 4. Check whether the dev/owner mobile exists in any collection ──
	// Lookup uses both string and number forms (legacy mixed-type rows).
	console.log('═══ 4. Lookup for mobile 9811556664 (your login mobile) ═══');
	for (const coll of ['userApplications', 'DsaApplications', 'rmApplications', 'adminUsers']) {
		const c = db.collection(coll);
		const hit = await c.findOne(
			{ mobileNumber: { $in: ['9811556664', 9811556664] } },
			{ projection: { _id: 1, mobileNumber: 1, name: 1, email: 1, onboardingCompleted: 1, is_active: 1 } }
		);
		if (hit) {
			console.log(`  ${coll}: FOUND _id=${hit._id}`);
			console.log(`    mobileNumber type: ${typeOf(hit.mobileNumber)}`);
			console.log(`    name type:         ${typeOf(hit.name)}`);
			console.log(`    email type:        ${typeOf(hit.email)}`);
			if (hit.onboardingCompleted !== undefined) console.log(`    onboardingCompleted: ${hit.onboardingCompleted}`);
			if (hit.is_active !== undefined) console.log(`    is_active: ${hit.is_active}`);
		} else {
			console.log(`  ${coll}: not found`);
		}
	}

	await client.close();
	console.log('\nDone.');
}

main().catch((err) => {
	console.error('Diagnostic failed:', err);
	process.exit(1);
});
