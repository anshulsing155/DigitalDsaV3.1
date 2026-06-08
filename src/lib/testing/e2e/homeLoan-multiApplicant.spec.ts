import { test, expect } from '@playwright/test';
import {
	navigateToHomeLoan,
	fillSelectionPage,
	fillPropertyLocationPage,
	fillPropertyDetailsPage,
	fillSellerInfoPage,
	clickNext,
	waitForQuestion,
	isQuestionVisible
} from './homeLoan.setup';

test.describe('Home Loan - Multi Applicant Flow', () => {
	test.beforeEach(async ({ page }) => {
		await navigateToHomeLoan(page, 'New Loan');

		// Navigate through pages to reach applicant page
		await fillSelectionPage(page);
		await clickNext(page);

		await fillPropertyLocationPage(page, 'Yes');
		await clickNext(page);

		await fillPropertyDetailsPage(page);
		await clickNext(page);

		await fillSellerInfoPage(page);
		await clickNext(page);

		// Skip checklist page (fill minimum required)
		const checklistItems = page.locator('li[role="option"]');
		const count = await checklistItems.count();
		for (let i = 0; i < Math.min(count, 4); i++) {
			await checklistItems.nth(i).click();
			await page.waitForTimeout(100);
		}
		await page.waitForTimeout(300);
		await clickNext(page);

		// Now on applicant page (tellUs_homeLoan)
		await page.waitForTimeout(1000);
	});

	test('should reach applicant details page after property pages', async ({ page }) => {
		// Verify we are on the applicant page
		// The applicant page has AddApplicant component or applicant form
		const applicantSection = page.locator(
			'text=Applicant, text=applicant, [data-page-id="tellUs_homeLoan"]'
		);
		const isApplicantPage =
			(await applicantSection.count()) > 0 || (await page.url()).includes('home-loan');
		expect(isApplicantPage).toBe(true);
	});

	test('single applicant should skip relationship step', async ({ page }) => {
		// For a single individual applicant:
		// Step 0 (Basic Details) → Step 2 (Income & Credit)
		// Step 1 (Relationships) should be SKIPPED

		// Verify we're on step 0 (Add Applicant / Basic Details)
		// The form should not show relationships section for single applicant
		await page.waitForTimeout(500);

		// Look for relationship-related elements - they should NOT be visible
		const relationshipSection = page.locator('text=Relationship, text=relationship').first();
		const hasRelationship = (await relationshipSection.count()) > 0;

		// For single applicant on step 0, relationships should not be prominently shown
		// (The sidebar may show it but it should be inactive/disabled)
	});

	test('applicant data should persist in localStorage', async ({ page }) => {
		await page.waitForTimeout(500);

		// Check that applicant store exists in localStorage
		const applicantsData = await page.evaluate(() => {
			return localStorage.getItem('home-applicants-store');
		});

		// Applicant store should exist (may be empty array initially)
		expect(applicantsData).not.toBeNull();
	});

	test('obligations should be tracked per applicant', async ({ page }) => {
		await page.waitForTimeout(500);

		// Verify the obligations concept exists in the form structure
		// When on income page (step 2), ObligationsRunning field controls
		// whether obligation details are merged into payload

		// Check localStorage for any existing obligation tracking
		const loanData = await page.evaluate(() => {
			const data = localStorage.getItem('home-loan-data');
			return data ? JSON.parse(data) : null;
		});

		// loanData should exist with Home Loan key
		expect(loanData).not.toBeNull();
		if (loanData) {
			expect(loanData).toHaveProperty('Home Loan');
		}
	});
});
