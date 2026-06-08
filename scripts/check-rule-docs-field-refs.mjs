#!/usr/bin/env node
/**
 * check-rule-docs-field-refs.mjs — pre-merge verification for the 2026-05-31
 * loan-field nomenclature rename.
 *
 * Scans every active LenderRuleArtifact in MongoDB for JSON-Logic var
 * references to the three retired field names (PlotLoanActivity, LAPType,
 * unSecureLoanType). Expected output: zero hits. If any rule doc references
 * a retired name, those rule docs need updating in lockstep with this rename
 * (the PMS team owns that work).
 *
 * Usage (Node 20.6+ / Node 22):
 *   node --env-file=.env.local scripts/check-rule-docs-field-refs.mjs
 *
 * Or set MONGODB_URI manually:
 *   $env:MONGODB_URI = "mongodb+srv://..."; node scripts/check-rule-docs-field-refs.mjs
 *
 * Exit code:
 *   0 — clean (zero references found)
 *   1 — references found OR connection failure
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
	console.error(
		'ERROR: MONGODB_URI not set.\n' +
			'Invoke with --env-file:\n' +
			'  node --env-file=.env.local scripts/check-rule-docs-field-refs.mjs\n' +
			'or set the variable manually:\n' +
			'  $env:MONGODB_URI = "..."; node scripts/check-rule-docs-field-refs.mjs'
	);
	process.exit(1);
}

const LEGACY_NAMES = ['PlotLoanActivity', 'LAPType', 'unSecureLoanType'];

/** Walks a JSON-Logic blob looking for { var: 'NAME' } references. */
function findLegacyVarRefs(node, path = '$') {
	const hits = [];
	if (node && typeof node === 'object') {
		if (Array.isArray(node)) {
			node.forEach((child, i) => hits.push(...findLegacyVarRefs(child, `${path}[${i}]`)));
		} else {
			for (const [key, value] of Object.entries(node)) {
				if (key === 'var' && typeof value === 'string' && LEGACY_NAMES.includes(value)) {
					hits.push({ path: `${path}.var`, value });
				} else {
					hits.push(...findLegacyVarRefs(value, `${path}.${key}`));
				}
			}
		}
	}
	return hits;
}

async function main() {
	const client = new MongoClient(MONGODB_URI);
	await client.connect();
	const db = client.db();

	console.log(`\nConnected to: ${db.databaseName}`);
	console.log(`Scanning active LenderRuleArtifacts for legacy var refs...\n`);

	const cursor = db.collection('LenderRuleArtifacts').find({ status: 'active' });

	let totalRuleDocs = 0;
	let totalRuleDocsWithHits = 0;
	let totalHits = 0;

	for await (const doc of cursor) {
		totalRuleDocs += 1;
		const hits = findLegacyVarRefs(doc);
		if (hits.length > 0) {
			totalRuleDocsWithHits += 1;
			totalHits += hits.length;
			console.log(
				`HIT: lender=${doc.lender_id ?? '?'} product=${doc.product_id ?? '?'} _id=${doc._id}`
			);
			for (const hit of hits) {
				console.log(`  ${hit.path} → '${hit.value}'`);
			}
		}
	}

	console.log(`\nScanned: ${totalRuleDocs} active rule docs`);
	console.log(`With legacy refs: ${totalRuleDocsWithHits}`);
	console.log(`Total legacy refs: ${totalHits}`);

	await client.close();

	if (totalHits > 0) {
		console.log(
			'\n❌ NOT CLEAN. The PMS team needs to rewrite the above rule docs to use the new field names ' +
				'(PlotLoanActivity → loanType, LAPType/unSecureLoanType → facilityType) before this rename merges to main.'
		);
		process.exit(1);
	}
	console.log('\n✅ Clean. No active rule doc references any retired field name. Safe to merge.');
	process.exit(0);
}

main().catch((err) => {
	console.error('FAILED:', err);
	process.exit(1);
});
