import type { WizardSectionConfig, WizardSection, WizardSubsection } from '$lib/types/wizard';
import type { Answers } from '$lib/types/formTypes';
import { checkGraphConnectivity } from '$lib/components/relationship-capture/graphConnectivity';
import type {
	Applicant as RelApplicant,
	Relationship
} from '$lib/components/relationship-capture/types';
import { computeSectionCompletion, type CompletionOptions } from '$lib/utils/incomeTabState';
import {
	countStandaloneIndividuals,
	isStandaloneApplicant
} from '$lib/utils/applicantVisibility';

/** Minimal question shape the wizard needs — compatible with both Question and ClientQuestion */
interface WizardQuestion {
	id: string;
	type: string;
	required?: boolean;
	bindsTo?: string;
	bindsTo_template?: string;
	contextKey?: string;
}

// ============================================================================
// PERF-3C: per-page completion memoization helpers
// ----------------------------------------------------------------------------
// The wizard's `completionMap` is a single $derived that re-runs on ANY
// reactive change (answer edits, applicant store mutations, relationship
// graph edits). Without per-page memoization, each re-run recomputes every
// page's completion — including the expensive branches: graph-connectivity
// for applicant pages and computeSectionCompletion for 4 income/credit
// /obligations pages. We cache each page's result keyed by a small
// fingerprint of its actual inputs so unrelated edits short-circuit.
// ============================================================================

const CUSTOM_PAGE_COMPLETION_KEY: Record<string, string> = {
	incomeProfilesPage: 'income_profiles',
	incomeDetailsPage: 'income_details',
	creditScorePage: 'credit_score',
	obligationsPage: 'obligations_details'
};

/**
 * Produce a stable string fingerprint for cache-key purposes. Falls back to
 * String(value) on circular refs so the memo degrades to pass-through rather
 * than throwing.
 */
