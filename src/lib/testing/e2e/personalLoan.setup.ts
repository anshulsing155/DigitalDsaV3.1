/**
 * Personal Loan E2E Test Setup
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
	PERSONAL_FORM: APP_ROUTES.FORM.UNSECURE_LOAN.PERSONAL
};

export async function navigateToPersonalLoan(page: Page, loanType: string = 'New Loan') {
	await navigateToLoanForm(page, 'Personal Loan', APP_ROUTES.FORM.UNSECURE_LOAN.PERSONAL, loanType);
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

	const guarantorVisible = await isQuestionVisible(page, 'q10_madeGuarantor');
	if (guarantorVisible) {
		await selectRadio(page, 'q10_madeGuarantor', 'No');
	}

	const nriVisible = await isQuestionVisible(page, 'q5_applicantIsNRI');
	if (nriVisible) {
		await selectRadio(page, 'q5_applicantIsNRI', 'No');
	}
}

/** Fill locationPage — residence state/city, bank */
export async function fillLocationPage(page: Page) {
	await waitForQuestion(page, 'q1_residenceStateName');
	await selectOption(page, 'q1_residenceStateName', 'Delhi');
	await page.waitForTimeout(500);

	await waitForQuestion(page, 'q2_residenceCityName');
	await selectOption(page, 'q2_residenceCityName', 'New Delhi');
	await page.waitForTimeout(300);

	// Salaried bank (may or may not be visible depending on conditionals)
	const bankVisible = await isQuestionVisible(page, 'q6_salariedBankName');
	if (bankVisible) {
		const bankBtn = page.locator('button[id="q6_salariedBankName"]');
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
