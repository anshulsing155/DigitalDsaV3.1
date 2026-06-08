/**
 * LAP (Loan Against Property) E2E Test Setup
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
	LAP_FORM: APP_ROUTES.FORM.LAP
};

export async function navigateToLapLoan(page: Page, loanType: string = 'New Loan') {
	await navigateToLoanForm(page, 'Loan Against Property', APP_ROUTES.FORM.LAP, loanType);
}

/** Fill Page 0: caseAssessment — Assessment Status */
export async function fillCaseIntakePage(page: Page) {
	await waitForQuestion(page, 'q1_assessmentStatus');
	await selectRadio(page, 'q1_assessmentStatus', 'fresh');
	await page.waitForTimeout(300);
}

/** Fill propertyIdentificationPage — prior applications, location, residence */
export async function fillPropertyIdentificationPage(page: Page) {
	// Prior application question
	const priorVisible = await isQuestionVisible(page, 'q_priorApplication');
	if (priorVisible) {
		await selectRadio(page, 'q_priorApplication', 'No');
	}

	// Property state
	await waitForQuestion(page, 'q1_propertyStateName');
	await selectOption(page, 'q1_propertyStateName', 'Delhi');
	await page.waitForTimeout(500);

	// Property city
	await waitForQuestion(page, 'q2_propertyCityName');
	await selectOption(page, 'q2_propertyCityName', 'New Delhi');
	await page.waitForTimeout(300);

	// Applicant residing in property
	const residingVisible = await isQuestionVisible(page, 'q4_applicantResidingInProperty');
	if (residingVisible) {
		await selectRadio(page, 'q4_applicantResidingInProperty', 'Yes');
	}
}

/** Fill propertyTechnical_LAP — property type, area, construction details */
export async function fillPropertyTechnicalLapPage(page: Page) {
	await waitForQuestion(page, 'q1_propertyType');
	await selectRadio(page, 'q1_propertyType', 'Free Hold');

	const categoryVisible = await isQuestionVisible(page, 'q2_categoryOfProperty');
	if (categoryVisible) {
		await selectRadio(page, 'q2_categoryOfProperty', 'Residential');
	}

	// Carpet area
	const carpetVisible = await isQuestionVisible(page, 'q_carpetArea');
	if (carpetVisible) {
		await fillText(page, 'q_carpetArea', '1200');
	}

	// Built-up area
	const builtVisible = await isQuestionVisible(page, 'q_builtArea');
	if (builtVisible) {
		await fillText(page, 'q_builtArea', '1500');
	}

	// Type of occupation
	const occupationVisible = await isQuestionVisible(page, 'q4_typeOfOccupationProperty');
	if (occupationVisible) {
		await selectRadio(page, 'q4_typeOfOccupationProperty', 'Self Occupied');
	}
}

/** Fill propertyLegal_LAP — ownership, encumbrances, legal */
export async function fillPropertyLegalLapPage(page: Page) {
	// Existing encumbrance
	const encumbranceVisible = await isQuestionVisible(page, 'q_existingEncumbrance');
	if (encumbranceVisible) {
		await selectRadio(page, 'q_existingEncumbrance', 'No');
	}

	// Ownership chain
	const ownershipVisible = await isQuestionVisible(page, 'q_ownershipChainComplete');
	if (ownershipVisible) {
		await selectRadio(page, 'q_ownershipChainComplete', 'Yes');
	}

	// No legal dispute
	const legalVisible = await isQuestionVisible(page, 'q_noLegalDispute');
	if (legalVisible) {
		await selectRadio(page, 'q_noLegalDispute', 'Yes');
	}

	// Original documents available
	const docsVisible = await isQuestionVisible(page, 'q_originalDocumentsAvailable');
	if (docsVisible) {
		await selectRadio(page, 'q_originalDocumentsAvailable', 'Yes');
	}
}

// Re-export shared helpers for convenience
export {
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	waitForQuestion,
	isQuestionVisible
} from './formHelpers';
