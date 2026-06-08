/**
 * Admin Dashboard — E2E Tests
 *
 * Runs under the `admin` project (Admin auth state with super admin + all permissions).
 * Tests all admin dashboard pages for load, basic content, and navigation.
 */
import { test, expect } from '@playwright/test';
import {
	ADMIN_ROUTES,
	TEST_ADMIN,
	navigateToAdminHome,
	navigateToAdminPage,
	expectPageHeading
} from './adminDashboard.setup';

test.describe('Admin Dashboard — Home', () => {
	test('page loads without error', async ({ page }) => {
		await navigateToAdminHome(page);
		await expect(page).toHaveURL(new RegExp(ADMIN_ROUTES.HOME));
	});

	test('shows Admin Dashboard heading', async ({ page }) => {
		await navigateToAdminHome(page);
		await expectPageHeading(page, 'Admin Dashboard');
	});

	test('displays overview stat cards', async ({ page }) => {
		await navigateToAdminHome(page);
		// Should show account summary cards (Total, Active, Inactive, Deleted)
		const statCards = page.locator('[class*="card"], [class*="stat"]');
		const count = await statCards.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('displays rule pipeline status', async ({ page }) => {
		await navigateToAdminHome(page);
		// Pipeline status shows draft/parsing/in_review/etc columns
		const pipelineContent = page
			.locator('text=draft, text=parsing, text=Pipeline, text=Rule Pipeline')
			.first();
		await expect(pipelineContent).toBeVisible({ timeout: 10000 });
	});

	test('displays role breakdown section', async ({ page }) => {
		await navigateToAdminHome(page);
		const roleSection = page
			.locator('text=Role Breakdown, text=DSA, text=Active, text=Inactive')
			.first();
		await expect(roleSection).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Admin Dashboard — User Management', () => {
	test('page loads', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.USERS);
		await expectPageHeading(page, 'User Management');
	});

	test('shows DSA/RM tabs', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.USERS);
		const dsaTab = page.locator('button:has-text("DSA"), [role="tab"]:has-text("DSA")').first();
		await expect(dsaTab).toBeVisible({ timeout: 10000 });
	});

	test('shows search input', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.USERS);
		const searchInput = page
			.locator(
				'input[type="text"], input[placeholder*="search" i], input[placeholder*="name" i], input[placeholder*="phone" i]'
			)
			.first();
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test('shows user table or empty state', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.USERS);
		const tableOrEmpty = page
			.locator('table, [role="table"], text=No users, text=No results')
			.first();
		await expect(tableOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Admin Dashboard — Audit Log', () => {
	test('page loads', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.AUDIT);
		await expectPageHeading(page, 'Audit');
	});

	test('shows filter controls', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.AUDIT);
		// Filter has actor name, action type, target type fields
		const filterInput = page
			.locator(
				'input, select, button:has-text("Apply"), button:has-text("Clear"), button:has-text("Filter")'
			)
			.first();
		await expect(filterInput).toBeVisible({ timeout: 10000 });
	});

	test('shows audit entries or empty state', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.AUDIT);
		const entriesOrEmpty = page
			.locator('table, [role="table"], tr, text=No audit, text=No entries, text=empty')
			.first();
		await expect(entriesOrEmpty).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Admin Dashboard — Policies', () => {
	test('page loads', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.POLICIES);
		await expectPageHeading(page, 'Policy');
	});

	test('shows view toggle or policy content', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.POLICIES);
		// View toggle buttons (Policy Engine / Legacy / All)
		const content = page
			.locator(
				'button:has-text("Policy Engine"), button:has-text("Legacy"), button:has-text("All"), text=Lender'
			)
			.first();
		await expect(content).toBeVisible({ timeout: 10000 });
	});

	test('shows stat cards for policy data', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.POLICIES);
		// Should show Lenders/Products/Variations/Active Rules stats
		const stats = page.locator('[class*="card"], [class*="stat"]');
		const count = await stats.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});
});

