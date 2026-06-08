import { describe, it, expect } from 'vitest';
import {
	analyzeRejection,
	REJECTION_CATEGORIES,
	type RejectionAnalysis
} from '$lib/server/rejectionAnalyzer';
import type { Case, LenderApplication, LenderAppStatus } from '$lib/types/case';

// ============================================================================
// TEST HELPERS
// ============================================================================

const NOW = new Date('2026-02-10T12:00:00Z');

/** Minimal case factory */
function makeCase(overrides: Partial<Case> = {}): Case {
	return {
		case_id: 'HL-2026-0001',
		dsa_id: 'test-dsa-id' as any,
		label: 'Test Case',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		stage: 'rejected',
		stage_history: [],
		lender_applications: [],
		created_at: NOW,
		updated_at: NOW,
		is_archived: false,
		is_sample: false,
		...overrides
	} as Case;
}

/** Minimal rejected lender application factory */
function makeRejectedLenderApp(overrides: Partial<LenderApplication> = {}): LenderApplication {
	return {
		lender_application_id: 'la-001',
		lender_id: 'hdfc',
		lender_name: 'HDFC Bank',
		status: 'rejected' as LenderAppStatus,
		status_history: [{ from: 'processing', to: 'rejected', timestamp: NOW }],
		rejection: {
			reason_category: 'cibil_score',
			reason_detail: 'CIBIL score 620, minimum required 700',
			rejection_date: NOW
		},
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: NOW,
		updated_at: NOW,
		...overrides
	} as LenderApplication;
}

/** Sample bank list mimicking bankData */
const ALL_LENDER_NAMES = [
	'HDFC Bank',
	'State Bank of India',
	'ICICI Bank',
	'Axis Bank',
	'Bajaj Finserv',
	'Poonawala Fincorp',
	'IIFL Home Finance',
	'HDB Financial Services',
	'Tata Capital Housing Finance',
	'LIC Housing Finance',
	'PNB Housing Finance',
	'Aadhar Housing Finance',
	'Kotak Mahindra Bank'
];

const BANK_CLASSIFICATIONS: Record<string, string> = {
	'HDFC Bank': 'PVT',
	'State Bank of India': 'GOV',
	'ICICI Bank': 'PVT',
	'Axis Bank': 'PVT',
	'Bajaj Finserv': 'NBFC',
	'Poonawala Fincorp': 'NBFC',
	'IIFL Home Finance': 'NBFC',
	'HDB Financial Services': 'NBFC',
	'Tata Capital Housing Finance': 'NBFC',
	'LIC Housing Finance': 'NBFC',
	'PNB Housing Finance': 'NBFC',
	'Aadhar Housing Finance': 'NBFC',
	'Kotak Mahindra Bank': 'PVT'
};

// ============================================================================
// REJECTION CATEGORIES — STRUCTURAL TESTS
// ============================================================================

describe('REJECTION_CATEGORIES — structure', () => {
	it('has all 10 expected categories', () => {
		expect(REJECTION_CATEGORIES).toHaveLength(10);
	});

	it('each category has value, label, and non-empty prevention_tips', () => {
		for (const cat of REJECTION_CATEGORIES) {
			expect(cat.value).toBeTruthy();
			expect(cat.label).toBeTruthy();
			expect(Array.isArray(cat.prevention_tips)).toBe(true);
			expect(cat.prevention_tips.length).toBeGreaterThan(0);
		}
	});

	const expectedValues = [
		'cibil_score',
		'income_insufficient',
		'high_obligations',
		'property_issues',
		'documentation_issues',
		'employer_not_approved',
		'age_criteria',
		'profile_mismatch',
		'internal_policy',
		'other'
	];

	it.each(expectedValues)('has category "%s"', (value) => {
		const found = REJECTION_CATEGORIES.find((cat) => cat.value === value);
		expect(found).toBeDefined();
	});
});

// ============================================================================
// analyzeRejection — CORE FUNCTIONALITY
// ============================================================================

