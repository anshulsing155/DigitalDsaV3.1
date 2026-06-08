/**
 * Income Tab State — Shared Utilities
 * ═══════════════════════════════════════════════════════════════════
 * Shared tab completion logic used by both:
 *   - IncomePageNew (secured loans — multi-applicant modal + single inline)
 *   - ApplicantFormUnified (unsecured loans — single-applicant 5-tab flow)
 *
 * Extracting these functions ensures consistent completion checks
 * and tab definitions across all loan types.
 * ═══════════════════════════════════════════════════════════════════
 */

import { validateProfileSelection } from '$lib/config/incomeProfiles';
import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
import {
	type ApplicantDerivedRole,
	type ApplicantClassification,
	getRequiredTabs,
	getRequiredTabsForClassification,
	needsFullFinancials
} from '$lib/utils/applicantRoleUtils';
import { hasAllMediumsComplete, type CompanyIncomeData } from '$lib/types/companyIncome';
import {
	IDENTITY_QUESTIONS,
	CHARACTER_COMMON_QUESTIONS,
	CHARACTER_CONDITIONAL_QUESTIONS
} from '$lib/config/companyProfile/questions';
import type { BusinessCategoryEntry } from '$lib/types/companyIncome';
import { isClosureValueValid } from '$lib/utils/obligationClosureScrub';

// ── Safe Array Access Helper ────────────────────────────────────
// Returns the value as an array if it is one, otherwise returns [].
// Used to safely access dynamic applicant fields that are expected
// to be arrays (obligations, tableLoanEntries, etc.).
function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

// ── Income Entry Completeness Check ─────────────────────────────
// An entry must have at least one meaningful income amount filled.
// Auto-created entries start with income: {} — user must edit them.
export function hasIncomeData(entry: IncomeSourceEntry): boolean {
	const income = entry.income;
	if (!income || typeof income !== 'object') return false;

	// Check if any numeric income field has a value > 0.
	// These keys MUST match the actual field keys in profileFormConfig.ts.
	const numericFields = [
		// Salaried
		'grossMonthlySalary',
		'netMonthlySalary',
		// Director / Partner salary
		'monthlySalaryAmount',
		'averageProfitPerWithdrawal',
		// Bonus
		'averageBonusAmount',
		// Professional practice
		'averageMonthlyReceipts',
		'averageMonthlyExpenses',
		'netProfessionalIncome',
		// Cash / Commission
		'cashAmount',
		// Pension
		'monthlyPensionAmount',
		// Rental
		'monthlyRentAmount',
		// Freelance / Consulting
		'averageMonthlyFreelanceIncome',
		// Agriculture
		'averageAnnualAgricultureIncome',
		// Investment / Dividends
		'averageAnnualInvestmentIncome'
	];
	const hasNumeric = numericFields.some((f) => {
		const val = (income as Record<string, unknown>)[f];
		return typeof val === 'number' && val > 0;
	});
	if (hasNumeric) return true;

	// Director/partner: at least one income source must be Yes.
	// Both drawsSalary=No AND receivesProfit=No = zero income = incomplete.
	const drawsSalary = (income as Record<string, unknown>).drawsSalary;
	const receivesProfit = (income as Record<string, unknown>).receivesProfit;
	if (drawsSalary === true || receivesProfit === true) return true;
	// Both answered but both No — director claims zero income, not valid
	if (drawsSalary === false && receivesProfit === false) return false;

	// Check if financials table has REAL data (business / professional income).
	// Bug P6: a mere non-null financialsTable object used to count as "complete",
	// so a blank/partial multi-year grid (ITR ticked, all profit/turnover cells
	// empty) silently passed the income-step Next button. Require at least one
	// numeric value in the net-profit OR turnover series before treating it as
	// filled. This is the single completeness gate used by computeSectionCompletion,
	// so it covers BOTH the single-applicant inline view and the multi-applicant
	// card/modal view of IncomePageNew.
	const financialsTable = (income as Record<string, unknown>).financialsTable as
		| { netProfitArray?: unknown[]; turnOverArray?: unknown[] }
		| undefined;
	if (financialsTable) {
		const hasFilledCell = (arr: unknown[] | undefined): boolean =>
			Array.isArray(arr) &&
			arr.some((v) => {
				if (v === '' || v === null || v === undefined) return false;
				const n = Number(v);
				return Number.isFinite(n) && n !== 0;
			});
		if (hasFilledCell(financialsTable.netProfitArray) || hasFilledCell(financialsTable.turnOverArray)) {
			return true;
		}
	}

	return false;
}

// ── Tab Definition Type ──────────────────────────────────────────
export interface IncomeTab {
	id: string;
	label: string;
	complete: boolean;
}

