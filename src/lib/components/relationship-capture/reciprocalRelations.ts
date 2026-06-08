import type { RelationType, Applicant, Relationship } from './types';

/* ======================================================
   RECIPROCAL RELATION (GENDER APPLIED ONCE)
====================================================== */

export function getReciprocalRelation(
	relation: RelationType,
	targetGender?: 'male' | 'female'
): RelationType | null {
	if (relation === 'Husband of') return 'Wife of';
	if (relation === 'Wife of') return 'Husband of';

	if (relation === 'Father of' || relation === 'Mother of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Son of' : 'Daughter of';
	}

	if (relation === 'Son of' || relation === 'Daughter of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Father of' : 'Mother of';
	}

	if (relation === 'Brother of' || relation === 'Sister of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Brother of' : 'Sister of';
	}

	if (relation === 'Grandfather of' || relation === 'Grandmother of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Grandson of' : 'Granddaughter of';
	}

	if (relation === 'Grandson of' || relation === 'Granddaughter of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Grandfather of' : 'Grandmother of';
	}

	if (relation === 'Father-in-law of' || relation === 'Mother-in-law of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Son-in-law of' : 'Daughter-in-law of';
	}

	if (relation === 'Son-in-law of' || relation === 'Daughter-in-law of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Father-in-law of' : 'Mother-in-law of';
	}
	// IN-LAWS (GENERATION-AWARE, ISOLATED FIX)

	// if (relation === 'Father-in-law of') return 'Daughter-in-law of';
	// if (relation === 'Mother-in-law of') return 'Son-in-law of';

	// if (relation === 'Son-in-law of') return 'Mother-in-law of';
	// if (relation === 'Daughter-in-law of') return 'Father-in-law of';

	if (relation === 'Brother-in-law of' || relation === 'Sister-in-law of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Brother-in-law of' : 'Sister-in-law of';
	}

	if (relation === 'Uncle of' || relation === 'Aunt of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Nephew of' : 'Niece of';
	}

	if (relation === 'Nephew of' || relation === 'Niece of') {
		if (!targetGender) return null;
		return targetGender === 'male' ? 'Uncle of' : 'Aunt of';
	}

	if (relation === 'Cousin of') return 'Cousin of';

	return null;
}

/* ======================================================
   DISPLAY HELPERS (UI DEPENDS ON THIS)
====================================================== */

export function formatRelationshipDisplay(rel: Relationship): string {
	return `${rel.relationType}`;
}

export function getRelationshipArrow(): string {
	return '→';
}
