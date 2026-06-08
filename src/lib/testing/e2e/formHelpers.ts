/**
 * Shared Form E2E Helpers
 *
 * Generic form interaction utilities reusable by ALL loan type tests.
 * Extracted from homeLoan.setup.ts to avoid duplication.
 *
 * ═══════════════════════════════════════════════════════════════════
 * Aligned with REAL user progression:
 *   - Clears sessionStorage/localStorage before each run
 *   - Handles "Welcome back" resume modals
 *   - Follows progressive disclosure (answers reveal next questions)
 *   - Uses correct aria-labels matching actual NavigationButton component
 * ═══════════════════════════════════════════════════════════════════
 */

import { type Page, expect } from '@playwright/test';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

// ─── Routes ──────────────────────────────────────────────────
export const FORM_ROUTES = {
	HOW_CAN_WE_HELP: APP_ROUTES.FORM.HOW_CAN_WE_HELP
};

// ─── Storage / State Helpers ────────────────────────────────

/**
 * Clear all form-related browser storage so the test starts clean.
 * This mirrors what a first-time user sees — no resume modal, no stale data.
 *
 * Must be called AFTER a page.goto() so the browser context has a URL.
 */
export async function clearFormStorage(page: Page) {
	await page.evaluate(() => {
		// sessionStorage: form drafts (loanData, applicants, page indices, etc.)
		sessionStorage.clear();

		// localStorage: selective — clear form-related keys, preserve auth/theme
		const formKeyPrefixes = [
			'home-loan-data',
			'home-application-data',
			'home-back-history',
			'home-applicant-step-touched',
			'home-page-index-object',
			'home-loan-page-index',
			'home-applicant-index-number',
			'home-applicants-store',
			'home-applicants-store-payload',
			'lap-page-index',
			'plot-loan-page-index',
			'business-loan-page-index',
			'personal-loan-page-index',
			'professional-loan-page-index',
			'ddsa-income-profile',
			'ddsa-relationship-store'
		];
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key && formKeyPrefixes.some((prefix) => key.startsWith(prefix))) {
				localStorage.removeItem(key);
			}
		}
	});
}

/**
 * Handle the "Welcome back" resume modal if it appears.
 * Clicks "Start Fresh" to clear old data and begin a clean application.
 */
export async function dismissResumeModal(page: Page) {
	// The resume modal on how-can-we-help page
	const startFreshBtn = page.locator('button:has-text("Start Fresh")');
	try {
		await startFreshBtn.waitFor({ state: 'visible', timeout: 2000 });
		await startFreshBtn.click();
		await page.waitForTimeout(500);
	} catch {
		// No resume modal — good, first-time visit
	}
}

/**
 * Handle the SessionResumeModal on loan-specific form pages.
 * This modal has different options: "Resume", "Restart", "Clear".
 * For E2E testing, we always want to continue (our data is fresh).
 */
export async function dismissFormResumeModal(page: Page) {
	// SessionResumeModal uses "Continue where I left off" / "Start fresh"
	// Since we cleared storage before navigation, this shouldn't appear.
	// But handle it defensively.
	const clearBtn = page.locator('button:has-text("Start fresh"), button:has-text("Clear all")');
	try {
		await clearBtn.waitFor({ state: 'visible', timeout: 2000 });
		await clearBtn.click();
		await page.waitForTimeout(500);
	} catch {
		// No modal — expected when storage is clean
	}
}

// ─── Page State Helpers ─────────────────────────────────────

/**
 * Wait for the form page to be fully interactive.
 *
 * After clicking Next or after a page load, the form goes through:
 *   1. FormStepContainer fly animation (280ms)
 *   2. Server evaluation (variable, 0-5s+) — shows .eval-overlay
 *   3. Step container has pointer-events:none during evaluation
 *
 * This helper waits for all overlays to clear, replacing fixed timeouts.
 */
export async function waitForPageReady(page: Page, timeout = 15000) {
	// Wait for evaluation overlay to disappear (if present)
	await page
		.locator('.eval-overlay')
		.waitFor({ state: 'hidden', timeout })
		.catch(() => {});

	// Wait for step container to exit evaluating state (pointer-events restored)
	await page
		.locator('.step-container.evaluating')
		.waitFor({ state: 'hidden', timeout })
		.catch(() => {});

	// Wait for any loading spinner to finish
	await page
		.locator('.spinner-ring')
		.waitFor({ state: 'hidden', timeout: 5000 })
		.catch(() => {});
}

// ─── Field Interaction Helpers ───────────────────────────────

