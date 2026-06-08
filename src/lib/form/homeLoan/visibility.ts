/**
 * Home Loan Client Visibility (fail-OPEN dependency guard)
 * ─────────────────────────────────────────────────────────────────────
 *
 * DO NOT consolidate this with `$lib/server/formEngine/visibility.ts`.
 * The apparent duplication is deliberate — see commit 3acc7489
 * (anti-scraping / form guard) for the semantic split.
 *
 *   client side (THIS FILE + firstPage/visibility.ts)
 *       → fail-OPEN: show question until its dependency is answered
 *       → forgiving of mid-render reactivity where a dep is briefly empty
 *
 *   server side (server/formEngine/visibility.ts)
 *       → fail-HIDE via jsonLogic `!=` / `!==` singleton overrides
 *       → strict progressive reveal needed by the session question-budget
 *         in formGuard.ts (anti-scraping); all questions would count as
 *         visible on a blank form if fail-open were used server-side
 *
 * The only consumer of this file's `isQuestionVisible` is
 * `$lib/utils/payloadGrouping.ts`, which MUST mirror client rendering
 * so `buildCleanAnswers` / `groupAnswersBySchema` don't silently drop
 * answers the user filled while a dep was briefly empty.
 *
 * Importing the server visibility module applies a process-wide
 * `jsonLogic.add_operation` side effect — another reason this module
 * stays independent. See CLAUDE.md "Critical Pitfall #1" for the
 * `!=` override details.
 *
 * The non-isQuestionVisible exports (BT_TOPUP_PAGE_ORDER,
 * resolvePageSequence, getVisiblePagesFromSchema, updatePayloads) are
 * unrelated utilities; they live here for historical colocation.
 */
import jsonLogic from 'json-logic-js';
import clientLogger from '$lib/utils/clientLogger';
import type { Question, Answers, Schema } from '$lib/types/formTypes';
// `./schema` was archived in S77b-4B (commit 00a3ca7d); S77d rewired this
// import to the canonical byte-equivalent copy. See
// `src/lib/form/_archive/README.md` 2026-04-21 entry for the audit-miss
// history and the singleton-boundary reason this file itself stays live.
import { resolveBindsTo } from '$lib/form/firstPage/schema';

export function isQuestionVisible(question: Question, answers: Answers): boolean {
	// no condition → always visible
	if (!question.showWhen) return true;

	// ---------- normalize answers ----------
	const data: Record<string, any> = {};

	for (const [k, v] of Object.entries(answers)) {
		data[k] = v;
		data[k.toLowerCase()] = v;

		if (k.includes('_')) {
			const short = k.split('_').pop()!;
			data[short] = v;
			data[short.toLowerCase()] = v;
		}
	}

	// ---------- template binding ----------
	if (question.bindsTo_template) {
		const key = resolveBindsTo(question, answers, answers.loanName as string);
		if (key) data[key] = answers[key];
	}

	// ---------- dependency guard (CRITICAL FIX) ----------
	const deps = new Set<string>();

	JSON.stringify(question.showWhen, (_, v) => {
		if (v && typeof v === 'object' && 'var' in v) {
			deps.add(v.var);
		}
		return v;
	});

	for (const dep of deps) {
		const val = data[dep];

		// treat empty values as NOT answered
		if (
			val === undefined ||
			val === null ||
			(typeof val === 'string' && val.trim() === '') ||
			(Array.isArray(val) && val.length === 0)
		) {
			return true; // ✅ show until dependency is answered
		}
	}

	// ---------- final evaluation ----------
	try {
		return Boolean(jsonLogic.apply(question.showWhen, data));
	} catch (err) {
		clientLogger.warn({ questionId: question.id, err }, 'Visibility eval failed');
		return true;
	}
}

// ID-based page order for BT/Top-up flows (replaces old index-based btTopUpSequence)
export const BT_TOPUP_PAGE_ORDER: string[] = [
	'caseIntake_homeLoan',
	'propertyLocation_homeLoan',
	'propertyCharacter_homeLoan',
	'complianceLegal_homeLoan',
	'sellerTransaction_homeLoan',
	'tellUs_homeLoan',
	'applicantProfilePage',
	'incomeProfilesPage',
	'incomeDetailsPage',
	'creditScorePage',
	'obligationsPage',
	'btExistingLoan_homeLoan',
	'loanRequirements_homeLoan'
];

/**
 * Resolve an ID-based page order into index positions within the current pages array.
 * Only returns indices for pages that actually exist in the array.
 */
export function resolvePageSequence(pages: { id: string }[], pageOrder: string[]): number[] {
	return pageOrder.map((id) => pages.findIndex((p) => p.id === id)).filter((i) => i !== -1);
}

// Includes component-handled pages (0 questions) — client renders custom UI for those
export function getVisiblePagesFromSchema(schema?: Schema, combinedAnswers?: Answers) {
	if (!schema?.pages || !combinedAnswers) return [];

	return schema.pages.filter(
		(page) =>
			Array.isArray(page.questions) &&
			(!page.showWhen || jsonLogic.apply(page.showWhen, combinedAnswers))
	);
}

// unchanged
export function updatePayloads(
	currentPageIndex: number,
	visibleQuestions: Array<{ bindsTo?: string }>,
	payloads: Record<string, Array<{ bindsTo?: string }>>
) {
	const pageKey = `page_${currentPageIndex}`;

	function isSameArray(
		oldArr: Array<{ bindsTo?: string }> = [],
		newArr: Array<{ bindsTo?: string }> = []
	): boolean {
		if (oldArr.length !== newArr.length) return false;
		return oldArr.every((item, i) => item.bindsTo === newArr[i].bindsTo);
	}

	if (!isSameArray(payloads[pageKey], visibleQuestions)) {
		payloads[pageKey] = visibleQuestions;
	}
}
