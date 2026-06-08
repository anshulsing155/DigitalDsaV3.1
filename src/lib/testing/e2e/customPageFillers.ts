/**
 * Custom Page Fill Executors
 * ══════════════════════════════════════════════════════════════════
 * Playwright-based fill functions for custom component pages that
 * are NOT schema-driven (applicant, income, credit, obligations).
 *
 * Each function uses Playwright selectors matched to the actual
 * component DOM rendered by AddApplicant, IncomePageNew, etc.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Page } from '@playwright/test';
import type { CustomPageFill } from '$lib/server/testing/payloadToFillInstructions';

const WAIT = 300;
const LONG_WAIT = 800;

// ============================================================================
// Dispatcher
// ============================================================================

/**
 * Execute a custom page fill by strategy type.
 */
export async function executeCustomFill(page: Page, fill: CustomPageFill): Promise<void> {
	switch (fill.strategy) {
		case 'applicant-add':
			await fillApplicantPage(page, fill.data);
			break;
		case 'income-profiles':
			await fillIncomeProfiles(page, fill.data);
			break;
		case 'income-details':
			await fillIncomeDetails(page, fill.data);
			break;
		case 'credit-score':
			await fillCreditScore(page, fill.data);
			break;
		case 'obligations':
			await fillObligations(page, fill.data);
			break;
		case 'applicant-profile':
			// Applicant profile page has mostly optional fields — skip for now
			break;
	}
}

// ============================================================================
// Applicant Page (AddApplicant + ApplicantFormSecured)
// ============================================================================

/**
 * Fill the applicant page by adding each applicant.
 *
 * The page renders ApplicantFormSecured which has internal steps:
 *   Step 0: AddApplicant (add/edit form + summary table)
 *   Step 1: Relationships (only for 2+ individuals)
 *   Step 2: GPA (only for NRI)
 *   Step 3: Income (IncomePageNew modal)
 *
 * For E2E, we handle Step 0 (add applicants) and let the parent
 * orchestrator handle navigating past steps 1-3.
 */
async function fillApplicantPage(page: Page, data: Record<string, unknown>): Promise<void> {
	const applicants = (data.applicants ?? []) as Array<Record<string, unknown>>;
	if (applicants.length === 0) return;

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];
		await addSingleApplicant(page, applicant, i === 0);
	}
}

/**
 * Add a single applicant by filling the ApplicantFormCard fields.
 */
async function addSingleApplicant(
	page: Page,
	applicant: Record<string, unknown>,
	isFirst: boolean
): Promise<void> {
	const type = String(applicant.applicantType || 'Individual');

	// Select applicant type (Individual / Company)
	// The radio buttons use QuestionRenderer with key="applicantType"
	const typeLabel = page.locator(`label:has(input[name="applicantType"][value="${type}"])`);
	try {
		await typeLabel.waitFor({ state: 'visible', timeout: 5000 });
		await typeLabel.click();
		await page.waitForTimeout(LONG_WAIT);
	} catch {
		// Type selector might not be visible if editing existing
	}

	if (type === 'Individual') {
		await fillIndividualFields(page, applicant);
	} else {
		await fillCompanyFields(page, applicant);
	}

	// Click the save/add button
	const saveBtn = page
		.locator(
			'button:has-text("Add Applicants"), button:has-text("Update Applicant"), button:has-text("Save")'
		)
		.first();
	try {
		await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
		await saveBtn.click();
		await page.waitForTimeout(LONG_WAIT);
	} catch {
		// Button might have different text
	}
}

/**
 * Fill Individual applicant fields.
 */
async function fillIndividualFields(page: Page, applicant: Record<string, unknown>): Promise<void> {
	// Applicant sub-type (Person / Sole Proprietor)
	await trySelectDropdown(
		page,
		'applicantSubType',
		String(applicant.applicantSubType || 'individual')
	);

	// Full name
	await tryFillInput(page, 'fullName', String(applicant.fullName || 'Test User'));

	// Gender
	await trySelectDropdown(page, 'gender', String(applicant.gender || 'Male'));

	// Age
	await tryFillInput(page, 'age', String(applicant.age || '30'));

	// Marital status
	await trySelectDropdown(page, 'maritalStatus', String(applicant.maritalStatus || 'Single'));

	// NRI status
	await trySelectDropdown(page, 'isNRI', String(applicant.isNRI || 'No'));

	// On Property (boolean select — Yes/No rendered as radio-style buttons)
	if (applicant.onProperty) {
		await tryBooleanSelect(page, 'onProperty', String(applicant.onProperty));
	}

	// On EMI (boolean select)
	if (applicant.onEMI) {
		await tryBooleanSelect(page, 'onEMI', String(applicant.onEMI));
	}
}

