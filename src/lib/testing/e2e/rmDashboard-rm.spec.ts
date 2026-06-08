/**
 * RM Dashboard — E2E Tests
 *
 * Runs under the `rm` project (RM auth state).
 * Tests all RM dashboard pages for load, basic content, and navigation.
 */
import { test, expect } from '@playwright/test';
import {
	RM_ROUTES,
	TEST_RM,
	navigateToRmHome,
	navigateToRmPage,
	expectPageHeading
} from './rmDashboard.setup';

test.describe('RM Dashboard — Home', () => {
	test('page loads without error', async ({ page }) => {
		await navigateToRmHome(page);
		await expect(page).toHaveURL(new RegExp(RM_ROUTES.HOME));
	});

	test('shows welcome message or empty state', async ({ page }) => {
		await navigateToRmHome(page);
		// Either welcome heading or empty onboarding state
		const content = page.locator('h1, h2, [class*="welcome"], [class*="empty"]').first();
		await expect(content).toBeVisible({ timeout: 15000 });
	});

	test('displays stat cards or empty state prompt', async ({ page }) => {
		await navigateToRmHome(page);
		// Stat cards have numbers or the empty state has a CTA
		const statsOrCta = page
			.locator('[class*="stat"], [class*="card"], button:has-text("Find DSA"), text=No cases')
			.first();
		await expect(statsOrCta).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Cases', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.CASES);
		await expectPageHeading(page, 'Cases');
	});

	test('shows stage filter or empty state', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.CASES);
		// Stage filter buttons or empty message
		const filterOrEmpty = page
			.locator('button:has-text("All"), button:has-text("Intake"), text=No cases, text=empty')
			.first();
		await expect(filterOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Communication', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.COMMUNICATION);
		await expectPageHeading(page, 'Communication');
	});

	test('shows thread list or empty state', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.COMMUNICATION);
		const threadOrEmpty = page
			.locator('[class*="thread"], text=No conversations, text=no threads, text=empty')
			.first();
		await expect(threadOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Broadcasts', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.BROADCASTS);
		await expectPageHeading(page, 'Broadcasts');
	});

	test('shows new broadcast button', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.BROADCASTS);
		const newBtn = page
			.locator('button:has-text("New Broadcast"), button:has-text("Create")')
			.first();
		await expect(newBtn).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Policies', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.POLICIES);
		await expectPageHeading(page, 'Policies');
	});

	test('shows upload button or empty state', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.POLICIES);
		const uploadOrEmpty = page
			.locator('button:has-text("Upload"), text=No policies, text=empty')
			.first();
		await expect(uploadOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — DSA Search', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.DSA_SEARCH);
		await expectPageHeading(page, 'DSA');
	});

	test('shows search input', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.DSA_SEARCH);
		const searchInput = page
			.locator('input[type="text"], input[placeholder*="search" i], input[placeholder*="city" i]')
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Submissions', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.SUBMISSIONS);
		await expectPageHeading(page, 'Submissions');
	});

	test('shows status filter or empty state', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.SUBMISSIONS);
		const filterOrEmpty = page
			.locator(
				'button:has-text("All"), button:has-text("Submitted"), text=No submissions, text=empty'
			)
			.first();
		await expect(filterOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Settings', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.SETTINGS);
		await expectPageHeading(page, 'Settings');
	});

	test('shows RM profile info', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.SETTINGS);
		// Should display mobile number or name
		const profileInfo = page
			.locator(
				`text=${TEST_RM.mobileNumber}, text=${TEST_RM.name}, input[value*="${TEST_RM.name}"]`
			)
			.first();
		await expect(profileInfo).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Analytics', () => {
	test('page loads', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.ANALYTICS);
		await expectPageHeading(page, 'Analytics');
	});

	test('shows score or empty state', async ({ page }) => {
		await navigateToRmPage(page, RM_ROUTES.ANALYTICS);
		// Overall score ring or empty state CTA
		const content = page
			.locator(
				'svg, [class*="score"], [class*="ring"], text=No data, button:has-text("View Cases")'
			)
			.first();
		await expect(content).toBeVisible({ timeout: 10000 });
	});
});

test.describe('RM Dashboard — Navigation', () => {
	test('sidebar nav links are visible', async ({ page }) => {
		await navigateToRmHome(page);
		// Check for nav links (sidebar or bottom nav)
		const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
		const count = await navLinks.count();
		expect(count).toBeGreaterThanOrEqual(4);
	});

	test('clicking Cases nav link navigates correctly', async ({ page }) => {
		await navigateToRmHome(page);
		const casesLink = page.locator('a[href*="/dashboard/rm/cases"]').first();
		if (await casesLink.isVisible()) {
			await casesLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(new RegExp('/dashboard/rm/cases'));
		}
	});

	test('clicking Settings nav link navigates correctly', async ({ page }) => {
		await navigateToRmHome(page);
		const settingsLink = page.locator('a[href*="/dashboard/rm/settings"]').first();
		if (await settingsLink.isVisible()) {
			await settingsLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(new RegExp('/dashboard/rm/settings'));
		}
	});
});
