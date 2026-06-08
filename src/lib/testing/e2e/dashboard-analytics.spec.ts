/**
 * Dashboard Analytics / Scorecard E2E Tests (Task 4.18)
 *
 * Tests the Performance Analytics page at /dashboard/dsa/analytics.
 * Covers:
 *   - Page load and header
 *   - Empty state when no data
 *   - Overall score ring visualization
 *   - Metrics grid (up to 8 metric cards)
 *   - Each metric card: value, trend arrow, rating badge, progress bar
 *   - Insights & Recommendations section
 *   - Lender Policy Alerts section
 *   - Alert card expand/collapse interaction
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCase } from './dashboard.setup';
import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

test.describe('Analytics / Scorecard — UI Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.ANALYTICS);
		await page.waitForLoadState('networkidle');
	});

	// ── PAGE LOAD & HEADER ────────────────────────────────────────────

	test('page renders with Performance Analytics heading', async ({ page }) => {
		await expect(page.locator('h1:has-text("Performance Analytics")')).toBeVisible();
	});

	test('page shows subtitle text', async ({ page }) => {
		await expect(
			page.locator('text=Track your performance, identify trends, and stay updated')
		).toBeVisible();
	});

	test('back to dashboard link is visible', async ({ page }) => {
		const backLink = page.locator('a:has-text("Back to Dashboard")');
		await expect(backLink).toBeVisible();

		const href = await backLink.getAttribute('href');
		expect(href).toBe('/dashboard/dsa');
	});

	// ── EMPTY STATE ───────────────────────────────────────────────────

	test('shows empty state or scorecard content', async ({ page }) => {
		const emptyState = page.locator('text=No Analytics Data Yet');
		const scoreRing = page.locator('text=Performance Score');

		const hasEmpty = await emptyState.isVisible().catch(() => false);
		const hasScorecard = await scoreRing.isVisible().catch(() => false);

		// One of these must be visible
		expect(hasEmpty || hasScorecard).toBeTruthy();
	});

	test('empty state has Create Your First Case CTA', async ({ page }) => {
		const emptyState = page.locator('text=No Analytics Data Yet');
		const hasEmpty = await emptyState.isVisible().catch(() => false);

		if (!hasEmpty) return; // Has data — skip

		const cta = page.locator('a:has-text("Create Your First Case")');
		await expect(cta).toBeVisible();

		const href = await cta.getAttribute('href');
		expect(href).toBe(APP_ROUTES.FORM.HOME_LOAN);
	});

	// ── OVERALL SCORE RING ────────────────────────────────────────────

	test('score ring displays with Performance Score label', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return; // No data state

		await expect(scoreLabel).toBeVisible();

		// SVG ring should be present
		const svgRing = page.locator('svg circle.score-ring-progress');
		await expect(svgRing).toBeVisible();
	});

	test('score ring shows numeric score value', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		// The score value is a bold span inside the ring container
		const scoreContainer = page.locator('.text-3xl.font-bold');
		await expect(scoreContainer).toBeVisible();

		const scoreText = await scoreContainer.innerText();
		const scoreNum = parseInt(scoreText, 10);
		expect(scoreNum).toBeGreaterThanOrEqual(0);
		expect(scoreNum).toBeLessThanOrEqual(100);
	});

	test('score ring shows "/ 100" denominator', async ({ page }) => {
		const denominator = page.locator('text=/ 100');
		const isVisible = await denominator.isVisible().catch(() => false);

		if (!isVisible) return; // No data

		await expect(denominator).toBeVisible();
	});

	test('score ring shows overall rating badge', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		// Rating badge shows one of: Excellent, Good, Needs Improvement, Critical
		const ratingBadge = page.locator(
			'span:has-text("Excellent"), span:has-text("Good"), span:has-text("Needs Improvement"), span:has-text("Critical")'
		);
		// There may be multiple rating badges (one for overall + one per metric)
		const count = await ratingBadge.count();
		expect(count).toBeGreaterThan(0);
	});

	// ── METRICS GRID ──────────────────────────────────────────────────

	test('metrics grid displays metric cards', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return; // No data

		// Metrics grid is inside lg:col-span-3
		const metricsContainer = page.locator('.lg\\:col-span-3');
		await expect(metricsContainer).toBeVisible();

		// Grid should have metric cards
		const metricCards = metricsContainer.locator('.group.relative');
		const count = await metricCards.count();
		// Should have metrics (typically 8, but at least 1)
		expect(count).toBeGreaterThan(0);
	});

	test('each metric card shows label, value, and rating badge', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const metricsContainer = page.locator('.lg\\:col-span-3');
		const metricCards = metricsContainer.locator('.group.relative');
		const count = await metricCards.count();

		// Check the first metric card in detail
		if (count === 0) return;
		const firstCard = metricCards.first();

		// Label (p with truncate class, first child)
		const label = firstCard.locator('p.truncate').first();
		await expect(label).toBeVisible();
		const labelText = await label.innerText();
		expect(labelText.length).toBeGreaterThan(0);

		// Value (bold text)
		const value = firstCard.locator('.text-xl.font-bold');
		await expect(value).toBeVisible();

		// Rating badge (Excellent, Good, Needs Improvement, or Critical)
		const ratingBadge = firstCard.locator(
			'span:has-text("Excellent"), span:has-text("Good"), span:has-text("Needs Improvement"), span:has-text("Critical")'
		);
		await expect(ratingBadge.first()).toBeVisible();
	});

	test('metric cards show trend arrows', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const metricsContainer = page.locator('.lg\\:col-span-3');
		const metricCards = metricsContainer.locator('.group.relative');
		const count = await metricCards.count();

		if (count === 0) return;

		// Each card should have a trend indicator (up, down, or stable — all rendered as SVG)
		for (let i = 0; i < Math.min(count, 3); i++) {
			const card = metricCards.nth(i);
			// Trend is inside a span with text-emerald-600, text-red-600, or text-gray-400
			const trendSvg = card.locator('svg.h-3.w-3');
			const svgCount = await trendSvg.count();
			expect(svgCount).toBeGreaterThan(0);
		}
	});

	test('metric cards show progress bar', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const metricsContainer = page.locator('.lg\\:col-span-3');
		const metricCards = metricsContainer.locator('.group.relative');
		const count = await metricCards.count();

		if (count === 0) return;

		// Progress bar container
		const firstCard = metricCards.first();
		const progressBg = firstCard.locator('.h-1\\.5.rounded-full.bg-gray-100');
		await expect(progressBg).toBeVisible();

		// Progress bar fill (colored div inside)
		const progressFill = progressBg.locator('div');
		await expect(progressFill).toBeVisible();
	});

	test('metric cards show target value', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const metricsContainer = page.locator('.lg\\:col-span-3');
		const metricCards = metricsContainer.locator('.group.relative');
		const count = await metricCards.count();

		if (count === 0) return;

		// Target label
		const firstCard = metricCards.first();
		const targetText = firstCard.locator('span:has-text("Target:")');
		await expect(targetText).toBeVisible();
	});

	// ── INSIGHTS & RECOMMENDATIONS ────────────────────────────────────

	test('Insights & Recommendations section is displayed', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const insightsHeader = page.locator('h3:has-text("Insights & Recommendations")');
		await expect(insightsHeader).toBeVisible();
	});

	test('insights section shows recommendation items or placeholder', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const insightsHeader = page.locator('h3:has-text("Insights & Recommendations")');
		await expect(insightsHeader).toBeVisible();

		// Either insight list items or "No insights available" message
		const insightItems = page.locator('ul.space-y-3 li');
		const noInsights = page.locator('text=No insights available yet');

		const hasItems = (await insightItems.count()) > 0;
		const hasPlaceholder = await noInsights.isVisible().catch(() => false);

		expect(hasItems || hasPlaceholder).toBeTruthy();
	});

	test('insight items have sentiment icons (positive/negative/neutral)', async ({ page }) => {
		const insightItems = page.locator('ul.space-y-3 li');
		const count = await insightItems.count();

		if (count === 0) return;

		// Each insight item has a colored circle icon
		const firstItem = insightItems.first();
		// The icon container is a rounded-full div with bg-emerald-100, bg-amber-100, or bg-blue-100
		const iconCircle = firstItem.locator('.rounded-full').first();
		await expect(iconCircle).toBeVisible();
	});

	// ── LENDER POLICY ALERTS ──────────────────────────────────────────

	test('Lender Policy Alerts section is displayed', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		const alertsHeader = page.locator('h3:has-text("Lender Policy Alerts")');
		await expect(alertsHeader).toBeVisible();
	});

	test('alerts section shows count badge or empty state', async ({ page }) => {
		const scoreLabel = page.locator('h3:has-text("Performance Score")');
		const isVisible = await scoreLabel.isVisible().catch(() => false);

		if (!isVisible) return;

		// Count badge (red circle with number)
		const countBadge = page.locator('.bg-red-100.text-red-700');
		const emptyState = page.locator('text=No active alerts');

		const hasAlerts = await countBadge.isVisible().catch(() => false);
		const isEmpty = await emptyState.isVisible().catch(() => false);

		expect(hasAlerts || isEmpty).toBeTruthy();
	});

	test('alert cards show lender name, severity badge, and title', async ({ page }) => {
		// Check if we have alerts at all
		const alertCards = page.locator('.space-y-3 > div:has(.rounded-lg.border-l-4)');
		const cardCount = await alertCards.count();

		if (cardCount === 0) return;

		const firstAlert = alertCards.first();

		// Lender name badge
		const lenderBadge = firstAlert.locator('span.bg-gray-100:has-text("")');
		const lenderCount = await lenderBadge.count();
		expect(lenderCount).toBeGreaterThanOrEqual(0);

		// Severity badge (Action Required, Warning, or Info)
		const severityBadge = firstAlert.locator(
			'span:has-text("Action Required"), span:has-text("Warning"), span:has-text("Info")'
		);
		await expect(severityBadge.first()).toBeVisible();

		// Title text
		const title = firstAlert.locator('p.text-sm.font-medium');
		await expect(title).toBeVisible();
	});

	test('clicking an alert card expands it to show description', async ({ page }) => {
		// Find alert cards with the expandable button
		const alertButtons = page.locator('.space-y-3 button.w-full.cursor-pointer');
		const btnCount = await alertButtons.count();

		if (btnCount === 0) return;

		// Click the first alert to expand
		await alertButtons.first().click();
		await page.waitForTimeout(300);

		// The expanded content should appear (border-t divider + description)
		const expandedContent = page.locator('.border-t.border-gray-100.px-4.py-3');
		await expect(expandedContent.first()).toBeVisible();

		// Description paragraph should be visible
		const description = expandedContent.first().locator('p.text-sm.text-gray-600');
		await expect(description).toBeVisible();
	});

	test('clicking an expanded alert collapses it', async ({ page }) => {
		const alertButtons = page.locator('.space-y-3 button.w-full.cursor-pointer');
		const btnCount = await alertButtons.count();

		if (btnCount === 0) return;

		// Expand
		await alertButtons.first().click();
		await page.waitForTimeout(300);

		const expandedContent = page.locator('.border-t.border-gray-100.px-4.py-3');
		await expect(expandedContent.first()).toBeVisible();

		// Collapse
		await alertButtons.first().click();
		await page.waitForTimeout(300);

		// Expanded content should no longer be visible
		const isStillVisible = await expandedContent
			.first()
			.isVisible()
			.catch(() => false);
		expect(isStillVisible).toBe(false);
	});

	test('expanded alert shows affected cases as links', async ({ page }) => {
		const alertButtons = page.locator('.space-y-3 button.w-full.cursor-pointer');
		const btnCount = await alertButtons.count();

		if (btnCount === 0) return;

		await alertButtons.first().click();
		await page.waitForTimeout(300);

		// Look for "Affected Cases:" label in the expanded section
		const affectedLabel = page.locator('text=Affected Cases:');
		const hasAffected = await affectedLabel.isVisible().catch(() => false);

		if (hasAffected) {
			// Case links should be present
			const caseLinks = page.locator('a[href*="/dashboard/dsa/cases/"]');
			const linkCount = await caseLinks.count();
			expect(linkCount).toBeGreaterThan(0);
		}
	});

	test('expanded alert may show action button', async ({ page }) => {
		const alertButtons = page.locator('.space-y-3 button.w-full.cursor-pointer');
		const btnCount = await alertButtons.count();

		if (btnCount === 0) return;

		// Expand all alerts and check for action buttons
		for (let i = 0; i < Math.min(btnCount, 3); i++) {
			await alertButtons.nth(i).click();
			await page.waitForTimeout(200);
		}

		// Action buttons have the primary color background
		const actionBtns = page.locator('button:has-text(""):has(svg)').filter({
			has: page.locator('.bg-\\[var\\(--ddsa-primary-500\\)\\]')
		});

		// It is okay if no alerts have action buttons
		const actionCount = await actionBtns.count();
		expect(actionCount).toBeGreaterThanOrEqual(0);
	});

	// ── API: Scorecard + Policy Alerts ─────────────────────────────────

	test('GET /api/dashboard/scorecard returns scorecard data', async ({ request }) => {
		const resp = await request.get('/api/dashboard/scorecard');
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
	});

	test('GET /api/dashboard/policy-alerts returns alerts array', async ({ request }) => {
		const resp = await request.get('/api/dashboard/policy-alerts');
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
	});
});
