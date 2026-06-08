/**
 * Dashboard Queries E2E Tests (Task 2.19)
 *
 * Tests the query workflow for lender applications:
 * - Adding a query to a lender application
 * - Responding to a query
 * - Resolving a query
 * - Verifying query status transitions
 * - Verifying timeline events for query actions
 */

import { test, expect } from '@playwright/test';
import {
	DASHBOARD_ROUTES,
	createTestCase,
	addLenderApplication,
	navigateToCaseDetail,
	getTimelineViaApi,
	archiveTestCase
} from './dashboard.setup';

// ============================================================================
// QUERY LIFECYCLE VIA API
// ============================================================================

test.describe.serial('Query Workflow - Full Lifecycle via API', () => {
	let testCaseId: string;
	let lenderAppId: string;
	let queryId: string;

	test.beforeAll(async ({ request }) => {
		// Create a case with a lender application
		const { case_id } = await createTestCase(request, {
			label: `E2E Queries ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});
		testCaseId = case_id;

		const lender = await addLenderApplication(request, case_id, 'HDFC Bank', 'hdfc_bank');
		lenderAppId = lender.lender_application_id;
	});

	test('creates a new query on a lender application', async ({ request }) => {
		const res = await request.post(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_text: 'Please provide latest 3 months bank statements',
					category: 'document',
					deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				}
			}
		);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.query_id).toBeTruthy();
		expect(body.data.query_text).toBe('Please provide latest 3 months bank statements');
		expect(body.data.category).toBe('document');
		expect(body.data.status).toBe('open');
		expect(body.data.days_open).toBe(0);

		queryId = body.data.query_id;
	});

	test('query appears in GET queries list with correct status', async ({ request }) => {
		const res = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThanOrEqual(1);

		const query = body.data.find((q: any) => q.query_id === queryId);
		expect(query).toBeTruthy();
		expect(query.status).toBe('open');
		expect(query.query_text).toBe('Please provide latest 3 months bank statements');
	});

	test('timeline records query_raised event', async ({ request }) => {
		const events = await getTimelineViaApi(request, testCaseId);
		const queryEvent = events.find(
			(e: any) => e.event_type === 'query_raised' && e.metadata?.query_id === queryId
		);

		expect(queryEvent).toBeTruthy();
		expect(queryEvent.description).toContain('HDFC Bank');
		expect(queryEvent.metadata.category).toBe('document');
	});

	test('responds to the query with response text', async ({ request }) => {
		const res = await request.patch(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_id: queryId,
					action: 'respond',
					response_text: 'Bank statements uploaded for Jan-Mar 2026'
				}
			}
		);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('responded');
		expect(body.data.response).toBeTruthy();
		expect(body.data.response.text).toBe('Bank statements uploaded for Jan-Mar 2026');
		expect(body.data.response.responded_at).toBeTruthy();
	});

	test('query status is "responded" in GET list after responding', async ({ request }) => {
		const res = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);

		const body = await res.json();
		const query = body.data.find((q: any) => q.query_id === queryId);
		expect(query.status).toBe('responded');
	});

	test('timeline records query_responded event', async ({ request }) => {
		const events = await getTimelineViaApi(request, testCaseId);
		const respondEvent = events.find(
			(e: any) => e.event_type === 'query_responded' && e.metadata?.query_id === queryId
		);

		expect(respondEvent).toBeTruthy();
		expect(respondEvent.description).toContain('HDFC Bank');
	});

	test('resolves the query', async ({ request }) => {
		const res = await request.patch(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_id: queryId,
					action: 'resolve'
				}
			}
		);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('resolved');
	});

	test('query status is "resolved" in GET list after resolving', async ({ request }) => {
		const res = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);

		const body = await res.json();
		const query = body.data.find((q: any) => q.query_id === queryId);
		expect(query.status).toBe('resolved');
	});

	test('timeline records query_resolved event', async ({ request }) => {
		const events = await getTimelineViaApi(request, testCaseId);
		const resolveEvent = events.find(
			(e: any) => e.event_type === 'query_resolved' && e.metadata?.query_id === queryId
		);

		expect(resolveEvent).toBeTruthy();
		expect(resolveEvent.description).toContain('HDFC Bank');
	});

	test('cannot respond to an already resolved query', async ({ request }) => {
		const res = await request.patch(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_id: queryId,
					action: 'respond',
					response_text: 'Trying to respond again'
				}
			}
		);

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('resolved');
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// QUERY CATEGORIES & VALIDATION
// ============================================================================

test.describe('Query Workflow - Categories & Validation', () => {
	let testCaseId: string;
	let lenderAppId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E QueryCategories ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 4000000
		});
		testCaseId = case_id;

		const lender = await addLenderApplication(request, case_id, 'SBI', 'sbi');
		lenderAppId = lender.lender_application_id;
	});

	test('creates queries with different categories', async ({ request }) => {
		const categories = [
			'document',
			'clarification',
			'additional_info',
			'technical',
			'legal',
			'other'
		];

		for (const category of categories) {
			const res = await request.post(
				`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
				{
					data: {
						query_text: `Test query for category: ${category}`,
						category
					}
				}
			);

			expect(res.ok()).toBeTruthy();
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.data.category).toBe(category);
		}

		// Verify all queries exist
		const listRes = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);
		const listBody = await listRes.json();
		expect(listBody.data.length).toBe(6);
	});

	test('rejects query creation with empty query_text', async ({ request }) => {
		const res = await request.post(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_text: '',
					category: 'document'
				}
			}
		);

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	test('rejects query creation with invalid category', async ({ request }) => {
		const res = await request.post(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_text: 'Some query',
					category: 'invalid_category'
				}
			}
		);

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// QUERY DISPLAY IN CASE DETAIL UI
// ============================================================================

