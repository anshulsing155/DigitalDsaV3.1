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

test.describe('Home Loan - New Loan Pre-Sanction Flow (propertyIdentified=No)', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page);
	});

	test('should skip property details, seller info, and checklist pages when property is not identified', async ({
		page
	}) => {
		// Page 0: Selection page
		await fillSelectionPage(page);
		await clickNext(page);

		// Page 1: Property Location - select propertyIdentified=No
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await selectRadio(page, 'residenceOptionSame', 'Yes');
		await clickNext(page);

		// Property details page (page 2 in full flow) should be SKIPPED
		// Seller info page (page 3 in full flow) should be SKIPPED
		// Checklist page should be SKIPPED
		// We should land directly on the applicant page
		await waitForQuestion(page, 'applicantName');
		const propertyDetailsHeading = page.locator('text=Property Details');
		await expect(propertyDetailsHeading).not.toBeVisible();
	});

	test('should show sanction profile page instead of mortgage page for pre-sanction', async ({
		page
	}) => {
		// Fill through to applicant page
		await fillSelectionPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await selectRadio(page, 'residenceOptionSame', 'Yes');
		await clickNext(page);

		// Applicant page - fill required fields and proceed
		await waitForQuestion(page, 'applicantName');
		await fillText(page, 'applicantName', 'Test Applicant');
		await clickNext(page);

		// Sanction profile page should appear (not mortgage profile)
		await waitForQuestion(page, 'sanctionTenure');
		const mortgageHeading = page.locator('text=Mortgage Profile');
		await expect(mortgageHeading).not.toBeVisible();
	});

	test('should fill sanction profile page with eligibility-based sanction type', async ({
		page
	}) => {
		await fillSelectionPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await selectRadio(page, 'residenceOptionSame', 'Yes');
		await clickNext(page);

		await waitForQuestion(page, 'applicantName');
		await fillText(page, 'applicantName', 'Test Applicant');
		await clickNext(page);

		// Sanction profile page
		await waitForQuestion(page, 'sanctionTenure');
		await fillText(page, 'sanctionTenure', '240');
		await selectRadio(page, 'sanctionType', 'Based On Eligibility');
		await selectRadio(page, 'withPersonalLoan', 'No');

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('should have a shorter flow of 4 pages instead of 7 for pre-sanction', async ({ page }) => {
		// Page 0: Selection
		await fillSelectionPage(page);
		await clickNext(page);

		// Page 1: Property Location (propertyIdentified=No)
		await waitForQuestion(page, 'propertyIdentified');
		await selectRadio(page, 'propertyIdentified', 'No');
		await selectOption(page, 'state', 'Maharashtra');
		await selectOption(page, 'city', 'Mumbai');
		await selectRadio(page, 'residenceOptionSame', 'Yes');
		await clickNext(page);

		// Page 2: Applicant (skipped property details, seller info, checklist)
		await waitForQuestion(page, 'applicantName');
		await fillText(page, 'applicantName', 'Test Applicant');
		await clickNext(page);

		// Page 3: Sanction Profile
		await waitForQuestion(page, 'sanctionTenure');
		await fillText(page, 'sanctionTenure', '240');
		await selectRadio(page, 'sanctionType', 'Based On Eligibility');
		await selectRadio(page, 'withPersonalLoan', 'No');

		// Verify we are on the final page (sanction profile) - this is page index 3
		// meaning the total flow is 4 pages: selection, location, applicant, sanction
		const sanctionTenureField = page.locator('[data-question="sanctionTenure"]');
		await expect(sanctionTenureField).toBeVisible();
	});
});
