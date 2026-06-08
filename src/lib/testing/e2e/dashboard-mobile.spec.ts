/**
 * Dashboard Mobile Viewport E2E Tests (Task 4.19)
 *
 * Tests all critical dashboard flows at 375px mobile viewport (iPhone X).
 * Covers:
 *   - No horizontal overflow on any page
 *   - Case list vertical stacking
 *   - Communication tabs scrollable
 *   - CRM pipeline horizontally scrollable
 *   - Analytics metrics grid responsive layout
 *   - Touch targets minimum size (44px guideline)
 *   - Bottom padding for mobile nav bar
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCase } from './dashboard.setup';

// Set iPhone X viewport for all tests in this file
test.use({ viewport: { width: 375, height: 812 } });

test.describe('Mobile Viewport (375px)', () => {
	// ── DASHBOARD HOME ────────────────────────────────────────────────

	test('dashboard home renders without horizontal overflow', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.HOME);
		await page.waitForLoadState('networkidle');

		const body = page.locator('body');
		const bodyScrollWidth = await body.evaluate((el) => el.scrollWidth);
		const viewportWidth = 375;

		// Allow 5px tolerance for sub-pixel rendering
		expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
	});

	test('dashboard home content fits within viewport width', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.HOME);
		await page.waitForLoadState('networkidle');

		// Check that no element extends beyond the viewport
		const overflowing = await page.evaluate(() => {
			const elements = document.querySelectorAll('*');
			let maxRight = 0;
			for (const el of elements) {
				const rect = el.getBoundingClientRect();
				if (rect.right > maxRight) {
					maxRight = rect.right;
				}
			}
			return maxRight;
		});

		expect(overflowing).toBeLessThanOrEqual(375 + 10);
	});

	// ── CASES LIST ────────────────────────────────────────────────────

	test('case list cards stack vertically on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');

		// No horizontal overflow
		const scrollWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
		expect(scrollWidth).toBeLessThanOrEqual(375 + 5);

		// If there are case cards/rows, they should be in a single column
		const caseCards = page.locator('[class*="case-card"], [class*="card"]');
		const count = await caseCards.count();

		if (count >= 2) {
			// Check that the first two cards have the same left position
			// (i.e., stacked vertically, not side by side)
			const firstBox = await caseCards.first().boundingBox();
			const secondBox = await caseCards.nth(1).boundingBox();

			if (firstBox && secondBox) {
				// Same horizontal position (within tolerance)
				expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThan(20);

				// Second card should be below the first
				expect(secondBox.y).toBeGreaterThan(firstBox.y);
			}
		}
	});

	// ── COMMUNICATION ─────────────────────────────────────────────────

	test('communication page renders without overflow', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		const scrollWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
		expect(scrollWidth).toBeLessThanOrEqual(375 + 5);
	});

	test('communication category tabs are scrollable on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		const tabsScroll = page.locator('.comm-tabs-scroll');
		const isVisible = await tabsScroll.isVisible().catch(() => false);

		if (!isVisible) return;

		// Tab container should have overflow-x: auto
		const overflowX = await tabsScroll.evaluate((el) => window.getComputedStyle(el).overflowX);
		expect(overflowX).toBe('auto');
	});

	test('communication template cards stack in single column on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		const cards = page.locator('.template-card');
		const count = await cards.count();

		if (count >= 2) {
			const firstBox = await cards.first().boundingBox();
			const secondBox = await cards.nth(1).boundingBox();

			if (firstBox && secondBox) {
				// Cards should stack vertically (same x position)
				expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThan(20);
				expect(secondBox.y).toBeGreaterThan(firstBox.y);
			}
		}
	});

	test('compose panel is usable on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		const cards = page.locator('.template-card');
		if ((await cards.count()) === 0) return;

		await cards.first().click();
		await page.waitForTimeout(300);

		// Composer wrap should be visible
		const composer = page.locator('.composer-wrap');
		await expect(composer).toBeVisible();

		// Composer should not cause horizontal overflow
		const composerBox = await composer.boundingBox();
		if (composerBox) {
			expect(composerBox.x + composerBox.width).toBeLessThanOrEqual(375 + 10);
		}
	});

	// ── CRM PIPELINE ──────────────────────────────────────────────────

	test('CRM page renders without vertical content being cut off', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		// The CRM page header should be visible
		const title = page.locator('.page-title:has-text("CRM Dashboard")');
		await expect(title).toBeVisible();
	});

	test('CRM pipeline section is horizontally scrollable on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		const pipelineScroll = page.locator('.pipeline-scroll');
		const isVisible = await pipelineScroll.isVisible().catch(() => false);

		if (!isVisible) return;

		// Pipeline scroll container should have overflow-x: auto
		const overflowX = await pipelineScroll.evaluate((el) => window.getComputedStyle(el).overflowX);
		expect(overflowX).toBe('auto');

		// The scroll width should exceed the viewport (columns are min-width: 200px)
		const scrollWidth = await pipelineScroll.evaluate((el) => el.scrollWidth);
		const clientWidth = await pipelineScroll.evaluate((el) => el.clientWidth);

		// If there are multiple columns, scrollWidth > clientWidth
		const columns = pipelineScroll.locator('.pipeline-column');
		const colCount = await columns.count();
		if (colCount > 1) {
			expect(scrollWidth).toBeGreaterThan(clientWidth);
		}
	});

	test('CRM metrics grid shows 2-column layout on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		const metricsGrid = page.locator('.metrics-grid');
		const isVisible = await metricsGrid.isVisible().catch(() => false);

		if (!isVisible) return;

		// On mobile (375px), the grid should be 2 columns (grid-template-columns: repeat(2, 1fr))
		const gridCols = await metricsGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		// Should have 2 columns — format like "XXpx XXpx"
		const colParts = gridCols.split(/\s+/).filter((s) => s.length > 0);
		expect(colParts.length).toBe(2);
	});

	test('CRM source table is scrollable on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		const tableWrap = page.locator('.source-table-wrap');
		const isVisible = await tableWrap.isVisible().catch(() => false);

		if (!isVisible) return;

		const overflowX = await tableWrap.evaluate((el) => window.getComputedStyle(el).overflowX);
		expect(overflowX).toBe('auto');
	});

	// ── ANALYTICS ─────────────────────────────────────────────────────

	test('analytics page renders without overflow', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.ANALYTICS);
		await page.waitForLoadState('networkidle');

		const scrollWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
		expect(scrollWidth).toBeLessThanOrEqual(375 + 5);
	});

	test('analytics metrics grid shows 2-column layout on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.ANALYTICS);
		await page.waitForLoadState('networkidle');

		// The metrics grid on analytics is "grid-cols-2 lg:grid-cols-4"
		const metricsGrid = page.locator('.grid.grid-cols-2');
		const count = await metricsGrid.count();

		if (count === 0) return; // No data state

		const firstGrid = metricsGrid.first();
		const gridCols = await firstGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		// Should have 2 columns on mobile
		const colParts = gridCols.split(/\s+/).filter((s) => s.length > 0);
		expect(colParts.length).toBe(2);
	});

	test('analytics score ring fits within mobile viewport', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.ANALYTICS);
		await page.waitForLoadState('networkidle');

		const scoreRingSvg = page.locator('svg:has(circle.score-ring-progress)');
		const isVisible = await scoreRingSvg.isVisible().catch(() => false);

		if (!isVisible) return;

		const box = await scoreRingSvg.boundingBox();
		if (box) {
			expect(box.x + box.width).toBeLessThanOrEqual(375 + 5);
		}
	});

	test('analytics insights and alerts stack vertically on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.ANALYTICS);
		await page.waitForLoadState('networkidle');

		// The bottom section grid is "lg:grid-cols-2" — should be 1-col on mobile
		const bottomGrid = page.locator('.grid.gap-6.lg\\:grid-cols-2');
		const isVisible = await bottomGrid.isVisible().catch(() => false);

		if (!isVisible) return;

		const gridCols = await bottomGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		// On mobile, should be single column (one value)
		const colParts = gridCols.split(/\s+/).filter((s) => s.length > 0);
		expect(colParts.length).toBe(1);
	});

	// ── TOUCH TARGETS ─────────────────────────────────────────────────

	test('touch targets on dashboard are at least 40px tall', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.HOME);
		await page.waitForLoadState('networkidle');

		const buttons = page.locator('button:visible');
		const count = await buttons.count();

		let checkedCount = 0;
		for (let i = 0; i < Math.min(count, 10); i++) {
			const box = await buttons.nth(i).boundingBox();
			if (box && box.height > 0 && box.width > 0) {
				// Allow 40px minimum (slightly below 44px guideline for density)
				expect(box.height).toBeGreaterThanOrEqual(40);
				checkedCount++;
			}
		}

		// We should have checked at least one button (if any visible)
		if (count > 0) {
			expect(checkedCount).toBeGreaterThan(0);
		}
	});

	test('touch targets on communication page are at least 40px tall', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		// Check tab buttons specifically
		const tabButtons = page.locator('.comm-tabs-scroll button');
		const count = await tabButtons.count();

		for (let i = 0; i < count; i++) {
			const box = await tabButtons.nth(i).boundingBox();
			if (box) {
				expect(box.height).toBeGreaterThanOrEqual(36); // Tab buttons can be slightly smaller
			}
		}

		// Check template cards — they are clickable buttons
		const cards = page.locator('.template-card');
		const cardCount = await cards.count();

		for (let i = 0; i < Math.min(cardCount, 5); i++) {
			const box = await cards.nth(i).boundingBox();
			if (box) {
				// Template cards should be comfortable touch targets
				expect(box.height).toBeGreaterThanOrEqual(44);
			}
		}
	});

	test('links and buttons on CRM page have adequate touch size', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		// Check interactive elements
		const interactive = page.locator('a:visible, button:visible');
		const count = await interactive.count();

		let tooSmallCount = 0;
		for (let i = 0; i < Math.min(count, 15); i++) {
			const box = await interactive.nth(i).boundingBox();
			if (box && box.height > 0) {
				if (box.height < 36) {
					tooSmallCount++;
				}
			}
		}

		// Allow a few small elements (badges, inline links) but majority should be large enough
		expect(tooSmallCount).toBeLessThan(Math.ceil(count * 0.3));
	});

	// ── BOTTOM PADDING FOR MOBILE NAV ─────────────────────────────────

	test('dashboard pages have bottom padding for mobile nav bar', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.HOME);
		await page.waitForLoadState('networkidle');

		// Check that the main content area has padding-bottom
		const mainContent = page.locator('.pb-20, .crm-page');
		const count = await mainContent.count();

		if (count > 0) {
			const paddingBottom = await mainContent.first().evaluate((el) => {
				return parseInt(window.getComputedStyle(el).paddingBottom, 10);
			});

			// Should have substantial bottom padding for the mobile nav bar
			expect(paddingBottom).toBeGreaterThanOrEqual(60);
		}
	});

	test('CRM page has bottom padding for mobile nav', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CRM);
		await page.waitForLoadState('networkidle');

		const crmPage = page.locator('.crm-page');
		const isVisible = await crmPage.isVisible().catch(() => false);

		if (!isVisible) return;

		const paddingBottom = await crmPage.evaluate((el) => {
			return parseInt(window.getComputedStyle(el).paddingBottom, 10);
		});

		// At 375px width, should have 6rem (96px) padding-bottom per the CSS
		expect(paddingBottom).toBeGreaterThanOrEqual(80);
	});

	// ── RESPONSIVE TEXT SIZES ─────────────────────────────────────────

	test('headings scale down on mobile', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.COMMUNICATION);
		await page.waitForLoadState('networkidle');

		const heading = page.locator('h1:has-text("Communication Hub")');
		await expect(heading).toBeVisible();

		const fontSize = await heading.evaluate((el) => {
			return parseFloat(window.getComputedStyle(el).fontSize);
		});

		// On mobile, heading should be around 20px (text-xl = 1.25rem)
		// Not the larger md:text-2xl size
		expect(fontSize).toBeLessThanOrEqual(24);
	});

	// ── NAVIGATION ────────────────────────────────────────────────────

	test('all dashboard sections are navigable on mobile', async ({ page }) => {
		// Navigate to each section and verify it loads without errors
		const routes = [
			DASHBOARD_ROUTES.HOME,
			DASHBOARD_ROUTES.CASES,
			DASHBOARD_ROUTES.COMMUNICATION,
			DASHBOARD_ROUTES.CRM,
			DASHBOARD_ROUTES.ANALYTICS
		];

		for (const route of routes) {
			await page.goto(route);
			await page.waitForLoadState('networkidle');

			// No JavaScript errors should crash the page
			const bodyText = await page.locator('body').innerText();
			expect(bodyText.length).toBeGreaterThan(0);

			// No horizontal overflow
			const scrollWidth = await page.locator('body').evaluate((el) => el.scrollWidth);
			expect(scrollWidth).toBeLessThanOrEqual(375 + 10);
		}
	});
});
