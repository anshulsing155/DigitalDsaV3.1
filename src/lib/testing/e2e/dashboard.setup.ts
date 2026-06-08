/**
 * Dashboard E2E Test Setup - Shared Fixtures & Helpers
 *
 * Provides reusable functions for creating cases, navigating,
 * and interacting with the DSA dashboard in Playwright tests.
 *
 * Auth pre-requisites:
 *  - global.setup.ts creates an Applicant with mobileNumber: 9999900000
 *  - The DSA dashboard requires a matching DsaApplications document
 *  - ensureDsaProfile() must be called in beforeAll to create that link
 */

import { type Page, type APIRequestContext, expect } from '@playwright/test';

// ── Routes ──────────────────────────────────────────────────
export const DASHBOARD_ROUTES = {
	HOME: '/dashboard/dsa',
	CASES: '/dashboard/dsa/cases',
	COMMUNICATION: '/dashboard/dsa/communication',
	CRM: '/dashboard/dsa/crm',
	ANALYTICS: '/dashboard/dsa/analytics',
	RM_CONTACTS: '/dashboard/dsa/rm-contacts'
};

// ── Deleted / legacy routes that should 404 or redirect ─────
export const DELETED_ROUTES = [
	'/dashboard/user',
	'/dashboard/rm',
	'/dashboard/property-consultant',
	'/user-onboarding',
	'/rm-onboarding'
];

// ── Test user constants (must match global.setup.ts + e2e-auth) ──
export const TEST_USER = {
	mobileNumber: 9999900000,
	name: 'E2E Test User',
	email: 'e2e-test@digitaldsa.test'
};

// ── Ensure DSA profile exists ────────────────────────────────
/**
 * Verifies the DsaApplications document exists for the test user.
 *
 * Since the e2e-auth endpoint now creates both the Applicant and
 * DsaApplications records directly, this function just verifies
 * that the DSA dashboard is accessible (lightweight check).
 *
 * Overload: accepts either a Page (legacy) or APIRequestContext.
 */
export async function ensureDsaProfile(pageOrRequest: Page | APIRequestContext): Promise<void> {
	// Legacy overload: if a Page is passed, navigate to trigger profile
	if ('goto' in pageOrRequest) {
		await pageOrRequest.goto(DASHBOARD_ROUTES.HOME);
		await pageOrRequest.waitForLoadState('networkidle');
		await pageOrRequest.waitForTimeout(500);
		return;
	}

	const request = pageOrRequest;

	// Verify DSA profile exists (e2e-auth creates it automatically)
	try {
		const checkResp = await request.get('/api/onboarding/dsa-onboarding-v2');
		if (checkResp.ok()) {
			const checkData = await checkResp.json();
			if (checkData.success && checkData.data?.business_profile) {
				return;
			}
		}
	} catch {
		// Profile check failed — may still work if e2e-auth created it
	}

	// Fallback: POST to onboarding-v2 if e2e-auth somehow didn't create it
	try {
		const resp = await request.post('/api/onboarding/dsa-onboarding-v2', {
			data: {
				business_profile: {
					team_size: 'solo',
					monthly_file_volume: '0-5',
					primary_loan_types: ['Home Loan'],
					empanelled_lenders: [{ lender_name: 'SBI', has_direct_code: false }],
					geography: { city: 'Delhi' },
					current_tools: ['excel'],
					has_website: false,
					lead_sources: ['self']
				}
			}
		});
		if (!resp.ok()) {
			console.warn(
				`ensureDsaProfile: onboarding-v2 POST returned ${resp.status()}.` +
					' Dashboard tests may fail if DSA profile is missing.'
			);
		}
	} catch (err) {
		console.warn('ensureDsaProfile: failed to create DSA profile via onboarding-v2.', err);
	}
}

// ── Clear sample data via API ─────────────────────────────────
/**
 * Clears all sample cases for the authenticated DSA.
 * The dashboard UI calls POST /api/cases/clear-samples.
 */
export async function clearSampleData(request: APIRequestContext): Promise<boolean> {
	try {
		const resp = await request.post('/api/cases/clear-samples');
		return resp.ok();
	} catch {
		return false;
	}
}

// ── Navigation helpers ────────────────────────────────────────
/** Navigate to the DSA dashboard home and wait for load. */
export async function navigateToDashboard(page: Page): Promise<void> {
	await page.goto(DASHBOARD_ROUTES.HOME);
	await page.waitForLoadState('networkidle');
	await page.waitForSelector('h1, h2', { timeout: 15000 });
}