test.describe('Admin Dashboard — Testing', () => {
	test('page loads', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.TESTING);
		await expectPageHeading(page, 'Testing Dashboard');
	});

	test('shows test health section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.TESTING);
		const healthSection = page.locator('text=Test Health').first();
		await expect(healthSection).toBeVisible({ timeout: 10000 });
	});

	test('shows fixture profiles section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.TESTING);
		const fixtureSection = page.locator('text=Fixture Profiles').first();
		await expect(fixtureSection).toBeVisible({ timeout: 10000 });
	});

	test('shows synthetic profiles section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.TESTING);
		const syntheticSection = page.locator('text=Synthetic Profiles').first();
		await expect(syntheticSection).toBeVisible({ timeout: 10000 });
	});

	test('shows seed fixture button when no fixtures', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.TESTING);
		// If no fixtures, seed button should appear
		const seedBtn = page.locator('button:has-text("Seed")').first();
		const fixtureTable = page.locator('table').first();
		// Either the seed button or a table of fixtures should be visible
		const visible =
			(await seedBtn.isVisible().catch(() => false)) ||
			(await fixtureTable.isVisible().catch(() => false));
		expect(visible).toBe(true);
	});
});

test.describe('Admin Dashboard — Settings', () => {
	test('page loads', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.SETTINGS);
		await expectPageHeading(page, 'Settings');
	});

	test('shows admin profile section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.SETTINGS);
		const profileSection = page
			.locator(`text=${TEST_ADMIN.name}, text=${TEST_ADMIN.mobileNumber}`)
			.first();
		await expect(profileSection).toBeVisible({ timeout: 10000 });
	});

	test('shows permissions section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.SETTINGS);
		const permSection = page
			.locator('text=Permission, text=User Management, text=Rule Authoring')
			.first();
		await expect(permSection).toBeVisible({ timeout: 10000 });
	});

	test('shows API key management section', async ({ page }) => {
		await navigateToAdminPage(page, ADMIN_ROUTES.SETTINGS);
		const apiSection = page.locator('text=API Key, button:has-text("Add API Key")').first();
		await expect(apiSection).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Admin Dashboard — Navigation', () => {
	test('sidebar nav links are visible', async ({ page }) => {
		await navigateToAdminHome(page);
		const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
		const count = await navLinks.count();
		expect(count).toBeGreaterThanOrEqual(4);
	});

	test('clicking Users nav link navigates correctly', async ({ page }) => {
		await navigateToAdminHome(page);
		const usersLink = page.locator('a[href*="/dashboard/admin/users"]').first();
		if (await usersLink.isVisible()) {
			await usersLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(new RegExp('/dashboard/admin/users'));
		}
	});

	test('clicking Policies nav link navigates correctly', async ({ page }) => {
		await navigateToAdminHome(page);
		const policiesLink = page.locator('a[href*="/dashboard/admin/policies"]').first();
		if (await policiesLink.isVisible()) {
			await policiesLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(new RegExp('/dashboard/admin/policies'));
		}
	});

	test('clicking Settings nav link navigates correctly', async ({ page }) => {
		await navigateToAdminHome(page);
		const settingsLink = page.locator('a[href*="/dashboard/admin/settings"]').first();
		if (await settingsLink.isVisible()) {
			await settingsLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(new RegExp('/dashboard/admin/settings'));
		}
	});
});

test.describe('Admin Dashboard — Auth Guard', () => {
	test('admin pages show content (not redirect)', async ({ page }) => {
		// Since we're authenticated as admin, we should see content not a redirect
		await navigateToAdminHome(page);
		const content = page.locator('h1, h2, main').first();
		await expect(content).toBeVisible({ timeout: 15000 });
		// Should NOT be on login page
		const url = page.url();
		expect(url).not.toContain('/login');
	});
});
