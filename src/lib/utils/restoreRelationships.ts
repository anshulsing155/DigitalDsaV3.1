/**
 * Relationship Restoration Utility
 *
 * When an applicant is restored from the recovery bin, this utility
 * attempts to re-create their saved relationships with existing applicants.
 *
 * Flow:
 * 1. On delete → relationships are captured in `_savedRelationships` in recovery data
 * 2. On restore → this function reads `_savedRelationships` and re-creates valid ones
 *
 * Matching: First by applicant ID (stable if other person wasn't deleted),
 * then fallback by identity (name + gender for Individual, name for Company).
 *
 * Validation: Each relationship is checked against current applicant data
 * (gender, age, marital status) before being re-created.
 */

import { get } from 'svelte/store';
import {
	userRelationships,
	addRelationship
} from '$lib/components/relationship-capture/relationshipStore';
import { getRelationshipCategory } from '$lib/components/relationship-capture/categoryClassifier';
import { getReciprocalRelation } from '$lib/components/relationship-capture/reciprocalRelations';
import { checkPersonBValidity } from '$lib/components/relationship-capture/relationshipValidator';
import type { RelationType } from '$lib/components/relationship-capture/types';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SavedRelationshipEntry {
	relationType: string;
	category: string;
	/** Was the deleted applicant the 'from' or 'to' in the original relationship? */
	direction: 'from' | 'to';
	/** ID of the other applicant at time of deletion */
	otherApplicantId: string;
	/** Identity snapshot of the other applicant (for fallback matching) */
	otherIdentity: {
		fullName?: string;
		companyName?: string;
		gender?: string;
		age?: string | number;
		maritalStatus?: string;
		applicantType?: string;
	} | null;
}

// ─── Save (called before deleting) ──────────────────────────────────────

/**
 * Extract relationships for a soon-to-be-deleted applicant,
 * enriched with the other person's identity for fallback matching.
 */
export function captureRelationshipsForRecovery(
	applicantId: string,
	currentApplicants: Record<string, unknown>[]
): SavedRelationshipEntry[] {
	const rels = get(userRelationships);
	const applicantRels = rels.filter((r) => r.fromId === applicantId || r.toId === applicantId);

	if (applicantRels.length === 0) return [];

	// De-duplicate reciprocal pairs: only keep one direction per pair
	const seen = new Set<string>();
	const unique = applicantRels.filter((rel) => {
		const pairKey = [rel.fromId, rel.toId].sort().join('::');
		if (seen.has(pairKey)) return false;
		seen.add(pairKey);
		return true;
	});

	return unique.map((rel) => {
		const isFrom = rel.fromId === applicantId;
		const otherId = isFrom ? rel.toId : rel.fromId;
		const otherApplicant = currentApplicants.find((a: any) => a.id === otherId) as
			| Record<string, unknown>
			| undefined;

		return {
			relationType: rel.relationType,
			category: rel.category,
			direction: isFrom ? 'from' : 'to',
			otherApplicantId: otherId,
			otherIdentity: otherApplicant
				? {
						fullName: otherApplicant.fullName as string | undefined,
						companyName: otherApplicant.companyName as string | undefined,
						gender: otherApplicant.gender as string | undefined,
						age: otherApplicant.age as string | number | undefined,
						maritalStatus: otherApplicant.maritalStatus as string | undefined,
						applicantType: otherApplicant.applicantType as string | undefined
					}
				: null
		};
	});
}

// ─── Restore (called after restoring) ───────────────────────────────────

/**
 * Attempt to re-create relationships for a restored applicant.
 *
 * @param restoredApplicantId - The new ID of the restored applicant
 * @param restoredData - The full restored applicant data (needs gender, age, maritalStatus)
 * @param savedRelationships - The `_savedRelationships` array from recovery data
 * @param currentApplicants - Current `formState.applicants` (AFTER the restored applicant is added)
 * @returns Number of relationships successfully restored
 */
