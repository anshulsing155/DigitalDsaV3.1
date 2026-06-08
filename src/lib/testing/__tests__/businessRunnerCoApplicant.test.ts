/**
 * P12 — sole-prop female-run business → co-applicant.
 * Tests the pure reconcile core (no Svelte / store side-effects).
 */
import { describe, it, expect } from 'vitest';
import {
	syncBusinessRunnerCoApplicant,
	buildBusinessRunnerApplicant,
	runnerIsOther,
	BUSINESS_RUNNER_OPTIONS,
	getBusinessRunnerOptionsForMaritalStatus
} from '$lib/utils/businessRunnerCoApplicant';

const PROP_ID = 'prop-1';
const proprietor = { id: PROP_ID, applicantType: 'Individual', applicantSubType: 'sole_proprietor' };

describe('getBusinessRunnerOptionsForMaritalStatus', () => {
	const valuesOf = (opts: typeof BUSINESS_RUNNER_OPTIONS) => opts.map((o) => o.value);

	it('Married → full list (currently has spouse + may have adult son)', () => {
		const opts = getBusinessRunnerOptionsForMaritalStatus('married');
		expect(valuesOf(opts)).toEqual(['self', 'husband', 'father', 'son', 'other']);
	});

	it('Single → excludes BOTH Husband (never married) AND Son (no prior marriage means no adult son in the Indian family context)', () => {
		const opts = getBusinessRunnerOptionsForMaritalStatus('single');
		expect(valuesOf(opts)).toEqual(['self', 'father', 'other']);
		expect(valuesOf(opts)).not.toContain('husband');
		expect(valuesOf(opts)).not.toContain('son');
	});

	it('Divorced → excludes Husband only (was married → may have adult son)', () => {
		const opts = getBusinessRunnerOptionsForMaritalStatus('divorced');
		expect(valuesOf(opts)).not.toContain('husband');
		expect(valuesOf(opts)).toContain('son');
	});

	it('Separated → excludes Husband only (was married → may have adult son)', () => {
		const opts = getBusinessRunnerOptionsForMaritalStatus('separated');
		expect(valuesOf(opts)).not.toContain('husband');
		expect(valuesOf(opts)).toContain('son');
	});

	it('Widowed → excludes Husband only (was married → may have adult son)', () => {
		const opts = getBusinessRunnerOptionsForMaritalStatus('widowed');
		expect(valuesOf(opts)).not.toContain('husband');
		expect(valuesOf(opts)).toContain('son');
	});

	it('Empty / null / undefined → permissive (full list, do not punish unanswered)', () => {
		expect(valuesOf(getBusinessRunnerOptionsForMaritalStatus(''))).toEqual(
			valuesOf(BUSINESS_RUNNER_OPTIONS)
		);
		expect(valuesOf(getBusinessRunnerOptionsForMaritalStatus(null))).toEqual(
			valuesOf(BUSINESS_RUNNER_OPTIONS)
		);
		expect(valuesOf(getBusinessRunnerOptionsForMaritalStatus(undefined))).toEqual(
			valuesOf(BUSINESS_RUNNER_OPTIONS)
		);
	});

	it('Case + whitespace tolerant — "  Married  " / "SINGLE" classified correctly', () => {
		const marriedOpts = valuesOf(getBusinessRunnerOptionsForMaritalStatus('  Married  '));
		expect(marriedOpts).toContain('husband');
		expect(marriedOpts).toContain('son');
		const singleOpts = valuesOf(getBusinessRunnerOptionsForMaritalStatus('SINGLE'));
		expect(singleOpts).not.toContain('husband');
		expect(singleOpts).not.toContain('son');
	});

	it('Father / Other / Self always present regardless of status', () => {
		for (const status of ['married', 'single', 'divorced', 'separated', 'widowed', '']) {
			const vals = valuesOf(getBusinessRunnerOptionsForMaritalStatus(status));
			expect(vals, `status=${status}`).toEqual(expect.arrayContaining(['self', 'father', 'other']));
		}
	});
});

describe('runnerIsOther', () => {
	it('true for husband/father/son/other', () => {
		expect(runnerIsOther('husband')).toBe(true);
		expect(runnerIsOther('father')).toBe(true);
		expect(runnerIsOther('son')).toBe(true);
		expect(runnerIsOther('other')).toBe(true);
	});
	it('false for self / blank / null', () => {
		expect(runnerIsOther('self')).toBe(false);
		expect(runnerIsOther('')).toBe(false);
		expect(runnerIsOther(null)).toBe(false);
		expect(runnerIsOther(undefined)).toBe(false);
	});
});

