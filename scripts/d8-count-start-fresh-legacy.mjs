// One-off count script for TECH-DEBT-CLEANUP-2026-05-31 §3 D8 pre-flight.
//
// Counts how many stored documents still carry the legacy
// 'Start Fresh with New Loan' value in any of the three fields where it
// could plausibly land:
//
//   1. FormSnapshots.applicationData.loanType        (resolved canonical field)
//   2. FormSnapshots.applicationData.q4_loanType     (raw form bindsTo key)
//   3. LenderResultsSnapshots.payload.loanTransaction.loanType
//      (engine input payload — would surface in lender comparison rows)
//
// READ-ONLY. No writes. Safe to run against any environment.
//
// Usage:
//   node scripts/d8-count-start-fresh-legacy.mjs
//
// Reads MONGODB_URI from the same `.env` your dev server uses. To run against
// a different cluster, prefix the command:
//   MONGODB_URI='mongodb+srv://...' node scripts/d8-count-start-fresh-legacy.mjs
//
// Sample output:
//   FormSnapshots.applicationData.loanType                 = 0
//   FormSnapshots.applicationData.q4_loanType              = 0
//   LenderResultsSnapshots.payload.loanTransaction.loanType = 0
//   ── TOTAL stored docs using legacy value: 0 → clean migration possible

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// Mirror the .env-loading pattern used in scripts/d1-smoke-find-by-id.mjs.
const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const LEGACY_VALUE = 'Start Fresh with New Loan';

const QUERIES = [
	{
		collection: 'FormSnapshots',
		filter: { 'applicationData.loanType': LEGACY_VALUE },
		label: 'FormSnapshots.applicationData.loanType'
	},
	{
		collection: 'FormSnapshots',
		filter: { 'applicationData.q4_loanType': LEGACY_VALUE },
		label: 'FormSnapshots.applicationData.q4_loanType'
	},
	{
		collection: 'LenderResultsSnapshots',
		filter: { 'payload.loanTransaction.loanType': LEGACY_VALUE },
		label: 'LenderResultsSnapshots.payload.loanTransaction.loanType'
	}
];

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();

console.log(`\nCounting documents with loanType === '${LEGACY_VALUE}':\n`);

let total = 0;
const maxLabelLen = Math.max(...QUERIES.map((q) => q.label.length));

for (const { collection, filter, label } of QUERIES) {
	const count = await db.collection(collection).countDocuments(filter);
	total += count;
	console.log(`  ${label.padEnd(maxLabelLen)}  = ${count}`);
}

console.log(`\n  ── TOTAL stored docs using legacy value: ${total}`);
if (total === 0) {
	console.log('  → clean migration possible (option A)');
} else {
	console.log(`  → migration script required before form change can ship (option B)`);
	console.log(`  → ${total} doc(s) need 'Start Fresh with New Loan' → 'New Loan' rewrite`);
}

await client.close();
