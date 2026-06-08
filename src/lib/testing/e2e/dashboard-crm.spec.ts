/**
 * Dashboard CRM E2E Tests (Task 4.17)
 *
 * Tests the CRM Dashboard UI at /dashboard/dsa/crm.
 * Covers:
 *   - Page load and header
 *   - Key metrics bar (7 stat cards)
 *   - Pipeline kanban view with columns per stage
 *   - Case cards within pipeline columns
 *   - Source analysis table
 *   - Communication log section with filters
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCase } from './dashboard.setup';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

test.describe('CRM Dashboard — UI Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');
	});

	// ── PAGE LOAD & HEADER ────────────────────────────────────────────

	test('page renders with CRM Dashboard heading', async ({ page }) => {
		await expect(page.locator('.page-title:has-text("CRM Dashboard")')).toBeVisible();
	});

	test('page shows subtitle text', async ({ page }) => {
		await expect(
			page.locator('.page-subtitle:has-text("Source tracking, pipeline view")')
		).toBeVisible();
	});

	test('back to dashboard link is visible', async ({ page }) => {
		const backLink = page.locator('.back-link:has-text("Dashboard")');
		await expect(backLink).toBeVisible();

		const href = await backLink.getAttribute('href');
		expect(href).toBe('/dashboard/dsa');
	});

	// ── KEY METRICS BAR ───────────────────────────────────────────────

	test('metrics grid displays stat cards', async ({ page }) => {
		const metricsGrid = page.locator('.metrics-grid');
		await expect(metricsGrid).toBeVisible();

		// There should be 7 StatCard components
		// StatCard renders as children of .metrics-grid
		const statCards = metricsGrid.locator('> *');
		const count = await statCards.count();
		expect(count).toBe(7);
	});

	test('Total Cases metric is displayed', async ({ page }) => {
		await expect(page.locator('text=Total Cases')).toBeVisible();
	});

	test('Active Cases metric is displayed', async ({ page }) => {
		await expect(page.locator('text=Active Cases')).toBeVisible();
	});

	test('Conversion Rate metric is displayed', async ({ page }) => {
		await expect(page.locator('text=Conversion Rate')).toBeVisible();
	});

	test('Avg. to Sanction metric is displayed', async ({ page }) => {
		await expect(page.locator('text=Avg. to Sanction')).toBeVisible();
	});

	test('Sanctioned Value metric is displayed', async ({ page }) => {
		await expect(page.locator('text=Sanctioned Value')).toBeVisible();
	});

	test('This Month New metric is displayed', async ({ page }) => {
		await expect(page.locator('text=This Month New')).toBeVisible();
	});

	test('This Month Sanctioned metric is displayed', async ({ page }) => {
		await expect(page.locator('text=This Month Sanctioned')).toBeVisible();
	});

	// ── PIPELINE VIEW (KANBAN) ────────────────────────────────────────

	test('Pipeline View section is displayed', async ({ page }) => {
		const pipelineSection = page.locator('.pipeline-section');
		await expect(pipelineSection).toBeVisible();

		await expect(page.locator('.section-title:has-text("Pipeline View")')).toBeVisible();
	});

	test('pipeline shows total cases count badge', async ({ page }) => {
		const pipelineTotal = page.locator('.pipeline-total');
		await expect(pipelineTotal).toBeVisible();

		const text = await pipelineTotal.innerText();
		// Should contain "X case(s) across Y stages" or similar
		expect(text).toMatch(/\d+\s+case/i);
	});

	test('pipeline columns are rendered for each stage', async ({ page }) => {
		const pipelineScroll = page.locator('.pipeline-scroll');
		const pipelineEmpty = page.locator('.pipeline-empty');

		const hasColumns = await pipelineScroll.isVisible().catch(() => false);
		const isEmpty = await pipelineEmpty.isVisible().catch(() => false);

		// Either pipeline has columns or shows empty state
		expect(hasColumns || isEmpty).toBeTruthy();

		if (hasColumns) {
			const columns = pipelineScroll.locator('.pipeline-column');
			const colCount = await columns.count();
			expect(colCount).toBeGreaterThan(0);

			// Each column should have a stage name and case count
			const firstCol = columns.first();
			await expect(firstCol.locator('.stage-name')).toBeVisible();
			await expect(firstCol.locator('.case-count')).toBeVisible();
		}
	});

	test('pipeline columns have colored top border', async ({ page }) => {
		const columns = page.locator('.pipeline-column');
		const colCount = await columns.count();

		if (colCount === 0) return;

		// Column header should have a border-top-color style
		const headerStyle = await columns.first().locator('.column-header').getAttribute('style');
		expect(headerStyle).toContain('border-top-color');
	});

	test('pipeline is horizontally scrollable', async ({ page }) => {
		const pipelineScroll = page.locator('.pipeline-scroll');
		const isVisible = await pipelineScroll.isVisible().catch(() => false);

		if (!isVisible) return;

		// The container has overflow-x: auto
		const overflow = await pipelineScroll.evaluate((el) => window.getComputedStyle(el).overflowX);
		expect(overflow).toBe('auto');
	});

	test('case cards in pipeline columns link to case detail', async ({ page }) => {
		const caseCards = page.locator('.case-card');
		const cardCount = await caseCards.count();

		if (cardCount === 0) return;

		const firstCard = caseCards.first();

		// Card should be an <a> tag with href to case detail
		const href = await firstCard.getAttribute('href');
		expect(href).toMatch(/\/dashboard\/dsa\/cases\//);

		// Card should show case label, loan type, and amount
		await expect(firstCard.locator('.case-label')).toBeVisible();
		await expect(firstCard.locator('.loan-type-badge')).toBeVisible();
	});

	test('case cards show days-in-stage badge', async ({ page }) => {
		const caseCards = page.locator('.case-card');
		const cardCount = await caseCards.count();

		if (cardCount === 0) return;

		const firstCard = caseCards.first();
		const daysBadge = firstCard.locator('.days-badge');
		await expect(daysBadge).toBeVisible();

		const daysText = await daysBadge.innerText();
		expect(daysText).toMatch(/\d+d/);
	});

	test('empty pipeline columns show "No cases" text', async ({ page }) => {
		const emptyColumns = page.locator('.pipeline-column.column-empty');
		const emptyCount = await emptyColumns.count();

		if (emptyCount === 0) return;

		const firstEmpty = emptyColumns.first();
		await expect(firstEmpty.locator('.empty-text:has-text("No cases")')).toBeVisible();
	});

	// ── EMPTY PIPELINE STATE ──────────────────────────────────────────

	test('empty pipeline shows "Create Case" call-to-action', async ({ page }) => {
		const pipelineEmpty = page.locator('.pipeline-empty');
		const isEmpty = await pipelineEmpty.isVisible().catch(() => false);

		if (!isEmpty) return;

		await expect(pipelineEmpty.locator('text=No cases in pipeline')).toBeVisible();
		const ctaLink = pipelineEmpty.locator('.empty-cta:has-text("Create Case")');
		await expect(ctaLink).toBeVisible();

		const href = await ctaLink.getAttribute('href');
		expect(href).toBe(APP_ROUTES.FORM.HOME_LOAN);
	});

	// ── SOURCE ANALYSIS ───────────────────────────────────────────────

	test('Source Analysis section is displayed', async ({ page }) => {
		await expect(page.locator('.section-title:has-text("Source Analysis")')).toBeVisible();
	});

	test('source table shows columns: Source, Cases, Sanctioned, Conv. Rate', async ({ page }) => {
		const sourceTable = page.locator('.source-table');
		const isVisible = await sourceTable.isVisible().catch(() => false);

		if (!isVisible) {
			// Source empty state should show instead
			await expect(page.locator('.source-empty')).toBeVisible();
			return;
		}

		// Verify table headers
		await expect(sourceTable.locator('th:has-text("Source")')).toBeVisible();
		await expect(sourceTable.locator('th:has-text("Cases")')).toBeVisible();
		await expect(sourceTable.locator('th:has-text("Sanctioned")')).toBeVisible();
		await expect(sourceTable.locator('th:has-text("Conv. Rate")')).toBeVisible();
	});

	test('source table rows show bar indicators', async ({ page }) => {
		const sourceRows = page.locator('.source-table tbody tr');
		const rowCount = await sourceRows.count();

		if (rowCount === 0) return;

		// Each row should have a source bar
		const firstRow = sourceRows.first();
		const barWrap = firstRow.locator('.source-bar-wrap');
		await expect(barWrap).toBeVisible();
	});

	test('best source is highlighted with badge', async ({ page }) => {
		const bestBadge = page.locator('.best-source-badge');
		const isVisible = await bestBadge.isVisible().catch(() => false);

		if (isVisible) {
			const text = await bestBadge.innerText();
			expect(text).toContain('Best:');
			expect(text).toContain('%');
		}
	});

	// ── COMMUNICATION LOG ─────────────────────────────────────────────

	test('Communication Log section is displayed', async ({ page }) => {
		await expect(page.locator('.section-title:has-text("Communication Log")')).toBeVisible();
	});

	test('communication log shows event count', async ({ page }) => {
		const commCount = page.locator('.comm-count');
		await expect(commCount).toBeVisible();

		const text = await commCount.innerText();
		expect(text).toMatch(/\d+\s+events?/);
	});

	test('communication log shows events or empty state', async ({ page }) => {
		const commList = page.locator('.comm-list');
		const commEmpty = page.locator('.comm-empty');

		const hasEvents = await commList.isVisible().catch(() => false);
		const isEmpty = await commEmpty.isVisible().catch(() => false);

		expect(hasEvents || isEmpty).toBeTruthy();
	});

	test('communication log events show case link and event type', async ({ page }) => {
		const commItems = page.locator('.comm-item');
		const itemCount = await commItems.count();

		if (itemCount === 0) return;

		const firstItem = commItems.first();

		// Should have a case link
		const caseLink = firstItem.locator('.comm-case-link');
		await expect(caseLink).toBeVisible();
		const href = await caseLink.getAttribute('href');
		expect(href).toContain('/dashboard/dsa/cases/');

		// Should have an event type badge
		const typeBadge = firstItem.locator('.comm-type-badge');
		await expect(typeBadge).toBeVisible();

		// Should have a description
		const desc = firstItem.locator('.comm-desc');
		await expect(desc).toBeVisible();

		// Should have a time indicator
		const time = firstItem.locator('.comm-time');
		await expect(time).toBeVisible();
	});

	test('communication log filter buttons work', async ({ page }) => {
		const filterBtns = page.locator('.comm-filters .filter-btn');
		const btnCount = await filterBtns.count();

		if (btnCount <= 1) return; // No filters if 0 or 1 event types

		// "All" should be active by default
		const allBtn = page.locator('.filter-btn.filter-active:has-text("All")');
		await expect(allBtn).toBeVisible();

		// Click the second filter button
		const secondBtn = filterBtns.nth(1);
		await secondBtn.click();
		await page.waitForTimeout(300);

		// That button should now be active
		const secondClasses = await secondBtn.getAttribute('class');
		expect(secondClasses).toContain('filter-active');

		// "All" should no longer be active
		const allClasses = await filterBtns.first().getAttribute('class');
		expect(allClasses).not.toContain('filter-active');
	});

	// ── CRM API ───────────────────────────────────────────────────────

	test('GET /api/dashboard/crm returns CRM data', async ({ request }) => {
		const resp = await request.get('/api/dashboard/crm');
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
	});
});