function fingerprintOf(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

interface PageCompletion {
	answered: number;
	total: number;
}

interface SectionCompletion {
	answered: number;
	total: number;
	complete: boolean;
}

interface WizardStateOptions {
	sectionConfig: WizardSectionConfig;
	getSectionConfig?: () => WizardSectionConfig;
	getVisiblePages: () => Array<{
		id?: string;
		questions: WizardQuestion[];
		complete?: boolean;
	}> | null;
	getAnswers: () => Answers;
	getCombinedAnswers: () => Answers;
	isQuestionVisible: (question: WizardQuestion, answers: Answers) => boolean;
	resolveBindsTo: (question: WizardQuestion, answers: Answers, selectedLoan: string) => string;
	selectedLoan: () => string;
	getApplicantsStore?: () => Array<Record<string, unknown>>;
	getRelationships?: () => Relationship[];
	getApplicantStep?: () => number;
	getRelationshipCount?: () => number; // Reactive trigger for relationship changes
	getApplicantCount?: () => number; // Reactive trigger for applicant changes
	getIsNextEnabled?: () => boolean;
	getCurrentPageId?: () => string | undefined;
	getGpaValidate?: () => boolean;
}

export function createWizardState(options: WizardStateOptions) {
	const {
		sectionConfig: staticSectionConfig,
		getSectionConfig: getSectionConfigOpt,
		getVisiblePages,
		getAnswers,
		getCombinedAnswers,
		isQuestionVisible,
		resolveBindsTo,
		selectedLoan,
		getApplicantsStore,
		getRelationships,
		getApplicantStep,
		getRelationshipCount,
		getApplicantCount,
		getIsNextEnabled,
		getCurrentPageId,
		getGpaValidate
	} = options;

	// Resolve sectionConfig: reactive getter takes precedence over static value
	const resolveSectionConfig = getSectionConfigOpt ?? (() => staticSectionConfig);

	// Detect 4-step applicant flow (secured loans with Profile step)
	// vs 3-step flow (unsecured loans without Profile step)
	let maxApplicantStep = 0;
	for (const section of resolveSectionConfig().sections) {
		for (const sub of section.subsections) {
			if (sub.applicantStep !== undefined && sub.applicantStep > maxApplicantStep) {
				maxApplicantStep = sub.applicantStep;
			}
		}
	}
	const hasProfileStep = maxApplicantStep >= 3;

	// Unsecured loans hide residence-vs-property question → don't require it for completion
	const SECURED_LOAN_TYPES = ['Home Loan', 'LAP', 'Plot Loan'];
	// Loan variant (e.g. "Debt Consolidation") drives obligation validation rules
	const resolvedLoanVariant = $derived(getCombinedAnswers()?.loanType?.toString() ?? '');
	const completionOptsBase = $derived<CompletionOptions>({
		requireResidencePattern: SECURED_LOAN_TYPES.includes(resolveSectionConfig().loanProduct),
		loanScope: resolvedLoanVariant
	});

	// Professional Loan directors linked to a company are non-financial
	const isProfessionalLoan = $derived(resolveSectionConfig().loanProduct === 'Professional Loan');

	/** Build per-applicant completion options including classification */
	function getCompletionOptsForApplicant(applicant: Record<string, unknown>): CompletionOptions {
		let classification = applicant?.applicantClassification as string | undefined;
		// Infer classification for Professional Loan directors linked to a company
		if (
			!classification &&
			isProfessionalLoan &&
			applicant?.applicantType === 'Individual' &&
			applicant?.linkedCompanyId
		) {
			classification = 'co_applicant_non_financial';
		}
		if (!classification) return completionOptsBase;
		return { ...completionOptsBase, applicantClassification: classification };
	}

	// Profile completion check — mirrors ApplicantProfilePage.completionCheck
	function isApplicantProfileComplete(applicants: Array<Record<string, unknown>>): boolean {
		if (applicants.length === 0) return false;
		return applicants.every((a) => {
			if (a.applicantType === 'Individual') {
				if (!a.education || !a.religion || !a.ownedResidentialProperties) return false;
				// Residence pattern not asked for NRI (lender uses GPA location)
				if (a.isNRI !== 'Yes') {
					if (!a.applicantResidencePattern) return false;
					if (a.applicantResidencePattern === 'DIFFERENT_STATE' && !a.applicantResidenceState)
						return false;
					if (a.applicantResidencePattern !== 'SAME_CITY' && !a.applicantResidenceCity)
						return false;
				}
				if (a.isNRI === 'Yes' && !a.nriCountry) return false;
				return true;
			} else if (a.applicantType === 'Company') {
				if (!a.companyOwnedProperties || !a.companyOfficeProximity) return false;
				if (a.companyOfficeProximity === 'DIFFERENT_STATE' && !a.companyOfficeState) return false;
				if (a.companyOfficeProximity !== 'SAME_CITY' && !a.companyOfficeCity) return false;
				return true;
			}
			return true;
		});
	}

	// ── PERF-3C: per-page completion cache ─────────────────────────
	// Cache value: fingerprint of that page's inputs + the entries this page
	// contributes to the completion map (some pages expand into multiple keys,
	// e.g. applicant pages emit pageId + pageId__step0..3).
	type PageEntries = Array<[string, PageCompletion]>;
	const pageCompletionCache = new Map<string, { fingerprint: string; entries: PageEntries }>();

	function memoPage(
		pageId: string,
		fingerprint: string,
		compute: () => PageEntries
	): PageEntries {
		const hit = pageCompletionCache.get(pageId);
		if (hit && hit.fingerprint === fingerprint) return hit.entries;
		const entries = compute();
		pageCompletionCache.set(pageId, { fingerprint, entries });
		return entries;
	}

	// ── Per-page computation helpers (pure; closures capture setup state) ─

	/**
	 * Applicant list page — emits the page key plus per-step keys.
	 * Expensive branch: calls checkGraphConnectivity when >1 individual.
	 */
	function computeApplicantPage(
		pageId: string,
		applicants: Array<Record<string, unknown>>
	): PageEntries {
		const hasApplicants = applicants.length > 0;
		const allComplete = applicants.every(
			(a: any) =>
				a.__completion === true ||
				a.allRequiredAnswered === true ||
				(a.applicantType === 'Company' && a.companyCompletion === true)
		);

		const entries: PageEntries = [
			[pageId, { answered: hasApplicants && allComplete ? 1 : 0, total: 1 }],
			// Step 0 (Basic Details): complete when applicants exist.
			// The isNextEnabled override (in the derive) handles the edge case
			// where an applicant is added but not yet fully filled in.
			[`${pageId}__step0`, { answered: hasApplicants ? 1 : 0, total: 1 }]
		];

		// Relationships check — include ALL Individuals (standalone + linked
		// directors). The relationship page is the single source of truth —
		// hasRelatedDirectors is auto-set from captured relationships.
		const individuals = applicants.filter((a) => a.applicantType === 'Individual');
		let relationshipsComplete = false;
		if (individuals.length <= 1) {
			relationshipsComplete = true;
		} else if (getRelationships) {
			const rels = getRelationships();
			const graphApplicants: RelApplicant[] = individuals.map((a) => ({
				id: (a.id as string) || '',
				name: (a.fullName as string) || (a.name as string) || '',
				gender: (a.gender as RelApplicant['gender']) || 'Male',
				maritalStatus: (a.maritalStatus as RelApplicant['maritalStatus']) || 'Single',
				role: (a.role as RelApplicant['role']) || 'both'
			}));
			const graphStatus = checkGraphConnectivity(graphApplicants, rels);
			relationshipsComplete = graphStatus.isComplete;
		} else {
			relationshipsComplete = individuals.every((a) => a.relationship && a.relationship !== '');
		}

		if (hasProfileStep) {
			// 4-step flow (secured loans)
			// applicantStep values: 0=Basic, 1=Relationships, 2=GPA, 3=Profile&Financials
			entries.push([
				`${pageId}__step1`,
				{ answered: relationshipsComplete ? 1 : 0, total: 1 }
			]);
			// GPA step — mirrors the showWhen condition from wizardSections config:
			// GPA only appears when every individual applicant is NRI (same logic
			// as __allIndividualsNRI in combinedAnswersMemo). GPA data lives in
			// formState.applicationData.gpaProfiles, not on applicants directly,
			// so we rely on the validated flag passed via getGpaValidate().
			const individuals = applicants.filter((a: any) => a.applicantType !== 'Company');
			const allIndividualsNRI =
				individuals.length > 0 && individuals.every((a: any) => a.isNRI === 'Yes');
			const gpaComplete = !allIndividualsNRI || (getGpaValidate?.() ?? false);
			entries.push([`${pageId}__step2`, { answered: gpaComplete ? 1 : 0, total: 1 }]);
			entries.push([`${pageId}__step3`, { answered: allComplete ? 1 : 0, total: 1 }]);
		} else {
			// 3-step flow (unsecured loans): Basic → Relationships → Income
			entries.push([
				`${pageId}__step1`,
				{ answered: relationshipsComplete ? 1 : 0, total: 1 }
			]);
			entries.push([`${pageId}__step2`, { answered: allComplete ? 1 : 0, total: 1 }]);
		}

		return entries;
	}

	/**
	 * Flattened BasicInfoFields page — empty questions[] + first-applicant
	 * check. Trivial compute; memo still useful to participate in the
	 * shared caching flow without special-casing the derive.
	 */
	function computeBasicInfoFlatPage(
		pageId: string,
		applicant: Record<string, unknown> | undefined
	): PageEntries {
		const hasBasic = !!(applicant?.fullName && applicant?.age && applicant?.gender);
		return [[pageId, { answered: hasBasic ? 1 : 0, total: 1 }]];
	}

	/**
	 * Custom component pages (flattened income wizard: income_profiles,
	 * income_details, credit_score, obligations_details). Expensive branch
	 * — computeSectionCompletion iterates applicant fields per section.
	 */
	function computeCustomComponentPage(
		pageId: string,
		sectionKey: string,
		applicant: Record<string, unknown> | undefined
	): PageEntries {
		if (!applicant) return [[pageId, { answered: 0, total: 1 }]];
		const completion = computeSectionCompletion(
			applicant,
			getCompletionOptsForApplicant(applicant)
		);
		return [
			[
				pageId,
				{
					answered: (completion as Record<string, boolean>)[sectionKey] ? 1 : 0,
					total: 1
				}
			]
		];
	}

	/**
	 * Standalone applicant profile page (single-applicant secured loans).
	 * Moderate compute — iterates every applicant's profile fields.
	 */
	function computeApplicantProfileOnlyPage(
		pageId: string,
		applicants: Array<Record<string, unknown>>
	): PageEntries {
		const done = isApplicantProfileComplete(applicants);
		return [[pageId, { answered: done ? 1 : 0, total: 1 }]];
	}

	/**
	 * Fallback: client-side question counting for non-server-eval forms.
	 * Not memoized — fingerprint construction would cost as much as compute
	 * (both iterate required/visible questions and read resolved values).
	 */
	function computeFallbackPage(
		pageId: string,
		questions: WizardQuestion[],
		combined: Answers,
		loan: string
	): PageEntries {
		const visibleQs = questions.filter((q) => isQuestionVisible(q, combined));
		const requiredQs = visibleQs.filter((q) => q.required);
		const total = requiredQs.length;

		let answered = 0;
		for (const q of requiredQs) {
			const key = resolveBindsTo(q, combined, loan);
			const val = combined[key];
			if (q.type === 'multiple-select') {
				if (Array.isArray(val) && val.length > 0) answered++;
			} else if (typeof val === 'boolean') {
				answered++;
			} else if (
				val !== undefined &&
				val !== null &&
				(typeof val !== 'string' || val.trim() !== '')
			) {
				answered++;
			}
		}

		return [[pageId, { answered, total }]];
	}

	const completionMap = $derived.by(() => {
		const pages = getVisiblePages();
		const combined = getCombinedAnswers();
		const loan = selectedLoan();
		const applicants = getApplicantsStore?.() ?? null;
		// Access relationship count to trigger reactivity when relationships change
		const _relationshipCount = getRelationshipCount?.() ?? 0;
		const applicantStep = getApplicantStep?.();
		const nextEnabled = getIsNextEnabled?.() ?? true;
		const currentPid = getCurrentPageId?.();
		// Read completionOptsBase through the derived system so its dependencies
		// are tracked and it's included in the custom-page fingerprint.
		const optsBase = completionOptsBase;
		const map: Record<string, PageCompletion> = {};

		if (!pages) return map;

		// Shared fingerprint of all applicants — computed once per derive run,
		// reused across every page branch that depends on applicant state.
		// This keeps JSON.stringify cost O(applicants) per derive rather than
		// O(applicants × pages-depending-on-applicants).
		const applicantsFP = applicants ? fingerprintOf(applicants) : '';
		const optsFP = fingerprintOf(optsBase);

		for (const page of pages) {
			if (!page.id) continue;
			const pid = page.id;

			const isApplicantPage =
				pid === 'tellUs_homeLoan' ||
				pid === 'tellUsApplyingPage' ||
				pid === 'applicantPage';

			let entries: PageEntries;

			if (isApplicantPage && applicants) {
				const fp = `applicant|${applicantsFP}|rc:${_relationshipCount}|hps:${hasProfileStep ? 1 : 0}`;
				entries = memoPage(pid, fp, () => computeApplicantPage(pid, applicants));
			} else if (
				(pid === 'basicInfoPage' || pid === 'applicantPage') &&
				page.questions.length === 0 &&
				applicants
			) {
				// Flattened BasicInfoFields page — depends only on the first
				// applicant's name/age/gender.
				const applicant = applicants[0];
				const fp = `basic|${fingerprintOf({
					n: applicant?.fullName,
					a: applicant?.age,
					g: applicant?.gender
				})}`;
				entries = memoPage(pid, fp, () => computeBasicInfoFlatPage(pid, applicant));
			} else if (pid in CUSTOM_PAGE_COMPLETION_KEY && applicants) {
				const applicant = applicants[0];
				const sectionKey = CUSTOM_PAGE_COMPLETION_KEY[pid];
				const fp = `custom|${pid}|${applicantsFP}|${optsFP}`;
				entries = memoPage(pid, fp, () =>
					computeCustomComponentPage(pid, sectionKey, applicant)
				);
			} else if (pid === 'applicantProfilePage' && applicants) {
				const fp = `profile|${applicantsFP}`;
				entries = memoPage(pid, fp, () => computeApplicantProfileOnlyPage(pid, applicants));
			} else if (page.complete !== undefined) {
				// Server-provided per-page completion. visiblePages stubs have
				// empty questions[], so client-side counting would produce
				// total=0. Server evaluates all pages' questions against
				// combinedAnswers and provides a reliable complete boolean.
				const serverComplete = page.complete;
				const fp = `server|${serverComplete ? 1 : 0}`;
				entries = memoPage(pid, fp, () => [
					[pid, { answered: serverComplete ? 1 : 0, total: 1 }]
				]);
			} else {
				// Fallback — compute inline (no memo; see helper comment).
				entries = computeFallbackPage(pid, page.questions, combined, loan);
			}

			for (const [key, pc] of entries) map[key] = pc;
		}

		// Override: if current page's Next is disabled, force it incomplete.
		// For applicant pages the callers supply a per-step isNextEnabled
		// (e.g. applicantNextEnabled for steps 0-2, incomeValueCheck for last step)
		// so we override only the current step key.
		// Note: this override is applied AFTER memoization intentionally — it's
		// a transient UI-state overlay, not part of the cached page completion.
		const isCurrentApplicantPage =
			currentPid === 'tellUs_homeLoan' ||
			currentPid === 'tellUsApplyingPage' ||
			currentPid === 'applicantPage';

		if (currentPid && !nextEnabled) {
			if (isCurrentApplicantPage) {
				if (applicantStep !== undefined) {
					const stepKey = `${currentPid}__step${applicantStep}`;
					if (map[stepKey]) {
						map[stepKey] = { answered: 0, total: map[stepKey].total || 1 };
					}
				}
			} else if (map[currentPid] !== undefined) {
				map[currentPid] = { answered: 0, total: map[currentPid].total || 1 };
			}
		}

		return map;
	});

	const visibleSections = $derived.by(() => {
		const combined = getCombinedAnswers();
		return resolveSectionConfig().sections.filter(
			(s) => !s.showWhen || s.showWhen(combined as Record<string, unknown>)
		);
	});

	// Compute visible subsections per section (filters by subsection showWhen)
	const visibleSubsectionsMap = $derived.by(() => {
		const combined = { ...getCombinedAnswers() } as Record<string, unknown>;

		// Access applicant count to trigger reactivity when applicants change
		const _applicantCount = getApplicantCount?.() ?? 0;

		// Inject applicant metadata for subsection visibility (e.g. Relationships showWhen).
		// Counts MUST mirror the Who's Applying table (sortedApplicantEntries) — see
		// countStandaloneIndividuals docs for why director-linked rows are excluded.
		if (getApplicantsStore) {
			const applicants = getApplicantsStore();
			combined['__applicantCount'] = applicants.filter((a) => a.applicantType).length;
			combined['__individualApplicantCount'] = countStandaloneIndividuals(applicants);
			combined['__hasCompanyApplicant'] = applicants.some((a) => a.applicantType === 'Company');
			const standaloneIndividuals = applicants.filter(
				(a) => a.applicantType === 'Individual' && isStandaloneApplicant(a, applicants)
			);
			combined['__allIndividualsNRI'] =
				standaloneIndividuals.length > 0 &&
				standaloneIndividuals.every((a: any) => a.isNRI === 'Yes');
		}
		const map: Record<string, WizardSubsection[]> = {};
		for (const section of visibleSections) {
			map[section.id] = section.subsections.filter(
				(sub) => !sub.showWhen || sub.showWhen(combined)
			);
		}
		return map;
	});

	const sectionCompletion = $derived.by(() => {
		const map: Record<string, SectionCompletion> = {};
		const pages = getVisiblePages();
		const visiblePageIds = new Set(pages?.map((p) => p.id).filter(Boolean) as string[]);

		for (const section of visibleSections) {
			let totalAnswered = 0;
			let totalRequired = 0;

			// Only count pages from visible subsections
			const subs = visibleSubsectionsMap[section.id] ?? section.subsections;
			for (const sub of subs) {
				for (const pageId of sub.pageIds) {
					if (!visiblePageIds.has(pageId)) continue;
					// Use step-specific key for applicant subsections
					const lookupKey =
						sub.applicantStep !== undefined ? `${pageId}__step${sub.applicantStep}` : pageId;
					const pc = completionMap[lookupKey];
					if (pc) {
						totalAnswered += pc.answered;
						totalRequired += pc.total;
					}
				}
			}

			map[section.id] = {
				answered: totalAnswered,
				total: totalRequired,
				complete: totalRequired > 0 && totalAnswered >= totalRequired
			};
		}

		return map;
	});

	// Strict progressive disclosure: a section is reachable ONLY via an unbroken
	// forward chain (all previous sections complete) OR if the user is currently on it.
	// No back-navigation bypasses — changing an answer that makes a section incomplete
	// locks everything after it, ensuring all data stays consistent.
	const sectionReachability = $derived.by(() => {
		const result: Record<string, boolean> = {};
		let allPreviousComplete = true;

		// Find the section the user is currently on
		const currentPid = getCurrentPageId?.();
		let activeSectionId: string | undefined;
		if (currentPid) {
			for (const section of visibleSections) {
				const subs = visibleSubsectionsMap[section.id] ?? section.subsections;
				if (subs.some((sub) => sub.pageIds.includes(currentPid))) {
					activeSectionId = section.id;
					break;
				}
			}
		}

		for (const section of visibleSections) {
			const selfComplete = sectionCompletion[section.id]?.complete ?? false;
			const isActive = section.id === activeSectionId;

			// Reachable ONLY via unbroken forward chain OR currently active.
			// No selfComplete/hasReachableSub bypasses — if a prior section becomes
			// incomplete (user changed an answer), everything after it locks.
			result[section.id] = allPreviousComplete || isActive;

			// A section with no visible content (all subsections hidden) should not
			// block subsequent sections from being forward-reachable.
			const sectionTotal = sectionCompletion[section.id]?.total ?? 0;
			if (!selfComplete && sectionTotal > 0) allPreviousComplete = false;
		}
		return result;
	});

	// Strict progressive disclosure: a subsection is reachable ONLY if the section
	// is reachable AND all previous subsections in the same section are complete.
	// No selfReachable bypass — incomplete prior subsections lock everything after.
	const subsectionReachability = $derived.by(() => {
		const result: Record<string, boolean> = {};
		const pages = getVisiblePages();
		const visiblePageIds = new Set(pages?.map((p) => p.id).filter(Boolean) as string[]);

		for (const section of visibleSections) {
			const sectionReachable = sectionReachability[section.id] ?? false;
			const subs = visibleSubsectionsMap[section.id] ?? section.subsections;
			let allPreviousSubsComplete = true;
			for (const sub of subs) {
				// Check if this subsection is complete
				let subAnswered = 0;
				let subTotal = 0;
				for (const pageId of sub.pageIds) {
					// Skip pages not visible in the form engine (matches sectionCompletion logic)
					if (!visiblePageIds.has(pageId)) continue;
					const lookupKey =
						sub.applicantStep !== undefined ? `${pageId}__step${sub.applicantStep}` : pageId;
					const pc = completionMap[lookupKey];
					if (pc) {
						subAnswered += pc.answered;
						subTotal += pc.total;
					}
				}
				// If no visible pages for this subsection, treat as trivially complete
				// doesNotBlock: no visible pages (t=0) shouldn't block the NEXT subsection,
				// and completed subsections don't block either.
				const doesNotBlock = subTotal === 0 || subAnswered >= subTotal;

				// Strict: reachable ONLY via forward chain within the section.
				// No selfReachable bypass — if a prior subsection becomes incomplete,
				// everything after it locks.
				result[sub.id] = sectionReachable && allPreviousSubsComplete;
				if (!doesNotBlock) allPreviousSubsComplete = false;
			}
		}
		return result;
	});

	const overallProgress = $derived.by(() => {
		let totalAnswered = 0;
		let totalRequired = 0;

		for (const sc of Object.values(sectionCompletion)) {
			totalAnswered += sc.answered;
			totalRequired += sc.total;
		}

		if (totalRequired === 0) return 0;
		return Math.round((totalAnswered / totalRequired) * 100);
	});

	// All visible sections must be complete before form can be submitted
	const allSectionsComplete = $derived.by(() => {
		for (const section of visibleSections) {
			const sc = sectionCompletion[section.id];
			if (!sc || sc.total === 0) continue; // skip empty/hidden sections
			if (sc.answered < sc.total) return false;
		}
		return visibleSections.length > 0;
	});

	// Find which section/subsection the current page belongs to
	// Searches visible sections first, falls back to all sections if not found
	function findSectionForPage(pageId: string | undefined): {
		sectionId: string;
		subsectionId: string;
	} | null {
		if (!pageId) return null;
		const currentApplicantStep = getApplicantStep?.();

		// Helper: search a list of sections for the pageId
		function searchSections(sections: WizardSection[]) {
			let fallback: { sectionId: string; subsectionId: string } | null = null;
			for (const section of sections) {
				for (const sub of section.subsections) {
					if (sub.pageIds.includes(pageId!)) {
						if (sub.applicantStep !== undefined) {
							if (
								currentApplicantStep !== undefined &&
								sub.applicantStep === currentApplicantStep
							) {
								return { sectionId: section.id, subsectionId: sub.id };
							}
							if (!fallback) {
								fallback = { sectionId: section.id, subsectionId: sub.id };
							}
							continue;
						}
						return { sectionId: section.id, subsectionId: sub.id };
					}
				}
			}
			return fallback;
		}

		// Prefer visible sections so sidebar highlighting matches what's rendered
		const fromVisible = searchSections(visibleSections);
		if (fromVisible) return fromVisible;

		// Fallback to all sections (page may be in a section hidden by showWhen)
		return searchSections(resolveSectionConfig().sections);
	}

	// Get the first page index for a given section
	function getFirstPageIndexForSection(
		sectionId: string,
		visiblePages: Array<{ id?: string }> | null
	): number | null {
		if (!visiblePages) return null;
		const section = resolveSectionConfig().sections.find((s) => s.id === sectionId);
		if (!section) return null;

		for (const sub of section.subsections) {
			for (const pageId of sub.pageIds) {
				const idx = visiblePages.findIndex((p) => p.id === pageId);
				if (idx !== -1) return idx;
			}
		}
		return null;
	}

	// Get the first page index for a given subsection
	function getFirstPageIndexForSubsection(
		subsectionId: string,
		visiblePages: Array<{ id?: string }> | null
	): number | null {
		if (!visiblePages) return null;
		for (const section of resolveSectionConfig().sections) {
			const sub = section.subsections.find((s) => s.id === subsectionId);
			if (sub) {
				for (const pageId of sub.pageIds) {
					const idx = visiblePages.findIndex((p) => p.id === pageId);
					if (idx !== -1) return idx;
				}
			}
		}
		return null;
	}

	// Get the applicantStep for a given subsection (if any)
	function getSubsectionApplicantStep(subsectionId: string): number | undefined {
		for (const section of resolveSectionConfig().sections) {
			const sub = section.subsections.find((s) => s.id === subsectionId);
			if (sub) return sub.applicantStep;
		}
		return undefined;
	}

	/**
	 * Page id used by the Applicants section's multi-step subsections
	 * (e.g. `applicantPage`, `tellUs_homeLoan`, `tellUsApplyingPage` —
	 * varies by loan type, but is uniform within one section).
	 *
	 * Returns the pageId of the first visible subsection that carries an
	 * `applicantStep`, or null when no such subsection is currently visible
	 * (e.g. the section is hidden, or only `applicant-profile-single` is
	 * visible — which is a separate page, not a multi-step variant).
	 */
	function getApplicantPageId(): string | null {
		const applicantsSection = visibleSections.find((s) => s.id === 'applicants');
		if (!applicantsSection) return null;
		const subs = visibleSubsectionsMap[applicantsSection.id] ?? applicantsSection.subsections;
		for (const sub of subs) {
			if (sub.applicantStep !== undefined && sub.pageIds[0]) return sub.pageIds[0];
		}
		return null;
	}

	/**
	 * Bounds of currently-visible applicant sub-steps.
	 * Used by goNext/goPrev in form pages to reset `applicantPageIndex`
	 * when entering the multi-step applicant page from outside:
	 *   forward navigation → `first` (first sub-step, usually "Who's Applying")
	 *   backward navigation → `last`  (last visible sub-step the user reached)
	 *
	 * Returns null when no multi-step applicant subsections are visible —
	 * caller should leave `applicantPageIndex` untouched in that case.
	 */
	function getApplicantStepBounds(): { first: number; last: number } | null {
		const applicantsSection = visibleSections.find((s) => s.id === 'applicants');
		if (!applicantsSection) return null;
		const subs = visibleSubsectionsMap[applicantsSection.id] ?? applicantsSection.subsections;
		const steps = subs
			.map((s) => s.applicantStep)
			.filter((n): n is number => typeof n === 'number');
		if (steps.length === 0) return null;
		return { first: Math.min(...steps), last: Math.max(...steps) };
	}

	/**
	 * Compute the applicant sub-step index to seed when navigation crosses
	 * into the applicant multi-step page from a different schema page.
	 *
	 *   forward  → first visible sub-step (e.g. "Who's Applying")
	 *   backward → last visible sub-step  (e.g. "Income & Credit")
	 *
	 * Returns null when no transition occurred (already on the applicant
	 * page, or the target page isn't the applicant page).
	 */
	function resolveApplicantStepOnEntry(
		fromPageId: string | undefined,
		dir: 'forward' | 'backward',
		newPageId: string | undefined
	): number | null {
		const appPageId = getApplicantPageId();
		if (!appPageId) return null;
		if (newPageId !== appPageId || fromPageId === appPageId) return null;
		const bounds = getApplicantStepBounds();
		if (!bounds) return null;
		return dir === 'forward' ? bounds.first : bounds.last;
	}

	/**
	 * Find the first incomplete section and return its label + page index.
	 * Used by the Show Offers button to redirect the user to what's missing.
	 */
	function getFirstIncompleteSection(
		pages: Array<{ id?: string }> | null
	): { sectionLabel: string; pageIndex: number } | null {
		for (const section of visibleSections) {
			const sc = sectionCompletion[section.id];
			if (!sc || sc.total === 0) continue;
			if (sc.answered < sc.total) {
				const idx = getFirstPageIndexForSection(section.id, pages);
				if (idx !== null) {
					return { sectionLabel: section.label, pageIndex: idx };
				}
			}
		}
		return null;
	}

	/**
	 * Find ALL incomplete sections and return their labels + page indices.
	 * Drills down to subsection level so the user sees the specific tab/step
	 * that's incomplete (e.g., "Credit History") rather than the parent section
	 * (e.g., "Profile & Financial").
	 */
	function getAllIncompleteSections(
		pages: Array<{ id?: string }> | null
	): Array<{ sectionLabel: string; sectionId: string; pageIndex: number }> {
		const result: Array<{ sectionLabel: string; sectionId: string; pageIndex: number }> = [];
		const pageIds = new Set((pages ?? []).map((p) => p.id).filter(Boolean));

		for (const section of visibleSections) {
			const sc = sectionCompletion[section.id];
			if (!sc || sc.total === 0) continue;
			if (sc.answered >= sc.total) continue;

			// Drill into subsections to find the specific incomplete ones
			const subs = visibleSubsectionsMap[section.id] ?? section.subsections;
			let addedSubsection = false;

			for (const sub of subs) {
				let subAnswered = 0;
				let subTotal = 0;
				for (const pageId of sub.pageIds) {
					if (!pageIds.has(pageId)) continue;
					const lookupKey =
						sub.applicantStep !== undefined ? `${pageId}__step${sub.applicantStep}` : pageId;
					const pc = completionMap[lookupKey];
					if (pc) {
						subAnswered += pc.answered;
						subTotal += pc.total;
					}
				}
				// Subsection is incomplete if it has required items and not all answered
				if (subTotal > 0 && subAnswered < subTotal) {
					const idx = getFirstPageIndexForSubsection(sub.id, pages);
					if (idx !== null) {
						result.push({
							sectionLabel: sub.label,
							sectionId: sub.id,
							pageIndex: idx
						});
						addedSubsection = true;
					}
				}
			}

			// Fallback: if no specific subsection found, use the section-level label
			if (!addedSubsection) {
				const idx = getFirstPageIndexForSection(section.id, pages);
				if (idx !== null) {
					result.push({
						sectionLabel: section.label,
						sectionId: section.id,
						pageIndex: idx
					});
				}
			}
		}
		return result;
	}

	return {
		get completionMap() {
			return completionMap;
		},
		get sectionCompletion() {
			return sectionCompletion;
		},
		get overallProgress() {
			return overallProgress;
		},
		get allSectionsComplete() {
			return allSectionsComplete;
		},
		get visibleSections() {
			return visibleSections;
		},
		get visibleSubsectionsMap() {
			return visibleSubsectionsMap;
		},
		get sectionReachability() {
			return sectionReachability;
		},
		get subsectionReachability() {
			return subsectionReachability;
		},
		findSectionForPage,
		getFirstPageIndexForSection,
		getFirstPageIndexForSubsection,
		getSubsectionApplicantStep,
		getApplicantPageId,
		getApplicantStepBounds,
		resolveApplicantStepOnEntry,
		getFirstIncompleteSection,
		getAllIncompleteSections
	};
}

export type WizardState = ReturnType<typeof createWizardState>;
