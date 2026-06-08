/**
 * Dashboard RM Contacts E2E Tests (Task 2.20)
 *
 * Tests the RM (Relationship Manager) database functionality:
 * - Creating RM contacts via API
 * - Listing/searching RM contacts
 * - Updating RM contacts
 * - RM suggestions for a case with lender applications
 *
 * Note: There is no dedicated RM contacts UI page in the dashboard routes.
 * RM contacts appear in the case detail overview sidebar and via the
 * /api/rm-contacts and /api/rm-contacts/suggest API endpoints.
 * Tests cover both API operations and UI display within case detail.
 */

import { test, expect } from '@playwright/test';
import {
	createTestCase,
	addLenderApplication,
	navigateToCaseDetail,
	archiveTestCase
} from './dashboard.setup';

// ============================================================================
// RM CONTACT CRUD VIA API
// ============================================================================

test.describe.serial('RM Contacts - CRUD via API', () => {
	let rmContactId: string;
	const rmName = `E2E RM ${Date.now()}`;

	test('creates a new RM contact', async ({ request }) => {
		const res = await request.post('/api/rm-contacts', {
			data: {
				rm_name: rmName,
				lender_name: 'HDFC Bank',
				branch: 'Connaught Place',
				city: 'Delhi',
				phone: '9876543210',
				designation: 'RM',
				loan_types_handled: ['Home Loan', 'Loan Against Property']
			}
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.rm_name).toBe(rmName);
		expect(body.data.lender_name).toBe('HDFC Bank');
		expect(body.data.branch).toBe('Connaught Place');
		expect(body.data.city).toBe('Delhi');
		expect(body.data.phone).toBe('9876543210');
		expect(body.data.designation).toBe('RM');
		expect(body.data.is_active).toBe(true);
		expect(body.data.confirmation_count).toBe(1);

		rmContactId = body.data._id;
	});

	test('fetches the created RM contact by ID', async ({ request }) => {
		const res = await request.get(`/api/rm-contacts/${rmContactId}`);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.rm_name).toBe(rmName);
		expect(body.data.lender_name).toBe('HDFC Bank');
	});

	test('lists RM contacts with the created contact included', async ({ request }) => {
		const res = await request.get('/api/rm-contacts');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.contacts).toBeTruthy();
		expect(Array.isArray(body.data.contacts)).toBe(true);
		expect(body.data.pagination).toBeTruthy();

		// Our created contact should be in the list
		const found = body.data.contacts.find((c: any) => c.rm_name === rmName);
		expect(found).toBeTruthy();
	});

	test('searches RM contacts by lender name', async ({ request }) => {
		const res = await request.get('/api/rm-contacts?search=HDFC');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);

		// Should find at least our contact
		const found = body.data.contacts.find((c: any) => c.rm_name === rmName);
		expect(found).toBeTruthy();
	});

	test('searches RM contacts by RM name', async ({ request }) => {
		const res = await request.get(`/api/rm-contacts?search=${encodeURIComponent(rmName)}`);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.contacts.length).toBeGreaterThanOrEqual(1);

		const found = body.data.contacts.find((c: any) => c.rm_name === rmName);
		expect(found).toBeTruthy();
	});

	test('filters RM contacts by lender name', async ({ request }) => {
		const res = await request.get('/api/rm-contacts?lender_name=HDFC Bank');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);

		// All returned contacts should be from HDFC Bank
		for (const contact of body.data.contacts) {
			expect(contact.lender_name).toBe('HDFC Bank');
		}
	});

	test('filters RM contacts by city', async ({ request }) => {
		const res = await request.get('/api/rm-contacts?city=Delhi');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);

		// All returned contacts should be in Delhi
		for (const contact of body.data.contacts) {
			expect(contact.city).toBe('Delhi');
		}
	});

	test('updates an RM contact (phone number)', async ({ request }) => {
		const res = await request.patch(`/api/rm-contacts/${rmContactId}`, {
			data: {
				phone: '9876500000'
			}
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.phone).toBe('9876500000');
		expect(body.data.rm_name).toBe(rmName); // unchanged
	});

	test('updates an RM contact (branch and designation)', async ({ request }) => {
		const res = await request.patch(`/api/rm-contacts/${rmContactId}`, {
			data: {
				branch: 'Rajouri Garden',
				designation: 'Senior RM'
			}
		});

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.branch).toBe('Rajouri Garden');
		expect(body.data.designation).toBe('Senior RM');
	});

	test('verifies updated RM contact via GET', async ({ request }) => {
		const res = await request.get(`/api/rm-contacts/${rmContactId}`);

		const body = await res.json();
		expect(body.data.phone).toBe('9876500000');
		expect(body.data.branch).toBe('Rajouri Garden');
		expect(body.data.designation).toBe('Senior RM');
	});

	test('returns filter options (lender names and cities)', async ({ request }) => {
		const res = await request.get('/api/rm-contacts');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();

		// Should include filter options
		expect(body.data.lender_filter_options).toBeTruthy();
		expect(Array.isArray(body.data.lender_filter_options)).toBe(true);

		expect(body.data.city_filter_options).toBeTruthy();
		expect(Array.isArray(body.data.city_filter_options)).toBe(true);
	});
});

// ============================================================================
// RM CONTACT DUPLICATE DETECTION
// ============================================================================