/** Select a radio option by question ID and value */
export async function selectRadio(page: Page, questionId: string, value: string) {
	const label = page.locator(`label:has(input[name="${questionId}"][value="${value}"])`);
	await label.waitFor({ state: 'visible', timeout: 5000 });
	await label.click();
	await page.waitForTimeout(200);
}

/** Fill a text input by question ID */
export async function fillText(page: Page, questionId: string, value: string) {
	const input = page.locator(`input#${questionId}`);
	await input.waitFor({ state: 'visible', timeout: 5000 });
	await input.clear();
	await input.fill(value);
	await page.waitForTimeout(200);
}

/**
 * Select from a custom dropdown by question ID and option label.
 *
 * Handles both CustomSelect and NewSelect component DOM structures:
 *   - NewSelect: button has id="{questionId}-button"
 *   - CustomSelect: button has no id, lives inside [data-question-id] container
 *   - Legacy: button has id="{questionId}" directly
 */
export async function selectOption(page: Page, questionId: string, optionLabel: string) {
	// Try multiple selector patterns matching the actual component DOM
	const button = page
		.locator(
			[
				`button[id="${questionId}-button"]`,
				`[data-question-id="${questionId}"] button[aria-haspopup="listbox"]`,
				`button[id="${questionId}"]`
			].join(', ')
		)
		.first();

	await button.waitFor({ state: 'visible', timeout: 5000 });
	await button.click();

	// Wait for dropdown to render (CustomSelect awaits tick() internally)
	await page.waitForTimeout(300);

	const option = page.locator(`li[role="option"]:has-text("${optionLabel}")`).first();
	await option.waitFor({ state: 'visible', timeout: 5000 });
	await option.click();
	await page.waitForTimeout(200);
}

/**
 * Click the Next/navigation button on a form page.
 *
 * NavigationButton uses aria-label={ariaLabel} which defaults to btnName.
 * On loan form pages the buttons use specific aria-labels like "Go to next step".
 * On how-can-we-help the button uses btnName="Next" → aria-label="Next".
 *
 * This helper tries multiple selectors to be robust.
 */
export async function clickNext(page: Page) {
	// Wait for ANY Next button (even disabled) to exist first, then wait for enabled state.
	// Custom pages may need time to compute completion before enabling.
	const selectors = [
		'button[aria-label="Go to next step"]',
		'button[aria-label="Next"]',
		'button:has-text("Next")'
	];

	for (const selector of selectors) {
		const btn = page.locator(selector).first();
		const count = await btn.count();
		if (count > 0) {
			// Wait up to 15s for the button to become enabled (custom pages may take time)
			const enabledBtn = page.locator(`${selector}:not([disabled])`).first();
			await enabledBtn.waitFor({ state: 'visible', timeout: 15000 });

			// Also check for "muted" state — button may exist and not be disabled,
			// but have a muted class that means it's not truly ready
			const classes = await enabledBtn.getAttribute('class');
			if (classes?.includes('nav-btn-muted')) {
				// Wait a bit more for the muted state to clear
				await page.waitForTimeout(1000);
			}

			await enabledBtn.click();

			// Wait for page transition + evaluation instead of fixed timeout
			await waitForPageReady(page);
			return;
		}
	}

	throw new Error('Could not find a Next button on the page');
}

/** Click the Previous button */
export async function clickPrevious(page: Page) {
	const selectors = [
		'button[aria-label="Go to previous step"]',
		'button[aria-label="Previous"]',
		'button:has-text("Previous")'
	];

	for (const selector of selectors) {
		const btn = page.locator(selector).first();
		const count = await btn.count();
		if (count > 0) {
			await btn.waitFor({ state: 'visible', timeout: 5000 });
			await btn.click();
			await page.waitForTimeout(500);
			return;
		}
	}

	throw new Error('Could not find a Previous button on the page');
}

/** Check if the Next button is enabled (not muted/disabled) */
export async function isNextEnabled(page: Page): Promise<boolean> {
	const selectors = ['button[aria-label="Go to next step"]', 'button[aria-label="Next"]'];

	for (const selector of selectors) {
		const btn = page.locator(selector);
		const count = await btn.count();
		if (count > 0) {
			const disabled = await btn.isDisabled();
			if (disabled) return false;
			const classes = await btn.getAttribute('class');
			return !classes?.includes('nav-btn-muted');
		}
	}
	return false;
}

/**
 * Wait for a question to appear in the DOM.
 *
 * Handles all component types:
 *   - Radio: input[name="{id}"]
 *   - Text/Number: input#{id}
 *   - CustomSelect: container [data-question-id="{id}"]
 *   - NewSelect: button#{id}-button
 *   - Any: [data-question-id="{id}"] wrapper
 */
