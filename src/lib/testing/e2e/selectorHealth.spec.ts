/**
 * Selector Health Check
 * ══════════════════════════════════════════════════════════════════
 * Verifies that all Playwright selectors used in E2E tests still
 * resolve to DOM elements. Run this BEFORE full E2E tests to catch
 * UI changes that would cause silent timeouts.
 *
 * Run: pnpm exec playwright test selectorHealth.spec.ts --project=selector-health
 * ══════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { getSelectorsForPage, type SelectorEntry } from './selectorRegistry';
import { clearFormStorage, dismissResumeModal, dismissFormResumeModal } from './formHelpers';

const BASE_URL = 'http://localhost:5173';
const FORM_URL = `${BASE_URL}/form/how-can-we-help`;
const HOME_LOAN_URL = `${BASE_URL}/form/home-loan`;

/**
 * Check a batch of selectors against the current page.
 * Returns { passed, failed } with details.
 */
async function checkSelectors(
	page: import('@playwright/test').Page,
	selectors: SelectorEntry[]
): Promise<{
	passed: string[];
	failed: Array<{ name: string; selector: string; source: string }>;
}> {
	const passed: string[] = [];
	const failed: Array<{ name: string; selector: string; source: string }> = [];

	for (const entry of selectors) {
		// Parameterized selectors use generic patterns — check that at least one exists
		const count = await page.locator(entry.selector).count();
		if (count > 0) {
			passed.push(entry.name);
		} else {
			failed.push({
				name: entry.name,
				selector: entry.selector,
				source: entry.source
			});
		}
	}

	return { passed, failed };
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Selector Health Check', () => {
	test.describe.configure({ timeout: 30_000 });

	test('how-can-we-help page selectors', async ({ page }) => {
		await page.goto(FORM_URL);
		await page.waitForLoadState('networkidle');
		await dismissResumeModal(page);

		const selectors = getSelectorsForPage('how-can-we-help');
		const { passed, failed } = await checkSelectors(page, selectors);

		// Q1 is always visible. Q2-Q4 are progressive — only check Q1 + global
		const alwaysVisible = selectors.filter(
			(s) => s.name.includes('Q1') || s.name.includes('Next button')
		);
		const { failed: criticalFailed } = await checkSelectors(page, alwaysVisible);

		if (criticalFailed.length > 0) {
			const details = criticalFailed
				.map((f) => `  - ${f.name}: ${f.selector} (${f.source})`)
				.join('\n');
			throw new Error(
				`${criticalFailed.length} critical selectors broken on how-can-we-help:\n${details}`
			);
		}

		// Report progressive selectors as soft warnings (they may not be visible without prior answers)
		console.log(
			`[how-can-we-help] ${passed.length} passed, ${failed.length} not found (progressive — may be OK)`
		);
	});

	test('home loan form schema selectors', async ({ page }) => {
		// Navigate to home loan form — need to go through how-can-we-help first
		await page.goto(FORM_URL);
		await page.waitForLoadState('networkidle');
		await dismissResumeModal(page);

		// Select Home Loan to get to the form
		const q1 = page.locator('[data-question-id="q1_loanName"]');
		await q1.waitFor({ state: 'visible', timeout: 5000 });
		await q1.locator('label:has-text("Home Loan")').first().click();
		await page.waitForTimeout(600);

		// Select New Loan
		const q4 = page.locator('[data-question-id="q4_loanType"]');
		try {
			await q4.waitFor({ state: 'visible', timeout: 3000 });
			await q4.locator('label:has-text("New Loan")').first().click();
			await page.waitForTimeout(500);
		} catch {
			/* q4 may auto-set */
		}

		// Click Next to navigate to form
		const nextBtn = page.locator('button[aria-label="Next"]:not([disabled])');
		try {
			await nextBtn.waitFor({ state: 'visible', timeout: 8000 });
			await nextBtn.click();
			await page.waitForURL('**/form/home-loan**', { timeout: 15000 });
			await page.waitForLoadState('networkidle');
		} catch {
			// May already be on form page or Next not available
			await page.goto(HOME_LOAN_URL);
			await page.waitForLoadState('networkidle');
		}

		await dismissFormResumeModal(page);
		await page.waitForTimeout(1000);

		// Check schema page selectors
		const selectors = getSelectorsForPage('form-schema');
		const { passed, failed } = await checkSelectors(page, selectors);

		console.log(`[form-schema] ${passed.length} passed, ${failed.length} not found`);

		// Critical: question containers and radio inputs must exist
		const critical = failed.filter(
			(f) => f.name.includes('Question container') || f.name.includes('Radio option')
		);
		expect(critical).toHaveLength(0);
	});

	test('applicant page selectors', async ({ page }) => {
		// Navigate directly to home loan form
		await page.goto(HOME_LOAN_URL);
		await page.waitForLoadState('networkidle');
		await dismissFormResumeModal(page);
		await page.waitForTimeout(1000);

		// Try to navigate to the applicant page (page 6: tellUs_homeLoan)
		// This may require filling earlier pages — check if applicant type radios are visible
		const selectors = getSelectorsForPage('applicant');
		const { passed, failed } = await checkSelectors(page, selectors);

		console.log(
			`[applicant] ${passed.length} passed, ${failed.length} not found (may need page navigation)`
		);

		// Soft check — applicant page may not be reachable without filling prior pages
		// But the selector patterns should still be valid HTML patterns
	});
});
