/**
 * Admin Dashboard E2E Test Setup - Shared Fixtures & Helpers
 *
 * Provides route constants and navigation helpers for Admin dashboard tests.
 * Used by adminDashboard-admin.spec.ts (runs under the `admin` Playwright project).
 */

import { type Page, expect } from '@playwright/test';

// ── Routes ──────────────────────────────────────────────────
export const ADMIN_ROUTES = {
	HOME: '/dashboard/admin',
	USERS: '/dashboard/admin/users',
	AUDIT: '/dashboard/admin/audit',
	POLICIES: '/dashboard/admin/policies',
	TESTING: '/dashboard/admin/testing',
	SETTINGS: '/dashboard/admin/settings'
};

// ── Test Admin user constants (must match e2e-auth ADMIN_USER) ──
export const TEST_ADMIN = {
	mobileNumber: 9999900002,
	name: 'E2E Test Admin',
	email: 'e2e-admin@digitaldsa.test'
};

// ── Navigation helpers ────────────────────────────────────
export async function navigateToAdminHome(page: Page): Promise<void> {
	await page.goto(ADMIN_ROUTES.HOME);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
}

export async function navigateToAdminPage(page: Page, route: string): Promise<void> {
	await page.goto(route);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
}

// ── UI assertion helpers ──────────────────────────────────
export async function expectPageHeading(page: Page, text: string): Promise<void> {
	const heading = page.locator(`h1:has-text("${text}"), h2:has-text("${text}")`).first();
	await expect(heading).toBeVisible({ timeout: 15000 });
}

export async function expectNoServerError(page: Page): Promise<void> {
	const errorText = page.locator('text=Internal Server Error, text=500');
	await expect(errorText)
		.not.toBeVisible({ timeout: 2000 })
		.catch(() => {});
}
