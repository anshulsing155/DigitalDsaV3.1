/**
 * DATA-1 — POST /api/dsa/lead-vault integration tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6.
 *
 * Exercises the handler orchestration paths with mocked Mongo collections.
 * Unit-level bucketing / consent / build-vault behavior is covered in
 * sibling test files; this file's job is the order-of-operations contract:
 *   auth → ownership → loan-type skip → consent gate → dedup → snapshot
 *     load → buildVaultEntry → insert.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mocks (declared BEFORE the handler import) ──────────────────────────────

const mockCasesFindOne = vi.fn();
const mockFormSnapshotsFindOne = vi.fn();
const mockVaultFindOne = vi.fn();
const mockVaultInsertOne = vi.fn();
const mockVaultFind = vi.fn();
const mockVaultCountDocuments = vi.fn();
const mockVaultDeleteOne = vi.fn();
const mockWithdrawalLogInsert = vi.fn();

/**
 * Returns a fluent-chain stub for `.find(...).sort(...).skip(...).limit(...).toArray()`.
 * Each chain step returns `this` so the handler's call chain resolves without
 * blowing up. `.toArray()` returns the supplied array.
 */
function makeFindChain(entries: unknown[]) {
	const chain: Record<string, unknown> = {};
	chain.sort = vi.fn(() => chain);
	chain.skip = vi.fn(() => chain);
	chain.limit = vi.fn(() => chain);
	chain.toArray = vi.fn(async () => entries);
	return chain;
}