/**
 * Fill Company applicant fields.
 */
async function fillCompanyFields(page: Page, applicant: Record<string, unknown>): Promise<void> {
	if (applicant.companyType) {
		await trySelectDropdown(page, 'companyType', String(applicant.companyType));
	}
	if (applicant.companyName) {
		await tryFillInput(page, 'companyName', String(applicant.companyName));
	}

	// On Property / On EMI for company
	if (applicant.onProperty) {
		await tryBooleanSelect(page, 'onProperty', String(applicant.onProperty));
	}
	if (applicant.onEMI) {
		await tryBooleanSelect(page, 'onEMI', String(applicant.onEMI));
	}
}

// ============================================================================
// Income Profiles Page (Tab 2 of IncomePageNew)
// ============================================================================

/**
 * Select the appropriate income profile card.
 *
 * Income profile cards are rendered as clickable cards with the profile type name.
 * We click the card matching the applicant's employment type.
 */
async function fillIncomeProfiles(page: Page, data: Record<string, unknown>): Promise<void> {
	const profileType = String(data.profileType || 'salaried_regular');

	// Map profile types to card display labels
	const PROFILE_LABELS: Record<string, string> = {
		salaried_regular: 'Salaried',
		salaried_contractual: 'Contractual',
		business_proprietorship: 'Business',
		business_partnership: 'Partnership',
		director_company: 'Director',
		professional_practice: 'Professional',
		pension: 'Pension',
		rental_income: 'Rental',
		freelance_consulting: 'Freelance',
		agriculture_income: 'Agriculture',
		investment_income: 'Investment',
		no_current_income: 'No Current Income'
	};

	const label = PROFILE_LABELS[profileType] || 'Salaried';

	// Navigate to income profiles tab if not already there
	await clickModalTab(page, 'Income');

	// Click the profile card
	const card = page
		.locator(`button:has-text("${label}"), [data-profile-type="${profileType}"]`)
		.first();
	try {
		await card.waitFor({ state: 'visible', timeout: 5000 });
		await card.click();
		await page.waitForTimeout(WAIT);
	} catch {
		// Card might have different label format — try partial match
		const partialCard = page.locator(`text=${label}`).first();
		try {
			await partialCard.click();
			await page.waitForTimeout(WAIT);
		} catch {
			/* non-fatal */
		}
	}
}

// ============================================================================
// Income Details Page (Tab 3 of IncomePageNew)
// ============================================================================

/**
 * Fill income details — gross/net income for the selected profile type.
 */
async function fillIncomeDetails(page: Page, data: Record<string, unknown>): Promise<void> {
	// Navigate to income details tab
	await clickModalTab(page, 'Income Details');
	await page.waitForTimeout(LONG_WAIT);

	// For salaried: fill gross and/or net income
	if (data.grossIncome) {
		const grossInput = page.locator('input[id*="gross"], input[id*="Gross"]').first();
		try {
			await grossInput.waitFor({ state: 'visible', timeout: 5000 });
			await grossInput.clear();
			await grossInput.fill(String(data.grossIncome));
			await page.waitForTimeout(WAIT);
		} catch {
			/* field may not exist for this profile type */
		}
	}

	if (data.netIncome) {
		const netInput = page.locator('input[id*="net"], input[id*="Net"]').first();
		try {
			await netInput.waitFor({ state: 'visible', timeout: 5000 });
			await netInput.clear();
			await netInput.fill(String(data.netIncome));
			await page.waitForTimeout(WAIT);
		} catch {
			/* field may not exist for this profile type */
		}
	}
}

