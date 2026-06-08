/**
 * Dashboard Cases E2E Tests (Tasks 2.16, 2.17)
 *
 * Tests case creation, case list display, filtering, search, pagination,
 * and empty states for the DSA dashboard cases page.
 */

import { test, expect } from '@playwright/test';
import {
	DASHBOARD_ROUTES,
	ensureDsaProfile,
	createTestCase,
	navigateToCaseDetail,
	archiveTestCase
} from './dashboard.setup';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

// ============================================================================
// CASE LIST — Display & Navigation
// ============================================================================

test.describe('Case List - Display', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
	});

	test('displays the "My Cases" page heading', async ({ page }) => {
		const heading = page.locator('h1:has-text("My Cases")');
		await expect(heading).toBeVisible({ timeout: 10000 });
	});

	test('displays the "New Case" button that links to the form', async ({ page }) => {
		const newCaseLink = page.locator('a:has-text("New Case")');
		await expect(newCaseLink).toBeVisible();
		const href = await newCaseLink.getAttribute('href');
		expect(href).toBe(APP_ROUTES.FORM.HOME_LOAN);
	});

	test('displays quick stats bar when cases exist', async ({ page }) => {
		// The quick stats bar shows Total, Active, Submitted, Sanctioned
		const statsBar = page.locator('text=Total:');
		const hasStats = await statsBar.count();

		if (hasStats > 0) {
			await expect(statsBar.first()).toBeVisible();
			await expect(page.locator('text=Active:')).toBeVisible();
			await expect(page.locator('text=Submitted:')).toBeVisible();
			await expect(page.locator('text=Sanctioned:')).toBeVisible();
		}
		// If no cases, stats bar is hidden -- which is valid
	});

	test('displays filter bar with search, stage, loan type, and lender filters', async ({
		page
	}) => {
		// Search input
		const searchInput = page.locator('input[placeholder*="Search by case label"]');
		await expect(searchInput).toBeVisible();

		// Stage filter dropdown
		const stageSelect = page.locator('select').filter({ hasText: 'All Stages' });
		await expect(stageSelect).toBeVisible();

		// Loan type filter dropdown
		const loanTypeSelect = page.locator('select').filter({ hasText: 'All Loan Types' });
		await expect(loanTypeSelect).toBeVisible();

		// Lender filter dropdown
		const lenderSelect = page.locator('select').filter({ hasText: 'All Lenders' });
		await expect(lenderSelect).toBeVisible();
	});

	test('displays case cards or empty state', async ({ page }) => {
		// Wait a moment for data to load
		await page.waitForTimeout(1000);

		// Either we see case cards (anchor links to case detail) or the empty state
		const caseCards = page.locator('a[href^="/dashboard/dsa/cases/"]');
		const emptyState = page.locator('text=No cases yet');
		const filteredEmpty = page.locator('text=No cases match your filters');

		const cardCount = await caseCards.count();
		const hasEmpty = (await emptyState.count()) > 0;
		const hasFilteredEmpty = (await filteredEmpty.count()) > 0;

		// One of the three states should be true
		expect(cardCount > 0 || hasEmpty || hasFilteredEmpty).toBe(true);
	});
});

// ============================================================================
// CASE CREATION VIA UI
// ============================================================================

test.describe('Case Creation - via New Case link', () => {
	test('New Case button navigates to the loan form page', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');

		const newCaseLink = page.locator('a:has-text("New Case")');
		await expect(newCaseLink).toBeVisible();
		await newCaseLink.click();

		// Should navigate to the form page
		await page.waitForURL(`**${APP_ROUTES.FORM.HOME_LOAN}**`, { timeout: 15000 });
		expect(page.url()).toContain(APP_ROUTES.FORM.HOME_LOAN);
	});
});

// ============================================================================
// CASE CREATION VIA API + VERIFICATION IN UI
// ============================================================================

