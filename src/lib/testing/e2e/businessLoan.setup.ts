/**
 * Business Loan E2E Test Setup
 */
import { type Page } from '@playwright/test';
import {
	selectRadio,
	fillText,
	selectOption,
	waitForQuestion,
	isQuestionVisible,
	navigateToLoanForm
} from './formHelpers';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

export const ROUTES = {
	HOW_CAN_WE_HELP: APP_ROUTES.FORM.HOW_CAN_WE_HELP,
	BUSINESS_FORM: APP_ROUTES.FORM.UNSECURE_LOAN.BUSINESS
};

export async function navigateToBusinessLoan(page: Page, loanType: string = 'New Loan') {
	await navigateToLoanForm(page, 'Business Loan', APP_ROUTES.FORM.UNSECURE_LOAN.BUSINESS, loanType);
}

/** Fill Page 0: caseAssessment — Assessment Status */
export async function fillCaseIntakePage(page: Page) {
	await waitForQuestion(page, 'q1_assessmentStatus');
	await selectRadio(page, 'q1_assessmentStatus', 'fresh');
	await page.waitForTimeout(300);
}

/** Fill collateral_free_selectionPage — eligibility checks */
export async function fillEligibilityCheckPage(page: Page) {
	await waitForQuestion(page, 'q1_isDefaulter');
	await selectRadio(page, 'q1_isDefaulter', 'No');

	const guarantorVisible = await isQuestionVisible(page, 'q11_madeGuarantor');
	if (guarantorVisible) {
		await selectRadio(page, 'q11_madeGuarantor', 'No');
	}

	const nriVisible = await isQuestionVisible(page, 'q5_applicantIsNRI');
	if (nriVisible) {
		await selectRadio(page, 'q5_applicantIsNRI', 'No');
	}
}

/** Fill locationPage — business state/city, current account banks */
export async function fillBusinessLocationPage(page: Page) {
	await waitForQuestion(page, 'q4_businessStateName');
	await selectOption(page, 'q4_businessStateName', 'Delhi');
	await page.waitForTimeout(500);

	await waitForQuestion(page, 'q5_businessCityName');
	await selectOption(page, 'q5_businessCityName', 'New Delhi');
	await page.waitForTimeout(300);

	// Current account banks (multi-select or single)
	const bankVisible = await isQuestionVisible(page, 'q6_banksOfCurrentAccount');
	if (bankVisible) {
		const bankBtn = page.locator('button[id="q6_banksOfCurrentAccount"]');
		await bankBtn.click();
		await page.waitForTimeout(300);
		const firstBank = page.locator('li[role="option"]').first();
		if ((await firstBank.count()) > 0) {
			await firstBank.click();
			await page.waitForTimeout(200);
		}
	}
}

export {
	selectRadio,
	fillText,
	selectOption,
	waitForQuestion,
	isQuestionVisible
} from './formHelpers';