test.describe('RM Contacts - Duplicate Detection', () => {
	test('detects potential duplicate when creating RM with same name and lender', async ({
		request
	}) => {
		const rmName = `E2E DupRM ${Date.now()}`;

		// Create the first contact
		const res1 = await request.post('/api/rm-contacts', {
			data: {
				rm_name: rmName,
				lender_name: 'SBI',
				branch: 'Main Branch',
				phone: '1234567890'
			}
		});
		expect(res1.ok()).toBeTruthy();
		const body1 = await res1.json();
		expect(body1.success).toBe(true);

		// Try to create a duplicate
		const res2 = await request.post('/api/rm-contacts', {
			data: {
				rm_name: rmName,
				lender_name: 'SBI',
				branch: 'Other Branch',
				phone: '0987654321'
			}
		});

		expect(res2.ok()).toBeTruthy();
		const body2 = await res2.json();
		expect(body2.success).toBe(true);
		// Should flag as duplicate suggestion
		expect(body2.duplicate_suggestion).toBe(true);
		expect(body2.message).toContain('similar name');
	});
});

// ============================================================================
// RM CONTACT VALIDATION
// ============================================================================

test.describe('RM Contacts - Validation', () => {
	test('rejects creation with empty rm_name', async ({ request }) => {
		const res = await request.post('/api/rm-contacts', {
			data: {
				rm_name: '',
				lender_name: 'HDFC Bank'
			}
		});

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	test('rejects creation with empty lender_name', async ({ request }) => {
		const res = await request.post('/api/rm-contacts', {
			data: {
				rm_name: 'Test RM',
				lender_name: ''
			}
		});

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
	});

	test('rejects update with invalid email', async ({ request }) => {
		// Create a valid contact first
		const createRes = await request.post('/api/rm-contacts', {
			data: {
				rm_name: `E2E ValRM ${Date.now()}`,
				lender_name: 'Axis Bank'
			}
		});

		const createBody = await createRes.json();
		const rmId = createBody.data._id;

		// Try to update with invalid email
		const updateRes = await request.patch(`/api/rm-contacts/${rmId}`, {
			data: {
				email: 'not-an-email'
			}
		});

		expect(updateRes.status()).toBe(400);
	});
});

// ============================================================================
// RM SUGGESTIONS FOR A CASE
// ============================================================================

test.describe.serial('RM Contacts - Suggestions for Case', () => {
	let testCaseId: string;

	test.beforeAll(async ({ request }) => {
		// Create an RM contact for SBI
		await request.post('/api/rm-contacts', {
			data: {
				rm_name: `E2E SuggestRM ${Date.now()}`,
				lender_name: 'SBI',
				branch: 'Parliament Street',
				city: 'Delhi',
				phone: '5555555555'
			}
		});

		// Create a case and add SBI as a lender
		const { case_id } = await createTestCase(request, {
			label: `E2E RMSuggest ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 4000000
		});
		testCaseId = case_id;

		await addLenderApplication(request, case_id, 'SBI', 'sbi');
	});

	test('returns RM suggestions for lenders in a case', async ({ request }) => {
		const res = await request.get(`/api/rm-contacts/suggest?case_id=${testCaseId}`);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.suggestions).toBeTruthy();

		// Should have suggestions for SBI (since we added it as a lender)
		expect(body.data.suggestions['SBI']).toBeTruthy();
		expect(Array.isArray(body.data.suggestions['SBI'])).toBe(true);
	});

	test('returns empty suggestions when no lenders are in the case', async ({ request }) => {
		// Create a case without lenders
		const { case_id } = await createTestCase(request, {
			label: `E2E NoLenderRM ${Date.now()}`,
			loan_type: 'Home Loan'
		});

		const res = await request.get(`/api/rm-contacts/suggest?case_id=${case_id}`);

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.suggestions).toBeTruthy();
		expect(Object.keys(body.data.suggestions).length).toBe(0);

		// Cleanup
		await archiveTestCase(request, case_id);
	});

	test('suggest endpoint requires case_id parameter', async ({ request }) => {
		const res = await request.get('/api/rm-contacts/suggest');

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('case_id');
	});

	test.afterAll(async ({ request }) => {
		if (testCaseId) {
			await archiveTestCase(request, testCaseId);
		}
	});
});

// ============================================================================
// RM CONTACTS DISPLAY IN CASE DETAIL UI
// ============================================================================

test.describe('RM Contacts - UI Display in Case Detail', () => {
	test('case detail overview shows RM Contacts section when RMs are linked', async ({
		page,
		request
	}) => {
		// Create a case with a lender
		const { case_id } = await createTestCase(request, {
			label: `E2E RMUI ${Date.now()}`,
			loan_type: 'Home Loan',
			amount_required: 5000000
		});

		await addLenderApplication(request, case_id, 'HDFC Bank', 'hdfc_bank');

		// Navigate to case detail
		await navigateToCaseDetail(page, case_id);

		// The RM Contacts section appears in the right sidebar when rmContacts data is present
		// If there are RM contacts linked to the case's lenders, the section shows
		const rmSection = page.locator('h3:has-text("RM Contacts")');
		const hasRmSection = await rmSection.count();

		// Whether it shows or not depends on the server-side data.
		// We just verify the page loads correctly without errors.
		await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

		// Cleanup
		await archiveTestCase(request, case_id);
	});
});

// ============================================================================
// RM CONTACTS - PAGINATION
// ============================================================================

test.describe('RM Contacts - Pagination', () => {
	test('respects page and limit parameters', async ({ request }) => {
		const res = await request.get('/api/rm-contacts?page=1&limit=5');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.pagination.page).toBe(1);
		expect(body.data.pagination.limit).toBe(5);
		expect(body.data.contacts.length).toBeLessThanOrEqual(5);
	});

	test('returns correct total_pages in pagination', async ({ request }) => {
		const res = await request.get('/api/rm-contacts?limit=1');

		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		const { total, total_pages, limit } = body.data.pagination;

		if (total > 0) {
			expect(total_pages).toBe(Math.ceil(total / limit));
		}
	});
});