// ── Compute Section Completion ───────────────────────────────────
// Evaluates which tabs are complete for a given applicant.
// Returns a map of tab_id → boolean. Used to drive:
//   - Tab stepper checkmarks
//   - Progressive tab locking
//   - The __completion flag that enables the wizard Next button
//
// Options:
//   requireResidencePattern: Whether to require residence-vs-property
//     question. Set to false for unsecured loans (no property context).
//     Defaults to true for backward compatibility (secured loans).
export interface CompletionOptions {
	requireResidencePattern?: boolean;
	/** Derived role from onProperty/onEMI. When set, non-borrower roles
	 *  auto-complete tabs they don't need (e.g., collateral = credit only). */
	derivedRole?: ApplicantDerivedRole;
	/** 4-way classification (new system). When set, takes precedence over derivedRole
	 *  for tab auto-completion logic. */
	applicantClassification?: string;
	/** When true, ALL tabs are auto-completed (director is skippable).
	 *  Used for minor non-family directors in large companies. */
	skippable?: boolean;
	/** Loan variant (e.g. "Debt Consolidation", "Balance Transfer").
	 *  When set to a DC variant, obligations require at least one entry
	 *  with closure plan "Will be closed by Top-up amount". */
	loanScope?: string;
	/** DC routes only: true when ANOTHER applicant in the same case already has
	 *  a "Will be closed by Top-up amount" obligation. Lets a debt-free
	 *  co-applicant clear the obligations tab without inventing fake debt —
	 *  the DC requirement is satisfied at the case level, not per applicant. */
	caseHasDcClosure?: boolean;
}

