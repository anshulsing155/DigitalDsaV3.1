import type { Applicant } from '$lib/stores/loanData';
import {
	inLawRelationships,
	getRelationshipAcceptance,
	type RelationshipRule
} from './relationship.rules';

export type RelationshipCatalog = Record<string, RelationshipRule[]>;

export type ReciprocalValidatorResult = {
	error?: string;
};

export type ReciprocalValidator = (
	applicants: Applicant[],
	index: number,
	relationshipCatalog: RelationshipCatalog
) => ReciprocalValidatorResult | null;

export type ValidationResult = {
	type: 'error' | 'warning' | 'info';
	message: string;
	severity: 'high' | 'medium' | 'low';
	bankImpact?: string;
	suggestedAction?: string;
};

/**
 * Convert age to number safely
 */
function toAge(applicant: Applicant | undefined): number | null {
	if (!applicant?.age) return null;
	const n = Number(applicant.age);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Validate age appropriateness for relationship
 */
function validateAgeGap(
	self: Applicant,
	target: Applicant,
	relationshipCatalog: RelationshipCatalog
): ValidationResult | null {
	const selfAge = toAge(self);
	const targetAge = toAge(target);

	if (selfAge === null || targetAge === null) return null;

	const rule = relationshipCatalog[self.gender as string]?.find(
		(r: RelationshipRule) => r.label === self.relationship
	);
	if (!rule) return null;

	const diff = selfAge - targetAge;
	const absDiff = Math.abs(diff);

	// Parent relationships (self is older)
	if (rule.roleGroup === 'parent') {
		if (diff <= 0) {
			return {
				type: 'error',
				message: `${self.relationship} cannot be younger than or same age as ${target.fullName}`,
				severity: 'high'
			};
		}

		if (rule.minAgeGap && diff < rule.minAgeGap) {
			return {
				type: 'error',
				message: `Age gap too small for ${self.relationship} relationship. Minimum ${rule.minAgeGap} years required, found ${diff} years.`,
				severity: 'high'
			};
		}

		if (diff < 20) {
			return {
				type: 'warning',
				message: `Age gap seems unusual for ${self.relationship} relationship (${diff} years). Please verify the ages are correct.`,
				severity: 'medium',
				bankImpact: 'Banks may request additional documentation'
			};
		}
	}

	// Child relationships (self is younger)
	if (rule.roleGroup === 'child') {
		if (diff >= 0) {
			return {
				type: 'error',
				message: `${self.relationship} cannot be older than or same age as ${target.fullName}`,
				severity: 'high'
			};
		}

		if (rule.minAgeGap && -diff < rule.minAgeGap) {
			return {
				type: 'error',
				message: `Age gap too small for ${self.relationship} relationship. Minimum ${rule.minAgeGap} years required, found ${-diff} years.`,
				severity: 'high'
			};
		}

		if (-diff < 20) {
			return {
				type: 'warning',
				message: `Age gap seems unusual for ${self.relationship} relationship (${-diff} years). Please verify the ages are correct.`,
				severity: 'medium',
				bankImpact: 'Banks may request additional documentation'
			};
		}
	}

	// Grandparent relationships
	if (rule.roleGroup === 'grandparent') {
		if (diff <= 0) {
			return {
				type: 'error',
				message: `${self.relationship} cannot be younger than or same age as ${target.fullName}`,
				severity: 'high'
			};
		}

		if (rule.minAgeGap && diff < rule.minAgeGap) {
			return {
				type: 'error',
				message: `Age gap too small for ${self.relationship} relationship. Minimum ${rule.minAgeGap} years required, found ${diff} years.`,
				severity: 'high'
			};
		}
	}

	// Sibling relationships
	if (rule.roleGroup === 'sibling') {
		if (rule.maxAgeDiff && absDiff > rule.maxAgeDiff) {
			return {
				type: 'warning',
				message: `Large age gap for ${self.relationship} relationship (${absDiff} years). This is acceptable but unusual.`,
				severity: 'low'
			};
		}
	}

	// Spouse relationships
	if (rule.roleGroup === 'spouse') {
		if (rule.maxAgeDiff && absDiff > rule.maxAgeDiff) {
			return {
				type: 'warning',
				message: `Large age gap for ${self.relationship} relationship (${absDiff} years). This is acceptable but may need verification.`,
				severity: 'low'
			};
		}
	}

	return null;
}

/**
 * Find connecting person for in-law relationships
 */
function findConnectingPerson(
	applicants: Applicant[],
	person1: Applicant,
	person2: Applicant
): Applicant | null {
	const relation = person1.otherBloodRelation || person1.relationship;

	// Brother-in-law / Sister-in-law logic
	if (relation === 'Brother-in-law' || relation === 'Sister-in-law') {
		// Look for:
		// 1. Person1's spouse who is sibling of Person2
		// 2. Person2's spouse who is sibling of Person1
		// 3. Person1's sibling who is spouse of Person2
		// 4. Person2's sibling who is spouse of Person1

		return (
			applicants.find((a) => {
				if (a === person1 || a === person2) return false;

				// Check if this person connects them
				const isSpouseOf1 =
					(a.relationship === 'Wife' || a.relationship === 'Husband') &&
					a.relationwith === person1.fullName;

				const isSpouseOf2 =
					(a.relationship === 'Wife' || a.relationship === 'Husband') &&
					a.relationwith === person2.fullName;

				const isSiblingOf1 =
					(a.relationship === 'Brother' || a.relationship === 'Sister') &&
					a.relationwith === person1.fullName;

				const isSiblingOf2 =
					(a.relationship === 'Brother' || a.relationship === 'Sister') &&
					a.relationwith === person2.fullName;

				// Valid connecting patterns
				if (isSpouseOf1 && isSiblingOf2) return true;
				if (isSpouseOf2 && isSiblingOf1) return true;
				if (isSiblingOf1 && isSpouseOf2) return true;
				if (isSiblingOf2 && isSpouseOf1) return true;

				return false;
			}) || null
		);
	}

	// Father-in-law / Mother-in-law logic
	if (relation === 'Father-in-law' || relation === 'Mother-in-law') {
		// Look for Person1's spouse who is child of Person2
		return (
			applicants.find((a) => {
				if (a === person1 || a === person2) return false;

				const isSpouseOf1 =
					(a.relationship === 'Wife' || a.relationship === 'Husband') &&
					a.relationwith === person1.fullName;

				const isChildOf2 =
					(a.relationship === 'Son' || a.relationship === 'Daughter') &&
					a.relationwith === person2.fullName;

				return isSpouseOf1 && isChildOf2;
			}) || null
		);
	}

	// Son-in-law / Daughter-in-law logic
	if (relation === 'Son-in-law' || relation === 'Daughter-in-law') {
		// Look for Person1's spouse who is child of Person2
		return (
			applicants.find((a) => {
				if (a === person1 || a === person2) return false;

				const isSpouseOf1 =
					(a.relationship === 'Wife' || a.relationship === 'Husband') &&
					a.relationwith === person1.fullName;

				const isChildOf2 =
					(a.relationship === 'Father' || a.relationship === 'Mother') &&
					a.relationwith === person2.fullName;

				return isSpouseOf1 && isChildOf2;
			}) || null
		);
	}

	return null;
}

/**
 * Validate in-law relationships for connecting person
 */
function validateInLawChain(applicants: Applicant[], index: number): ValidationResult | null {
	const self = applicants[index];
	if (!self?.otherBloodRelation || !self?.relationwith) return null;

	if (!inLawRelationships.includes(self.otherBloodRelation)) return null;

	const target = applicants.find((a) => a.fullName === self.relationwith);
	if (!target) return null;

	const connectingPerson = findConnectingPerson(applicants, self, target);

	if (!connectingPerson) {
		return {
			type: 'warning',
			message: `⚠️ ${self.otherBloodRelation} relationship detected without connecting family member on loan application.`,
			severity: 'medium',
			bankImpact: '60-70% private banks may accept this configuration',
			suggestedAction: `Consider adding connecting family member (spouse/sibling) to improve private bank eligibility to 95%+`
		};
	}

	return null;
}

/**
 * Validate bank acceptance based on relationship type
 */
function validateBankAcceptance(
	self: Applicant,
	relationshipCatalog: RelationshipCatalog
): ValidationResult | null {
	if (!self?.relationship) return null;

	const acceptance = getRelationshipAcceptance(self.relationship, self.otherBloodRelation);

	if (acceptance === 'low') {
		return {
			type: 'warning',
			message: `${self.otherBloodRelation || self.relationship} relationship: Lower acceptance by private banks`,
			severity: 'medium',
			bankImpact: '20-40% private banks may accept. Government banks more flexible.',
			suggestedAction: 'Consider adding more blood relations as co-applicants'
		};
	}

	if (acceptance === 'medium' && !inLawRelationships.includes(self.otherBloodRelation || '')) {
		const rule = relationshipCatalog[self.gender as string]?.find(
			(r: RelationshipRule) => r.label === self.relationship
		);
		if (
			rule &&
			!rule.bloodRelation &&
			self.relationship !== 'Husband' &&
			self.relationship !== 'Wife'
		) {
			return {
				type: 'info',
				message: `${self.otherBloodRelation || self.relationship}: Extended blood relation or non-blood relation`,
				severity: 'low',
				bankImpact: '70-80% private banks may accept with additional documentation'
			};
		}
	}

	return null;
}

/**
 * Main validation function - validates all aspects of an applicant's relationship
 */
export function validateApplicantRelationship(
	applicants: Applicant[],
	index: number,
	relationshipCatalog: RelationshipCatalog,
	reciprocalValidator: ReciprocalValidator
): ValidationResult[] {
	const results: ValidationResult[] = [];
	const self = applicants[index];

	if (!self) return results;

	// 1. Reciprocal relationship validation (existing logic)
	const pairError = reciprocalValidator(applicants, index, relationshipCatalog);
	if (pairError?.error) {
		results.push({
			type: 'error',
			message: pairError.error,
			severity: 'high'
		});
	}

	// 2. Age gap validation
	if (self.relationwith) {
		const target = applicants.find((a) => a.fullName === self.relationwith);
		if (target) {
			const ageError = validateAgeGap(self, target, relationshipCatalog);
			if (ageError) results.push(ageError);
		}
	}

	// 3. In-law chain validation
	const inLawWarning = validateInLawChain(applicants, index);
	if (inLawWarning) results.push(inLawWarning);

	// 4. Bank acceptance validation
	const bankWarning = validateBankAcceptance(self, relationshipCatalog);
	if (bankWarning) results.push(bankWarning);

	return results;
}

/**
 * Calculate overall relationship health score
 */
export function calculateRelationshipHealth(applicants: Applicant[]): {
	score: 'excellent' | 'good' | 'moderate' | 'poor';
	message: string;
	bankEligibility: string;
} {
	if (applicants.length === 0) {
		return {
			score: 'excellent',
			message: 'No applicants',
			bankEligibility: 'N/A'
		};
	}

	let allBloodOrSpouse = true;
	let hasInLawWithoutConnector = false;
	let hasNonBlood = false;

	for (const applicant of applicants) {
		if (!applicant.relationship) continue;

		const acceptance = getRelationshipAcceptance(
			applicant.relationship,
			applicant.otherBloodRelation
		);

		if (acceptance === 'low') {
			hasNonBlood = true;
			allBloodOrSpouse = false;
		}

		if (
			acceptance === 'medium' &&
			inLawRelationships.includes(applicant.otherBloodRelation || '')
		) {
			// Check if connecting person exists
			const target = applicants.find((a) => a.fullName === applicant.relationwith);
			if (target) {
				const connector = findConnectingPerson(applicants, applicant, target);
				if (!connector) {
					hasInLawWithoutConnector = true;
					allBloodOrSpouse = false;
				}
			}
		}

		if (
			applicant.relationship !== 'Husband' &&
			applicant.relationship !== 'Wife' &&
			acceptance !== 'high'
		) {
			allBloodOrSpouse = false;
		}
	}

	if (allBloodOrSpouse) {
		return {
			score: 'excellent',
			message: 'All primary blood relations and/or spouses',
			bankEligibility: '95%+ private banks'
		};
	}

	if (hasInLawWithoutConnector && !hasNonBlood) {
		return {
			score: 'good',
			message: 'In-law relations without connecting person',
			bankEligibility: '60-70% private banks, 95%+ government banks'
		};
	}

	if (hasNonBlood) {
		return {
			score: 'moderate',
			message: 'Contains non-blood relations',
			bankEligibility: '30-50% private banks, 80%+ government banks'
		};
	}

	return {
		score: 'good',
		message: 'Mixed relations with good acceptance',
		bankEligibility: '80%+ banks'
	};
}
