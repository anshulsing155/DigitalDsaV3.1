/**
 * Home Loan E2E Test Setup - Shared Fixtures & Helpers
 *
 * Provides reusable functions for navigating, filling, and asserting
 * against the Home Loan form in Playwright tests.
 *
 * Updated for V2 schema (homeLoanSchemaV2.json) page structure.
 *
 * Generic form helpers (selectRadio, fillText, etc.) are in formHelpers.ts
 * and re-exported here for backward compatibility.
 */

import { type Page } from '@playwright/test';
import {
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	clickPrevious,
	isNextEnabled,
	waitForQuestion,
	isQuestionVisible,
	navigateToLoanForm
} from './formHelpers';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

// Re-export all generic helpers for backward compatibility
export {
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	clickPrevious,
	isNextEnabled,
	waitForQuestion,
	isQuestionVisible
};

// ─── Routes ──────────────────────────────────────────────────
export const ROUTES = {
	HOW_CAN_WE_HELP: APP_ROUTES.FORM.HOW_CAN_WE_HELP,
	HOME_LOAN_FORM: APP_ROUTES.FORM.HOME_LOAN
};

// ─── Navigation ──────────────────────────────────────────────

/**
 * Navigate to how-can-we-help page, select Home Loan, pick loan type,
 * and arrive at the home loan form
 */
export async function navigateToHomeLoan(page: Page, loanType: string = 'New Loan') {
	await navigateToLoanForm(page, 'Home Loan', APP_ROUTES.FORM.HOME_LOAN, loanType);
}

// ─── Page Fill Helpers ───────────────────────────────────────

/** Fill Page 0: caseIntake_homeLoan - Assessment Status (Session 34 redesign) */
export async function fillCaseIntakePage(page: Page) {
	await waitForQuestion(page, 'q1_assessmentStatus');
	await selectRadio(page, 'q1_assessmentStatus', 'fresh');
	await page.waitForTimeout(300);
}

/** @deprecated Use fillCaseIntakePage instead */
export const fillSelectionPage = fillCaseIntakePage;

/** Fill Page 1: propertyLocation_homeLoan - Property Identified, Area Type, Purchase Type, Location */
export async function fillPropertyLocationPage(
	page: Page,
	propertyIdentified: 'Yes' | 'No' = 'Yes'
) {
	// q2_propertyIdentified is first question (moved from caseIntake in Session 34)
	const propIdVisible = await isQuestionVisible(page, 'q2_propertyIdentified');
	if (propIdVisible) {
		await selectRadio(page, 'q2_propertyIdentified', propertyIdentified);
		await page.waitForTimeout(300);
	}

	// Remaining questions only visible when propertyIdentified = 'Yes'
	if (propertyIdentified === 'No') return;

	await waitForQuestion(page, 'q1_propertyAreaType');
	await selectOption(page, 'q1_propertyAreaType', 'PLANNED_AUTHORITY');
	await page.waitForTimeout(300);

	// purchaseType
	await waitForQuestion(page, 'q2a_purchaseType_planned');
	await selectRadio(page, 'q2a_purchaseType_planned', 'direct_from_builder');
	await page.waitForTimeout(300);

	// Compound location field (q_propertyLocation replaces separate state/city/pincode)
	const compoundLocation = await isQuestionVisible(page, 'q_propertyLocation');
	if (compoundLocation) {
		// Location compound field — select state then city via sub-selectors
		const stateSelect = page.locator('[data-question-id="q_propertyLocation"] select').first();
		if (await stateSelect.isVisible().catch(() => false)) {
			await stateSelect.selectOption('Delhi');
			await page.waitForTimeout(500);
		}
	} else {
		// Legacy separate fields
		await waitForQuestion(page, 'q4_propertyStateName');
		await selectOption(page, 'q4_propertyStateName', 'Delhi');
		await page.waitForTimeout(500);

		await waitForQuestion(page, 'q5_propertyCityName');
		await selectOption(page, 'q5_propertyCityName', 'New Delhi');
		await page.waitForTimeout(300);
	}
}