export function computeSectionCompletion(
	applicant: Record<string, unknown>,
	options?: CompletionOptions
): Record<string, boolean> {
	if (!applicant) return {};

	// Skippable directors: all tabs auto-complete
	if (options?.skippable) {
		return {
			profile: true,
			income_profiles: true,
			income_details: true,
			credit_score: true,
			obligations_details: true
		};
	}

	const profiles = (applicant.selectedIncomeProfiles ?? []) as IncomeProfileType[];
	const entries = (applicant.incomeEntries ?? []) as IncomeSourceEntry[];
	const needsResidence = options?.requireResidencePattern !== false;

	// ── Tab: Profile ─────────────────────────────────────────
	// All required profile fields must be filled for the applicant type.
	// For unsecured loans (needsResidence=false), residence pattern is not required.
	let profileComplete = false;
	// if (applicant.applicantType === 'Individual') {
	// 	const isNRI = applicant.isNRI === 'Yes';
	// 	const hasBasics =
	// 		!!applicant.education &&
	// 		!!applicant.religion &&
	// 		!!applicant.ownedResidentialProperties &&
	// 		!!applicant.hasDisability &&
	// 		// Residence pattern not asked for NRI (lender uses GPA location)
	// 		(!needsResidence || isNRI || !!applicant.applicantResidencePattern);
	// 	const casteCategoryOk = applicant.religion !== 'hindu' || !!applicant.casteCategory;
	// 	// Residence cascade not required for NRI
	// 	const residenceOk = (needsResidence && !isNRI)
	// 		? checkResidenceComplete(applicant, 'applicantResidence')
	// 		: true;
	// 	const nriOk = !isNRI || !!applicant.nriCountry;
	// 	profileComplete = hasBasics && casteCategoryOk && residenceOk && nriOk;
	if (applicant.applicantType === 'Individual') {
		const isNRI = applicant.isNRI === 'Yes';
		const shouldCheckResidence = needsResidence && !isNRI;

		const residencePatternOk =
			!shouldCheckResidence || !!applicant.residenceValue;

		const hasBasics =
			!!applicant.education &&
			!!applicant.religion &&
			!!applicant.ownedResidentialProperties &&
			!!applicant.hasDisability &&
			// Residence pattern not asked for NRI (lender uses GPA location)
			(!needsResidence || isNRI || !!applicant.applicantResidencePattern);
		const casteCategoryOk = applicant.religion !== 'hindu' || !!applicant.casteCategory;
		// Residence cascade not required for NRI
		const residenceOk =
			needsResidence && !isNRI ? checkResidenceComplete(applicant, 'applicantResidence') : true;
		const nriOk = !isNRI || !!applicant.nriCountry;

		profileComplete = hasBasics && casteCategoryOk && residenceOk && nriOk;

	} else if (applicant.applicantType === 'Company') {
		const hasBasics =
			!!applicant.companyOwnedProperties && (!needsResidence || !!applicant.companyOfficeProximity);
		const residenceOk = needsResidence ? checkResidenceComplete(applicant, 'companyOffice') : true;
		profileComplete = hasBasics && residenceOk;
	} else {
		// Unknown type — consider complete to not block
		profileComplete = true;
	}

	// ── Tab: Income Profiles ──────────────────────────────────
	// At least one profile selected AND selection passes mutual-exclusion rules
	// (e.g. 'no_current_income' cannot be combined with earning profiles)
	let profilesComplete = profiles.length > 0 && validateProfileSelection(profiles).valid;

	// When no_current_income is sole profile, also require noIncomeReason
	if (profiles.length === 1 && profiles[0] === 'no_current_income') {
		profilesComplete = profilesComplete && !!applicant.noIncomeReason;
	}

	// Director/partner-linked Individuals MUST have their auto-created income profiles selected
	// e.g., if linked to PvtLtd → director_company must be in selectedIncomeProfiles
	if (profilesComplete && entries.length > 0) {
		const requiredAutoProfiles = entries
			.filter((e) => e.autoCreated && !e.orphaned)
			.map((e) => e.profileType);
		if (requiredAutoProfiles.length > 0) {
			profilesComplete = requiredAutoProfiles.every((p) => profiles.includes(p));
		}
	}

	// ── Tab: Income Details ───────────────────────────────────
	// Each selected earning profile must have at least one entry WITH income data filled.
	// An entry with empty income: {} (e.g. auto-created director entries) does NOT count
	// as complete — the user must edit and fill in salary/profit/amount details.
	let detailsComplete = false;
	if (profiles.length === 1 && profiles[0] === 'no_current_income') {
		detailsComplete = true;
	} else if (profiles.includes('no_current_income')) {
		detailsComplete = entries.some((e) => e.profileType === 'no_current_income');
	} else if (profiles.length > 0) {
		const earningProfiles = profiles.filter((p) => p !== 'no_current_income');
		detailsComplete = earningProfiles.every((p) =>
			entries.some((e) => e.profileType === p && hasIncomeData(e))
		);
	}

	// A director/partner linked to Company applicant(s) on this case MUST declare
	// income from a company they actually direct — i.e. an income entry sourced
	// from one of their linked companies, with income filled in. They may also add
	// director income from OTHER companies (the "Other" path), but the same-company
	// income is mandatory. Without this, a director could satisfy income_details
	// with only an external "Other" entry and never declare the company on the case.
	const linkedCompanyIds = (applicant.linkedCompanyIds as string[] | undefined) ?? [];
	if (detailsComplete && linkedCompanyIds.length > 0) {
		const linkedSet = new Set(linkedCompanyIds);
		const directorIncomeEntries = entries.filter(
			(e) =>
				(e.profileType === 'director_company' || e.profileType === 'business_partnership') &&
				hasIncomeData(e)
		);
		// Enforce same-company income ONLY when at least one filled director entry
		// carries link metadata (sourceCompanyId) — i.e. it was created via the company
		// selector. Legacy / free-typed entries predate the link mechanism and have no
		// sourceCompanyId; blocking those would wedge submit on existing cases. For them,
		// a filled director/partner income entry is sufficient.
		const hasLinkedEntry = directorIncomeEntries.some((e) => !!e.sourceCompanyId);
		detailsComplete = hasLinkedEntry
			? directorIncomeEntries.some((e) => !!e.sourceCompanyId && linkedSet.has(e.sourceCompanyId))
			: directorIncomeEntries.length > 0;
	}

	// ── Tab: Credit Score ─────────────────────────────────────
	// Valid scores: -1 (Not Applicable), 0 (No History), or 300–900.
	// For -1/0, graduated questions are skipped → auto-complete.
	// ObligationsRunning question has moved to the obligations page,
	// so credit tab no longer depends on it.
	const rawCreditScore = applicant.creditScore;
	const hasEnteredScore =
		rawCreditScore !== '' && rawCreditScore !== undefined && rawCreditScore !== null;
	const creditScore = Number(rawCreditScore);
	const isSpecialScore = hasEnteredScore && (creditScore === -1 || creditScore === 0);
	const whyLowCredit = applicant.whyPrimaryLowCredit;
	const creditFactorsOk =
		applicant.creditFactorsAnswered === true ||
		(Array.isArray(whyLowCredit) && whyLowCredit.length > 0);
	const creditComplete = !hasEnteredScore
		? false
		: isSpecialScore
			? true
			: creditScore >= 300 && creditScore <= 900 && creditFactorsOk;

	const result: Record<string, boolean> = {
		profile: profileComplete,
		income_profiles: profilesComplete,
		income_details: detailsComplete,
		credit_score: creditComplete
	};

	// ── Tab: Obligations ─────────────────────────────────────
	// Always computed. ObligationsRunning question is now on the obligations page.
	// - 'Yes' → needs at least one entry
	// - 'No' → complete (no entries needed)
	// - Not answered → incomplete
	//
	// DC vs BT distinction:
	// - Debt Consolidation: user is listing debts to consolidate HERE — at least
	//   one must have "Close by this new loan" closure plan.
	// - Balance Transfer / BT+Top-up: the BT loan is captured on the separate
	//   Existing Details page, not here. This page captures OTHER obligations.
	//   User may legitimately have no other obligations → "No" is valid.
	const loanScope = options?.loanScope || '';
	const isDcRoute = ['Debt Consolidation', 'Debt Consolidation with Extra Funds'].some((v) =>
		loanScope.includes(v)
	);

	if (isDcRoute) {
		// DC routes: the case must have at least one obligation marked
		// "Will be closed by Top-up amount" (labeled "Close by this new loan").
		// The whole point of DC is consolidating existing debts via the new loan.
		//
		// Case-level rule (joint applicants): if THIS applicant has a closure
		// entry, they're complete. If they have no obligations at all AND another
		// applicant in the case is handling the closure, also complete — a
		// debt-free co-applicant shouldn't be forced to invent debt.
		const obligations = asArray(applicant.obligations);
		const hasClosureByNewLoan = obligations.some(
			(o) => (o as Record<string, unknown>).selectedToClose === 'Will be closed by Top-up amount'
		);
		const hasNoObligations = obligations.length === 0;
		result.obligations_details =
			hasClosureByNewLoan || (hasNoObligations && options?.caseHasDcClosure === true);
	} else if (applicant.ObligationsRunning === 'Yes') {
		const obligations = asArray(applicant.obligations);
		const hasEntries =
			obligations.length > 0 ||
			asArray(applicant.tableLoanEntries).length > 0 ||
			asArray(applicant.tableLimitEntries).length > 0;
		result.obligations_details = hasEntries;

		// If also a guarantor, at least one entry must have guarantor role
		if (result.obligations_details && applicant.isGuarantorOnOtherLoan === 'Yes') {
			const hasGuarantorRole = obligations.some(
				(o) => (o as Record<string, unknown>).role === 'guarantor'
			);
			if (!hasGuarantorRole) result.obligations_details = false;
		}

		// When non-earner has obligations, every entry must have emiPaidBy
		const isNonEarner = profiles.length === 1 && profiles[0] === 'no_current_income';
		if (isNonEarner && result.obligations_details) {
			result.obligations_details =
				obligations.length > 0 &&
				obligations.every((o) => !!(o as Record<string, unknown>).emiPaidBy);
		}
	} else if (applicant.ObligationsRunning === 'No') {
		// Guarantor question MUST be answered before section is complete
		if (applicant.isGuarantorOnOtherLoan === 'Yes') {
			// Guarantor = Yes → at least one obligation entry must have role = 'guarantor'
			const obligations = asArray(applicant.obligations);
			const hasGuarantorRole = obligations.some(
				(o) => (o as Record<string, unknown>).role === 'guarantor'
			);
			result.obligations_details = hasGuarantorRole;
		} else if (applicant.isGuarantorOnOtherLoan === 'No') {
			// Both questions answered (No + No) — section complete
			result.obligations_details = true;
		} else {
			// Guarantor question not yet answered — section incomplete
			result.obligations_details = false;
		}
	} else if (applicant.isGuarantorOnOtherLoan === 'Yes') {
		// Guarantor question answered Yes but ObligationsRunning not answered yet —
		// require at least one obligation entry with guarantor role
		const obligations = asArray(applicant.obligations);
		const hasGuarantorRole = obligations.some(
			(o) => (o as Record<string, unknown>).role === 'guarantor'
		);
		result.obligations_details = hasGuarantorRole;
	} else {
		result.obligations_details = false;
	}

	// ── Final gate: stale closure-plan values ─────────────────
	// Pitfall #31: cross-loan restore can carry a `selectedToClose` value
	// (e.g. "Will be closed by Top-up amount") that's not visible in the
	// CURRENT journey's options. Without this gate, the obligation passes
	// the section as "complete" while the form shows no option selected.
	if (result.obligations_details) {
		const obligations = asArray(applicant.obligations);
		const anyStale = obligations.some((o) => {
			const entry = o as Record<string, unknown>;
			const sel = String(entry.selectedToClose ?? '');
			if (!sel) return false; // empty handled by required-ness checks above
			return !isClosureValueValid(
				sel,
				entry.role as string | undefined,
				String(entry.loanType ?? ''),
				loanScope
			);
		});
		if (anyStale) result.obligations_details = false;
	}

	// ── Role-based tab overrides ──────────────────────────────
	// Non-borrower roles auto-complete tabs they don't need.
	// New 6-way classification takes precedence when available.
	const classification = options?.applicantClassification;
	if (classification && classification !== 'co_applicant_financial') {
		// Use classification-based tab requirements
		const required = getRequiredTabsForClassification(
			classification as ApplicantClassification,
			hasEnteredScore ? creditScore : undefined
		);
		for (const key of Object.keys(result)) {
			if (!required.includes(key)) {
				result[key] = true; // auto-complete tabs not required for this classification
			}
		}
	} else if (!classification) {
		// Legacy fallback: use derivedRole when no classification is set
		const role = options?.derivedRole;
		if (role && !needsFullFinancials(role)) {
			const required = getRequiredTabs(role, hasEnteredScore ? creditScore : undefined);
			for (const key of Object.keys(result)) {
				if (!required.includes(key)) {
					result[key] = true;
				}
			}
		}
	}

	return result;
}

