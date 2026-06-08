/**
 * Phase 1: Quick Bug Fixes for unsecured loan forms
 * C1: Fix unSecureLoanType fallback in evaluateOnServer + combinedAnswers
 * C2: Populate __individualApplicantCount
 * H3: Remove LAPType from all 3 unsecured forms
 * H1: Clear businessPincode when businessStateName changes (BL)
 * H2: Fix GST auto-fill target (BL) — businessStateName not residenceStateName
 * M1: Remove dead q6_salariedBankName export (PL location.ts)
 * M2: Reset showCityLoadingModal on navigation
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

function readFile(relPath) {
	const raw = fs.readFileSync(path.join(BASE, relPath), 'utf8');
	return raw;
}

function writeFile(relPath, content) {
	fs.writeFileSync(path.join(BASE, relPath), content, 'utf8');
}

// Use \r?\n aware matching — normalize to LF for matching, preserve original line endings
function assertReplace(content, searchLF, replacementLF, label) {
	// Detect line ending style
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	// Convert search/replacement from LF to the file's EOL style
	const search = searchLF.replace(/\n/g, eol);
	const replacement = replacementLF.replace(/\n/g, eol);

	if (!content.includes(search)) {
		// Debug: show first 50 chars around expected location
		const simpleSearch = searchLF.split('\n')[0];
		const idx = content.indexOf(simpleSearch);
		if (idx >= 0) {
			const snippet = content
				.substring(idx, idx + 200)
				.replace(/\r/g, '\\r')
				.replace(/\n/g, '\\n');
			throw new Error(`[${label}] Found first line but full match failed. Snippet:\n${snippet}`);
		}
		throw new Error(`[${label}] Could not find search string (even first line missing)`);
	}
	const count = content.split(search).length - 1;
	if (count > 1) {
		throw new Error(`[${label}] Found ${count} occurrences (expected 1)`);
	}
	return content.replace(search, replacement);
}

let changes = 0;

// ── Helper for common changes across all 3 forms ──

function applyCommonFixes(relPath, formLabel) {
	let content = readFile(relPath);

	// C1 + H3: In evaluateOnServer — replace LAPType with unSecureLoanType
	content = assertReplace(
		content,
		"answers['loanType'] = rawAnswers.loanType ?? '';\n\t\tanswers['LAPType'] = rawAnswers.LAPType ?? '';",
		"answers['loanType'] = rawAnswers.loanType ?? '';\n\t\tanswers['unSecureLoanType'] = rawAnswers.unSecureLoanType ?? '';",
		`${formLabel}: evaluateOnServer LAPType→unSecureLoanType`
	);
	changes++;

	// C2: In evaluateOnServer — add __individualApplicantCount after __multiApplicantMode
	content = assertReplace(
		content,
		"answers['__multiApplicantMode'] = formState.applicants.length > 1;",
		"answers['__multiApplicantMode'] = formState.applicants.length > 1;\n\t\tanswers['__individualApplicantCount'] = formState.applicants.filter(a => a.applicantType === 'Individual').length;",
		`${formLabel}: evaluateOnServer __individualApplicantCount`
	);
	changes++;

	// C1 + H3: In combinedAnswers — replace LAPType with unSecureLoanType
	content = assertReplace(
		content,
		"combined['loanType'] = (currentAnswers as Record<string, unknown>).loanType ?? '';\n\t\tcombined['LAPType'] = (currentAnswers as Record<string, unknown>).LAPType ?? '';",
		"combined['loanType'] = (currentAnswers as Record<string, unknown>).loanType ?? '';\n\t\tcombined['unSecureLoanType'] = (currentAnswers as Record<string, unknown>).unSecureLoanType ?? '';",
		`${formLabel}: combinedAnswers LAPType→unSecureLoanType`
	);
	changes++;

	// C2: In combinedAnswers — add __individualApplicantCount after __multiApplicantMode
	content = assertReplace(
		content,
		"combined['__multiApplicantMode'] = !isSingleApplicant;",
		"combined['__multiApplicantMode'] = !isSingleApplicant;\n\t\tcombined['__individualApplicantCount'] = formState.applicants.filter(a => a.applicantType === 'Individual').length;",
		`${formLabel}: combinedAnswers __individualApplicantCount`
	);
	changes++;

	// M2: Reset showCityLoadingModal in goNext
	content = assertReplace(
		content,
		'direction = 1;\n\t\tevaluating = true;',
		'direction = 1;\n\t\tevaluating = true;\n\t\tshowCityLoadingModal = false;',
		`${formLabel}: goNext showCityLoadingModal reset`
	);
	changes++;

	// M2: Reset showCityLoadingModal in goPrev
	content = assertReplace(
		content,
		'direction = -1;\n\t\tevaluating = true;',
		'direction = -1;\n\t\tevaluating = true;\n\t\tshowCityLoadingModal = false;',
		`${formLabel}: goPrev showCityLoadingModal reset`
	);
	changes++;

	writeFile(relPath, content);
	console.log(`✓ ${formLabel}: 6 common fixes applied`);
}

// ── Apply common fixes to all 3 forms ──
applyCommonFixes('src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte', 'PL');
applyCommonFixes('src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte', 'BL');
applyCommonFixes('src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte', 'Prof');

// ── H1: Clear businessPincode when businessStateName changes (BL only) ──
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte';
	let content = readFile(relPath);

	content = assertReplace(
		content,
		"} else if (key === 'businessStateName') {\n\t\t\tupdateAnswerByKey('businessCityName', '');\n\t\t}",
		"} else if (key === 'businessStateName') {\n\t\t\tupdateAnswerByKey('businessCityName', '');\n\t\t\tupdateAnswerByKey('businessPincode', '');\n\t\t}",
		'BL: H1 clear businessPincode on state change'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ BL: H1 businessPincode clear applied');
}

// ── H2: Fix GST auto-fill target (BL only) ──
{
	const relPath = 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte';
	let content = readFile(relPath);

	content = assertReplace(
		content,
		"if (errorKey) {\n\t\t\t\tupdateAnswerByKey('residenceStateName', '');\n\t\t\t\tgstStateError = '';\n\t\t\t} else {\n\t\t\t\tconst stateName = gstStateCodes[gstNumber.substring(0, 2) as keyof typeof gstStateCodes];\n\t\t\t\tupdateAnswerByKey('residenceStateName', stateName);",
		"if (errorKey) {\n\t\t\t\tupdateAnswerByKey('businessStateName', '');\n\t\t\t\tgstStateError = '';\n\t\t\t} else {\n\t\t\t\tconst stateName = gstStateCodes[gstNumber.substring(0, 2) as keyof typeof gstStateCodes];\n\t\t\t\tupdateAnswerByKey('businessStateName', stateName);",
		'BL: H2 GST → businessStateName'
	);
	changes++;

	writeFile(relPath, content);
	console.log('✓ BL: H2 GST auto-fill target fixed');
}

// ── M1: Remove dead q6_salariedBankName export (PL location.ts) ──
{
	const relPath = 'src/lib/config/personalLoan/questionBank/location.ts';
	let content = readFile(relPath);
	const hasCRLF = content.includes('\r\n');
	const eol = hasCRLF ? '\r\n' : '\n';

	const startMarker = `/**${eol} * Salary bank question`;
	const endMarker = `};${eol}${eol}/** Returns all questions`;

	const startIdx = content.indexOf(startMarker);
	const endIdx = content.indexOf(endMarker);

	if (startIdx === -1 || endIdx === -1) {
		throw new Error(
			`M1: Could not find q6_salariedBankName block boundaries (start=${startIdx}, end=${endIdx})`
		);
	}

	// Remove from startMarker to after the closing `};` + blank line
	content = content.substring(0, startIdx) + content.substring(endIdx + `};${eol}${eol}`.length);
	changes++;

	writeFile(relPath, content);
	console.log('✓ PL: M1 dead q6_salariedBankName export removed');
}

console.log(`\n✅ Phase 1 complete: ${changes} changes applied across files`);