/** Fill Page 2: propertyCharacter_homeLoan - Construction Type, Stage, Age, Area */
export async function fillPropertyCharacterPage(page: Page) {
	await waitForQuestion(page, 'q1_constructionType');
	await selectOption(page, 'q1_constructionType', 'Flat');

	await waitForQuestion(page, 'q2_PropertyStage');
	await selectRadio(page, 'q2_PropertyStage', 'Ready To Move');
	await page.waitForTimeout(300);

	// propertyAge only visible for Ready To Move
	const ageVisible = await isQuestionVisible(page, 'q3_propertyAge');
	if (ageVisible) {
		await selectOption(page, 'q3_propertyAge', '0-5');
	}

	await waitForQuestion(page, 'q4_carpetArea');
	await fillText(page, 'q4_carpetArea', '1200');
}

/** @deprecated Use fillPropertyCharacterPage instead */
export const fillPropertyTechnicalPage = fillPropertyCharacterPage;
/** @deprecated Use fillPropertyCharacterPage instead */
export const fillPropertyDetailsPage = fillPropertyCharacterPage;

/** Fill btRegistry_homeLoan (BT types only) */
export async function fillBtRegistryPage(page: Page) {
	await waitForQuestion(page, 'q1_isRegistryDone');
	await selectRadio(page, 'q1_isRegistryDone', 'Yes');
	await page.waitForTimeout(300);

	// sixMonthsPassedAfterRegistry only visible when isRegistryDone=Yes
	const sixMonthsVisible = await isQuestionVisible(page, 'q4_sixMonthsPassedAfterRegistry');
	if (sixMonthsVisible) {
		await selectRadio(page, 'q4_sixMonthsPassedAfterRegistry', 'Yes');
	}
}

/** Fill propertyCondition_homeLoan */
export async function fillPropertyConditionPage(page: Page) {
	await waitForQuestion(page, 'q1_propertyComplianceStatus');
	await selectRadio(page, 'q1_propertyComplianceStatus', 'fully_compliant');
	await page.waitForTimeout(300);

	// OC/CC available — only for Flat/Floor + Ready to Move
	const ocCcVisible = await isQuestionVisible(page, 'q2_ocCcAvailable');
	if (ocCcVisible) {
		await selectRadio(page, 'q2_ocCcAvailable', 'BOTH');
	}
}

/** Fill sellerTransaction_homeLoan */
export async function fillSellerTransactionPage(page: Page) {
	await waitForQuestion(page, 'q1_sellerOnLoan');
	await selectRadio(page, 'q1_sellerOnLoan', 'No');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q4_ifPropertyRegistered');
	await selectRadio(page, 'q4_ifPropertyRegistered', 'Yes');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q5_lastRegistryDuration');
	await selectRadio(page, 'q5_lastRegistryDuration', 'moreThanTwoYears');
}

/** Fill legalVerification_homeLoan */
export async function fillLegalVerificationPage(page: Page) {
	await waitForQuestion(page, 'q1_documentationReadiness');
	await selectRadio(page, 'q1_documentationReadiness', 'ALL_READY');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q2_propertyDisputeStatus');
	await selectRadio(page, 'q2_propertyDisputeStatus', 'CLEAR');
	await page.waitForTimeout(300);

	// NOC only visible for BT types
	const nocVisible = await isQuestionVisible(page, 'q3_nocFromPreviousLender');
	if (nocVisible) {
		await selectRadio(page, 'q3_nocFromPreviousLender', 'N/A');
	}
}

/** @deprecated Use fillSellerTransactionPage + fillLegalVerificationPage instead */
export const fillPropertyLegalPage = fillLegalVerificationPage;
/** @deprecated Use fillSellerTransactionPage + fillLegalVerificationPage instead */
export const fillSellerInfoPage = fillLegalVerificationPage;

/** Fill dealFinancials_homeLoan (New Loan + property identified) */
export async function fillDealFinancialsPage(page: Page) {
	await waitForQuestion(page, 'q1_auctionPropertyStatus');
	await selectRadio(page, 'q1_auctionPropertyStatus', 'STANDARD');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q2_mortgageYear');
	await selectRadio(page, 'q2_mortgageYear', '20');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q3_marketValue');
	await fillText(page, 'q3_marketValue', '10000000');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q4_propCost');
	await fillText(page, 'q4_propCost', '7500000');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q5_registryValue');
	await fillText(page, 'q5_registryValue', '7000000');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q6_deposit');
	await fillText(page, 'q6_deposit', '1875000');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q7_registryTimeline');
	await selectRadio(page, 'q7_registryTimeline', 'WITHIN_1_MONTH');
}