export async function waitForQuestion(page: Page, questionId: string, timeout = 10000) {
	const locator = page
		.locator(
			[
				`input[name="${questionId}"]`,
				`input#${questionId}`,
				`button[id="${questionId}"]`,
				`button[id="${questionId}-button"]`,
				`[data-question-id="${questionId}"]`
			].join(', ')
		)
		.first();
	await locator.waitFor({ state: 'visible', timeout });
}

/** Check if a question is visible */
export async function isQuestionVisible(page: Page, questionId: string): Promise<boolean> {
	const locator = page
		.locator(
			[
				`input[name="${questionId}"]`,
				`input#${questionId}`,
				`button[id="${questionId}"]`,
				`button[id="${questionId}-button"]`,
				`[data-question-id="${questionId}"]`
			].join(', ')
		)
		.first();
	return (await locator.count()) > 0 && (await locator.isVisible());
}

// ─── Loan Type Normalization ────────────────────────────────

/**
 * Map from payload loanType values → form q4_loanType option values.
 *
 * The form schema (commonPage.json) uses specific labels like "Balance Transfer Only"
 * while the payload uses shorter forms like "Balance Transfer".
 * This normalization ensures navigateToLoanForm clicks the right option.
 */
const LOAN_TYPE_FORM_MAP: Record<string, string> = {
	'Balance Transfer': 'Balance Transfer Only',
	'Top-up': 'Top-up Only',
	'New Loan': 'New Loan',
	'Balance Transfer Only': 'Balance Transfer Only',
	'Balance Transfer With Top-up': 'Balance Transfer With Top-up',
	'Top-up Only': 'Top-up Only',
	'Plot Loan Only': 'Plot Loan Only',
	'Plot & Construction Loan': 'Plot & Construction Loan',
	'Plot & Equity Loan': 'Plot & Equity Loan',
	'Construction Loan Only': 'Construction Loan Only',
	'Debt Consolidation': 'Debt Consolidation',
	'Debt Consolidation with Extra Funds': 'Debt Consolidation with Extra Funds'
};

/**
 * Map from archetype/generator loanName → form q1_loanName value.
 * The form uses "Plot Loan" but generators use "Plot and Construction Loan".
 */
const LOAN_NAME_FORM_MAP: Record<string, string> = {
	'Plot and Construction Loan': 'Plot Loan',
	'Home Loan': 'Home Loan',
	'Loan Against Property': 'Loan Against Property',
	LAP: 'Loan Against Property',
	'Personal Loan': 'Personal Loan',
	'Business Loan': 'Business Loan',
	'Professional Loan': 'Professional Loan',
	'Plot Loan': 'Plot Loan'
};

// ─── Navigation Helpers ─────────────────────────────────────

/**
 * Navigate to how-can-we-help, select a loan name, handle intermediate
 * questions via progressive disclosure, select loan type, then proceed.
 *
 * Mirrors the EXACT real user progression on the how-can-we-help page:
 *
 * ┌─ q1_loanName (always visible)
 * │
 * ├─ If "Home Loan" or "Loan Against Property":
 * │   ├─ LAP only: q2_facilityType_LAP → "Term Loan" or "Drop-line OverDraft (DOD)"
 * │   └─ q4_loanType → shows 4 options: New Loan, BT+Topup, BT Only, Topup Only
 * │
 * ├─ If "Plot Loan":
 * │   ├─ q2_loanType → "New Loan" or "Balance Transfer Only" (Plot scope)
 * │   └─ If "New Loan": q4_loanVariant → 4 plot options
 * │
 * ├─ If "Business/Personal/Professional Loan":
 * │   ├─ q2_facilityType_unsec → "Term Loan" | "Overdraft (OD)" | "Drop-line OverDraft (DOD)"
 * │   ├─ q4_loanType → facility-specific options (New Loan/OD/DOD, DC, DC+Extra)
 * │   └─ If "New Loan": q3_obligationsRunning → "Yes" or "No"
 * │
 * └─ Next button appears when loanType is set (auto or manual)
 *
 * @param page - Playwright page
 * @param loanName - The payload's loanName (may need normalization, e.g. "Plot and Construction Loan" → "Plot Loan")
 * @param expectedUrlPattern - URL pattern to wait for after navigation
 * @param loanType - The payload's loanType (may need normalization, e.g. "Balance Transfer" → "Balance Transfer Only")
 */
