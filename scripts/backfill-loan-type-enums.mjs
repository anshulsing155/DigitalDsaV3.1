// Backfill: normalise raw loan-type ENUM values stored in cases.loan.type to
// their canonical display label (Audit B.2 data-consistency pass).
//
// Why: most cases store a human label ("Home Loan") but a minority store the
// raw enum ("home_loan"). They are the SAME loan type, so they fragment the
// data — the Cases filter shows "Home Loan" twice and filtering by one misses
// the other's rows. This rewrites the enum-form values to the canonical label.
//
// SAFE BY CONSTRUCTION: it only updates a case when canonicalLabel !== current
// value. Legitimate human/variant values ("Plot Loan Only", "Balance Transfer",
// "Loan Against Property") normalise to themselves and are left untouched — no
// merges, no information loss.
//
// Mirrors LOAN_TYPE_LABELS in src/lib/config/loanTypeLabels.ts (kept in sync by
// hand — operator scripts run outside Vite so can't import the $lib alias).
//
// Preview (no writes):  node scripts/backfill-loan-type-enums.mjs
// Apply:                node scripts/backfill-loan-type-enums.mjs --confirm

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

// ── Canonical enum → label map (mirror of loanTypeLabels.ts) ─────────────────
const LOAN_TYPE_LABELS = {
	home_loan: 'Home Loan',
	lap: 'Loan Against Property',
	plot_loan: 'Plot & Construction Loan',
	personal_loan: 'Personal Loan',
	business_loan: 'Business Loan',
	professional_loan: 'Professional Loan'
};

function titleCase(value) {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function loanTypeLabel(raw) {
	if (!raw) return '';
	const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
	if (LOAN_TYPE_LABELS[key]) return LOAN_TYPE_LABELS[key];
	return titleCase(raw);
}

async function loadEnv() {
	for (const f of ['.env', '.env.local']) {
		const p = resolve(process.cwd(), f);
		if (!existsSync(p)) continue;
		const text = await readFile(p, 'utf-8');
		for (const line of text.split(/\r?\n/)) {
			const t = line.trim();
			if (!t || t.startsWith('#')) continue;
			const eq = t.indexOf('=');
			if (eq <= 0) continue;
			let v = t.slice(eq + 1).trim();
			if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
				v = v.slice(1, -1);
			}
			process.env[t.slice(0, eq).trim()] = v;
		}
	}
}

await loadEnv();
const confirm = process.argv.includes('--confirm');
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const cases = client.db('digitaldsa').collection('cases');

// Group distinct values, compute which need rewriting.
const distinct = await cases
	.aggregate([{ $group: { _id: '$loan.type', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
	.toArray();

const plan = distinct
	.map((d) => ({ from: d._id, to: loanTypeLabel(d._id), count: d.count }))
	.filter((p) => typeof p.from === 'string' && p.to !== p.from);

console.log('── B.2 loan-type enum backfill ──');
if (plan.length === 0) {
	console.log('Nothing to backfill — all values are already canonical.');
	await client.close();
	process.exit(0);
}
console.log('Will rewrite (only enum-form values whose canonical label differs):');
for (const p of plan) console.log(`  "${p.from}" → "${p.to}"  (${p.count} cases)`);
console.log('Untouched: every value that normalises to itself (human + variants).');

if (!confirm) {
	console.log('\nPreview only. Re-run with --confirm to apply.');
	await client.close();
	process.exit(0);
}

let total = 0;
for (const p of plan) {
	const res = await cases.updateMany(
		{ 'loan.type': p.from },
		{ $set: { 'loan.type': p.to, updated_at: new Date() } }
	);
	total += res.modifiedCount;
	console.log(`  updated ${res.modifiedCount}: "${p.from}" → "${p.to}"`);
}
console.log(`\n── Done. ${total} cases relabelled. ──`);

await client.close();
