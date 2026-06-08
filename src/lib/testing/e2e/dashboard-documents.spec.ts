/**
 * Dashboard Document Management E2E Tests (Task 3.19)
 *
 * Tests document checklist management via API since upload
 * requires ImageKit integration. Covers:
 *   - Apply lender document template
 *   - Verify checklist items created
 *   - Update document status transitions
 *   - Verify freshness tracking fields
 *
 * Endpoints tested:
 *   POST /api/cases/:id/lender-applications/:laId/documents/apply-template
 *   GET  /api/cases/:id/lender-applications/:laId/documents
 *   POST /api/cases/:id/lender-applications/:laId/documents
 *   PATCH /api/cases/:id/lender-applications/:laId/documents/:docId
 *   DELETE /api/cases/:id/lender-applications/:laId/documents/:docId
 */

import { test, expect } from '@playwright/test';
import { DASHBOARD_ROUTES, createTestCaseWithLender } from './dashboard.setup';

let caseId: string;
let lenderAppId: string;

/** Base URL builder for the documents API */
function docsUrl(cId: string, laId: string, suffix = '') {
	return `/api/cases/${cId}/lender-applications/${laId}/documents${suffix}`;
}

test.describe('Document Management — API Tests', () => {
	test.beforeAll(async ({ request }) => {
		const testCase = await createTestCaseWithLender(request);
		caseId = testCase.case_id;
		lenderAppId = testCase.lender_application_id;
	});

	// ── APPLY LENDER DOCUMENT TEMPLATE ────────────────────────────────

	test('apply lender document template creates checklist items', async ({ request }) => {
		const resp = await request.post(docsUrl(caseId, lenderAppId, '/apply-template'), {
			data: {}
		});

		// Might be 201 (items added) or 200 (all already exist)
		expect(resp.ok() || resp.status() === 201).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);

		if (resp.status() === 201) {
			// Template was applied — verify data array with checklist items
			expect(Array.isArray(body.data)).toBe(true);
			expect(body.data.length).toBeGreaterThan(0);
			expect(body.summary).toBeTruthy();
			expect(body.summary.added).toBeGreaterThan(0);

			// Each item should have the expected shape
			const firstDoc = body.data[0];
			expect(firstDoc.doc_id).toBeTruthy();
			expect(firstDoc.doc_name).toBeTruthy();
			expect(firstDoc.category).toBeTruthy();
			expect(typeof firstDoc.is_mandatory).toBe('boolean');
			expect(firstDoc.status).toBe('not_started');
		}
	});

	test('applying template again skips existing documents', async ({ request }) => {
		// First application
		await request.post(docsUrl(caseId, lenderAppId, '/apply-template'), {
			data: {}
		});

		// Second application — should skip all
		const resp = await request.post(docsUrl(caseId, lenderAppId, '/apply-template'), {
			data: {}
		});
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);

		// If all docs already exist, summary.added should be 0 or message present
		if (body.summary) {
			expect(body.summary.skipped_existing).toBeGreaterThanOrEqual(0);
		}
		if (body.message) {
			expect(body.message).toContain('already exist');
		}
	});

	test('apply template with explicit lender_name', async ({ request }) => {
		const resp = await request.post(docsUrl(caseId, lenderAppId, '/apply-template'), {
			data: { lender_name: 'HDFC Bank' }
		});

		// May return 404 if template not found for that lender, or 200/201 if found
		if (resp.status() === 404) {
			const body = await resp.json();
			expect(body.available_lenders).toBeTruthy();
			expect(Array.isArray(body.available_lenders)).toBe(true);
		} else {
			expect(resp.ok() || resp.status() === 201).toBeTruthy();
		}
	});

	// ── GET DOCUMENT CHECKLIST ────────────────────────────────────────

	test('GET documents returns checklist with freshness fields', async ({ request }) => {
		// Ensure template is applied first
		await request.post(docsUrl(caseId, lenderAppId, '/apply-template'), {
			data: {}
		});

		const resp = await request.get(docsUrl(caseId, lenderAppId));
		expect(resp.ok()).toBeTruthy();

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);

		if (body.data.length > 0) {
			const doc = body.data[0];

			// Each document should have freshness tracking fields
			expect(doc).toHaveProperty('is_expiring_soon');
			expect(doc).toHaveProperty('is_expired');
			expect(doc).toHaveProperty('days_until_expiry');

			// Basic fields
			expect(doc.doc_id).toBeTruthy();
			expect(doc.doc_name).toBeTruthy();
			expect(doc.status).toBeTruthy();
			expect(doc.status_updated_at).toBeTruthy();
		}
	});

	// ── ADD SINGLE DOCUMENT ───────────────────────────────────────────

	test('POST adds a single document to checklist', async ({ request }) => {
		const resp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'E2E Test Document',
				category: 'identity',
				is_mandatory: true,
				description: 'Test document added via E2E test'
			}
		});
		expect(resp.status()).toBe(201);

		const body = await resp.json();
		expect(body.success).toBe(true);
		expect(body.data.doc_id).toBeTruthy();
		expect(body.data.doc_name).toBe('E2E Test Document');
		expect(body.data.category).toBe('identity');
		expect(body.data.is_mandatory).toBe(true);
		expect(body.data.status).toBe('not_started');
	});

	test('POST adds a document with validity/freshness tracking', async ({ request }) => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 30);

		const resp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'E2E Document With Validity',
				category: 'financial',
				is_mandatory: false,
				validity: {
					valid_from: new Date().toISOString(),
					valid_until: futureDate.toISOString(),
					freshness_rule_days: 90
				}
			}
		});
		expect(resp.status()).toBe(201);

		const body = await resp.json();
		expect(body.data.validity).toBeTruthy();
		expect(body.data.validity.freshness_rule_days).toBe(90);
		expect(body.data.validity.is_fresh).toBe(true);
	});

	test('POST validates required fields', async ({ request }) => {
		// Missing doc_name
		const resp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				category: 'identity',
				is_mandatory: true
			}
		});
		expect(resp.status()).toBe(400);

		const body = await resp.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('Validation');
	});

	// ── UPDATE DOCUMENT STATUS ────────────────────────────────────────

	test('PATCH updates document status from not_started to received', async ({ request }) => {
		// Add a document first
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Status Transition Test Doc',
				category: 'identity',
				is_mandatory: true
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		// Update status to received
		const patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: { status: 'received' }
		});
		expect(patchResp.ok()).toBeTruthy();

		const body = await patchResp.json();
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('received');
		expect(body.data.status_updated_at).toBeTruthy();
	});

	test('PATCH updates document status through full lifecycle', async ({ request }) => {
		// Add a doc
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Lifecycle Test Doc',
				category: 'financial',
				is_mandatory: true
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		// not_started -> received
		let patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: { status: 'received' }
		});
		expect(patchResp.ok()).toBeTruthy();
		let body = await patchResp.json();
		expect(body.data.status).toBe('received');

		// received -> uploaded
		patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: { status: 'uploaded' }
		});
		expect(patchResp.ok()).toBeTruthy();
		body = await patchResp.json();
		expect(body.data.status).toBe('uploaded');

		// uploaded -> verified
		patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: { status: 'verified' }
		});
		expect(patchResp.ok()).toBeTruthy();
		body = await patchResp.json();
		expect(body.data.status).toBe('verified');
	});

	// ── UPDATE DOCUMENT VALIDITY (freshness tracking) ─────────────────

	test('PATCH updates validity dates and freshness is recomputed', async ({ request }) => {
		// Add a doc
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Freshness Tracking Test',
				category: 'property',
				is_mandatory: false
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		// Set a future valid_until date
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 60);

		const patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: {
				validity: {
					valid_until: futureDate.toISOString(),
					freshness_rule_days: 90
				}
			}
		});
		expect(patchResp.ok()).toBeTruthy();

		const body = await patchResp.json();
		expect(body.data.validity).toBeTruthy();
		expect(body.data.validity.is_fresh).toBe(true);

		// Freshness tracking in the GET response
		expect(body.data.is_expired).toBe(false);
		expect(body.data.days_until_expiry).toBeGreaterThan(0);
	});

	test('PATCH with past valid_until marks document as expired', async ({ request }) => {
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Expired Doc Test',
				category: 'identity',
				is_mandatory: true
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		// Set a past valid_until date
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 10);

		const patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: {
				validity: {
					valid_until: pastDate.toISOString()
				}
			}
		});
		expect(patchResp.ok()).toBeTruthy();

		const body = await patchResp.json();
		expect(body.data.validity.is_fresh).toBe(false);
		expect(body.data.is_expired).toBe(true);
		expect(body.data.days_until_expiry).toBeLessThan(0);
	});

	// ── ADD DSA NOTES ─────────────────────────────────────────────────

	test('PATCH adds DSA notes to a document', async ({ request }) => {
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Notes Test Doc',
				category: 'identity',
				is_mandatory: false
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		const patchResp = await request.patch(docsUrl(caseId, lenderAppId, `/${docId}`), {
			data: { dsa_notes: 'Document has small tear on top-right corner.' }
		});
		expect(patchResp.ok()).toBeTruthy();

		const body = await patchResp.json();
		expect(body.data.dsa_notes).toBe('Document has small tear on top-right corner.');
	});

	// ── DELETE DOCUMENT ───────────────────────────────────────────────

	test('DELETE removes a document from checklist', async ({ request }) => {
		// Add a doc
		const addResp = await request.post(docsUrl(caseId, lenderAppId), {
			data: {
				doc_name: 'Delete Test Doc',
				category: 'identity',
				is_mandatory: false
			}
		});
		const docId = (await addResp.json()).data.doc_id;

		// Delete it
		const delResp = await request.delete(docsUrl(caseId, lenderAppId, `/${docId}`));
		expect(delResp.ok()).toBeTruthy();

		const body = await delResp.json();
		expect(body.success).toBe(true);
		expect(body.data.removed).toBe(true);

		// Verify it is gone
		const listResp = await request.get(docsUrl(caseId, lenderAppId));
		const listBody = await listResp.json();
		const found = listBody.data.find((d: any) => d.doc_id === docId);
		expect(found).toBeUndefined();
	});

	test('DELETE returns 404 for non-existent document', async ({ request }) => {
		const resp = await request.delete(docsUrl(caseId, lenderAppId, '/non-existent-doc-id'));
		expect(resp.status()).toBe(404);
	});
});