describe('analyzeRejection — all 10 categories produce valid analysis', () => {
	const categories = REJECTION_CATEGORIES.map((cat) => cat.value);

	it.each(categories)('category "%s" produces valid RejectionAnalysis', (category) => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: category,
				reason_detail: `Rejected for ${category}`,
				rejection_date: NOW
			}
		});

		const c = makeCase({
			lender_applications: [la]
		});

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		expect(analysis.case_id).toBe('HL-2026-0001');
		expect(analysis.lender_name).toBe('HDFC Bank');
		expect(analysis.reason_category).toBe(category);
		expect(analysis.reason_detail).toBeTruthy();
		expect(Array.isArray(analysis.suggestions)).toBe(true);
		expect(Array.isArray(analysis.prevention_tips)).toBe(true);
		expect(analysis.prevention_tips.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// REROUTE SUGGESTIONS
// ============================================================================

describe('analyzeRejection — reroute suggestions', () => {
	it('suggestions exclude existing lenders in the case', () => {
		const existingLa = makeRejectedLenderApp({
			lender_application_id: 'la-001',
			lender_name: 'HDFC Bank'
		});

		const anotherLa: LenderApplication = {
			...makeRejectedLenderApp({
				lender_application_id: 'la-002',
				lender_name: 'ICICI Bank',
				status: 'processing' as LenderAppStatus
			})
		};

		const c = makeCase({
			lender_applications: [existingLa, anotherLa]
		});

		const analysis = analyzeRejection(existingLa, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		const suggestedNames = analysis.suggestions.map((s) => s.lender_name);
		expect(suggestedNames).not.toContain('HDFC Bank');
		expect(suggestedNames).not.toContain('ICICI Bank');
	});

	it('returns max 3 suggestions', () => {
		const la = makeRejectedLenderApp();
		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);
		expect(analysis.suggestions.length).toBeLessThanOrEqual(3);
	});

	it('each suggestion has lender_name, reason, and confidence', () => {
		const la = makeRejectedLenderApp();
		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		for (const suggestion of analysis.suggestions) {
			expect(suggestion.lender_name).toBeTruthy();
			expect(suggestion.reason).toBeTruthy();
			expect(suggestion.confidence).toMatch(/^(high|medium|low)$/);
		}
	});

	it('CIBIL rejection suggests NBFC lenders', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'cibil_score',
				reason_detail: 'Low CIBIL score',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		// At least one suggestion should be an NBFC
		const nbfcSuggestions = analysis.suggestions.filter(
			(s) => BANK_CLASSIFICATIONS[s.lender_name] === 'NBFC'
		);
		expect(nbfcSuggestions.length).toBeGreaterThan(0);
	});

	it('income rejection includes tip about adding co-applicant', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'income_insufficient',
				reason_detail: 'Monthly income below threshold',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		const hasCoApplicantTip = analysis.prevention_tips.some((tip) =>
			tip.toLowerCase().includes('co-applicant')
		);
		expect(hasCoApplicantTip).toBe(true);
	});

	it('employer_not_approved suggests NBFC lenders with broader lists', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'employer_not_approved',
				reason_detail: 'Employer not on approved list',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		const nbfcSuggestions = analysis.suggestions.filter(
			(s) => BANK_CLASSIFICATIONS[s.lender_name] === 'NBFC'
		);
		expect(nbfcSuggestions.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('analyzeRejection — edge cases', () => {
	it('unknown rejection category falls back to "other"', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'unknown_reason',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		// Should still produce valid analysis (falls back to "other" tips)
		expect(analysis.prevention_tips.length).toBeGreaterThan(0);
		expect(analysis.reason_category).toBe('unknown_reason');
	});

	it('missing rejection object falls back gracefully', () => {
		const la = makeRejectedLenderApp();
		// Remove rejection
		(la as any).rejection = undefined;

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		expect(analysis.reason_category).toBe('other');
		expect(analysis.prevention_tips.length).toBeGreaterThan(0);
	});

	it('empty allLenderNames returns empty suggestions', () => {
		const la = makeRejectedLenderApp();
		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, [], BANK_CLASSIFICATIONS);

		expect(analysis.suggestions).toHaveLength(0);
	});

	it('all lenders already in case returns empty suggestions', () => {
		// Create a case where all possible lenders are already applications
		const lenderApps = ALL_LENDER_NAMES.map((name, i) =>
			makeRejectedLenderApp({
				lender_application_id: `la-${i}`,
				lender_name: name,
				status: i === 0 ? 'rejected' : ('processing' as LenderAppStatus)
			})
		);

		const c = makeCase({ lender_applications: lenderApps });
		const la = lenderApps[0];

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		expect(analysis.suggestions).toHaveLength(0);
	});

	it('works without bankClassifications parameter', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'cibil_score',
				reason_detail: 'Low score',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		// Call without classifications — should still work
		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES);

		expect(analysis.suggestions.length).toBeGreaterThan(0);
		expect(analysis.prevention_tips.length).toBeGreaterThan(0);
	});

	it('property_issues rejection produces property-related tips', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'property_issues',
				reason_detail: 'Title not clear',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		const hasPropertyTip = analysis.prevention_tips.some(
			(tip) => tip.toLowerCase().includes('property') || tip.toLowerCase().includes('legal')
		);
		expect(hasPropertyTip).toBe(true);
	});

	it('documentation_issues rejection produces documentation-related tips', () => {
		const la = makeRejectedLenderApp({
			rejection: {
				reason_category: 'documentation_issues',
				reason_detail: 'Missing ITR',
				rejection_date: NOW
			}
		});

		const c = makeCase({ lender_applications: [la] });

		const analysis = analyzeRejection(la, c, ALL_LENDER_NAMES, BANK_CLASSIFICATIONS);

		const hasDocTip = analysis.prevention_tips.some(
			(tip) =>
				tip.toLowerCase().includes('document') || tip.toLowerCase().includes('bank statement')
		);
		expect(hasDocTip).toBe(true);
	});
});
