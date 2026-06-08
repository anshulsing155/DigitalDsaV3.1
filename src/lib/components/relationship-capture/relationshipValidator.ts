/**
 * Relationship Validator
 * Handles all validation logic including dropdown filtering and forbidden relationships
 */

import type {
	Relationship,
	RelationType,
	ValidationError,
	ForbiddenRelation,
	PersonBOption,
	RelationOption
} from './types';
import type { PersonBValidity } from './types';
import type { Applicant } from '$lib/stores/loanData';

// ============================================================================
// RELATIONSHIP RULES - COMPREHENSIVE INDIAN FAMILY RELATIONSHIPS
// ============================================================================

type RuleMaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'separated';

interface RelationshipRule {
	relation: RelationType;
	personAGender: 'male' | 'female' | 'any';
	personAMaritalStatus: RuleMaritalStatus[] | 'any';
	personBGender: 'male' | 'female' | 'any';
	personBMaritalStatus: RuleMaritalStatus[] | 'any';
	ageRule: 'older' | 'younger' | 'similar' | 'any'; // A relative to B
	minAgeDiff?: number; // Minimum age difference (A - B)
	maxAgeDiff?: number; // Maximum age difference (A - B)
	category:
		| 'spouse'
		| 'parent'
		| 'child'
		| 'grandparent'
		| 'grandchild'
		| 'sibling'
		| 'in-law'
		| 'extended'
		| 'non-family';
}

/** Check if marital status counts as "currently married" for spouse/in-law eligibility */
function isMarriedStatus(status: string | undefined): boolean {
	if (!status) return false;
	return status === 'married';
}

/** Ever-married: married, divorced, separated, widowed — all imply the person
 *  was married at some point and could have children. Only 'single' is excluded. */
function isEverMarried(status: string | undefined): boolean {
	if (!status) return false;
	return ['married', 'divorced', 'separated', 'widowed'].includes(status.toLowerCase());
}

const RELATIONSHIP_RULES: RelationshipRule[] = [
	// SPOUSE — only married applicants can be spouses
	{
		relation: 'Husband of',
		personAGender: 'male',
		personAMaritalStatus: ['married'],
		personBGender: 'female',
		personBMaritalStatus: ['married'],
		ageRule: 'similar',
		minAgeDiff: -15,
		maxAgeDiff: 15,
		category: 'spouse'
	},
	{
		relation: 'Wife of',
		personAGender: 'female',
		personAMaritalStatus: ['married'],
		personBGender: 'male',
		personBMaritalStatus: ['married'],
		ageRule: 'similar',
		minAgeDiff: -15,
		maxAgeDiff: 15,
		category: 'spouse'
	},

	// PARENT (A is parent of B, A is older, A must be ever-married)
	{
		relation: 'Father of',
		personAGender: 'male',
		personAMaritalStatus: ['married', 'divorced', 'widowed', 'separated'],
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 12,
		maxAgeDiff: 60,
		category: 'parent'
	},
	{
		relation: 'Mother of',
		personAGender: 'female',
		personAMaritalStatus: ['married', 'divorced', 'widowed', 'separated'],
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 12,
		maxAgeDiff: 60,
		category: 'parent'
	},

	// CHILD (A is child of B, A is younger)
	{
		relation: 'Son of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -60,
		maxAgeDiff: -12,
		category: 'child'
	},
	{
		relation: 'Daughter of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -60,
		maxAgeDiff: -12,
		category: 'child'
	},

	// GRANDPARENT (A is grandparent of B)
	{
		relation: 'Grandfather of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 24,
		maxAgeDiff: 90,
		category: 'grandparent'
	},
	{
		relation: 'Grandmother of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 24,
		maxAgeDiff: 90,
		category: 'grandparent'
	},

	// GRANDCHILD (A is grandchild of B)
	{
		relation: 'Grandson of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -90,
		maxAgeDiff: -24,
		category: 'grandchild'
	},
	{
		relation: 'Granddaughter of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -90,
		maxAgeDiff: -24,
		category: 'grandchild'
	},

	// SIBLING
	{
		relation: 'Brother of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'similar',
		minAgeDiff: -25,
		maxAgeDiff: 25,
		category: 'sibling'
	},
	{
		relation: 'Sister of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'similar',
		minAgeDiff: -25,
		maxAgeDiff: 25,
		category: 'sibling'
	},

	// IN-LAWS (Parent's side — personB must be married)
	{
		relation: 'Father-in-law of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: ['married'],
		ageRule: 'older',
		minAgeDiff: 5,
		maxAgeDiff: 60,
		category: 'in-law'
	},
	{
		relation: 'Mother-in-law of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: ['married'],
		ageRule: 'older',
		minAgeDiff: 5,
		maxAgeDiff: 60,
		category: 'in-law'
	},

	// IN-LAWS (Child's side — personA must be married)
	{
		relation: 'Son-in-law of',
		personAGender: 'male',
		personAMaritalStatus: ['married'],
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -60,
		maxAgeDiff: -5,
		category: 'in-law'
	},
	{
		relation: 'Daughter-in-law of',
		personAGender: 'female',
		personAMaritalStatus: ['married'],
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -60,
		maxAgeDiff: -5,
		category: 'in-law'
	},

	// IN-LAWS (Sibling's side — personB must be married)
	{
		relation: 'Brother-in-law of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: ['married'],
		ageRule: 'similar',
		minAgeDiff: -25,
		maxAgeDiff: 25,
		category: 'in-law'
	},
	{
		relation: 'Sister-in-law of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: ['married'],
		ageRule: 'similar',
		minAgeDiff: -25,
		maxAgeDiff: 25,
		category: 'in-law'
	},

	// EXTENDED FAMILY
	{
		relation: 'Uncle of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 10,
		maxAgeDiff: 50,
		category: 'extended'
	},
	{
		relation: 'Aunt of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'older',
		minAgeDiff: 10,
		maxAgeDiff: 50,
		category: 'extended'
	},
	{
		relation: 'Nephew of',
		personAGender: 'male',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -50,
		maxAgeDiff: -10,
		category: 'extended'
	},
	{
		relation: 'Niece of',
		personAGender: 'female',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'younger',
		minAgeDiff: -50,
		maxAgeDiff: -10,
		category: 'extended'
	},
	{
		relation: 'Cousin of',
		personAGender: 'any',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'similar',
		minAgeDiff: -30,
		maxAgeDiff: 30,
		category: 'extended'
	},

	// NON-FAMILY
	{
		relation: 'Friend of',
		personAGender: 'any',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'any',
		category: 'non-family'
	},
	{
		relation: 'Business partner of',
		personAGender: 'any',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'any',
		category: 'non-family'
	},
	{
		relation: 'No relation',
		personAGender: 'any',
		personAMaritalStatus: 'any',
		personBGender: 'any',
		personBMaritalStatus: 'any',
		ageRule: 'any',
		category: 'non-family'
	}
];

