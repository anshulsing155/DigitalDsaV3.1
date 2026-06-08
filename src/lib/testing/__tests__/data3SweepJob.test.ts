/**
 * DATA-3 — Sweep-job contract.
 *
 * Exercises the candidate-collection + per-candidate processing pipeline
 * with hand-built case docs. The injection seams (cases / auditLogs /
 * overrides / imagekit / logger / now) let the test pass fakes for
 * every I/O leg — no Atlas, no ImageKit.
 *
 * Key scenarios:
 *   - Env flag off → observation only, no deletions
 *   - Candidate matches the gate + floor → audit row + ImageKit + Mongo update
 *   - Candidate has an active retention override → skipped_override
 *   - Candidate's case has unlocked since verified_at → skipped_gate
 *   - Permanent ImageKit failure → abandoned + state flipped, no further retries
 *   - Audit-row insert fails with mongo_error → ImageKit NEVER called
 */

import { describe, it, expect, vi } from 'vitest';
import { runSweep, type SweepDeps, type SweepLogger } from '$lib/server/data3/sweepJob';
import type { Case } from '$lib/types/case';

const NOW = new Date('2026-05-16T00:00:00.000Z');
const VERIFIED_AT = new Date('2026-04-01T00:00:00.000Z'); // 45d ago

function silentLogger(): SweepLogger {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function fakeCursor<T>(rows: T[]) {
	return {
		async *[Symbol.asyncIterator]() {
			for (const r of rows) yield r;
		}
	};
}

function makeCaseDoc(opts: {
	caseId: string;
	locked: boolean;
	docId?: string;
	extractionStatus?: NonNullable<
		NonNullable<Case['lender_applications']>[number]['document_checklist']
	>[number]['extraction_status'];
	verifiedAt?: Date | null;
	fileId?: string | null;
}): Partial<Case> {
	return {
		case_id: opts.caseId,
		lock: opts.locked
			? ({ is_locked: true } as Case['lock'])
			: ({ is_locked: false } as Case['lock']),
		lender_applications: [
			{
				lender_application_id: 'LA-1',
				lender_id: 'HDFC',
				lender_name: 'HDFC',
				status: 'draft' as never,
				status_history: [],
				document_checklist: [
					{
						doc_id: opts.docId ?? 'bank_statement_3m',
						doc_name: 'Bank Statement 3M',
						category: 'income',
						is_mandatory: true,
						status: 'uploaded',
						extraction_status: opts.extractionStatus ?? 'verified',
						verified_at: opts.verifiedAt === undefined ? VERIFIED_AT : (opts.verifiedAt ?? undefined),
						upload: opts.fileId === null
							? undefined
							: {
									file_url: `https://ik.imagekit.io/${opts.fileId ?? 'IK-abc'}`,
									file_id: opts.fileId ?? 'IK-abc',
									file_type: 'application/pdf',
									file_size: 102400,
									uploaded_at: new Date('2026-03-15T00:00:00.000Z')
								}
					}
				]
			}
		] as never
	};
}

function makeDeps(overrides: Partial<SweepDeps> = {}): SweepDeps {
	return {
		cases: {
			find: vi.fn(() => fakeCursor<Partial<Case>>([])) as never,
			updateOne: vi.fn(async () => ({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null
			})) as never
		},
		auditLogs: {
			insertOne: vi.fn(async () => ({ acknowledged: true, insertedId: 'audit-1' as never })),
			updateOne: vi.fn(async () => ({
				acknowledged: true,
				matchedCount: 1,
				modifiedCount: 1,
				upsertedCount: 0,
				upsertedId: null
			})),
			findOne: vi.fn(async () => null)
		} as never,
		overrides: {
			findOne: vi.fn(async () => null)
		} as never,
		imagekit: { files: { delete: vi.fn(async () => ({ ok: true })) } },
		logger: silentLogger(),
		enabledFlag: 'true',
		now: NOW,
		sleep: vi.fn(async () => {}),
		...overrides
	};
}

describe('runSweep — env flag short-circuit', () => {
	it('does NOT call ImageKit when flag is unset', async () => {
		const deps = makeDeps({
			enabledFlag: undefined,
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: vi.fn() as never
			}
		});

		const result = await runSweep(deps);

		expect(result.enabled).toBe(false);
		expect(result.candidates).toBe(1); // still counted for visibility
		expect(result.deleted).toBe(0);
		expect(deps.imagekit.files.delete).not.toHaveBeenCalled();
	});

	it('does NOT call ImageKit when flag is anything other than "true"', async () => {
		const deps = makeDeps({ enabledFlag: 'yes' });
		const result = await runSweep(deps);
		expect(result.enabled).toBe(false);
		expect(deps.imagekit.files.delete).not.toHaveBeenCalled();
	});

	it('DOES call ImageKit when flag is exactly "true"', async () => {
		const imagekitDelete = vi.fn(async () => ({ ok: true }));
		const deps = makeDeps({
			enabledFlag: 'true',
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: vi.fn(async () => ({
					acknowledged: true,
					matchedCount: 1,
					modifiedCount: 1,
					upsertedCount: 0,
					upsertedId: null
				})) as never
			},
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.enabled).toBe(true);
		expect(imagekitDelete).toHaveBeenCalledOnce();
		expect(result.deleted).toBe(1);
	});
});