// ── Residence Location Completion Helper ─────────────────────────
// Checks if residence/office location cascade is complete for the
// given prefix ('applicantResidence' or 'companyOffice').
function checkResidenceComplete(applicant: Record<string, unknown>, pfx: string): boolean {
	const patternKey =
		pfx === 'companyOffice' ? 'companyOfficeProximity' : 'applicantResidencePattern';
	const pattern = applicant[patternKey];
	if (!pattern) return false;

	if (pattern === 'SAME_CITY') {
		// Auto-set from property location — just need state/city present
		return true;
	} else if (pattern === 'DIFFERENT_CITY') {
		return !!applicant[`${pfx}City`];
	} else if (pattern === 'DIFFERENT_STATE') {
		return !!applicant[`${pfx}State`] && !!applicant[`${pfx}City`];
	}
	return true;
}

// ── Build Tab Definitions ────────────────────────────────────────
// Creates the tab array for ModalTabs component.
// Profile tab is always first. The obligations tab only appears
// when user has running obligations.
// When `role` is provided, only tabs required for that role are included.
export function buildIncomeTabs(
	applicant: Record<string, unknown> | null | undefined,
	completion: Record<string, boolean>,
	role?: ApplicantDerivedRole,
	classification?: string
): IncomeTab[] {
	const profiles = (applicant?.selectedIncomeProfiles ?? []) as IncomeProfileType[];
	const isNoIncomeOnly = profiles.length === 1 && profiles[0] === 'no_current_income';

	const baseTabs: IncomeTab[] = [
		{
			id: 'profile',
			label: 'Profile',
			complete: completion['profile'] ?? false
		},
		{
			id: 'income_profiles',
			label: 'Income Profiles',
			complete: completion['income_profiles'] ?? false
		}
	];

	// Skip Income Details tab entirely when only 'no_current_income' is selected
	if (!isNoIncomeOnly) {
		baseTabs.push({
			id: 'income_details',
			label: 'Income Details',
			complete: completion['income_details'] ?? false
		});
	}

	baseTabs.push({
		id: 'credit_score',
		label: 'Credit Score',
		complete: completion['credit_score'] ?? false
	});

	// Obligations tab is always present (question is now on this page)
	baseTabs.push({
		id: 'obligations_details',
		label: 'Existing Loans',
		complete: completion['obligations_details'] ?? false
	});

	// 4-way classification takes precedence over legacy role for tab filtering.
	// NOTE: co_applicant_financial is excluded because it needs all 5 tabs (the
	// default), which falls through to baseTabs below. guarantor_financial was
	// previously also excluded under the same assumption — but the role-legacy
	// branch below intercepts BEFORE baseTabs, and for a Guarantor with
	// onEMI=No+onProperty=No the role resolves to 'not_on_loan' →
	// getRequiredTabs returns [] → ZERO tabs render → Done button is
	// disabled-gray (looks invisible to DSAs). Removing the exclusion routes
	// guarantor_financial through getRequiredTabsForClassification which
	// correctly returns all 5 tabs (Pitfall: secured-loan Guarantor dead-end,
	// fixed 2026-05-28).
	if (classification && classification !== 'co_applicant_financial') {
		const rawScore = Number(applicant?.creditScore);
		const scoreForTabs = !isNaN(rawScore) && rawScore >= 300 ? rawScore : undefined;
		const required = getRequiredTabsForClassification(
			classification as ApplicantClassification,
			scoreForTabs
		);
		return baseTabs.filter((t) => required.includes(t.id));
	}

	// Legacy fallback: filter tabs by role (e.g., collateral → profile + credit only)
	// For cibil_only: pass creditScore so obligations tab appears dynamically when CIBIL < 725
	if (role && !needsFullFinancials(role)) {
		const rawScore = Number(applicant?.creditScore);
		const scoreForTabs = !isNaN(rawScore) && rawScore >= 300 ? rawScore : undefined;
		const required = getRequiredTabs(role, scoreForTabs);
		return baseTabs.filter((t) => required.includes(t.id));
	}

	return baseTabs;
}

