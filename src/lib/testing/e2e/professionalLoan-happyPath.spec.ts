/**
 * Professional Loan — Happy Path E2E Tests
 */
import { test, expect } from '@playwright/test';
import {
	navigateToProfessionalLoan,
	fillCaseIntakePage,
	fillEligibilityCheckPage,
	fillProfessionalLocationPage,
	ROUTES
} from './professionalLoan.setup';
import { clickNext, isNextEnabled, waitForQuestion } from './formHelpers';

test.describe('Professional Loan Form — Happy Path', () => {
	test.describe.configure({ mode: 'serial' });

	test('navigates to Professional Loan form from how-can-we-help', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		await expect(page).toHaveURL(/.*\/form\/unsecure-loan\/professional-loan.*/);
	});

	test('fills case intake page', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		await fillCaseIntakePage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('fills eligibility check page', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to location page', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);

		await waitForQuestion(page, 'q4_businessStateName');
	});

	test('fills professional location page', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillEligibilityCheckPage(page);
		await clickNext(page);
		await fillProfessionalLocationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('Next button disabled when required fields empty', async ({ page }) => {
		await navigateToProfessionalLoan(page);
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);
	});
});
