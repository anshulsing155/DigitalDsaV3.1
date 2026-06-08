const fs = require('fs');
const path = require('path');

// Read the CLEAN server-side copy as the source of truth
const serverPath = path.join(__dirname, 'src/lib/server/formEngine/schemas/homeLoanSchema.json');
const clientPath = path.join(__dirname, 'src/lib/config/homeLoanSchema.json');

const content = fs.readFileSync(serverPath, 'utf-8');
const schema = JSON.parse(content);

// IDs to remove
const idsToRemove = new Set([
	'q_purchasedFrom',
	'q_RERARegisterBuilder',
	'q_builderType',
	'q_nameOfBuilder',
	'q_nameOfAuthority',
	'q_isPropertyOnLoan',
	'q_lendersName',
	'q_sellerLoanBankName',
	'q_foreclosureAmount',
	'q_isSellerNRI',
	'q_occupancyStatus',
	'q_layoutMatchesPlan',
	'q_buildingPlanApproved'
]);

// bindsTo keys that are being removed (for showWhen cleanup)
const removedBindsToKeys = new Set([
	'purchasedFrom',
	'RERARegisterBuilder',
	'builderType',
	'nameOfBuilder',
	'nameOfAuthority',
	'isPropertyOnLoan',
	'lendersName',
	'sellerLoanBankName',
	'foreclosureAmount',
	'isSellerNRI',
	'occupancyStatus',
	'layoutMatchesPlan',
	'buildingPlanApproved'
]);

// Helper: check if a JSON-logic condition references any removed key
function conditionReferencesRemovedKey(condition) {
	if (!condition || typeof condition !== 'object') return false;

	if (condition.var && removedBindsToKeys.has(condition.var)) return true;

	for (const key of Object.keys(condition)) {
		const val = condition[key];
		if (Array.isArray(val)) {
			for (const item of val) {
				if (conditionReferencesRemovedKey(item)) return true;
			}
		} else if (typeof val === 'object' && val !== null) {
			if (conditionReferencesRemovedKey(val)) return true;
		}
	}
	return false;
}

// Helper: remove conditions that reference removed keys from an "and" array
function cleanAndConditions(andArray) {
	return andArray.filter((cond) => !conditionReferencesRemovedKey(cond));
}

// Helper: clean a showWhen object
function cleanShowWhen(showWhen) {
	if (!showWhen) return showWhen;

	// If the top-level is an "and", filter out conditions referencing removed keys
	if (showWhen.and) {
		const cleaned = cleanAndConditions(showWhen.and);
		if (cleaned.length === 0) return null; // remove showWhen entirely
		if (cleaned.length === 1) return cleaned[0]; // simplify
		return { and: cleaned };
	}

	// If the top-level references a removed key directly
	if (conditionReferencesRemovedKey(showWhen)) return null;

	return showWhen;
}

let totalRemoved = 0;
let totalShowWhenCleaned = 0;

// Process each page
for (const page of schema.pages) {
	if (!page.questions || page.questions.length === 0) continue;

	const originalCount = page.questions.length;

	// Remove questions with IDs in the removal set
	page.questions = page.questions.filter((q) => {
		if (idsToRemove.has(q.id)) {
			console.log(`Removed question: ${q.id} (bindsTo: ${q.bindsTo_template})`);
			return false;
		}
		return true;
	});

	totalRemoved += originalCount - page.questions.length;

	// Clean showWhen conditions on remaining questions
	for (const q of page.questions) {
		if (q.showWhen && conditionReferencesRemovedKey(q.showWhen)) {
			const before = JSON.stringify(q.showWhen);
			const cleaned = cleanShowWhen(q.showWhen);
			if (cleaned === null) {
				delete q.showWhen;
				console.log(`Removed showWhen entirely from: ${q.id}`);
			} else {
				q.showWhen = cleaned;
				console.log(`Cleaned showWhen on: ${q.id}`);
			}
			totalShowWhenCleaned++;
		}
	}
}

console.log(`\nTotal questions removed: ${totalRemoved}`);
console.log(`Total showWhen conditions cleaned: ${totalShowWhenCleaned}`);

// Write to both files
const output = JSON.stringify(schema, null, '\t');

fs.writeFileSync(clientPath, output + '\n', 'utf-8');
console.log(`\nWritten to: ${clientPath}`);

fs.writeFileSync(serverPath, output + '\n', 'utf-8');
console.log(`Written to: ${serverPath}`);

// Validate
try {
	JSON.parse(fs.readFileSync(clientPath, 'utf-8'));
	console.log('Client JSON: VALID');
} catch (e) {
	console.log('Client JSON: INVALID -', e.message);
}

try {
	JSON.parse(fs.readFileSync(serverPath, 'utf-8'));
	console.log('Server JSON: VALID');
} catch (e) {
	console.log('Server JSON: INVALID -', e.message);
}
