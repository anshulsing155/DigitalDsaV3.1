/**
 * variantStashRegistry — pure function behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the stash/restore semantics for variant-gated questions.
 *
 * Today the registry has one rule (Plot Loan loanVariant gated by
 * loanType === 'New Loan'). When a second rule is added, copy the
 * Plot scenarios + adjust constants and these tests stay green.
 *
 * The picker (how-can-we-help/+page.svelte) calls applyVariantStashRules
 * BEFORE the changingKey write lands, so currentAnswers reflects the
 * PRE-change state. Tests mirror that ordering.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	applyVariantStashRules,
	VARIANT_STASH_RULES
} from '$lib/utils/variantStashRegistry';

describe('VARIANT_STASH_RULES (registry contents)', () => {
	it('includes the Plot Loan loanVariant rule', () => {
		const plotRule = VARIANT_STASH_RULES.find(
			(r) => r.loanName === 'Plot Loan' && r.gatedField === 'loanVariant'
		);
		expect(plotRule).toBeDefined();
		expect(plotRule).toMatchObject({
			scopeField: 'loanType',
			scopeValue: 'New Loan',
			gatedField: 'loanVariant',
			stashKey: '_stashedLoanVariant'
		});
	});
});

describe('applyVariantStashRules — Plot loanVariant', () => {
	it('stashes loanVariant when scope flips New Loan → Balance Transfer Only', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'Balance Transfer Only',
			currentAnswers: {
				loanType: 'New Loan',
				loanVariant: 'Plot & Equity Loan'
			}
		});

		expect(writes).toEqual([
			{ key: '_stashedLoanVariant', value: 'Plot & Equity Loan' },
			{ key: 'loanVariant', value: '' }
		]);
	});

	it('restores loanVariant when scope flips Balance Transfer Only → New Loan', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'New Loan',
			currentAnswers: {
				loanType: 'Balance Transfer Only',
				_stashedLoanVariant: 'Plot & Construction Loan'
			}
		});

		expect(writes).toEqual([
			{ key: 'loanVariant', value: 'Plot & Construction Loan' },
			{ key: '_stashedLoanVariant', value: '' }
		]);
	});

	it('no-op when stashing but loanVariant is empty (nothing to preserve)', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'Balance Transfer Only',
			currentAnswers: {
				loanType: 'New Loan',
				loanVariant: ''
			}
		});

		expect(writes).toEqual([]);
	});

	it('no-op when restoring but no value is stashed', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'New Loan',
			currentAnswers: {
				loanType: 'Balance Transfer Only'
				// no _stashedLoanVariant in the bag
			}
		});

		expect(writes).toEqual([]);
	});

	it('no-op when flipping between two non-scope values (e.g. BT → Top-Up)', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'Top-up Only',
			currentAnswers: {
				loanType: 'Balance Transfer Only',
				_stashedLoanVariant: 'Plot & Equity Loan'
			}
		});

		expect(writes).toEqual([]);
	});

	it('no-op when the scope value is unchanged (e.g. user reselects New Loan)', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'New Loan',
			currentAnswers: {
				loanType: 'New Loan',
				loanVariant: 'Plot Loan Only'
			}
		});

		expect(writes).toEqual([]);
	});
});

describe('applyVariantStashRules — non-matching contexts (no false fires)', () => {
	it('ignores a non-Plot loan name even when the key + values match', () => {
		const writes = applyVariantStashRules({
			loanName: 'Home Loan',
			changingKey: 'loanType',
			newValue: 'Balance Transfer Only',
			currentAnswers: {
				loanType: 'New Loan',
				loanVariant: 'whatever'
			}
		});

		expect(writes).toEqual([]);
	});

	it('ignores a Plot answer-change on a non-scope field (e.g. facilityType)', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'facilityType',
			newValue: 'Drop-line OverDraft (DOD)',
			currentAnswers: {
				loanType: 'New Loan',
				loanVariant: 'Plot Loan Only'
			}
		});

		expect(writes).toEqual([]);
	});

	it('does not crash when currentAnswers is empty', () => {
		const writes = applyVariantStashRules({
			loanName: 'Plot Loan',
			changingKey: 'loanType',
			newValue: 'New Loan',
			currentAnswers: {}
		});

		expect(writes).toEqual([]);
	});
});
