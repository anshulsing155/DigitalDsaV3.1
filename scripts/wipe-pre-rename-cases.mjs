#!/usr/bin/env node
/**
 * wipe-pre-rename-cases.mjs — one-off cleanup for the 2026-05-31 loan-field
 * nomenclature rename.
 *
 * Drops every test FormSnapshot / Case / LenderResultsSnapshot that pre-dates
 * the rename, EXCEPT the 4 demo `is_sample: true` cases that drive new-DSA
 * onboarding (those stay so the onboarding experience still works post-merge).
 *
 * Pre-launch context: all current production data is from team-tester accounts
 * and disposable. After running this, the form rewrite (Batches 1-9) has clean
 * state to write into.
 *
 * Usage (Node 20.6+ / Node 22):
 *   node --env-file=.env --env-file=.env.local scripts/wipe-pre-rename-cases.mjs            # dry-run
 *   node --env-file=.env --env-file=.env.local scripts/wipe-pre-rename-cases.mjs --execute  # destructive
 *
 * Or set MONGODB_URI manually:
 *   $env:MONGODB_URI = "mongodb+srv://..."; node scripts/wipe-pre-rename-cases.mjs
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
	console.error(
		'ERROR: MONGODB_URI not set.\n' +
			'Invoke with --env-file:\n' +
			'  node --env-file=.env --env-file=.env.local scripts/wipe-pre-rename-cases.mjs\n' +
			'or set the variable manually:\n' +
			'  $env:MONGODB_URI = "..."; node scripts/wipe-pre-rename-cases.mjs'
	);
	process.exit(1);
}

const EXECUTE = process.argv.includes('--execute');

// Collection names in MongoDB are camelCase (cases / formSnapshots / ...),
// NOT the PascalCase used by TypeScript types. Mongo is case-sensitive.
const TARGETS = [
	{
		collection: 'cases',
		// Preserve the 4 sample/demo cases that drive new-DSA onboarding.
		filter: { is_sample: { $ne: true } }
	},
	{
		// formSnapshots track meta.is_sample on the snapshot itself.
		collection: 'formSnapshots',
		filter: { 'meta.is_sample': { $ne: true } }
	},
	{
		// lenderResultsSnapshots don't carry is_sample directly. Snapshots
		// tied to a sample case will be left as orphans after the cleanup;
		// that's acceptable (they're indexed by case_id and the consumer
		// code handles missing snapshots gracefully).
		collection: 'lenderResultsSnapshots',
		filter: {}
	}
];

async function main() {
	const client = new MongoClient(MONGODB_URI);
	await client.connect();
	const db = client.db();

	console.log(`\nConnected to: ${db.databaseName}`);
	console.log(`Mode: ${EXECUTE ? 'EXECUTE (will delete)' : 'DRY-RUN (counts only)'}\n`);

	let grandTotal = 0;
	for (const { collection, filter } of TARGETS) {
		const col = db.collection(collection);
		const count = await col.countDocuments(filter);
		console.log(`${collection.padEnd(28)}  ${count.toString().padStart(6)} matched`);
		grandTotal += count;

		if (EXECUTE && count > 0) {
			const result = await col.deleteMany(filter);
			console.log(`${' '.repeat(28)}  ${result.deletedCount.toString().padStart(6)} deleted`);
		}
	}

	console.log(`\nTotal matched: ${grandTotal}`);
	if (!EXECUTE) {
		console.log('\nDry-run only. Re-run with --execute to actually delete.');
	} else {
		console.log('\nDone.');
	}

	await client.close();
}

main().catch((err) => {
	console.error('FAILED:', err);
	process.exit(1);
});
