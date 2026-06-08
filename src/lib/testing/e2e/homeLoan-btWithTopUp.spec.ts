import { test, expect } from '@playwright/test';
import {
	navigateToHomeLoan,
	fillText,
	selectOption,
	clickNext,
	isNextEnabled,
	waitForQuestion,
	fillSelectionPage
} from './homeLoan.setup';

test.describe('Home Loan - Balance Transfer With Top-up Flow', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page, 'Balance Transfer With Top-up');
	});

	test('should show both newTenure and topTenure fields on loan requirements page', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Pune');
		await clickNext(page);

		// Existing loan info
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '6000000');
		await fillText(page, 'principalOutstanding', '4500000');
		await fillText(page, 'existingInterestRate', '9.25');
		await fillText(page, 'remainingTenure', '200');

		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'Axis');
		}

		await clickNext(page);

		// Loan requirements page - both BT and top-up fields should be visible
		await waitForQuestion(page, 'currentPropertyValue');

		const newTenureField = page.locator('[data-question="newTenure"]');
		const topTenureField = page.locator('[data-question="topTenure"]');
		const topUpAmountField = page.locator('[data-question="topUpAmount"]');

		await expect(newTenureField).toBeVisible();
		await expect(topTenureField).toBeVisible();
		await expect(topUpAmountField).toBeVisible();
	});

	test('should fill all fields and validate the complete BT With Top-up form', async ({ page }) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Tamil Nadu');
		await selectOption(page, 'city', 'Chennai');
		await clickNext(page);

		// Existing loan info
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '8000000');
		await fillText(page, 'principalOutstanding', '5500000');
		await fillText(page, 'existingInterestRate', '9.0');
		await fillText(page, 'remainingTenure', '240');

		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'SBI');
		}

		await clickNext(page);

		// Loan requirements page - fill all fields
		await waitForQuestion(page, 'currentPropertyValue');
		await fillText(page, 'currentPropertyValue', '12000000');
		await fillText(page, 'newTenure', '25');
		await fillText(page, 'topTenure', '15');
		await fillText(page, 'topUpAmount', '2000000');

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should have existing loan info page before loan requirements in the sequence', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Gujarat');
		await selectOption(page, 'city', 'Ahmedabad');
		await clickNext(page);

		// Verify we are on existingLoanInfo page (not property details)
		await waitForQuestion(page, 'sanctionAmount');
		const sanctionField = page.locator('[data-question="sanctionAmount"]');
		await expect(sanctionField).toBeVisible();

		// Verify property details are NOT shown at this step
		const propertyTypeField = page.locator('[data-question="propertyType"]');
		await expect(propertyTypeField).not.toBeVisible();
	});
});