export function restoreRelationshipsForApplicant(
	restoredApplicantId: string,
	restoredData: Record<string, unknown>,
	savedRelationships: SavedRelationshipEntry[],
	currentApplicants: Record<string, unknown>[]
): number {
	if (!savedRelationships?.length) return 0;

	let restoredCount = 0;

	for (const saved of savedRelationships) {
		// Re-read store each iteration — addRelationship() mutates it synchronously
		const existingRels = get(userRelationships);

		// 1. Find the other person — try ID match first, then identity fallback
		let otherApplicant = currentApplicants.find(
			(a: any) => a.id === saved.otherApplicantId && a.id !== restoredApplicantId
		) as Record<string, unknown> | undefined;

		if (!otherApplicant && saved.otherIdentity) {
			otherApplicant = findByIdentity(saved.otherIdentity, restoredApplicantId, currentApplicants);
		}

		if (!otherApplicant || !(otherApplicant as any).id) continue;
		const otherId = (otherApplicant as any).id as string;

		// 2. Check if relationship already exists between these two
		const alreadyExists = existingRels.some(
			(r) =>
				(r.fromId === restoredApplicantId && r.toId === otherId) ||
				(r.fromId === otherId && r.toId === restoredApplicantId)
		);
		if (alreadyExists) continue;

		// 3. Determine direction
		const fromId = saved.direction === 'from' ? restoredApplicantId : otherId;
		const toId = saved.direction === 'from' ? otherId : restoredApplicantId;

		// Build minimal applicant objects for validation
		const personA = currentApplicants.find((a: any) => a.id === fromId) as any;
		const personB = currentApplicants.find((a: any) => a.id === toId) as any;
		if (!personA || !personB) continue;

		// 4. Validate the relationship still makes sense with current data
		const validity = checkPersonBValidity(
			personA,
			saved.relationType as RelationType,
			personB,
			currentApplicants as any[],
			existingRels
		);
		if (validity === 'invalid') continue; // Skip invalid, allow 'unlikely' (edge cases)

		// 5. Add the relationship
		const forwardRel = {
			id: `user-${fromId}-${toId}-${Date.now()}`,
			fromId,
			toId,
			relationType: saved.relationType as RelationType,
			category: getRelationshipCategory(saved.relationType as RelationType),
			source: 'user-defined' as const,
			createdAt: new Date()
		};
		addRelationship(forwardRel);

		// 6. Add reciprocal
		const reciprocalType = getReciprocalRelation(
			saved.relationType as RelationType,
			personB.gender
		);
		if (reciprocalType) {
			const reciprocalRel = {
				id: `user-${toId}-${fromId}-${Date.now() + 1}`,
				fromId: toId,
				toId: fromId,
				relationType: reciprocalType,
				category: getRelationshipCategory(reciprocalType),
				source: 'user-defined' as const,
				createdAt: new Date()
			};
			addRelationship(reciprocalRel);
		}

		restoredCount++;
	}

	return restoredCount;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Find a current applicant that matches the saved identity (fallback when ID doesn't match).
 * Uses name + gender for Individuals, name for Companies.
 */
function findByIdentity(
	identity: NonNullable<SavedRelationshipEntry['otherIdentity']>,
	excludeId: string,
	currentApplicants: Record<string, unknown>[]
): Record<string, unknown> | undefined {
	return currentApplicants.find((a: any) => {
		if (a.id === excludeId) return false;
		if (a.applicantType !== identity.applicantType) return false;

		if (a.applicantType === 'Individual') {
			const nameMatch =
				(a.fullName || '').trim().toLowerCase() === (identity.fullName || '').trim().toLowerCase();
			const genderMatch = (a.gender || '').toLowerCase() === (identity.gender || '').toLowerCase();
			return nameMatch && genderMatch;
		}

		if (a.applicantType === 'Company') {
			return (
				(a.companyName || '').trim().toLowerCase() ===
				(identity.companyName || '').trim().toLowerCase()
			);
		}

		return false;
	});
}
