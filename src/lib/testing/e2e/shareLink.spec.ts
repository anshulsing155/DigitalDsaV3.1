/**
 * Share Link — E2E Tests
 *
 * Tests share link creation (DSA auth), validation (public), and error handling.
 * Runs under the `dsa` project since DSAs create share links.
 */
import { test, expect } from '@playwright/test';

test.describe('Share Link — API', () => {
	// We need a case to create a share link, so we'll create one first
	let caseId: string;
	let shareToken: string;

	test.beforeAll(async ({ request }) => {
		// Create a test case
		const caseRes = await request.post('/api/cases', {
			data: {
				label: `E2E Share Link Test ${Date.now()}`,
				loan: { type: 'Home Loan', amount_required: 5000000 }
			}
		});

		if (caseRes.ok()) {
			const caseBody = await caseRes.json();
			if (caseBody.success) {
				caseId = caseBody.data.case_id;
			}
		}
	});

	test('creates share link via API', async ({ request }) => {
		test.skip(!caseId, 'No test case available');

		const res = await request.post('/api/share-link/create', {
			data: {
				applicationId: caseId,
				applicantIndex: 0,
				sections: ['income'],
				customTitle: 'E2E Test Share Link',
				requiresOtp: false,
				expiryHours: 24,
				maxUses: 5
			}
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.token).toBeTruthy();
		shareToken = body.token;
	});

	test('validates share link token', async ({ request }) => {
		test.skip(!shareToken, 'No share token available');

		const res = await request.post('/api/share-link/validate', {
			data: { token: shareToken }
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.valid).toBe(true);
		expect(body.link).toBeTruthy();
		expect(body.link.customTitle).toBe('E2E Test Share Link');
	});

	test('rejects invalid share link token', async ({ request }) => {
		const res = await request.post('/api/share-link/validate', {
			data: { token: 'non-existent-token-12345' }
		});

		const body = await res.json();
		// Should either return 404 or { valid: false }
		expect(body.valid === false || !res.ok()).toBeTruthy();
	});

	test.afterAll(async ({ request }) => {
		// Cleanup: archive the test case
		if (caseId) {
			await request.delete(`/api/cases/${caseId}`).catch(() => {});
		}
	});
});

test.describe('Share Link — Public Page', () => {
	let shareToken: string;
	let caseId: string;

	test.beforeAll(async ({ request }) => {
		// Create case + share link
		const caseRes = await request.post('/api/cases', {
			data: {
				label: `E2E Share Page Test ${Date.now()}`,
				loan: { type: 'Home Loan', amount_required: 5000000 }
			}
		});

		if (caseRes.ok()) {
			const caseBody = await caseRes.json();
			if (caseBody.success) {
				caseId = caseBody.data.case_id;

				const linkRes = await request.post('/api/share-link/create', {
					data: {
						applicationId: caseId,
						applicantIndex: 0,
						sections: ['income'],
						customTitle: 'E2E Public Test',
						requiresOtp: false,
						expiryHours: 24,
						maxUses: 10
					}
				});

				if (linkRes.ok()) {
					const linkBody = await linkRes.json();
					if (linkBody.success) {
						shareToken = linkBody.token;
					}
				}
			}
		}
	});

	test('public share page loads with valid token', async ({ page }) => {
		test.skip(!shareToken, 'No share token available');

		await page.goto(`/f/${shareToken}`);
		await page.waitForLoadState('networkidle');

		// Should show the share link page (not an error)
		const content = page.locator('main, [class*="share"], h1, h2, form').first();
		await expect(content).toBeVisible({ timeout: 15000 });

		// Should NOT show PII fields
		const piiField = page.locator(
			'input[name*="pan" i], input[name*="aadhaar" i], input[name*="address" i]'
		);
		const piiCount = await piiField.count();
		expect(piiCount).toBe(0);
	});

	test('public share page shows error for invalid token', async ({ page }) => {
		await page.goto('/f/invalid-token-xyz');
		await page.waitForLoadState('networkidle');

		// Should show error or invalid message
		const errorContent = page
			.locator('text=invalid, text=expired, text=not found, text=error, text=link')
			.first();
		await expect(errorContent).toBeVisible({ timeout: 15000 });
	});

	test.afterAll(async ({ request }) => {
		if (caseId) {
			await request.delete(`/api/cases/${caseId}`).catch(() => {});
		}
	});
});
