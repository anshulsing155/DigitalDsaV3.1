/**
 * DATA-2 — grace-period sweep unit tests.
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §9 + §12.
 *
 * Audit-log-first ordering is the privacy-load-bearing contract: a
 * hard-delete that lands before its audit row is a compliance failure.
 */

import { describe, it, expect, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { runGracePeriodSweep } from '$lib/server/data2/gracePeriodSweep';
import type { OutreachVaultEntry } from '$lib/server/data2/types';

const DSA = new ObjectId();

function makeRevokedEntry(graceEnd: Date): OutreachVaultEntry {
	return {
		_id: new ObjectId(),
		dsa_id: DSA,
		case_id: 'HL-2026-001',
		mobile: 'encrypted-binary',
		loan_profile: {
			loan_type: 'Home Loan',
			lender_id: 'hdfc-bank',
			lender_name: 'HDFC',
			sanctioned_amount: 5_000_000,
			sanctioned_roi: 9.5,
			tenure_months: 240
		},
		consent_doc_ref: {
			imagekit_file_id: 'ik-file-1',
			imagekit_url: 'https://ik/1',
			template_version: 'v1',
			uploaded_at: new Date('2026-01-01')
		},
		consent_signed_at: new Date('2026-01-01'),
		revocation_token: 'a'.repeat(32),
		consent_status: 'revoked',
		revoked_at: new Date('2026-02-19'),
		revoked_by: 'dsa',
		grace_period_ends_at: graceEnd,
		created_at: new Date('2026-01-01'),
		updated_at: new Date('2026-02-19')
	};
}

function makeMockVault(entries: OutreachVaultEntry[]) {
	const calls: { op: string; arg: any }[] = [];
	return {
		find: (filter: any) => ({
			limit: () => ({
				toArray: async () => {
					calls.push({ op: 'find', arg: filter });
					return entries.filter(
						(e) =>
							e.consent_status === filter.consent_status &&
							e.grace_period_ends_at! <= filter.grace_period_ends_at.$lte
					);
				}
			})
		}),
		deleteOne: vi.fn(async (filter: any) => {
			calls.push({ op: 'deleteOne', arg: filter });
			return { deletedCount: 1 };
		}),
		_calls: calls
	} as any;
}

function makeMockRevLog() {
	const calls: { op: string; filter: any; update: any }[] = [];
	return {
		updateOne: vi.fn(async (filter: any, update: any) => {
			calls.push({ op: 'updateOne', filter, update });
			return { matchedCount: 0, upsertedCount: 1 };
		}),
		_calls: calls
	} as any;
}

describe('runGracePeriodSweep — happy path', () => {
	it('hard-deletes a revoked entry past its grace period', async () => {
		const now = new Date('2026-05-20');
		const entry = makeRevokedEntry(new Date('2026-05-19')); // grace ended yesterday
		const vault = makeMockVault([entry]);
		const revLog = makeMockRevLog();
		const imagekit = {
			files: { delete: vi.fn(async () => ({ status: 'success' })) }
		};

		const result = await runGracePeriodSweep({
			vault,
			revocationLog: revLog,
			imagekit,
			now,
			sleep: async () => {}
		});

		expect(result.processed).toBe(1);
		expect(result.hard_deleted).toBe(1);
		expect(result.errored).toBe(0);
		expect(imagekit.files.delete).toHaveBeenCalledWith('ik-file-1');
		expect(vault.deleteOne).toHaveBeenCalledTimes(1);
	});

	it('writes the audit row BEFORE deleting the vault doc (audit-first ordering)', async () => {
		const now = new Date('2026-05-20');
		const entry = makeRevokedEntry(new Date('2026-05-19'));
		const vault = makeMockVault([entry]);
		const revLog = makeMockRevLog();
		const imagekit = {
			files: { delete: vi.fn(async () => ({ status: 'success' })) }
		};

		await runGracePeriodSweep({
			vault,
			revocationLog: revLog,
			imagekit,
			now,
			sleep: async () => {}
		});

		// Order across the two mocks: first call to revLog must happen before
		// the deleteOne on vault. We check via mock invocation order.
		const revLogFirstCallOrder = (revLog.updateOne as any).mock.invocationCallOrder[0];
		const vaultDeleteCallOrder = (vault.deleteOne as any).mock.invocationCallOrder[0];
		expect(revLogFirstCallOrder).toBeLessThan(vaultDeleteCallOrder);
	});

	it('does NOT hard-delete entries whose grace period has not ended', async () => {
		const now = new Date('2026-05-20');
		const entry = makeRevokedEntry(new Date('2026-05-21')); // grace ends TOMORROW
		const vault = makeMockVault([entry]);
		const revLog = makeMockRevLog();
		const imagekit = {
			files: { delete: vi.fn(async () => ({ status: 'success' })) }
		};

		const result = await runGracePeriodSweep({
			vault,
			revocationLog: revLog,
			imagekit,
			now,
			sleep: async () => {}
		});

		expect(result.processed).toBe(0);
		expect(result.hard_deleted).toBe(0);
		expect(vault.deleteOne).not.toHaveBeenCalled();
	});
});

describe('runGracePeriodSweep — ImageKit outcomes', () => {
	it('treats ImageKit 404 (already_deleted) as success — still hard-deletes the vault entry', async () => {
		const now = new Date('2026-05-20');
		const entry = makeRevokedEntry(new Date('2026-05-19'));
		const vault = makeMockVault([entry]);
		const revLog = makeMockRevLog();
		// 404 from ImageKit
		const imagekit = {
			files: {
				delete: vi.fn(async () => {
					const err: any = new Error('Not Found');
					err.status = 404;
					throw err;
				})
			}
		};

		const result = await runGracePeriodSweep({
			vault,
			revocationLog: revLog,
			imagekit,
			now,
			sleep: async () => {}
		});

		expect(result.hard_deleted).toBe(1);
		expect(result.imagekit_already_gone).toBe(1);
	});

	it('keeps the vault entry when ImageKit delete is abandoned (transient failures retried)', async () => {
		const now = new Date('2026-05-20');
		const entry = makeRevokedEntry(new Date('2026-05-19'));
		const vault = makeMockVault([entry]);
		const revLog = makeMockRevLog();
		// Permanent 500 — DATA-3's retry classifier treats 5xx as transient,
		// gives up after the retry budget, and reports kind: 'abandoned'.
		const imagekit = {
			files: {
				delete: vi.fn(async () => {
					const err: any = new Error('Internal error');
					err.status = 500;
					throw err;
				})
			}
		};

		const result = await runGracePeriodSweep({
			vault,
			revocationLog: revLog,
			imagekit,
			now,
			sleep: async () => {} // skip the real backoff
		});

		expect(result.imagekit_abandoned).toBe(1);
		expect(result.hard_deleted).toBe(0); // vault entry kept for next sweep retry
		expect(vault.deleteOne).not.toHaveBeenCalled();
	});
});
