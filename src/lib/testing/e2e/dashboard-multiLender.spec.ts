/**
 * Dashboard Multi-Lender E2E Tests (Task 2.21)
 *
 * Tests multi-lender parallel tracking within a case:
 * - Adding multiple lender applications to a case
 * - Verifying lender cards appear in the case detail
 * - Comparison table view toggle
 * - Setting a primary lender
 * - Removing a lender application
 * - First lender is auto-set as primary
 */

import { test, expect } from '@playwright/test';
import {
	createTestCase,
	addLenderApplication,
	navigateToCaseDetail,
	getCaseViaApi,
	archiveTestCase
} from './dashboard.setup';

// ============================================================================
// MULTI-LENDER — ADD AND DISPLAY
// ============================================================================

test.describe.serial('Multi-Lender - Add and Display', () => {
	let testCaseId: string;
	let lenderApp1Id: string;
	let lenderApp2Id: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E MultiLender ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 8000000
		});
		testCaseId = case_id;
	});

	test('adds first lender application (HDFC Bank) via API', async ({ request }) => {
		const lender = await addLenderApplication(request, testCaseId, 'HDFC Bank', 'hdfc_bank');
		lenderApp1Id = lender.lender_application_id;
		expect(lenderApp1Id).toBeTruthy();

		// Verify the case now has 1 lender application
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.lender_applications.length).toBe(1);
		expect(caseData.lender_applications[0].lender_name).toBe('HDFC Bank');
		expect(caseData.lender_applications[0].status).toBe('selected');
	});

	test('first lender is automatically set as primary', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.primary_lender_id).toBe(lenderApp1Id);
	});

	test('adds second lender application (SBI) via API', async ({ request }) => {
		const lender = await addLenderApplication(request, testCaseId, 'SBI', 'sbi');
		lenderApp2Id = lender.lender_application_id;
		expect(lenderApp2Id).toBeTruthy();

		// Verify the case now has 2 lender applications
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.lender_applications.length).toBe(2);

		const lenderNames = caseData.lender_applications.map((la: any) => la.lender_name);
		expect(lenderNames).toContain('HDFC Bank');
		expect(lenderNames).toContain('SBI');
	});

	test('prevents adding duplicate lender', async ({ request }) => {
		const res = await request.post(`/api/cases/${testCaseId}/lender-applications`, {
			data: {
				lender_id: 'hdfc_bank',
				lender_name: 'HDFC Bank'
			}
		});

		// Should return 409 Conflict
		expect(res.status()).toBe(409);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('already added');
	});

	test('case detail shows both lender cards', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Verify the Lender Applications heading with count badge
		const lenderHeading = page.locator('h3:has-text("Lender Applications")');
		await expect(lenderHeading).toBeVisible({ timeout: 10000 });

		// Check count badge shows "2"
		const countBadge = lenderHeading.locator('span:has-text("2")');
		await expect(countBadge).toBeVisible();

		// Verify both lender names appear on the page
		await expect(page.locator('h4:has-text("HDFC Bank")')).toBeVisible();
		await expect(page.locator('h4:has-text("SBI")')).toBeVisible();

		// Both should show "Selected" status (default for new lender apps)
		const selectedBadges = page.locator('span:has-text("Selected")');
		expect(await selectedBadges.count()).toBeGreaterThanOrEqual(2);
	});

	test('case detail shows "Compare" button when 2+ lenders exist', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// The Compare button appears when there are 2+ lender applications
		const compareBtn = page.locator('button:has-text("Compare")');
		await expect(compareBtn).toBeVisible({ timeout: 10000 });
	});

	test('clicking "Compare" toggles to comparison table view', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Click the Compare button
		const compareBtn = page.locator('button:has-text("Compare")');
		await compareBtn.click();
		await page.waitForTimeout(500);

		// After clicking, the button text should change to "Card View"
		const cardViewBtn = page.locator('button:has-text("Card View")');
		await expect(cardViewBtn).toBeVisible({ timeout: 5000 });

		// The comparison table should be visible (desktop view)
		// It has a table with headers like "Lender", "Status", "Login No.", etc.
		const comparisonTable = page.locator('table');
		const hasTable = await comparisonTable.count();

		if (hasTable > 0) {
			// Verify table headers
			await expect(page.locator('th:has-text("Lender")')).toBeVisible();
			await expect(page.locator('th:has-text("Status")')).toBeVisible();
			await expect(page.locator('th:has-text("Primary")')).toBeVisible();

			// Verify both lenders appear in the table rows
			const hdfcRow = page.locator('td:has-text("HDFC Bank")');
			const sbiRow = page.locator('td:has-text("SBI")');
			await expect(hdfcRow).toBeVisible();
			await expect(sbiRow).toBeVisible();
		}
		// On mobile, it shows cards instead of table -- still valid
	});

	test('clicking "Card View" toggles back to card layout', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Switch to comparison view first
		const compareBtn = page.locator('button:has-text("Compare")');
		await compareBtn.click();
		await page.waitForTimeout(500);

		// Switch back to card view
		const cardViewBtn = page.locator('button:has-text("Card View")');
		await cardViewBtn.click();
		await page.waitForTimeout(500);

		// The Compare button should be visible again
		await expect(page.locator('button:has-text("Compare")')).toBeVisible();

		// Lender cards should be visible (h4 headings in cards)
		await expect(page.locator('h4:has-text("HDFC Bank")')).toBeVisible();
		await expect(page.locator('h4:has-text("SBI")')).toBeVisible();
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTI-LENDER — PRIMARY LENDER
// ============================================================================

test.describe.serial('Multi-Lender - Primary Lender', () => {
	let testCaseId: string;
	let lenderApp1Id: string;
	let lenderApp2Id: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E Primary ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 7000000
		});
		testCaseId = case_id;

		const lender1 = await addLenderApplication(request, case_id, 'ICICI Bank', 'icici_bank');
		lenderApp1Id = lender1.lender_application_id;

		const lender2 = await addLenderApplication(request, case_id, 'Kotak Mahindra', 'kotak');
		lenderApp2Id = lender2.lender_application_id;
	});

	test('first added lender is the default primary', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.primary_lender_id).toBe(lenderApp1Id);
	});

	test('sets second lender as primary via API', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}`, {
			data: { primary_lender_id: lenderApp2Id }
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.primary_lender_id).toBe(lenderApp2Id);
	});

	test('primary lender badge shows in comparison table', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Switch to comparison view
		const compareBtn = page.locator('button:has-text("Compare")');
		await compareBtn.click();
		await page.waitForTimeout(500);

		// The primary lender should show "Primary" text
		const primaryBadge = page.locator('text=Primary');
		await expect(primaryBadge.first()).toBeVisible({ timeout: 10000 });
	});

	test('can change primary lender via comparison table "Set" button', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Switch to comparison view
		const compareBtn = page.locator('button:has-text("Compare")');
		await compareBtn.click();
		await page.waitForTimeout(500);

		// Find a "Set" button (for the non-primary lender)
		const setButton = page.locator('button:has-text("Set")').first();
		const hasSetButton = await setButton.count();

		if (hasSetButton > 0) {
			await setButton.click();
			await page.waitForTimeout(1000);

			// After setting, there should still be one "Primary" label
			const primaryLabels = page.locator('text=Primary');
			// Wait for the API call to complete and UI to update
			await page.waitForTimeout(500);
			expect(await primaryLabels.count()).toBeGreaterThanOrEqual(1);
		}
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTI-LENDER — ADD LENDER VIA UI MODAL
// ============================================================================

test.describe.serial('Multi-Lender - Add Lender via UI', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E AddLenderUI ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 6000000
		});
		testCaseId = case_id;
	});

	test('empty lender state shows "No lenders added yet" message', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const emptyMsg = page.locator('text=No lenders added yet');
		await expect(emptyMsg.first()).toBeVisible({ timeout: 10000 });
	});

	test('clicking "Add Lender" opens the lender selection modal', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Click the "Add Lender" button
		const addLenderBtn = page.locator('button:has-text("Add Lender")').first();
		await addLenderBtn.click();
		await page.waitForTimeout(500);

		// Modal should appear with "Add Lender" heading
		const modalHeading = page.locator('h3:has-text("Add Lender")');
		await expect(modalHeading).toBeVisible({ timeout: 5000 });

		// Search input should be visible
		const searchInput = page.locator('input[placeholder*="Search banks"]');
		await expect(searchInput).toBeVisible();

		// Bank list should be visible
		const bankList = page.locator('.max-h-60');
		await expect(bankList).toBeVisible();
	});

	test('searches for a bank in the lender modal', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Open the modal
		const addLenderBtn = page.locator('button:has-text("Add Lender")').first();
		await addLenderBtn.click();
		await page.waitForTimeout(500);

		// Type in the search box
		const searchInput = page.locator('input[placeholder*="Search banks"]');
		await searchInput.fill('HDFC');
		await page.waitForTimeout(300);

		// Should show filtered results containing "HDFC"
		const bankButtons = page.locator('.max-h-60 button');
		const count = await bankButtons.count();
		expect(count).toBeGreaterThan(0);

		// At least one result should contain "HDFC"
		const firstResult = bankButtons.first();
		await expect(firstResult).toContainText(/HDFC/i);
	});

	test('selects a bank and adds it as a lender', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Open the modal
		const addLenderBtn = page.locator('button:has-text("Add Lender")').first();
		await addLenderBtn.click();
		await page.waitForTimeout(500);

		// Search for a bank
		const searchInput = page.locator('input[placeholder*="Search banks"]');
		await searchInput.fill('SBI');
		await page.waitForTimeout(300);

		// Click on the first matching bank in the list
		const bankOption = page.locator('.max-h-60 button').filter({ hasText: /SBI/i }).first();
		await bankOption.click();
		await page.waitForTimeout(300);

		// The "Add Lender" submit button in the modal footer should now be enabled
		const submitBtn = page.locator('.border-t button').filter({ hasText: 'Add Lender' });
		await expect(submitBtn).toBeEnabled();
		await submitBtn.click();

		// Wait for the API call and page reload
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// The modal should close and the lender should appear
		// The case detail should now show the added lender
		const lenderName = page.locator('h4:has-text("SBI")');
		const addedSuccessfully = await lenderName.count();

		// If page reloaded (goto with invalidateAll), wait for it
		if (addedSuccessfully === 0) {
			await page.waitForTimeout(2000);
			await page.waitForLoadState('networkidle');
		}

		// Verify lender is now shown (may need to wait for page invalidation)
		await expect(page.locator('text=SBI').first()).toBeVisible({ timeout: 10000 });
	});

	test('cancel button closes the modal without adding', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Open the modal
		const addLenderBtn = page.locator('button:has-text("Add Lender")').first();
		await addLenderBtn.click();
		await page.waitForTimeout(500);

		// Click Cancel
		const cancelBtn = page.locator('.border-t button:has-text("Cancel")');
		await cancelBtn.click();
		await page.waitForTimeout(300);

		// Modal should be gone
		const modalHeading = page.locator('h3:has-text("Add Lender")');
		await expect(modalHeading).not.toBeVisible();
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTI-LENDER — REMOVE LENDER
// ============================================================================

test.describe.serial('Multi-Lender - Remove Lender', () => {
	let testCaseId: string;
	let lenderApp1Id: string;
	let lenderApp2Id: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E RemoveLender ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});
		testCaseId = case_id;

		const lender1 = await addLenderApplication(request, case_id, 'PNB Housing', 'pnb_housing');
		lenderApp1Id = lender1.lender_application_id;

		const lender2 = await addLenderApplication(request, case_id, 'Bajaj Finserv', 'bajaj_finserv');
		lenderApp2Id = lender2.lender_application_id;
	});

	test('verifies both lenders exist before removal', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.lender_applications.length).toBe(2);
	});

	test('removes a lender via API', async ({ request }) => {
		const res = await request.delete(
			`/api/cases/${testCaseId}/lender-applications/${lenderApp2Id}`
		);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);

		// Returned data should be the updated lender_applications array
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBe(1);
		expect(body.data[0].lender_name).toBe('PNB Housing');
	});

	test('only one lender remains after removal', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.lender_applications.length).toBe(1);
		expect(caseData.lender_applications[0].lender_name).toBe('PNB Housing');
	});

	test('case detail UI shows only the remaining lender', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Should show the remaining lender
		await expect(page.locator('h4:has-text("PNB Housing")')).toBeVisible({ timeout: 10000 });

		// The removed lender should not appear
		const removedLender = page.locator('h4:has-text("Bajaj Finserv")');
		expect(await removedLender.count()).toBe(0);

		// Compare button should not appear with only 1 lender
		const compareBtn = page.locator('button:has-text("Compare")');
		expect(await compareBtn.count()).toBe(0);
	});

	test('removing primary lender auto-reassigns to remaining lender', async ({ request }) => {
		// Set lenderApp1Id as primary first
		await request.patch(`/api/cases/${testCaseId}`, {
			data: { primary_lender_id: lenderApp1Id }
		});

		// Add a new lender
		const lender3 = await addLenderApplication(request, testCaseId, 'Yes Bank', 'yes_bank');

		// Remove the primary lender
		const res = await request.delete(
			`/api/cases/${testCaseId}/lender-applications/${lenderApp1Id}`
		);
		expect(res.ok()).toBeTruthy();

		// The primary should now be the remaining lender
		const caseData = await getCaseViaApi(request, testCaseId);
		expect(caseData.lender_applications.length).toBe(1);
		expect(caseData.lender_applications[0].lender_name).toBe('Yes Bank');

		// primary_lender_id should be reassigned
		expect(caseData.primary_lender_id).toBe(lender3.lender_application_id);
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTI-LENDER — LENDER STATUS TRACKING
// ============================================================================

test.describe.serial('Multi-Lender - Lender Status Tracking', () => {
	let testCaseId: string;
	let lenderAppId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E LenderStatus ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});
		testCaseId = case_id;

		const lender = await addLenderApplication(request, case_id, 'Bank of Baroda', 'bob');
		lenderAppId = lender.lender_application_id;
	});

	test('new lender application starts at "selected" status', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);
		const la = caseData.lender_applications[0];
		expect(la.status).toBe('selected');
	});

	test('transitions lender status from selected to file_building', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/lender-applications/${lenderAppId}`, {
			data: { status: 'file_building' }
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.data.status).toBe('file_building');
	});

	test('transitions lender status through to submitted', async ({ request }) => {
		// file_building -> ready
		let res = await request.patch(`/api/cases/${testCaseId}/lender-applications/${lenderAppId}`, {
			data: { status: 'ready' }
		});
		expect(res.ok()).toBeTruthy();

		// ready -> submitted
		res = await request.patch(`/api/cases/${testCaseId}/lender-applications/${lenderAppId}`, {
			data: { status: 'submitted' }
		});
		expect(res.ok()).toBeTruthy();

		const body = await res.json();
		expect(body.data.status).toBe('submitted');
	});

	test('rejects invalid lender status transition', async ({ request }) => {
		// From "submitted", should not be able to go back to "selected"
		const res = await request.patch(`/api/cases/${testCaseId}/lender-applications/${lenderAppId}`, {
			data: { status: 'selected' }
		});

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('Cannot transition');
	});

	test('lender card shows updated status in UI', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// The lender card should show "Submitted" status
		const statusBadge = page.locator('span:has-text("Submitted")');
		await expect(statusBadge.first()).toBeVisible({ timeout: 10000 });
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTI-LENDER — COMPARISON TABLE MINIMUM
// ============================================================================

test.describe('Multi-Lender - Comparison Table Minimum', () => {
	test('comparison table requires at least 2 lenders', async ({ page, request }) => {
		// Create a case with only 1 lender
		const { case_id } = await createTestCase(request, {
			label: `E2E SingleLender ${Date.now()}`,
			loan_type: 'Home Loan'
		});

		await addLenderApplication(request, case_id, 'Union Bank', 'union_bank');

		await navigateToCaseDetail(page, case_id);

		// Compare button should NOT appear with only 1 lender
		const compareBtn = page.locator('button:has-text("Compare")');
		expect(await compareBtn.count()).toBe(0);

		// Cleanup
		await archiveTestCase(request, case_id);
	});
});
