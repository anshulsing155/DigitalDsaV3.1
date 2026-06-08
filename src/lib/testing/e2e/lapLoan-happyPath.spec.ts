/**
 * LAP (Loan Against Property) — Happy Path E2E Tests
 */
import { test, expect } from '@playwright/test';
import {
	navigateToLapLoan,
	fillCaseIntakePage,
	fillPropertyIdentificationPage,
	fillPropertyTechnicalLapPage,
	fillPropertyLegalLapPage,
	ROUTES
} from './lapLoan.setup';
import { clickNext, isNextEnabled, waitForQuestion } from './formHelpers';

test.describe('LAP Form — Happy Path', () => {
	test.describe.configure({ mode: 'serial' });

	test('navigates to LAP form from how-can-we-help', async ({ page }) => {
		await navigateToLapLoan(page);
		await expect(page).toHaveURL(/.*\/form\/Lap.*/);
	});

	test('fills case intake page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('fills property identification page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPropertyIdentificationPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to property technical page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPropertyIdentificationPage(page);
		await clickNext(page);

		// Should be on the technical page
		await waitForQuestion(page, 'q1_propertyType');
	});

	test('fills property technical page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPropertyIdentificationPage(page);
		await clickNext(page);
		await fillPropertyTechnicalLapPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('navigates to property legal page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPropertyIdentificationPage(page);
		await clickNext(page);
		await fillPropertyTechnicalLapPage(page);
		await clickNext(page);

		// Should show legal questions
		const legalQuestion = await page
			.locator(
				'input[name="q_existingEncumbrance"], input[name="q_ownershipChainComplete"], input[name="q_noLegalDispute"]'
			)
			.first();
		await expect(legalQuestion).toBeVisible({ timeout: 10000 });
	});

	test('fills property legal page', async ({ page }) => {
		await navigateToLapLoan(page);
		await fillCaseIntakePage(page);
		await clickNext(page);
		await fillPropertyIdentificationPage(page);
		await clickNext(page);
		await fillPropertyTechnicalLapPage(page);
		await clickNext(page);
		await fillPropertyLegalLapPage(page);

		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(true);
	});

	test('Next button disabled when required fields empty', async ({ page }) => {
		await navigateToLapLoan(page);
		// Don't fill anything — Next should be disabled
		const nextEnabled = await isNextEnabled(page);
		expect(nextEnabled).toBe(false);
	});
});
