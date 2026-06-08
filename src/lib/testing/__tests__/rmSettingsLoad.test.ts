/**
 * A.1 — RM Settings load state-splitting unit tests.
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §A.1.
 *
 * The bug was that the load collapsed "no profile" and "query threw" into one
 * error. These tests lock the three distinct outcomes:
 *   active profile → render (a); incomplete/null + RM role → render (b) setup;
 *   thrown query → render (c) retryable error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveRmDoc = vi.fn();

vi.mock('$lib/server/rmHelpers', () => ({
	resolveRmDoc: (...a: unknown[]) => mockResolveRmDoc(...a),
	// Pass-through shaper so the test asserts the load's branching, not mapping.
	shapeRmProfile: (doc: Record<string, any>) => ({
		name: doc.name ?? '',
		email: doc.email ?? '',
		rmOfficialEmail: doc.rmOfficialEmail ?? '',
		workingCity: doc.workingCity ?? '',
		bankName: doc.bankName ?? '',
		designation: doc.designation ?? '',
		mobileNumber: doc.mobileNumber,
		preferred_language: doc.preferred_language ?? 'en',
		profileStatus: doc.profileStatus ?? 'active',
		memberSince: ''
	})
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { load } from '../../../routes/dashboard/rm/settings/+page.server';

// The load only uses event.parent(). SvelteKit types the load return as
// `void | PageData`, so cast through a typed helper for assertions — the
// runtime always returns the object.
type LoadResult = {
	profile: { name?: string } | null;
	canSetup: boolean;
	profileError: boolean;
};
async function runLoad(user: unknown): Promise<LoadResult> {
	const event = { parent: async () => ({ user }) } as unknown as Parameters<typeof load>[0];
	return (await load(event)) as unknown as LoadResult;
}

beforeEach(() => vi.clearAllMocks());

describe('RM settings load', () => {
	it('returns the profile view for an active doc (render a)', async () => {
		mockResolveRmDoc.mockResolvedValueOnce({ name: 'Neha', profileStatus: 'active', mobileNumber: 1 });
		const res = await runLoad({ id: 'abc', mobileNumber: '1' });
		expect(res.profile?.name).toBe('Neha');
		expect(res.canSetup).toBe(false);
		expect(res.profileError).toBe(false);
	});

	it('flags canSetup for an incomplete stub (render b)', async () => {
		mockResolveRmDoc.mockResolvedValueOnce({ profileStatus: 'profile_incomplete', mobileNumber: 1 });
		const res = await runLoad({ id: 'abc', mobileNumber: '1' });
		expect(res.canSetup).toBe(true);
		expect(res.profileError).toBe(false);
	});

	it('flags canSetup with null profile when no doc exists (render b)', async () => {
		mockResolveRmDoc.mockResolvedValueOnce(null);
		const res = await runLoad({ id: 'abc', mobileNumber: '1' });
		expect(res.profile).toBeNull();
		expect(res.canSetup).toBe(true);
		expect(res.profileError).toBe(false);
	});

	it('flags profileError when the query throws — NOT a setup state (render c)', async () => {
		mockResolveRmDoc.mockRejectedValueOnce(new Error('DB down'));
		const res = await runLoad({ id: 'abc', mobileNumber: '1' });
		expect(res.profileError).toBe(true);
		expect(res.canSetup).toBe(false);
		expect(res.profile).toBeNull();
	});

	it('returns empty (no setup, no error) when there is no user', async () => {
		const res = await runLoad(null);
		expect(res.profile).toBeNull();
		expect(res.canSetup).toBe(false);
		expect(res.profileError).toBe(false);
	});
});
