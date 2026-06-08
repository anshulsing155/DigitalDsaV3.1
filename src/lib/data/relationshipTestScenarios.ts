import type {
	Applicant,
	Relationship,
	RelationType
} from '$lib/components/relationship-capture/types';
import { getRelationshipCategory } from '$lib/components/relationship-capture/categoryClassifier';

function makeApplicant(
	id: string,
	name: string,
	age: number,
	gender: 'male' | 'female',
	maritalStatus: 'single' | 'married' = 'married'
): Applicant {
	return { id, name, age, gender, maritalStatus, role: 'both' };
}

function makeRelationship(fromId: string, toId: string, relationType: RelationType): Relationship {
	return {
		id: `rel-${fromId}-${toId}`,
		fromId,
		toId,
		relationType,
		category: getRelationshipCategory(relationType),
		source: 'user-defined',
		createdAt: new Date()
	};
}

export interface TestScenario {
	id: string;
	name: string;
	description: string;
	applicants: Applicant[];
	userRelationships: Relationship[];
	expectedInferences: { fromId: string; toId: string; relationType: RelationType }[];
}

export const relationshipTestScenarios: TestScenario[] = [
	// ── Scenario 1: Co-Parent (Forward) ──
	{
		id: 'scenario-1',
		name: 'Co-Parent (Forward)',
		description: 'Husband + Mother of child → Father of child',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Arjun', 8, 'male', 'single')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('B', 'C', 'Mother of')
		],
		expectedInferences: [{ fromId: 'A', toId: 'C', relationType: 'Father of' }]
	},

	// ── Scenario 2: Co-Parent (Reverse Order) ──
	{
		id: 'scenario-2',
		name: 'Co-Parent (Reverse Order)',
		description: 'Mother of child + Husband → Father of child (order independence)',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Arjun', 8, 'male', 'single')
		],
		userRelationships: [
			makeRelationship('B', 'C', 'Mother of'),
			makeRelationship('A', 'B', 'Husband of')
		],
		expectedInferences: [{ fromId: 'A', toId: 'C', relationType: 'Father of' }]
	},

	// ── Scenario 3: Co-Parent with Father ──
	{
		id: 'scenario-3',
		name: 'Co-Parent with Father',
		description: 'Husband + Father of child → Mother of child (wife inferred as mother)',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Arjun', 8, 'male', 'single')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('A', 'C', 'Father of')
		],
		expectedInferences: [{ fromId: 'B', toId: 'C', relationType: 'Mother of' }]
	},

	// ── Scenario 4: Father-in-Law (Forward) ──
	{
		id: 'scenario-4',
		name: 'Father-in-Law (Forward)',
		description: 'Husband + Daughter of older man → Father-in-law inference',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Ramesh', 62, 'male')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('B', 'C', 'Daughter of')
		],
		expectedInferences: [{ fromId: 'C', toId: 'A', relationType: 'Father-in-law of' }]
	},

	// ── Scenario 5: Father-in-Law (Reverse Order) ──
	{
		id: 'scenario-5',
		name: 'Father-in-Law (Reverse Order)',
		description: 'Daughter of + Husband → Father-in-law (order independence)',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Ramesh', 62, 'male')
		],
		userRelationships: [
			makeRelationship('B', 'C', 'Daughter of'),
			makeRelationship('A', 'B', 'Husband of')
		],
		expectedInferences: [{ fromId: 'C', toId: 'A', relationType: 'Father-in-law of' }]
	},

	// ── Scenario 6: Mother-in-Law ──
	{
		id: 'scenario-6',
		name: 'Mother-in-Law',
		description: 'Husband + Daughter of older woman → Mother-in-law inference',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Lakshmi', 58, 'female')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('B', 'C', 'Daughter of')
		],
		expectedInferences: [{ fromId: 'C', toId: 'A', relationType: 'Mother-in-law of' }]
	},

	// ── Scenario 7: Three Generations ──
	{
		id: 'scenario-7',
		name: 'Three Generations (Complete Family)',
		description: 'Grandfather + Father + Mother + Child → multiple inferences',
		applicants: [
			makeApplicant('A', 'Ramesh', 62, 'male'),
			makeApplicant('B', 'Rajesh', 35, 'male'),
			makeApplicant('C', 'Priya', 32, 'female'),
			makeApplicant('D', 'Arjun', 8, 'male', 'single')
		],
		userRelationships: [
			makeRelationship('B', 'C', 'Husband of'),
			makeRelationship('A', 'B', 'Father of'),
			makeRelationship('C', 'D', 'Mother of')
		],
		expectedInferences: [
			{ fromId: 'B', toId: 'D', relationType: 'Father of' },
			{ fromId: 'A', toId: 'C', relationType: 'Father-in-law of' },
			{ fromId: 'C', toId: 'A', relationType: 'Daughter-in-law of' }
		]
	},

	// ── Scenario 8: Sibling — shared parent builds sibling map (used for uncle/aunt paths) ──
	{
		id: 'scenario-8',
		name: 'Sibling from shared parent',
		description:
			'Two children of same father — engine builds sibling map internally but does not emit sibling inferences directly (LCA graph limitation). Verifies no false inferences produced.',
		applicants: [
			makeApplicant('A', 'Ramesh', 55, 'male'),
			makeApplicant('B', 'Rajesh', 30, 'male', 'single'),
			makeApplicant('C', 'Priya', 27, 'female', 'single')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Father of'),
			makeRelationship('A', 'C', 'Father of')
		],
		expectedInferences: []
	},

	// ── Edge Case 1: Co-Parent inferred regardless of age ──
	{
		id: 'edge-1',
		name: 'Edge: Co-Parent (age not validated)',
		description:
			'Husband + Mother of near-same-age person → Father still inferred (engine does not validate ages)',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Amit', 30, 'male', 'single')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('B', 'C', 'Mother of')
		],
		expectedInferences: [{ fromId: 'A', toId: 'C', relationType: 'Father of' }]
	},

	// ── Edge Case 2: FIL inferred regardless of age ──
	{
		id: 'edge-2',
		name: 'Edge: FIL (age not validated)',
		description:
			'Husband + Daughter of same-age person → Father-in-law still inferred (engine does not validate ages)',
		applicants: [
			makeApplicant('A', 'Rajesh', 35, 'male'),
			makeApplicant('B', 'Priya', 32, 'female'),
			makeApplicant('C', 'Vikram', 36, 'male')
		],
		userRelationships: [
			makeRelationship('A', 'B', 'Husband of'),
			makeRelationship('B', 'C', 'Daughter of')
		],
		expectedInferences: [{ fromId: 'C', toId: 'A', relationType: 'Father-in-law of' }]
	}
];
