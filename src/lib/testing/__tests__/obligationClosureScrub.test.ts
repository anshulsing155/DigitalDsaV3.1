/**
 * Tests for `obligationClosureScrub` — journey-dependent closure-plan validation.
 *
 * Reproduces CLAUDE.md Pitfall #31: cross-loan restore can leave an obligation's
 * `selectedToClose` pointing at an option that isn't visible in the target
 * journey's option list. Without the scrub, the Saved Obligations chip shows
 * a stale label, the form has no option selected, and the Next-disabled gate
 * silently passes.
 *
 * The user-reported scenario:
 *   1. Applicant created in Personal Loan > Debt Consolidation > Joint(2).
 *      Obligation captured with closure = "Will be closed by Top-up amount".
 *   2. Journey switched to Plot Loan > New Loan > Plot Loan Only.
 *   3. Applicant restored. Old obligation auto-filled, BUT:
 *      - "Will be closed" option isn't in Plot/New Loan's visible options.
 *      - Saved Obligations chip still showed "Close (Top-up)".
 *      - Form had no option selected; Next was still enabled.
 */

import { describe, it, expect } from 'vitest';
import {
	isClosureValueValid,
	scrubObligationForJourney,
	scrubObligationsForJourney
} from '$lib/utils/obligationClosureScrub';

describe('isClosureValueValid', () => {
	it('returns true for empty/unset selectedToClose (incompleteness, not invalidity)', () => {
		expect(isClosureValueValid('', 'co-applicant', 'Car Loan', 'New Loan')).toBe(true);
		expect(isClosureValueValid(null, 'co-applicant', 'Car Loan', 'New Loan')).toBe(true);
		expect(isClosureValueValid(undefined, 'co-applicant', 'Car Loan', 'New Loan')).toBe(true);
	});

	it('Keep Running is valid in any journey', () => {
		expect(isClosureValueValid('Keep running', 'co-applicant', 'Car Loan', 'New Loan')).toBe(true);
		expect(isClosureValueValid('Keep running', 'co-applicant', 'Car Loan', 'Top-up')).toBe(true);
		expect(
			isClosureValueValid('Keep running', 'co-applicant', 'Car Loan', 'Debt Consolidation')
		).toBe(true);
	});

	it('Self-funded closure is valid in any non-guarantor journey', () => {
		expect(
			isClosureValueValid(
				'Self-funded closure before disbursement',
				'co-applicant',
				'Car Loan',
				'New Loan'
			)
		).toBe(true);
		expect(
			isClosureValueValid(
				'Self-funded closure before disbursement',
				'co-applicant',
				'Car Loan',
				'Top-up'
			)
		).toBe(true);
	});

	// Core regression — user's exact reported scenario
	it('"Will be closed by Top-up amount" is INVALID in New Loan journey', () => {
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Car Loan',
				'New Loan'
			),
			'stale Top-up closure from prior DC journey must be detected on Plot-New journey'
		).toBe(false);
	});

	it('"Will be closed by Top-up amount" is VALID in Top-up Only / DC / BT+Top-up journeys', () => {
		// PITFALL UPDATE (2026-05-28): canonical variant strings are now exact
		// matches in CLOSURE_ALLOWED_VARIANTS. 'Top-up Only' and 'Balance Transfer
		// With Top-up' are the valid forms. The legacy loose 'Top-up' substring
		// no longer matches.
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Car Loan',
				'Top-up Only'
			)
		).toBe(true);
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Car Loan',
				'Debt Consolidation'
			)
		).toBe(true);
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Car Loan',
				'Balance Transfer With Top-up'
			)
		).toBe(true);
	});

	it('"Will be closed by Top-up amount" is INVALID in Balance Transfer Only journey (no extra funds)', () => {
		// BT-only just refinances the existing loan — no extra cash to close
		// another obligation. The scrub must detect this if the user lands on
		// the page after switching from BT+Top-up to BT-only mid-journey.
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Car Loan',
				'Balance Transfer Only'
			)
		).toBe(false);
	});

	it('"Will be closed" is ALWAYS valid for LAP obligations (LAP can close any obligation)', () => {
		expect(
			isClosureValueValid(
				'Will be closed by Top-up amount',
				'co-applicant',
				'Loan Against Property',
				'New Loan'
			),
			'LAP obligation special case: closure-by-new-loan is always available'
		).toBe(true);
	});

	it('"Not my liability" is valid only for guarantor role', () => {
		expect(
			isClosureValueValid(
				'Not my actual liability (Guarantor/Paper only)',
				'guarantor',
				'Car Loan',
				'New Loan'
			)
		).toBe(true);
		expect(
			isClosureValueValid(
				'Not my actual liability (Guarantor/Paper only)',
				'co-applicant',
				'Car Loan',
				'New Loan'
			),
			'co-applicant cannot claim "Not my liability"'
		).toBe(false);
	});
});

