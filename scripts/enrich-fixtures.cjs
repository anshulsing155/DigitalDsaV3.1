/**
 * Enriches fixture scenarios with missing fields for E2E coverage.
 * Run: node scripts/enrich-fixtures.cjs
 *
 * Adds priorAssessmentHistory, propertyUsageIntent, auctionPropertyStatus,
 * marketValue, registryValue, registryTimeline, documentationReadiness,
 * and other missing fields to all 25 fixture scenarios.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
	__dirname,
	'..',
	'src',
	'lib',
	'testing',
	'scenarios',
	'formPathScenarios.ts'
);
let content = fs.readFileSync(filePath, 'utf-8');
let changeCount = 0;

function insertField(chunk, fieldName, fieldValue, anchor, before = true) {
	if (chunk.includes(fieldName + ':')) return chunk;
	const idx = chunk.indexOf(anchor);
	if (idx < 0) return chunk;
	const lineStart = chunk.lastIndexOf('\n', idx) + 1;
	const indent = chunk.substring(lineStart, idx).match(/^\s*/)?.[0] || '\t\t\t';
	const line = `${indent}${fieldName}: ${fieldValue},\n`;
	if (before) {
		changeCount++;
		return chunk.substring(0, lineStart) + line + chunk.substring(lineStart);
	} else {
		const lineEnd = chunk.indexOf('\n', idx);
		changeCount++;
		return chunk.substring(0, lineEnd + 1) + line + chunk.substring(lineEnd + 1);
	}
}

function enrichScenario(scenarioName, fieldMap, anchorField) {
	const start = content.indexOf('const ' + scenarioName + ': FormPathScenario');
	if (start === -1) return;
	const nextIdx = content.indexOf('\nconst ', start + 10);
	const end = nextIdx > 0 ? nextIdx : content.length;
	let chunk = content.substring(start, end);

	for (const [field, value] of Object.entries(fieldMap)) {
		chunk = insertField(chunk, field, value, anchorField);
	}

	content = content.substring(0, start) + chunk + content.substring(end);
}

// ── HOME LOAN: common fields ──────────────────────────────
const hlCommon = {
	priorAssessmentHistory: "'first_assessment'",
	propertyUsageIntent: "'SELF_USE'",
	auctionPropertyStatus: "'STANDARD'",
	successionStatus: "'NOT_INHERITED'",
	revenueRecordMutation: "'MUTATED'"
};

// HL_NEW_SAL_CLEAN already enriched manually — skip
['HL_NEW_SE_PRO', 'HL_NEW_PENS', 'HL_BT_ONLY', 'HL_BT_TOPUP', 'HL_TOPUP'].forEach((name) => {
	enrichScenario(name, hlCommon, 'titleChainStatus');
});

// Add marketValue/registryValue to HL scenarios that have propertyCost
['HL_NEW_SE_PRO', 'HL_NEW_PENS'].forEach((name) => {
	const start = content.indexOf('const ' + name + ': FormPathScenario');
	if (start === -1) return;
	const nextIdx = content.indexOf('\nconst ', start + 10);
	const end = nextIdx > 0 ? nextIdx : content.length;
	let chunk = content.substring(start, end);

	const costMatch = chunk.match(/propertyCost:\s*(\d+)/);
	if (costMatch && !chunk.includes('marketValue:')) {
		const cost = parseInt(costMatch[1]);
		chunk = insertField(chunk, 'marketValue', String(Math.round(cost * 1.07)), 'titleChainStatus');
		chunk = insertField(
			chunk,
			'registryValue',
			String(Math.round(cost * 0.97)),
			'titleChainStatus'
		);
		chunk = insertField(chunk, 'registryTimeline', "'WITHIN_3_MONTHS'", 'titleChainStatus');
	}

	if (!chunk.includes('documentationReadiness:')) {
		chunk = insertField(
			chunk,
			'documentationReadiness',
			"['title_deed', 'sale_agreement', 'ec']",
			'titleChainStatus'
		);
	}

	content = content.substring(0, start) + chunk + content.substring(end);
});

// ── BT-specific fields ──────────────────────────────────
const btFields = {
	interestRateType: "'FLOATING'",
	emiBounceHistory: "'0'",
	nocFromPreviousLender: "'YES'"
};

['HL_BT_ONLY', 'HL_BT_TOPUP', 'HL_TOPUP'].forEach((name) => {
	enrichScenario(name, btFields, 'loanVintage');
});

// ── LAP enrichments ──────────────────────────────────────
const lapFields = {
	propertyAcquisitionMethod: "'PURCHASED'",
	originalDocumentsAvailable: "'YES'",
	ownershipChainComplete: "'YES'",
	noLegalDispute: "'YES'",
	encumbranceCertificateVerified: "'YES'"
};

['LAP_NEW_TERM', 'LAP_BT_TERM', 'LAP_TOPUP_TERM', 'LAP_BT_TOPUP', 'LAP_DOD_NEW'].forEach((name) => {
	enrichScenario(name, lapFields, 'loanPurpose');
});

// ── Unsecured common fields ──────────────────────────────
[
	'PL_FRESH_YES_OBLIG',
	'PL_CONSOL',
	'PL_NO_OBLIG',
	'BL_FRESH_YES_OBLIG',
	'BL_CONSOL',
	'BL_NO_OBLIG',
	'PROF_FRESH_YES_OBLIG',
	'PROF_CONSOL',
	'PROF_NO_OBLIG'
].forEach((name) => {
	enrichScenario(
		name,
		{
			urgencyLevel: "'STANDARD'",
			existingBankRelationship: "'YES'"
		},
		'tenureYears'
	);
});

// ── Business loan applicant fields ────────────────────────
['BL_FRESH_YES_OBLIG', 'BL_CONSOL', 'BL_NO_OBLIG'].forEach((name) => {
	const start = content.indexOf('const ' + name + ': FormPathScenario');
	if (start === -1) return;
	const nextIdx = content.indexOf('\nconst ', start + 10);
	const end = nextIdx > 0 ? nextIdx : content.length;
	let chunk = content.substring(start, end);

	if (!chunk.includes('businessEntityType:')) {
		chunk = insertField(chunk, 'businessEntityType', "'Proprietorship'", 'employmentType:', false);
		chunk = insertField(chunk, 'businessIndustrySector', "'Trading'", 'businessEntityType:');
		chunk = insertField(chunk, 'businessVintage', "'3-5yr'", 'businessEntityType:');
		chunk = insertField(chunk, 'gstRegistrationStatus', "'REGISTERED'", 'businessEntityType:');
		chunk = insertField(chunk, 'annualTurnoverRange', "'1CR_5CR'", 'businessEntityType:');
		chunk = insertField(chunk, 'numberOfEmployees', "'11_50'", 'businessEntityType:');
	}

	content = content.substring(0, start) + chunk + content.substring(end);
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`Fixture enrichment complete: ${changeCount} fields added`);
