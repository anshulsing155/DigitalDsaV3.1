/**
 * Phase 2: Structural Fixes for unsecured loan forms
 * C3: Remove BL Credit History page
 * C4: Remove BL Collateral Free Selection page
 * H4: Rename mortgageYear → loanTenure (unsecured only)
 * Typo: registerationCountry → registrationCountry
 *
 * C5 (professionalCategory) deferred to Phase 3 (depends on DC page reordering)
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

function readFile(relPath) {
	return fs.readFileSync(path.join(BASE, relPath), 'utf8');
}

function writeFile(relPath, content) {
	fs.writeFileSync(path.join(BASE, relPath), content, 'utf8');
}

function assertReplace(content, searchLF, replacementLF, label) {
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';
	const search = searchLF.replace(/\n/g, eol);
	const replacement = replacementLF.replace(/\n/g, eol);
	if (!content.includes(search)) {
		const firstLine = searchLF.split('\n')[0];
		const idx = content.indexOf(firstLine.replace(/\n/g, eol));
		if (idx >= 0) {
			const snippet = content
				.substring(idx, idx + 200)
				.replace(/\r/g, '\\r')
				.replace(/\n/g, '\\n');
			throw new Error(
				`[${label}] Found first line at ${idx} but full match failed. Snippet:\n${snippet}`
			);
		}
		throw new Error(`[${label}] Could not find search string (even first line missing)`);
	}
	const count = content.split(search).length - 1;
	if (count > 1) {
		throw new Error(`[${label}] Found ${count} occurrences (expected 1)`);
	}
	return content.replace(search, replacement);
}

function replaceAll(content, search, replacement, label) {
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';
	const s = search.replace(/\n/g, eol);
	const r = replacement.replace(/\n/g, eol);
	const count = content.split(s).length - 1;
	if (count === 0) {
		throw new Error(`[${label}] No occurrences found`);
	}
	console.log(`  [${label}] Replacing ${count} occurrences`);
	return content.split(s).join(r);
}

let changes = 0;

// ═══════════════════════════════════════════════════════════════════════
// C3: Remove BL Credit History page
// ═══════════════════════════════════════════════════════════════════════

// C3a: Move creditHistory.ts to _archive/
{
	const src = path.join(BASE, 'src/lib/config/businessLoan/questionBank/creditHistory.ts');
	const archiveDir = path.join(BASE, 'src/lib/config/businessLoan/questionBank/_archive');
	const dest = path.join(archiveDir, 'creditHistory.ts');
	if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
	fs.renameSync(src, dest);
	changes++;
	console.log('✓ C3a: creditHistory.ts moved to _archive/');
}

// C3b: Update BL pages.ts — remove creditHistory import + page
{
	const relPath = 'src/lib/config/businessLoan/pages.ts';
	let content = readFile(relPath);

	// Remove import
	content = assertReplace(
		content,
		"import { getCreditHistoryPageQuestions } from './questionBank/creditHistory.js';\n",
		'',
		'C3b: remove creditHistory import'
	);
	changes++;

	// Remove buildCreditHistoryPage function
	content = assertReplace(
		content,
		"/** Credit History Check */\nexport function buildCreditHistoryPage(): RawSchemaPage {\n\treturn {\n\t\tid: 'creditHistoryPage',\n\t\ttitle: 'Credit History Check',\n\t\tnextButtonVisibility: { mode: ['allRequiredAnswered'] },\n\t\tquestions: getCreditHistoryPageQuestions()\n\t};\n}\n\n",
		'',
		'C3b: remove buildCreditHistoryPage function'
	);
	changes++;

	// Remove from getAllPages()
	content = assertReplace(
		content,
		'\t\tbuildCreditHistoryPage(),\n',
		'',
		'C3b: remove from getAllPages'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ C3b: BL pages.ts updated');
}

// C3c: Update BL wizard sections — remove creditHistoryPage subsection
{
	const relPath = 'src/lib/config/wizardSections/businessLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	// Remove the credit-history subsection block
	// Find the subsection by its id
	const creditHistoryStart = content.indexOf("id: 'credit-history'");
	if (creditHistoryStart === -1) throw new Error('C3c: credit-history subsection not found');

	// Find the opening brace of this subsection object
	// Go backwards to find the opening `{` before this id
	let braceStart = content.lastIndexOf('{', creditHistoryStart);
	// Go further back to find the tab indentation start
	let lineStart = content.lastIndexOf(eol, braceStart) + eol.length;

	// Find the closing of this subsection — look for the matching closing brace
	let depth = 0;
	let i = braceStart;
	while (i < content.length) {
		if (content[i] === '{') depth++;
		if (content[i] === '}') {
			depth--;
			if (depth === 0) break;
		}
		i++;
	}
	// i is now at the closing `}`. Include the trailing `,\n`
	let endPos = i + 1;
	if (content[endPos] === ',') endPos++;
	// Skip EOL after the comma
	if (content.substring(endPos, endPos + eol.length) === eol) endPos += eol.length;

	content = content.substring(0, lineStart) + content.substring(endPos);
	changes++;

	writeFile(relPath, content);
	console.log('✓ C3c: BL wizard sections credit-history removed');
}

