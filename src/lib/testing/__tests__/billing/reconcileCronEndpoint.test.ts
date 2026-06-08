/**
 * D.1 S7 — billing-reconcile cron endpoint tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the wiring of the cron handler — not the engine logic (that's
 * covered by reconcileEngine.test.ts):
 *
 *   - x-cron-secret auth (401 on mismatch / missing secret)
 *   - cronLock contention → 200 with skipped: 'lock_contention'
 *   - happy path: fetches settlements, loads transactions, persists
 *     ReconciliationRuns row with correct status
 *   - clean run → NO drift email sent + run row stamps drift_email_sent: false
 *   - drift run → drift email IS sent + flag stamped true
 *   - critical drift run → critical_drift status surfaces in run row
 *   - idempotency: if a run for today's date already exists, skip cleanly
 *   - email failure does NOT roll back the run row (best-effort dispatch)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── env (must precede the handler import) ────────────────────────

vi.mock('$env/dynamic/private', () => ({
	env: { CRON_SECRET: 'test-cron-secret' }
}));

// ── Mongo mocks ──────────────────────────────────────────────────

const mockReconRunsFindOne = vi.fn();
const mockReconRunsInsertOne = vi.fn();
const mockReconRunsUpdateOne = vi.fn();
const mockTxFind = vi.fn();
const mockCronLocksFindOneAndUpdate = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingTransactions: {
		find: (...args: unknown[]) => mockTxFind(...args),
		findOne: vi.fn(),
		insertOne: vi.fn(),
		updateOne: vi.fn()
	},
	ReconciliationRuns: {
		findOne: (...args: unknown[]) => mockReconRunsFindOne(...args),
		insertOne: (...args: unknown[]) => mockReconRunsInsertOne(...args),
		updateOne: (...args: unknown[]) => mockReconRunsUpdateOne(...args)
	},
	CronLocks: {
		findOneAndUpdate: (...args: unknown[]) => mockCronLocksFindOneAndUpdate(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	ProcessedWebhookEvents: { insertOne: vi.fn() },
	DsaApplications: { findOne: vi.fn() },
	ChargeAttempts: { findOne: vi.fn(), insertOne: vi.fn(), updateOne: vi.fn() },
	BillingSubscriptions: { findOne: vi.fn(), find: vi.fn() }
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// ── cronLock mock — withCronLock either short-circuits with
// { acquired: false } (lock contention) or runs the work fn and
// returns { acquired: true, result }. We control per-test which
// branch fires via the controlAcquired flag.
let cronLockAcquired = true;
vi.mock('$lib/server/billing/cronLock', () => ({
	withCronLock: async <T>(
		_name: string,
		work: (ctx: { shouldAbort: () => boolean }) => Promise<T>
	): Promise<{ acquired: false } | { acquired: true; result: T }> => {
		if (!cronLockAcquired) return { acquired: false };
		const result = await work({ shouldAbort: () => false });
		return { acquired: true, result };
	}
}));

// ── Provider mock — settlements list is programmable per-test ──

const mockFetchSettlements = vi.fn();
vi.mock('$lib/server/billing/providerRegistry', () => ({
	getBillingProvider: () => ({
		name: 'mock',
		fetchSettlements: mockFetchSettlements,
		registerMandate: vi.fn(),
		chargeMandate: vi.fn(),
		refundCharge: vi.fn(),
		revokeMandate: vi.fn(),
		queryMandateStatus: vi.fn(),
		verifyWebhookSignature: vi.fn(),
		parseWebhookEvent: vi.fn()
	})
}));

// ── Email mock — capture invocations + force result ────────────

const mockSendDriftEmail = vi.fn();
vi.mock('$lib/server/billing/reconciliationEmail', () => ({
	sendReconciliationDriftEmail: (...args: unknown[]) => mockSendDriftEmail(...args)
}));

// ── Test helpers ──────────────────────────────────────────────

function makeRequest(secret: string | null) {
	const headers: Record<string, string> = {};
	if (secret !== null) headers['x-cron-secret'] = secret;
	return new Request('http://x', { method: 'POST', headers });
}

function mockTxCursor(rows: unknown[]) {
	mockTxFind.mockReturnValue({ toArray: async () => rows });
}

beforeEach(() => {
	mockReconRunsFindOne.mockReset().mockResolvedValue(null);
	mockReconRunsInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockReconRunsUpdateOne.mockReset().mockResolvedValue({});
	mockTxFind.mockReset();
	mockCronLocksFindOneAndUpdate.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockFetchSettlements.mockReset();
	mockSendDriftEmail.mockReset();
	// Reset cronLock acquired flag — default to "lock acquired" so each
	// test exercises the work fn unless it explicitly opts into contention.
	cronLockAcquired = true;
});

async function getHandler() {
	const mod = await import('../../../../routes/api/cron/billing-reconcile/+server');
	return mod.POST;
}

// ── Auth ──────────────────────────────────────────────────────

describe('POST /api/cron/billing-reconcile — auth', () => {
	it('401s when no x-cron-secret header is present', async () => {
		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest(null) } as any);
		expect(res.status).toBe(401);
	});

	it('401s on wrong secret', async () => {
		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('wrong-secret') } as any);
		expect(res.status).toBe(401);
	});
});

// ── Concurrency / idempotency ─────────────────────────────────

describe('POST /api/cron/billing-reconcile — concurrency + idempotency', () => {
	it('returns skipped:lock_contention when cronLock cannot be acquired', async () => {
		cronLockAcquired = false;
		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.skipped).toBe('lock_contention');
		// Provider + transactions should NOT have been read.
		expect(mockFetchSettlements).not.toHaveBeenCalled();
		expect(mockTxFind).not.toHaveBeenCalled();
	});

	it('skips cleanly when a ReconciliationRuns row for today already exists', async () => {

		mockReconRunsFindOne.mockResolvedValue({
			_id: new ObjectId(),
			run_date: '2026-06-01',
			provider: 'mock'
		});

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.skipped).toBe('already_run');
		expect(mockFetchSettlements).not.toHaveBeenCalled();
		expect(mockReconRunsInsertOne).not.toHaveBeenCalled();
	});

	it('idempotency: concurrent insert E11000 → exit clean, no throw', async () => {

		mockFetchSettlements.mockResolvedValue([]);
		mockTxCursor([]);
		mockReconRunsInsertOne.mockRejectedValue(
			Object.assign(new Error('duplicate key'), { code: 11000 })
		);

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.skipped).toBe('concurrent_insert');
	});
});

// ── Happy paths ───────────────────────────────────────────────

describe('POST /api/cron/billing-reconcile — happy paths', () => {
	it('clean run: no settlements + no transactions → status=clean, NO email', async () => {

		mockFetchSettlements.mockResolvedValue([]);
		mockTxCursor([]);

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.status).toBe('clean');
		expect(body.data.matched).toBe(0);

		// Run row was persisted with clean status.
		expect(mockReconRunsInsertOne).toHaveBeenCalledOnce();
		const persistedRow = mockReconRunsInsertOne.mock.calls[0][0];
		expect(persistedRow.status).toBe('clean');
		expect(persistedRow.drift_email_sent).toBe(false);

		// Email NOT sent on clean.
		expect(mockSendDriftEmail).not.toHaveBeenCalled();

		// Audit row written for cron-run observability.
		expect(mockAuditInsertOne).toHaveBeenCalled();
		const auditRow = mockAuditInsertOne.mock.calls[0][0];
		expect(auditRow.event_name).toBe('billing-reconcile');
		expect(auditRow.payload.status).toBe('clean');
	});

	it('drift run: drift email IS sent + flag stamped true', async () => {

		// A phantom settlement with no matching transaction → missing-our-side
		// (critical_drift status).
		mockFetchSettlements.mockResolvedValue([
			{
				provider_payment_id: 'pay_phantom',
				amount_paise: 99900,
				settled_at: new Date('2026-06-01T12:00:00Z'),
				type: 'charge' as const
			}
		]);
		mockTxCursor([]);
		mockSendDriftEmail.mockResolvedValue({ success: true });

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		const body = await res.json();
		expect(body.data.status).toBe('critical_drift');
		expect(body.data.counts.missing_our_side).toBe(1);
		expect(body.data.drift_email_sent).toBe(true);

		expect(mockSendDriftEmail).toHaveBeenCalledOnce();
		// Flag stamped on the run row.
		expect(mockReconRunsUpdateOne).toHaveBeenCalled();
		const updateOps = mockReconRunsUpdateOne.mock.calls[0][1];
		expect(updateOps.$set.drift_email_sent).toBe(true);
	});

	it('drift run with email failure: run row still persisted, flag stays false', async () => {

		mockFetchSettlements.mockResolvedValue([
			{
				provider_payment_id: 'pay_phantom',
				amount_paise: 99900,
				settled_at: new Date('2026-06-01T12:00:00Z'),
				type: 'charge' as const
			}
		]);
		mockTxCursor([]);
		mockSendDriftEmail.mockResolvedValue({ success: false, error: 'SES down' });

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200);
		// Run row was persisted even though email failed.
		expect(mockReconRunsInsertOne).toHaveBeenCalledOnce();
		// updateOne should NOT have been called (flag stays false).
		expect(mockReconRunsUpdateOne).not.toHaveBeenCalled();
		const body = await res.json();
		expect(body.data.drift_email_sent).toBe(false);
	});

	it('drift run with email THROW: run row still persisted, no throw to caller', async () => {

		mockFetchSettlements.mockResolvedValue([
			{
				provider_payment_id: 'pay_phantom',
				amount_paise: 99900,
				settled_at: new Date('2026-06-01T12:00:00Z'),
				type: 'charge' as const
			}
		]);
		mockTxCursor([]);
		mockSendDriftEmail.mockRejectedValue(new Error('SES connection refused'));

		const handler = await getHandler();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await handler({ request: makeRequest('test-cron-secret') } as any);
		expect(res.status).toBe(200); // not 500
		expect(mockReconRunsInsertOne).toHaveBeenCalledOnce();
	});
});
