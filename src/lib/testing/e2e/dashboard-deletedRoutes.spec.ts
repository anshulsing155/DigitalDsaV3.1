/**
 * Dashboard Deleted Routes E2E Tests (Task 1.33)
 *
 * Verifies that legacy/non-DSA dashboard routes return 404 or redirect
 * to the correct DSA dashboard. These routes were removed during the
 * multi-role to DSA-only migration.
 *
 * Routes tested:
 *   /dashboard/user             -> redirect to /dashboard/dsa or /login, or 404
 *   /dashboard/rm               -> redirect to /dashboard/dsa or /login, or 404
 *   /dashboard/property-consultant -> redirect or 404
 *   /user-onboarding            -> redirect or 404
 *   /rm-onboarding              -> redirect or 404
 */

import { test, expect } from '@playwright/test';
import { DELETED_ROUTES } from './dashboard.setup';

test.describe('Deleted Routes - Non-DSA routes return 404 or redirect', () => {
	for (const route of DELETED_ROUTES) {
		test(`${route} redirects to DSA dashboard, login, or returns 404`, async ({ page }) => {
			const response = await page.goto(route);

			// After navigation, one of three things should have happened:
			//  1. Redirected to /dashboard/dsa (the unified DSA dashboard)
			//  2. Redirected to /login (not authenticated for the old role)
			//  3. The server returned a 404 status
			const finalUrl = page.url();
			const status = response?.status() ?? 0;

			const redirectedToDsa = finalUrl.includes('/dashboard/dsa');
			const redirectedToLogin = finalUrl.includes('/login');
			const is404 = status === 404;

			expect(
				redirectedToDsa || redirectedToLogin || is404,
				`Expected ${route} to redirect to /dashboard/dsa, /login, or return 404. ` +
					`Got status=${status}, url=${finalUrl}`
			).toBeTruthy();
		});
	}

	test('/dashboard redirects to /dashboard/dsa for authenticated users', async ({ page }) => {
		const response = await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();
		// The layout.server.ts redirects /dashboard to /dashboard/dsa for non-admin users
		const ok = finalUrl.includes('/dashboard/dsa') || finalUrl.includes('/login');
		expect(
			ok,
			`Expected /dashboard to redirect to /dashboard/dsa or /login. Got url=${finalUrl}`
		).toBeTruthy();
	});

	test('/dashboard/user does not render any user-specific content', async ({ page }) => {
		await page.goto('/dashboard/user');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();

		if (finalUrl.includes('/dashboard/user')) {
			// If the route still loads (not redirected), verify it shows 404 content
			// or at least does not show user-specific dashboard elements
			const userDashboardHeading = page.locator('h1:has-text("User Dashboard")');
			const count = await userDashboardHeading.count();
			expect(count, 'User Dashboard heading should not be visible').toBe(0);
		}
		// If redirected, that is the expected behavior -- test passes
	});

	test('/dashboard/rm does not render RM-specific content', async ({ page }) => {
		await page.goto('/dashboard/rm');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();

		if (finalUrl.includes('/dashboard/rm')) {
			const rmDashboardHeading = page.locator('h1:has-text("RM Dashboard")');
			const count = await rmDashboardHeading.count();
			expect(count, 'RM Dashboard heading should not be visible').toBe(0);
		}
	});

	test('/dashboard/property-consultant does not render PC-specific content', async ({ page }) => {
		await page.goto('/dashboard/property-consultant');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();

		if (finalUrl.includes('/dashboard/property-consultant')) {
			const pcHeading = page.locator('h1:has-text("Property Consultant")');
			const count = await pcHeading.count();
			expect(count, 'Property Consultant heading should not be visible').toBe(0);
		}
	});

	test('/user-onboarding does not render onboarding flow for user role', async ({ page }) => {
		const response = await page.goto('/user-onboarding');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();
		const status = response?.status() ?? 0;

		// Should not stay on /user-onboarding with a working onboarding form
		const redirected = !finalUrl.includes('/user-onboarding');
		const is404 = status === 404;

		expect(
			redirected || is404,
			`Expected /user-onboarding to redirect or 404. Got status=${status}, url=${finalUrl}`
		).toBeTruthy();
	});

	test('/rm-onboarding does not render onboarding flow for RM role', async ({ page }) => {
		const response = await page.goto('/rm-onboarding');
		await page.waitForLoadState('networkidle');

		const finalUrl = page.url();
		const status = response?.status() ?? 0;

		const redirected = !finalUrl.includes('/rm-onboarding');
		const is404 = status === 404;

		expect(
			redirected || is404,
			`Expected /rm-onboarding to redirect or 404. Got status=${status}, url=${finalUrl}`
		).toBeTruthy();
	});
});
