import { describe, it, expect } from 'vitest';
import { createFormEngine, transformJsonLogicToCustom } from '$lib/server/formEngine/engine';
import { getEngineOptions } from '$lib/server/formEngine/engineContext';
import { evaluateCondition } from '$lib/config/showWhenEngine';

describe('FormEngine showWhen transform', () => {
	it('evaluates == operator correctly in showWhen conditions', async () => {
		const engine = createFormEngine('Plot Loan');
		const options = getEngineOptions();

		// q4_leaseRemainingPeriod on propertyCharacter_Plot (page 3, after caseIntake + propertyIdentification + propertyLocation_Plot) uses:
		// {"==":[{"var":"propertyType"},"Lease Hold"]}
		// Verify the server-side showWhen transform preserves == with scalar values.
		const page = await engine.evaluatePage(
			3,
			{
				// Post-rename canonical (ADR-0020): scope on `loanType`, variant on
				// `loanVariant`. Pre-rename this had `PlotLoanActivity: 'New Loan' +
				// loanType: 'Plot Loan Only'`. Fixed S210 D-incoming-1.
				loanName: 'Plot Loan',
				loanType: 'New Loan',
				loanVariant: 'Plot Loan Only',
				propertyAreaType: 'PLANNED_AUTHORITY',
				landUseClassification: 'residential',
				purchaseType: 'direct_from_authority',
				propertyType: 'Lease Hold'
			},
			options
		);

		const leaseQ = page.questions.find((q) => q.id === 'q4_leaseRemainingPeriod');
		expect(
			leaseQ,
			'q4_leaseRemainingPeriod should be visible when propertyType is Lease Hold'
		).toBeDefined();

		const showWhenText = JSON.stringify(leaseQ?.showWhen);
		expect(showWhenText).toContain('"propertyType"');
		expect(showWhenText).toContain('"Lease Hold"');
	});

	it('unwraps single-element ! arrays so client evaluateCondition works', () => {
		// JSON-Logic: { "!": [{ "in": [{ "var": "x" }, ["a"]] }] }
		// Should transform to: { "!": { "in": ["x", ["a"]] } } (object, not array)
		const input = { '!': [{ in: [{ var: 'purchaseType' }, ['direct_from_authority']] }] };
		const result = transformJsonLogicToCustom(input) as Record<string, unknown>;

		// Must be an object (not an array) so evaluateCondition handles it
		expect(result['!']).not.toBeInstanceOf(Array);
		expect(result['!']).toEqual({ in: ['purchaseType', ['direct_from_authority']] });

		// Client evaluation: purchaseType is NOT 'direct_from_authority' → should be visible (true)
		const visible = evaluateCondition(result as any, { purchaseType: 'direct_from_builder' });
		expect(visible).toBe(true);

		// Client evaluation: purchaseType IS 'direct_from_authority' → should be hidden (false)
		const hidden = evaluateCondition(result as any, { purchaseType: 'direct_from_authority' });
		expect(hidden).toBe(false);
	});

	it('handles ! with variable reference (truthiness check)', () => {
		// JSON-Logic: { "!": [{ "var": "flag" }] } means NOT(flag)
		const input = { '!': [{ var: 'flag' }] };
		const result = transformJsonLogicToCustom(input) as Record<string, unknown>;

		// Should unwrap to { "!": "flag" }
		expect(result['!']).toBe('flag');

		// Flag is unset → NOT(falsy) → true
		expect(evaluateCondition(result as any, {})).toBe(true);
		expect(evaluateCondition(result as any, { flag: '' })).toBe(true);
		expect(evaluateCondition(result as any, { flag: null })).toBe(true);

		// Flag is set → NOT(truthy) → false
		expect(evaluateCondition(result as any, { flag: 'yes' })).toBe(false);
		expect(evaluateCondition(result as any, { flag: true })).toBe(false);
	});

	it('provides state options for Plot Loan compound location question', async () => {
		const engine = createFormEngine('Plot Loan');
		const options = getEngineOptions();

		// Page 1 (propertyIdentificationPage, after caseIntake at page 0) includes the compound location question.
		const page = await engine.evaluatePage(
			1,
			{
				// Post-rename canonical (ADR-0020). Fixed S210 D-incoming-1.
				loanName: 'Plot Loan',
				loanType: 'New Loan',
				loanVariant: 'Plot Loan Only'
			},
			options
		);

		// q_propertyLocation is the compound location question (replaces q2/q3/q3b)
		const locationQ = page.questions.find((q) => q.id === 'q_propertyLocation');
		expect(
			locationQ,
			'q_propertyLocation should be visible with the provided answers'
		).toBeDefined();
		// Location questions get state options populated by the engine
		expect(Array.isArray(locationQ?.options)).toBe(true);
		expect((locationQ?.options ?? []).length).toBeGreaterThan(0);

		// Verify the compound question has locationBindsTo map
		expect(locationQ?.locationBindsTo).toBeDefined();
		expect(locationQ?.locationBindsTo?.state).toBe('propertyStateName');
		expect(locationQ?.locationBindsTo?.city).toBe('propertyCityName');
	});
});
