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

test.describe('Home Loan - Top-up Only Flow', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page, 'Top-up Only');
	});

	test('should show topTenure and topUpAmount instead of newTenure on loan requirements', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await clickNext(page);

		// Existing loan info
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '5000000');
		await fillText(page, 'principalOutstanding', '3500000');
		await fillText(page, 'existingInterestRate', '9.5');
		await fillText(page, 'remainingTenure', '180');

		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'SBI');
		}

		await clickNext(page);

		// Loan requirements page - Top-up specific fields
		await waitForQuestion(page, 'currentPropertyValue');

		// newTenure should NOT be visible (showWhen: loanType != "Top-up Only")
		const newTenureField = page.locator('[data-question="newTenure"]');
		await expect(newTenureField).not.toBeVisible();

		// topTenure and topUpAmount SHOULD be visible
		const topTenureField = page.locator('[data-question="topTenure"]');
		const topUpAmountField = page.locator('[data-question="topUpAmount"]');
		await expect(topTenureField).toBeVisible();
		await expect(topUpAmountField).toBeVisible();
	});

	test('should fill loan requirements with top-up specific fields', async ({ page }) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await clickNext(page);

		// Existing loan info
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '4000000');
		await fillText(page, 'principalOutstanding', '2800000');
		await fillText(page, 'existingInterestRate', '8.75');
		await fillText(page, 'remainingTenure', '200');

		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'HDFC');
		}

		await clickNext(page);

		// Loan requirements page with top-up fields
		await waitForQuestion(page, 'currentPropertyValue');
		await fillText(page, 'currentPropertyValue', '6000000');
		await fillText(page, 'topTenure', '10');
		await fillText(page, 'topUpAmount', '1500000');

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should confirm newTenure field is absent throughout the flow', async ({ page }) => {
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location
		await waitForQuestion(page, 'state');
		await selectOption(page, 'state', 'Delhi');
		await selectOption(page, 'city', 'New Delhi');
		await clickNext(page);

		// Existing loan info
		await waitForQuestion(page, 'sanctionAmount');
		await fillText(page, 'sanctionAmount', '3000000');
		await fillText(page, 'principalOutstanding', '2000000');
		await fillText(page, 'existingInterestRate', '10');
		await fillText(page, 'remainingTenure', '120');

		const bankSelector = page.locator('[data-question="selectSingleBank"]');
		if (await bankSelector.isVisible()) {
			await selectOption(page, 'selectSingleBank', 'ICICI');
		}

		await clickNext(page);

		// On loan requirements page, verify newTenure is NOT present at all
		await waitForQuestion(page, 'currentPropertyValue');
		const newTenureElements = page.locator('[data-question="newTenure"]');
		const count = await newTenureElements.count();
		expect(count).toBe(0);
	});
});
