/**
 * fix-duplicate-propertyType.cjs
 *
 * Removes duplicate q1b_propertyType and q1c_leaseRemainingPeriod questions
 * from LAP and Plot schemas. These were accidentally added in Session 23
 * when the Home Loan property ownership question was restored.
 *
 * LAP already has q3_propertyType + q4_leaseRemainingPeriod on propertyCharacter_LAP
 * Plot already has q1_propertyType + q4_leaseRemainingPeriod on plotOwnershipAndDevelopment
 */

const fs = require('fs');
const path = require('path');

const SCHEMAS = [
	{
		name: 'LAP',
		clientPath: path.join(__dirname, '..', 'src', 'lib', 'config', 'LAP-schema.json'),
		serverPath: path.join(
			__dirname,
			'..',
			'src',
			'lib',
			'server',
			'formEngine',
			'schemas',
			'LAP-schema.json'
		),
		pageId: 'propertyCharacter_LAP',
		removeIds: ['q1b_propertyType', 'q1c_leaseRemainingPeriod'],
		keepIds: ['q3_propertyType', 'q4_leaseRemainingPeriod']
	},
	{
		name: 'Plot',
		clientPath: path.join(__dirname, '..', 'src', 'lib', 'config', 'plot-loan-schema.json'),
		serverPath: path.join(
			__dirname,
			'..',
			'src',
			'lib',
			'server',
			'formEngine',
			'schemas',
			'plot-loan-schema.json'
		),
		pageId: 'propertyCharacter_Plot',
		removeIds: ['q1b_propertyType', 'q1c_leaseRemainingPeriod'],
		keepIds: ['q1_propertyType', 'q4_leaseRemainingPeriod'] // on plotOwnershipAndDevelopment page
	}
];

let totalRemoved = 0;

for (const schema of SCHEMAS) {
	console.log(`\n=== Processing ${schema.name} Schema ===`);

	const data = JSON.parse(fs.readFileSync(schema.clientPath, 'utf-8'));

	// Find the target page
	const page = data.pages.find((p) => p.id === schema.pageId);
	if (!page) {
		console.error(`  ERROR: Page ${schema.pageId} not found!`);
		continue;
	}

	const beforeCount = page.questions.length;

	// Remove duplicate questions
	page.questions = page.questions.filter((q) => !schema.removeIds.includes(q.id));

	const afterCount = page.questions.length;
	const removed = beforeCount - afterCount;
	totalRemoved += removed;

	console.log(
		`  Page "${schema.pageId}": ${beforeCount} → ${afterCount} questions (removed ${removed})`
	);

	// Verify the originals still exist (on same or different page)
	for (const keepId of schema.keepIds) {
		let found = false;
		for (const p of data.pages) {
			if (p.questions.some((q) => q.id === keepId)) {
				found = true;
				console.log(`  ✓ Original "${keepId}" exists on page "${p.id}"`);
				break;
			}
		}
		if (!found) {
			console.error(`  ERROR: Original "${keepId}" NOT FOUND in any page!`);
		}
	}

	// Check for any remaining duplicate bindsTo keys across ALL pages
	const bindsToCounts = {};
	for (const p of data.pages) {
		for (const q of p.questions) {
			const bt = q.bindsTo_template;
			if (bt) {
				if (!bindsToCounts[bt]) bindsToCounts[bt] = [];
				bindsToCounts[bt].push({ page: p.id, qId: q.id });
			}
		}
	}

	const dupes = Object.entries(bindsToCounts).filter(([, v]) => v.length > 1);
	if (dupes.length > 0) {
		console.log('  ⚠ Remaining duplicate bindsTo keys:');
		for (const [key, locations] of dupes) {
			console.log(`    "${key}": ${locations.map((l) => `${l.qId} (${l.page})`).join(', ')}`);
		}
	} else {
		console.log('  ✓ No duplicate bindsTo keys');
	}

	// Write both client and server copies
	const output = JSON.stringify(data, null, '\t');
	fs.writeFileSync(schema.clientPath, output, 'utf-8');
	fs.writeFileSync(schema.serverPath, output, 'utf-8');
	console.log(`  ✓ Written to client + server`);
}

console.log(`\n=== Done: Removed ${totalRemoved} duplicate questions ===`);