// ── Build Company Tab Definitions ────────────────────────────────
// Company applicants get a Business Profile tab (industry, turnover,
// etc.) as their first tab, followed by the standard Company profile,
// credit, and obligations tabs.
export function buildCompanyIncomeTabs(
	applicant: Record<string, unknown>,
	completion: Record<string, boolean>
): IncomeTab[] {
	const tabs: IncomeTab[] = [
		{
			id: 'business_profile',
			label: 'Business Profile',
			complete: completion['business_profile'] ?? false
		},
		{
			id: 'profile',
			label: 'Company Profile',
			complete: completion['profile'] ?? false
		},
		{
			id: 'credit_score',
			label: 'Credit Score',
			complete: completion['credit_score'] ?? false
		}
	];

	// Obligations tab is always present (question is now on this page)
	tabs.push({
		id: 'obligations_details',
		label: 'Existing Loans',
		complete: completion['obligations_details'] ?? false
	});

	return tabs;
}

// ── Compute Company Business Profile Completion ─────────────────
// Checks if the card-style business profile questions are filled.
export function isBusinessProfileComplete(
	applicant: Record<string, unknown> | null | undefined
): boolean {
	const required = [
		'industrySector',
		'businessType',
		'businessVintage',
		'gstRegistered',
		'annualTurnover',
		'employeeCount'
	];
	return required.every((key) => {
		const val = applicant?.[key];
		return val !== undefined && val !== null && val !== '';
	});
}

