import { describe, it, expect } from 'vitest';
import { relationshipTestScenarios, type TestScenario } from '$lib/data/relationshipTestScenarios';
import { computeInferredRelationships } from '$lib/components/relationship-capture/inferenceEngine';

// ─── Test Scenario Structure Validation ─────────────────────────

describe('Relationship Test Scenarios — structure validation', () => {
	it('each scenario has required fields (name, applicants, expectedInferences)', () => {
		for (const scenario of relationshipTestScenarios) {
			expect(scenario.id, `Scenario should have an id`).toBeDefined();
			expect(typeof scenario.id).toBe('string');

			expect(scenario.name, `Scenario "${scenario.id}" should have a name`).toBeDefined();
			expect(typeof scenario.name).toBe('string');
			expect(scenario.name.length).toBeGreaterThan(0);

			expect(
				scenario.applicants,
				`Scenario "${scenario.name}" should have applicants`
			).toBeDefined();
			expect(Array.isArray(scenario.applicants)).toBe(true);

			expect(
				scenario.expectedInferences,
				`Scenario "${scenario.name}" should have expectedInferences`
			).toBeDefined();
			expect(Array.isArray(scenario.expectedInferences)).toBe(true);
		}
	});

	it('each scenario has at least 2 applicants', () => {
		for (const scenario of relationshipTestScenarios) {
			expect(
				scenario.applicants.length,
				`Scenario "${scenario.name}" should have at least 2 applicants`
			).toBeGreaterThanOrEqual(2);
		}
	});

	it('test scenarios cover key relationship types (co-parent, sibling, in-law)', () => {
		const allScenarioNames = relationshipTestScenarios.map((s) => s.name.toLowerCase());
		const allExpectedTypes = relationshipTestScenarios.flatMap((s) =>
			s.expectedInferences.map((e) => e.relationType)
		);

		// Co-parent scenarios (Father of / Mother of inferred from spouse + parent)
		const hasCoParent =
			allScenarioNames.some((name) => name.includes('co-parent')) ||
			allExpectedTypes.includes('Father of') ||
			allExpectedTypes.includes('Mother of');
		expect(hasCoParent, 'Test scenarios should cover co-parent relationships').toBe(true);

		// Sibling scenarios
		const hasSibling =
			allScenarioNames.some((name) => name.includes('sibling')) ||
			allExpectedTypes.includes('Brother of') ||
			allExpectedTypes.includes('Sister of');
		expect(hasSibling, 'Test scenarios should cover sibling relationships').toBe(true);

		// In-law scenarios
		const hasInLaw =
			allScenarioNames.some((name) => name.includes('in-law')) ||
			allExpectedTypes.includes('Father-in-law of') ||
			allExpectedTypes.includes('Mother-in-law of') ||
			allExpectedTypes.includes('Daughter-in-law of') ||
			allExpectedTypes.includes('Son-in-law of');
		expect(hasInLaw, 'Test scenarios should cover in-law relationships').toBe(true);
	});

	it('scenario structure is consistent', () => {
		for (const scenario of relationshipTestScenarios) {
			// description should be a non-empty string
			expect(typeof scenario.description).toBe('string');
			expect(scenario.description.length).toBeGreaterThan(0);

			// userRelationships should be an array
			expect(Array.isArray(scenario.userRelationships)).toBe(true);

			// Each applicant should have id, name, gender
			for (const applicant of scenario.applicants) {
				expect(applicant.id, `Applicant in "${scenario.name}" should have id`).toBeDefined();
				expect(applicant.name, `Applicant in "${scenario.name}" should have name`).toBeDefined();
				expect(
					applicant.gender,
					`Applicant in "${scenario.name}" should have gender`
				).toBeDefined();
				expect(['male', 'female']).toContain(applicant.gender);
			}

			// Each expected inference should have fromId, toId, relationType
			for (const inference of scenario.expectedInferences) {
				expect(inference.fromId).toBeDefined();
				expect(inference.toId).toBeDefined();
				expect(inference.relationType).toBeDefined();
				expect(typeof inference.relationType).toBe('string');
			}

			// Each user relationship should have proper structure
			for (const rel of scenario.userRelationships) {
				expect(rel.id).toBeDefined();
				expect(rel.fromId).toBeDefined();
				expect(rel.toId).toBeDefined();
				expect(rel.relationType).toBeDefined();
				expect(rel.category).toBeDefined();
				expect(rel.source).toBe('user-defined');
			}
		}
	});
});

// ─── Inference Engine Functional Tests ──────────────────────────

describe('Relationship Inference Engine — computeInferredRelationships', () => {
	it('Scenario 1: Co-Parent (Forward) — Husband + Mother → Father inferred', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-1')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 2: Co-Parent (Reverse Order) — order independence', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-2')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 3: Co-Parent with Father — wife inferred as mother', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-3')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 4: Father-in-Law (Forward)', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-4')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 5: Father-in-Law (Reverse Order) — order independence', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-5')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 6: Mother-in-Law', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-6')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 7: Three Generations — multiple inferences', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-7')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Scenario 8: Shared parent — no false sibling inferences emitted', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'scenario-8')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		// Engine builds sibling map from shared parents internally but does not emit
		// sibling inferences directly (LCA graph traverses parent→child, not child→parent)
		expect(scenario.expectedInferences.length, 'Scenario 8 should expect no inferences').toBe(0);

		// Verify no false Brother/Sister inferences between B and C
		const falseSibling = inferred.some(
			(r) =>
				((r.fromId === 'B' && r.toId === 'C') || (r.fromId === 'C' && r.toId === 'B')) &&
				(r.relationType === 'Brother of' || r.relationType === 'Sister of')
		);
		expect(falseSibling, 'Should NOT emit sibling inferences from shared parent alone').toBe(false);
	});

	it('Edge Case 1: Co-Parent inferred regardless of age gap', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'edge-1')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		// Engine does NOT validate ages — Father is inferred even with small age gap
		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('Edge Case 2: FIL inferred regardless of age proximity', () => {
		const scenario = relationshipTestScenarios.find((s) => s.id === 'edge-2')!;
		expect(scenario).toBeDefined();

		const inferred = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

		// Engine does NOT validate ages — Father-in-law is inferred even when ages are close
		for (const expected of scenario.expectedInferences) {
			const found = inferred.some(
				(r) =>
					r.fromId === expected.fromId &&
					r.toId === expected.toId &&
					r.relationType === expected.relationType
			);
			expect(
				found,
				`Expected inference ${expected.fromId} → "${expected.relationType}" → ${expected.toId} not found in scenario "${scenario.name}"`
			).toBe(true);
		}
	});

	it('all inferred relationships have source "inferred"', () => {
		for (const scenario of relationshipTestScenarios) {
			const inferred = computeInferredRelationships(
				scenario.applicants,
				scenario.userRelationships
			);

			for (const rel of inferred) {
				expect(
					rel.source,
					`Inferred relationship in "${scenario.name}" should have source "inferred"`
				).toBe('inferred');
			}
		}
	});

	it('all inferred relationships have a valid category', () => {
		const validCategories = [
			'direct_family',
			'grandparent_family',
			'in_law_family',
			'extended_family',
			'non_family'
		];

		for (const scenario of relationshipTestScenarios) {
			const inferred = computeInferredRelationships(
				scenario.applicants,
				scenario.userRelationships
			);

			for (const rel of inferred) {
				expect(
					validCategories,
					`Inferred relationship category "${rel.category}" in "${scenario.name}" should be valid`
				).toContain(rel.category);
			}
		}
	});
});
