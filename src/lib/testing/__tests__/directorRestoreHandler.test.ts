/**
 * Director restore payload — Issue #2 / Option B fallback.
 *
 * Ownership % is restored when the recovered and target companies match by:
 *   (a) UUID, OR
 *   (b) name + entity type (case-insensitive)  ← the Option B fallback
 *
 * The fallback exists because company UUIDs can drift between save and restore
 * (e.g. a fresh form load regenerates IDs), but the company is "the same"
 * from the DSA's perspective.
 */

import { describe, it, expect } from 'vitest';
import { buildDirectorRestorePayload } from '$lib/utils/directorRestoreHandler';

const baseMatchData = {
	fullName: 'Anuj Sharma',
	gender: 'Male',
	age: 33,
	maritalStatus: 'Single',
	isNRI: 'No',
	location: 'same_city',
	ownershipPercent: '50',
	linkedCompanyId: 'company-uuid-OLD',
	linkedCompanyIds: ['company-uuid-OLD']
};

describe('buildDirectorRestorePayload — ownership restore matching', () => {
	it('restores ownership when target company UUID matches', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-OLD', name: 'DDSA Pvt Ltd', entityType: 'Private Limited' },
			{ name: 'irrelevant', entityType: 'Doesnt-matter' }
		);
		expect(payload.data.ownershipPercent).toBe('50');
		expect(payload.lockedFields).toContain('ownershipPercent');
	});

	it('restores ownership via Option B fallback when name + entity type match (different UUID)', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			// Target company has a fresh UUID but same name + entity type
			{ id: 'company-uuid-NEW', name: 'DDSA Pvt Ltd', entityType: 'Private Limited' },
			{ name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBe('50');
		expect(payload.lockedFields).toContain('ownershipPercent');
	});

	it('matches by name + entity type case-insensitively', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW', name: 'ddsa pvt ltd', entityType: 'PRIVATE LIMITED' },
			{ name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBe('50');
	});

	it('does NOT restore ownership when target company name differs', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW', name: 'Other Company', entityType: 'Private Limited' },
			{ name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBeUndefined();
		expect(payload.lockedFields).not.toContain('ownershipPercent');
	});

	it('does NOT restore ownership when entity type differs (e.g. Pvt Ltd → LLP)', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW', name: 'DDSA Pvt Ltd', entityType: 'LLP' },
			{ name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBeUndefined();
	});

	it('does NOT restore ownership when target context lacks name/entity (only UUID provided)', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW' },
			{ name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBeUndefined();
	});

	it('does NOT restore ownership when recovered context is absent', () => {
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW', name: 'DDSA Pvt Ltd', entityType: 'Private Limited' }
			// no recoveredCompany arg
		);
		expect(payload.data.ownershipPercent).toBeUndefined();
	});

	it('still restores all non-ownership fields regardless of company match', () => {
		// Different company entirely → ownership skipped, but personal fields restore.
		const payload = buildDirectorRestorePayload(
			baseMatchData,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-NEW', name: 'Completely Different Co', entityType: 'LLP' }
		);
		expect(payload.data.fullName).toBe('Anuj Sharma');
		expect(payload.data.gender).toBe('Male');
		expect(payload.data.age).toBe('33');
		expect(payload.data.maritalStatus).toBe('Single');
		expect(payload.data.isNRI).toBe('No');
		expect(payload.lockedFields).toEqual(
			expect.arrayContaining(['gender', 'age', 'maritalStatus', 'isNRI'])
		);
		expect(payload.data.ownershipPercent).toBeUndefined();
	});

	it('handles linkedCompanyIds plural form for UUID match', () => {
		const matchWithMultipleLinks = {
			...baseMatchData,
			linkedCompanyId: 'company-uuid-OTHER',
			linkedCompanyIds: ['company-uuid-OTHER', 'company-uuid-TARGET']
		};
		const payload = buildDirectorRestorePayload(
			matchWithMultipleLinks,
			'Anuj Sharma',
			'match-uuid',
			{ id: 'company-uuid-TARGET', name: 'TargetCo', entityType: 'Private Limited' }
		);
		expect(payload.data.ownershipPercent).toBe('50');
	});
});
