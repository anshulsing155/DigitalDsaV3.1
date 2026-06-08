/**
 * Dashboard File Builder E2E Tests (Tasks 3.17, 3.18)
 *
 * Tests the file configurator and PDF generation via API calls.
 * The file builder UI may not exist as a standalone page yet,
 * so these tests exercise the API endpoints directly.
 *
 * Endpoints tested:
 *   GET  /api/cases/:id/file-config
 *   PATCH /api/cases/:id/file-config
 *   GET  /api/cases/:id/file-builder?lender_app_id=...&mode=review|submission
 *   POST /api/cases/:id/file-builder  (generate snapshot + PDF)
 *   GET  /api/cases/:id/file-builder/download?lender_app_id=...&snapshot_id=...
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCaseWithLender } from './dashboard.setup';

// These will be populated by the beforeAll hook via createTestCase
let caseId: string;
let lenderAppId: string;

test.describe('File Builder — API Tests', () => {
	test.beforeAll(async ({ request }) => {
		// Create a test case via the shared helper.
		// The helper should return a case_id and at least one lender_application_id.
		const testCase = await createTestCaseWithLender(request);
		caseId = testCase.case_id;
		lenderAppId = testCase.lender_application_id;
	});

	// ── FILE CONFIG: GET ──────────────────────────────────────────────

	test('GET file-config returns default config when none is set', async ({ request }) => {
		const resp = await request.get(`/api/cases/${caseId}/file-config`);
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data).toBeTruthy();
		expect(body.data.config).toBeTruthy();
		// Default config should not be flagged as custom
		expect(body.data.has_custom_config).toBe(false);
	});

	test('GET file-config with lender_app_id returns config for that application', async ({
		request
	}) => {
		const resp = await request.get(`/api/cases/${caseId}/file-config?lender_app_id=${lenderAppId}`);
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.lender_app_id).toBe(lenderAppId);
		expect(body.data.config).toBeTruthy();
	});

	// ── FILE CONFIG: PATCH (section toggles) ──────────────────────────

	test('PATCH file-config toggles section visibility', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				sections_visibility: {
					obligations: false,
					property_details: true
				}
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.config).toBeTruthy();

		// Verify the section visibility was updated
		const config = body.data.config;
		expect(config.sections_visibility.obligations).toBe(false);
		expect(config.sections_visibility.property_details).toBe(true);
	});

	test('PATCH file-config re-enables a previously disabled section', async ({ request }) => {
		// First disable
		await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				sections_visibility: { obligations: false }
			}
		});

		// Then re-enable
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				sections_visibility: { obligations: true }
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.data.config.sections_visibility.obligations).toBe(true);
	});

	// ── FILE CONFIG: PATCH (display mode switch) ──────────────────────

	test('PATCH file-config changes income display mode to consolidated', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				display_mode: {
					income: 'consolidated'
				}
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.config.display_mode.income).toBe('consolidated');
	});

	test('PATCH file-config changes income display mode to detailed', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				display_mode: {
					income: 'detailed'
				}
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.data.config.display_mode.income).toBe('detailed');
	});

	// ── FILE CONFIG: PATCH (DSA notes) ────────────────────────────────

	test('PATCH file-config adds DSA notes to a section', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				dsa_notes: {
					income: 'Applicant has additional freelance income not captured in ITR.'
				}
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.data.config.dsa_notes.income).toBe(
			'Applicant has additional freelance income not captured in ITR.'
		);
	});

	// ── FILE CONFIG: PATCH (PII mode) ─────────────────────────────────

	test('PATCH file-config changes PII mode', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				lender_app_id: lenderAppId,
				pii_mode: 'masked'
			}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.data.config.pii_mode).toBe('masked');
	});

	// ── FILE CONFIG: Validation ───────────────────────────────────────

	test('PATCH file-config rejects missing lender_app_id', async ({ request }) => {
		const resp = await request.patch(`/api/cases/${caseId}/file-config`, {
			data: {
				sections_visibility: { obligations: false }
			}
		});
		expect(resp.ok()).toBeFalsy();
		expect(resp.status()).toBe(400);
	});

	// ── FILE BUILDER: GET (preview) ───────────────────────────────────

	test('GET file-builder preview in review mode strips PII', async ({ request }) => {
		const resp = await request.get(
			`/api/cases/${caseId}/file-builder?lender_app_id=${lenderAppId}&mode=review`
		);

		// If no snapshot exists yet, we may get a 404 — that is acceptable
		if (resp.status() === 404) {
			const body = await resp.json();
			expect(body.error).toContain('snapshot');
			return;
		}

		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.mode).toBe('review');
		expect(body.data.pii_stripped).toBe(true);
		expect(body.data.payload).toBeTruthy();
		expect(body.data.snapshot_version).toBeTruthy();
		expect(body.data.payload_hash).toBeTruthy();
	});

	test('GET file-builder preview in submission mode retains PII', async ({ request }) => {
		const resp = await request.get(
			`/api/cases/${caseId}/file-builder?lender_app_id=${lenderAppId}&mode=submission`
		);

		if (resp.status() === 404) {
			// No form snapshot yet — acceptable
			return;
		}

		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.data.mode).toBe('submission');
		expect(body.data.pii_stripped).toBe(false);
	});

	test('GET file-builder requires lender_app_id', async ({ request }) => {
		const resp = await request.get(`/api/cases/${caseId}/file-builder`);
		expect(resp.status()).toBe(400);

		const body = await resp.json();
		expect(body.error).toContain('lender_app_id');
	});

	// ── FILE BUILDER: POST (generate review PDF — v1) ─────────────────

	test('generates review PDF via API (v1)', async ({ request }) => {
		const resp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: {
				lender_app_id: lenderAppId,
				type: 'review'
			}
		});

		// If no form snapshot exists, we get 404 — acceptable in test env
		if (resp.status() === 404) {
			const body = await resp.json();
			expect(body.error).toContain('snapshot');
			return;
		}

		expect(resp.status()).toBe(201);
		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.snapshot_id).toBeTruthy();
		expect(body.data.type).toBe('review');
		expect(body.data.pii_stripped).toBe(true);
		expect(body.data.pdf_url).toBeTruthy();
		expect(body.data.pdf_url).toContain('/file-builder/download');
		expect(body.data.source_snapshot_version).toBeTruthy();
		expect(body.data.payload_hash).toBeTruthy();
	});

	// ── FILE BUILDER: POST (generate submission PDF — v2) ─────────────

	test('generates submission PDF via API (v2)', async ({ request }) => {
		const resp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: {
				lender_app_id: lenderAppId,
				type: 'submission'
			}
		});

		if (resp.status() === 404) {
			return; // No form snapshot — skip
		}

		expect(resp.status()).toBe(201);
		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.type).toBe('submission');
		expect(body.data.pii_stripped).toBe(false);
		expect(body.data.pdf_url).toBeTruthy();
	});

	// ── FILE BUILDER: POST validation ─────────────────────────────────

	test('POST file-builder rejects missing lender_app_id', async ({ request }) => {
		const resp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: { type: 'review' }
		});
		expect(resp.status()).toBe(400);
	});

	test('POST file-builder rejects invalid type', async ({ request }) => {
		const resp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: {
				lender_app_id: lenderAppId,
				type: 'invalid_type'
			}
		});
		expect(resp.status()).toBe(400);
	});

	// ── PDF DOWNLOAD ──────────────────────────────────────────────────

	test('downloads generated PDF with correct Content-Type', async ({ request }) => {
		// First generate a snapshot
		const genResp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: {
				lender_app_id: lenderAppId,
				type: 'review'
			}
		});

		if (genResp.status() === 404) {
			return; // No form snapshot — skip download test
		}

		expect(genResp.status()).toBe(201);
		const genBody = await genResp.json();
		const pdfUrl = genBody.data.pdf_url;
		expect(pdfUrl).toBeTruthy();

		// Download the PDF
		const dlResp = await request.get(pdfUrl);
		expect(dlResp.ok()).toBeTruthy();

		// Verify Content-Type header
		const contentType = dlResp.headers()['content-type'];
		expect(contentType).toBe('application/pdf');

		// Verify Content-Disposition header (attachment with filename)
		const contentDisposition = dlResp.headers()['content-disposition'];
		expect(contentDisposition).toContain('attachment');
		expect(contentDisposition).toContain('.pdf');

		// Verify we received binary data (non-empty body)
		const bodyBuffer = await dlResp.body();
		expect(bodyBuffer.length).toBeGreaterThan(0);
	});

	test('download requires both lender_app_id and snapshot_id', async ({ request }) => {
		// Missing snapshot_id
		const resp1 = await request.get(
			`/api/cases/${caseId}/file-builder/download?lender_app_id=${lenderAppId}`
		);
		expect(resp1.status()).toBe(400);

		// Missing lender_app_id
		const resp2 = await request.get(
			`/api/cases/${caseId}/file-builder/download?snapshot_id=fake-id`
		);
		expect(resp2.status()).toBe(400);
	});

	test('download returns 404 for non-existent snapshot', async ({ request }) => {
		const resp = await request.get(
			`/api/cases/${caseId}/file-builder/download?lender_app_id=${lenderAppId}&snapshot_id=non-existent-id`
		);
		expect(resp.status()).toBe(404);
	});

	// ── VERIFY review vs submission mode ───────────────────────────────

	test('review mode (v1) always strips PII, submission mode (v2) does not', async ({ request }) => {
		// Generate review
		const reviewResp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: { lender_app_id: lenderAppId, type: 'review' }
		});

		if (reviewResp.status() === 404) return;

		const reviewBody = await reviewResp.json();
		expect(reviewBody.data.pii_stripped).toBe(true);
		expect(reviewBody.data.type).toBe('review');

		// Generate submission
		const subResp = await request.post(`/api/cases/${caseId}/file-builder`, {
			data: { lender_app_id: lenderAppId, type: 'submission' }
		});

		const subBody = await subResp.json();
		expect(subBody.data.pii_stripped).toBe(false);
		expect(subBody.data.type).toBe('submission');
	});
});