// ═══════════════════════════════════════════════════════════════════════
// C4: Remove BL Collateral Free Selection page
// ═══════════════════════════════════════════════════════════════════════

// C4a: Move collateral_free_selection.ts to _archive/
{
	const src = path.join(
		BASE,
		'src/lib/config/businessLoan/questionBank/collateral_free_selection.ts'
	);
	const archiveDir = path.join(BASE, 'src/lib/config/businessLoan/questionBank/_archive');
	const dest = path.join(archiveDir, 'collateral_free_selection.ts');
	if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
	fs.renameSync(src, dest);
	changes++;
	console.log('✓ C4a: collateral_free_selection.ts moved to _archive/');
}

// C4b: Update BL pages.ts — remove collateral import + page
{
	const relPath = 'src/lib/config/businessLoan/pages.ts';
	let content = readFile(relPath);

	// Remove import
	content = assertReplace(
		content,
		"import { getCollateralFreeSelectionpageQuestions } from './questionBank/collateral_free_selection.js';\n",
		'',
		'C4b: remove collateral import'
	);
	changes++;

	// Remove buildCollateralFreeSelectionPage function
	content = assertReplace(
		content,
		"/** A few check points ! */\nexport function buildCollateralFreeSelectionPage(): RawSchemaPage {\n\treturn {\n\t\tid: 'collateral_free_selectionPage',\n\t\ttitle: 'A few check points !',\n\t\tnextButtonVisibility: { mode: ['allRequiredAnswered'] },\n\t\tquestions: getCollateralFreeSelectionpageQuestions()\n\t};\n}\n\n",
		'',
		'C4b: remove buildCollateralFreeSelectionPage function'
	);
	changes++;

	// Remove from getAllPages()
	content = assertReplace(
		content,
		'\t\tbuildCollateralFreeSelectionPage(),\n',
		'',
		'C4b: remove from getAllPages'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ C4b: BL pages.ts updated');
}

// C4c: Update BL wizard sections — remove eligibility-check (collateral) subsection
{
	const relPath = 'src/lib/config/wizardSections/businessLoan.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	const subsectionStart = content.indexOf("id: 'eligibility-check'");
	if (subsectionStart === -1) throw new Error('C4c: eligibility-check subsection not found');

	let braceStart = content.lastIndexOf('{', subsectionStart);
	let lineStart = content.lastIndexOf(eol, braceStart) + eol.length;

	let depth = 0;
	let i = braceStart;
	while (i < content.length) {
		if (content[i] === '{') depth++;
		if (content[i] === '}') {
			depth--;
			if (depth === 0) break;
		}
		i++;
	}
	let endPos = i + 1;
	if (content[endPos] === ',') endPos++;
	if (content.substring(endPos, endPos + eol.length) === eol) endPos += eol.length;

	content = content.substring(0, lineStart) + content.substring(endPos);
	changes++;

	writeFile(relPath, content);
	console.log('✓ C4c: BL wizard sections eligibility-check removed');
}

// ═══════════════════════════════════════════════════════════════════════
// H4: Rename mortgageYear → loanTenure (unsecured loan schemas only)
// ═══════════════════════════════════════════════════════════════════════

// H4a: Update PL loanRequirement.ts
{
	const relPath = 'src/lib/config/personalLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4a PL loanRequirement');
	content = replaceAll(content, 'q1_mortgageYear', 'q1_loanTenure', 'H4a PL question id');
	writeFile(relPath, content);
	changes++;
	console.log('✓ H4a: PL loanRequirement.ts updated');
}

// H4b: Update BL loanRequirement.ts
{
	const relPath = 'src/lib/config/businessLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4b BL loanRequirement');
	content = replaceAll(content, 'q1_mortgageYear', 'q1_loanTenure', 'H4b BL question id');
	writeFile(relPath, content);
	changes++;
	console.log('✓ H4b: BL loanRequirement.ts updated');
}

