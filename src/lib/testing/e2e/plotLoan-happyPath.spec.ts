/**
 * Plot Loan — Happy Path E2E Tests
 */
import { test, expect } from '@playwright/test';
import {
	navigateToPlotLoan,
	fillCaseIntakePage,
	fillPlotIdentificationPage,
	fillSellerInformationPage,
	ROUTES
} from './plotLoan.setup';
import { clickNext, isNextEnabled, waitForQuestion } from './formHelpers';

test.describe('Plot Loan Form — Happy Path', () => {
	test.describe.configure({ mode: 'serial' });

	test('navigates to Plot Loan form from how-can-we-help', async ({ page }) => {
		await navigateToPlotLoan(page);
		await expect(page).toHaveURL(/.*\/form\/plot-loan.*/);
	});

	test('fills case intake page', async ({ page }) => {
		await navigateToPlotLoan(page);
		await fillCaseIntakePage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('fills plot identification page', async ({ page }) => {
		await navigateToPlotLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPlotIdentificationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to seller information page', async ({ page }) => {
		await navigateToPlotLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPlotIdentificationPage(page);
		await clickNext(page);

		// Should show seller questions
		await waitForQuestion(page, 'q1_purchasedFrom');
	});

	test('fills seller information page', async ({ page }) => {
		await navigateToPlotLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPlotIdentificationPage(page);
		await clickNext(page);
		await fillSellerInformationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('Next button disabled when required fields empty', async ({ page }) => {
		await navigateToPlotLoan(page);
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);
	});
});