/**
 * Get available relations for Person A (before Person B is selected)
 * Filters based on Person A's gender, age, and marital status
 * Also checks if there's at least one valid Person B for each relation
 */
export function getAvailableRelationsForPersonA(
	personA: Applicant,
	allApplicants: Applicant[],
	existingRelationships: Relationship[]
): { relation: RelationType; category: string; unlikely: boolean }[] {
	if (!personA) return [];

	const personAGender = personA.gender?.toLowerCase() as 'male' | 'female' | undefined;
	const personAMarital = personA.maritalStatus as RuleMaritalStatus | undefined;

	// Get other applicants (excluding Person A)
	const otherApplicants = allApplicants.filter((a) => a.id !== personA.id);

	const availableRelations: { relation: RelationType; category: string; unlikely: boolean }[] = [];

	for (const rule of RELATIONSHIP_RULES) {
		// Check Person A gender
		if (rule.personAGender !== 'any' && rule.personAGender !== personAGender) continue;

		// Check Person A marital status
		if (rule.personAMaritalStatus !== 'any') {
			if (!personAMarital || !rule.personAMaritalStatus.includes(personAMarital)) continue;
		}

		// Check if relation is already exhausted (e.g., already has spouse)
		if (rule.category === 'spouse' && isMarried(personA, existingRelationships)) continue;

		// Check if there's at least one valid or unlikely Person B for this relation
		const validities = otherApplicants.map((b) =>
			checkPersonBValidity(personA, rule.relation, b, allApplicants, existingRelationships)
		);

		const hasLikelyB = validities.some((v) => v === 'valid');
		const hasAnyB = validities.some((v) => v !== 'invalid');

		if (!hasAnyB && otherApplicants.length > 0) continue;

		availableRelations.push({
			relation: rule.relation,
			category: rule.category,
			unlikely: !hasLikelyB
		});
	}

	return availableRelations;
}

/**
 * Get grouped relations for dropdown display
 */
export function getGroupedRelationsForPersonA(
	personA: Applicant,
	allApplicants: Applicant[],
	existingRelationships: Relationship[]
): Map<string, RelationOption[]> {
	const available = getAvailableRelationsForPersonA(personA, allApplicants, existingRelationships);

	const groups = new Map<string, RelationOption[]>();
	const categoryOrder = [
		'spouse',
		'parent',
		'child',
		'sibling',
		'grandparent',
		'grandchild',
		'in-law',
		'extended',
		'non-family'
	];
	const categoryLabels: Record<string, string> = {
		spouse: 'Spouse',
		parent: 'Parent',
		child: 'Child',
		sibling: 'Sibling',
		grandparent: 'Grandparent',
		grandchild: 'Grandchild',
		'in-law': 'In-Laws',
		extended: 'Extended Family',
		'non-family': 'Non-Family'
	};

	for (const category of categoryOrder) {
		const relations = available
			.filter((r) => r.category === category)
			.map((r) => ({ relation: r.relation, unlikely: r.unlikely }));

		if (relations.length > 0) {
			groups.set(categoryLabels[category] || category, relations);
		}
	}

	return groups;
}

// ============================================================================
// BASE VALIDATION - AGE, GENDER, MARITAL STATUS
// ============================================================================

/**
 * Get valid relationship options based on two applicants' profiles
 * This is used for initial dropdown filtering
 */