// ============================================================================
// Credit Score Page (Tab 4 of IncomePageNew)
// ============================================================================

/**
 * Fill credit score / CIBIL.
 */
async function fillCreditScore(page: Page, data: Record<string, unknown>): Promise<void> {
	await clickModalTab(page, 'Credit');
	await page.waitForTimeout(WAIT);

	const score = String(data.creditScore || '750');

	// CIBIL score input — look for numeric input in credit tab
	const scoreInput = page
		.locator('input[id*="cibil"], input[id*="credit"], input[type="number"]')
		.first();
	try {
		await scoreInput.waitFor({ state: 'visible', timeout: 5000 });
		await scoreInput.clear();
		await scoreInput.fill(score);
		await page.waitForTimeout(WAIT);
	} catch {
		/* non-fatal */
	}
}

// ============================================================================
// Obligations Page (Tab 5 of IncomePageNew)
// ============================================================================

/**
 * Fill obligations — either mark "no obligations" or add entries.
 */
async function fillObligations(page: Page, data: Record<string, unknown>): Promise<void> {
	await clickModalTab(page, 'Obligation');
	await page.waitForTimeout(WAIT);

	const hasObligations = data.hasExistingObligations === true;

	if (!hasObligations) {
		// Select "No" for obligations running, or leave empty
		const noBtn = page.locator('label:has-text("No"), button:has-text("No existing")').first();
		try {
			await noBtn.waitFor({ state: 'visible', timeout: 3000 });
			await noBtn.click();
			await page.waitForTimeout(WAIT);
		} catch {
			/* non-fatal — obligations page may auto-complete */
		}
		return;
	}

	// Add obligation entries
	const obligations = (data.obligations ?? []) as Array<Record<string, unknown>>;
	for (const obligation of obligations) {
		await addObligationEntry(page, obligation);
	}
}

/**
 * Add a single obligation entry.
 *
 * After clicking "Add", waits for the obligation form fields to render
 * before attempting to fill them.
 */
async function addObligationEntry(page: Page, obligation: Record<string, unknown>): Promise<void> {
	// Click "Add" button — scope to obligation section to avoid matching other "Add" buttons
	const addBtn = page
		.locator(
			'button:has-text("Add Obligation"), button:has-text("Add New"), button:has-text("Add"):near(:text("Obligation"))'
		)
		.first();

	// Fall back to any visible "Add" button if scoped selector fails
	const fallbackBtn = page.locator('button:has-text("Add")').first();

	try {
		try {
			await addBtn.waitFor({ state: 'visible', timeout: 3000 });
			await addBtn.click();
		} catch {
			await fallbackBtn.waitFor({ state: 'visible', timeout: 2000 });
			await fallbackBtn.click();
		}

		// Wait for obligation form fields to appear (not just the button click)
		await page.waitForTimeout(LONG_WAIT);

		// Look for any form field that indicates the obligation row is ready
		const obligationForm = page
			.locator('select[id*="loanType"], button[id*="loanType"], input[id*="emi"]')
			.first();
		await obligationForm.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
	} catch {
		console.warn('[E2E] addObligationEntry: could not add obligation row');
		return;
	}

	// Fill obligation fields
	if (obligation.loanType) {
		await trySelectDropdown(page, 'loanType', String(obligation.loanType));
	}
	if (obligation.bankName) {
		await trySelectDropdown(page, 'bankName', String(obligation.bankName));
	}
	if (obligation.emi) {
		const emiInput = page.locator('input[id*="emi"], input[id*="EMI"]').first();
		try {
			await emiInput.waitFor({ state: 'visible', timeout: 3000 });
			await emiInput.clear();
			await emiInput.fill(String(obligation.emi));
			await page.waitForTimeout(WAIT);
		} catch {
			console.warn('[E2E] addObligationEntry: could not fill EMI field');
		}
	}
}

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Click a modal tab by partial label text.
 * ModalTabs renders buttons with aria-label="Step N: Label".
 *
 * Handles multiple patterns:
 *   - aria-label*="Label" (primary — ModalTabs format)
 *   - role="tab" with text (standard tab pattern)
 *   - button text fallback
 */
