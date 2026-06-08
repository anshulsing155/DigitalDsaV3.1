/**
 * =============================================================================
 * FORM PATH AUDITOR — Static Analysis of Form Schema Paths
 * =============================================================================
 *
 * Statically analyzes commonPage.json and all loan form schemas to detect:
 *   - Dead paths (showWhen conditions that can never be met)
 *   - Missing form questions (payload keys with no schema question)
 *   - Unanswered questions (visible questions that scenarios don't fill)
 *
 * Also produces gap reports for the Form Improvement Pipeline.
 *
 * NOTE: This module imports from $lib/server/ and can only run in
 * server-side or test contexts (not client-side).
 * =============================================================================
 */

import {
	buildReverseMap,
	type ReverseMap,
	type ReverseMapEntry
} from '$lib/server/formEngine/reverseSchemaMap.js';
import { payloadToFormAnswers } from '$lib/server/testing/payloadToFillInstructions.js';
import type { FormPathScenario, FormPath } from './formPathScenarios.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FormPathEntry {
	/** Human label for this path */
	label: string;
	/** The form path answers */
	formPath: FormPath;
	/** The loan schema name used for reverse mapping */
	schemaLoanName: string;
	/** Expected route */
	expectedRoute: string;
}

export interface AuditResult {
	/** All working form paths */
	workingPaths: FormPathEntry[];
	/** Paths that are known dead ends */
	deadPaths: { path: FormPathEntry; reason: string }[];
	/** Total loan types audited */
	loanTypesAudited: string[];
}

