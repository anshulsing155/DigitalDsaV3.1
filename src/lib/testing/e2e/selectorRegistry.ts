/**
 * Selector Registry
 * ══════════════════════════════════════════════════════════════════
 * Central registry of all Playwright selectors used across E2E tests.
 * Used by selectorHealth.spec.ts to verify selectors still resolve
 * to DOM elements after UI changes.
 *
 * Each entry documents: what it targets, which page it's on, and
 * which helper file uses it — so broken selectors are immediately
 * traceable to the code that needs updating.
 * ══════════════════════════════════════════════════════════════════
 */

export interface SelectorEntry {
	/** Human-readable name */
	name: string;
	/** CSS/Playwright selector string */
	selector: string;
	/** Which page context this selector is expected on */
	page: 'how-can-we-help' | 'form-schema' | 'applicant' | 'income-modal' | 'global';
	/** Source file:function that uses this selector */
	source: string;
	/** If true, selector is parameterized — health check uses the example value */
	parameterized?: boolean;
}

// ============================================================================
// Navigation & Global Selectors
// ============================================================================

const NAVIGATION_SELECTORS: SelectorEntry[] = [
	{
		name: 'Next button (go to next step)',
		selector: 'button[aria-label="Go to next step"]',
		page: 'form-schema',
		source: 'formHelpers.ts:clickNext'
	},
	{
		name: 'Next button (aria-label Next)',
		selector: 'button[aria-label="Next"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:clickNext'
	},
	{
		name: 'Next button (text fallback)',
		selector: 'button:has-text("Next")',
		page: 'global',
		source: 'formHelpers.ts:clickNext'
	},
	{
		name: 'Previous button',
		selector: 'button[aria-label="Go to previous step"]',
		page: 'form-schema',
		source: 'formHelpers.ts:clickPrevious'
	},
	{
		name: 'Resume modal dismiss button',
		selector: 'button:has-text("Start Fresh")',
		page: 'global',
		source: 'formHelpers.ts:dismissFormResumeModal'
	}
];

// ============================================================================
// How-Can-We-Help Selectors
// ============================================================================

const HOW_CAN_WE_HELP_SELECTORS: SelectorEntry[] = [
	{
		name: 'Q1 Loan Name container',
		selector: '[data-question-id="q1_loanName"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	},
	{
		name: 'Q2 LAP Facility Type container',
		selector: '[data-question-id="q2_facilityType_LAP"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	},
	{
		name: 'Q2 Plot Scope container',
		selector: '[data-question-id="q2_loanType"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	},
	{
		name: 'Q2 Unsecured Facility Type container',
		selector: '[data-question-id="q2_facilityType_unsec"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	},
	{
		name: 'Q3 Obligations Running container',
		selector: '[data-question-id="q3_obligationsRunning"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	},
	{
		name: 'Q4 Loan Type container',
		selector: '[data-question-id="q4_loanType"]',
		page: 'how-can-we-help',
		source: 'formHelpers.ts:navigateToLoanForm'
	}
];

// ============================================================================
// Schema Page Selectors (form questions)
// ============================================================================

const SCHEMA_PAGE_SELECTORS: SelectorEntry[] = [
	{
		name: 'Radio option label pattern',
		selector: 'label:has(input[type="radio"])',
		page: 'form-schema',
		source: 'formHelpers.ts:selectRadio',
		parameterized: true
	},
	{
		name: 'Text input by ID pattern',
		selector: 'input[type="text"]',
		page: 'form-schema',
		source: 'formHelpers.ts:fillText',
		parameterized: true
	},
	{
		name: 'Custom select dropdown trigger',
		selector: 'button[role="combobox"], button[aria-haspopup="listbox"]',
		page: 'form-schema',
		source: 'formHelpers.ts:selectOption',
		parameterized: true
	},
	{
		name: 'Select option list item',
		selector: 'li[role="option"]',
		page: 'form-schema',
		source: 'formHelpers.ts:selectOption',
		parameterized: true
	},
	{
		name: 'Currency input pattern',
		selector: 'input[inputmode="numeric"]',
		page: 'form-schema',
		source: 'formHelpers.ts:fillCurrency',
		parameterized: true
	},
	{
		name: 'Loading spinner (location cascade)',
		selector: '.spinner-ring',
		page: 'form-schema',
		source: 'dataFillHelpers.ts:tryFillQuestion'
	},
	{
		name: 'Question container (data-question-id)',
		selector: '[data-question-id]',
		page: 'form-schema',
		source: 'formHelpers.ts:waitForQuestion',
		parameterized: true
	}
];

// ============================================================================
// Applicant Page Selectors
// ============================================================================

const APPLICANT_SELECTORS: SelectorEntry[] = [
	{
		name: 'Applicant type radio (Individual)',
		selector: 'label:has(input[name="applicantType"][value="Individual"])',
		page: 'applicant',
		source: 'customPageFillers.ts:fillApplicantPage'
	},
	{
		name: 'Applicant type radio (Company)',
		selector: 'label:has(input[name="applicantType"][value="Company"])',
		page: 'applicant',
		source: 'customPageFillers.ts:fillApplicantPage'
	},
	{
		name: 'Add Applicants button',
		selector: 'button:has-text("Add Applicants")',
		page: 'applicant',
		source: 'customPageFillers.ts:addSingleApplicant'
	},
	{
		name: 'Update Applicant button',
		selector: 'button:has-text("Update Applicant")',
		page: 'applicant',
		source: 'customPageFillers.ts:addSingleApplicant'
	},
	{
		name: 'Applicant summary table',
		selector: 'table',
		page: 'applicant',
		source: 'ApplicantSummaryTable.svelte'
	}
];

// ============================================================================
// Income Modal Selectors
// ============================================================================

const INCOME_MODAL_SELECTORS: SelectorEntry[] = [
	{
		name: 'Modal tab button (Step N pattern)',
		selector: 'button[aria-label*="Step"]',
		page: 'income-modal',
		source: 'customPageFillers.ts:clickModalTab'
	},
	{
		name: 'Income profile card (clickable)',
		selector: 'button:has-text("Salaried")',
		page: 'income-modal',
		source: 'customPageFillers.ts:fillIncomeProfiles'
	}
];

// ============================================================================
// Full Registry
// ============================================================================

export const SELECTOR_REGISTRY: SelectorEntry[] = [
	...NAVIGATION_SELECTORS,
	...HOW_CAN_WE_HELP_SELECTORS,
	...SCHEMA_PAGE_SELECTORS,
	...APPLICANT_SELECTORS,
	...INCOME_MODAL_SELECTORS
];

/**
 * Get selectors filtered by page context.
 */
export function getSelectorsForPage(page: SelectorEntry['page']): SelectorEntry[] {
	return SELECTOR_REGISTRY.filter((s) => s.page === page || s.page === 'global');
}
