/**
 * First-Page Client Visibility (naive — intentional)
 * ─────────────────────────────────────────────────────────────────────
 *
 * DO NOT consolidate this with `$lib/server/formEngine/visibility.ts`
 * or `$lib/form/homeLoan/visibility.ts`. The three `isQuestionVisible`
 * implementations are a deliberate architectural split — see commit
 * 3acc7489 (anti-scraping / form guard) for the rationale.
 *
 *   THIS FILE — naive `jsonLogic.apply(showWhen, full-answers)`
 *       → only used by `how-can-we-help/+page.svelte`
 *       → that page asks just loanName + loanType (radio buttons)
 *       → deps are answered immediately on click; a dep guard is
 *         unnecessary and a prior attempt (51a0335f) at a "partial
 *         answers map" for bindsTo_template broke q4_loanType
 *         visibility and was reverted to this naive form
 *
 *   home loan client (homeLoan/visibility.ts)
 *       → fail-OPEN dep guard (forgiving of mid-render reactivity)
 *
 *   server (server/formEngine/visibility.ts)
 *       → fail-HIDE via jsonLogic `!=` / `!==` singleton overrides
 *       → needed by formGuard's session question-budget; importing
 *         that module applies process-wide side effects and must stay
 *         server-only
 *
 * See CLAUDE.md "Critical Pitfall #1" for the `!=` override details.
 *
 * `resolveVisiblePages` below is an unrelated utility — hardcoded
 * page-order tables for Home Loan New / BT flows. It is used by
 * how-can-we-help and is not a duplicate of anything server-side.
 */
import jsonLogic from 'json-logic-js';
import { resolveBindsTo } from './schema';
import type { Question, Answers, Schema } from '$lib/types/formTypes';

export function isQuestionVisible(question: Question, answers: Answers): boolean {
	if (!question.showWhen) return true;
	// Always evaluate against full answers — showWhen may reference other questions' bindsTo keys
	return Boolean(jsonLogic.apply(question.showWhen, answers));
}

export function resolveVisiblePages(schema: Schema, answers: Answers) {
	if (!schema.pages) return [];

	const loanName = answers.loanName;
	const type = answers.loanType;

	// Home Loan -- New Loan flow
	if (loanName === 'Home Loan' && type === 'New Loan') {
		const order = [
			'firstPage',
			'caseIntake_homeLoan',
			'propertyLocation_homeLoan',
			'propertyCharacter_homeLoan',
			'propertyCondition_homeLoan',
			'sellerTransaction_homeLoan',
			'legalVerification_homeLoan',
			'tellUs_homeLoan',
			'incomeProfilesPage',
			'incomeDetailsPage',
			'creditScorePage',
			'obligationsPage',
			'dealFinancials_homeLoan',
			'sanctionProfile_homeLoan'
		];
		return order.map((id) => schema.pages.find((p) => p.id === id)).filter(Boolean);
	}

	// Home Loan -- BT / Topup
	if (
		loanName === 'Home Loan' &&
		['Top-up Only', 'Balance Transfer Only', 'Balance Transfer With Top-up'].includes(type)
	) {
		const order = [
			'firstPage',
			'caseIntake_homeLoan',
			'propertyLocation_homeLoan',
			'propertyCharacter_homeLoan',
			'btRegistry_homeLoan',
			'propertyCondition_homeLoan',
			'sellerTransaction_homeLoan',
			'legalVerification_homeLoan',
			'tellUs_homeLoan',
			'incomeProfilesPage',
			'incomeDetailsPage',
			'creditScorePage',
			'obligationsPage',
			'btExistingLoan_homeLoan',
			'loanRequirements_homeLoan'
		];
		return order.map((id) => schema.pages.find((p) => p.id === id)).filter(Boolean);
	}

	return schema.pages.filter((p) => !p.showWhen || jsonLogic.apply(p.showWhen, answers));
}