describe('runSweep — candidate filtering', () => {
	it('skips checklist rows that are not in `verified` state', async () => {
		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([
						makeCaseDoc({
							caseId: 'C-1',
							locked: true,
							extractionStatus: 'extracted'
						})
					])
				) as never,
				updateOne: vi.fn() as never
			}
		});

		const result = await runSweep(deps);
		expect(result.candidates).toBe(0);
		expect(deps.imagekit.files.delete).not.toHaveBeenCalled();
	});

	it('skips rows whose retention floor has not elapsed', async () => {
		const recentVerify = new Date(NOW.getTime() - 10 * 86400 * 1000); // 10d ago, < 30d financial floor
		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([
						makeCaseDoc({ caseId: 'C-1', locked: true, verifiedAt: recentVerify })
					])
				) as never,
				updateOne: vi.fn() as never
			}
		});

		const result = await runSweep(deps);
		expect(result.candidates).toBe(0);
	});

	it('skips rows missing file_id (already deleted previously)', async () => {
		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([
						makeCaseDoc({ caseId: 'C-1', locked: true, fileId: null })
					])
				) as never,
				updateOne: vi.fn() as never
			}
		});

		const result = await runSweep(deps);
		expect(result.candidates).toBe(0);
	});

	it('respects the batchLimit', async () => {
		const docs = Array.from({ length: 5 }, (_, i) =>
			makeCaseDoc({ caseId: `C-${i}`, locked: true })
		);
		const deps = makeDeps({
			cases: {
				find: vi.fn(() => fakeCursor<Partial<Case>>(docs)) as never,
				updateOne: vi.fn(async () => ({
					acknowledged: true,
					matchedCount: 1,
					modifiedCount: 1,
					upsertedCount: 0,
					upsertedId: null
				})) as never
			},
			batchLimit: 2
		});

		const result = await runSweep(deps);
		expect(result.candidates).toBe(2);
		expect(result.deleted).toBe(2);
	});
});

