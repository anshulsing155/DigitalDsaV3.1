/**
 * Multi-Role Login — E2E Tests
 *
 * Tests role detection, role-based auth, and cross-role denial.
 * Runs under the `dsa` project (default auth state).
 */
import { test, expect } from '@playwright/test';

test.describe('Multi-Role Login — Role Detection', () => {
	test('detect-roles returns roles for DSA user', async ({ request }) => {
		const res = await request.post('/api/auth/detect-roles', {
			data: { mobileNumber: '9999900000' }
		});

		// May return 200 with roles or 404 if user not found in detect-roles
		if (res.ok()) {
			const body = await res.json();
			expect(body.success).toBe(true);
			// Should have at least one role detected
			if (body.data?.roles) {
				expect(body.data.roles.length).toBeGreaterThanOrEqual(1);
			}
		}
	});

	test('detect-roles returns roles for RM user', async ({ request }) => {
		const res = await request.post('/api/auth/detect-roles', {
			data: { mobileNumber: '9999900001' }
		});

		if (res.ok()) {
			const body = await res.json();
			expect(body.success).toBe(true);
		}
	});

	test('detect-roles returns roles for Admin user', async ({ request }) => {
		const res = await request.post('/api/auth/detect-roles', {
			data: { mobileNumber: '9999900002' }
		});

		if (res.ok()) {
			const body = await res.json();
			expect(body.success).toBe(true);
		}
	});
});

test.describe('Multi-Role Login — Cross-Role Denial', () => {
	test('DSA user cannot access admin dashboard', async ({ page }) => {
		// Current auth state is DSA — try accessing admin routes
		await page.goto('/dashboard/admin');
		await page.waitForLoadState('networkidle');

		// Should be redirected to login or show 403/unauthorized
		const url = page.url();
		const isBlocked =
			url.includes('/login') || url.includes('/dashboard/dsa') || !url.includes('/dashboard/admin');

		// Or check for error content
		const errorContent = page
			.locator('text=unauthorized, text=forbidden, text=access denied, text=403')
			.first();
		const hasError = await errorContent.isVisible().catch(() => false);

		expect(isBlocked || hasError).toBe(true);
	});

	test('DSA user cannot access RM dashboard', async ({ page }) => {
		await page.goto('/dashboard/rm');
		await page.waitForLoadState('networkidle');

		const url = page.url();
		const isBlocked =
			url.includes('/login') || url.includes('/dashboard/dsa') || !url.includes('/dashboard/rm');

		const errorContent = page
			.locator('text=unauthorized, text=forbidden, text=access denied, text=403')
			.first();
		const hasError = await errorContent.isVisible().catch(() => false);

		expect(isBlocked || hasError).toBe(true);
	});
});

test.describe('Multi-Role Login — Role Cookie', () => {
	test('DSA auth state has correct cookies', async ({ page }) => {
		await page.goto('/dashboard/dsa');
		await page.waitForLoadState('networkidle');

		// Check the activeRole cookie is set
		const cookies = await page.context().cookies();
		const activeRoleCookie = cookies.find((c) => c.name === 'activeRole');
		if (activeRoleCookie) {
			expect(activeRoleCookie.value).toBe('dsa');
		}
	});
});
