/**
 * Plot Loan E2E Test Setup
 */
import { type Page } from '@playwright/test';
import {
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	waitForQuestion,
	isQuestionVisible,
	navigateToLoanForm
} from './formHelpers';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

export const ROUTES = {
	HOW_CAN_WE_HELP: APP_ROUTES.FORM.HOW_CAN_WE_HELP,
	PLOT_FORM: APP_ROUTES.FORM.PLOT_LOAN
};

export async function navigateToPlotLoan(page: Page, loanType: string = 'Plot Loan Only') {
	await navigateToLoanForm(page, 'Plot Loan', APP_ROUTES.FORM.PLOT_LOAN, loanType);
}

/** Fill Page 0: caseAssessment — Assessment Status */
export async function fillCaseIntakePage(page: Page) {
	await waitForQuestion(page, 'q1_assessmentStatus');
	await selectRadio(page, 'q1_assessmentStatus', 'fresh');
	await page.waitForTimeout(300);
}

/** Fill propertyIdentification page — prior applications, plot details, location */
export async function fillPlotIdentificationPage(page: Page) {
	// Prior application
	const priorVisible = await isQuestionVisible(page, 'q_priorApplication');
	if (priorVisible) {
		await selectRadio(page, 'q_priorApplication', 'No');
	}

	// Property type
	await waitForQuestion(page, 'q1_propertyType');
	await selectRadio(page, 'q1_propertyType', 'Free Hold');

	// Purchase type
	const purchaseVisible = await isQuestionVisible(page, 'q_purchaseType');
	if (purchaseVisible) {
		await selectRadio(page, 'q_purchaseType', 'Direct Sale');
	}

	// Plot area
	const plotAreaVisible = await isQuestionVisible(page, 'q6_PlotArea');
	if (plotAreaVisible) {
		await fillText(page, 'q6_PlotArea', '2400');
	}

	// Property state
	await waitForQuestion(page, 'q1_propertyStateName');
	await selectOption(page, 'q1_propertyStateName', 'Delhi');
	await page.waitForTimeout(500);

	// Property city
	await waitForQuestion(page, 'q2_propertyCityName');
	await selectOption(page, 'q2_propertyCityName', 'New Delhi');
	await page.waitForTimeout(300);

	// Residence same
	const residenceVisible = await isQuestionVisible(page, 'q4_residenceOptionSame');
	if (residenceVisible) {
		await selectRadio(page, 'q4_residenceOptionSame', 'Yes');
	}
}

/** Fill sellerInformation page — seller details, builder/authority */
export async function fillSellerInformationPage(page: Page) {
	// Purchased from
	await waitForQuestion(page, 'q1_purchasedFrom');
	await selectRadio(page, 'q1_purchasedFrom', 'Builder');

	// Builder name
	const builderVisible = await isQuestionVisible(page, 'q_fullNameOfBuilder');
	if (builderVisible) {
		await fillText(page, 'q_fullNameOfBuilder', 'DLF Limited');
	}

	// Seller NRI
	const nriVisible = await isQuestionVisible(page, 'q1_ifSellerNri');
	if (nriVisible) {
		await selectRadio(page, 'q1_ifSellerNri', 'No');
	}
}

// Re-export shared helpers
export {
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	waitForQuestion,
	isQuestionVisible
} from './formHelpers';
