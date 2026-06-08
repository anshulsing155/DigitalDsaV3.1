/**
 * C.5 — writeAuditLog helper unit test.
 *
 * Validates the shared audit-write helper used by every privileged admin
 * action (suspend, role change, impersonation, refund). Pre-C.5 the
 * codebase had two patterns: direct PolicyAuditLogs.insertOne calls (fine)
 * and hacky 'lender'/'lender_updated' rows for non-policy events (lossy —
 * the actual event was stashed in details.event). This helper makes the
 * shape uniform.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/database/mongo', () => {
	return {
		PolicyAuditLogs: {
			insertOne: vi.fn()
		}
	};
});

vi.mock('$lib/server/logger', () => ({
	default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}));

import { PolicyAuditLogs } from '$lib/database/mongo';
import logger from '$lib/server/logger';
import { writeAuditLog } from '$lib/server/auditLog';

describe('writeAuditLog — happy path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(PolicyAuditLogs.insertOne).mockResolvedValue({} as any);
	});

	it('writes a PolicyAuditLogs row with the supplied entry + a fresh created_at', async () => {
		await writeAuditLog({
			target_type: 'user',
			target_id: 'usr-123',
			action: 'user_suspended',
			actor_id: 'admin-1',
			actor_name: 'Pat Admin',
			actor_role: 'admin',
			details: { targetRole: 'dsa', is_suspended: true }
		});

		expect(PolicyAuditLogs.insertOne).toHaveBeenCalledTimes(1);
		const arg = vi.mocked(PolicyAuditLogs.insertOne).mock.calls[0][0] as any;
		expect(arg.target_type).toBe('user');
		expect(arg.target_id).toBe('usr-123');
		expect(arg.action).toBe('user_suspended');
		expect(arg.actor_id).toBe('admin-1');
		expect(arg.actor_name).toBe('Pat Admin');
		expect(arg.actor_role).toBe('admin');
		expect(arg.details).toEqual({ targetRole: 'dsa', is_suspended: true });
		expect(arg.created_at).toBeInstanceOf(Date);
	});

	it('defaults details to an empty object when not supplied', async () => {
		await writeAuditLog({
			target_type: 'user',
			target_id: 'usr-2',
			action: 'user_reactivated',
			actor_id: 'a',
			actor_name: 'A',
			actor_role: 'admin'
		});

		const arg = vi.mocked(PolicyAuditLogs.insertOne).mock.calls[0][0] as any;
		expect(arg.details).toEqual({});
	});

	it('accepts each of the new C.5 actions without TypeScript narrowing tricks', async () => {
		// Smoke test — if a future refactor narrows AuditAction and drops one of
		// these, TS would fail the build before this test ever runs. Keeping
		// the call sites here documents the intended action surface.
		const actions = [
			'user_suspended',
			'user_reactivated',
			'role_changed',
			'permission_granted',
			'permission_revoked',
			'impersonation_start',
			'impersonation_exit'
		] as const;
		for (const action of actions) {
			await writeAuditLog({
				target_type: 'user',
				target_id: 'u',
				action,
				actor_id: 'a',
				actor_name: 'A',
				actor_role: 'admin'
			});
		}
		expect(PolicyAuditLogs.insertOne).toHaveBeenCalledTimes(actions.length);
	});
});

describe('writeAuditLog — failure is non-fatal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('swallows insert errors and logs them at error level (privileged action must not block)', async () => {
		const boom = new Error('mongo connection refused');
		vi.mocked(PolicyAuditLogs.insertOne).mockRejectedValueOnce(boom);

		// Must NOT throw — the caller has already mutated state (suspend / role
		// change / etc.) and we can't reverse it. Audit gap is logged instead.
		await expect(
			writeAuditLog({
				target_type: 'user',
				target_id: 'usr-x',
				action: 'user_suspended',
				actor_id: 'a',
				actor_name: 'A',
				actor_role: 'admin'
			})
		).resolves.toBeUndefined();

		expect(vi.mocked(logger.error)).toHaveBeenCalledTimes(1);
		// The error log payload must include the audit context so an SRE can
		// reconstruct the gap from logs.
		const errorArg = vi.mocked(logger.error).mock.calls[0][0] as any;
		expect(errorArg.audit).toBeDefined();
		expect(errorArg.audit.target_id).toBe('usr-x');
		expect(errorArg.audit.action).toBe('user_suspended');
	});
});