/** @deprecated Use fillDealFinancialsPage instead */
export const fillPropertyFinancialPage = fillDealFinancialsPage;
/** @deprecated Use fillDealFinancialsPage instead */
export const fillMortgageProfilePage = fillDealFinancialsPage;

/** @deprecated Auction status is now part of dealFinancials page (q1_auctionPropertyStatus) */
export async function fillFinalVerificationPage(page: Page) {
	// In V2, auction status is on dealFinancials page — this is a no-op for backward compat
}

/** Fill btExistingLoan_homeLoan (for BT/Top-up) */
export async function fillBtExistingLoanPage(page: Page) {
	await waitForQuestion(page, 'q1_sanctionAmount');
	await fillText(page, 'q1_sanctionAmount', '5000000');

	await waitForQuestion(page, 'q3_loanDisbursementDate');
	await fillText(page, 'q3_loanDisbursementDate', '2022-06');
	await page.waitForTimeout(300);

	// interestRateType only for BT types (not Top-up Only)
	const rateTypeVisible = await isQuestionVisible(page, 'q4_interestRateType');
	if (rateTypeVisible) {
		await selectRadio(page, 'q4_interestRateType', 'FLOATING');
		await page.waitForTimeout(300);
	}

	await waitForQuestion(page, 'q5_emiBounceHistory');
	await selectRadio(page, 'q5_emiBounceHistory', '0');
	await page.waitForTimeout(300);

	await waitForQuestion(page, 'q6_principalOutstanding');
	await fillText(page, 'q6_principalOutstanding', '3500000');

	await waitForQuestion(page, 'q7_existingInterestRate');
	await fillText(page, 'q7_existingInterestRate', '9.5');

	await waitForQuestion(page, 'q8_remainingTenure');
	await fillText(page, 'q8_remainingTenure', '180');

	await waitForQuestion(page, 'q9_selectSingleBank');
	// Select first available bank
	const bankBtn = page.locator('button[id="q9_selectSingleBank"]');
	await bankBtn.click();
	await page.waitForTimeout(300);
	const firstBank = page.locator('li[role="option"]').first();
	await firstBank.click();
	await page.waitForTimeout(200);

	await waitForQuestion(page, 'q10_includedCurrentEMIsAmount');
	await fillText(page, 'q10_includedCurrentEMIsAmount', '35000');
}

/** @deprecated Use fillBtExistingLoanPage instead */
export const fillExistingLoanInfoPage = fillBtExistingLoanPage;

/** Fill loanRequirements_homeLoan (for BT/Top-up) */
export async function fillLoanRequirementsPage(
	page: Page,
	options: { fillMortgageYear?: boolean; fillTopUp?: boolean } = {}
) {
	await waitForQuestion(page, 'q1_marketValue');
	await fillText(page, 'q1_marketValue', '7500000');

	if (options.fillMortgageYear !== false) {
		const mortgageYearVisible = await isQuestionVisible(page, 'q2_mortgageYear');
		if (mortgageYearVisible) {
			await selectRadio(page, 'q2_mortgageYear', '20');
		}
	}

	if (options.fillTopUp) {
		const topUpTenureVisible = await isQuestionVisible(page, 'q4_topUpTenure');
		if (topUpTenureVisible) {
			await selectOption(page, 'q4_topUpTenure', '10');
			await page.waitForTimeout(300);

			await waitForQuestion(page, 'q5_topUpAmount');
			await fillText(page, 'q5_topUpAmount', '1000000');

			await waitForQuestion(page, 'q6_topUpPurpose');
			await selectOption(page, 'q6_topUpPurpose', 'RENOVATION');
		}
	}
}

/** Fill sanctionProfile_homeLoan (pre-sanction, New Loan + No property) */
export async function fillSanctionProfilePage(page: Page) {
	await waitForQuestion(page, 'q1_mortgageYear');
	await selectRadio(page, 'q1_mortgageYear', '20');

	await waitForQuestion(page, 'q2_sanctionType');
	await selectRadio(page, 'q2_sanctionType', 'Based On Eligibility');
}