export interface ScenarioGapReport {
	scenarioId: string;
	loanName: string;
	loanType: string;
	/** Payload keys that exist in the scenario but have NO matching form question */
	missingFromForm: {
		key: string;
		payloadValue: unknown;
		/** What this field is used for in rule evaluation */
		assessmentPurpose: string;
	}[];
	/** Form questions that ARE visible but the scenario has no value for them */
	unansweredFormQuestions: {
		questionId: string;
		pageId: string;
		questionType: string;
		required: boolean;
	}[];
	/** Coverage score: answered / total questions in reverse map */
	coveragePercent: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Path Map — All possible form paths through how-can-we-help
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All known working form paths after bug fixes.
 * This is the authoritative map — if a path isn't here, it's not supported.
 */
export const ALL_FORM_PATHS: FormPathEntry[] = [
	// Home Loan (4 paths)
	{
		label: 'Home Loan → New Loan',
		schemaLoanName: 'Home Loan',
		expectedRoute: '/form/home-loan',
		formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' }
	},
	{
		label: 'Home Loan → BT With Top-up',
		schemaLoanName: 'Home Loan',
		expectedRoute: '/form/home-loan',
		formPath: { q1_loanName: 'Home Loan', q4_loanType: 'Balance Transfer With Top-up' }
	},
	{
		label: 'Home Loan → BT Only',
		schemaLoanName: 'Home Loan',
		expectedRoute: '/form/home-loan',
		formPath: { q1_loanName: 'Home Loan', q4_loanType: 'Balance Transfer Only' }
	},
	{
		label: 'Home Loan → Top-up Only',
		schemaLoanName: 'Home Loan',
		expectedRoute: '/form/home-loan',
		formPath: { q1_loanName: 'Home Loan', q4_loanType: 'Top-up Only' }
	},

	// LAP Term (4 paths)
	{
		label: 'LAP Term → New Loan',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: { q1_loanName: 'Loan Against Property', q2_facilityType_LAP: 'Term Loan', q4_loanType: 'New Loan' }
	},
	{
		label: 'LAP Term → BT With Top-up',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: {
			q1_loanName: 'Loan Against Property',
			q2_facilityType_LAP: 'Term Loan',
			q4_loanType: 'Balance Transfer With Top-up'
		}
	},
	{
		label: 'LAP Term → BT Only',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: {
			q1_loanName: 'Loan Against Property',
			q2_facilityType_LAP: 'Term Loan',
			q4_loanType: 'Balance Transfer Only'
		}
	},
	{
		label: 'LAP Term → Top-up Only',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: {
			q1_loanName: 'Loan Against Property',
			q2_facilityType_LAP: 'Term Loan',
			q4_loanType: 'Top-up Only'
		}
	},

	// LAP DOD (2 paths)
	{
		label: 'LAP DOD → New Loan',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: {
			q1_loanName: 'Loan Against Property',
			q2_facilityType_LAP: 'Drop-line OverDraft (DOD)',
			q4_loanType: 'New Loan'
		}
	},
	{
		label: 'LAP DOD → BT With Top-up',
		schemaLoanName: 'Loan Against Property',
		expectedRoute: '/form/lap',
		formPath: {
			q1_loanName: 'Loan Against Property',
			q2_facilityType_LAP: 'Drop-line OverDraft (DOD)',
			q4_loanType: 'Balance Transfer With Top-up'
		}
	},

	// Plot Loan — New (4 paths)
	{
		label: 'Plot → Plot Loan Only',
		schemaLoanName: 'Plot Loan',
		expectedRoute: '/form/plot-loan',
		formPath: {
			q1_loanName: 'Plot Loan',
			q2_loanType: 'New Loan',
			q4_loanVariant: 'Plot Loan Only'
		}
	},
	{
		label: 'Plot → Plot & Construction',
		schemaLoanName: 'Plot Loan',
		expectedRoute: '/form/plot-loan',
		formPath: {
			q1_loanName: 'Plot Loan',
			q2_loanType: 'New Loan',
			q4_loanVariant: 'Plot & Construction Loan'
		}
	},
	{
		label: 'Plot → Plot & Equity',
		schemaLoanName: 'Plot Loan',
		expectedRoute: '/form/plot-loan',
		formPath: {
			q1_loanName: 'Plot Loan',
			q2_loanType: 'New Loan',
			q4_loanVariant: 'Plot & Equity Loan'
		}
	},
	{
		label: 'Plot → Construction Only',
		schemaLoanName: 'Plot Loan',
		expectedRoute: '/form/plot-loan',
		formPath: {
			q1_loanName: 'Plot Loan',
			q2_loanType: 'New Loan',
			q4_loanVariant: 'Construction Loan Only'
		}
	},

	// Plot Loan — BT (1 path; no variant question for BT scope)
	{
		label: 'Plot → Balance Transfer',
		schemaLoanName: 'Plot Loan',
		expectedRoute: '/form/plot-loan',
		formPath: {
			q1_loanName: 'Plot Loan',
			q2_loanType: 'Balance Transfer Only'
			// No q4_loanVariant: variant question hides for BT scope.
			// (Pre-rename: `q4_loanType: 'Plot Balance Transfer'` — a non-canonical
			// hybrid string. Fixed S210 audit per ADR-0020 four-field model.)
		}
	},

	// Personal Loan (3 paths)
	{
		label: 'Personal → Start Fresh (with obligations)',
		schemaLoanName: 'Personal Loan',
		expectedRoute: '/form/unsecure-loan/personal',
		formPath: {
			q1_loanName: 'Personal Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'New Loan'
		}
	},
	{
		label: 'Personal → Debt Consolidation',
		schemaLoanName: 'Personal Loan',
		expectedRoute: '/form/unsecure-loan/personal',
		formPath: {
			q1_loanName: 'Personal Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'Debt Consolidation with Extra Funds'
		}
	},
	{
		label: 'Personal → No Obligations (auto-rule)',
		schemaLoanName: 'Personal Loan',
		expectedRoute: '/form/unsecure-loan/personal',
		formPath: {
			q1_loanName: 'Personal Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'No',
			q4_loanType: 'New Loan'
		}
	},

	// Business Loan (3 paths)
	{
		label: 'Business → Start Fresh (with obligations)',
		schemaLoanName: 'Business Loan',
		expectedRoute: '/form/unsecure-loan/business',
		formPath: {
			q1_loanName: 'Business Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'New Loan'
		}
	},
	{
		label: 'Business → Debt Consolidation',
		schemaLoanName: 'Business Loan',
		expectedRoute: '/form/unsecure-loan/business',
		formPath: {
			q1_loanName: 'Business Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'Debt Consolidation with Extra Funds'
		}
	},
	{
		label: 'Business → No Obligations (auto-rule)',
		schemaLoanName: 'Business Loan',
		expectedRoute: '/form/unsecure-loan/business',
		formPath: {
			q1_loanName: 'Business Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'No',
			q4_loanType: 'New Loan'
		}
	},

	// Professional Loan (3 paths)
	{
		label: 'Professional → Start Fresh (with obligations)',
		schemaLoanName: 'Professional Loan',
		expectedRoute: '/form/unsecure-loan/professional',
		formPath: {
			q1_loanName: 'Professional Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'New Loan'
		}
	},
	{
		label: 'Professional → Debt Consolidation',
		schemaLoanName: 'Professional Loan',
		expectedRoute: '/form/unsecure-loan/professional',
		formPath: {
			q1_loanName: 'Professional Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'Yes',
			q4_loanType: 'Debt Consolidation with Extra Funds'
		}
	},
	{
		label: 'Professional → No Obligations (auto-rule)',
		schemaLoanName: 'Professional Loan',
		expectedRoute: '/form/unsecure-loan/professional',
		formPath: {
			q1_loanName: 'Professional Loan',
			q2_facilityType_unsec: 'Term Loan',
			q3_obligationsRunning: 'No',
			q4_loanType: 'New Loan'
		}
	}
];

// ─────────────────────────────────────────────────────────────────────────────
// Path Audit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that all declared form paths have valid schema mappings.
 * Returns working paths and dead paths.
 */
export function auditFormPaths(): AuditResult {
	const workingPaths: FormPathEntry[] = [];
	const deadPaths: { path: FormPathEntry; reason: string }[] = [];
	const loanTypesAudited = new Set<string>();

	for (const entry of ALL_FORM_PATHS) {
		loanTypesAudited.add(entry.schemaLoanName);

		try {
			const reverseMap = buildReverseMap(entry.schemaLoanName);
			if (reverseMap.size === 0) {
				deadPaths.push({
					path: entry,
					reason: `Schema for "${entry.schemaLoanName}" returned empty reverse map`
				});
			} else {
				workingPaths.push(entry);
			}
		} catch (error) {
			deadPaths.push({
				path: entry,
				reason: `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`
			});
		}
	}

	return {
		workingPaths,
		deadPaths,
		loanTypesAudited: Array.from(loanTypesAudited)
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload Key Assessment Purposes (for gap report)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PURPOSES: Record<string, string> = {
	// Loan transaction
	loanName: 'Loan type identification',
	loanType: 'Loan sub-type / BT / topup classification',
	numberOfDirectorOrApplicant: 'Multi-applicant structure determination',
	propertyIdentified: 'Property availability check',
	propertyStateName: 'Location-based rate/policy selection',
	propertyCityName: 'City-tier pricing and policy',
	propertyType: 'LTV ratio and policy rules',
	purchaseType: 'Legal verification requirements',
	constructionType: 'Disbursement schedule / builder risk',
	PropertyStage: 'Construction progress for UC properties',
	propertyComplianceStatus: 'Property compliance gate (authority approval + plan compliance)',
	creditHistoryStatus: 'Credit history gate (defaulter + guarantor status)',
	incomeDocAvailable: 'Income documentation availability (payslips + Form 16)',
	ifPropertyRegistered: 'Registry status for BT eligibility',
	propertyCost: 'LTV calculation numerator',
	propertyValueAsPerATS: 'Agreement-to-sale value validation',
	downPayment: 'LTV calculation (cost minus down payment)',
	RequiredLoanAmount: 'Primary loan sizing',
	mortgageYear: 'Tenure-based EMI and age-at-maturity calculation',

	// BT fields
	selectSingleBank: 'Current lender identification',
	principalOutstanding: 'Takeover amount sizing',
	existingInterestRate: 'Rate reduction benefit calculation',
	remainingTenure: 'Tenure restructuring analysis',
	includedCurrentEMIsAmount: 'FOIR impact of existing loan',
	sixMonthsPassedAfterRegistry: 'BT eligibility timing check',
	currentPropertyValue: 'LTV recalculation for BT',
	newTenure: 'Post-BT tenure planning',
	loanVintage: 'Track record depth assessment',
	repaymentTrack: 'Payment behavior classification',

	// Top-up
	requiredTopupAmount: 'Additional funding need',
	topupTerm: 'Top-up repayment schedule',

	// LAP specific
	carpetArea: 'Property area for valuation',
	carpetAreaUnit: 'Area measurement unit',
	propertyAreaType: 'Zoning/authority classification',
	societyStatus: 'Society/association type for planned areas — affects NOC requirement (LAP)',
	pendingSocietyDues: 'Pending society/authority dues — can block NOC issuance (LAP)',
	approachRoadWidth: 'Approach road width — non-planned areas, affects eligibility (LAP)',
	restrictedZone: 'Restricted/negative zone — non-planned areas, cantonment/CRZ/tribal (LAP)',
	floodDisasterZone: 'Flood/disaster zone affects insurance and valuation (LAP)',
	existingEncumbrance: 'Prior charge on property',
	ocCcAvailable: 'Occupancy/completion certificate status',
	municipalApproval: 'Municipal compliance level',
	loanPurpose: 'End-use classification for LAP',
	rentalIncome: 'Additional income from property',
	dodMonthlyWithdrawal: 'DOD utilization pattern',

	// Residence
	residenceOptionSame: 'Property vs residence location check',
	applicantResidingInProperty: 'Whether applicants reside in mortgaged property (LAP)',
	propertyOccupancyStatus: 'Property occupancy status when not self-occupied (LAP)',
	residenceStateName: 'Residence location for verification',
	residenceCityName: 'Residence city for field investigation',

	// Applicant
	employmentType: 'Income assessment methodology selection',
	ageOfApplicant: 'Age-at-maturity and tenure capping (legacy alias)',
	age: 'Age-at-maturity and tenure capping',
	gender: 'Stamp duty and co-applicant rules',
	maritalStatus: 'Co-applicant requirement rules',
	creditScore: 'Risk grading and rate determination',
	TypeOfResidence: 'Stability assessment',
	isNRI: 'NRI-specific documentation and policy',
	ApplicantIsNRI: 'NRI-specific documentation and policy (PL variant)',
	applicantIsNRI: 'NRI-specific documentation and policy (BL/Prof variant)',
	applicantType: 'Individual vs Company processing path',
	fullName: 'Identity verification',

	// Income
	grossIncome: 'Gross income for FOIR calculation',
	netIncome: 'Net income for eligibility',
	monthlyOtherIncome: 'Additional income sources',
	averageBankBalance: 'Banking relationship strength (legacy alias)',
	tenMonthsAverageBalance: 'Banking relationship strength',
	cashAmount: 'Cash-intensive business assessment (legacy alias)',
	cashSale: 'Cash-intensive business assessment',
	GSTRegistrationYear: 'Business vintage via GST',
	professionType: 'Professional category for specialized policies',
	businessType: 'Business nature classification',
	ObligationsRunning: 'Existing debt burden flag',

	// Company specific
	companyName: 'Entity identification',
	companyType: 'Legal entity classification',
	companyAge: 'Business vintage for company loans',

	// Loan amount aliases (different schemas use different keys)
	loanAmount: 'Primary loan sizing (unsecured)',
	sanctionAmount: 'Primary loan sizing (BT sanction)'
};

// ─────────────────────────────────────────────────────────────────────────────
// Gap Report Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a gap report for a single scenario.
 * Identifies:
 * - Payload keys that don't map to any form question
 * - Form questions that exist but the scenario doesn't fill
 */
export function generateGapReport(scenario: FormPathScenario): ScenarioGapReport {
	// Determine the schema loan name (scenarios use form values directly)
	const schemaLoanName =
		scenario.formPath.q1_loanName === 'Plot Loan' ? 'Plot Loan' : scenario.formPath.q1_loanName;

	// Build flat answers from the scenario's payload
	const flatAnswers = payloadToFormAnswers(scenario.payload);

	// Build reverse map for the loan type
	let reverseMap: ReverseMap;
	try {
		reverseMap = buildReverseMap(schemaLoanName);
	} catch {
		return {
			scenarioId: scenario.id,
			loanName: scenario.formPath.q1_loanName,
			// Display label: prefer q4_loanType (scope for non-Plot); fall back to
			// q4_loanVariant (Plot variant) so Plot rows show their variant in the
			// gap report. S210 audit per ADR-0020.
			loanType:
				scenario.formPath.q4_loanType ??
				scenario.formPath.q4_loanVariant ??
				scenario.formPath.q2_loanType ??
				'',
			missingFromForm: Object.keys(flatAnswers).map((key) => ({
				key,
				payloadValue: flatAnswers[key],
				assessmentPurpose: KEY_PURPOSES[key] || 'Unknown purpose'
			})),
			unansweredFormQuestions: [],
			coveragePercent: 0
		};
	}

	// Find payload keys not in the reverse map
	const missingFromForm: ScenarioGapReport['missingFromForm'] = [];
	const matchedKeys = new Set<string>();

	for (const [key, value] of Object.entries(flatAnswers)) {
		if (reverseMap.has(key)) {
			matchedKeys.add(key);
		} else {
			missingFromForm.push({
				key,
				payloadValue: value,
				assessmentPurpose: KEY_PURPOSES[key] || 'Unknown purpose — may indicate a new field type'
			});
		}
	}

	// Find form questions not covered by the scenario's payload
	const unansweredFormQuestions: ScenarioGapReport['unansweredFormQuestions'] = [];
	let totalQuestionsInMap = 0;

	for (const [storageKey, entry] of reverseMap.entries()) {
		totalQuestionsInMap++;
		if (!flatAnswers[storageKey]) {
			unansweredFormQuestions.push({
				questionId: entry.questionId,
				pageId: entry.pageId,
				questionType: entry.questionType,
				required: entry.required
			});
		}
	}

	// Coverage = matched / total in reverse map
	const coveragePercent =
		totalQuestionsInMap > 0 ? Math.round((matchedKeys.size / totalQuestionsInMap) * 100) : 0;

	return {
		scenarioId: scenario.id,
		loanName: scenario.formPath.q1_loanName,
		// Display label: prefer q4_loanType (scope for non-Plot); fall back to
		// q4_loanVariant (Plot variant); final fallback q2_loanType (Plot BT has
		// no q4 question). S210 audit per ADR-0020.
		loanType:
			scenario.formPath.q4_loanType ??
			scenario.formPath.q4_loanVariant ??
			scenario.formPath.q2_loanType ??
			'',
		missingFromForm,
		unansweredFormQuestions,
		coveragePercent
	};
}

/**
 * Generate gap reports for all scenarios.
 */
export function generateFullGapReport(scenarios: FormPathScenario[]): ScenarioGapReport[] {
	return scenarios.map((s) => generateGapReport(s));
}

/**
 * Get valid form path combinations (loanName + final-axis identifier).
 * Used by archetypes and generators to validate their data.
 *
 * Post-rename (ADR-0020): the "final axis" depends on the path:
 *   - non-Plot: `q4_loanType` (scope)
 *   - Plot New Loan paths: `q4_loanVariant` (variant)
 *   - Plot BT path: `q2_loanType` (scope; no q4 question for Plot BT)
 *
 * Fallback chain captures all three. Updated S210 audit.
 */
export function getValidFormPathCombinations(): Set<string> {
	return new Set(
		ALL_FORM_PATHS.map(
			(p) =>
				`${p.formPath.q1_loanName}|${p.formPath.q4_loanType ?? p.formPath.q4_loanVariant ?? p.formPath.q2_loanType ?? ''}`
		)
	);
}