/**
 * FormPath fields for fixture-driven how-can-we-help navigation.
 * When provided, uses exact fixture values instead of heuristic guessing.
 */
interface NavigationFormPath {
	q2_facilityType_LAP?: string;
	q2_loanType?: string;
	q2_facilityType_unsec?: string;
	q3_obligationsRunning?: string;
	q4_loanType: string;
	q4_loanVariant?: string;
}

export async function navigateToLoanForm(
	page: Page,
	loanName: string,
	expectedUrlPattern: string,
	loanType?: string,
	formPath?: NavigationFormPath
) {
	// Normalize loanName from payload to form values
	const formLoanName = LOAN_NAME_FORM_MAP[loanName] || loanName;

	// Normalize loanType from payload to form q4 option values
	const formLoanType = loanType ? LOAN_TYPE_FORM_MAP[loanType] || loanType : undefined;

	// Step 0: Navigate to how-can-we-help and clear any stale state
	await page.goto(FORM_ROUTES.HOW_CAN_WE_HELP);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);

	// Handle resume modal if it appears (existing application in progress)
	await dismissResumeModal(page);

	// Step 1: Select the loan name (q1_loanName) — always visible
	// Use the data-question-id wrapper to scope our locator to q1 only
	const q1Container = page.locator('[data-question-id="q1_loanName"]');
	const loanOption = q1Container.locator(`label:has-text("${formLoanName}")`).first();
	await loanOption.waitFor({ state: 'visible', timeout: 10000 });
	await loanOption.click();
	await page.waitForTimeout(600);

	// Step 2: Handle intermediate questions (progressive disclosure)
	// When formPath is provided, use exact fixture values. Otherwise use heuristics.
	if (formLoanName === 'Loan Against Property') {
		const q2Container = page.locator('[data-question-id="q2_facilityType_LAP"]');
		await q2Container.waitFor({ state: 'visible', timeout: 5000 });
		const lapValue = formPath?.q2_facilityType_LAP || 'Term Loan';
		const lapOption = q2Container.locator(`label:has-text("${lapValue}")`).first();
		await lapOption.click();
		await page.waitForTimeout(500);
	} else if (formLoanName === 'Plot Loan') {
		const q2Container = page.locator('[data-question-id="q2_loanType"]');
		await q2Container.waitFor({ state: 'visible', timeout: 5000 });
		const plotScope =
			formPath?.q2_loanType ||
			(formLoanType === 'Balance Transfer Only' ? 'Balance Transfer Only' : 'New Loan');
		const plotOption = q2Container.locator(`label:has-text("${plotScope}")`).first();
		await plotOption.click();
		await page.waitForTimeout(500);
	} else if (['Business Loan', 'Personal Loan', 'Professional Loan'].includes(formLoanName)) {
		const q2Container = page.locator('[data-question-id="q2_facilityType_unsec"]');
		await q2Container.waitFor({ state: 'visible', timeout: 5000 });

		// Use formPath value if provided, otherwise default to Term Loan
		const q2Value = formPath?.q2_facilityType_unsec || 'Term Loan';
		const unsecuredOption = q2Container.locator(`label:has-text("${q2Value}")`).first();
		await unsecuredOption.click();
		await page.waitForTimeout(500);

		// q3_obligationsRunning — use formPath if available
		const q3Container = page.locator('[data-question-id="q3_obligationsRunning"]');
		const q3Visible = await q3Container.isVisible().catch(() => false);
		if (q3Visible) {
			const obligationAnswer =
				formPath?.q3_obligationsRunning ||
				(formLoanType === 'Debt Consolidation with Extra Funds' ? 'Yes' : 'No');
			const obligationOption = q3Container.locator(`label:has-text("${obligationAnswer}")`).first();
			await obligationOption.click();
			await page.waitForTimeout(600);
		}
	}

	// Step 3: Select loan type/structure (q4_loanType) if it's visible
	// For unsecured loans, q4 shows after q2 selection — user always picks explicitly
	// q4 may take a moment to render after q2 selection, so use waitFor with timeout
	if (formLoanType) {
		const q4Container = page.locator('[data-question-id="q4_loanType"]');
		try {
			await q4Container.waitFor({ state: 'visible', timeout: 5000 });
			const typeOption = q4Container.locator(`label:has-text("${formLoanType}")`).first();
			await typeOption.waitFor({ state: 'visible', timeout: 8000 });
			await typeOption.click();
			await page.waitForTimeout(500);
		} catch {
			// q4 not visible — loanType may have been auto-set by rules engine
		}
	}

	// Step 4: Wait for Next button to appear and be enabled, then click
	// The Next button is CONDITIONALLY RENDERED (not just disabled) — it only shows
	// when currentAnswers.loanType !== '' (line 331 of how-can-we-help/+page.svelte).
	// So we use a generous wait timeout.
	const nextBtn = page.locator('button[aria-label="Next"]:not([disabled])');
	await nextBtn.waitFor({ state: 'visible', timeout: 12000 });
	await page.waitForTimeout(300);
	await nextBtn.click();

	// Wait for the form page to load
	await page.waitForURL(`**${expectedUrlPattern}**`, { timeout: 15000 });
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);

	// Handle SessionResumeModal on the form page if it appears
	await dismissFormResumeModal(page);
}