export function getValidRelations(
	personA: Applicant,
	personB: Applicant,
	existingRelationships: Relationship[]
): RelationType[] {
	const options: RelationType[] = [];

	const personAAge =
		typeof personA.age === 'number'
			? personA.age
			: typeof personA.age === 'number'
				? personA.age
				: 0;
	const personBAge =
		typeof personB.age === 'number'
			? personB.age
			: typeof personB.age === 'number'
				? personB.age
				: 0;
	const ageDiff = personAAge - personBAge;
	const absAgeDiff = Math.abs(ageDiff);

	// 1. SPOUSE RELATIONS
	// Only if both not already married to someone else AND both have married status
	if (
		!isMarried(personA, existingRelationships) &&
		!isMarried(personB, existingRelationships) &&
		isMarriedStatus(personA.maritalStatus) &&
		isMarriedStatus(personB.maritalStatus) &&
		absAgeDiff <= 15
	) {
		if (personA.gender === 'male' && personB.gender === 'female') {
			options.push('Husband of');
		}
		if (personA.gender === 'female' && personB.gender === 'male') {
			options.push('Wife of');
		}
	}

	// 2. PARENT RELATIONS (A is parent of B)
	// Only if B doesn't have 2 parents and doesn't have this gender parent
	// Parent must be ever-married (single person cannot be a parent)
	if (ageDiff >= 18 && ageDiff <= 60 && isEverMarried(personA.maritalStatus)) {
		const bParentsCount = countParents(personB, existingRelationships);

		if (bParentsCount < 2) {
			if (personA.gender === 'male' && !hasFather(personB, existingRelationships)) {
				options.push('Father of');
			}
			if (personA.gender === 'female' && !hasMother(personB, existingRelationships)) {
				options.push('Mother of');
			}
		}

		// Grandparent (must also be ever-married)
		if (ageDiff >= 40) {
			if (personA.gender === 'male') {
				options.push('Grandfather of');
			} else {
				options.push('Grandmother of');
			}
		}

		// In-law parent relations (personB must be married)
		if (isMarriedStatus(personB.maritalStatus)) {
			if (personA.gender === 'male') {
				options.push('Father-in-law of');
			} else {
				options.push('Mother-in-law of');
			}
		}
	}

	// 3. CHILD RELATIONS (A is child of B)
	// Only if A doesn't have 2 parents and doesn't have this gender parent
	if (ageDiff <= -18 && ageDiff >= -60) {
		const aParentsCount = countParents(personA, existingRelationships);

		if (aParentsCount < 2) {
			if (personA.gender === 'male' && !hasFather(personA, existingRelationships)) {
				options.push('Son of');
			}
			if (personA.gender === 'female' && !hasMother(personA, existingRelationships)) {
				options.push('Daughter of');
			}
		}

		// Grandchild (always allowed)
		if (ageDiff <= -40) {
			if (personA.gender === 'male') {
				options.push('Grandson of');
			} else {
				options.push('Granddaughter of');
			}
		}

		// In-law child relations (personA must be married)
		if (isMarriedStatus(personA.maritalStatus)) {
			if (personA.gender === 'male') {
				options.push('Son-in-law of');
			} else {
				options.push('Daughter-in-law of');
			}
		}
	}

	// 4. SIBLING RELATIONS
	if (absAgeDiff <= 20) {
		if (personA.gender === 'male') {
			options.push('Brother of');
		} else {
			options.push('Sister of');
		}

		// In-law siblings (personB must be married)
		if (isMarriedStatus(personB.maritalStatus)) {
			if (personA.gender === 'male') {
				options.push('Brother-in-law of');
			} else {
				options.push('Sister-in-law of');
			}
		}

		// Cousin
		options.push('Cousin of');
	}

	// 5. EXTENDED FAMILY (always allowed based on gender)
	if (personA.gender === 'male') {
		options.push('Uncle of', 'Nephew of');
	} else {
		options.push('Aunt of', 'Niece of');
	}

	// 6. NON-FAMILY (always allowed)
	options.push('Friend of', 'Business partner of', 'No relation');

	return options;
}

/**
 * Get valid Person B options based on Person A and selected relation
 * This provides reactive filtering for the Person B dropdown
 */
export function getValidPersonBOptions(
	personA: Applicant,
	relation: RelationType | null,
	allApplicants: Applicant[],
	existingRelationships: Relationship[]
): Applicant[] {
	if (!personA || !relation) return [];

	return allApplicants.filter((personB) => {
		// Can't select self
		if (personB.id === personA.id) return false;

		// Can't select if relationship already exists
		if (
			personA.id &&
			personB.id &&
			hasExistingRelation(personA.id, personB.id, existingRelationships)
		)
			return false;

		// Specific validation based on relation type
		return isValidPersonBForRelation(
			personA,
			relation,
			personB,
			allApplicants,
			existingRelationships
		);
	});
}

function getParents(personId: string, relationships: Relationship[]): string[] {
	return relationships
		.filter(
			(r) =>
				// Parent expressed directly
				(r.toId === personId &&
					(r.relationType === 'Father of' || r.relationType === 'Mother of')) ||
				// Parent expressed inversely
				(r.fromId === personId && (r.relationType === 'Son of' || r.relationType === 'Daughter of'))
		)
		.map((r) => (r.toId === personId ? r.fromId : r.toId));
}

function sharesAtLeastOneParent(
	a: Applicant,
	b: Applicant,
	relationships: Relationship[]
): boolean {
	if (!a.id || !b.id) return false;
	return getParents(a.id, relationships).some((parentId) =>
		getParents(b.id!, relationships).includes(parentId)
	);
}

/**
 * Tristate validity check for Person B given a relation from Person A.
 * - 'valid'    — passes all hard + soft checks
 * - 'unlikely' — passes hard checks (gender, structural) but fails soft (age) checks
 * - 'invalid'  — fails hard checks (gender, structural constraints)
 */
