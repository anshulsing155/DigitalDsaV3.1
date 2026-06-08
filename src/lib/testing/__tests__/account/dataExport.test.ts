/**
 * E.1 — DPDP §11 data-export assembler tests
 * ══════════════════════════════════════════════════════════════════
 * Coverage:
 *   - preflightSize routes correctly across the INLINE_THRESHOLD boundary
 *   - buildUserExportZip assembles all expected JSON files + README + manifest
 *   - The ZIP contents are parseable + counts match what was read in
 *   - sendOversizedTicketEmail dispatches to the locked recipient
 *
 * Pattern: mock the MongoDB collections (lightweight find/findOne/countDocuments
 * stubs) so tests don't touch the real DB. Same approach as billing tests.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const { mockLogger, mockSendEmail } = vi.hoisted(() => ({
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockSendEmail: vi.fn()
}));

vi.mock('$lib/server/logger', () => ({ default: mockLogger }));
vi.mock('$lib/server/email', () => ({ sendEmail: mockSendEmail }));

// Hoisted mock state — each test mutates these to simulate different
// DB shapes. vi.mock factories are hoisted ABOVE imports, so the state
// must come from vi.hoisted too.
const { mockState } = vi.hoisted(() => ({
	mockState: {
		caseCount: 5,
		profile: null as Record<string, unknown> | null,
		cases: [] as Array<Record<string, unknown>>,
		formSnapshots: [] as Array<Record<string, unknown>>,
		lenderResults: [] as Array<Record<string, unknown>>,
		timeline: [] as Array<Record<string, unknown>>,
		leads: [] as Array<Record<string, unknown>>,
		rmContacts: [] as Array<Record<string, unknown>>,
		billing: [] as Array<Record<string, unknown>>,
		invoices: [] as Array<Record<string, unknown>>,
		commLogs: [] as Array<Record<string, unknown>>,
		notifications: [] as Array<Record<string, unknown>>,
		disclaimers: [] as Array<Record<string, unknown>>
	}
}));

function makeCollection<T>(rows: T[], countOverride?: number) {
	return {
		find: () => ({ toArray: async () => rows }),
		findOne: async () => rows[0] ?? null,
		countDocuments: async () => countOverride ?? rows.length
	};
}

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: { findOne: async () => mockState.profile },
	rmApplications: { findOne: async () => mockState.profile },
	Cases: {
		find: () => ({ toArray: async () => mockState.cases }),
		countDocuments: async () => mockState.caseCount
	},
	FormSnapshots: { find: () => ({ toArray: async () => mockState.formSnapshots }) },
	LenderResultsSnapshots: {
		find: () => ({ toArray: async () => mockState.lenderResults })
	},
	RMContacts: { find: () => ({ toArray: async () => mockState.rmContacts }) },
	Leads: { find: () => ({ toArray: async () => mockState.leads }) },
	TimelineEvents: { find: () => ({ toArray: async () => mockState.timeline }) },
	CommunicationLogs: { find: () => ({ toArray: async () => mockState.commLogs }) },
	Notifications: { find: () => ({ toArray: async () => mockState.notifications }) },
	BillingTransactions: { find: () => ({ toArray: async () => mockState.billing }) },
	Invoices: { find: () => ({ toArray: async () => mockState.invoices }) },
	DisclaimerAcceptances: {
		find: () => ({ toArray: async () => mockState.disclaimers })
	}
}));

import JSZip from 'jszip';
import {
	preflightSize,
	buildUserExportZip,
	sendOversizedTicketEmail,
	INLINE_THRESHOLD,
	OPS_TICKET_RECIPIENT
} from '$lib/server/account/dataExport';

const TEST_USER_ID = new ObjectId();

beforeEach(() => {
	mockLogger.info.mockReset();
	mockLogger.warn.mockReset();
	mockLogger.error.mockReset();
	mockSendEmail.mockReset().mockResolvedValue({ success: true, messageId: 'test-id' });
	// Reset mock state to a known-empty baseline
	mockState.caseCount = 0;
	mockState.profile = null;
	mockState.cases = [];
	mockState.formSnapshots = [];
	mockState.lenderResults = [];
	mockState.timeline = [];
	mockState.leads = [];
	mockState.rmContacts = [];
	mockState.billing = [];
	mockState.invoices = [];
	mockState.commLogs = [];
	mockState.notifications = [];
	mockState.disclaimers = [];
});

// ── preflightSize routing ──────────────────────────────────────

describe('preflightSize — routing decision', () => {
	it('routes to "inline" at exactly INLINE_THRESHOLD cases (boundary inclusive)', async () => {
		mockState.caseCount = INLINE_THRESHOLD;
		const result = await preflightSize(TEST_USER_ID, 'dsa');
		expect(result.caseCount).toBe(INLINE_THRESHOLD);
		expect(result.routing).toBe('inline');
	});

	it('routes to "ticket" at INLINE_THRESHOLD + 1', async () => {
		mockState.caseCount = INLINE_THRESHOLD + 1;
		const result = await preflightSize(TEST_USER_ID, 'dsa');
		expect(result.routing).toBe('ticket');
	});

	it('routes to "inline" for typical small accounts (10 cases)', async () => {
		mockState.caseCount = 10;
		const result = await preflightSize(TEST_USER_ID, 'dsa');
		expect(result.routing).toBe('inline');
	});

	it('RM role always returns inline routing in v1 (RM-scope stub)', async () => {
		mockState.caseCount = 99999; // would route to ticket for DSA
		const result = await preflightSize(TEST_USER_ID, 'rm');
		expect(result.routing).toBe('inline');
		expect(result.caseCount).toBe(0); // RM stub doesn't count cases
	});
});

// ── buildUserExportZip — DSA happy path ────────────────────────

describe('buildUserExportZip — DSA scope', () => {
	beforeEach(() => {
		mockState.profile = { _id: TEST_USER_ID, name: 'Test DSA', email: 'dsa@example.com' };
		mockState.cases = [
			{ case_id: 'HL-2026-0001', dsa_id: TEST_USER_ID, loan: { type: 'Home Loan' } },
			{ case_id: 'HL-2026-0002', dsa_id: TEST_USER_ID, loan: { type: 'Personal Loan' } }
		];
		mockState.formSnapshots = [{ case_id: 'HL-2026-0001', version: 1 }];
		mockState.notifications = [{ user_id: String(TEST_USER_ID), body: 'Welcome' }];
	});

	it('produces a parseable ZIP with all expected files', async () => {
		const { zip, sizeBytes, manifest } = await buildUserExportZip(TEST_USER_ID, 'dsa');

		expect(sizeBytes).toBeGreaterThan(0);
		expect(zip.byteLength).toBe(sizeBytes);

		// Parse the ZIP back and verify the file list
		const parsed = await JSZip.loadAsync(zip);
		const names = Object.keys(parsed.files);

		expect(names).toContain('profile.json');
		expect(names).toContain('cases.json');
		expect(names).toContain('form-snapshots.json');
		expect(names).toContain('manifest.json');
		expect(names).toContain('README.txt');
		expect(names).toContain('notifications.json');

		expect(manifest.role).toBe('dsa');
		expect(manifest.counts.cases).toBe(2);
		expect(manifest.counts.profile).toBe(1);
	});

	it('cases.json contains the right case_ids round-tripped through JSON', async () => {
		const { zip } = await buildUserExportZip(TEST_USER_ID, 'dsa');
		const parsed = await JSZip.loadAsync(zip);
		const casesJson = await parsed.file('cases.json')!.async('string');
		const cases = JSON.parse(casesJson) as Array<{ case_id: string }>;
		expect(cases).toHaveLength(2);
		expect(cases.map((c) => c.case_id)).toEqual(['HL-2026-0001', 'HL-2026-0002']);
	});

	it('serialises ObjectId fields as 24-char hex strings (not {"$oid":...})', async () => {
		const { zip } = await buildUserExportZip(TEST_USER_ID, 'dsa');
		const parsed = await JSZip.loadAsync(zip);
		const profileJson = await parsed.file('profile.json')!.async('string');
		// Round-trip and check the _id field is a plain hex string, not a
		// MongoDB-extended-JSON wrapper.
		const profile = JSON.parse(profileJson) as { _id: string };
		expect(typeof profile._id).toBe('string');
		expect(profile._id).toMatch(/^[0-9a-f]{24}$/);
	});

	it('omits collections when there are no matching cases (no orphan empty snapshots)', async () => {
		mockState.cases = []; // no cases → no form-snapshots / lender-results / timeline
		const { zip, manifest } = await buildUserExportZip(TEST_USER_ID, 'dsa');
		const parsed = await JSZip.loadAsync(zip);
		const names = Object.keys(parsed.files);

		expect(names).toContain('cases.json'); // still present, just empty
		// These three are gated on cases.length > 0:
		expect(names).not.toContain('form-snapshots.json');
		expect(names).not.toContain('lender-results.json');
		expect(names).not.toContain('timeline-events.json');

		expect(manifest.counts.cases).toBe(0);
	});

	it('manifest counts match the underlying collection sizes', async () => {
		mockState.leads = [{ id: 1 }, { id: 2 }, { id: 3 }];
		mockState.billing = [{ id: 'b1' }];
		const { manifest } = await buildUserExportZip(TEST_USER_ID, 'dsa');
		expect(manifest.counts.leads).toBe(3);
		expect(manifest.counts.billing_transactions).toBe(1);
	});

	it('README.txt mentions DPDP §11 + the 6-year money-retention note', async () => {
		const { zip } = await buildUserExportZip(TEST_USER_ID, 'dsa');
		const parsed = await JSZip.loadAsync(zip);
		const readme = await parsed.file('README.txt')!.async('string');
		expect(readme).toContain('DPDP Act §11');
		expect(readme).toContain('6-year');
	});
});

// ── buildUserExportZip — RM scope ──────────────────────────────

describe('buildUserExportZip — RM scope', () => {
	it('produces a minimal export with a note about the v1 stub', async () => {
		mockState.profile = { _id: TEST_USER_ID, name: 'Test RM', email: 'rm@example.com' };
		const { zip, manifest } = await buildUserExportZip(TEST_USER_ID, 'rm');
		const parsed = await JSZip.loadAsync(zip);

		expect(Object.keys(parsed.files)).toContain('profile.json');
		// No cases.json — that's DSA-only.
		expect(Object.keys(parsed.files)).not.toContain('cases.json');

		expect(manifest.role).toBe('rm');
		expect(manifest.notes.join(' ')).toContain('minimal in v1');
	});
});

// ── sendOversizedTicketEmail ───────────────────────────────────

describe('sendOversizedTicketEmail — ops ticket dispatch', () => {
	it('sends to the locked recipient (tech@digitaldsa.com) with case count in subject', async () => {
		await sendOversizedTicketEmail({
			userId: TEST_USER_ID,
			role: 'dsa',
			caseCount: 487,
			userEmail: 'big-dsa@example.com',
			userName: 'Big DSA'
		});

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.to).toBe(OPS_TICKET_RECIPIENT);
		expect(args.to).toBe('tech@digitaldsa.com');
		expect(args.subject).toContain('487 cases');
		expect(args.subject).toContain(String(TEST_USER_ID));
	});

	it('email body includes the user details + action checklist + SLA', async () => {
		await sendOversizedTicketEmail({
			userId: TEST_USER_ID,
			role: 'rm',
			caseCount: 250,
			userEmail: 'rm@example.com',
			userName: 'Test RM'
		});

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.text).toContain('rm@example.com');
		expect(args.text).toContain('Test RM');
		expect(args.text).toContain('24 hours');
		expect(args.text).toContain('Action required');
	});

	it('logs a warning when sendEmail returns failure (does not throw)', async () => {
		mockSendEmail.mockResolvedValueOnce({ success: false, error: 'SMTP down' });

		await expect(
			sendOversizedTicketEmail({
				userId: TEST_USER_ID,
				role: 'dsa',
				caseCount: 300
			})
		).resolves.toBeUndefined();

		expect(mockLogger.warn).toHaveBeenCalledTimes(1);
		const warnArgs = mockLogger.warn.mock.calls[0][0];
		expect(warnArgs.error).toBe('SMTP down');
	});
});
