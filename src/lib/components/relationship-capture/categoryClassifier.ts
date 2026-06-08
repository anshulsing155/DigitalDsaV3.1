/**
 * Relationship Category Classifier
 * Classifies relationships into 5 categories for lender validation
 */

import type { RelationType, RelationshipCategory } from './types';

export const RELATIONSHIP_CATEGORIES: Record<RelationType, RelationshipCategory> = {
	// Direct Family (Nuclear)
	'Husband of': 'direct_family',
	'Wife of': 'direct_family',
	'Father of': 'direct_family',
	'Mother of': 'direct_family',
	'Son of': 'direct_family',
	'Daughter of': 'direct_family',
	'Brother of': 'direct_family',
	'Sister of': 'direct_family',

	// Grandparents & Grandchildren
	'Grandfather of': 'grandparent_family',
	'Grandmother of': 'grandparent_family',
	'Grandson of': 'grandparent_family',
	'Granddaughter of': 'grandparent_family',

	// In-Laws
	'Father-in-law of': 'in_law_family',
	'Mother-in-law of': 'in_law_family',
	'Son-in-law of': 'in_law_family',
	'Daughter-in-law of': 'in_law_family',
	'Brother-in-law of': 'in_law_family',
	'Sister-in-law of': 'in_law_family',

	// Extended Family
	'Uncle of': 'extended_family',
	'Aunt of': 'extended_family',
	'Nephew of': 'extended_family',
	'Niece of': 'extended_family',
	'Cousin of': 'extended_family',

	// Non-Family
	'Friend of': 'non_family',
	'Business partner of': 'non_family',
	'No relation': 'non_family'
};

export const CATEGORY_DISPLAY_NAMES: Record<RelationshipCategory, string> = {
	direct_family: 'Direct Family',
	grandparent_family: 'Grandparents & Grandchildren',
	in_law_family: 'In-Laws',
	extended_family: 'Extended Family',
	non_family: 'Non-Family'
};

export const CATEGORY_DESCRIPTIONS: Record<RelationshipCategory, string> = {
	direct_family: 'Spouse, parents, children, siblings',
	grandparent_family: 'Grandparents and grandchildren',
	in_law_family: 'Relations by marriage',
	extended_family: 'Uncles, aunts, nephews, nieces, cousins',
	non_family: 'Friends, business partners, and unrelated persons'
};

/**
 * Get category for a relationship type
 */
export function getRelationshipCategory(relationType: RelationType): RelationshipCategory {
	return RELATIONSHIP_CATEGORIES[relationType];
}

/**
 * Check if a relationship is direct family
 */
export function isDirectFamily(relationType: RelationType): boolean {
	return RELATIONSHIP_CATEGORIES[relationType] === 'direct_family';
}

/**
 * Check if a relationship is grandparent family
 */
export function isGrandparentFamily(relationType: RelationType): boolean {
	return RELATIONSHIP_CATEGORIES[relationType] === 'grandparent_family';
}

/**
 * Check if a relationship is in-law
 */
export function isInLawFamily(relationType: RelationType): boolean {
	return RELATIONSHIP_CATEGORIES[relationType] === 'in_law_family';
}

/**
 * Check if a relationship is extended family
 */
export function isExtendedFamily(relationType: RelationType): boolean {
	return RELATIONSHIP_CATEGORIES[relationType] === 'extended_family';
}

/**
 * Check if a relationship is non-family
 */
export function isNonFamily(relationType: RelationType): boolean {
	return RELATIONSHIP_CATEGORIES[relationType] === 'non_family';
}

/**
 * Get all relationships of a specific category
 */
export function getRelationsByCategory(category: RelationshipCategory): RelationType[] {
	return Object.entries(RELATIONSHIP_CATEGORIES)
		.filter(([, cat]) => cat === category)
		.map(([rel]) => rel as RelationType);
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: RelationshipCategory): string {
	return CATEGORY_DISPLAY_NAMES[category];
}

/**
 * Get description for category
 */
export function getCategoryDescription(category: RelationshipCategory): string {
	return CATEGORY_DESCRIPTIONS[category];
}
