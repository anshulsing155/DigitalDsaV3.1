/**
 * Religion & Caste Consistency Check
 * ═══════════════════════════════════════════════════════════════════
 * Validates that blood-related applicants share the same religion
 * and caste category. For example:
 *   - Muslim father → children must be Muslim
 *   - SC/ST mother → children must be SC/ST (not General)
 *
 * Non-blood relationships (spouse, in-laws, friends) are exempt —
 * inter-religious marriages are valid.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { Relationship } from './types';

// ── Blood relation types where religion/caste MUST be consistent ──
const BLOOD_RELATION_TYPES: ReadonlySet<string> = new Set([
	// Parent-child
	'Father of',
	'Mother of',
	'Son of',
	'Daughter of',
	// Siblings
	'Brother of',
	'Sister of',
	// Grandparent-grandchild
	'Grandfather of',
	'Grandmother of',
	'Grandson of',
	'Granddaughter of',
	// Extended blood family
	'Uncle of',
	'Aunt of',
	'Nephew of',
	'Niece of',
	'Cousin of'
]);

// ── Display labels for religion values ──
const RELIGION_LABELS: Record<string, string> = {
	hindu: 'Hindu',
	muslim: 'Muslim',
	christian: 'Christian',
	sikh: 'Sikh',
	buddhist_jain: 'Buddhist / Jain',
	others: 'Others'
};

// ── Display labels for caste category values ──
const CASTE_LABELS: Record<string, string> = {
	General: 'General',
	OBC: 'OBC',
	SC: 'SC',
	ST: 'ST'
};

export interface ReligionConflict {
	conflictWithId: string;
	conflictWithName: string;
	relationType: string;
	thisValue: string;
	otherValue: string;
	field: 'religion' | 'casteCategory';
	message: string;
}

interface ApplicantInfo {
	id: string;
	fullName?: string;
	religion?: string;
	casteCategory?: string;
	applicantType?: string;
}

/**
 * Format a relationship type for display in error messages.
 * "Father of" → "Father", "Daughter of" → "Daughter"
 */
function formatRelationType(relationType: string): string {
	return relationType.replace(/ of$/, '');
}

function getReligionLabel(value: string): string {
	return RELIGION_LABELS[value] ?? value;
}

function getCasteLabel(value: string): string {
	return CASTE_LABELS[value] ?? value;
}

/**
 * Checks religion and caste consistency among blood-related applicants.
 *
 * @param applicants - Full form applicants array (from formState.applicants)
 * @param relationships - All relationships (user-defined + reciprocals)
 * @returns Map of applicantId → array of conflicts
 *
 * @example
 * ```ts
 * const conflicts = checkReligionConsistency(formState.applicants, [...$userRelationships, ...$userReciprocalRelationships]);
 * const applicantConflicts = conflicts.get(applicant.id) ?? [];
 * const hasReligionError = applicantConflicts.some(c => c.field === 'religion');
 * ```
 */
export function checkReligionConsistency(
	applicants: ApplicantInfo[],
	relationships: Relationship[]
): Map<string, ReligionConflict[]> {
	const conflicts = new Map<string, ReligionConflict[]>();

	// Build applicant lookup by ID
	const applicantMap = new Map<string, ApplicantInfo>();
	for (const a of applicants) {
		if (a.applicantType !== 'Company') {
			applicantMap.set(a.id, a);
		}
	}

	// Check each relationship
	for (const rel of relationships) {
		if (!BLOOD_RELATION_TYPES.has(rel.relationType)) continue;

		const fromApplicant = applicantMap.get(rel.fromId);
		const toApplicant = applicantMap.get(rel.toId);

		if (!fromApplicant || !toApplicant) continue;

		// ── Religion consistency check ──
		if (
			fromApplicant.religion &&
			toApplicant.religion &&
			fromApplicant.religion !== toApplicant.religion
		) {
			const toName = toApplicant.fullName || 'Co-applicant';
			const relLabel = formatRelationType(rel.relationType);

			addConflict(conflicts, rel.fromId, {
				conflictWithId: rel.toId,
				conflictWithName: toName,
				relationType: rel.relationType,
				thisValue: fromApplicant.religion,
				otherValue: toApplicant.religion,
				field: 'religion',
				message: `${toName} (${relLabel}) is ${getReligionLabel(toApplicant.religion)} — blood relatives must share the same religion`
			});
		}

		// ── Caste category check (both Hindu only) ──
		if (
			fromApplicant.religion === 'hindu' &&
			toApplicant.religion === 'hindu' &&
			fromApplicant.casteCategory &&
			toApplicant.casteCategory &&
			fromApplicant.casteCategory !== toApplicant.casteCategory
		) {
			const toName = toApplicant.fullName || 'Co-applicant';
			const relLabel = formatRelationType(rel.relationType);

			addConflict(conflicts, rel.fromId, {
				conflictWithId: rel.toId,
				conflictWithName: toName,
				relationType: rel.relationType,
				thisValue: fromApplicant.casteCategory,
				otherValue: toApplicant.casteCategory,
				field: 'casteCategory',
				message: `${toName} (${relLabel}) is ${getCasteLabel(toApplicant.casteCategory)} — blood relatives must share the same caste category`
			});
		}
	}

	return conflicts;
}

/**
 * Convenience: check if any applicant has religion/caste conflicts.
 */
export function hasAnyReligionConflict(
	applicants: ApplicantInfo[],
	relationships: Relationship[]
): boolean {
	const conflicts = checkReligionConsistency(applicants, relationships);
	return conflicts.size > 0;
}

// ── Internal helper ──
function addConflict(
	map: Map<string, ReligionConflict[]>,
	applicantId: string,
	conflict: ReligionConflict
) {
	const existing = map.get(applicantId) || [];
	// Deduplicate: same target + same field
	const isDuplicate = existing.some(
		(c) => c.conflictWithId === conflict.conflictWithId && c.field === conflict.field
	);
	if (!isDuplicate) {
		existing.push(conflict);
		map.set(applicantId, existing);
	}
}