describe('runSweep — per-candidate processing', () => {
	it('skips when an active retention override exists', async () => {
		const overrideFind = vi.fn(async () => ({
			case_id: 'C-1',
			document_checklist_id: 'bank_statement_3m',
			is_active: true,
			expires_at: new Date('2027-01-01')
		}));
		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: vi.fn() as never
			},
			overrides: { findOne: overrideFind } as never
		});

		const result = await runSweep(deps);

		expect(result.skipped_override).toBe(1);
		expect(result.deleted).toBe(0);
		expect(deps.imagekit.files.delete).not.toHaveBeenCalled();
	});

	it('skips when G4 fails — case has unlocked since verified_at', async () => {
		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: false })])
				) as never,
				updateOne: vi.fn() as never
			}
		});

		const result = await runSweep(deps);

		expect(result.skipped_gate).toBe(1);
		expect(result.deleted).toBe(0);
		expect(deps.imagekit.files.delete).not.toHaveBeenCalled();
	});

	it('happy path: success → audit row + Mongo update + counter increment', async () => {
		const auditInsert = vi.fn(async () => ({
			acknowledged: true,
			insertedId: 'audit-1' as never
		}));
		const auditUpdate = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));
		const casesUpdate = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));
		const imagekitDelete = vi.fn(async () => ({ ok: true }));

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: casesUpdate as never
			},
			auditLogs: {
				insertOne: auditInsert,
				updateOne: auditUpdate,
				findOne: vi.fn(async () => null)
			} as never,
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.deleted).toBe(1);
		expect(auditInsert).toHaveBeenCalledOnce();
		expect(imagekitDelete).toHaveBeenCalledOnce();
		expect(auditUpdate).toHaveBeenCalledOnce();
		expect(casesUpdate).toHaveBeenCalledOnce();

		// Audit row was inserted BEFORE ImageKit was called (audit-log-first).
		expect(auditInsert.mock.invocationCallOrder[0]).toBeLessThan(
			imagekitDelete.mock.invocationCallOrder[0]
		);

		// Cases update unsets file_id + file_url
		const updateCall = casesUpdate.mock.calls[0] as unknown as [
			unknown,
			{ $unset?: Record<string, unknown>; $set?: Record<string, unknown> }
		];
		expect(updateCall[1].$unset).toBeDefined();
		expect(updateCall[1].$set).toMatchObject({
			'lender_applications.$[la].document_checklist.$[dc].extraction_status': 'deleted'
		});
	});

	it('ImageKit 404 → already_deleted counter, still updates case', async () => {
		const imagekitDelete = vi.fn(async () => {
			const e = new Error('not found') as Error & { status: number };
			e.status = 404;
			throw e;
		});
		const casesUpdate = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: casesUpdate as never
			},
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.already_deleted).toBe(1);
		expect(result.deleted).toBe(0);
		expect(casesUpdate).toHaveBeenCalledOnce();
	});

	it('permanent 401 failure → abandoned, marks case row', async () => {
		const imagekitDelete = vi.fn(async () => {
			const e = new Error('unauthorized') as Error & { status: number };
			e.status = 401;
			throw e;
		});
		const casesUpdate = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: casesUpdate as never
			},
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.abandoned).toBe(1);
		expect(result.deleted).toBe(0);

		// Case row marked deletion_abandoned, but file_id NOT unset.
		const update = casesUpdate.mock.calls[0] as unknown as [
			unknown,
			{ $unset?: Record<string, unknown>; $set: Record<string, unknown> }
		];
		expect(update[1].$set).toMatchObject({
			'lender_applications.$[la].document_checklist.$[dc].extraction_status':
				'deletion_abandoned'
		});
		expect(update[1].$unset).toBeUndefined();
	});

	it('duplicate-key on audit insert → skipped_gate, no ImageKit call', async () => {
		const dupErr = new Error('E11000') as Error & { code: number };
		dupErr.code = 11000;
		const auditInsert = vi.fn(async () => {
			throw dupErr;
		});
		const imagekitDelete = vi.fn();

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: vi.fn() as never
			},
			auditLogs: {
				insertOne: auditInsert,
				updateOne: vi.fn(),
				findOne: vi.fn(async () => null)
			} as never,
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.skipped_gate).toBe(1);
		expect(imagekitDelete).not.toHaveBeenCalled();
	});

	it('mongo error on audit insert → ImageKit NEVER called (audit-log-first guarantee)', async () => {
		const mongoErr = new Error('Atlas timeout');
		const auditInsert = vi.fn(async () => {
			throw mongoErr;
		});
		const imagekitDelete = vi.fn();

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([makeCaseDoc({ caseId: 'C-1', locked: true })])
				) as never,
				updateOne: vi.fn() as never
			},
			auditLogs: {
				insertOne: auditInsert,
				updateOne: vi.fn(),
				findOne: vi.fn(async () => null)
			} as never,
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.errors).toBe(1);
		expect(imagekitDelete).not.toHaveBeenCalled();
	});
});

describe('runSweep — aggregation', () => {
	it('counts deleted + abandoned + skipped independently across a batch', async () => {
		const verifiedDoc = makeCaseDoc({ caseId: 'C-good', locked: true });
		const unlockedDoc = makeCaseDoc({ caseId: 'C-unlocked', locked: false });

		let deleteCallNum = 0;
		const imagekitDelete = vi.fn(async () => {
			deleteCallNum++;
			if (deleteCallNum === 1) return { ok: true };
			throw Object.assign(new Error('500'), { status: 500 });
		});

		const deps = makeDeps({
			cases: {
				find: vi.fn(() =>
					fakeCursor<Partial<Case>>([verifiedDoc, unlockedDoc])
				) as never,
				updateOne: vi.fn(async () => ({
					acknowledged: true,
					matchedCount: 1,
					modifiedCount: 1,
					upsertedCount: 0,
					upsertedId: null
				})) as never
			},
			imagekit: { files: { delete: imagekitDelete } }
		});

		const result = await runSweep(deps);

		expect(result.candidates).toBe(2);
		expect(result.deleted).toBe(1);
		expect(result.skipped_gate).toBe(1);
	});
});