// ── Tab Accessibility Check ──────────────────────────────────────
// A tab is accessible only if ALL previous tabs are complete.
// This enforces the progressive-disclosure pattern:
// user must complete profile → profiles → details → credit → (obligations).
export function isTabAccessible(
	tabId: string,
	tabs: { id: string; complete?: boolean }[]
): boolean {
	const idx = tabs.findIndex((t) => t.id === tabId);
	if (idx <= 0) return true; // First tab is always accessible
	for (let i = 0; i < idx; i++) {
		if (!tabs[i].complete) return false;
	}
	return true;
}

// ── Check if All Income Tabs Complete ────────────────────────────
// Convenience function: returns true when every tab (including
// conditional obligations) is complete. Used to set __completion.
export function areAllTabsComplete(
	_applicant: Record<string, unknown>,
	completion: Record<string, boolean>
): boolean {
	return (
		(completion.profile ?? false) &&
		(completion.income_profiles ?? false) &&
		(completion.income_details ?? false) &&
		(completion.credit_score ?? false) &&
		(completion.obligations_details ?? false)
	);
}

/**
 * Returns a user-facing reason explaining WHY the Existing Loans (obligations)
 * page's Next button is disabled, or '' if it isn't blocked at the obligations
 * tab. Used to populate FormNavigationBar's `disabledReason` prop so users see
 * a hint instead of a silently-disabled button.
 *
 * Mirrors the gating logic in `computeSectionCompletion`'s obligations_details
 * branch — kept in lockstep with that block. CLAUDE.md Pitfall #26.
 */
export function getObligationsDisabledReason(
	applicant: Record<string, unknown>,
	options: { loanScope?: string; caseHasDcClosure?: boolean } = {}
): string {
	const loanScope = options.loanScope ?? '';
	const isDcRoute = ['Debt Consolidation', 'Debt Consolidation with Extra Funds'].some((v) =>
		loanScope.includes(v)
	);
	const obligations = asArray(applicant.obligations);

	// Stale-closure check fires FIRST so the user sees the precise reason
	// (otherwise the DC / Yes / No / Guarantor branches would mask it with
	// their own messages). Mirrors the final gate in computeSectionCompletion.
	const staleClosure = obligations.find((o) => {
		const entry = o as Record<string, unknown>;
		const sel = String(entry.selectedToClose ?? '');
		if (!sel) return false;
		return !isClosureValueValid(
			sel,
			entry.role as string | undefined,
			String(entry.loanType ?? ''),
			loanScope
		);
	});
	if (staleClosure) {
		return 'One or more saved obligations has a closure plan that is not valid for this loan. Edit the obligation(s) marked "Action needed" and pick a closure plan from the visible options.';
	}

	if (isDcRoute) {
		const hasClosureByNewLoan = obligations.some(
			(o) => (o as Record<string, unknown>).selectedToClose === 'Will be closed by Top-up amount'
		);
		if (hasClosureByNewLoan) return '';
		if (obligations.length === 0 && options.caseHasDcClosure === true) return '';
		if (obligations.length === 0) {
			return 'Debt Consolidation requires at least one obligation marked "Close by this new loan". Add the obligation(s) you want to consolidate.';
		}
		return 'For Debt Consolidation, at least one obligation must have "Close by this new loan" selected. Edit an obligation and choose that closure option.';
	}

	if (applicant.ObligationsRunning === 'Yes') {
		const hasEntries =
			obligations.length > 0 ||
			asArray(applicant.tableLoanEntries).length > 0 ||
			asArray(applicant.tableLimitEntries).length > 0;
		if (!hasEntries) {
			return 'You marked "Yes" for running obligations — add at least one obligation entry.';
		}
		if (applicant.isGuarantorOnOtherLoan === 'Yes') {
			const hasGuarantorRole = obligations.some(
				(o) => (o as Record<string, unknown>).role === 'guarantor'
			);
			if (!hasGuarantorRole) {
				return 'You marked yourself as a Guarantor — at least one obligation must have role "Guarantor".';
			}
		}
		const profiles = (applicant.selectedIncomeProfiles ?? []) as string[];
		const isNonEarner = profiles.length === 1 && profiles[0] === 'no_current_income';
		if (isNonEarner) {
			const missingEmiPaidBy = obligations.some((o) => !(o as Record<string, unknown>).emiPaidBy);
			if (missingEmiPaidBy) {
				return 'Since you have no current income, every obligation must declare who pays the EMI. Fill in "EMI paid by" for each entry.';
			}
		}
		return '';
	}

	if (applicant.ObligationsRunning === 'No') {
		if (applicant.isGuarantorOnOtherLoan === 'Yes') {
			const hasGuarantorRole = obligations.some(
				(o) => (o as Record<string, unknown>).role === 'guarantor'
			);
			if (!hasGuarantorRole) {
				return 'You marked yourself as a Guarantor — add at least one obligation with role "Guarantor".';
			}
		} else if (applicant.isGuarantorOnOtherLoan !== 'No') {
			return 'Answer whether you are a guarantor on any other loan.';
		}
		return '';
	}

	if (applicant.isGuarantorOnOtherLoan === 'Yes') {
		const hasGuarantorRole = obligations.some(
			(o) => (o as Record<string, unknown>).role === 'guarantor'
		);
		if (!hasGuarantorRole) {
			return 'You marked yourself as a Guarantor — add at least one obligation with role "Guarantor".';
		}
		return 'Answer whether you have any other running obligations.';
	}

	return 'Answer whether you have any running obligations.';
}

