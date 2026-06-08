/**
 * A.1 — RM profile auto-provisioning + shaping unit tests.
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §A.1.
 *
 * Covers `ensureRmProfile` (idempotent stub creation for role-granted RMs)
 * and `shapeRmProfile` (the single profile-shaping source of truth).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockInsertOne = vi.fn();
const mockFindUserByMobile = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	rmApplications: {
		findOne: (...a: unknown[]) => mockFindOne(...a),
		updateOne: (...a: unknown[]) => mockUpdateOne(...a),
		insertOne: (...a: unknown[]) => mockInsertOne(...a)
	}
}));

vi.mock('$lib/server/csfle/index', () => ({
	findUserByMobile: (...a: unknown[]) => mockFindUserByMobile(...a),
	// decrypt/encrypt are pass-throughs in the test (CSFLE off semantics).
	decryptUserPii: (doc: unknown) => doc,
	encryptUserPii: async (obj: unknown) => obj
}));

vi.mock('$lib/config/lenderDomains', () => ({
	getLenderNameFromDomain: (email: string) => (email.includes('icici') ? 'ICICI Bank' : '')
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { ensureRmProfile, shapeRmProfile, createProxyRmStub } from '$lib/server/rmHelpers';

const USER = {
	id: new ObjectId().toString(),
	mobileNumber: '9811556664',
	email: 'someone@icicibank.com'
} as unknown as NonNullable<App.Locals['user']>;

beforeEach(() => {
	vi.clearAllMocks();
});

describe('ensureRmProfile', () => {
	it('returns the existing doc untouched when one is present (no insert)', async () => {
		const existing = { _id: new ObjectId(), name: 'Neha', profileStatus: 'active' };
		mockFindOne.mockResolvedValueOnce(existing);

		const result = await ensureRmProfile(USER);

		expect(result).toBe(existing);
		expect(mockUpdateOne).not.toHaveBeenCalled();
	});

	it('creates an idempotent profile_incomplete stub when none exists', async () => {
		// resolveRmDoc #1 (start): _id miss + mobile miss → null
		mockFindOne.mockResolvedValueOnce(null);
		mockFindUserByMobile.mockResolvedValueOnce(null);
		// resolveRmDoc #2 (after upsert): the freshly-created stub
		const stub = { _id: new ObjectId(USER.id), profileStatus: 'profile_incomplete', name: '' };
		mockFindOne.mockResolvedValueOnce(stub);

		const result = await ensureRmProfile(USER);

		expect(result).toBe(stub);
		expect(mockUpdateOne).toHaveBeenCalledTimes(1);
		const [filter, update, options] = mockUpdateOne.mock.calls[0];
		// Keyed by _id (admin-mirror id), upsert, and uses $setOnInsert (idempotent).
		expect((filter as { _id: ObjectId })._id.toString()).toBe(USER.id);
		expect(options).toEqual({ upsert: true });
		expect(update).toHaveProperty('$setOnInsert');
		const ins = (update as { $setOnInsert: Record<string, unknown> }).$setOnInsert;
		expect(ins.profileStatus).toBe('profile_incomplete');
		expect(ins.provisioned_by).toBe('auto_role_grant');
		expect(ins.role).toBe('rm');
		// No $set — must not overwrite an existing doc's editable fields.
		expect(update).not.toHaveProperty('$set');
	});

	it('falls back to re-resolving when the upsert throws (dup-key race)', async () => {
		mockFindOne.mockResolvedValueOnce(null);
		mockFindUserByMobile.mockResolvedValueOnce(null);
		mockUpdateOne.mockRejectedValueOnce(new Error('E11000 duplicate key'));
		const winner = { _id: new ObjectId(USER.id), profileStatus: 'profile_incomplete' };
		mockFindOne.mockResolvedValueOnce(winner);

		const result = await ensureRmProfile(USER);
		expect(result).toBe(winner); // didn't throw; re-resolved to the racing insert
	});
});

describe('createProxyRmStub (A.2 admin-proxy)', () => {
	it('reuses an existing RM matched by mobile (idempotent, no insert)', async () => {
		mockFindUserByMobile.mockResolvedValueOnce({ _id: new ObjectId(), name: 'Existing RM' });
		const result = await createProxyRmStub({
			name: 'Whatever',
			bankName: 'SBI',
			mobile: 9876543210
		});
		expect(result.isNew).toBe(false);
		expect(result.rmName).toBe('Existing RM');
		expect(mockInsertOne).not.toHaveBeenCalled();
	});

	it('inserts an admin_proxy / profile_incomplete stub when none exists', async () => {
		mockFindUserByMobile.mockResolvedValueOnce(null);
		mockInsertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

		const result = await createProxyRmStub({
			name: 'Mr Sharma',
			bankName: 'SBI',
			mobile: 9811556664,
			email: 'sharma@sbi.co.in'
		});

		expect(result.isNew).toBe(true);
		expect(result.rmName).toBe('Mr Sharma');
		expect(mockInsertOne).toHaveBeenCalledTimes(1);
		const doc = mockInsertOne.mock.calls[0][0] as Record<string, unknown>;
		expect(doc.provisioned_by).toBe('admin_proxy');
		expect(doc.profileStatus).toBe('profile_incomplete');
		expect(doc.role).toBe('rm');
		expect(doc.bankName).toBe('SBI');
		expect(doc.mobileNumber).toBe(9811556664);
	});
});

describe('shapeRmProfile', () => {
	it('maps fields and defaults profileStatus to active for legacy docs', () => {
		const view = shapeRmProfile({
			name: 'Neha Verma',
			rmOfficialEmail: 'neha@icicibank.com',
			bankName: 'ICICI Bank',
			workingCity: 'Mumbai',
			designation: 'RM',
			mobileNumber: 9716015757,
			createdAt: new Date('2026-05-10')
		});
		expect(view.name).toBe('Neha Verma');
		expect(view.rmOfficialEmail).toBe('neha@icicibank.com');
		expect(view.bankName).toBe('ICICI Bank');
		expect(view.profileStatus).toBe('active'); // no field → legacy active
		expect(view.memberSince).toBe(new Date('2026-05-10').toISOString());
	});

	it('derives bankName from the official-email domain when bankName is empty', () => {
		const view = shapeRmProfile({
			name: '',
			rmOfficialEmail: 'rm@icicibank.com',
			bankName: '',
			mobileNumber: 9811556664,
			profileStatus: 'profile_incomplete'
		});
		expect(view.bankName).toBe('ICICI Bank'); // from getLenderNameFromDomain
		expect(view.profileStatus).toBe('profile_incomplete');
	});
});