test.describe.serial('Query Workflow - UI Display', () => {
	let testCaseId: string;
	let lenderAppId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E QueryUI ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 6000000
		});
		testCaseId = case_id;

		const lender = await addLenderApplication(request, case_id, 'ICICI Bank', 'icici_bank');
		lenderAppId = lender.lender_application_id;

		// Add an open query
		await request.post(`/api/cases/${case_id}/lender-applications/${lenderAppId}/queries`, {
			data: {
				query_text: 'Please provide ITR for last 2 years',
				category: 'document'
			}
		});
	});

	test('case detail overview shows open query count on lender card', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		// The LenderApplicationCard shows open queries indicator
		// Look for the "1 open query" or "1 query" text
		const queryIndicator = page.locator('text=/\\d+ open quer/');
		await expect(queryIndicator.first()).toBeVisible({ timeout: 10000 });
	});

	test('case card in list page shows query badge when queries exist', async ({ page }) => {
		await page.goto(DASHBOARD_ROUTES.CASES);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Find the case card for our test case
		const card = page.locator(`a[href="/dashboard/dsa/cases/${testCaseId}"]`);
		const exists = await card.count();

		if (exists > 0) {
			// The card should show the query count badge
			const queryBadge = card.locator('text=/\\d+ quer/');
			await expect(queryBadge.first()).toBeVisible({ timeout: 5000 });
		}
	});

	test('queries tab link is present in case detail', async ({ page }) => {
		await navigateToCaseDetail(page, testCaseId);

		const queriesTab = page.locator('a:has-text("Queries")');
		await expect(queriesTab).toBeVisible();

		// Verify it has the correct href
		const href = await queriesTab.getAttribute('href');
		expect(href).toContain(`/dashboard/dsa/cases/${testCaseId}/queries`);
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// MULTIPLE QUERIES ON THE SAME LENDER
// ============================================================================

test.describe('Query Workflow - Multiple Queries', () => {
	let testCaseId: string;
	let lenderAppId: string;

	test.beforeAll(async ({ request }) => {
		const { case_id } = await createTestCase(request, {
			label: `E2E MultiQuery ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5500000
		});
		testCaseId = case_id;

		const lender = await addLenderApplication(request, case_id, 'Axis Bank', 'axis_bank');
		lenderAppId = lender.lender_application_id;
	});

	test('can raise multiple queries on the same lender application', async ({ request }) => {
		// Raise 3 queries
		const queries = [
			{ query_text: 'Bank statement missing', category: 'document' as const },
			{ query_text: 'Clarify employment type', category: 'clarification' as const },
			{ query_text: 'Property valuation report needed', category: 'additional_info' as const }
		];

		for (const q of queries) {
			const res = await request.post(
				`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
				{ data: q }
			);
			expect(res.ok()).toBeTruthy();
		}

		// Verify all 3 queries exist
		const listRes = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);
		const body = await listRes.json();
		expect(body.data.length).toBe(3);

		// All should be "open"
		const allOpen = body.data.every((q: any) => q.status === 'open');
		expect(allOpen).toBe(true);
	});

	test('resolving one query does not affect others', async ({ request }) => {
		// Get all queries
		const listRes = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);
		const queries = (await listRes.json()).data;

		// Resolve the first one
		const firstQueryId = queries[0].query_id;
		const resolveRes = await request.patch(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`,
			{
				data: {
					query_id: firstQueryId,
					action: 'resolve'
				}
			}
		);
		expect(resolveRes.ok()).toBeTruthy();

		// Re-fetch and verify only the first one is resolved
		const updatedRes = await request.get(
			`/api/cases/${testCaseId}/lender-applications/${lenderAppId}/queries`
		);
		const updatedQueries = (await updatedRes.json()).data;

		const resolved = updatedQueries.filter((q: any) => q.status === 'resolved');
		const open = updatedQueries.filter((q: any) => q.status === 'open');

		expect(resolved.length).toBe(1);
		expect(open.length).toBe(2);
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});