/**
 * Case-level "Next disabled" reason for the income / applicant-list view —
 * the multi-applicant complement to getObligationsDisabledReason.
 *
 * Why a separate helper: getObligationsDisabledReason takes ONE applicant
 * and returns ONE applicant's blocker. In multi-applicant DC routes, each
 * applicant can individually pass (because the joint debt-free-coapplicant
 * branch at line ~678 allows empty obligations when caseHasDcClosure=true) —
 * but if NO applicant has the "Close by this new loan" closure, the case
 * itself can't proceed. That's the gap the user hit: 3 applicants each
 * showing green "Done" badges, Next disabled, NO reason surfaced
 * (BL Income & Credit Details screenshot, 2026-05-26).
 *
 * Returns '' when nothing's blocking at the case level. Otherwise returns
 * a single plain-English message describing what the DSA needs to do.
 *
 * Pitfall #53 — companion to #26. Every loan page MUST wire BOTH this
 * helper AND getObligationsDisabledReason to FormNavigationBar.disabledReason
 * so the user never sees "Next disabled, no reason" on either single OR
 * multi applicant flows.
 */
export function getCaseLevelDisabledReason(
	applicants: Array<Record<string, unknown>>,
	options: { loanScope?: string; onApplicantListPage?: boolean } = {}
): string {
	const loanScope = options.loanScope ?? '';
	const isDcRoute = ['Debt Consolidation', 'Debt Consolidation with Extra Funds'].some((v) =>
		loanScope.includes(v)
	);

	if (!isDcRoute) return '';
	// Only surface case-level reasons on the applicant-list / income page,
	// NOT on individual obligation pages (those have their own per-applicant
	// reasons via getObligationsDisabledReason).
	if (options.onApplicantListPage === false) return '';

	// Pitfall #58: corporate DC must consolidate COMPANY-level debt, not
	// director/partner personal debt. When the case has a Company applicant,
	// require the "Will be closed by Top-up amount" mark on at least one
	// Company-owned obligation — not just any obligation across the case.
	const caseHasCompany = applicants.some((a) => a?.applicantType === 'Company');

	const isMarkedClosed = (o: unknown) =>
		(o as Record<string, unknown>).selectedToClose === 'Will be closed by Top-up amount';

	if (caseHasCompany) {
		const companyHasClosure = applicants.some((a) => {
			if (a?.applicantType !== 'Company') return false;
			return asArray(a?.obligations).some(isMarkedClosed);
		});
		if (companyHasClosure) return '';

		// Differentiate the message based on whether the COMPANY has obligations at all.
		const companyHasObligations = applicants.some(
			(a) => a?.applicantType === 'Company' && asArray(a?.obligations).length > 0
		);
		if (companyHasObligations) {
			return 'Debt Consolidation requires at least one COMPANY-level loan to be marked "Close by this new loan". A corporate loan cannot close a director/partner\'s personal debt.';
		}
		return 'Debt Consolidation requires the company itself to have at least one existing loan to consolidate. Open the Company applicant and add the loan(s) you want to close with this new loan.';
	}

	// Non-company case (individual-only DC) — fall through to the original
	// aggregate rule: any applicant's obligation marked closed satisfies it.
	const caseHasDcClosure = applicants.some((a) => {
		const obs = asArray(a?.obligations);
		return obs.some(isMarkedClosed);
	});
	if (caseHasDcClosure) return '';

	// Differentiate the message based on whether there are obligations at all.
	const someApplicantHasObligations = applicants.some(
		(a) => asArray(a?.obligations).length > 0
	);
	if (someApplicantHasObligations) {
		return 'Debt Consolidation requires at least one existing loan across all applicants to be marked "Close by this new loan". Open any applicant with running obligations and change the closure plan on one entry.';
	}
	return 'Debt Consolidation requires at least one existing loan to consolidate. Open an applicant who has running obligations and add the loan(s) you want to close with this new loan.';
}