describe('buildBusinessRunnerApplicant', () => {
	it('runner is verification-only (non_applicant_full_financial, not on EMI/property)', () => {
		const r = buildBusinessRunnerApplicant(PROP_ID, 'husband');
		expect(r.applicantClassification).toBe('non_applicant_full_financial');
		expect(r.onEMI).toBe(false);
		expect(r.onProperty).toBe(false);
		expect(r.businessRunnerFor).toBe(PROP_ID);
		expect(r.gender).toBe('male'); // husband → male inferred
	});
	it('Other runner has no inferred gender', () => {
		expect(buildBusinessRunnerApplicant(PROP_ID, 'other').gender).toBe('');
	});
});

describe('syncBusinessRunnerCoApplicant', () => {
	it('Self → no runner created', () => {
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'self', [proprietor]);
		expect(res.applicants).toHaveLength(1);
		expect(res.runnerId).toBeNull();
		expect(res.relationshipToAdd).toBeNull();
	});

	it('Husband → creates a runner co-applicant + forward relationship', () => {
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]);
		expect(res.applicants).toHaveLength(2);
		const runner = res.applicants.find((a) => a.businessRunnerFor === PROP_ID)!;
		expect(runner.applicantClassification).toBe('non_applicant_full_financial');
		expect(res.relationshipToAdd).toEqual({
			fromId: runner.id,
			toId: PROP_ID,
			relationType: 'Husband of'
		});
	});

	it('Other → creates a runner but NO relationship (relation unknown)', () => {
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'other', [proprietor]);
		expect(res.applicants).toHaveLength(2);
		expect(res.relationshipToAdd).toBeNull();
		expect(res.runnerId).not.toBeNull();
	});

	it('Self after a runner exists → removes the runner, signals its id + returns it for stashing', () => {
		const withRunner = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]).applicants;
		const runnerId = withRunner.find((a) => a.businessRunnerFor === PROP_ID)!.id;
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'self', withRunner);
		expect(res.applicants).toHaveLength(1);
		expect(res.applicants.find((a) => a.businessRunnerFor === PROP_ID)).toBeUndefined();
		expect(res.runnerId).toBe(runnerId);
		expect(res.removedRunner).not.toBeNull();
		expect(res.removedRunner!.id).toBe(runnerId);
	});

	it('blank answer (gender flipped away) also removes + returns the runner to stash', () => {
		const withRunner = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]).applicants;
		const res = syncBusinessRunnerCoApplicant(PROP_ID, '', withRunner);
		expect(res.applicants.find((a) => a.businessRunnerFor === PROP_ID)).toBeUndefined();
		expect(res.removedRunner).not.toBeNull();
	});

	it('retrieve earlier details: rehydrates from stash, reusing id + preserving data', () => {
		// Create + fill, then remove (capturing the stash), then re-create from the stash.
		const created = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]).applicants;
		const filled = created.map((a) =>
			a.businessRunnerFor === PROP_ID ? { ...a, fullName: 'Ramesh', age: '45' } : a
		);
		const removed = syncBusinessRunnerCoApplicant(PROP_ID, 'self', filled);
		const stashed = removed.removedRunner!;

		// Proprietor returns to female + names husband again → rehydrate from stash.
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor], stashed);
		const runner = res.applicants.find((a) => a.businessRunnerFor === PROP_ID)!;
		expect(runner.id).toBe(stashed.id); // same id → income/obligations re-link
		expect(runner.fullName).toBe('Ramesh'); // earlier details retrieved
		expect(runner.age).toBe('45');
		expect(runner.applicantClassification).toBe('non_applicant_full_financial');
	});

	it('changing relation (husband → father) preserves the same runner + filled data', () => {
		const first = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]).applicants;
		// DSA fills the runner's name + age
		const filled = first.map((a) =>
			a.businessRunnerFor === PROP_ID ? { ...a, fullName: 'Ramesh', age: '45' } : a
		);
		const runnerId = filled.find((a) => a.businessRunnerFor === PROP_ID)!.id;
		const res = syncBusinessRunnerCoApplicant(PROP_ID, 'father', filled);
		const runner = res.applicants.find((a) => a.businessRunnerFor === PROP_ID)!;
		expect(res.applicants).toHaveLength(2);
		expect(runner.id).toBe(runnerId); // same record reused
		expect(runner.fullName).toBe('Ramesh'); // data preserved
		expect(runner.businessRunnerRelation).toBe('father');
		expect(res.relationshipToAdd!.relationType).toBe('Father of');
	});

	it('options list leads with Self', () => {
		expect(BUSINESS_RUNNER_OPTIONS[0]).toEqual({ label: 'Self', value: 'self' });
	});

	// ── Entity-switch round-trip (sole-prop → company → sole-prop) ──
	// The Business Runner Page captures fullName + age + gender + (for Other)
	// otherRunnerRelationLabel. When the DSA switches entity type (sole-prop →
	// Pvt Ltd), AddApplicantBusiness stashes the runner into
	// businessRunnerStashStore keyed by proprietor.id. When the proprietor is
	// restored later, syncBusinessRunnerCoApplicant's stash arg should rebuild
	// the runner with every Runner-Page field preserved AND the same id (so
	// applicantDataStore income/obligations re-link automatically).
	describe('entity-switch round-trip', () => {
		it('Husband runner — all Runner-Page fields survive the round-trip', () => {
			// Step 1: DSA fills the runner via the Runner Page.
			const created = syncBusinessRunnerCoApplicant(PROP_ID, 'husband', [proprietor]).applicants;
			const initial = created.find((a) => a.businessRunnerFor === PROP_ID)!;
			const filledRunner: Record<string, unknown> = {
				...initial,
				fullName: 'Raj',
				age: 35,
				gender: 'male'
				// husband locks gender + relation, so no otherRunnerRelationLabel
			};
			const filledId = filledRunner.id as string;
			// Step 2: Simulate AddApplicantBusiness stashing on entity switch
			// (the component lifts the runner into businessRunnerStashStore here).
			const stashedSnapshot = { ...filledRunner };

			// Step 3: DSA returns to sole-prop and re-enters the SAME proprietor.
			// syncBusinessRunnerCoApplicant receives the stash and rebuilds.
			const restored = syncBusinessRunnerCoApplicant(
				PROP_ID,
				'husband',
				[proprietor],
				stashedSnapshot
			);
			const runner = restored.applicants.find((a) => a.businessRunnerFor === PROP_ID)!;
			expect(runner.id).toBe(filledId);
			expect(runner.fullName).toBe('Raj');
			expect(runner.age).toBe(35);
			expect(runner.gender).toBe('male');
			expect(runner.applicantClassification).toBe('non_applicant_full_financial');
		});

		it('Other runner — gender + otherRunnerRelationLabel survive the round-trip', () => {
			// Other runner has DSA-entered gender + relation label (not auto-locked).
			const created = syncBusinessRunnerCoApplicant(PROP_ID, 'other', [proprietor]).applicants;
			const initial = created.find((a) => a.businessRunnerFor === PROP_ID)!;
			const filledRunner: Record<string, unknown> = {
				...initial,
				fullName: 'Anita',
				age: 40,
				gender: 'female',
				otherRunnerRelationLabel: 'Sister'
			};
			const filledId = filledRunner.id as string;
			const stashedSnapshot = { ...filledRunner };

			const restored = syncBusinessRunnerCoApplicant(
				PROP_ID,
				'other',
				[proprietor],
				stashedSnapshot
			);
			const runner = restored.applicants.find((a) => a.businessRunnerFor === PROP_ID)!;
			expect(runner.id).toBe(filledId);
			expect(runner.fullName).toBe('Anita');
			expect(runner.age).toBe(40);
			expect(runner.gender).toBe('female'); // DSA-chosen, not auto-inferred
			expect(runner.otherRunnerRelationLabel).toBe('Sister');
		});

		it('Stash is scoped per-proprietor: a DIFFERENT proprietor returning gets a fresh runner, not the stashed one', () => {
			// Cross-proprietor leak prevention. The stash is keyed by proprietor.id.
			// If a NEW proprietor (different id) returns to sole-prop, the lookup
			// misses, and syncBusinessRunnerCoApplicant creates a fresh runner
			// without any of the previous proprietor's runner data.
			const filledRunner = {
				id: 'runner-old',
				applicantType: 'Individual',
				applicantSubType: 'business_runner',
				businessRunnerFor: PROP_ID,
				businessRunnerRelation: 'husband',
				applicantClassification: 'non_applicant_full_financial',
				onEMI: false,
				onProperty: false,
				gender: 'male',
				fullName: 'Raj',
				age: 35
			};
			// New proprietor — different id, no stash entry for this id.
			const NEW_PROP = 'prop-2';
			const newProprietor = {
				id: NEW_PROP,
				applicantType: 'Individual',
				applicantSubType: 'sole_proprietor'
			};
			// Caller looks up stash[NEW_PROP] — finds nothing → passes undefined.
			const res = syncBusinessRunnerCoApplicant(NEW_PROP, 'husband', [newProprietor], undefined);
			const runner = res.applicants.find((a) => a.businessRunnerFor === NEW_PROP)!;
			expect(runner.id).not.toBe(filledRunner.id); // fresh uuid, NOT Raj's id
			expect(runner.fullName).toBeUndefined();
			expect(runner.age).toBeUndefined();
		});
	});
});
