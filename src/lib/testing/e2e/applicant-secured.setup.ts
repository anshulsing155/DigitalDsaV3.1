/**
 * Stage 1: Applicant Setup — All 6 Loan Types
 * ══════════════════════════════════════════════════════════════════
 * Navigates to each loan form via the shortest route, fills the minimum
 * schema pages to reach the applicant page, then adds a single Individual.
 *
 * Saves browser storageState so Stage 2 can resume where Stage 1 left off.
 *
 * Shortest routes:
 *   Secured (Home/LAP/Plot): how-can-we-help → caseIntake → propertyLocation(no) → applicant
 *   Unsecured (PL/BL/Prof): how-can-we-help → caseIntake → applicant
 *
 * Run: pnpm exec playwright test applicant-secured.setup.ts --project=applicant-setup-secured
 * ══════════════════════════════════════════════════════════════════
 */

import { test as setup, expect } from '@playwright/test';
import {
	navigateToLoanForm,
	clickNext,
	selectRadio,
	fillText,
	selectOption,
	waitForQuestion,
	dismissFormResumeModal,
	clearFormStorage,
	fillCurrency
} from './formHelpers';

const APPLICANT_STATE_DIR = 'test-results/playwright/.applicant-state';

// ============================================================================
// Shortest-route fill data per loan type
// ============================================================================

interface LoanRouteConfig {
	loanName: string;
	formRoute: string;
	loanType: string;
	/** Fill data for each schema page before the applicant page */
	pageFills: Array<{
		/** Fills to apply on this page. Format: [questionId, type, value][] */
		fills: Array<[string, 'radio' | 'select' | 'text' | 'currency', string]>;
	}>;
}

/**
 * All 6 loan type route configs.
 *
 * For secured loans, the shortest path uses:
 *   - assessmentStatus = 'fresh' (page 0: caseIntake — skips follow-up Qs)
 *   - propertyIdentified = 'No' (page 1: propertyLocation — skips property detail pages 2-6)
 *   - propertyAreaType = required on page 1 even when property not identified
 *
 * For unsecured loans:
 *   - assessmentStatus = 'fresh' (page 0: caseIntake — only required Q)
 *   - loanType = 'Start Fresh' in how-can-we-help skips BT/DC pages
 *   - Page 1 is already the applicant page
 */