export function checkPersonBValidity(
	personA: Applicant,
	relation: RelationType,
	personB: Applicant,
	applicants: Applicant[],
	existingRelationships: Relationship[]
): PersonBValidity {
	if (personA.id === personB.id) return 'invalid';

	const personAAge =
		typeof personA.age === 'number'
			? personA.age
			: typeof personA.age === 'number'
				? personA.age
				: 0;
	const personBAge =
		typeof personB.age === 'number'
			? personB.age
			: typeof personB.age === 'number'
				? personB.age
				: 0;
	const ageDiff = personAAge - personBAge;

	switch (relation) {
		// ── SPOUSE (only married — not unmarried/divorced/separated/widow) ──
		case 'Husband of':
			if (personA.gender !== 'male' || personB.gender !== 'female') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			if (isMarried(personB, existingRelationships)) return 'invalid';
			return Math.abs(ageDiff) <= 15 ? 'valid' : 'unlikely';

		case 'Wife of':
			if (personA.gender !== 'female' || personB.gender !== 'male') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			if (isMarried(personB, existingRelationships)) return 'invalid';
			return Math.abs(ageDiff) <= 15 ? 'valid' : 'unlikely';

		// ── PARENT (must be older; younger-than-child = impossible) ──
		case 'Father of':
			if (personA.gender !== 'male') return 'invalid';
			// Single (never-married) person cannot be a father
			if (!isEverMarried(personA.maritalStatus)) return 'invalid';
			if (countParents(personB, existingRelationships) >= 2) return 'invalid';
			if (hasParentOfGender(personB, 'male', existingRelationships, applicants)) return 'invalid';
			if (ageDiff < 12) return 'invalid'; // parent must be at least ~12 years older
			return ageDiff >= 18 && ageDiff <= 60 ? 'valid' : 'unlikely';

		case 'Mother of':
			if (personA.gender !== 'female') return 'invalid';
			// Single (never-married) person cannot be a mother
			if (!isEverMarried(personA.maritalStatus)) return 'invalid';
			if (countParents(personB, existingRelationships) >= 2) return 'invalid';
			if (hasParentOfGender(personB, 'female', existingRelationships, applicants)) return 'invalid';
			if (ageDiff < 12) return 'invalid'; // mother must be at least ~12 years older
			return ageDiff >= 18 && ageDiff <= 60 ? 'valid' : 'unlikely';

		case 'Grandfather of':
			if (personA.gender !== 'male') return 'invalid';
			if (!isEverMarried(personA.maritalStatus)) return 'invalid';
			if (ageDiff < 24) return 'invalid'; // grandparent must be at least ~24 years older
			return ageDiff >= 40 ? 'valid' : 'unlikely';

		case 'Grandmother of':
			if (personA.gender !== 'female') return 'invalid';
			if (!isEverMarried(personA.maritalStatus)) return 'invalid';
			if (ageDiff < 24) return 'invalid';
			return ageDiff >= 40 ? 'valid' : 'unlikely';

		// ── CHILD (must be younger; older-than-parent = impossible) ──
		case 'Son of':
			if (personA.gender !== 'male') return 'invalid';
			if (hasParentOfGender(personA, personB.gender, existingRelationships, applicants))
				return 'invalid';
			if (ageDiff > -12) return 'invalid'; // child must be at least ~12 years younger
			return ageDiff <= -18 && ageDiff >= -60 ? 'valid' : 'unlikely';

		case 'Daughter of':
			if (personA.gender !== 'female') return 'invalid';
			if (hasParentOfGender(personA, personB.gender, existingRelationships, applicants))
				return 'invalid';
			if (ageDiff > -12) return 'invalid';
			return ageDiff <= -18 && ageDiff >= -60 ? 'valid' : 'unlikely';

		case 'Grandson of':
			if (personA.gender !== 'male') return 'invalid';
			if (ageDiff > -24) return 'invalid'; // grandchild must be at least ~24 years younger
			return ageDiff <= -40 ? 'valid' : 'unlikely';

		case 'Granddaughter of':
			if (personA.gender !== 'female') return 'invalid';
			if (ageDiff > -24) return 'invalid';
			return ageDiff <= -40 ? 'valid' : 'unlikely';

		// ── SIBLING (any age direction, warn on large gaps) ──
		case 'Brother of':
			if (personA.gender !== 'male') return 'invalid';
			return Math.abs(ageDiff) <= 25 ? 'valid' : 'unlikely';

		case 'Sister of':
			if (personA.gender !== 'female') return 'invalid';
			return Math.abs(ageDiff) <= 25 ? 'valid' : 'unlikely';

		// ── IN-LAW PARENT (must be older; personB must be married) ──
		case 'Father-in-law of':
			if (personA.gender !== 'male') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			if (ageDiff < 5) return 'invalid'; // in-law parent must be meaningfully older
			return ageDiff >= 20 ? 'valid' : 'unlikely';

		case 'Mother-in-law of':
			if (personA.gender !== 'female') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			if (ageDiff < 5) return 'invalid';
			return ageDiff >= 20 ? 'valid' : 'unlikely';

		// ── IN-LAW CHILD (must be younger; personA must be married) ──
		case 'Son-in-law of':
			if (personA.gender !== 'male') return 'invalid';
			if (!isMarriedStatus(personA.maritalStatus)) return 'invalid';
			if (ageDiff > -5) return 'invalid'; // in-law child must be meaningfully younger
			return ageDiff <= -20 ? 'valid' : 'unlikely';

		case 'Daughter-in-law of':
			if (personA.gender !== 'female') return 'invalid';
			if (!isMarriedStatus(personA.maritalStatus)) return 'invalid';
			if (ageDiff > -5) return 'invalid';
			return ageDiff <= -20 ? 'valid' : 'unlikely';

		// ── IN-LAW SIBLING (personB must be married) ──
		case 'Brother-in-law of':
			if (personA.gender !== 'male') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			return Math.abs(ageDiff) <= 25 ? 'valid' : 'unlikely';

		case 'Sister-in-law of':
			if (personA.gender !== 'female') return 'invalid';
			if (!isMarriedStatus(personB.maritalStatus)) return 'invalid';
			return Math.abs(ageDiff) <= 25 ? 'valid' : 'unlikely';

		// ── EXTENDED (uncle/aunt: typically older but can be younger in India) ──
		case 'Uncle of':
			if (personA.gender !== 'male') return 'invalid';
			return ageDiff >= 15 ? 'valid' : 'unlikely';

		case 'Aunt of':
			if (personA.gender !== 'female') return 'invalid';
			return ageDiff >= 15 ? 'valid' : 'unlikely';

		case 'Nephew of':
		case 'Niece of':
			return ageDiff <= -15 ? 'valid' : 'unlikely';

		case 'Cousin of':
			return Math.abs(ageDiff) <= 30 ? 'valid' : 'unlikely';

		// ── NON-FAMILY ──
		case 'Friend of':
		case 'Business partner of':
			return 'valid';

		default:
			return 'valid';
	}
}

