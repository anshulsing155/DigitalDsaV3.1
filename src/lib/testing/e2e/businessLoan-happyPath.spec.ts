/**
 * Business Loan — Happy Path E2E Tests
 */
import { test, expect } from '@playwright/test';
import {
	navigateToBusinessLoan,
	fillCaseIntakePage,
	fillEligibilityCheckPage,
	fillBusinessLocationPage,
	ROUTES
} from './businessLoan.setup';
import { clickNext, isNextEnabled, waitForQuestion } from './formHelpers';

test.describe('Business Loan Form — Happy Path', () => {
	test.describe.configure({ mode: 'serial' });

	test('navigates to Business Loan form from how-can-we-help', async ({ page }) => {
		await navigateToBusinessLoan(page);
		await expect(page).toHaveURL(/.*\/form\/unsecure-loan\/business-loan.*/);
	});

	test('fills case intake page', async ({ page }) => {
		await navigateToBusinessLoan(page);
		await fillCaseIntakePage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('fills eligibility check page', async ({ page }) => {
		await navigateToBusinessLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to business location page', async ({ page }) => {
		await navigateToBusinessLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'q4_businessStateName');
	});

	test('fills business location page', async ({ page }) => {
		await navigateToBusinessLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);
		await fillBusinessLocationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('Next button disabled when required fields empty', async ({ page }) => {
		await navigateToBusinessLoan(page);
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);
	});
});