// ── Company Completion ──────────────────────────────────────────
// Centralized completion for all 5 Company wizard tabs.
// Reuses credit_score and obligations logic from computeSectionCompletion.
export function computeCompanyCompletion(
	applicant: Record<string, unknown>
): Record<string, boolean> {
	const result: Record<string, boolean> = {
		identity: false,
		character: false,
		income: false,
		credit_score: false,
		obligations_details: false
	};

	if (!applicant) return result;

	// ── Tab 1: Identity ──────────────────────────────────────
	const categories = (applicant.businessCategories as BusinessCategoryEntry[] | undefined) ?? [];
	const identityQsDone = IDENTITY_QUESTIONS.filter((q) => q.required).every((q) => {
		const val = applicant[q.key];
		return val !== undefined && val !== null && val !== '';
	});
	// GST registration date required when GST registered
	const gstStatus = applicant.gstStatus as string | undefined;
	const isGSTRegistered =
		gstStatus === 'registered_regular' || gstStatus === 'registered_composition';
	const gstRegDateOk =
		!isGSTRegistered ||
		!!(applicant.companyIncome as CompanyIncomeData | undefined)?.gst?.registrationDate;
	result.identity = categories.length > 0 && identityQsDone && gstRegDateOk;

	// ── Tab 2: Character ─────────────────────────────────────
	const commonDone = CHARACTER_COMMON_QUESTIONS.filter((q) => q.required).every((q) => {
		const val = applicant[q.key];
		return val !== undefined && val !== null && val !== '';
	});

	const visibleConditionals = CHARACTER_CONDITIONAL_QUESTIONS.filter(
		(q) => !q.showWhen || q.showWhen(applicant)
	);
	const conditionalDone = visibleConditionals
		.filter((q) => q.required)
		.every((q) => {
			const val = applicant[q.key];
			return val !== undefined && val !== null && val !== '';
		});

	result.character = commonDone && conditionalDone;

	// ── Tab 3: Income (4 mediums) ────────────────────────────
	result.income = hasAllMediumsComplete(
		applicant.companyIncome as CompanyIncomeData | undefined,
		applicant.gstStatus as string | undefined,
		applicant.businessVintage as string | undefined
	);

	// ── Tab 4: Credit Score (reuse Individual logic) ─────────
	const rawCreditScore = applicant.creditScore;
	const hasEnteredScore =
		rawCreditScore !== '' && rawCreditScore !== undefined && rawCreditScore !== null;
	const creditScore = Number(rawCreditScore);
	const isSpecialScore = hasEnteredScore && (creditScore === -1 || creditScore === 0);
	const companyWhyLowCredit = applicant.whyPrimaryLowCredit;
	const creditFactorsOk =
		applicant.creditFactorsAnswered === true ||
		(Array.isArray(companyWhyLowCredit) && companyWhyLowCredit.length > 0);
	result.credit_score = !hasEnteredScore
		? false
		: isSpecialScore
			? true
			: creditScore >= 300 && creditScore <= 900 && creditFactorsOk;

	// ── Tab 5: Obligations (reuse Individual logic) ──────────
	// Base completion from ObligationsRunning answer
	if (applicant.ObligationsRunning === 'Yes') {
		result.obligations_details =
			asArray(applicant.obligations).length > 0 ||
			asArray(applicant.tableLoanEntries).length > 0 ||
			asArray(applicant.tableLimitEntries).length > 0;
	} else if (applicant.ObligationsRunning === 'No') {
		result.obligations_details = true;
	} else {
		result.obligations_details = false;
	}

	// Guarantor override — only apply when the guarantor question was explicitly
	// answered. Company applicants may not have this question at all; leaving the
	// base ObligationsRunning result untouched in that case.
	// Matches the Individual path (see computeSectionCompletion above): guarantor=Yes
	// ADDS a "must have at least one guarantor-role entry" requirement on top of
	// the base ObligationsRunning completeness.
	if (applicant.isGuarantorOnOtherLoan === 'Yes') {
		if (result.obligations_details) {
			const hasGuarantorRole = asArray(applicant.obligations).some(
				(o) => (o as Record<string, unknown>).role === 'guarantor'
			);
			if (!hasGuarantorRole) result.obligations_details = false;
		}
	}
	// guarantor === 'No' imposes no additional constraint beyond the base result.
	// If unanswered (undefined/null/''), keep the base result above.

	return result;
}

export function areAllCompanyTabsComplete(applicant: Record<string, unknown>): boolean {
	const completion = computeCompanyCompletion(applicant);
	return Object.values(completion).every(Boolean);
}