// H4c: Update Prof loanRequirement.ts
{
	const relPath = 'src/lib/config/professionalLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4c Prof loanRequirement');
	content = replaceAll(content, 'q1_mortgageYear', 'q1_loanTenure', 'H4c Prof question id');
	writeFile(relPath, content);
	changes++;
	console.log('✓ H4c: Prof loanRequirement.ts updated');
}

// H4d: Update PL +page.svelte submission — mortgageYear ref
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte';
	let content = readFile(relPath);
	content = assertReplace(
		content,
		'tenureYears: Number(loanTransaction?.mortgageYear) || undefined,',
		'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
		'H4d: PL submission tenureYears'
	);
	changes++;
	writeFile(relPath, content);
	console.log('✓ H4d: PL +page.svelte submission updated');
}

// H4e: Update BL +page.svelte submission — tenure ref (already wrong key)
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte';
	let content = readFile(relPath);
	content = assertReplace(
		content,
		'tenureYears: Number(loanTransaction?.tenure) || undefined,',
		'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
		'H4e: BL submission tenureYears'
	);
	changes++;
	writeFile(relPath, content);
	console.log('✓ H4e: BL +page.svelte submission updated');
}

// H4f: Update Prof +page.svelte submission — tenure ref
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte';
	let content = readFile(relPath);
	content = assertReplace(
		content,
		'tenureYears: Number(loanTransaction?.tenure) || undefined,',
		'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
		'H4f: Prof submission tenureYears'
	);
	changes++;
	writeFile(relPath, content);
	console.log('✓ H4f: Prof +page.svelte submission updated');
}

// H4g: Update payloadEnricher.ts — add loanTenure fallback
{
	const relPath = 'src/lib/ruleEngine/payloadEnricher.ts';
	let content = readFile(relPath);
	content = assertReplace(
		content,
		"if (lt?.mortgageYear === 'OTHER' && lt?.mortgageYearCustom) {",
		"// Unsecured loans use loanTenure; secured loans use mortgageYear. Normalize early.\n\tif (lt?.loanTenure && !lt?.mortgageYear) {\n\t\tlt.mortgageYear = lt.loanTenure;\n\t}\n\n\tif (lt?.mortgageYear === 'OTHER' && lt?.mortgageYearCustom) {",
		'H4g: payloadEnricher loanTenure fallback'
	);
	changes++;
	writeFile(relPath, content);
	console.log('✓ H4g: payloadEnricher.ts loanTenure fallback added');
}

// H4h: Update casePayloadBuilder.ts — add loanTenure to fallback
{
	const relPath = 'src/lib/utils/casePayloadBuilder.ts';
	let content = readFile(relPath);
	content = assertReplace(
		content,
		'tenureYears: toNumber(answers.mortgageYear ?? answers.tenure),',
		'tenureYears: toNumber(answers.loanTenure ?? answers.mortgageYear ?? answers.tenure),',
		'H4h: casePayloadBuilder loanTenure'
	);
	changes++;
	writeFile(relPath, content);
	console.log('✓ H4h: casePayloadBuilder.ts updated');
}

// ═══════════════════════════════════════════════════════════════════════
// Typo fix: registerationCountry → registrationCountry
// ═══════════════════════════════════════════════════════════════════════

const typoFiles = [
	'src/lib/components/AddApplicantBusiness.svelte',
	'src/lib/components/AddApplicantProfessional.svelte',
	'src/lib/components/AddApplicant.svelte',
	'src/lib/components/QuestionRenderer.svelte',
	'src/lib/types/form.ts'
];

for (const relPath of typoFiles) {
	let content = readFile(relPath);
	if (content.includes('registerationCountry')) {
		content = replaceAll(
			content,
			'registerationCountry',
			'registrationCountry',
			`typo: ${relPath}`
		);
		writeFile(relPath, content);
		changes++;
		console.log(`✓ Typo fixed: ${relPath}`);
	} else {
		console.log(`  (skip) ${relPath}: no typo found`);
	}
}

// Also fix in JSON schema files (secured loans — for consistency)
const jsonTypoFiles = [
	'src/lib/config/applicantBasicDetailsSecuredLoans.json',
	'src/lib/server/formEngine/schemas/applicantBasicDetailsSecuredLoans.json'
];

for (const relPath of jsonTypoFiles) {
	let content = readFile(relPath);
	if (content.includes('registerationCountry')) {
		content = replaceAll(
			content,
			'registerationCountry',
			'registrationCountry',
			`typo: ${relPath}`
		);
		writeFile(relPath, content);
		changes++;
		console.log(`✓ Typo fixed: ${relPath}`);
	} else {
		console.log(`  (skip) ${relPath}: no typo found`);
	}
}

console.log(`\n✅ Phase 2 complete: ${changes} changes applied`);
