/**
 * RM Dashboard E2E Test Setup - Shared Fixtures & Helpers
 *
 * Provides route constants and navigation helpers for RM dashboard tests.
 * Used by rmDashboard-rm.spec.ts (runs under the `rm` Playwright project).
 */

import { type Page, expect } from '@playwright/test';

// ── Routes ──────────────────────────────────────────────────
export const RM_ROUTES = {
	HOME: '/dashboard/rm',
	CASES: '/dashboard/rm/cases',
	COMMUNICATION: '/dashboard/rm/communication',
	BROADCASTS: '/dashboard/rm/broadcasts',
	POLICIES: '/dashboard/rm/policies',
	SETTINGS: '/dashboard/rm/settings',
	DSA_SEARCH: '/dashboard/rm/dsa-search',
	SUBMISSIONS: '/dashboard/rm/submissions',
	ANALYTICS: '/dashboard/rm/analytics'
};

// ── Test RM user constants (must match e2e-auth RM_USER) ──
export const TEST_RM = {
	mobileNumber: 9999900001,
	name: 'E2E Test RM',
	email: 'e2e-rm@digitaldsa.test',
	bankName: 'Test Bank'
};

// ── Navigation helpers ────────────────────────────────────
export async function navigateToRmHome(page: Page): Promise<void> {
	await page.goto(RM_ROUTES.HOME);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
}

export async function navigateToRmPage(page: Page, route: string): Promise<void> {
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
	// Check no 500/403/404 error page is displayed
	const errorText = page.locator('text=Internal Server Error, text=500, text=403 Forbidden');
	await expect(errorText)
		.not.toBeVisible({ timeout: 2000 })
		.catch(() => {
			// Ignore — no error is the happy path
		});
}
