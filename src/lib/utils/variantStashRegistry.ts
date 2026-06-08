/**
 * Variant Stash Registry — preserve gated answers across scope flips
 * ══════════════════════════════════════════════════════════════════════
 * Some loan-picker questions are gated by a scope answer (e.g. Plot Loan's
 * `loanVariant` is only visible when `loanType === 'New Loan'`). When the
 * DSA flips the scope away and back, naive form behavior drops the gated
 * answer the first time and starts fresh — the DSA's earlier pick is lost.
 *
 * This module declares the stash/restore intent as data and applies it as
 * a pure function. The picker calls `applyVariantStashRules` after any
 * variant-shaping key write; the returned list of `{key, value}` writes
 * is applied via the same `updateAnswerByKey` path the picker already uses.
 *
 * To add a new variant-gated question, append a row to VARIANT_STASH_RULES.
 * No picker-page edit needed.
 *
 * Today: one rule (Plot Loan loanVariant). Architecture is generalized
 * because the loan-field nomenclature rename made the gate-by-scope shape
 * common across the 4-field model — additional rules are expected.
 *
 * Scope: per-loan-answers only. Stash keys live inside the same answer bag
 * as the gated field, so switching loan family wipes them with everything
 * else (Pitfall #20 / loanSwitchOrchestrator).
 * ══════════════════════════════════════════════════════════════════════
 */

export interface VariantStashRule {
	/** Loan family this rule applies to. Matches `selectedLoan` exactly. */
	loanName: string;
	/** The field whose value gates the stash/restore action. */
	scopeField: string;
	/** When scopeField equals this value, the gated field is visible. Other values hide it. */
	scopeValue: string;
	/** The field whose value should survive scope flips. */
	gatedField: string;
	/** Per-loan-answers key used to stash the value while the gated field is hidden. */
	stashKey: string;
}

/**
 * Registry of all variant-gated questions that need stash/restore.
 *
 * Plot Loan: q4_loanVariant (Plot Loan Only / Plot & Construction / Plot &
 * Equity / Construction Only) is gated by loanType === 'New Loan'. Flipping
 * to "Balance Transfer Only" hides the variant question; flipping back
 * should restore the prior pick instead of starting fresh.
 */
export const VARIANT_STASH_RULES: readonly VariantStashRule[] = [
	{
		loanName: 'Plot Loan',
		scopeField: 'loanType',
		scopeValue: 'New Loan',
		gatedField: 'loanVariant',
		stashKey: '_stashedLoanVariant'
	}
];

export interface StashWrite {
	key: string;
	value: string;
}

export interface StashActionInput {
	loanName: string;
	/** The bindsTo key the picker is about to write (i.e. the scope field of some rule, if any). */
	changingKey: string;
	/** The new value being written. */
	newValue: unknown;
	/** The current per-loan answer bag BEFORE the changingKey write lands. */
	currentAnswers: Record<string, unknown>;
}

/**
 * Compute the stash/restore writes triggered by a scope-field change.
 *
 * Returns an array of {key, value} writes the caller should apply via its
 * normal answer-write path. Empty array when no rules match or no action
 * is needed (e.g. flipping between two non-scope values).
 *
 * Semantics:
 *   - scope-in → scope-out: stash the gated field's current value, clear it
 *   - scope-out → scope-in: restore the stashed value, clear the stash
 *   - scope-in → scope-in (different non-scope flip): no-op
 *   - scope-out → scope-out: no-op
 *   - gated field is empty / stash is empty: no-op (nothing to stash/restore)
 *
 * Pure function — no I/O, no Svelte runes. Easily unit-testable.
 */
export function applyVariantStashRules(input: StashActionInput): StashWrite[] {
	const writes: StashWrite[] = [];

	for (const rule of VARIANT_STASH_RULES) {
		if (rule.loanName !== input.loanName) continue;
		if (rule.scopeField !== input.changingKey) continue;

		const wasInScope = input.currentAnswers[rule.scopeField] === rule.scopeValue;
		const isInScope = input.newValue === rule.scopeValue;

		if (wasInScope && !isInScope) {
			// Scope flipping away — stash the gated field's value (if any).
			const currentGated = input.currentAnswers[rule.gatedField];
			if (typeof currentGated === 'string' && currentGated) {
				writes.push({ key: rule.stashKey, value: currentGated });
				writes.push({ key: rule.gatedField, value: '' });
			}
		} else if (!wasInScope && isInScope) {
			// Scope flipping back — restore the stashed value (if any).
			const stashed = input.currentAnswers[rule.stashKey];
			if (typeof stashed === 'string' && stashed) {
				writes.push({ key: rule.gatedField, value: stashed });
				writes.push({ key: rule.stashKey, value: '' });
			}
		}
		// scope→scope and non-scope→non-scope are deliberately no-ops.
	}

	return writes;
}
