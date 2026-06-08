export type RoleGroup =
	| 'parent'
	| 'child'
	| 'sibling'
	| 'spouse'
	| 'grandparent'
	| 'in-law'
	| 'extended'
	| 'other';

export type RelationshipRule = {
	label: string;
	roleGroup: RoleGroup;
	minSelfAge?: number;
	minAgeGap?: number;
	maxAgeDiff?: number;
	directional: boolean;
	requiresOtherBloodRelation?: boolean;
	bloodRelation: boolean;
	requiresConnectingPerson?: boolean;
	lenderAcceptance: 'high' | 'medium' | 'low';
};

export const relationshipCatalog: Record<'Male' | 'Female', RelationshipRule[]> = {
	Male: [
		{
			label: 'Father',
			roleGroup: 'parent',
			minSelfAge: 28,
			minAgeGap: 18,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Brother',
			roleGroup: 'sibling',
			maxAgeDiff: 25,
			directional: false,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Son',
			roleGroup: 'child',
			minAgeGap: 18,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Husband',
			roleGroup: 'spouse',
			minSelfAge: 18,
			maxAgeDiff: 18,
			directional: true,
			bloodRelation: false,
			lenderAcceptance: 'high'
		},
		{
			label: 'Grandfather',
			roleGroup: 'grandparent',
			minSelfAge: 48,
			minAgeGap: 40,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Grandson',
			roleGroup: 'child',
			minAgeGap: 40,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Not in Blood Relation',
			roleGroup: 'other',
			directional: false,
			requiresOtherBloodRelation: true,
			bloodRelation: false,
			lenderAcceptance: 'medium'
		}
	],
	Female: [
		{
			label: 'Mother',
			roleGroup: 'parent',
			minSelfAge: 25,
			minAgeGap: 18,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Sister',
			roleGroup: 'sibling',
			maxAgeDiff: 25,
			directional: false,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Daughter',
			roleGroup: 'child',
			minAgeGap: 18,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Wife',
			roleGroup: 'spouse',
			minSelfAge: 18,
			maxAgeDiff: 18,
			directional: true,
			bloodRelation: false,
			lenderAcceptance: 'high'
		},
		{
			label: 'Grandmother',
			roleGroup: 'grandparent',
			minSelfAge: 45,
			minAgeGap: 40,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Granddaughter',
			roleGroup: 'child',
			minAgeGap: 40,
			directional: true,
			bloodRelation: true,
			lenderAcceptance: 'high'
		},
		{
			label: 'Not in Blood Relation',
			roleGroup: 'other',
			directional: false,
			requiresOtherBloodRelation: true,
			bloodRelation: false,
			lenderAcceptance: 'medium'
		}
	]
};

export const otherBloodRelationCatalog: Record<'Male' | 'Female', string[]> = {
	Male: ['Uncle', 'Brother-in-law', 'Father-in-law', 'Son-in-law', 'Nephew', 'Cousin', 'Friend'],
	Female: [
		'Aunty',
		'Sister-in-law',
		'Mother-in-law',
		'Daughter-in-law',
		'Niece',
		'Cousin',
		'Friend'
	]
};

// In-law relationships that require connecting person
export const inLawRelationships = [
	'Brother-in-law',
	'Sister-in-law',
	'Father-in-law',
	'Mother-in-law',
	'Son-in-law',
	'Daughter-in-law'
];

// Extended blood relations (medium acceptance)
export const extendedBloodRelations = ['Uncle', 'Aunty', 'Nephew', 'Niece', 'Cousin'];

// Non-blood relations (low acceptance)
export const nonBloodRelations = ['Friend'];

// Helper to determine acceptance level
export function getRelationshipAcceptance(
	relationship: string,
	otherBloodRelation?: string
): 'high' | 'medium' | 'low' {
	// Primary blood relations
	const primaryBlood = [
		'Father',
		'Mother',
		'Son',
		'Daughter',
		'Brother',
		'Sister',
		'Grandfather',
		'Grandmother',
		'Grandson',
		'Granddaughter'
	];

	// Spouse is always high
	if (relationship === 'Husband' || relationship === 'Wife') {
		return 'high';
	}

	if (primaryBlood.includes(relationship)) {
		return 'high';
	}

	if (relationship === 'Not in Blood Relation' && otherBloodRelation) {
		if (inLawRelationships.includes(otherBloodRelation)) {
			return 'medium'; // 60-70% banks
		}
		if (extendedBloodRelations.includes(otherBloodRelation)) {
			return 'medium'; // 70-80% banks
		}
		if (nonBloodRelations.includes(otherBloodRelation)) {
			return 'low'; // 20-30% banks
		}
	}

	return 'medium';
}
