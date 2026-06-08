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

test.describe('Home Loan - Form Validation', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page);
	});

	test('should disable Next button until all required selection page questions are answered', async ({
		page
	}) => {
		// On selection page, Next should be disabled initially
		await waitForQuestion(page, 'q1_isDefaulter');
		let nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);

		// Answer first question: isDefaulter = No
		await selectRadio(page, 'q1_isDefaulter', 'No');

		// After answering isDefaulter=No, madeGuarantor question should appear
		await waitForQuestion(page, 'q11_madeGuarantor');
		const madeGuarantorField = page.locator('[data-question="q11_madeGuarantor"]');
		await expect(madeGuarantorField).toBeVisible();

		// Next should still be disabled since madeGuarantor is not answered
		nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);

		// Answer madeGuarantor = No
		await selectRadio(page, 'q11_madeGuarantor', 'No');

		// Now Next should be enabled
		nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should show conditional question q11_madeGuarantor only when isDefaulter is No', async ({
		page
	}) => {
		await waitForQuestion(page, 'q1_isDefaulter');

		// Initially madeGuarantor should not be visible
		const madeGuarantorField = page.locator('[data-question="q11_madeGuarantor"]');
		await expect(madeGuarantorField).not.toBeVisible();

		// Select isDefaulter = No
		await selectRadio(page, 'q1_isDefaulter', 'No');

		// madeGuarantor should now appear
		await waitForQuestion(page, 'q11_madeGuarantor');
		await expect(madeGuarantorField).toBeVisible();
	});

	test('should disable Next on property location page until required fields are filled', async ({
		page
	}) => {
		// Complete selection page first
		await fillSelectionPage(page);
		await clickNext(page);

		// On property location page, Next should be disabled initially
		await waitForQuestion(page, 'propertyIdentified');
		let nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);

		// Fill propertyIdentified
		await selectRadio(page, 'propertyIdentified', 'No');

		// Still disabled without state/city
		nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);

		// Fill state
		await selectOption(page, 'state', 'Maharashtra');

		// Still disabled without city
		nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);

		// Fill city
		await selectOption(page, 'city', 'Mumbai');

		// Fill residenceOptionSame
		await selectRadio(page, 'residenceOptionSame', 'Yes');

		// Now Next should be enabled
		nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should allow proceeding when optional fields are left empty', async ({ page }) => {
		// Complete selection page
		await fillSelectionPage(page);
		await clickNext(page);

		// Property location - fill only required fields
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await selectRadio(page, 'residenceOptionSame', 'Yes');

		// Next should be enabled even without optional fields
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);

		// Should successfully navigate to next page
		await clickNext(page);
		await waitForQuestion(page, 'applicantName');
		const applicantField = page.locator('[data-question="applicantName"]');
		await expect(applicantField).toBeVisible();
	});
});
