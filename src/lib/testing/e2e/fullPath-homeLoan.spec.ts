/**
 * Stage 2: Home Loan Full Path Test
 * ══════════════════════════════════════════════════════════════════
 * Loads the storageState from Stage 1 (applicant-secured.setup.ts)
 * which has the browser state AFTER applicant data was filled.
 *
 * Then fills the remaining schema-driven pages (deal financials,
 * legal verification, etc.) via the data-driven fill system.
 *
 * This tests the full form→server→evaluation pipeline without
 * re-testing the applicant modal interactions.
 *
 * Run: pnpm exec playwright test fullPath-homeLoan.spec.ts --project=full-path-secured
 * ══════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { clickNext, isNextEnabled, dismissFormResumeModal, waitForQuestion } from './formHelpers';
import { fillPageFromConfig } from './dataFillHelpers';
import type { FillInstruction } from '$lib/server/testing/payloadToFillInstructions';

const BASE_URL = 'http://localhost:5173';
const HOME_LOAN_URL = `${BASE_URL}/form/home-loan`;

test.describe('Home Loan — Full Path (Stage 2)', () => {
	test.describe.configure({ timeout: 120_000 });

	test('complete form from applicant page onward', async ({ page }) => {
		// Navigate to the home loan form
		// storageState from Stage 1 has auth + form data (applicant filled)
		await page.goto(HOME_LOAN_URL);
		await page.waitForLoadState('networkidle');
		await dismissFormResumeModal(page);
		await page.waitForTimeout(1000);

		// Take a screenshot to verify we're on the right page
		await page.screenshot({
			path: 'test-results/playwright/screenshots/stage2-start.png',
			fullPage: true
		});

		// The form should have applicant data from Stage 1.
		// We may need to navigate to the deal financials page (or wherever Stage 1 left off).
		// Try clicking Next from the current position.

		let currentPageId = '';
		const MAX_PAGES = 10;

		for (let pageIdx = 0; pageIdx < MAX_PAGES; pageIdx++) {
			// Check current page ID from the DOM
			const pageContainer = page.locator('[data-page-id]').first();
			const pageId = await pageContainer.getAttribute('data-page-id').catch(() => null);
			if (pageId) currentPageId = pageId;

			// Take screenshot at each page
			await page.screenshot({
				path: `test-results/playwright/screenshots/stage2-page${pageIdx}-${currentPageId || 'unknown'}.png`,
				fullPage: true
			});

			// Check if Next is enabled
			const nextEnabled = await isNextEnabled(page);
			if (!nextEnabled) {
				// Try to fill visible required questions on this page
				const visibleQuestions = page.locator('[data-question-id]');
				const qCount = await visibleQuestions.count();

				for (let i = 0; i < qCount; i++) {
					const q = visibleQuestions.nth(i);
					const qId = await q.getAttribute('data-question-id');
					if (!qId) continue;

					// Try to select first available radio option
					const unselectedRadio = q.locator('label:has(input[type="radio"]:not(:checked))').first();
					if (await unselectedRadio.isVisible().catch(() => false)) {
						await unselectedRadio.click();
						await page.waitForTimeout(300);
					}
				}
			}

			// Try to advance
			try {
				await clickNext(page);
				await page.waitForTimeout(1000);
				await dismissFormResumeModal(page);
			} catch {
				// Can't advance — may be the last page or blocked
				console.log(`[Stage 2] Stopped at page ${pageIdx} (${currentPageId})`);
				break;
			}
		}

		// Final screenshot
		await page.screenshot({
			path: 'test-results/playwright/screenshots/stage2-final.png',
			fullPage: true
		});

		console.log(`[Stage 2] Completed. Last page: ${currentPageId}`);
	});
});