/**
 * Get Person B options with likelihood tags for dropdown display
 */
export function getPersonBOptionsWithLikelihood(
	personA: Applicant,
	relation: RelationType | null,
	allApplicants: Applicant[],
	existingRelationships: Relationship[]
): PersonBOption[] {
	if (!personA || !relation) return [];

	const options: PersonBOption[] = [];

	for (const personB of allApplicants) {
		if (personB.id === personA.id) continue;
		if (
			personA.id &&
			personB.id &&
			hasExistingRelation(personA.id, personB.id, existingRelationships)
		)
			continue;

		const validity = checkPersonBValidity(
			personA,
			relation,
			personB,
			allApplicants,
			existingRelationships
		);
		if (validity === 'invalid') continue;

		options.push({ applicant: personB as any, unlikely: validity === 'unlikely' });
	}

	// Likely first, then unlikely
	options.sort((a, b) => (a.unlikely === b.unlikely ? 0 : a.unlikely ? 1 : -1));
	return options;
}

/**
 * Legacy wrapper — returns true for both valid and unlikely
 */
function isValidPersonBForRelation(
	personA: Applicant,
	relation: RelationType,
	personB: Applicant,
	applicants: Applicant[],
	existingRelationships: Relationship[]
): boolean {
	return (
		checkPersonBValidity(personA, relation, personB, applicants, existingRelationships) !==
		'invalid'
	);
}

// ============================================================================
// HELPER FUNCTIONS - CHECKING EXISTING RELATIONSHIPS
// ============================================================================

/**
 * Check if person is already married
 */
// export function isMarried(person: Applicant, relationships: Relationship[]): boolean {
// 	return relationships.some(
// 		(rel) =>
// 		((rel.fromId === person.id || rel.toId === person.id) &&
// 			(rel.relationType === 'Husband of' || rel.relationType === 'Wife of'))
// 	);
// }
export function isMarried(person: Applicant, relationships: Relationship[] = []): boolean {
	return relationships.some(
		(rel) =>
			(rel.fromId === person.id || rel.toId === person.id) &&
			(rel.relationType === 'Husband of' || rel.relationType === 'Wife of')
	);
}

/**
 * Count how many parents a person has
 */
// export function countParents(person: Applicant, relationships: Relationship[]): number {
// 	return relationships.filter(
// 		(rel) =>
// 			rel.toId === person.id && (rel.relationType === 'Father of' || rel.relationType === 'Mother of')
// 	).length;
// }
export function countParents(person: Applicant, relationships: Relationship[] = []): number {
	if (!person.id) return 0;
	return getParents(person.id, relationships).length;
}

/**
 * Check if person has a father
 */
export function hasFather(person: Applicant, relationships: Relationship[]): boolean {
	return relationships.some((rel) => rel.toId === person.id && rel.relationType === 'Father of');
}

/**
 * Check if person has a mother
 */
export function hasMother(person: Applicant, relationships: Relationship[]): boolean {
	return relationships.some((rel) => rel.toId === person.id && rel.relationType === 'Mother of');
}

/**
 * Check if person has a parent of specific gender
 */
export function hasParentOfGender(
	person: Applicant,
	gender: 'male' | 'female' | string | undefined,
	relationships: Relationship[] = [],
	applicants: Applicant[] = []
): boolean {
	if (!person.id) return false;
	return getParents(person.id, relationships).some((parentId) => {
		const parent = applicants.find((a) => a.id === parentId);
		return parent?.gender === gender;
	});
}

/**
 * Check if two people already have a relationship
 */
export function hasExistingRelation(
	personAId: string | undefined,
	personBId: string | undefined,
	relationships: Relationship[] = []
): boolean {
	if (!personAId || !personBId) return false;
	return relationships.some(
		(rel) =>
			(rel.fromId === personAId && rel.toId === personBId) ||
			(rel.fromId === personBId && rel.toId === personAId)
	);
}

/**
 * Get spouse of a person (if married)
 */
