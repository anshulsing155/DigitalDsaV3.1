/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every unsecured loan +page.svelte wires getCaseLevelDisabledReason
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Pitfall #26 (`obligationsDisabledReason.test.ts`) wired a per-applicant
 * "why is Next disabled?" reason for the Existing Loans page. But case-level
 * requirements (canonical example: Debt Consolidation needs at least one
 * obligation across ALL applicants marked "Close by this new loan") fail
 * silently in multi-applicant view — each applicant's "Done" badge stays
 * green individually, but the case still can't proceed.
 *
 * User-reported 2026-05-26 (BL Income & Credit Details screenshot, Issue 5):
 * DSA switched loanType from "New Loan" to "Debt Consolidation" after
 * filling applicant details, all 3 applicants showed green "Done", Next
 * disabled, no message.
 *
 * Fix: new `getCaseLevelDisabledReason()` helper in
 * `src/lib/utils/incomeTabState.ts` aggregates across applicants and
 * returns a single case-level message. Every unsecured loan +page.svelte
 * MUST import it AND wire a `caseLevelDisabledReason` derived AND pass
 * it into FormNavigationBar's `disabledReason` prop (with the per-applicant
 * reasons as the primary, case-level as the fallback).
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of the 3 unsecured loan +page.svelte files
 * (Personal / Business / Professional — DC routes only exist on these).
 * For each file, asserts:
 *   1. imports `getCaseLevelDisabledReason` from $lib/utils/incomeTabState
 *   2. declares a `caseLevelDisabledReason` derived
 *   3. references `caseLevelDisabledReason` inside the FormNavigationBar
 *      disabledReason prop (the chain `... || caseLevelDisabledReason`)
 *
 * Same enforcement model as `directorRemovePickerCommit.test.ts` (Pitfall
 * #52) and `directorAutoIncomeWiring.test.ts` (Pitfall #46).
 *
 * Companion: CLAUDE.md §3 Pitfall #53 + #26.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGETS: Array<{ label: string; path: string }> = [
	{
		label: 'PersonalLoan',
		path: 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte'
	},
	{
		label: 'BusinessLoan',
		path: 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte'
	},
	{
		label: 'ProfessionalLoan',
		path: 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte'
	}
];

describe('case-level disabledReason is wired in every unsecured loan +page.svelte', () => {
	for (const { label, path } of TARGETS) {
		describe(label, () => {
			const src = readFileSync(resolve(process.cwd(), path), 'utf8');

			it('imports getCaseLevelDisabledReason from $lib/utils/incomeTabState', () => {
				expect(
					src.includes('getCaseLevelDisabledReason'),
					`${label} must import getCaseLevelDisabledReason from $lib/utils/incomeTabState so multi-applicant DC routes surface a reason when Next is disabled. See CLAUDE.md Pitfall #53.`
				).toBe(true);
				// The import must come from the incomeTabState module (not redefined locally).
				expect(
					/from\s+['"]\$lib\/utils\/incomeTabState['"]/.test(src),
					`${label} must import from $lib/utils/incomeTabState.`
				).toBe(true);
			});

			it('declares a caseLevelDisabledReason derived', () => {
				expect(
					/caseLevelDisabledReason\s*=\s*\$derived/.test(src),
					`${label} must declare 'let caseLevelDisabledReason = $derived.by(...)' to compute the case-level reason. See CLAUDE.md Pitfall #53.`
				).toBe(true);
			});

			it('references caseLevelDisabledReason in the FormNavigationBar disabledReason chain', () => {
				// The prop is written across multiple lines on FormNavigationBar:
				//   disabledReason={onApplicantPage
				//     ? ownershipDisabledReason || applicantDisabledReason || caseLevelDisabledReason
				//     : obligationsDisabledReason || caseLevelDisabledReason}
				//
				// NOTE: an earlier `bind:disabledReason={applicantDisabledReason}` exists
				// further up (a pass-through bind on an inner applicant component). Skip
				// past any `bind:` form and target the actual FormNavigationBar one.
				let searchFrom = 0;
				let disabledReasonIdx = -1;
				while (true) {
					const idx = src.indexOf('disabledReason={', searchFrom);
					if (idx === -1) break;
					// Skip if preceded by `bind:` (inner-component bind, not the wizard nav)
					const prefix = src.slice(Math.max(0, idx - 5), idx);
					if (!prefix.endsWith('bind:')) {
						disabledReasonIdx = idx;
						break;
					}
					searchFrom = idx + 1;
				}
				expect(
					disabledReasonIdx,
					`${label} must use the disabledReason prop on FormNavigationBar (a non-bind: occurrence).`
				).toBeGreaterThanOrEqual(0);
				const block = src.slice(disabledReasonIdx, disabledReasonIdx + 500);
				expect(
					block.includes('caseLevelDisabledReason'),
					`${label} must include caseLevelDisabledReason in the FormNavigationBar disabledReason prop (typically as a fallback after the per-applicant reasons). Without it the multi-applicant DC reason is silently swallowed. See CLAUDE.md Pitfall #53.`
				).toBe(true);
			});
		});
	}
});
