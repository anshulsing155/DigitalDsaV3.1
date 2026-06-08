/**
 * Dashboard Pipeline E2E Tests (Task 2.18)
 *
 * Tests stage transitions through the full case pipeline:
 * intake -> profiling -> file_building -> submitted -> processing -> sanctioned -> disbursed
 *
 * Also tests blocked transitions and timeline event creation.
 */

import { test, expect } from '@playwright/test';
import {
	DASHBOARD_ROUTES,
	createTestCase,
	navigateToCaseDetail,
	changeCaseStageViaApi,
	getCaseViaApi,
	getTimelineViaApi,
	archiveTestCase
} from './dashboard.setup';

// ============================================================================
// STAGE LABELS MAP (matching the server-side constants)
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'File Building',
	submitted: 'Submitted',
	processing: 'Processing',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

// ============================================================================
// FULL PIPELINE TRANSITION VIA UI
// ============================================================================

test.describe.serial('Stage Pipeline - UI Transitions', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E Pipeline ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 6000000
		});
		testCaseId = case_id;
	});

	test('new case starts at "Intake" stage', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// The stage badge button in the case header should show "Intake"
		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toBeVisible({ timeout: 10000 });
		await expect(stageBadge).toContainText('Intake');
	});

	test('transitions from Intake to Profiling via stage dropdown', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Click the stage badge to open the dropdown
		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await stageBadge.click();
		await page.waitForTimeout(300);

		// Verify the dropdown shows "Move to" heading
		const moveToLabel = page.locator('text=Move to');
		await expect(moveToLabel).toBeVisible({ timeout: 5000 });

		// Click "Profiling" in the dropdown
		const profilingOption = page.locator('.stage-dropdown-container button:has-text("Profiling")');
		await profilingOption.click();
		await page.waitForTimeout(500);

		// Wait for the success message
		const successMsg = page.locator('text=/Stage updated to Profiling/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		// Wait for page reload (the component does goto with invalidateAll after 1s)
		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		// After reload, verify the stage badge shows "Profiling"
		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('Profiling');
	});

	test('transitions from Profiling to File Building', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Profiling');
		await stageBadge.click();
		await page.waitForTimeout(300);

		const option = page.locator('.stage-dropdown-container button:has-text("File Building")');
		await option.click();
		await page.waitForTimeout(500);

		const successMsg = page.locator('text=/Stage updated to File Building/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('File Building');
	});

	test('transitions from File Building to Submitted', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('File Building');
		await stageBadge.click();
		await page.waitForTimeout(300);

		const option = page.locator('.stage-dropdown-container button:has-text("Submitted")');
		await option.click();
		await page.waitForTimeout(500);

		const successMsg = page.locator('text=/Stage updated to Submitted/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('Submitted');
	});

	test('transitions from Submitted to Processing', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Submitted');
		await stageBadge.click();
		await page.waitForTimeout(300);

		const option = page.locator('.stage-dropdown-container button:has-text("Processing")');
		await option.click();
		await page.waitForTimeout(500);

		const successMsg = page.locator('text=/Stage updated to Processing/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('Processing');
	});

	test('transitions from Processing to Sanctioned', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Processing');
		await stageBadge.click();
		await page.waitForTimeout(300);

		const option = page.locator('.stage-dropdown-container button:has-text("Sanctioned")');
		await option.click();
		await page.waitForTimeout(500);

		const successMsg = page.locator('text=/Stage updated to Sanctioned/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('Sanctioned');
	});

	test('transitions from Sanctioned to Disbursed', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Sanctioned');
		await stageBadge.click();
		await page.waitForTimeout(300);

		const option = page.locator('.stage-dropdown-container button:has-text("Disbursed")');
		await option.click();
		await page.waitForTimeout(500);

		const successMsg = page.locator('text=/Stage updated to Disbursed/');
		await expect(successMsg).toBeVisible({ timeout: 10000 });

		await page.waitForTimeout(2000);
		await page.waitForLoadState('networkidle');

		const updatedBadge = page.locator('.stage-dropdown-container button').first();
		await expect(updatedBadge).toContainText('Disbursed');
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// STAGE HISTORY VERIFICATION VIA API
// ============================================================================

test.describe.serial('Stage Pipeline - History & Timeline', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E StageHistory ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});
		testCaseId = case_id;

		// Transition through several stages via API
		await changeCaseStageViaApi(request, case_id, 'profiling');
		await changeCaseStageViaApi(request, case_id, 'file_building');
		await changeCaseStageViaApi(request, case_id, 'submitted');
	});

	test('stage_history records all transitions', async ({ request }) => {
		const caseData = await getCaseViaApi(request, testCaseId);

		// stage_history should have entries: initial (intake->intake) + 3 transitions
		expect(caseData.stage_history.length).toBeGreaterThanOrEqual(4);

		// The last entry should be file_building -> submitted
		const lastTransition = caseData.stage_history[caseData.stage_history.length - 1];
		expect(lastTransition.from).toBe('file_building');
		expect(lastTransition.to).toBe('submitted');

		// Each entry should have a timestamp
		for (const entry of caseData.stage_history) {
			expect(entry.timestamp).toBeTruthy();
		}
	});

	test('timeline events are created for each stage change', async ({ request }) => {
		const events = await getTimelineViaApi(request, testCaseId);

		// Should have at least the stage_changed events plus the case_created event
		expect(events.length).toBeGreaterThanOrEqual(4);

		// Filter to stage_changed events
		const stageEvents = events.filter((e: any) => e.event_type === 'stage_changed');
		expect(stageEvents.length).toBeGreaterThanOrEqual(3);

		// Each stage event should have meaningful metadata
		for (const event of stageEvents) {
			expect(event.description).toContain('Stage changed from');
			expect(event.metadata).toBeTruthy();
			expect(event.metadata.from).toBeTruthy();
			expect(event.metadata.to).toBeTruthy();
		}
	});

	test('case detail overview shows correct stage label after multiple transitions', async ({
		page
	}) => {
		await navigateToCaseDetail(page, testCaseId);

		// Should show "Submitted" as the current stage
		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Submitted');
	});

	test('recent timeline section in overview shows stage change events', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// The overview page has a "Recent Timeline" section
		const timelineHeading = page.locator('h3:has-text("Recent Timeline")');
		await expect(timelineHeading).toBeVisible({ timeout: 10000 });

		// Should show at least one "Stage Changed" event
		const stageEvent = page.locator('text=Stage Changed');
		await expect(stageEvent.first()).toBeVisible({ timeout: 10000 });
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// BLOCKED / INVALID TRANSITIONS
// ============================================================================

test.describe('Stage Pipeline - Blocked Transitions', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E Blocked ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 4000000
		});
		testCaseId = case_id;
	});

	test('API rejects invalid transition from intake directly to disbursed', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/stage`, {
			data: { stage: 'disbursed' }
		});

		// Should return 400 for blocked transition
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('Cannot transition');
		expect(body.error).toContain('intake');
		expect(body.error).toContain('disbursed');
	});

	test('API rejects invalid transition from intake directly to sanctioned', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/stage`, {
			data: { stage: 'sanctioned' }
		});

		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('Cannot transition');
	});

	test('API rejects transition to the same stage', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/stage`, {
			data: { stage: 'intake' }
		});

		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('already in stage');
	});

	test('UI dropdown only shows allowed transitions from intake', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// Click the stage badge to open dropdown
		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Intake');
		await stageBadge.click();
		await page.waitForTimeout(300);

		// Dropdown should show allowed transitions (profiling, dropped)
		const dropdownContainer = page.locator('.stage-dropdown-container .absolute');
		await expect(dropdownContainer).toBeVisible();

		const profilingOption = dropdownContainer.locator('button:has-text("Profiling")');
		const droppedOption = dropdownContainer.locator('button:has-text("Dropped")');

		await expect(profilingOption).toBeVisible();
		await expect(droppedOption).toBeVisible();

		// Should NOT show disallowed transitions
		const disbursedOption = dropdownContainer.locator('button:has-text("Disbursed")');
		const sanctionedOption = dropdownContainer.locator('button:has-text("Sanctioned")');

		expect(await disbursedOption.count()).toBe(0);
		expect(await sanctionedOption.count()).toBe(0);
	});

	test('API provides available_transitions in error response', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/stage`, {
			data: { stage: 'disbursed' }
		});

		const body = await res.json();
		expect(body.available_transitions).toBeTruthy();
		expect(Array.isArray(body.available_transitions)).toBe(true);
		expect(body.available_transitions).toContain('profiling');
		expect(body.available_transitions).toContain('dropped');
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// SPECIAL TRANSITIONS: dropped -> intake (reactivate), rejected -> intake
// ============================================================================

test.describe.serial('Stage Pipeline - Reactivation', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E Reactivate ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 3000000
		});
		testCaseId = case_id;

		// Move to profiling then drop
		await changeCaseStageViaApi(request, case_id, 'profiling');
		await changeCaseStageViaApi(request, case_id, 'dropped');
	});

	test('dropped case can be reactivated to intake', async ({ request }) => {
		const res = await request.patch(`/api/cases/${testCaseId}/stage`, {
			data: { stage: 'intake' }
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.stage).toBe('intake');
	});

	test('reactivated case shows "Intake" stage in UI', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const stageBadge = page.locator('.stage-dropdown-container button').first();
		await expect(stageBadge).toContainText('Intake');
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});