async function clickModalTab(page: Page, tabLabel: string): Promise<void> {
	// Try multiple tab selector patterns
	const selectors = [
		`button[aria-label*="${tabLabel}"]`,
		`[role="tab"]:has-text("${tabLabel}")`,
		`button:has-text("${tabLabel}")`
	];

	for (const selector of selectors) {
		const tabBtn = page.locator(selector).first();
		try {
			await tabBtn.waitFor({ state: 'visible', timeout: 3000 });
			const isDisabled = await tabBtn.isDisabled();
			if (!isDisabled) {
				await tabBtn.click();
				// Wait for tab panel content to appear
				await page.waitForTimeout(WAIT);
				return;
			}
		} catch {
			// Try next selector
		}
	}

	console.warn(`[E2E] clickModalTab: could not find tab "${tabLabel}"`);
}

/**
 * Try to fill a text/number input by field key.
 * Searches for input by id containing the key.
 */
async function tryFillInput(page: Page, fieldKey: string, value: string): Promise<void> {
	const input = page.locator(`input[id*="${fieldKey}"], input[name="${fieldKey}"]`).first();
	try {
		await input.waitFor({ state: 'visible', timeout: 3000 });
		await input.clear();
		await input.fill(value);
		await page.waitForTimeout(WAIT);
	} catch {
		/* non-fatal */
	}
}

/**
 * Try to select from a dropdown (CustomSelect, NewSelect, or native select).
 *
 * Handles all three component types:
 *   - NewSelect: button#"{fieldKey}-button"
 *   - CustomSelect: button with aria-haspopup inside [data-question-id] container
 *   - Native <select>: standard HTML select element
 */
async function trySelectDropdown(page: Page, fieldKey: string, value: string): Promise<void> {
	// Try CustomSelect/NewSelect button patterns
	const btn = page
		.locator(
			[
				`button[id="${fieldKey}-button"]`,
				`button[id*="${fieldKey}"][aria-haspopup="listbox"]`,
				`[data-question-id="${fieldKey}"] button[aria-haspopup="listbox"]`,
				`button[id*="${fieldKey}"]`
			].join(', ')
		)
		.first();

	try {
		await btn.waitFor({ state: 'visible', timeout: 3000 });
		await btn.click();
		await page.waitForTimeout(WAIT);

		// Find option by value or label text
		const option = page.locator(`li[role="option"]:has-text("${value}")`).first();
		await option.waitFor({ state: 'visible', timeout: 3000 });
		await option.click();
		await page.waitForTimeout(WAIT);
		return;
	} catch {
		/* fallthrough to native select */
	}

	// Try native <select> element
	const nativeSelect = page
		.locator(`select[id*="${fieldKey}"], select[name="${fieldKey}"]`)
		.first();
	try {
		await nativeSelect.waitFor({ state: 'visible', timeout: 2000 });
		await nativeSelect.selectOption({ label: value });
		await page.waitForTimeout(WAIT);
	} catch {
		console.warn(`[E2E] trySelectDropdown: no dropdown found for "${fieldKey}" = "${value}"`);
	}
}

/**
 * Try to select a boolean value (Yes/No) for booleanSelect question type.
 * These render as two buttons/labels within the question container.
 */
async function tryBooleanSelect(page: Page, fieldKey: string, value: string): Promise<void> {
	// booleanSelect renders as radio-like labels with values "true"/"false" or "Yes"/"No"
	const boolValue = value === 'Yes' || value === 'true' ? 'true' : 'false';
	const displayLabel = boolValue === 'true' ? 'Yes' : 'No';

	// Try by input value
	const label = page.locator(`label:has(input[name="${fieldKey}"][value="${boolValue}"])`).first();
	try {
		await label.waitFor({ state: 'visible', timeout: 3000 });
		await label.click();
		await page.waitForTimeout(WAIT);
		return;
	} catch {
		/* fallthrough */
	}

	// Try by display text within question container
	const textLabel = page.locator(`label:has-text("${displayLabel}")`).last();
	try {
		await textLabel.waitFor({ state: 'visible', timeout: 2000 });
		await textLabel.click();
		await page.waitForTimeout(WAIT);
	} catch {
		/* non-fatal */
	}
}
