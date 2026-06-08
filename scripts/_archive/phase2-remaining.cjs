/**
 * Phase 2 remaining: H4 (mortgageYear→loanTenure) + typo fix
 * C3/C4 already completed in previous run.
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
				.substring(idx, idx + 300)
				.replace(/\r/g, '\\r')
				.replace(/\n/g, '\\n');
			throw new Error(
				`[${label}] Found first line at ${idx} but full match failed. Snippet:\n${snippet}`
			);
		}
		throw new Error(`[${label}] Could not find search string`);
	}
	return content.replace(search, replacement);
}

function replaceAll(content, search, replacement, label) {
	const count = content.split(search).length - 1;
	if (count === 0) {
		console.log(`  (skip) [${label}] No occurrences of "${search}"`);
		return content;
	}
	console.log(`  [${label}] Replacing ${count} occurrences`);
	return content.split(search).join(replacement);
}

let changes = 0;

// ═══════════════════════════════════════════════════════════════════════
// H4: Rename mortgageYear → loanTenure (unsecured loan schemas only)
// ═══════════════════════════════════════════════════════════════════════

// H4a: PL loanRequirement.ts
{
	const relPath = 'src/lib/config/personalLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	if (content.includes('mortgageYear')) {
		content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4a PL loanRequirement');
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4a: PL loanRequirement.ts updated');
	} else {
		console.log('✓ H4a: PL loanRequirement.ts already updated');
	}
}

// H4b: Update BL loanRequirement.ts
{
	const relPath = 'src/lib/config/businessLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	if (content.includes('mortgageYear')) {
		content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4b BL loanRequirement');
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4b: BL loanRequirement.ts updated');
	} else {
		console.log('✓ H4b: BL loanRequirement.ts already updated');
	}
}

// H4c: Update Prof loanRequirement.ts
{
	const relPath = 'src/lib/config/professionalLoan/questionBank/loanRequirement.ts';
	let content = readFile(relPath);
	if (content.includes('mortgageYear')) {
		content = replaceAll(content, 'mortgageYear', 'loanTenure', 'H4c Prof loanRequirement');
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4c: Prof loanRequirement.ts updated');
	} else {
		console.log('✓ H4c: Prof loanRequirement.ts already updated');
	}
}

// H4d: Update PL +page.svelte submission — mortgageYear ref
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte';
	let content = readFile(relPath);
	if (content.includes('loanTransaction?.mortgageYear')) {
		content = assertReplace(
			content,
			'tenureYears: Number(loanTransaction?.mortgageYear) || undefined,',
			'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
			'H4d: PL submission tenureYears'
		);
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4d: PL +page.svelte submission updated');
	} else if (content.includes('loanTransaction?.loanTenure')) {
		console.log('✓ H4d: PL +page.svelte already updated');
	} else {
		throw new Error('H4d: Could not find tenureYears ref in PL +page.svelte');
	}
}

// H4e: Update BL +page.svelte submission
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte';
	let content = readFile(relPath);
	if (content.includes('loanTransaction?.tenure')) {
		content = assertReplace(
			content,
			'tenureYears: Number(loanTransaction?.tenure) || undefined,',
			'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
			'H4e: BL submission tenureYears'
		);
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4e: BL +page.svelte submission updated');
	} else if (content.includes('loanTransaction?.loanTenure')) {
		console.log('✓ H4e: BL +page.svelte already updated');
	} else {
		throw new Error('H4e: Could not find tenureYears ref in BL +page.svelte');
	}
}

// H4f: Update Prof +page.svelte submission
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte';
	let content = readFile(relPath);
	if (content.includes('loanTransaction?.tenure')) {
		content = assertReplace(
			content,
			'tenureYears: Number(loanTransaction?.tenure) || undefined,',
			'tenureYears: Number(loanTransaction?.loanTenure) || undefined,',
			'H4f: Prof submission tenureYears'
		);
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4f: Prof +page.svelte submission updated');
	} else if (content.includes('loanTransaction?.loanTenure')) {
		console.log('✓ H4f: Prof +page.svelte already updated');
	} else {
		throw new Error('H4f: Could not find tenureYears ref in Prof +page.svelte');
	}
}

// H4g: Update payloadEnricher.ts — add loanTenure fallback
{
	const relPath = 'src/lib/ruleEngine/payloadEnricher.ts';
	let content = readFile(relPath);
	if (!content.includes('lt?.loanTenure')) {
		content = assertReplace(
			content,
			"if (lt?.mortgageYear === 'OTHER' && lt?.mortgageYearCustom) {",
			"// Unsecured loans use loanTenure; secured loans use mortgageYear. Normalize early.\n\tif (lt?.loanTenure && !lt?.mortgageYear) {\n\t\tlt.mortgageYear = lt.loanTenure;\n\t}\n\n\tif (lt?.mortgageYear === 'OTHER' && lt?.mortgageYearCustom) {",
			'H4g: payloadEnricher loanTenure fallback'
		);
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4g: payloadEnricher.ts loanTenure fallback added');
	} else {
		console.log('✓ H4g: payloadEnricher.ts already has loanTenure fallback');
	}
}

// H4h: Update casePayloadBuilder.ts — add loanTenure to fallback
{
	const relPath = 'src/lib/utils/casePayloadBuilder.ts';
	let content = readFile(relPath);
	if (content.includes('answers.loanTenure')) {
		console.log('✓ H4h: casePayloadBuilder.ts already updated');
	} else {
		content = assertReplace(
			content,
			'tenureYears: toNumber(answers.mortgageYear ?? answers.tenure),',
			'tenureYears: toNumber(answers.loanTenure ?? answers.mortgageYear ?? answers.tenure),',
			'H4h: casePayloadBuilder loanTenure'
		);
		writeFile(relPath, content);
		changes++;
		console.log('✓ H4h: casePayloadBuilder.ts updated');
	}
}

// ═══════════════════════════════════════════════════════════════════════
// Typo fix: registerationCountry → registrationCountry
// ═══════════════════════════════════════════════════════════════════════

const typoFiles = [
	'src/lib/components/AddApplicantBusiness.svelte',
	'src/lib/components/AddApplicantProfessional.svelte',
	'src/lib/components/AddApplicant.svelte',
	'src/lib/components/QuestionRenderer.svelte',
	'src/lib/types/form.ts',
	'src/lib/config/applicantBasicDetailsSecuredLoans.json',
	'src/lib/server/formEngine/schemas/applicantBasicDetailsSecuredLoans.json'
];

for (const relPath of typoFiles) {
	let content = readFile(relPath);
	if (content.includes('registerationCountry')) {
		content = replaceAll(
			content,
			'registerationCountry',
			'registrationCountry',
			`typo: ${path.basename(relPath)}`
		);
		writeFile(relPath, content);
		changes++;
		console.log(`✓ Typo fixed: ${relPath}`);
	} else {
		console.log(`  (skip) ${relPath}: already fixed or no typo`);
	}
}

console.log(`\n✅ Phase 2 remaining complete: ${changes} additional changes`);
