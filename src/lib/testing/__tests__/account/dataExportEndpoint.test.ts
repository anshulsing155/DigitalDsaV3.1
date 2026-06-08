/**
 * E.1 — POST /api/account/data-export endpoint shape tests
 * ══════════════════════════════════════════════════════════════════
 * Validates the response branching:
 *
 *   - Unauthenticated → 401 (via requireAuthApi)
 *   - Admin role → 403 (DSA + RM only per spec)
 *   - Recent request within 30 days → 429 with next-eligible date
 *   - Oversized account → 200 with JSON {status: 'queued', message, eta_hours}
 *   - Small account → 200 with Content-Type: application/zip and a Buffer body
 *
 * Heavy use of vi.hoisted to share mock state across the vi.mock factories
 * (which run before module imports).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const TEST_MOBILE = 9999999999;

// Everything referenced inside vi.mock factories must come from vi.hoisted
// (factories are hoisted ABOVE module-scope const declarations).
const { mockLogger, mockSendEmail, state, TEST_USER_ID } = vi.hoisted(() => {
	const { ObjectId: OID } = require('mongodb');
	return {
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockSendEmail: vi.fn(),
		state: {
			recentRequest: null as { requested_at: Date } | null,
			caseCount: 5,
			insertedDocs: [] as Array<Record<string, unknown>>
		},
		TEST_USER_ID: new OID() as InstanceType<typeof OID>
	};
});

vi.mock('$lib/server/logger', () => ({ default: mockLogger }));
vi.mock('$lib/server/email', () => ({ sendEmail: mockSendEmail }));

// Minimal CSFLE stub — returns a fixed user doc.
vi.mock('$lib/server/csfle', () => ({
	findUserByMobile: async () => ({
		_id: TEST_USER_ID,
		email: 'dsa@example.com',
		name: 'Test DSA'
	})
}));

vi.mock('$lib/database/mongo', () => {
	const userDoc = { _id: TEST_USER_ID, email: 'dsa@example.com', name: 'Test DSA' };
	return {
		DsaApplications: { findOne: async () => userDoc },
		rmApplications: { findOne: async () => null },
		DataExportRequests: {
			findOne: async () => state.recentRequest,
			insertOne: async (doc: Record<string, unknown>) => {
				state.insertedDocs.push(doc);
				return { insertedId: new ObjectId() };
			}
		},
		Cases: {
			find: () => ({ toArray: async () => [] }),
			countDocuments: async () => state.caseCount
		},
		FormSnapshots: { find: () => ({ toArray: async () => [] }) },
		LenderResultsSnapshots: { find: () => ({ toArray: async () => [] }) },
		RMContacts: { find: () => ({ toArray: async () => [] }) },
		Leads: { find: () => ({ toArray: async () => [] }) },
		TimelineEvents: { find: () => ({ toArray: async () => [] }) },
		CommunicationLogs: { find: () => ({ toArray: async () => [] }) },
		Notifications: { find: () => ({ toArray: async () => [] }) },
		BillingTransactions: { find: () => ({ toArray: async () => [] }) },
		Invoices: { find: () => ({ toArray: async () => [] }) },
		DisclaimerAcceptances: { find: () => ({ toArray: async () => [] }) }
	};
});

import { POST } from '../../../../routes/api/account/data-export/+server';

beforeEach(() => {
	mockLogger.info.mockReset();
	mockLogger.warn.mockReset();
	mockLogger.error.mockReset();
	mockSendEmail.mockReset().mockResolvedValue({ success: true, messageId: 'id' });
	state.recentRequest = null;
	state.caseCount = 5;
	state.insertedDocs = [];
});

function makeEvent(opts: {
	user?: { mobileNumber: number; activeRole: 'dsa' | 'rm' | 'admin' } | null;
} = {}) {
	const user =
		opts.user === undefined
			? { mobileNumber: TEST_MOBILE, activeRole: 'dsa' as const }
			: opts.user;
	return {
		locals: { user },
		request: { headers: new Headers({ 'user-agent': 'TestAgent/1.0' }) },
		getClientAddress: () => '127.0.0.1'
		// Other Event fields not used by the handler
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/account/data-export — auth + role gating', () => {
	it('returns 401 when no session user', async () => {
		const res = await POST(makeEvent({ user: null }));
		expect(res.status).toBe(401);
	});

	it('returns 403 when the active role is admin', async () => {
		const res = await POST(
			makeEvent({ user: { mobileNumber: TEST_MOBILE, activeRole: 'admin' } })
		);
		expect(res.status).toBe(403);
	});
});

describe('POST /api/account/data-export — rate limit', () => {
	it('returns 429 when a request exists within the 30-day window', async () => {
		state.recentRequest = {
			requested_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
		};
		const res = await POST(makeEvent());
		expect(res.status).toBe(429);
		const body = await res.json();
		expect(body.error).toMatch(/30 days/);
	});

	it('allows the request when last request was >30 days ago', async () => {
		state.recentRequest = null; // simulating findOne returning null (outside cutoff)
		state.caseCount = 3;
		const res = await POST(makeEvent());
		expect(res.status).toBe(200);
		expect(state.insertedDocs.length).toBe(1); // audit row created
	});
});

describe('POST /api/account/data-export — inline ZIP path', () => {
	it('returns Content-Type application/zip for small accounts', async () => {
		state.caseCount = 5;
		const res = await POST(makeEvent());
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('application/zip');
		expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="digitaldsa-export-dsa-/);
	});

	it('audit row is inserted with status=streamed + bytes_streamed', async () => {
		state.caseCount = 10;
		await POST(makeEvent());
		const audit = state.insertedDocs[0];
		expect(audit.status).toBe('streamed');
		expect(audit.case_count).toBe(10);
		expect(typeof audit.bytes_streamed).toBe('number');
		expect(audit.bytes_streamed).toBeGreaterThan(0);
	});

	it('audit row carries IP + user-agent for compliance', async () => {
		await POST(makeEvent());
		const audit = state.insertedDocs[0];
		expect(audit.user_agent).toBe('TestAgent/1.0');
		expect(audit.ip_address).toBe('127.0.0.1');
	});
});

describe('POST /api/account/data-export — oversized ticket path', () => {
	beforeEach(() => {
		state.caseCount = 500; // above INLINE_THRESHOLD (200)
	});

	it('returns JSON {status: queued, eta_hours: 24} when oversized', async () => {
		const res = await POST(makeEvent());
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.status).toBe('queued');
		expect(body.data.eta_hours).toBe(24);
		expect(body.data.message).toMatch(/500 cases/);
	});

	it('fires the ticket email to ops with the user details', async () => {
		await POST(makeEvent());
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.to).toBe('tech@digitaldsa.com');
		expect(args.subject).toContain('500 cases');
	});

	it('audit row is inserted with status=queued (no bytes_streamed)', async () => {
		await POST(makeEvent());
		const audit = state.insertedDocs[0];
		expect(audit.status).toBe('queued');
		expect(audit.case_count).toBe(500);
		expect(audit.bytes_streamed).toBeUndefined();
	});

	it('still inserts the audit row when the email dispatch fails', async () => {
		mockSendEmail.mockRejectedValueOnce(new Error('SMTP down'));
		const res = await POST(makeEvent());
		expect(res.status).toBe(200); // response is still successful
		expect(state.insertedDocs.length).toBe(1); // audit row still inserted
		expect(mockLogger.error).toHaveBeenCalled(); // failure was logged
	});
});
