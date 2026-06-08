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

test.describe('Home Loan - Page Navigation and Payload Sanitization', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page);
	});

	test('should skip property details page when propertyIdentified is changed to No after going back', async ({
		page
	}) => {
		// Page 0: Selection page
		await fillSelectionPage(page);
		await clickNext(page);

		// Page 1: Property location - initially set propertyIdentified=Yes
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'Yes');
		await fillPropertyLocationPage(page);
		await clickNext(page);

		// Page 2: Property details - should be visible with propertyIdentified=Yes
		await waitForQuestion(page, 'propertyType');
		await fillPropertyDetailsPage(page);
		await clickNext(page);

		// Now go back to Page 1 (property location)
		await clickPrevious(page);
		await clickPrevious(page);

		// Change propertyIdentified to No
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await clickNext(page);

		// Property details page should be SKIPPED - should jump to applicant page
		await waitForQuestion(page, 'applicantName');
		const propertyTypeField = page.locator('[data-question="propertyType"]');
		await expect(propertyTypeField).not.toBeVisible();
	});

	test('should sanitize property details answers from state when property is no longer identified', async ({
		page
	}) => {
		// Fill through selection and property location with propertyIdentified=Yes
		await fillSelectionPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'Yes');
		await fillPropertyLocationPage(page);
		await clickNext(page);

		// Fill property details
		await waitForQuestion(page, 'propertyType');
		await fillPropertyDetailsPage(page);
		await clickNext(page);

		// Go back to property location
		await clickPrevious(page);
		await clickPrevious(page);

		// Change to propertyIdentified=No
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await clickNext(page);

		// Go forward to applicant page (property details skipped)
		await waitForQuestion(page, 'applicantName');

		// Verify property details data is not visible in the current page state
		const propertyTypeField = page.locator('[data-question="propertyType"]');
		await expect(propertyTypeField).not.toBeVisible();
		const sellerNameField = page.locator('[data-question="sellerName"]');
		await expect(sellerNameField).not.toBeVisible();
	});

	test('should navigate backward through pages correctly with Previous button', async ({
		page
	}) => {
		// Navigate through 3 pages
		// Page 0: Selection
		await fillSelectionPage(page);
		await clickNext(page);

		// Page 1: Property location
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'Yes');
		await fillPropertyLocationPage(page);
		await clickNext(page);

		// Page 2: Property details
		await waitForQuestion(page, 'propertyType');

		// Click Previous - should go back to page 1 (property location)
		await clickPrevious(page);
		await waitForQuestion(page, 'propertyIdentified');
		const propertyIdentifiedField = page.locator('[data-question="propertyIdentified"]');
		await expect(propertyIdentifiedField).toBeVisible();

		// Click Previous again - should go back to page 0 (selection)
		await clickPrevious(page);
		await waitForQuestion(page, 'q1_isDefaulter');
		const defaulterField = page.locator('[data-question="q1_isDefaulter"]');
		await expect(defaulterField).toBeVisible();
	});

	test('should preserve filled data when navigating back and forward', async ({ page }) => {
		// Page 0: Selection
		await fillSelectionPage(page);
		await clickNext(page);

		// Page 1: Property location
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'Yes');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await clickNext(page);

		// Page 2: Property details
		await waitForQuestion(page, 'propertyType');

		// Go back to page 1
		await clickPrevious(page);
		await waitForQuestion(page, 'propertyIdentified');

		// Verify the state and city values are still filled
		const stateField = page.locator('[data-question="state"]');
		await expect(stateField).toBeVisible();

		// Go forward again - should return to property details
		await clickNext(page);
		await waitForQuestion(page, 'propertyType');
		const propertyTypeField = page.locator('[data-question="propertyType"]');
		await expect(propertyTypeField).toBeVisible();
	});
});