export function getSpouse(person: Applicant, relationships: Relationship[]): Applicant | null {
	const spouseRel = relationships.find(
		(rel) =>
			(rel.fromId === person.id || rel.toId === person.id) &&
			(rel.relationType === 'Husband of' || rel.relationType === 'Wife of')
	);

	if (!spouseRel) return null;

	const spouseId = spouseRel.fromId === person.id ? spouseRel.toId : spouseRel.fromId;
	return { id: spouseId } as Applicant; // You'll need to fetch full applicant data
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

/**
 * Validate a relationship before adding
 * Returns array of errors (empty if valid)
 */
export function validateRelationship(
	personA: Applicant,
	relation: RelationType,
	personB: Applicant,
	existingRelationships: Relationship[],
	forbiddenRelations: ForbiddenRelation[],
	applicants: Applicant[]
): ValidationError[] {
	const errors: ValidationError[] = [];

	// 1. Self-relation
	if (personA.id === personB.id) {
		errors.push({
			field: 'general',
			message: 'Cannot create relationship with self',
			code: 'SELF_RELATION'
		});
	}

	// 2. Duplicate check
	if (hasExistingRelation(personA.id, personB.id, existingRelationships)) {
		errors.push({
			field: 'general',
			message: `${personA.fullName} and ${personB.fullName} already have a relationship`,
			code: 'DUPLICATE_RELATION'
		});
	}

	// 3. Forbidden check
	const forbiddenEntry = forbiddenRelations.find(
		(f) => f.fromId === personA.id && f.toId === personB.id
	);
	if (forbiddenEntry?.forbiddenRelations.includes(relation)) {
		errors.push({
			field: 'relation',
			message: forbiddenEntry.reason,
			code: 'FORBIDDEN_RELATION'
		});
	}

	// 4. Spouse validation
	if (relation === 'Husband of' || relation === 'Wife of') {
		if (isMarried(personA, existingRelationships)) {
			const spouse = getSpouse(personA, existingRelationships);
			errors.push({
				field: 'personA',
				message: `${personA.fullName} is already married`,
				code: 'ALREADY_MARRIED'
			});
		}
		if (isMarried(personB, existingRelationships)) {
			errors.push({
				field: 'personB',
				message: `${personB.fullName} is already married`,
				code: 'ALREADY_MARRIED'
			});
		}
	}

	// 5. Parent validation
	if (relation === 'Father of' || relation === 'Mother of') {
		// 5a. Marital status — single (never-married) person cannot be a parent.
		// This was the dropdown-only gate before; surfacing it here too makes
		// the validator the single source of truth so saved/restored
		// relationships and any non-dropdown code paths can't bypass it.
		if (!isEverMarried(personA.maritalStatus)) {
			errors.push({
				field: 'personA',
				message: `${personA.fullName} is marked as Single. A single (never-married) person cannot be a ${relation.replace(' of', '').toLowerCase()}. Please update marital status to Married, Divorced, Widowed or Separated first.`,
				code: 'MARITAL_FORBIDS_PARENT',
				severity: 'error'
			});
		}

		const parentsCount = countParents(personB, existingRelationships);
		if (parentsCount >= 2) {
			errors.push({
				field: 'personB',
				message: `${personB.fullName} already has 2 parents defined`,
				code: 'MAX_PARENTS'
			});
		}

		const parentGender = relation === 'Father of' ? 'male' : 'female';
		if (hasParentOfGender(personB, parentGender, existingRelationships, applicants)) {
			errors.push({
				field: 'personB',
				message: `${personB.fullName} already has a ${relation.replace(' of', '')}`,
				code: 'DUPLICATE_PARENT'
			});
		}
	}

	// 5b. Grandparent validation — same marital constraint as parent
	if (relation === 'Grandfather of' || relation === 'Grandmother of') {
		if (!isEverMarried(personA.maritalStatus)) {
			errors.push({
				field: 'personA',
				message: `${personA.fullName} is marked as Single. A single (never-married) person cannot be a ${relation.replace(' of', '').toLowerCase()}.`,
				code: 'MARITAL_FORBIDS_GRANDPARENT',
				severity: 'error'
			});
		}
	}

	// 5c. Spouse validation — both sides must be currently married
	if (relation === 'Husband of' || relation === 'Wife of') {
		if (!isMarriedStatus(personA.maritalStatus)) {
			errors.push({
				field: 'personA',
				message: `${personA.fullName}'s marital status must be Married to define a spouse.`,
				code: 'MARITAL_FORBIDS_SPOUSE',
				severity: 'error'
			});
		}
		if (!isMarriedStatus(personB.maritalStatus)) {
			errors.push({
				field: 'personB',
				message: `${personB.fullName}'s marital status must be Married to define a spouse.`,
				code: 'MARITAL_FORBIDS_SPOUSE',
				severity: 'error'
			});
		}
	}

	// 5d. In-law validation — Son/Daughter-in-law requires personA married;
	// Father/Mother/Brother/Sister-in-law requires personB married.
	if (relation === 'Son-in-law of' || relation === 'Daughter-in-law of') {
		if (!isMarriedStatus(personA.maritalStatus)) {
			errors.push({
				field: 'personA',
				message: `${personA.fullName} must be Married to be a ${relation.replace(' of', '').toLowerCase()}.`,
				code: 'MARITAL_FORBIDS_INLAW',
				severity: 'error'
			});
		}
	}
	if (
		relation === 'Father-in-law of' ||
		relation === 'Mother-in-law of' ||
		relation === 'Brother-in-law of' ||
		relation === 'Sister-in-law of'
	) {
		if (!isMarriedStatus(personB.maritalStatus)) {
			errors.push({
				field: 'personB',
				message: `${personB.fullName} must be Married for an in-law relationship.`,
				code: 'MARITAL_FORBIDS_INLAW',
				severity: 'error'
			});
		}
	}

	// 6. Age validation
	const ageErrors = validateAge(personA, relation, personB);
	errors.push(...ageErrors);

	return errors;
}

/**
 * Age validation
 */
function validateAge(
	personA: Applicant,
	relation: RelationType,
	personB: Applicant
): ValidationError[] {
	const errors: ValidationError[] = [];
	const personAAge =
		typeof personA.age === 'number'
			? personA.age
			: typeof personA.age === 'number'
				? personA.age
				: 0;
	const personBAge =
		typeof personB.age === 'number'
			? personB.age
			: typeof personB.age === 'number'
				? personB.age
				: 0;
	const ageDiff = personAAge - personBAge;

	// Parent-child age validation
	if (relation === 'Father of' || relation === 'Mother of') {
		if (ageDiff < 12) {
			errors.push({
				field: 'relation',
				message: `Parent must be older than the child. Age difference: ${ageDiff} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff < 18) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for parent-child (${ageDiff} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		} else if (ageDiff > 60) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for parent-child (${ageDiff} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Spouse age validation
	if (relation === 'Husband of' || relation === 'Wife of') {
		if (Math.abs(ageDiff) > 15) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for spouses (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Child age validation
	if (relation === 'Son of' || relation === 'Daughter of') {
		if (ageDiff > -12) {
			errors.push({
				field: 'relation',
				message: `Child must be younger than the parent. Age difference: ${Math.abs(ageDiff)} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff > -18) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for parent-child (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		} else if (ageDiff < -60) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for parent-child (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Grandparent age validation
	if (relation === 'Grandfather of' || relation === 'Grandmother of') {
		if (ageDiff < 24) {
			errors.push({
				field: 'relation',
				message: `Grandparent must be significantly older. Age difference: ${ageDiff} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff < 40) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for grandparent (${ageDiff} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Grandchild age validation
	if (relation === 'Grandson of' || relation === 'Granddaughter of') {
		if (ageDiff > -24) {
			errors.push({
				field: 'relation',
				message: `Grandchild must be significantly younger. Age difference: ${Math.abs(ageDiff)} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff > -40) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for grandchild (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Sibling age validation
	if (relation === 'Brother of' || relation === 'Sister of') {
		if (Math.abs(ageDiff) > 25) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for siblings (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// In-law parent age validation
	if (relation === 'Father-in-law of' || relation === 'Mother-in-law of') {
		if (ageDiff < 5) {
			errors.push({
				field: 'relation',
				message: `In-law parent must be older. Age difference: ${ageDiff} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff < 20) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for in-law parent (${ageDiff} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// In-law child age validation
	if (relation === 'Son-in-law of' || relation === 'Daughter-in-law of') {
		if (ageDiff > -5) {
			errors.push({
				field: 'relation',
				message: `In-law child must be younger. Age difference: ${Math.abs(ageDiff)} years.`,
				code: 'AGE_IMPOSSIBLE',
				severity: 'error'
			});
		} else if (ageDiff > -20) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for in-law child (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// In-law sibling age validation
	if (relation === 'Brother-in-law of' || relation === 'Sister-in-law of') {
		if (Math.abs(ageDiff) > 25) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for in-law siblings (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Uncle/Aunt age validation
	if (relation === 'Uncle of' || relation === 'Aunt of') {
		if (ageDiff < 15) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for uncle/aunt (${ageDiff} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Nephew/Niece age validation
	if (relation === 'Nephew of' || relation === 'Niece of') {
		if (ageDiff > -15) {
			errors.push({
				field: 'relation',
				message: `Age difference is less than typical for nephew/niece (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	// Cousin age validation
	if (relation === 'Cousin of') {
		if (Math.abs(ageDiff) > 30) {
			errors.push({
				field: 'relation',
				message: `Age difference is more than typical for cousins (${Math.abs(ageDiff)} years). Are you sure?`,
				code: 'AGE_UNLIKELY',
				severity: 'warning'
			});
		}
	}

	return errors;
}

// ============================================================================
// REACTIVE CLEANUP — find relationships invalidated by applicant property changes
// ============================================================================

/**
 * Safely coerce age (which may be stored as a string) to a number.
 * Returns 0 for undefined / empty / non-numeric values.
 */
export function coerceAge(val: string | number | undefined): number {
	if (val === undefined || val === null || val === '') return 0;
	const n = typeof val === 'number' ? val : Number(val);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Scan every relationship and return the IDs of those that are now invalid
 * given the current applicant data.  Also collects reciprocals (swapped
 * fromId/toId) so both sides of a pair are removed together.
 *
 * Applicants are passed as a generic array with at least
 * { id, gender, age, age, maritalStatus, applicantType }.
 */
export function findInvalidRelationshipIds(
	applicants: {
		id?: string;
		gender?: string;
		age?: string | number;
		maritalStatus?: string;
		applicantType?: string;
	}[],
	relationships: Relationship[]
): Set<string> {
	const invalidIds = new Set<string>();

	// Build a lookup for quick access
	const applicantById = new Map(applicants.map((a) => [a.id, a]));

	for (const rel of relationships) {
		const from = applicantById.get(rel.fromId);
		const to = applicantById.get(rel.toId);

		// Check 1 — orphan: either side references a deleted applicant
		if (!from || !to) {
			invalidIds.add(rel.id);
			continue;
		}

		// Find the rule for this relation type
		const rule = RELATIONSHIP_RULES.find((r) => r.relation === rel.relationType);
		if (!rule) continue; // unknown relation, leave it alone

		// Check 2 — gender
		if (rule.personAGender !== 'any' && rule.personAGender !== from.gender?.toLowerCase()) {
			invalidIds.add(rel.id);
			continue;
		}
		if (rule.personBGender !== 'any' && rule.personBGender !== to.gender?.toLowerCase()) {
			invalidIds.add(rel.id);
			continue;
		}

		// Check 3 — age (skip if either age is unknown / 0)
		const fromAge = coerceAge(from.age) || coerceAge(from.age);
		const toAge = coerceAge(to.age) || coerceAge(to.age);
		if (fromAge > 0 && toAge > 0) {
			const diff = fromAge - toAge;
			if (rule.minAgeDiff !== undefined && diff < rule.minAgeDiff) {
				invalidIds.add(rel.id);
				continue;
			}
			if (rule.maxAgeDiff !== undefined && diff > rule.maxAgeDiff) {
				invalidIds.add(rel.id);
				continue;
			}
		}

		// Check 4 — marital status
		if (rule.personAMaritalStatus !== 'any') {
			const ms = from.maritalStatus as RuleMaritalStatus | undefined;
			if (!ms || !rule.personAMaritalStatus.includes(ms)) {
				invalidIds.add(rel.id);
				continue;
			}
		}
		if (rule.personBMaritalStatus !== 'any') {
			const ms = to.maritalStatus as RuleMaritalStatus | undefined;
			if (!ms || !rule.personBMaritalStatus.includes(ms)) {
				invalidIds.add(rel.id);
				continue;
			}
		}
	}

	// Check 5 — collect reciprocals of every invalid relationship
	if (invalidIds.size > 0) {
		for (const rel of relationships) {
			if (invalidIds.has(rel.id)) continue;
			// If the reverse pair is already marked invalid, mark this one too
			const hasInvalidCounterpart = relationships.some(
				(inv) => invalidIds.has(inv.id) && inv.fromId === rel.toId && inv.toId === rel.fromId
			);
			if (hasInvalidCounterpart) {
				invalidIds.add(rel.id);
			}
		}
	}

	return invalidIds;
}

// ============================================================================
// ENHANCED INVALID RELATIONSHIP DETECTION — WITH HARD/SOFT CLASSIFICATION
// ============================================================================

export type InvalidCheck = 'orphan' | 'gender' | 'age' | 'marital' | 'reciprocal';

export interface InvalidRelationshipReason {
	/** Which validation check failed */
	check: InvalidCheck;
	/** Whether the user can choose to keep this relationship despite the violation */
	keepable: boolean;
}

/**
 * Enhanced version of findInvalidRelationshipIds that returns the REASON
 * each relationship is invalid, along with a keepable flag.
 *
 * Hard (keepable=false): orphan, gender mismatch, age direction reversed
 * Soft (keepable=true): age slightly out of range (correct direction), marital status mismatch
 */
export function findInvalidRelationships(
	applicants: {
		id?: string;
		gender?: string;
		age?: string | number;
		maritalStatus?: string;
		applicantType?: string;
	}[],
	relationships: Relationship[]
): Map<string, InvalidRelationshipReason> {
	const invalidMap = new Map<string, InvalidRelationshipReason>();

	const applicantById = new Map(applicants.map((a) => [a.id, a]));

	for (const rel of relationships) {
		const from = applicantById.get(rel.fromId);
		const to = applicantById.get(rel.toId);

		// Check 1 — orphan: either side references a deleted applicant
		if (!from || !to) {
			invalidMap.set(rel.id, { check: 'orphan', keepable: false });
			continue;
		}

		// Find the rule for this relation type
		const rule = RELATIONSHIP_RULES.find((r) => r.relation === rel.relationType);
		if (!rule) continue;

		// Check 2 — gender
		if (rule.personAGender !== 'any' && rule.personAGender !== from.gender?.toLowerCase()) {
			invalidMap.set(rel.id, { check: 'gender', keepable: false });
			continue;
		}
		if (rule.personBGender !== 'any' && rule.personBGender !== to.gender?.toLowerCase()) {
			invalidMap.set(rel.id, { check: 'gender', keepable: false });
			continue;
		}

		// Check 3 — age (skip if either age is unknown / 0)
		const fromAge = coerceAge(from.age) || coerceAge(from.age);
		const toAge = coerceAge(to.age) || coerceAge(to.age);
		if (fromAge > 0 && toAge > 0) {
			const diff = fromAge - toAge;
			let ageViolation = false;

			if (rule.minAgeDiff !== undefined && diff < rule.minAgeDiff) {
				ageViolation = true;
			}
			if (rule.maxAgeDiff !== undefined && diff > rule.maxAgeDiff) {
				ageViolation = true;
			}

			if (ageViolation) {
				// Determine if direction is reversed (hard) or just out of range (soft)
				const keepable = isAgeDirectionCorrect(rule.ageRule, diff);
				invalidMap.set(rel.id, { check: 'age', keepable });
				continue;
			}
		}

		// Check 4 — marital status.
		// Parent / grandparent: hard (a never-married person cannot biologically be one).
		// Spouse / in-law: also hard — definitionally requires marital status.
		// Other relations with marital constraints: soft (user may update later).
		const hardCategories: typeof rule.category[] = ['parent', 'grandparent', 'spouse', 'in-law'];
		const isHardMarital = hardCategories.includes(rule.category);

		if (rule.personAMaritalStatus !== 'any') {
			const ms = from.maritalStatus as RuleMaritalStatus | undefined;
			if (!ms || !rule.personAMaritalStatus.includes(ms)) {
				invalidMap.set(rel.id, { check: 'marital', keepable: !isHardMarital });
				continue;
			}
		}
		if (rule.personBMaritalStatus !== 'any') {
			const ms = to.maritalStatus as RuleMaritalStatus | undefined;
			if (!ms || !rule.personBMaritalStatus.includes(ms)) {
				invalidMap.set(rel.id, { check: 'marital', keepable: !isHardMarital });
				continue;
			}
		}
	}

	// Check 5 — collect reciprocals of every invalid relationship
	if (invalidMap.size > 0) {
		for (const rel of relationships) {
			if (invalidMap.has(rel.id)) continue;
			// Find the primary invalid counterpart
			const primaryInvalid = relationships.find(
				(inv) => invalidMap.has(inv.id) && inv.fromId === rel.toId && inv.toId === rel.fromId
			);
			if (primaryInvalid) {
				const primaryReason = invalidMap.get(primaryInvalid.id)!;
				invalidMap.set(rel.id, {
					check: 'reciprocal',
					keepable: primaryReason.keepable
				});
			}
		}
	}

	return invalidMap;
}

/**
 * Check if the age difference direction is correct for the given age rule.
 * Returns true (keepable/soft) if direction is right but magnitude is off.
 * Returns false (hard) if direction is completely reversed.
 */
function isAgeDirectionCorrect(
	ageRule: 'older' | 'younger' | 'similar' | 'any',
	diff: number
): boolean {
	switch (ageRule) {
		case 'older':
			// A should be older than B (diff > 0). If diff < 0, direction is reversed.
			return diff >= 0;
		case 'younger':
			// A should be younger than B (diff < 0). If diff > 0, direction is reversed.
			return diff <= 0;
		case 'similar':
			// Direction doesn't matter for siblings — just magnitude. Always soft.
			return true;
		case 'any':
			// No direction requirement. Always soft.
			return true;
	}
}
