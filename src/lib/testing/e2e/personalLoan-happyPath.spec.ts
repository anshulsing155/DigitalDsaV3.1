/**
 * Personal Loan — Happy Path E2E Tests
 */
import { test, expect } from '@playwright/test';
import {
	navigateToPersonalLoan,
	fillCaseIntakePage,
	fillEligibilityCheckPage,
	fillLocationPage,
	ROUTES
} from './personalLoan.setup';
import { clickNext, isNextEnabled, waitForQuestion } from './formHelpers';

test.describe('Personal Loan Form — Happy Path', () => {
	test.describe.configure({ mode: 'serial' });

	test('navigates to Personal Loan form from how-can-we-help', async ({ page }) => {
		await navigateToPersonalLoan(page);
		await expect(page).toHaveURL(/.*\/form\/unsecure-loan\/personal-loan.*/);
	});

	test('fills case intake page', async ({ page }) => {
		await navigateToPersonalLoan(page);
		await fillCaseIntakePage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('fills eligibility check page', async ({ page }) => {
		await navigateToPersonalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to location page', async ({ page }) => {
		await navigateToPersonalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'q1_residenceStateName');
	});

	test('fills location page', async ({ page }) => {
		await navigateToPersonalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);
		await fillLocationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('Next button disabled when assessment question unanswered', async ({ page }) => {
		await navigateToPersonalLoan(page);
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);
	});
});
