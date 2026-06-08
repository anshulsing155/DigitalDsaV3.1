import { test, expect } from '@playwright/test';
import {
	navigateToHomeLoan,
	selectRadio,
	fillText,
	selectOption,
	clickNext,
	clickPrevious,
	isNextEnabled,
	waitForQuestion,
	fillSelectionPage,
	fillPropertyLocationPage,
	fillPropertyDetailsPage,
	fillSellerInfoPage
} from './homeLoan.setup';

test.describe('Home Loan - Balance Transfer Only Flow', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page, 'Balance Transfer Only');
	});

	test('should not show propertyIdentified question on property location page', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location page should NOT have propertyIdentified question
		// since this is Balance Transfer, not New Loan
		await waitForQuestion(page, 'state');
		const propertyIdentifiedField = page.locator('[data-question="propertyIdentified"]');
		await expect(propertyIdentifiedField).not.toBeVisible();

		// Should still have state and city fields
		const stateField = page.locator('[data-question="state"]');
		await expect(stateField).toBeVisible();
	});

	test('should show existing loan info page with all required fields', async ({ page }) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location page
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Karnataka');
		await selectOption(page, 'city', 'Bangalore');
		await clickNext(page);

		// Existing loan info page should appear
		await waitForQuestion(page, 'sanctionAmount');

		const sanctionAmountField = page.locator('[data-question="sanctionAmount"]');
		const principalOutstandingField = page.locator('[data-question="principalOutstanding"]');
		const existingInterestRateField = page.locator('[data-question="existingInterestRate"]');
		const remainingTenureField = page.locator('[data-question="remainingTenure"]');

		await expect(sanctionAmountField).toBeVisible();
		await expect(principalOutstandingField).toBeVisible();
		await expect(existingInterestRateField).toBeVisible();
		await expect(remainingTenureField).toBeVisible();
	});

	test('should fill existing loan info and proceed to loan requirements', async ({ page }) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Karnataka');
		await selectOption(page, 'city', 'Bangalore');
		await clickNext(page);

		// Existing loan info page
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '5000000');
		await fillText(page, 'principalOutstanding', '3500000');
		await fillText(page, 'existingInterestRate', '9.5');
		await fillText(page, 'remainingTenure', '180');

		// Select a single bank from the bank selector
		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'SBI');
		}

		await clickNext(page);

		// Loan requirements page
		await waitForQuestion(page, 'currentPropertyValue');
		await fillText(page, 'currentPropertyValue', '7500000');
		await fillText(page, 'newTenure', '20');

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should have a different page sequence from New Loan flow (btTopUpSequence)', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// In BT flow, after property location we get existingLoanInfo
		// This differs from New Loan which goes to propertyDetails
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Karnataka');
		await selectOption(page, 'city', 'Bangalore');
		await clickNext(page);

		// Verify we land on existingLoanInfo, not propertyDetails
		await waitForQuestion(page, 'sanctionAmount');
		const propertyDetailsQuestion = page.locator('[data-question="propertyType"]');
		await expect(propertyDetailsQuestion).not.toBeVisible();

		const existingLoanQuestion = page.locator('[data-question="sanctionAmount"]');
		await expect(existingLoanQuestion).toBeVisible();
	});
});