// ─── Assertion Helpers ──────────────────────────────────────

// ─── Currency & Multi-Select Helpers ─────────────────────────

/**
 * Fill a currency input by question ID.
 * Currency components strip formatting on input — we type the raw number.
 */
export async function fillCurrency(page: Page, questionId: string, value: string) {
	// Currency inputs may use a container with the question ID and an inner input
	const input = page
		.locator(
			`input#${questionId}, [data-question-id="${questionId}"] input[type="text"], [data-question-id="${questionId}"] input[type="number"]`
		)
		.first();
	await input.waitFor({ state: 'visible', timeout: 5000 });
	await input.clear();
	// Type raw numeric value (strip any existing formatting like commas/₹)
	const rawValue = String(value).replace(/[₹,\s]/g, '');
	await input.fill(rawValue);
	await page.waitForTimeout(200);
}

/**
 * Select multiple options from a checkbox group by question ID.
 * For multiple-select questions rendered as checkbox groups.
 */
export async function selectMultipleOptions(page: Page, questionId: string, values: string[]) {
	const container = page.locator(`[data-question-id="${questionId}"]`);
	await container.waitFor({ state: 'visible', timeout: 5000 });

	for (const value of values) {
		// Try multiple selector patterns:
		//   - Desktop: label wrapping a checkbox input
		//   - Mobile: standalone button with text
		//   - li[role="option"] for list-based multi-selects
		const checkbox = container
			.locator(
				[
					`label:has(input[value="${value}"])`,
					`li[role="option"]:has-text("${value}")`,
					`button:has-text("${value}")`,
					`label:has-text("${value}")`
				].join(', ')
			)
			.first();
		try {
			await checkbox.waitFor({ state: 'visible', timeout: 3000 });
			await checkbox.click();
			await page.waitForTimeout(150);
		} catch {
			console.warn(`[E2E] selectMultipleOptions: option "${value}" not found in ${questionId}`);
		}
	}
}

/**
 * Fill a location cascade: state → city (with wait for dependent dropdown).
 * Location compound questions load city options dynamically after state selection.
 */
export async function fillLocationState(page: Page, questionId: string, stateValue: string) {
	// Location compound renders state as a select within a container.
	// Handles both CustomSelect (no button ID) and NewSelect (button ID = "{id}-button").
	const stateSelect = page
		.locator(
			[
				`button[id="${questionId}-button"]`,
				`[data-question-id="${questionId}"] button[aria-haspopup="listbox"]`,
				`[data-question-id="${questionId}"] button[id*="State"]`,
				`button[id="${questionId}"]`
			].join(', ')
		)
		.first();
	try {
		await stateSelect.waitFor({ state: 'visible', timeout: 5000 });
		await stateSelect.click();
		await page.waitForTimeout(300);
		const option = page.locator(`li[role="option"]:has-text("${stateValue}")`).first();
		await option.waitFor({ state: 'visible', timeout: 5000 });
		await option.click();
		// Wait for city dropdown to populate (API call) instead of fixed timeout
		await waitForPageReady(page, 8000);
	} catch {
		console.warn(`[E2E] fillLocationState: failed for ${questionId} = "${stateValue}"`);
	}
}

/** Assert the form page loaded with at least one visible question or heading */
export async function assertFormPageLoaded(page: Page) {
	const formContent = page.locator('.form-page, [data-form-page], main').first();
	await expect(formContent).toBeVisible({ timeout: 10000 });
}

/** Assert localStorage contains form data for a key pattern */
export async function assertLocalStorageHasData(page: Page, keyPattern: string) {
	const hasData = await page.evaluate((pattern) => {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.includes(pattern)) {
				const val = localStorage.getItem(key);
				return val !== null && val.length > 2; // not empty object
			}
		}
		return false;
	}, keyPattern);
	expect(hasData).toBe(true);
}