/** Navigate to the cases list page. */
export async function navigateToCases(page: Page): Promise<void> {
	await page.goto(DASHBOARD_ROUTES.CASES);
	await page.waitForLoadState('networkidle');
}

// ── UI assertion helpers ──────────────────────────────────────
/** Check that the welcome header is visible. */
export async function expectWelcomeHeader(page: Page, partialName?: string): Promise<void> {
	const heading = page.locator('h1:has-text("Welcome")');
	await expect(heading).toBeVisible({ timeout: 10000 });
	if (partialName) {
		await expect(heading).toContainText(partialName);
	}
}

/** Check that the empty state is shown (no cases at all). */
export async function expectEmptyState(page: Page): Promise<void> {
	const emptyHeading = page.locator('text=Your Dashboard is Ready');
	await expect(emptyHeading).toBeVisible({ timeout: 10000 });
}

/** Check that sample data banner is visible. */
export async function expectSampleBanner(page: Page): Promise<void> {
	const banner = page.locator('text=sample data');
	await expect(banner.first()).toBeVisible({ timeout: 10000 });
}

/** Check that a sample badge is visible somewhere on the page. */
export async function expectSampleBadge(page: Page): Promise<void> {
	const badge = page.locator('span:has-text("Sample")');
	await expect(badge.first()).toBeVisible({ timeout: 10000 });
}

// ── Create a test case via API ──────────────────────────────
export async function createTestCase(
	request: APIRequestContext,
	overrides: {
		label?: string;
		loan_type?: string;
		amount_required?: number;
	} = {}
): Promise<{ case_id: string; label: string }> {
	const label = overrides.label || `E2E Test Case ${Date.now()}`;
	const res = await request.post('/api/cases', {
		data: {
			label,
			loan: {
				type: overrides.loan_type || 'Home Loan',
				amount_required: overrides.amount_required || 5000000
			}
		}
	});

	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.success).toBe(true);
	expect(body.data.case_id).toBeTruthy();
	return { case_id: body.data.case_id, label };
}

// ── Create a test case WITH a lender application ─────────────
/**
 * Creates a test case and adds a lender application to it.
 * Used by tests that need a case with at least one lender app
 * (e.g., document management, file builder).
 */
export async function createTestCaseWithLender(
	request: APIRequestContext,
	overrides: {
		label?: string;
		loan_type?: string;
		amount_required?: number;
		lender_name?: string;
	} = {}
): Promise<{ case_id: string; lender_application_id: string; label: string }> {
	const { case_id, label } = await createTestCase(request, overrides);
	const lenderName = overrides.lender_name || 'HDFC Bank';
	const { lender_application_id } = await addLenderApplication(request, case_id, lenderName);
	return { case_id, lender_application_id, label };
}

// ── Add a lender application to a case via API ──────────────
export async function addLenderApplication(
	request: APIRequestContext,
	caseId: string,
	lenderName: string,
	lenderId?: string
): Promise<{ lender_application_id: string }> {
	const res = await request.post(`/api/cases/${caseId}/lender-applications`, {
		data: {
			lender_id: lenderId || lenderName.toLowerCase().replace(/\s+/g, '_'),
			lender_name: lenderName
		}
	});

	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.success).toBe(true);
	return { lender_application_id: body.data.lender_application_id };
}

// ── Navigate to case detail ─────────────────────────────────
export async function navigateToCaseDetail(page: Page, caseId: string): Promise<void> {
	await page.goto(`${DASHBOARD_ROUTES.CASES}/${caseId}`);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
}

// ── Change case stage via API ───────────────────────────────
export async function changeCaseStageViaApi(
	request: APIRequestContext,
	caseId: string,
	stage: string
): Promise<void> {
	const res = await request.patch(`/api/cases/${caseId}/stage`, {
		data: { stage }
	});

	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.success).toBe(true);
}

// ── Get case data via API ───────────────────────────────────
export async function getCaseViaApi(request: APIRequestContext, caseId: string): Promise<any> {
	const res = await request.get(`/api/cases/${caseId}`);
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.success).toBe(true);
	return body.data;
}

// ── Get timeline events via API ─────────────────────────────
export async function getTimelineViaApi(
	request: APIRequestContext,
	caseId: string
): Promise<any[]> {
	const res = await request.get(`/api/cases/${caseId}/timeline`);
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.success).toBe(true);
	return body.data.events;
}

// ── Cleanup: archive a test case ────────────────────────────
export async function archiveTestCase(request: APIRequestContext, caseId: string): Promise<void> {
	await request.delete(`/api/cases/${caseId}`);
}