const LOAN_ROUTES: LoanRouteConfig[] = [
	{
		loanName: 'Home Loan',
		formRoute: '/form/home-loan',
		loanType: 'New Loan',
		pageFills: [
			// Page 0: caseIntake_homeLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] },
			// Page 1: propertyLocation_homeLoan (shows when assessmentStatus !== '')
			{
				fills: [
					['q1_propertyAreaType', 'select', 'PLANNED_AUTHORITY'],
					['q2_propertyIdentified', 'radio', 'No']
				]
			}
			// Pages 2-6 are all hidden when propertyIdentified='No' + New Loan
			// Page 7 (tellUs_homeLoan) = applicant page — handled by fillIndividualApplicant
		]
	},
	{
		loanName: 'Loan Against Property',
		formRoute: '/form/lap',
		loanType: 'New Loan',
		pageFills: [
			// Page 0: caseIntake_lapLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] },
			// Page 1: propertyLocation — LAP always has identified property for New
			{
				fills: [
					['q1_propertyAreaType', 'select', 'PLANNED_AUTHORITY'],
					['q_propertyLocation', 'text', ''], // Location compound — skip for now
					['q2_propertyIdentified', 'radio', 'No']
				]
			}
		]
	},
	{
		loanName: 'Plot Loan',
		formRoute: '/form/plot-loan',
		loanType: 'Plot Loan Only',
		pageFills: [
			// Page 0: caseIntake_plotLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] },
			// Page 1: plotDetails — property area type + plot questions
			{
				fills: [
					['q1_propertyAreaType', 'select', 'PLANNED_AUTHORITY'],
					['q2_propertyIdentified', 'radio', 'No']
				]
			}
		]
	},
	{
		loanName: 'Personal Loan',
		formRoute: '/form/personal-loan',
		loanType: 'Start Fresh',
		pageFills: [
			// Page 0: caseIntake_personalLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] }
			// Page 1 = applicantPage — handled by fillIndividualApplicant
		]
	},
	{
		loanName: 'Business Loan',
		formRoute: '/form/business-loan',
		loanType: 'Start Fresh',
		pageFills: [
			// Page 0: caseIntake_businessLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] }
			// Page 1 = applicantPage — handled by fillIndividualApplicant
		]
	},
	{
		loanName: 'Professional Loan',
		formRoute: '/form/professional-loan',
		loanType: 'Start Fresh',
		pageFills: [
			// Page 0: caseIntake_professionalLoan
			{ fills: [['q1_assessmentStatus', 'radio', 'fresh']] }
			// Page 1 = applicantPage — handled by fillIndividualApplicant
		]
	}
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fill a single Individual applicant on the AddApplicant page.
 */
async function fillIndividualApplicant(
	page: import('@playwright/test').Page,
	data: {
		name: string;
		gender: string;
		age: string;
		maritalStatus: string;
		isNRI?: string;
		onProperty?: string;
		onEMI?: string;
	}
) {
	// Select Individual type
	const individualLabel = page.locator(
		'label:has(input[name="applicantType"][value="Individual"])'
	);
	await individualLabel.waitFor({ state: 'visible', timeout: 5000 });
	await individualLabel.click();
	await page.waitForTimeout(500);

	// Applicant sub-type: Person
	const subTypeBtn = page.locator('button[id*="applicantSubType"]').first();
	if (await subTypeBtn.isVisible().catch(() => false)) {
		await subTypeBtn.click();
		await page.waitForTimeout(200);
		const personOpt = page.locator('li[role="option"]:has-text("Person")').first();
		await personOpt.waitFor({ state: 'visible', timeout: 3000 });
		await personOpt.click();
		await page.waitForTimeout(300);
	}

	// Full name
	const nameInput = page.locator('input[id*="fullName"]').first();
	await nameInput.waitFor({ state: 'visible', timeout: 3000 });
	await nameInput.clear();
	await nameInput.fill(data.name);
	await page.waitForTimeout(200);

	// Gender
	const genderBtn = page.locator('button[id*="gender"]').first();
	if (await genderBtn.isVisible().catch(() => false)) {
		await genderBtn.click();
		await page.waitForTimeout(200);
		const genderOpt = page.locator(`li[role="option"]:has-text("${data.gender}")`).first();
		await genderOpt.waitFor({ state: 'visible', timeout: 3000 });
		await genderOpt.click();
		await page.waitForTimeout(200);
	}

	// Age
	const ageInput = page.locator('input[id*="age"]').first();
	if (await ageInput.isVisible().catch(() => false)) {
		await ageInput.clear();
		await ageInput.fill(data.age);
		await page.waitForTimeout(200);
	}

	// Marital Status
	const maritalBtn = page.locator('button[id*="maritalStatus"]').first();
	if (await maritalBtn.isVisible().catch(() => false)) {
		await maritalBtn.click();
		await page.waitForTimeout(200);
		const maritalOpt = page.locator(`li[role="option"]:has-text("${data.maritalStatus}")`).first();
		await maritalOpt.waitFor({ state: 'visible', timeout: 3000 });
		await maritalOpt.click();
		await page.waitForTimeout(200);
	}

	// NRI status
	const nriBtn = page.locator('button[id*="isNRI"], button[id*="NRI"]').first();
	if (await nriBtn.isVisible().catch(() => false)) {
		await nriBtn.click();
		await page.waitForTimeout(200);
		const nriOpt = page.locator(`li[role="option"]:has-text("${data.isNRI || 'No'}")`).first();
		await nriOpt.waitFor({ state: 'visible', timeout: 3000 });
		await nriOpt.click();
		await page.waitForTimeout(200);
	}

	// On Property (boolean select)
	if (data.onProperty) {
		const propLabel = page
			.locator(
				`label:has(input[name="onProperty"][value="${data.onProperty === 'Yes' ? 'true' : 'false'}"])`
			)
			.first();
		if (await propLabel.isVisible().catch(() => false)) {
			await propLabel.click();
			await page.waitForTimeout(200);
		}
	}

	// On EMI (boolean select)
	if (data.onEMI) {
		const emiLabel = page
			.locator(`label:has(input[name="onEMI"][value="${data.onEMI === 'Yes' ? 'true' : 'false'}"])`)
			.first();
		if (await emiLabel.isVisible().catch(() => false)) {
			await emiLabel.click();
			await page.waitForTimeout(200);
		}
	}

	// Click Add Applicants button
	const addBtn = page
		.locator('button:has-text("Add Applicants"), button:has-text("Update Applicant")')
		.first();
	await addBtn.waitFor({ state: 'visible', timeout: 5000 });
	await addBtn.click();
	await page.waitForTimeout(800);
}

/**
 * Fill a single question by type.
 */
async function fillQuestion(
	page: import('@playwright/test').Page,
	questionId: string,
	type: 'radio' | 'select' | 'text' | 'currency',
	value: string
): Promise<boolean> {
	try {
		switch (type) {
			case 'radio':
				await selectRadio(page, questionId, value);
				return true;
			case 'select':
				await selectOption(page, questionId, value);
				return true;
			case 'text':
				await fillText(page, questionId, value);
				return true;
			case 'currency':
				await fillCurrency(page, questionId, value);
				return true;
		}
	} catch {
		// Question might be hidden by showWhen — that's OK
		return false;
	}
}

/**
 * Fill all questions on a page and navigate to the next page.
 */
async function fillPageAndNext(
	page: import('@playwright/test').Page,
	fills: Array<[string, 'radio' | 'select' | 'text' | 'currency', string]>
) {
	for (const [questionId, type, value] of fills) {
		if (!value) continue; // Skip empty values
		await page.waitForTimeout(300);
		await fillQuestion(page, questionId, type, value);
	}
	await page.waitForTimeout(500);
	await clickNext(page);
	await page.waitForTimeout(1000);
}

// ============================================================================
// Tests — one per loan type
// ============================================================================

for (const route of LOAN_ROUTES) {
	const isSecured = ['Home Loan', 'Loan Against Property', 'Plot Loan'].includes(route.loanName);

	setup(`${route.loanName} — add single applicant`, async ({ page }) => {
		// 1. Clean slate
		await page.goto('about:blank');
		await clearFormStorage(page);

		// 2. Navigate through how-can-we-help to the loan form
		await navigateToLoanForm(page, route.loanName, route.formRoute, route.loanType);

		// 3. Handle any resume modal
		await dismissFormResumeModal(page);
		await page.waitForTimeout(500);

		// 4. Fill each schema page before the applicant page
		for (const pageFill of route.pageFills) {
			await fillPageAndNext(page, pageFill.fills);
			await dismissFormResumeModal(page);
		}

		// 5. We should now be on the applicant page — verify
		const applicantTypeSelector = page.locator('label:has(input[name="applicantType"])');
		await applicantTypeSelector.first().waitFor({ state: 'visible', timeout: 10000 });

		// 6. Fill Individual applicant
		await fillIndividualApplicant(page, {
			name: 'Test Applicant',
			gender: 'Male',
			age: '34',
			maritalStatus: 'Married',
			isNRI: 'No',
			onProperty: isSecured ? 'Yes' : undefined,
			onEMI: isSecured ? 'Yes' : undefined
		});

		// 7. Verify applicant was added
		const summaryRow = page.locator('table tbody tr, table tr:has(td)').first();
		await expect(summaryRow).toBeVisible({ timeout: 5000 });

		// 8. Save storageState for Stage 2
		const stateFile = route.loanName.toLowerCase().replace(/\s+/g, '-');
		await page.context().storageState({ path: `${APPLICANT_STATE_DIR}/${stateFile}.json` });
	});
}