test.describe.serial('Case Creation - API + UI Verification', () => {
	let testCaseId: string;
	const testLabel = `E2E CaseList ${Date.now()}`;

	test('creates a case via API and verifies it appears in the list', async ({ page, request }) => {
		// Create case via API
		const { case_id } = await createTestCase(request, {
			label: testLabel,
			loan_type: 'Home Loan',
			amount_required: 7500000
		});
		testCaseId = case_id;

		// Navigate to cases list
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Verify the case appears in the list
		const caseLabelEl = page.locator(`text=${testLabel}`);
		await expect(caseLabelEl.first()).toBeVisible({ timeout: 10000 });
	});

	test('case card displays correct metadata', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Find the card containing our test label
		const card = page.locator(`a[href="/dashboard/dsa/cases/${testCaseId}"]`);
		await expect(card).toBeVisible({ timeout: 10000 });

		// Verify the card shows the label
		await expect(card.locator(`text=${testLabel}`)).toBeVisible();

		// Verify loan type badge is shown
		await expect(card.locator('text=Home Loan')).toBeVisible();

		// Verify stage badge -- new cases start at "Intake"
		await expect(card.locator('text=Intake')).toBeVisible();
	});

	test('clicking a case card navigates to the case detail page', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Click the case card
		const card = page.locator(`a[href="/dashboard/dsa/cases/${testCaseId}"]`);
		await expect(card).toBeVisible({ timeout: 10000 });
		await card.click();

		// Should navigate to case detail
		await page.waitForURL(`**/dashboard/dsa/cases/${testCaseId}`, { timeout: 15000 });
		await page.waitForLoadState('networkidle');

		// Verify case detail page shows the label
		const heading = page.locator(`h1:has-text("${testLabel}")`);
		await expect(heading).toBeVisible({ timeout: 10000 });

		// Verify the "Back to Cases" link
		const backLink = page.locator('a:has-text("Back to Cases")');
		await expect(backLink).toBeVisible();
	});

	test('case detail page shows tab navigation', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Verify all tabs are present
		await expect(page.locator('a:has-text("Overview")')).toBeVisible();
		await expect(page.locator('a:has-text("File Builder")')).toBeVisible();
		await expect(page.locator('a:has-text("Queries")')).toBeVisible();
		await expect(page.locator('a:has-text("Communicate")')).toBeVisible();
		await expect(page.locator('a:has-text("Timeline")')).toBeVisible();
	});

	test('case detail overview shows loan details and case info', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Verify loan details section
		await expect(page.locator('h3:has-text("Loan Details")')).toBeVisible();
		await expect(page.locator('text=Home Loan').first()).toBeVisible();

		// Verify case info section
		await expect(page.locator('h3:has-text("Case Info")')).toBeVisible();

		// Verify the stage shows "Intake"
		const stageInfo = page.locator('text=Intake');
		await expect(stageInfo.first()).toBeVisible();
	});

	test.afterAll(async ({ request }) => {
		// Cleanup: archive the test case
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// FILTERS
// ============================================================================

test.describe.serial('Case List - Filters', () => {
	let testCaseIds: string[] = [];

	test.beforeAll(async ({ request }) => {
		// Create a few test cases with different loan types for filtering
		const case1 = await createTestCase(request, {
			label: `E2E Filter HL ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});
		testCaseIds.push(case1.case_id);

		const case2 = await createTestCase(request, {
			label: `E2E Filter LAP ${Date.now()}`,
			loan_type: 'Loan Against Property',
			amount_required: 3000000
		});
		testCaseIds.push(case2.case_id);
	});

	test('filters by stage using the stage dropdown', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Select "Intake" stage from the dropdown
		const stageSelect = page.locator('select').filter({ hasText: 'All Stages' });
		await stageSelect.selectOption({ value: 'intake' });

		// Wait for filter to apply (URL-based navigation with debounce)
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// After filtering, all visible case cards should show "Intake" stage badge
		const caseCards = page.locator('a[href^="/dashboard/dsa/cases/"]');
		const cardCount = await caseCards.count();

		if (cardCount > 0) {
			// Verify the URL has the stage filter param
			expect(page.url()).toContain('stage=intake');
		}
	});

	test('filters by loan type using the loan type dropdown', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Select "Home Loan" from loan type filter
		const loanTypeSelect = page.locator('select').filter({ hasText: 'All Loan Types' });
		await loanTypeSelect.selectOption('Home Loan');

		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// URL should contain loan_type filter
		expect(page.url()).toContain('loan_type=Home');
	});

	test('search filters cases by label', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		// Type in the search box
		const searchInput = page.locator('input[placeholder*="Search by case label"]');
		await searchInput.fill('E2E Filter HL');

		// Wait for debounced search (400ms debounce + network)
		await page.waitForTimeout(1000);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		// URL should contain search param
		expect(page.url()).toContain('search=');

		// Should show filtered results count text if count differs from total
		const filteredText = page.locator('text=/Showing \\d+ of \\d+ cases/');
		const hasFiltered = await filteredText.count();
		// If filtering actually reduced the count, the "Showing X of Y cases" text appears
		if (hasFiltered > 0) {
			await expect(filteredText).toBeVisible();
		}
	});

	test('clear filters button resets all filters', async ({ page }) => {
		// First apply a filter
		await page.goto(DASHBOARD_ROUTES.CASES + '?stage=intake');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		// The clear filters button (X icon) should appear when filters are active
		const clearButton = page.locator('button[title="Clear all filters"]');
		const hasFilter = await clearButton.count();

		if (hasFilter > 0) {
			await clearButton.click();
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(500);

			// URL should be clean (no filter params)
			const url = new URL(page.url());
			expect(url.searchParams.has('stage')).toBe(false);
		}
	});

	test('empty filter state shows "No cases match your filters" message', async ({ page }) => {
		// Apply a search that won't match anything
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		const searchInput = page.locator('input[placeholder*="Search by case label"]');
		await searchInput.fill('ZZZZZ_NONEXISTENT_CASE_XYZ');

		// Wait for debounced search
		await page.waitForTimeout(1000);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		// Should show the empty filter state
		const emptyState = page.locator('text=No cases match your filters');
		await expect(emptyState).toBeVisible({ timeout: 10000 });

		// Verify "Clear Filters" button in the empty state
		const clearBtn = page.locator('button:has-text("Clear Filters")');
		await expect(clearBtn).toBeVisible();
	});

	test.afterAll(async ({ request }) => {
		for (const caseId of testCaseIds) {
			await archiveTestCase(request, caseId);
		}
	});
});

// ============================================================================
// PAGINATION
// ============================================================================

test.describe('Case List - Pagination', () => {
	test('shows pagination controls when more than 12 cases exist', async ({ page, request }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Check if pagination controls exist (Previous/Next buttons)
		const prevButton = page.locator('button:has-text("Previous")');
		const nextButton = page.locator('button:has-text("Next")');
		const pageInfo = page.locator('text=/Page \\d+ of \\d+/');

		const hasPagination = (await prevButton.count()) > 0;

		if (hasPagination) {
			// Verify pagination elements are visible
			await expect(prevButton).toBeVisible();
			await expect(nextButton).toBeVisible();
			await expect(pageInfo).toBeVisible();

			// Previous should be disabled on page 1
			await expect(prevButton).toBeDisabled();

			// If there's more than one page, Next should be enabled
			const nextDisabled = await nextButton.isDisabled();
			if (!nextDisabled) {
				// Click next to go to page 2
				await nextButton.click();
				await page.waitForLoadState('networkidle');
				await page.waitForTimeout(500);

				// URL should contain page=2
				expect(page.url()).toContain('page=2');

				// Previous should now be enabled
				await expect(prevButton).toBeEnabled();
			}
		}
		// If no pagination, that just means there are 12 or fewer cases -- test passes
	});
});