vi.mock('$lib/database/mongo', () => ({
	Cases: {
		findOne: (...args: unknown[]) => mockCasesFindOne(...args)
	},
	FormSnapshots: {
		findOne: (...args: unknown[]) => mockFormSnapshotsFindOne(...args)
	},
	LeadAttributionVault: {
		findOne: (...args: unknown[]) => mockVaultFindOne(...args),
		insertOne: (...args: unknown[]) => mockVaultInsertOne(...args),
		find: (...args: unknown[]) => mockVaultFind(...args),
		countDocuments: (...args: unknown[]) => mockVaultCountDocuments(...args),
		deleteOne: (...args: unknown[]) => mockVaultDeleteOne(...args)
	},
	ConsentWithdrawalLogs: {
		insertOne: (...args: unknown[]) => mockWithdrawalLogInsert(...args)
	},
	DsaApplications: {
		findOne: vi.fn().mockResolvedValue({ _id: new ObjectId() })
	},
	Teams: {
		findOne: vi.fn().mockResolvedValue(null)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Rate limiter — always allow in tests; the limit itself is exercised elsewhere.
vi.mock('$lib/server/rateLimiter', () => ({
	rateLimit: vi.fn(async () => false)
}));

// CSFLE module — resolveSnapshotPayload just returns the snapshot's payload.
vi.mock('$lib/server/csfle/index', () => ({
	resolveSnapshotPayload: vi.fn(
		async (snapshot: { payload?: Record<string, unknown> | null }) =>
			snapshot.payload ?? null
	)
}));

// caseHelpers — supply resolveEffectiveDsaId + verifyCaseOwnership shims
// that drive off our mockCasesFindOne. Mirrors the real helper's surface.
const TEST_DSA_OID = new ObjectId();
vi.mock('$lib/server/caseHelpers', () => ({
	resolveEffectiveDsaId: vi.fn(async () => ({ ok: true, dsaId: TEST_DSA_OID })),
	verifyCaseOwnership: vi.fn(async (caseId: string, dsaId: ObjectId) => {
		const found = await mockCasesFindOne({ case_id: caseId, dsa_id: dsaId });
		if (!found) return { ok: false, error: 'Case not found' };
		return { ok: true, caseDoc: found };
	})
}));

// Guards — all pass-through. The handler's only logic gates are the
// secured-loan / consent / property-data gates, which we exercise directly.
vi.mock('$lib/server/guards', () => ({
	requireRoleApi: vi.fn(() => null),
	requireAuthApi: vi.fn(() => null),
	requireTeamPermission: vi.fn(() => null),
	blockDemoWrite: vi.fn(() => null)
}));

// ── Import the handlers AFTER the mocks above. ──────────────────────────────
import { POST, GET, DELETE } from '../../../../routes/api/dsa/lead-vault/+server';

// ── Test helpers ────────────────────────────────────────────────────────────

function makeCase(overrides: Record<string, unknown> = {}) {
	return {
		case_id: 'HL-2026-0042',
		dsa_id: TEST_DSA_OID,
		loan: { type: 'Home Loan', amount_required: 19_000_000 },
		stage: 'sanctioned',
		stage_history: [
			{ from: 'profiling', to: 'sanctioned', timestamp: new Date('2026-03-14T00:00:00Z') }
		],
		lender_applications: [
			{
				lender_application_id: 'LA-1',
				lender_id: 'L-HDFC',
				lender_name: 'HDFC',
				status: 'sanctioned',
				status_history: [],
				document_checklist: [
					{
						doc_id: 'consent-xyz',
						doc_name: 'data_usage_consent_v1',
						category: 'other',
						is_mandatory: true,
						status: 'uploaded'
					}
				],
				queries: [],
				file_snapshots: [],
				created_at: new Date('2026-02-01T00:00:00Z'),
				updated_at: new Date('2026-02-01T00:00:00Z')
			}
		],
		...overrides
	};
}

const HAPPY_PAYLOAD = {
	propertyStateName: 'Maharashtra',
	propertyCityName: 'Mumbai',
	propertyArea: 'Powai',
	propertyPincode: '400076',
	projectName: 'Hiranandani Gardens',
	propCost: 18_743_200
};

function makeRequest(body: unknown): {
	request: Request;
	locals: { user: { id: string } };
	getClientAddress: () => string;
} {
	return {
		request: new Request('http://test/api/dsa/lead-vault', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'test-user-id' } },
		getClientAddress: () => '127.0.0.1'
	};
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockCasesFindOne.mockReset();
	mockFormSnapshotsFindOne.mockReset();
	mockVaultFindOne.mockReset();
	mockVaultInsertOne.mockReset();
	mockVaultFind.mockReset();
	mockVaultCountDocuments.mockReset();
	mockVaultDeleteOne.mockReset();
	mockWithdrawalLogInsert.mockReset();
});

describe('POST /api/dsa/lead-vault', () => {
	describe('validation', () => {
		it('400s when case_id is missing', async () => {
			const { request, locals } = makeRequest({});
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(400);
		});

		it('400s when case_id is empty string', async () => {
			const { request, locals } = makeRequest({ case_id: '' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(400);
		});
	});

	describe('ownership', () => {
		it('404s when case is not found for the calling DSA', async () => {
			mockCasesFindOne.mockResolvedValue(null);
			const { request, locals } = makeRequest({ case_id: 'HL-2026-9999' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(404);
		});
	});

	describe('loan-type gate', () => {
		it('returns skipped: true for an unsecured (Personal Loan) case', async () => {
			mockCasesFindOne.mockResolvedValue(makeCase({ loan: { type: 'Personal Loan' } }));
			const { request, locals } = makeRequest({ case_id: 'PL-2026-0001' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(200);
			const body = await readJson(res);
			expect(body).toMatchObject({
				success: true,
				data: { skipped: true, reason: 'unsupported_loan_type_v1' }
			});
			// And critically — no insert should have happened.
			expect(mockVaultInsertOne).not.toHaveBeenCalled();
		});
	});

	describe('consent gate', () => {
		it('400 CONSENT_REQUIRED when no uploaded consent doc is on file', async () => {
			const caseDoc = makeCase();
			caseDoc.lender_applications[0].document_checklist = [
				{
					doc_id: 'consent-xyz',
					doc_name: 'data_usage_consent_v1',
					category: 'other',
					is_mandatory: true,
					status: 'requested' // not yet uploaded
				}
			];
			mockCasesFindOne.mockResolvedValue(caseDoc);
			const { request, locals } = makeRequest({ case_id: 'HL-2026-0042' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(400);
			const body = await readJson(res);
			expect(String(body.error)).toMatch(/CONSENT_REQUIRED/);
			expect(mockVaultInsertOne).not.toHaveBeenCalled();
		});
	});

	describe('idempotency', () => {
		it('returns already_saved: true when source_case_id is already vault-ed', async () => {
			mockCasesFindOne.mockResolvedValue(makeCase());
			const existingOid = new ObjectId();
			mockVaultFindOne.mockResolvedValue({ _id: existingOid });

			const { request, locals } = makeRequest({ case_id: 'HL-2026-0042' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(200);
			const body = await readJson(res);
			expect(body).toMatchObject({
				success: true,
				data: { already_saved: true, vault_entry_id: existingOid.toString() }
			});
			expect(mockVaultInsertOne).not.toHaveBeenCalled();
			// Snapshot should NOT be loaded — dedup short-circuits the read.
			expect(mockFormSnapshotsFindOne).not.toHaveBeenCalled();
		});
	});

	describe('snapshot resolution', () => {
		it('400 NO_FORM_SNAPSHOT when the case has no payload', async () => {
			mockCasesFindOne.mockResolvedValue(makeCase());
			mockVaultFindOne.mockResolvedValue(null);
			mockFormSnapshotsFindOne.mockResolvedValue(null);

			const { request, locals } = makeRequest({ case_id: 'HL-2026-0042' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(400);
			const body = await readJson(res);
			expect(String(body.error)).toMatch(/NO_FORM_SNAPSHOT/);
		});
	});

	describe('property-data gate', () => {
		it('400 MISSING_PROPERTY_DATA when pincode is absent from the payload', async () => {
			mockCasesFindOne.mockResolvedValue(makeCase());
			mockVaultFindOne.mockResolvedValue(null);
			const { propertyPincode: _, ...payloadWithoutPincode } = HAPPY_PAYLOAD;
			mockFormSnapshotsFindOne.mockResolvedValue({ payload: payloadWithoutPincode });

			const { request, locals } = makeRequest({ case_id: 'HL-2026-0042' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(400);
			const body = await readJson(res);
			expect(String(body.error)).toMatch(/MISSING_PROPERTY_DATA/);
			expect(mockVaultInsertOne).not.toHaveBeenCalled();
		});
	});

	describe('GET — DSA transparency view', () => {
		function makeVaultEntry(overrides: Record<string, unknown> = {}) {
			return {
				_id: new ObjectId(),
				source_case_id: 'HL-2026-0042',
				source_dsa_id: TEST_DSA_OID,
				closed_quarter: '2026-Q1',
				created_at: new Date('2026-03-14T00:00:00Z'),
				loan_type: 'Home Loan',
				lender_selected: 'HDFC',
				property_locality_bucket: 'Hiranandani Gardens Powai',
				property_pincode: '400076',
				property_price_bucket: 18_740_000,
				loan_amount_bucket: 19_000_000,
				consent_ref: 'consent-xyz',
				...overrides
			};
		}

		function makeGetReq(query = ''): { url: URL; locals: { user: { id: string } } } {
			return {
				url: new URL(`http://test/api/dsa/lead-vault${query ? '?' + query : ''}`),
				locals: { user: { id: 'test-user-id' } }
			};
		}

		it('returns a paginated list of the calling DSA\'s entries', async () => {
			const entries = [makeVaultEntry(), makeVaultEntry({ source_case_id: 'HL-2026-0099' })];
			mockVaultFind.mockReturnValue(makeFindChain(entries));
			mockVaultCountDocuments.mockResolvedValue(2);

			const { url, locals } = makeGetReq();
			const res = await GET({ url, locals } as any);

			expect(res.status).toBe(200);
			const body = await readJson(res);
			const data = body.data as { entries: unknown[]; pagination: Record<string, number> };
			expect(data.entries).toHaveLength(2);
			expect(data.pagination).toEqual({ page: 1, limit: 20, total: 2, total_pages: 1 });
		});

		it('scopes the query to the caller\'s source_dsa_id (BOLA gate)', async () => {
			mockVaultFind.mockReturnValue(makeFindChain([]));
			mockVaultCountDocuments.mockResolvedValue(0);

			const { url, locals } = makeGetReq();
			await GET({ url, locals } as any);

			// Both .find and .countDocuments must be invoked with
			// { source_dsa_id: TEST_DSA_OID } as the base filter.
			const findFilter = mockVaultFind.mock.calls[0][0];
			expect(findFilter).toEqual({ source_dsa_id: TEST_DSA_OID });
			const countFilter = mockVaultCountDocuments.mock.calls[0][0];
			expect(countFilter).toEqual({ source_dsa_id: TEST_DSA_OID });
		});

		it('omits source_dsa_id and consent_ref from the response', async () => {
			mockVaultFind.mockReturnValue(makeFindChain([makeVaultEntry()]));
			mockVaultCountDocuments.mockResolvedValue(1);

			const { url, locals } = makeGetReq();
			const res = await GET({ url, locals } as any);
			const body = await readJson(res);
			const data = body.data as { entries: Record<string, unknown>[] };
			expect(data.entries[0]).not.toHaveProperty('source_dsa_id');
			expect(data.entries[0]).not.toHaveProperty('consent_ref');
			// But the routing-visible fields are present.
			expect(data.entries[0]).toHaveProperty('property_locality_bucket');
			expect(data.entries[0]).toHaveProperty('property_pincode');
		});

		it('caps limit at 50 even when a larger value is requested', async () => {
			mockVaultFind.mockReturnValue(makeFindChain([]));
			mockVaultCountDocuments.mockResolvedValue(0);

			const { url, locals } = makeGetReq('limit=500');
			const res = await GET({ url, locals } as any);
			const body = await readJson(res);
			const data = body.data as { pagination: { limit: number } };
			expect(data.pagination.limit).toBe(50);
		});

		it('defaults invalid / missing page+limit to safe defaults', async () => {
			mockVaultFind.mockReturnValue(makeFindChain([]));
			mockVaultCountDocuments.mockResolvedValue(0);

			const { url, locals } = makeGetReq('page=abc&limit=-1');
			const res = await GET({ url, locals } as any);
			const body = await readJson(res);
			const data = body.data as { pagination: { page: number; limit: number } };
			expect(data.pagination).toMatchObject({ page: 1, limit: 20 });
		});
	});

	describe('DELETE — consent withdrawal', () => {
		function makeDeleteReq(
			body: unknown,
			activeRole: 'dsa' | 'admin' | undefined = 'dsa'
		): {
			request: Request;
			locals: { user: { id: string; activeRole?: string } };
			getClientAddress: () => string;
		} {
			return {
				request: new Request('http://test/api/dsa/lead-vault', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(body)
				}),
				locals: { user: { id: 'test-user-id', activeRole } },
				getClientAddress: () => '127.0.0.1'
			};
		}

		const VAULT_ENTRY = {
			_id: new ObjectId(),
			source_case_id: 'HL-2026-0042',
			source_dsa_id: TEST_DSA_OID,
			loan_type: 'Home Loan',
			property_pincode: '400076',
			property_locality_bucket: 'Hiranandani Gardens Powai',
			closed_quarter: '2026-Q1'
		};

		it('400s when case_id is missing', async () => {
			const { request, locals } = makeDeleteReq({ reason: 'customer revoked' });
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(400);
		});

		it('400s when reason is missing', async () => {
			const { request, locals } = makeDeleteReq({ case_id: 'HL-2026-0042' });
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(400);
		});

		it('403s when activeRole is neither dsa nor admin', async () => {
			const { request, locals } = makeDeleteReq(
				{ case_id: 'HL-2026-0042', reason: 'test' },
				'rm' as any
			);
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(403);
		});

		it('404s when the vault entry does not exist', async () => {
			mockVaultFindOne.mockResolvedValue(null);
			const { request, locals } = makeDeleteReq({
				case_id: 'HL-2026-0042',
				reason: 'test'
			});
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(404);
			// Critically: no log row should be written for a nonexistent entry.
			expect(mockWithdrawalLogInsert).not.toHaveBeenCalled();
		});

		it('DSA caller: 403s when the entry belongs to a different DSA', async () => {
			mockVaultFindOne.mockResolvedValue({
				...VAULT_ENTRY,
				source_dsa_id: new ObjectId() // different DSA
			});
			const { request, locals } = makeDeleteReq({
				case_id: 'HL-2026-0042',
				reason: 'customer revoked'
			});
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);
			expect(res.status).toBe(403);
			expect(mockVaultDeleteOne).not.toHaveBeenCalled();
		});

		it('writes audit log BEFORE deleting the vault entry', async () => {
			// Spec: audit-log-first ordering. If delete fails afterwards we
			// have an orphan log row (acceptable); if log fails first we
			// have a deleted entry with no audit (privacy/compliance fail).
			mockVaultFindOne.mockResolvedValue(VAULT_ENTRY);
			const logOid = new ObjectId();
			let logInsertOrder = 0;
			let deleteOrder = 0;
			let callCounter = 0;
			mockWithdrawalLogInsert.mockImplementation(async () => {
				logInsertOrder = ++callCounter;
				return { insertedId: logOid };
			});
			mockVaultDeleteOne.mockImplementation(async () => {
				deleteOrder = ++callCounter;
				return { deletedCount: 1 };
			});

			const { request, locals } = makeDeleteReq({
				case_id: 'HL-2026-0042',
				reason: 'customer revoked'
			});
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(200);
			const body = await readJson(res);
			expect(body).toMatchObject({
				success: true,
				data: { deleted: true, log_id: logOid.toString() }
			});

			// Both must have run, log first.
			expect(logInsertOrder).toBeGreaterThan(0);
			expect(deleteOrder).toBeGreaterThan(0);
			expect(logInsertOrder).toBeLessThan(deleteOrder);
		});

		it('audit log captures only bucketed fields (no PII)', async () => {
			mockVaultFindOne.mockResolvedValue(VAULT_ENTRY);
			mockWithdrawalLogInsert.mockResolvedValue({ insertedId: new ObjectId() });
			mockVaultDeleteOne.mockResolvedValue({ deletedCount: 1 });

			const { request, locals } = makeDeleteReq({
				case_id: 'HL-2026-0042',
				reason: 'DPDP §13 erasure — customer email'
			});
			await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			const logged = mockWithdrawalLogInsert.mock.calls[0][0];
			expect(logged.deleted_snapshot).toEqual({
				loan_type: 'Home Loan',
				property_pincode: '400076',
				property_locality_bucket: 'Hiranandani Gardens Powai',
				closed_quarter: '2026-Q1'
			});
			expect(logged.deleted_snapshot).not.toHaveProperty('consent_ref');
			expect(logged.deleted_snapshot).not.toHaveProperty('source_dsa_id');
			expect(logged.deleted_snapshot).not.toHaveProperty('property_price_bucket');
			// The reason text is captured as supplied (for audit lookup).
			expect(logged.reason).toBe('DPDP §13 erasure — customer email');
			// withdrawn_by encodes role + user id for cross-actor erasure tracking.
			expect(logged.withdrawn_by).toBe('dsa:test-user-id');
		});

		it('admin caller can delete entries from any DSA (escalated erasure)', async () => {
			// Entry belongs to a different DSA — admin caller should still succeed.
			mockVaultFindOne.mockResolvedValue({
				...VAULT_ENTRY,
				source_dsa_id: new ObjectId()
			});
			mockWithdrawalLogInsert.mockResolvedValue({ insertedId: new ObjectId() });
			mockVaultDeleteOne.mockResolvedValue({ deletedCount: 1 });

			const { request, locals } = makeDeleteReq(
				{ case_id: 'HL-2026-0042', reason: 'admin escalation' },
				'admin'
			);
			const res = await DELETE({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(200);
			const body = await readJson(res);
			expect(body).toMatchObject({ success: true, data: { deleted: true } });
			// withdrawn_by reflects admin role.
			const logged = mockWithdrawalLogInsert.mock.calls[0][0];
			expect(logged.withdrawn_by).toBe('admin:test-user-id');
		});
	});

	describe('happy path', () => {
		it('writes the bucketed entry and returns the new vault_entry_id', async () => {
			mockCasesFindOne.mockResolvedValue(makeCase());
			mockVaultFindOne.mockResolvedValue(null);
			mockFormSnapshotsFindOne.mockResolvedValue({ payload: HAPPY_PAYLOAD });
			const insertedOid = new ObjectId();
			mockVaultInsertOne.mockResolvedValue({ insertedId: insertedOid });

			const { request, locals } = makeRequest({ case_id: 'HL-2026-0042' });
			const res = await POST({ request, locals, getClientAddress: () => '127.0.0.1' } as any);

			expect(res.status).toBe(200);
			const body = await readJson(res);
			expect(body).toMatchObject({
				success: true,
				data: { vault_entry_id: insertedOid.toString() }
			});

			// Confirm the inserted shape was fully bucketed (privacy contract).
			expect(mockVaultInsertOne).toHaveBeenCalledTimes(1);
			const inserted = mockVaultInsertOne.mock.calls[0][0];
			expect(inserted).toMatchObject({
				source_case_id: 'HL-2026-0042',
				loan_type: 'Home Loan',
				closed_quarter: '2026-Q1',
				lender_selected: 'HDFC',
				property_pincode: '400076',
				property_price_bucket: 18_740_000, // floored to ₹10k
				property_locality_bucket: 'Hiranandani Gardens Powai',
				consent_ref: 'consent-xyz'
			});
			// `created_at` should be set by the handler.
			expect(inserted.created_at).toBeInstanceOf(Date);
		});
	});
});