describe('scrubObligationForJourney', () => {
	it('returns same reference when selectedToClose is empty', () => {
		const obl = { id: 'o1', selectedToClose: '', loanType: 'Car Loan', role: 'co-applicant' };
		expect(scrubObligationForJourney(obl, 'New Loan')).toBe(obl);
	});

	it('returns same reference when closure is valid for the journey', () => {
		const obl = {
			id: 'o1',
			selectedToClose: 'Keep running',
			loanType: 'Car Loan',
			role: 'co-applicant'
		};
		expect(scrubObligationForJourney(obl, 'New Loan')).toBe(obl);
	});

	it('clears selectedToClose when stale, preserves other fields', () => {
		const obl = {
			id: 'o1',
			selectedToClose: 'Will be closed by Top-up amount',
			loanType: 'Car Loan',
			role: 'co-applicant',
			emi: '16939',
			tenure: '12',
			rate: '5'
		};
		const result = scrubObligationForJourney(obl, 'New Loan');
		expect(result).not.toBe(obl);
		expect(result.selectedToClose).toBe('');
		// Other fields preserved
		expect(result.loanType).toBe('Car Loan');
		expect(result.role).toBe('co-applicant');
		expect(result.emi).toBe('16939');
		expect(result.tenure).toBe('12');
	});

	it('does NOT clear when journey supports the closure (DC keeps Top-up closure)', () => {
		const obl = {
			id: 'o1',
			selectedToClose: 'Will be closed by Top-up amount',
			loanType: 'Car Loan',
			role: 'co-applicant'
		};
		expect(scrubObligationForJourney(obl, 'Debt Consolidation')).toBe(obl);
	});
});

describe('scrubObligationsForJourney', () => {
	it('returns same reference for empty array', () => {
		const arr: Array<Record<string, unknown>> = [];
		expect(scrubObligationsForJourney(arr, 'New Loan')).toBe(arr);
	});

	it('returns same reference when all entries are valid', () => {
		const arr = [
			{ selectedToClose: 'Keep running', loanType: 'Car Loan', role: 'co-applicant' },
			{
				selectedToClose: 'Self-funded closure before disbursement',
				loanType: 'Personal Loan',
				role: 'co-applicant'
			}
		];
		expect(scrubObligationsForJourney(arr, 'New Loan')).toBe(arr);
	});

	it('clears only the stale entries; valid ones keep their values', () => {
		const arr = [
			{ id: 'a', selectedToClose: 'Keep running', loanType: 'Car Loan', role: 'co-applicant' },
			{
				id: 'b',
				selectedToClose: 'Will be closed by Top-up amount',
				loanType: 'Car Loan',
				role: 'co-applicant'
			},
			{ id: 'c', selectedToClose: 'Keep running', loanType: 'Car Loan', role: 'co-applicant' }
		];
		const result = scrubObligationsForJourney(arr, 'New Loan');
		expect(result).not.toBe(arr);
		expect(result.length).toBe(3);
		expect(result[0].selectedToClose).toBe('Keep running');
		expect(result[1].selectedToClose).toBe('');
		expect(result[2].selectedToClose).toBe('Keep running');
	});

	it('handles undefined obligations gracefully (returns empty array)', () => {
		expect(scrubObligationsForJourney(undefined as any, 'New Loan')).toEqual([]);
		expect(scrubObligationsForJourney(null as any, 'New Loan')).toEqual([]);
	});

	// Core regression — exact user-reported scenario
	it('reproduces the Personal-DC → Plot-New restore scenario', () => {
		// Pre-S104: this obligation survived restore unchanged → Saved Obligations
		// chip showed "Close (Top-up)" stale, form had no option selected.
		const obligationFromPersonalDC = [
			{
				id: 'shivani-vehicle',
				bankName: 'Punjab National Bank',
				loanType: 'Vehicle Loan',
				role: 'co-applicant',
				selectedToClose: 'Will be closed by Top-up amount', // ← stale on Plot-New
				emi: '16939',
				tenure: '12',
				principalOutstanding: '200000',
				rate: '5'
			}
		];
		const scrubbed = scrubObligationsForJourney(obligationFromPersonalDC, 'New Loan');
		expect(scrubbed[0].selectedToClose, 'stale closure must be cleared').toBe('');
		// All other fields preserved
		expect(scrubbed[0].bankName).toBe('Punjab National Bank');
		expect(scrubbed[0].loanType).toBe('Vehicle Loan');
		expect(scrubbed[0].emi).toBe('16939');
	});
});
