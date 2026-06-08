/**
 * Loan-route guard — protects each `/form/{loanType}/+page.svelte` from
 * rendering against mismatched loan state.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * If a user closes their tab mid-flow and reopens it on (say) `/form/plot-loan`
 * while `formState.loanData.loanName` is `"Personal Loan"`, the page renders
 * Plot Loan's schema against Personal Loan's answer tree — the exact bleed-
 * over class of bug the chokepoint design is meant to prevent. Form pages
 * should never render against mismatched state; they should redirect back to
 * `/form/how-can-we-help` and let the user (re-)select their loan type.
 *
 * Usage in each form page's `<script>`:
 *
 *   import { onMount } from 'svelte';
 *   import { assertLoanRoute } from '$lib/utils/loanRouteGuard.svelte';
 *
 *   onMount(() => assertLoanRoute('Plot Loan'));
 *
 * Call BEFORE any data-fetch effects that read from `formState.loanData`.
 *
 * Empty `loanName` is allowed — that's the first-load case where the page
 * arrives via the picker's Next navigation. The picker writes the loanName
 * during `goNextRoute`, but on a hard refresh / direct URL hit there's no
 * picker context. If both are empty (fresh tab, direct URL) we redirect.
 * If only the route is mismatched, we redirect with `replaceState` so the
 * back button doesn't loop.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { formState } from '$lib/state/form.svelte';
import { ROUTES } from '$lib/config/routes.js';
import type { LoanDataStore } from '$lib/types/formTypes';

/**
 * Assert the route matches the expected loan. Redirects to the picker on
 * mismatch (or empty state). Safe to call from `onMount`.
 *
 * @param expectedLoan — the canonical loanName for this route, e.g. "Home Loan"
 * @returns `true` if the route is valid (the page can continue rendering),
 *   `false` if a redirect was issued
 */
export function assertLoanRoute(expectedLoan: string): boolean {
	if (!browser) return true;

	const data = formState.loanData as LoanDataStore;
	const currentLoan = (data?.loanName as string | undefined) ?? '';

	if (currentLoan === expectedLoan) return true;

	// Mismatch (or empty) — kick back to the picker. The picker will rehydrate
	// from the in-memory parked-loans or the case-load button.
	goto(ROUTES.FORM.HOW_CAN_WE_HELP, { replaceState: true });
	return false;
}
