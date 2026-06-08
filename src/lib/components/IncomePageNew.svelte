<script lang="ts">
	/**
	 * IncomePageNew — Profile & Financial Assessment
	 * ═══════════════════════════════════════════════════════════════════
	 * 5-tab structure: profile + multi-source income profile system:
	 *
	 *   Tab 1: Profile (education, religion, SC/ST, properties, disability, residence)
	 *   Tab 2: Income Profiles (multi-select cards)
	 *   Tab 3: Income Details (dropdown + form + entries table)
	 *   Tab 4: Credit Score & CIBIL
	 *   Tab 5: Existing Loans / Obligations (conditional)
	 *
	 * Features:
	 *   - Multiple income sources per applicant
	 *   - Per-entry specifics + income fields
	 *   - Card-based mobile layout
	 *   - Progressive tab locking (manual Previous/Next navigation)
	 *   - Backward-compatible data storage
	 *
	 * Data Storage:
	 *   Each applicant's data includes `incomeEntries: IncomeSourceEntry[]`
	 *   which stores ALL raw granular data. The Rule Engine operates on
	 *   this array for lender-specific calculations.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { untrack, tick } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { runCrossFieldValidation, type Contradiction } from '$lib/utils/crossStepValidator';
	import CrossFieldWarningBanner from './CrossFieldWarningBanner.svelte';
	import { detachOrphanDirector } from '$lib/utils/detachOrphanDirector';
	import { validateLinkedEntries, getLinkedShareholdings } from '$lib/utils/sameCompanySync';
	import { assembleFirmNameOptions } from '$lib/utils/firmNameOptions';
	import { rendersAsSingleApplicant } from '$lib/utils/applicantViewMode';
	import Modal from './Modal.svelte';
	import ModalTabs from './ModalTabs.svelte';
	import ApplicantCard from './ApplicantCard.svelte';
	import ApplicantRow from './ApplicantRow.svelte';
	// GPAOfNriApplicant is now a separate wizard step (rendered by ApplicantFormSecured)
	import IncomeTabContent from './IncomeTabContent.svelte';
	import IncomeModalContent from './IncomeModalContent.svelte';
	import Company from './Company.svelte';
	import {
		Mars,
		Venus,
		Building2,
		ChevronLeft,
		ChevronRight,
		Check,
		CircleAlert,
		X
	} from '$lib/utils/iconRegistry';
	import { v4 as uuidv4 } from 'uuid';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte.js';
	import { applicantRecoveryStore, buildMatchSignature } from '$lib/stores/applicantRecovery';
	import { deriveLegacyEmploymentType, INCOME_PROFILE_CARDS } from '$lib/config/incomeProfiles';
	import { getAutoSelectedProfiles } from '$lib/config/incomeProfiles/profileCards';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
	import {
		computeSectionCompletion,
		computeCompanyCompletion,
		buildIncomeTabs,
		isTabAccessible as checkTabAccessible,
		areAllTabsComplete,
		areAllCompanyTabsComplete,
		type CompletionOptions
	} from '$lib/utils/incomeTabState';
	import {
		deriveApplicantRole,
		deriveUnsecuredDirectorRoleWithFamily,
		isDirectorSkippable,
		type ApplicantDerivedRole
	} from '$lib/utils/applicantRoleUtils';
	import { FULL_PROFILE_COMPANY_TYPES } from '$lib/components/applicantFormManager.svelte';
	import { get } from 'svelte/store';
	import { allRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import { deriveAllCompanyFamilyControl } from '$lib/utils/familyControlDerivation';
	import {
		detectObligationDuplicates,
		type ObligationDupWarning
	} from '$lib/utils/obligationDedup';
	import {
		evaluateCompanyFinancialsNeeded,
		type CompanyFinancialsEvaluation
	} from '$lib/utils/companyAutoDerive';
	import { deriveEvidenceFlags } from '$lib/utils/evidenceFlags';
	import { syncAutoIncomeEntries } from '$lib/utils/directorAutoIncome';
	import {
		findSameCompanyMatch,
		syncLinkedEntriesAcrossApplicants,
		stampLinkedKeyOnEntry,
		extractCompanySpecifics,
		buildLinkedEntityKey,
		LINKABLE_PROFILE_TYPES
	} from '$lib/utils/sameCompanySync';

	// ── State ──────────────────────────────────────────────────────
	let showModal = $state(false);

	// ── R4: Company financials documentation flags ───────────────
	interface CompanyFinancialsFlag {
		entityName: string;
		entityType: string;
		reason: string;
	}
	/** Flags for companies whose financials lenders will need — derived from applicant data, survives navigation */
	let companyFinancialsFlags = $derived(
		deriveEvidenceFlags(formState.applicants as Array<Record<string, unknown>>).map((f) => ({
			entityName: f.entityName,
			entityType: f.entityType,
			reason: f.reason
		}))
	);
	/** Dismissed flags (user manually closed the banner) */
	let dismissedFlags = $state<Set<string>>(new Set());
	let visibleFinancialsFlags = $derived(
		companyFinancialsFlags.filter((f) => !dismissedFlags.has(f.entityName.toLowerCase()))
	);
	/** Guidance note shown after director/partner entry save */
	let showMultiCompanyGuidance = $state(false);

	// ── Same-company detection across co-applicants ──────────────
	/** Prompt state: when an income entry matches another applicant's company */
	let sameCompanyPrompt = $state<{
		pendingEntry: IncomeSourceEntry;
		isUpdate: boolean;
		sourceApplicantName: string;
		sourceApplicantIndex: number;
		sourceEntryId: string;
		sourceSpecifics: Record<string, unknown>;
	} | null>(null);

	// Sync local prompt state → layout-level `dialogState.sameCompanyPrompt`
	// (S104, Issue A — 2026-05-16). The modal itself now renders from
	// `form/+layout.svelte` via SameCompanyPromptModal, OUTSIDE the
	// per-applicant profile modal's <dialog> tree. Pre-S104 we tried
	// `<dialog>.showModal()` inline — that nested inside the parent dialog
	// caused some browsers to render the prompt BEHIND the parent in top
	// layer, so users perceived Update Entry as a no-op.
	//
	// We keep the local `sameCompanyPrompt` $state because confirmSameCompany
	// / denySameCompany need its rich payload (pendingEntry,
	// sourceApplicantIndex, sourceEntryId, sourceSpecifics). The layout-level
	// modal reads only the display fields and invokes the callbacks.
	$effect(() => {
		if (sameCompanyPrompt) {
			dialogState.sameCompanyPrompt = {
				sourceApplicantName: sameCompanyPrompt.sourceApplicantName,
				entityName: sameCompanyPrompt.pendingEntry.entityName,
				onConfirm: confirmSameCompany,
				onDeny: denySameCompany
			};
		} else {
			dialogState.sameCompanyPrompt = null;
		}
	});

	// Page-level cross-field warnings — reactive, auto-updates when applicant data changes.
	// Used by ApplicantCard/ApplicantRow to show "Resolve Issues" status badge.
	const incomeWarnings = $derived.by(() => {
		const applicants = formState.applicants as Record<string, any>[];
		if (!applicants || applicants.length === 0) return [] as Contradiction[];
		const result = runCrossFieldValidation(
			applicants,
			formState.applicationData as Record<string, any>
		);
		return result.warnings;
	});

	/** Count cross-field warnings for a specific applicant index */
	function warningCountForApplicant(applicantIndex: number): number {
		return incomeWarnings.filter((w) => w.applicantIndex === applicantIndex).length;
	}

	// Cross-field warnings — scoped to the RELEVANT modal tab.
	// Each warning category only appears on the tab where the user can actually fix it.
	// The final "done" tab shows ALL warnings as a gate before closing the modal.
	// Single-applicant inline view = a lone Individual only. A Company applicant
	// always uses the multi cards+modal path (canonical decision, shared with
	// +page.svelte). See applicantViewMode.ts.
	const isSingleApplicantInline = $derived(rendersAsSingleApplicant(formState.applicants));
	const modalCrossWarnings = $derived.by(() => {
		if (!showModal && !isSingleApplicantInline) return [];
		const ap = formState.applicants[selectedIndex] as Record<string, any>;
		if (!ap) return [];
		// Pass the FULL applicant array so cross-applicant checks (e.g. the
		// NBFC single-applicant warning, no_primary_borrower) evaluate against
		// the real applicant count. Previously we passed [ap] alone, which
		// made cross-applicant checks see length=1 and fire incorrectly even
		// when 2+ applicants existed. Filter the result back down to either
		// (a) warnings about the currently-edited applicant or (b) cross-
		// applicant warnings (applicantIndex = -1) which should always show.
		// Detected 2026-05-05.
		const allApplicants = formState.applicants as Record<string, any>[];
		const result = runCrossFieldValidation(
			allApplicants,
			formState.applicationData as Record<string, any>
		);
		const scoped = result.warnings.filter(
			(w) => w.applicantIndex === selectedIndex || w.applicantIndex === -1
		);
		if (scoped.length === 0) return [];

		// Map: which warning categories are relevant to which tab
		const TAB_WARNING_MAP: Record<string, Set<string>> = {
			profile: new Set([
				'completion_stale',
				'education_profession_mismatch',
				'relationship_invalid',
				'premises_team_mismatch',
				'premises_category_mismatch'
			]),
			income_profiles: new Set(['income_profile_incompatible', 'nri_income_conflict']),
			income_details: new Set(['income_profile_incompatible', 'nri_income_conflict']),
			credit: new Set(['credit_obligation_mismatch']),
			obligations: new Set([
				'borrower_zero_income',
				'no_income_obligations',
				'obligations_exceed_income',
				'emi_spouse_no_spouse',
				'no_primary_borrower'
			])
		};

		// On the last tab ("done"), show ALL warnings as final gate
		const relevantCategories = TAB_WARNING_MAP[modalActiveTab];
		if (!relevantCategories) {
			// Unknown tab (e.g. "done") — show all warnings so user can't dismiss them
			return scoped;
		}

		return scoped.filter((w) => relevantCategories.has(w.category));
	});
	let selectedApplicant: any = $state(null);
	let selectedIndex: number = $state(0);
	// GPA is now a separate wizard step — no longer embedded here
	let modalActiveTab = $state('profile');

	// ── Editing state for income entries ─────────────────────────
	let editingEntry = $state<IncomeSourceEntry | null>(null);

	// ── Linked entry detection (for same-company field locking) ──
	let isEditingLinkedEntry = $derived(!!editingEntry?.linkedEntityKey);

	/** Find the source applicant name for a linked entry */
	let linkedSourceName = $derived.by(() => {
		if (!editingEntry?.linkedEntityKey) return '';
		// Search all other applicants for an entry with the same linkedEntityKey
		for (let i = 0; i < formState.applicants.length; i++) {
			if (i === selectedIndex) continue;
			const entries = (formState.applicants[i]?.incomeEntries ?? []) as IncomeSourceEntry[];
			const match = entries.find((e) => e.linkedEntityKey === editingEntry?.linkedEntityKey);
			if (match) {
				return (formState.applicants[i].fullName as string) || `Applicant ${i + 1}`;
			}
		}
		return '';
	});

	// ── Cross-applicant validation for linked entries (stake %, OPC) ──
	let linkedEntryValidation = $derived.by(() => {
		if (!editingEntry?.linkedEntityKey) return null;
		return validateLinkedEntries(
			editingEntry.linkedEntityKey,
			formState.applicants as Array<Record<string, unknown>>
		);
	});

	// Other applicants' total shareholding (for real-time preview while editing)
	let linkedOtherShareholding = $derived.by(() => {
		if (!editingEntry?.linkedEntityKey) return 0;
		const holders = getLinkedShareholdings(
			editingEntry.linkedEntityKey,
			formState.applicants as Array<Record<string, unknown>>
		);
		return holders
			.filter((h) => h.entryId !== editingEntry?.id)
			.reduce((sum, h) => sum + h.shareholding, 0);
	});

	// ── Pending obligation state (for Done button auto-save) ────
	let hasPendingValidObligation = $state(false);
	let inlineIncomeTabRef: any = $state(null);
	let modalIncomeTabRef: any = $state(null);

	function handlePendingValidChange(hasPending: boolean) {
		hasPendingValidObligation = hasPending;
	}

	/** Check if all tabs except obligations are complete */
	function allTabsCompleteExceptObligations(completion: Record<string, boolean>): boolean {
		return Object.entries(completion).every(([key, val]) => key === 'obligations_details' || val);
	}

	/** Done click handler — auto-saves pending obligation before closing */
	async function handleDoneClick() {
		if (hasPendingValidObligation) {
			modalIncomeTabRef?.commitPendingObligation?.();
			await tick(); // let Svelte process the obligation data update
		}
		closeModal();
	}

	/** Done click for single-applicant inline view */
	async function handleInlineDoneClick() {
		if (hasPendingValidObligation) {
			inlineIncomeTabRef?.commitPendingObligation?.();
			await tick();
		}
		closeModal();
	}

	// ── Derived: current applicant data ──────────────────────────
	let currentApplicant = $derived(formState.applicants[selectedIndex] ?? {});

	// Firm-name combobox options — parent Partnership/LLP firm (if any) +
	// sibling-declared firms + own prior entries. Threaded through the
	// inline IncomeTabContent and the IncomeModalContent prop chain.
	// See docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §3.
	let firmNameOptions = $derived(
		assembleFirmNameOptions(
			formState.applicants as Array<Record<string, unknown>>,
			(currentApplicant as { id?: string })?.id
		)
	);

	// ── Derived: classification banner ──────────────────────────
	let currentClassification = $derived((currentApplicant?.applicantClassification as string) ?? '');
	let isGuarantorFinancial = $derived(
		currentClassification === 'guarantor_financial' ||
			currentClassification === 'non_applicant_full_financial'
	);

	let isNonFinancialRole = $derived(
		currentClassification === 'co_applicant_non_financial' ||
			currentClassification === 'non_applicant_cibil_only' ||
			currentClassification === 'guarantor_non_financial'
	);

	// ── Derived: selected profiles from applicant data ───────────
	let selectedProfiles = $derived<IncomeProfileType[]>(
		(currentApplicant?.selectedIncomeProfiles as IncomeProfileType[]) ?? []
	);

	// ── Derived: income entries from applicant data ──────────────
	// Defensive filter: only show entries whose profileType is in selectedProfiles.
	// Prevents stale entries from appearing after a profile is deselected.
	let incomeEntries = $derived<IncomeSourceEntry[]>(
		((currentApplicant?.incomeEntries as IncomeSourceEntry[]) ?? []).filter((e) =>
			selectedProfiles.includes(e.profileType)
		)
	);

	// ── Derived: applicant ID for structured store ──────────────
	let applicantId = $derived<string>(currentApplicant?.id ?? '');

	// ── Restore prompt state ────────────────────────────────────
	let restorePromptProfiles = $state<IncomeProfileType[]>([]);

	// ── Derived: answers context for showWhen evaluation ─────────
	// Includes `age` derived from `age` for profile card showWhen conditions.
	let answersContext = $derived.by(() => {
		const linkedIds = (currentApplicant?.linkedCompanyIds as string[]) ?? [];
		return {
			...(currentApplicant ?? {}),
			...(formState.applicationData ?? {}),
			isNRI: currentApplicant?.isNRI ?? 'No',
			age: Number(currentApplicant?.age) || 0,
			// For secured loans: real company link count — NRI directors of Indian companies
			// can have director_company income profile (the company is Indian, director is abroad).
			// For unsecured loans: force 0 — NRI restriction applies unconditionally.
			__linkedCompanyCount: isSecuredLoan ? linkedIds.length : 0
		};
	});

	// ── Auto-clear profiles whose showWhen is no longer satisfied ──
	// e.g. user selects Professional Practice then changes education to 12th Pass
	$effect(() => {
		if (!currentApplicant || selectedProfiles.length === 0) return;
		const staleProfiles = selectedProfiles.filter((profileType) => {
			const card = INCOME_PROFILE_CARDS.find((c) => c.type === profileType);
			if (!card?.showWhen) return false;
			return !shouldShow(card.showWhen as any, answersContext);
		});
		if (staleProfiles.length === 0) return;
		const kept = selectedProfiles.filter((p) => !staleProfiles.includes(p));
		const idx = formState.applicants.findIndex((a: any) => a.id === currentApplicant.id);
		if (idx >= 0) {
			formState.updateApplicant(idx, { selectedIncomeProfiles: kept });
		}
	});

	// ── Derived: noIncomeReason from current applicant ────────────
	let noIncomeReason = $derived<string>((currentApplicant?.noIncomeReason as string) ?? '');

	// ── Derived: income context for emiPaidByRequired computation ──
	let isNonEarner = $derived(
		selectedProfiles.length === 1 && selectedProfiles[0] === 'no_current_income'
	);

	let applicantMonthlyIncome = $derived.by(() => {
		if (isNonEarner) return 0;
		let total = 0;
		for (const entry of incomeEntries) {
			const inc = (entry as any).income ?? {};
			total +=
				inc.grossMonthlySalary ??
				inc.netMonthlySalary ??
				inc.monthlyPensionAmount ??
				inc.monthlyRentAmount ??
				inc.averageMonthlyFreelanceIncome ??
				0;
		}
		return total;
	});

	let totalRunningEMI = $derived.by(() => {
		const obls = (currentApplicant?.obligations ?? []) as any[];
		return obls
			.filter((o: any) => o.selectedToClose === 'Keep running')
			.reduce(
				(sum: number, o: any) =>
					sum + (parseFloat(o.emi || '0') || parseFloat(o.totalLimit || '0') * 0.05),
				0
			);
	});

	let emiPaidByRequired = $derived(
		isNonEarner || (totalRunningEMI > 0 && totalRunningEMI > applicantMonthlyIncome)
	);

	// ═══════════════════════════════════════════════════════════════
	// SECTION COMPLETION LOGIC (New Tab Structure)
	// ═══════════════════════════════════════════════════════════════

	// ── Loan-type-aware completion options ─────────────────────────
	// Unsecured loans hide the "residence vs property" question, so
	// requireResidencePattern must be false to avoid blocking Next.
	const SECURED_LOANS = [
		'Home Loan',
		'Loan Against Property',
		'Plot Loan',
		'Plot & Construction Loan'
	];
	// Use applicationData.loanName (canonical) with loanData fallback — see lockedProfiles
	// derivation below for why loanData alone is unreliable on first-load.
	const isSecuredLoan = $derived(
		SECURED_LOANS.includes(
			((formState.applicationData as any)?.loanName as string) ??
				(formState.loanData as Record<string, any>)?.loanName ??
				''
		)
	);

	// ── Derived: locked profiles (auto-set, cannot be removed) ──────
	let lockedProfiles = $derived.by(() => {
		// For secured loans: lock auto-created profiles + role-based mandatory profiles
		if (isSecuredLoan) {
			const autoTypes = ((currentApplicant?.incomeEntries ?? []) as IncomeSourceEntry[])
				.filter((e) => {
					if (!e.autoCreated) return false;
					// Don't lock orphaned profiles — company was deleted, user is standalone now
					if ((e as any).orphaned) return false;
					// Don't lock if source company no longer exists
					if (e.sourceCompanyId) {
						return formState.applicants.some((a: any) => a.id === e.sourceCompanyId);
					}
					return true;
				})
				.map((e) => e.profileType);
			// Mandatory profiles by applicant type — primary income source is always locked.
			// User can add salaried, rental, etc. alongside but cannot remove the primary.
			const mandatoryTypes: IncomeProfileType[] = [];
			if (currentApplicant?.applicantSubType === 'sole_proprietor') {
				mandatoryTypes.push('business_proprietorship');
			}
			const linkedIds = (currentApplicant?.linkedCompanyIds as string[]) ?? [];
			if (linkedIds.length > 0) {
				// Map company type → mandatory income profile
				// Every company member's primary income comes from their company.
				for (const companyId of linkedIds) {
					const company = formState.applicants.find((a: any) => a.id === companyId);
					if (!company) continue;
					const ct = company.companyType as string;
					if (ct === 'Partnership Firm' || ct === 'LLP') {
						// Partners earn partnership income
						mandatoryTypes.push('business_partnership');
					} else {
						// Pvt Ltd, OPC, Public Ltd — directors earn director income
						mandatoryTypes.push('director_company');
					}
				}
			}
			return [...new Set([...autoTypes, ...mandatoryTypes])] as IncomeProfileType[];
		}
		const appData = formState.applicationData as Record<string, unknown>;
		// Canonical loanName comes from applicationData (set immediately when the
		// user picks the loan type). `formState.loanData.loanName` is a secondary
		// mirror that lags by a tick on first-load — relying on it silently
		// defaulted loanCategory to 'personal' for fresh Business/Professional
		// applicants, which meant `getAutoSelectedProfiles` returned [] and the
		// mandatory business/professional profiles were never locked. This was
		// the recurring regression the user has flagged twice.
		const loanName = (appData?.loanName as string) ?? (formState.loanData as any)?.loanName ?? '';
		let loanCategory: 'personal' | 'business' | 'professional' = 'personal';
		if (loanName === 'Business Loan') loanCategory = 'business';
		else if (loanName === 'Professional Loan') loanCategory = 'professional';
		const applicantType =
			(currentApplicant?.applicantType as 'Individual' | 'Company') ?? 'Individual';
		const businessEntityType = (appData?.businessEntityType as string) ?? '';
		// Combine unsecured auto-select + auto-created profile types from director linking
		const unsecuredLocked = getAutoSelectedProfiles({
			loanCategory,
			applicantType,
			businessEntityType
		});
		const autoTypes = ((currentApplicant?.incomeEntries ?? []) as IncomeSourceEntry[])
			.filter((e) => {
				if (!e.autoCreated) return false;
				// Don't lock orphaned profiles — company was deleted, user is standalone now
				if ((e as any).orphaned) return false;
				// Don't lock if source company no longer exists
				if (e.sourceCompanyId) {
					return formState.applicants.some((a: any) => a.id === e.sourceCompanyId);
				}
				return true;
			})
			.map((e) => e.profileType);

		// Same company-linked mandatory profiles for unsecured loans too —
		// every company member's primary income comes from their company
		const unsecuredLinkedIds = (currentApplicant?.linkedCompanyIds as string[]) ?? [];
		const companyMandatory: IncomeProfileType[] = [];
		for (const companyId of unsecuredLinkedIds) {
			const company = formState.applicants.find((a: any) => a.id === companyId);
			if (!company) continue;
			const ct = company.companyType as string;
			if (ct === 'Partnership Firm' || ct === 'LLP') {
				companyMandatory.push('business_partnership');
			} else {
				companyMandatory.push('director_company');
			}
		}

		// Applicant-subtype-based mandatory profiles (parity with secured branch).
		// These read from the APPLICANT record itself rather than from
		// applicationData.businessEntityType, which can be empty/stale at the
		// moment lockedProfiles evaluates — causing getAutoSelectedProfiles to
		// return the wrong default ('director_company' instead of
		// 'business_proprietorship') and leaving the actual auto-selected
		// profile UN-locked. User reported 2026-05-26 (BL Sole Prop screenshot:
		// "Business Owner" auto-selected but DSA could still flip to Salaried).
		const subtypeMandatory: IncomeProfileType[] = [];
		if (currentApplicant?.applicantSubType === 'sole_proprietor') {
			subtypeMandatory.push('business_proprietorship');
		}

		return [
			...new Set([...unsecuredLocked, ...autoTypes, ...companyMandatory, ...subtypeMandatory])
		] as IncomeProfileType[];
	});

	// ── Auto-add locked profiles to applicant data ─────────────────
	// Ensures mandatory profiles (e.g. business_proprietorship for Sole Proprietors)
	// are always in selectedIncomeProfiles — independent of which tab is active.
	$effect(() => {
		if (lockedProfiles.length === 0) return;
		const current = (currentApplicant?.selectedIncomeProfiles as IncomeProfileType[]) ?? [];
		const missing = lockedProfiles.filter((p) => !current.includes(p));
		if (missing.length > 0) {
			const withoutExclusive = current.filter((p) => p !== 'no_current_income');
			const merged = [...withoutExclusive, ...missing];
			const newList = [...formState.applicants];
			newList[selectedIndex] = {
				...newList[selectedIndex],
				selectedIncomeProfiles: merged,
				employmentType: deriveLegacyEmploymentType(merged)
			};
			formState.replaceApplicants(newList);
		}
	});

	// ── Family control map for all loan types ─────────────────────
	// Reactively derives family cluster data from applicants + relationships.
	// Used to upgrade family-member directors to 'borrower' (full financials)
	// in both secured and unsecured loans.
	let familyControlMap = $derived.by(() => {
		const relationships = get(allRelationships);
		if (!relationships.length) return undefined;
		return deriveAllCompanyFamilyControl(formState.applicants, relationships);
	});

	// Derive role for the currently selected applicant
	// Both secured and unsecured: family-aware director role derivation.
	// Partnership/LLP/OPC: all directors → borrower (company is on the loan,
	//   so all partners need full assessment regardless of individual onProperty/onEMI).
	// Pvt Ltd (secured): base role from onProperty/onEMI, then family override
	//   (family directors with both No get upgraded from cibil_only → borrower).
	// Unsecured loans: role from loanRole + family cluster logic.
	function getApplicantRole(applicant: any): ApplicantDerivedRole | undefined {
		if (!applicant) return undefined;
		if (isSecuredLoan) {
			// Partnership/LLP/OPC: company is on the loan → all directors need full assessment.
			// Role is 'borrower' regardless of individual onProperty/onEMI answers.
			if (applicant.linkedCompanyId) {
				const parentCompany = (formState.applicants as any[]).find(
					(a) => a.id === applicant.linkedCompanyId
				);
				if (
					parentCompany &&
					FULL_PROFILE_COMPANY_TYPES.includes(parentCompany.companyType as string)
				) {
					return 'borrower';
				}
			}
			const baseRole = deriveApplicantRole(
				applicant.applicantType ?? 'Individual',
				applicant.onProperty as boolean | undefined,
				applicant.onEMI as boolean | undefined,
				applicant.linkedCompanyId as string | undefined
			);
			// Family override: linked Pvt Ltd director with cibil_only role in a family-owned
			// company gets upgraded to borrower (full financials) — lenders require
			// full assessment of family members even when not on property/EMI.
			if (baseRole === 'cibil_only' && applicant.linkedCompanyId && familyControlMap) {
				const familyResult = familyControlMap.get(applicant.linkedCompanyId as string);
				if (
					familyResult &&
					(familyResult.familyDominance === 'HIGH' || familyResult.familyDominance === 'MEDIUM')
				) {
					const applicantId = applicant.id as string;
					if (familyResult.familyClusterIds.includes(applicantId)) {
						return 'borrower';
					}
				}
			}
			return baseRole;
		}
		// Unsecured: family-aware role derivation
		return deriveUnsecuredDirectorRoleWithFamily(
			applicant,
			formState.applicants as Record<string, unknown>[],
			familyControlMap ?? undefined
		);
	}

	// Check if director is skippable (minor non-family, >4 directors, low stake)
	// Applies to both secured and unsecured loans for Pvt Ltd companies.
	function isApplicantSkippable(applicant: any): boolean {
		if (!applicant) return false;
		return isDirectorSkippable(
			applicant,
			formState.applicants as Record<string, unknown>[],
			familyControlMap ?? undefined
		);
	}

	/** Resolve classification for any applicant — handles existing cases without stored classification */
	const currentLoanName = $derived(
		((formState.applicationData as any)?.loanName as string) ??
			(formState.loanData as Record<string, any>)?.loanName ??
			''
	);
	const isProfessionalLoan = $derived(currentLoanName === 'Professional Loan');

	function resolveClassification(applicant: any): string | undefined {
		// Use stored classification if available
		if (applicant?.applicantClassification) return applicant.applicantClassification as string;
		// Professional Loan: directors linked to a company are always non-financial
		if (
			isProfessionalLoan &&
			applicant?.applicantType === 'Individual' &&
			applicant?.linkedCompanyId
		) {
			return 'co_applicant_non_financial';
		}
		return undefined;
	}

	/** Loan variant string (e.g. "Debt Consolidation"). Read off applicationData;
	 *  surfaced here so completion options can flag DC routes case-wide. */
	const currentLoanVariant = $derived(
		((formState.applicationData as any)?.loanType as string) ?? ''
	);

	/** DC routes only: does ANY applicant in the case have a "Close by this
	 *  new loan" obligation? Lets a debt-free co-applicant clear the obligations
	 *  tab without inventing fake debt (the DC requirement is at case level). */
	const caseHasDcClosure = $derived.by(() => {
		const isDc = ['Debt Consolidation', 'Debt Consolidation with Extra Funds'].some((v) =>
			currentLoanVariant.includes(v)
		);
		if (!isDc) return false;
		return (formState.applicants as any[]).some((a) => {
			const obs = (a?.obligations ?? []) as Array<Record<string, unknown>>;
			return obs.some((o) => o.selectedToClose === 'Will be closed by Top-up amount');
		});
	});

	/** Build completion options for any applicant — always includes classification */
	function getCompletionOptionsFor(applicant: any): CompletionOptions {
		return {
			requireResidencePattern: isSecuredLoan,
			derivedRole: getApplicantRole(applicant),
			skippable: isApplicantSkippable(applicant),
			applicantClassification: resolveClassification(applicant),
			loanScope: currentLoanVariant,
			caseHasDcClosure
		};
	}

	let completionOptions = $derived<CompletionOptions>(
		getCompletionOptionsFor(formState.applicants[selectedIndex])
	);

	// ── Backfill classification for existing Professional Loan directors ──
	// Handles cases created before the classification fix was deployed.
	$effect(() => {
		if (!isProfessionalLoan) return;
		const updates: { index: number; classification: string }[] = [];
		for (let i = 0; i < formState.applicants.length; i++) {
			const a = formState.applicants[i];
			if (a.applicantType !== 'Individual') continue;
			if (a.applicantClassification) continue;
			if (!(a as any).linkedCompanyId) continue;
			updates.push({ index: i, classification: 'co_applicant_non_financial' });
		}
		if (updates.length > 0) {
			const newList = [...formState.applicants];
			for (const u of updates) {
				newList[u.index] = { ...newList[u.index], applicantClassification: u.classification };
			}
			formState.replaceApplicants(newList);
		}
	});

	// ── Cross-applicant obligation dedup detection ────────────────
	let obligationDupWarnings = $derived<ObligationDupWarning[]>(
		detectObligationDuplicates(formState.applicants as Array<Record<string, any>>)
	);

	// ── Section Completion ────────────────────────────────────────
	// Delegates to shared utility with loan-type-aware options.
	function computeNewSectionCompletion(applicant: any) {
		return computeSectionCompletion(applicant, completionOptions);
	}

	let modalSectionCompletion = $derived.by(() => {
		return computeNewSectionCompletion(formState.applicants[selectedIndex]);
	});

	// ── Tab Definitions & Accessibility ───────────────────────────
	// Delegates to shared utilities from incomeTabState.ts.
	// getModalTabs uses the component-local modalSectionCompletion
	// derived value as the completion source.
	function getModalTabs(applicant: any) {
		return buildIncomeTabs(
			applicant,
			modalSectionCompletion,
			getApplicantRole(applicant),
			resolveClassification(applicant)
		);
	}

	// Reactive tab list — updates when classification or completion changes.
	// Ensures tabs expand (CIBIL only → full financial) when classification
	// is elevated by multi-company union or flag changes.
	let reactiveModalTabs = $derived(getModalTabs(formState.applicants[selectedIndex]));

	const isTabAccessible = checkTabAccessible;

	/**
	 * Smart scroll after tab change:
	 * - Empty tab → scroll to top
	 * - Partially filled → scroll to first unanswered required field
	 * - Fully filled → scroll to bottom so Next button is visible
	 */
	async function smartScrollAfterTabChange(tabId: string) {
		const applicant = formState.applicants[selectedIndex];
		if (!applicant) return;

		const completion =
			applicant.applicantType === 'Company'
				? computeCompanyCompletion(applicant)
				: computeSectionCompletion(applicant, getCompletionOptionsFor(applicant));

		const isTabComplete = completion[tabId] ?? false;

		// Wait for Svelte render + DOM settle (tick → rAF → rAF → small delay)
		await tick();
		await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
		await new Promise<void>((r) => setTimeout(r, 80));

		const modalEl = document.querySelector('[data-modal-scroll]') as HTMLElement | null;
		if (!modalEl) return;

		if (isTabComplete) {
			modalEl.scrollTop = modalEl.scrollHeight;
			return;
		}

		// Look for first unanswered field (input with placeholder still showing)
		const emptyField = modalEl.querySelector(
			'input:placeholder-shown:not([disabled]), .field-input-error'
		) as HTMLElement | null;

		if (emptyField) {
			emptyField.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			modalEl.scrollTop = 0;
		}
	}

	function handleTabChange(id: string) {
		const tabs = reactiveModalTabs;
		if (!isTabAccessible(id, tabs)) return;
		modalActiveTab = id;
		smartScrollAfterTabChange(id);
	}

	// ── Tab navigation helpers (Previous / Next buttons) ─────────
	function getCurrentTabIndex(): number {
		const tabs = reactiveModalTabs;
		return tabs.findIndex((t) => t.id === modalActiveTab);
	}

	function canGoToPreviousTab(): boolean {
		return getCurrentTabIndex() > 0;
	}

	function canGoToNextTab(): boolean {
		const tabs = reactiveModalTabs;
		const currentIdx = getCurrentTabIndex();
		if (currentIdx >= tabs.length - 1) return false;
		// Next tab must be accessible (current tab must be complete)
		if (!isTabAccessible(tabs[currentIdx + 1].id, tabs)) return false;
		// Block navigation only when BLOCKING inconsistencies exist.
		// Advisory warnings (keepable: true, e.g. turnover_mismatch) are informational —
		// DSA can proceed. Without this check, keepable warnings created dead-ends.
		if (modalCrossWarnings.some((w) => !w.keepable)) return false;
		return true;
	}

	function goToPreviousTab() {
		const tabs = reactiveModalTabs;
		const currentIdx = getCurrentTabIndex();
		if (currentIdx > 0) {
			modalActiveTab = tabs[currentIdx - 1].id;
			smartScrollAfterTabChange(tabs[currentIdx - 1].id);
		}
	}

	function goToNextTab() {
		const tabs = reactiveModalTabs;
		const currentIdx = getCurrentTabIndex();
		if (currentIdx < tabs.length - 1 && isTabAccessible(tabs[currentIdx + 1].id, tabs)) {
			modalActiveTab = tabs[currentIdx + 1].id;
			smartScrollAfterTabChange(tabs[currentIdx + 1].id);
		}
	}

	// ═══════════════════════════════════════════════════════════════
	// TAB SAFETY — Kick user off locked tabs when data changes
	// ═══════════════════════════════════════════════════════════════

	let lastTabCompletionSnapshot = '';
	$effect(() => {
		const sectionCompletion = modalSectionCompletion;
		const _forceReactivity = JSON.stringify(sectionCompletion);

		const tabs = reactiveModalTabs;
		const snapshot = tabs.map((t) => `${t.id}:${t.complete}`).join(',');
		if (snapshot === lastTabCompletionSnapshot) return;
		lastTabCompletionSnapshot = snapshot;

		// If user is on a locked tab, kick them to the first incomplete tab
		if (!isTabAccessible(modalActiveTab, tabs)) {
			for (let i = 0; i < tabs.length; i++) {
				if (!tabs[i].complete) {
					modalActiveTab = tabs[i].id;
					return;
				}
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// MODAL OPEN/CLOSE
	// ═══════════════════════════════════════════════════════════════

	/** Individual tab order for mapping startTab index → tab ID */
	const INDIVIDUAL_TAB_ORDER = ['profile', 'income_profiles', 'credit', 'obligations'];
	/** Company tab IDs (from Company.svelte 5-tab wizard) */
	const COMPANY_TAB_ORDER = ['identity', 'character', 'income', 'credit', 'obligations'];

	function openModal(applicant: any, index: number, startTab?: number) {
		selectedApplicant = applicant;
		selectedIndex = index;
		// Resolve startTab index → tab ID
		if (startTab !== undefined && startTab > 0) {
			const order =
				applicant.applicantType === 'Company' ? COMPANY_TAB_ORDER : INDIVIDUAL_TAB_ORDER;
			modalActiveTab = order[Math.min(startTab, order.length - 1)] ?? 'profile';
		} else {
			modalActiveTab = 'profile';
		}
		lastTabCompletionSnapshot = '';
		editingEntry = null;
		// Structured store: ensure applicant data is initialized
		applicantDataStore.getOrCreate(applicant.id ?? '');
		showModal = true;
	}

	export function closeModal() {
		// Recompute __completion from actual tab data before closing.
		// Always call replaceApplicants to ensure reactive downstream ($derived)
		// picks up the change — Company.svelte uses untracked proxy mutation
		// which doesn't trigger $derived re-evaluation in parent pages.
		const applicant = formState.applicants[selectedIndex];
		if (applicant) {
			let complete: boolean;
			if (applicant.applicantType === 'Company') {
				complete = areAllCompanyTabsComplete(applicant);
			} else {
				const completion = computeSectionCompletion(applicant, getCompletionOptionsFor(applicant));
				complete = areAllTabsComplete(applicant, completion);
			}
			const newList = [...formState.applicants];
			newList[selectedIndex] = {
				...newList[selectedIndex],
				companyCompletion: complete,
				__completion: complete
			};
			formState.replaceApplicants(newList);
		}

		showModal = false;
		lastTabCompletionSnapshot = '';
		editingEntry = null;
		// incomeWarnings is now $derived — auto-recomputes when applicants change
	}

	// ═══════════════════════════════════════════════════════════════
	// RESET / REMOVE APPLICANT (with recovery backup)
	// ═══════════════════════════════════════════════════════════════

	let confirmAction = $state<{
		type: 'reset' | 'remove';
		applicant: any;
		index: number;
	} | null>(null);

	/** Save a full applicant snapshot to recovery store before destructive ops */
	function saveToRecovery(applicant: any) {
		const isCompany = applicant.applicantType === 'Company';
		const displayName = isCompany
			? (applicant.companyName ?? 'Company')
			: (applicant.fullName ?? 'Applicant');

		const entry = {
			uuid: applicant.id ?? uuidv4(),
			applicantType: applicant.applicantType ?? 'Individual',
			data: { ...applicant },
			deletedAt: Date.now(),
			displayName,
			matchSignature: buildMatchSignature(applicant) ?? '',
			// Individual fields
			fullName: applicant.fullName,
			gender: applicant.gender,
			maritalStatus: applicant.maritalStatus,
			age: applicant.age,
			employmentType: applicant.employmentType,
			// Company fields
			companyName: applicant.companyName,
			companyType: applicant.companyType,
			businessType: applicant.businessType
		};

		applicantRecoveryStore.update((list: any[]) => [...list, entry]);
	}

	// Basic keys to keep when resetting (clearing profile/income/credit data)
	/** Keys to CLEAR on reset — profile, credit, obligation tab data.
	 *  Preserved: identity, structural, linking, roles.
	 *  NOTE: selectedIncomeProfiles & incomeEntries handled separately
	 *  (auto-created entries are kept, user-added are cleared). */
	const RESET_CLEAR_KEYS = new Set([
		// Profile tab (education handled separately — may be auto-set)
		'religion',
		'casteCategory',
		'ownedResidentialProperties',
		'hasDisability',
		'applicantResidencePattern',
		'residenceStateName',
		'residenceCityName',
		'deepProfile',
		// Income (profiles & entries handled separately below)
		'employmentType',
		'noIncomeReason',
		// Credit score
		'creditScore',
		'whyPrimaryLowCredit',
		'creditFactorsAnswered',
		'creditFactorAnswers',
		'creditFactorReasons',
		'creditHistoryStatus',
		'emiBounceCount',
		'defaultSettlementStatus',
		'recentEnquiryCount',
		'bounceReason',
		'defaultReason',
		'enquiryReason',
		// Obligations
		'ObligationsRunning',
		'obligations',
		'tableLoanEntries',
		'tableLimitEntries',
		// Company income (4 mediums)
		'companyIncome',
		// Completion flags (will be recomputed)
		'__completion',
		'companyCompletion'
	]);

	function handleResetApplicant(applicant: any, index: number) {
		confirmAction = { type: 'reset', applicant, index };
	}

	function handleRemoveApplicant(applicant: any, index: number) {
		confirmAction = { type: 'remove', applicant, index };
	}

	function executeConfirmedAction() {
		if (!confirmAction) return;
		const { type, applicant, index } = confirmAction;

		// 1. Save full snapshot to recovery store
		saveToRecovery(applicant);

		if (type === 'reset') {
			// Keys handled separately (not blanket-cleared, not blanket-copied)
			const SPECIAL_KEYS = new Set(['selectedIncomeProfiles', 'incomeEntries', 'education']);

			// 2a. Copy everything except clear-keys and special-keys
			const resetApplicant: Record<string, any> = {};
			for (const key of Object.keys(applicant)) {
				if (!RESET_CLEAR_KEYS.has(key) && !SPECIAL_KEYS.has(key)) {
					resetApplicant[key] = applicant[key];
				}
			}

			// 2b. Keep auto-created income entries, clear user-added ones
			const allEntries = (applicant.incomeEntries ?? []) as any[];
			const autoEntries = allEntries.filter((e: any) => e.autoCreated);
			if (autoEntries.length > 0) {
				resetApplicant.incomeEntries = autoEntries;
				// Keep only profile keys that have auto-created entries
				const autoProfileKeys = new Set(autoEntries.map((e: any) => e.profileKey));
				const allProfiles = (applicant.selectedIncomeProfiles ?? []) as string[];
				resetApplicant.selectedIncomeProfiles = allProfiles.filter((p: string) =>
					autoProfileKeys.has(p)
				);
			}

			// 2c. Keep education if auto-set (e.g. professional loan, director-linked)
			if (applicant.education && applicant.linkedCompanyId) {
				resetApplicant.education = applicant.education;
			}

			// 2d. Compute actual completion from the reset data
			const isCompany = resetApplicant.applicantType === 'Company';
			if (isCompany) {
				resetApplicant.companyCompletion = areAllCompanyTabsComplete(resetApplicant);
				resetApplicant.__completion = resetApplicant.companyCompletion;
			} else {
				const completion = computeSectionCompletion(
					resetApplicant,
					getCompletionOptionsFor(resetApplicant)
				);
				resetApplicant.__completion = areAllTabsComplete(resetApplicant, completion);
			}

			// 3. Replace the applicant in formState
			const newList = [...formState.applicants];
			newList[index] = resetApplicant as any;
			formState.replaceApplicants(newList);

			// 4. Clear structured store data for this applicant
			if (applicant.id) {
				applicantDataStore.remove(applicant.id);
			}
		} else {
			// 2b. Remove applicant entirely
			// If removal brings count to 1, close modal and reset to inline view
			// BEFORE the reactive branch switch happens
			if (formState.applicants.length === 2) {
				showModal = false;
				selectedIndex = index === 0 ? 0 : 0; // remaining applicant will be at index 0
				modalActiveTab = 'profile';
				editingEntry = null;
			}

			if (applicant.id) {
				applicantDataStore.remove(applicant.id);
			}
			formState.removeApplicant(index);
		}

		confirmAction = null;
	}

	function cancelConfirmAction() {
		confirmAction = null;
	}

	// ═══════════════════════════════════════════════════════════════
	// DATA MUTATION HANDLERS
	// ═══════════════════════════════════════════════════════════════

	/** Update noIncomeReason */
	function handleNoIncomeReasonChange(reason: string) {
		const newList = [...formState.applicants];
		newList[selectedIndex] = { ...newList[selectedIndex], noIncomeReason: reason };
		formState.replaceApplicants(newList);
	}

	/** Update selected income profiles */
	function handleProfileSelectionChange(profiles: IncomeProfileType[]) {
		const newList = [...formState.applicants];
		const current = newList[selectedIndex];
		const prevProfiles = ((current as any).selectedIncomeProfiles ?? []) as IncomeProfileType[];

		// Filter out incomeEntries for deselected profile types so they don't
		// linger as orphans in formState (Pitfall #24).
		const existingEntries = ((current as any).incomeEntries ?? []) as IncomeSourceEntry[];
		let updatedEntries = existingEntries.filter((e: IncomeSourceEntry) =>
			profiles.includes(e.profileType)
		);

		// Structured store: soft-delete deselected entries, then auto-restore any
		// re-added profiles' previously-stashed entries.
		//
		// S104 (Issue 2, 2026-05-16): pre-S104 this code set `restorePromptProfiles`
		// and rendered a "Previously entered data found — Restore?" banner. In
		// practice the banner was missed (one-tap-away dismissal, or competing
		// with other modal banners), and users perceived deselect→reselect as
		// destructive. The deselect-reselect cycle is overwhelmingly an "oops"
		// correction, so we auto-restore silently. Explicit clear remains
		// available via per-entry delete on the income table.
		if (applicantId) {
			applicantDataStore.updateSelectedProfiles(applicantId, profiles);

			const addedProfiles = profiles.filter((p) => !prevProfiles.includes(p));
			for (const profile of addedProfiles) {
				if (
					applicantDataStore.hasRestorableEntries(applicantId, profile) &&
					!applicantDataStore.isRestoreDenied(applicantId, profile)
				) {
					applicantDataStore.restoreProfileEntries(applicantId, profile);
					const restored = applicantDataStore.getActiveEntriesForProfile(applicantId, profile);
					// De-dup by id in case an entry with the same id was added between
					// deselect and reselect (rare but possible).
					const existingIds = new Set(updatedEntries.map((e) => e.id));
					const toAdd = restored.filter((e) => !existingIds.has(e.id));
					if (toAdd.length > 0) {
						updatedEntries = [...updatedEntries, ...toAdd];
					}
				}
			}

			// Auto-restore replaces the prompt — clear any stale banner state.
			restorePromptProfiles = [];
		}

		newList[selectedIndex] = {
			...current,
			selectedIncomeProfiles: profiles,
			// Derive legacy employment type for backward compatibility
			employmentType: deriveLegacyEmploymentType(profiles),
			incomeEntries: updatedEntries
		};
		formState.replaceApplicants(newList);
	}

	// ── R4: Company financials evaluation after income save ─────

	/** Dismiss a company financials flag by entity name */
	function dismissCompanyFinancialsFlag(entityName: string) {
		dismissedFlags = new Set([...dismissedFlags, entityName.toLowerCase()]);
	}

	/**
	 * R4: Post-save hook for director/partner income entries.
	 * Company financials flags are now $derived from applicant data automatically.
	 * This function just shows the multi-company guidance note.
	 */
	function evaluatePostSaveCompanyNeed(entry: IncomeSourceEntry) {
		const profileType = entry.profileType;
		if (profileType !== 'director_company' && profileType !== 'business_partnership') {
			return;
		}
		// Show guidance note for multi-company awareness
		showMultiCompanyGuidance = true;
	}

	/** Add a new income source entry — intercepts for same-company detection */
	function handleAddEntry(entry: IncomeSourceEntry) {
		// Check for same-company match across other co-applicants
		if (LINKABLE_PROFILE_TYPES.has(entry.profileType) && !entry.linkedEntityKey) {
			const match = findSameCompanyMatch(
				entry.entityName,
				entry.profileType,
				selectedIndex,
				formState.applicants as Array<Record<string, unknown>>
			);
			if (match) {
				// Show confirmation — don't save yet
				sameCompanyPrompt = {
					pendingEntry: entry,
					isUpdate: false,
					sourceApplicantName: match.applicantName,
					sourceApplicantIndex: match.applicantIndex,
					sourceEntryId: match.entry.id,
					sourceSpecifics: { ...match.entry.specifics }
				};
				return;
			}
		}
		commitAddEntry(entry);
	}

	/** Actually save a new entry to formState (called after optional same-company check) */
	function commitAddEntry(entry: IncomeSourceEntry) {
		const newList = [...formState.applicants];
		const current = newList[selectedIndex];
		const entries = [...((current as any).incomeEntries ?? []), entry];
		newList[selectedIndex] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);
		// Structured store
		if (applicantId) {
			applicantDataStore.addIncomeEntry(applicantId, entry);
		}
		// R4: Evaluate company co-applicant need
		evaluatePostSaveCompanyNeed(entry);
	}

	/** Update an existing income source entry — intercepts for same-company detection */
	function handleUpdateEntry(entry: IncomeSourceEntry) {
		// Check for same-company match when entity name changed on an unlinked entry
		if (LINKABLE_PROFILE_TYPES.has(entry.profileType) && !entry.linkedEntityKey) {
			const match = findSameCompanyMatch(
				entry.entityName,
				entry.profileType,
				selectedIndex,
				formState.applicants as Array<Record<string, unknown>>
			);
			if (match) {
				sameCompanyPrompt = {
					pendingEntry: entry,
					isUpdate: true,
					sourceApplicantName: match.applicantName,
					sourceApplicantIndex: match.applicantIndex,
					sourceEntryId: match.entry.id,
					sourceSpecifics: { ...match.entry.specifics }
				};
				return;
			}
		}
		commitUpdateEntry(entry);
	}

	/** Actually update an entry in formState (called after optional same-company check) */
	function commitUpdateEntry(entry: IncomeSourceEntry) {
		const newList = [...formState.applicants];
		const current = newList[selectedIndex];
		const entries = ((current as any).incomeEntries ?? []).map((e: IncomeSourceEntry) =>
			e.id === entry.id ? entry : e
		);
		newList[selectedIndex] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);
		// Structured store
		if (applicantId) {
			applicantDataStore.updateIncomeEntry(applicantId, entry);
		}
		editingEntry = null;
		// R4: Re-evaluate company co-applicant need (user may have changed qualifying answers)
		evaluatePostSaveCompanyNeed(entry);
	}

	// ── Same-company confirmation handlers ──────────────────────────

	/** User confirms: Yes, this is the same company as the other applicant's entry */
	function confirmSameCompany() {
		if (!sameCompanyPrompt) return;
		const { pendingEntry, isUpdate, sourceApplicantIndex, sourceEntryId, sourceSpecifics } =
			sameCompanyPrompt;

		// Build the link key from entity name + profile type
		const linkedKey = buildLinkedEntityKey(pendingEntry.entityName, pendingEntry.profileType);

		// Copy company-level specifics from source entry into the new entry
		const companySpecifics = extractCompanySpecifics(sourceSpecifics);
		const syncedEntry: IncomeSourceEntry = {
			...pendingEntry,
			specifics: { ...pendingEntry.specifics, ...companySpecifics },
			linkedEntityKey: linkedKey
		};

		// Stamp the link key on the source entry too (so sync works bidirectionally)
		const stamped = stampLinkedKeyOnEntry(
			formState.applicants as Array<Record<string, unknown>>,
			sourceApplicantIndex,
			sourceEntryId,
			linkedKey
		);
		formState.replaceApplicants(stamped);

		// Now save the new/updated entry
		if (isUpdate) {
			commitUpdateEntry(syncedEntry);
		} else {
			commitAddEntry(syncedEntry);
		}

		sameCompanyPrompt = null;
	}

	/** User says: No, this is a different company with a similar name */
	function denySameCompany() {
		if (!sameCompanyPrompt) return;
		const { pendingEntry, isUpdate } = sameCompanyPrompt;

		// Save as-is without linking
		if (isUpdate) {
			commitUpdateEntry(pendingEntry);
		} else {
			commitAddEntry(pendingEntry);
		}

		sameCompanyPrompt = null;
	}

	/** Delete an income source entry */
	function handleDeleteEntry(entryId: string) {
		// Find entry before deletion (need profileType for structured store)
		const entryToDelete = (formState.applicants[selectedIndex]?.incomeEntries ?? []).find(
			(e: IncomeSourceEntry) => e.id === entryId
		);

		// Guard: cannot delete active auto-created entries (only orphaned ones are deletable)
		if (entryToDelete?.autoCreated && !entryToDelete?.orphaned) return;

		const newList = [...formState.applicants];
		const current = newList[selectedIndex];
		const entries = ((current as any).incomeEntries ?? []).filter(
			(e: IncomeSourceEntry) => e.id !== entryId
		);
		newList[selectedIndex] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);

		// Structured store
		if (applicantId && entryToDelete) {
			applicantDataStore.deleteIncomeEntry(applicantId, entryToDelete.profileType, entryId);
		}
	}

	/** Start editing an entry */
	function handleEditEntry(entry: IncomeSourceEntry) {
		editingEntry = entry;
		// Ensure we're on the income details tab
		if (modalActiveTab !== 'income_details') {
			modalActiveTab = 'income_details';
		}
	}

	/** Cancel editing */
	function handleCancelEdit() {
		editingEntry = null;
	}

	/** Restore soft-deleted entries for a profile type */
	function handleRestoreProfile(profileType: IncomeProfileType) {
		if (!applicantId) return;
		applicantDataStore.restoreProfileEntries(applicantId, profileType);

		// Sync restored entries to formState so UI re-renders them
		const restoredEntries = applicantDataStore.getActiveEntriesForProfile(applicantId, profileType);
		if (restoredEntries.length > 0) {
			const newList = [...formState.applicants];
			const current = newList[selectedIndex];
			const existingEntries = ((current as any).incomeEntries ?? []) as IncomeSourceEntry[];
			// Avoid duplicates: only add entries not already present by ID
			const existingIds = new Set(existingEntries.map((e: IncomeSourceEntry) => e.id));
			const toAdd = restoredEntries.filter((e: IncomeSourceEntry) => !existingIds.has(e.id));
			if (toAdd.length > 0) {
				newList[selectedIndex] = { ...current, incomeEntries: [...existingEntries, ...toAdd] };
				formState.replaceApplicants(newList);
			}
		}

		restorePromptProfiles = restorePromptProfiles.filter((p) => p !== profileType);
	}

	/** Deny restore — suppress prompt for this profile in current session */
	function handleDenyRestore(profileType: IncomeProfileType) {
		if (!applicantId) return;
		applicantDataStore.denyRestore(applicantId, profileType);
		restorePromptProfiles = restorePromptProfiles.filter((p) => p !== profileType);
	}

	/** Update credit score answers — map CreditScoreSection prop names to store field names */
	function handleCreditScoreChange(answers: Record<string, unknown>) {
		const newList = [...formState.applicants];
		{
			const mapped: Record<string, unknown> = {};
			if ('creditScore' in answers) mapped.creditScore = answers.creditScore;
			if ('whyLowCredit' in answers) mapped.whyPrimaryLowCredit = answers.whyLowCredit;
			if ('creditFactorsAnswered' in answers)
				mapped.creditFactorsAnswered = answers.creditFactorsAnswered;
			if ('creditFactorAnswers' in answers)
				mapped.creditFactorAnswers = answers.creditFactorAnswers;
			if ('creditFactorReasons' in answers)
				mapped.creditFactorReasons = answers.creditFactorReasons;
			// New graduated credit questions
			if ('creditHistoryStatus' in answers)
				mapped.creditHistoryStatus = answers.creditHistoryStatus;
			if ('emiBounceCount' in answers) mapped.emiBounceCount = answers.emiBounceCount;
			if ('defaultSettlementStatus' in answers)
				mapped.defaultSettlementStatus = answers.defaultSettlementStatus;
			if ('recentEnquiryCount' in answers) mapped.recentEnquiryCount = answers.recentEnquiryCount;
			if ('bounceReason' in answers) mapped.bounceReason = answers.bounceReason;
			if ('defaultReason' in answers) mapped.defaultReason = answers.defaultReason;
			if ('enquiryReason' in answers) mapped.enquiryReason = answers.enquiryReason;
			newList[selectedIndex] = { ...newList[selectedIndex], ...mapped };
			formState.replaceApplicants(newList);
		}

		// Structured store: map legacy field names to CreditScoreData interface
		if (applicantId) {
			const creditData: Record<string, unknown> = {};
			if ('creditScore' in answers) {
				const parsed = Number(answers.creditScore);
				if (!isNaN(parsed)) {
					creditData.cibilScore = parsed;
				}
			}
			if ('whyLowCredit' in answers) {
				creditData.lowScoreReasons = answers.whyLowCredit;
			}
			if ('creditFactorsAnswered' in answers) {
				creditData.hasRecentCibil = !!answers.creditFactorsAnswered;
			}
			applicantDataStore.updateCreditScore(applicantId, creditData);
		}
	}

	/** Update obligation data */
	function handleObligationUpdate(data: Record<string, any>) {
		// Capture obligations before update for diffing
		const oldObligations: any[] = [...(formState.applicants[selectedIndex]?.obligations ?? [])];
		const oldObligationsRunning = formState.applicants[selectedIndex]?.ObligationsRunning;

		{
			const newList = [...formState.applicants];
			newList[selectedIndex] = { ...newList[selectedIndex], ...data };
			formState.replaceApplicants(newList);
		}

		// Structured store: sync obligation changes
		if (applicantId) {
			const newObligations: any[] = data.obligations ?? oldObligations;
			const newObligationsRunning = data.ObligationsRunning ?? oldObligationsRunning;

			// Handle ObligationsRunning toggle
			if (oldObligationsRunning === 'Yes' && newObligationsRunning === 'No') {
				applicantDataStore.softDeleteAllObligations(applicantId);
				return;
			}
			if (oldObligationsRunning === 'No' && newObligationsRunning === 'Yes') {
				applicantDataStore.restoreAllObligations(applicantId);
				// Sync restored obligations back to formState so UI re-renders them
				// Cast via any: EnhancedLoanEntry is a structural superset of LoanEntry at runtime
				const restoredObligations = applicantDataStore.getActiveObligations(applicantId) as any[];
				if (restoredObligations.length > 0) {
					const syncList = [...formState.applicants];
					syncList[selectedIndex] = {
						...syncList[selectedIndex],
						obligations: restoredObligations
					};
					formState.replaceApplicants(syncList);
				}
				return;
			}

			// Detect added entries (new entries have IDs not in old list)
			const oldIds = new Set(oldObligations.map((o: any) => o.id));
			const newIds = new Set(newObligations.map((o: any) => o.id));

			for (const entry of newObligations) {
				if (entry.id && !oldIds.has(entry.id)) {
					applicantDataStore.addObligation(applicantId, entry);
				}
			}

			// Detect deleted entries (old IDs not in new list)
			for (let i = 0; i < oldObligations.length; i++) {
				const oldEntry = oldObligations[i];
				if (oldEntry.id && !newIds.has(oldEntry.id)) {
					// Find the index in the structured store's active array
					const activeObligations = applicantDataStore.getActiveObligations(applicantId);
					const storeIdx = activeObligations.findIndex((o: any) => o.id === oldEntry.id);
					if (storeIdx !== -1) {
						applicantDataStore.deleteObligation(applicantId, storeIdx);
					}
				}
			}

			// Detect updated entries (same ID, different data)
			for (const entry of newObligations) {
				if (entry.id && oldIds.has(entry.id)) {
					const oldEntry = oldObligations.find((o: any) => o.id === entry.id);
					if (oldEntry && JSON.stringify(oldEntry) !== JSON.stringify(entry)) {
						const activeObligations = applicantDataStore.getActiveObligations(applicantId);
						const storeIdx = activeObligations.findIndex((o: any) => o.id === entry.id);
						if (storeIdx !== -1) {
							applicantDataStore.updateObligation(applicantId, storeIdx, entry);
						}
					}
				}
			}
		}
	}

	// NRI GPA handling is now a separate wizard step (ApplicantFormSecured step 2)

	// ═══════════════════════════════════════════════════════════════
	// PROFILE COMPATIBILITY CLEANUP
	// ═══════════════════════════════════════════════════════════════
	// When NRI status, age, or education changes, re-evaluate each
	// selected income profile's showWhen condition. If a profile
	// would no longer be visible (e.g., business profile after switching
	// to NRI), remove it.
	// ═══════════════════════════════════════════════════════════════

	// Track per-applicant context snapshots to detect changes
	let lastProfileContextSnapshots: Record<string, string> = {};

	$effect(() => {
		const applicants = formState.applicants;
		if (!applicants?.length) return;

		// We read these fields to establish reactive tracking
		const snapshots: Record<string, string> = {};
		for (const a of applicants) {
			const ap = a as any;
			if (!ap?.id || ap.applicantType === 'Company') continue;
			snapshots[ap.id] = `${ap.isNRI}|${ap.age}|${ap.education}|${ap.onEMI}`;
		}

		// Check each applicant for incompatible profiles
		let anyChanged = false;
		const newList = [...applicants];

		for (let i = 0; i < newList.length; i++) {
			const ap = newList[i] as any;
			if (!ap?.id || ap.applicantType === 'Company') continue;

			const prevSnap = lastProfileContextSnapshots[ap.id];
			const curSnap = snapshots[ap.id];
			if (prevSnap === curSnap) continue; // No change for this applicant

			const profiles = (ap.selectedIncomeProfiles ?? []) as IncomeProfileType[];
			if (!profiles.length) continue;

			// Build context for showWhen evaluation
			// For unsecured loans, force __linkedCompanyCount to 0 so NRI directors
			// can't keep business/director profiles — unsecured lenders don't serve NRIs.
			// For secured loans, use real count — NRI directors of Indian companies are valid.
			const linkedIds = (ap.linkedCompanyIds as string[] | undefined) ?? [];
			const context = {
				isNRI: ap.isNRI ?? 'No',
				education: ap.education ?? '',
				age: Number(ap.age) || 0,
				onEMI: ap.onEMI ?? false,
				__linkedCompanyCount: isSecuredLoan ? linkedIds.length : 0
			};

			// Find incompatible profiles
			const incompatible: IncomeProfileType[] = [];
			for (const profileType of profiles) {
				const card = INCOME_PROFILE_CARDS.find((c) => c.type === profileType);
				if (!card?.showWhen) continue;
				if (!shouldShow(card.showWhen, context)) {
					incompatible.push(profileType);
				}
			}

			if (incompatible.length > 0) {
				const remaining = profiles.filter((p) => !incompatible.includes(p));
				const entries = ((ap.incomeEntries ?? []) as IncomeSourceEntry[]).filter(
					(e) => !incompatible.includes(e.profileType)
				);

				newList[i] = {
					...ap,
					selectedIncomeProfiles: remaining,
					employmentType: deriveLegacyEmploymentType(remaining),
					incomeEntries: entries
				};

				// Also clean structured store
				if (ap.id) {
					applicantDataStore.updateSelectedProfiles(ap.id, remaining);
				}

				anyChanged = true;
			}
		}

		// Update the snapshot tracker
		untrack(() => {
			lastProfileContextSnapshots = snapshots;
		});

		if (anyChanged) {
			untrack(() => {
				formState.replaceApplicants(newList);
			});
		}
	});

	// ── Same-company specifics sync across co-applicants ─────────
	// When applicant A changes company-level specifics on a linked entry,
	// propagate to all other entries with the same linkedEntityKey.
	$effect(() => {
		const applicants = formState.applicants as Array<Record<string, unknown>>;
		if (!applicants?.length) return;

		const synced = syncLinkedEntriesAcrossApplicants(applicants);
		if (synced !== applicants) {
			untrack(() => {
				formState.replaceApplicants(synced);
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// SINGLE APPLICANT HANDLING
	// ═══════════════════════════════════════════════════════════════

	let lastTellUsValue = '';
	$effect(() => {
		const tellUs = formState.applicationData?.tellUsWhoIsApplying;
		if (tellUs === lastTellUsValue) return;
		lastTellUsValue = tellUs as string;

		if (tellUs === 'Individual') {
			const current = formState.applicants ?? [];
			if (current.length > 1) {
				formState.replaceApplicants(current.slice(0, 1));
			} else if (current.length < 1) {
				formState.replaceApplicants([
					...current,
					...Array.from({ length: 1 - current.length }, () => ({
						id: uuidv4(),
						applicantType: 'Individual' as const,
						existingRole: 'Loan repayment and having name on the papers'
					}))
				] as any);
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// __COMPLETION FLAG SYNC (enables parent Next / Submit button)
	// ═══════════════════════════════════════════════════════════════

	$effect(() => {
		const store = formState.applicants;
		if (!store?.length) return;

		const updates: { index: number; complete: boolean }[] = [];

		for (let i = 0; i < store.length; i++) {
			const applicant = store[i];
			// Company applicants manage their own __completion via Company.svelte
			if (applicant.applicantType === 'Company') continue;
			// Per-applicant completion (includes classification, role, and skip status)
			const opts = getCompletionOptionsFor(applicant);
			const completion = computeSectionCompletion(applicant, opts);
			const allTabsComplete = areAllTabsComplete(applicant, completion);

			if (applicant.__completion !== allTabsComplete) {
				updates.push({ index: i, complete: allTabsComplete });
			}
		}

		if (updates.length > 0) {
			untrack(() => {
				const newList = [...formState.applicants];
				for (const { index, complete } of updates) {
					newList[index] = { ...newList[index], __completion: complete };
				}
				formState.replaceApplicants(newList);
			});
		}
	});

	function capitalizeName(name: string | null | undefined): string {
		if (!name) return '';
		return name
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// $effect(() => {
	// 	console.log("answersContext: ",answersContext)
	// })
</script>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SINGLE APPLICANT — Direct inline (no modal needed)                 -->
<!-- ═══════════════════════════════════════════════════════════════════ -->
{#if isSingleApplicantInline}
	{@const applicant = formState.applicants[0]}
	{#if applicant.applicantType === 'Individual'}
		<div class="flex flex-col gap-8 py-4">
			{#if isGuarantorFinancial}
				<div class="warning-message">
					<p class="alertText">
						Guarantor (Financial) — Income is assessed independently and NOT added to the
						eligibility pool. Lender verifies this person can cover the full EMI if the borrower
						defaults.
					</p>
				</div>
			{/if}
			<!-- Tab Navigation for single applicant -->
			<ModalTabs
				tabs={reactiveModalTabs}
				activeTab={modalActiveTab}
				onTabChange={handleTabChange}
			/>

			<!-- Tab Content -->
			<IncomeTabContent
				bind:this={inlineIncomeTabRef}
				activeTab={modalActiveTab}
				{selectedProfiles}
				{answersContext}
				{incomeEntries}
				{restorePromptProfiles}
				{editingEntry}
				bind:applicantData={formState.applicants[selectedIndex]}
				loanProduct={formState.applicationData?.loanType ?? 'Personal Loan'}
				allApplicants={formState.applicants}
				currentApplicantIndex={selectedIndex}
				{lockedProfiles}
				{noIncomeReason}
				onNoIncomeReasonChange={handleNoIncomeReasonChange}
				{emiPaidByRequired}
				professionalCategory={formState.applicants[selectedIndex]?.professionalCategory as string}
				isLinkedEntry={isEditingLinkedEntry}
				{linkedSourceName}
				linkedEntryWarnings={linkedEntryValidation}
				{linkedOtherShareholding}
				{firmNameOptions}
				onProfileSelectionChange={handleProfileSelectionChange}
				onAddEntry={handleAddEntry}
				onUpdateEntry={handleUpdateEntry}
				onCancelEdit={handleCancelEdit}
				onEditEntry={handleEditEntry}
				onDeleteEntry={handleDeleteEntry}
				onRestoreProfile={handleRestoreProfile}
				onDenyRestore={handleDenyRestore}
				onCreditScoreChange={handleCreditScoreChange}
				onObligationUpdate={handleObligationUpdate}
				loanScope={(formState.applicationData as any)?.loanType ?? ''}
				onObligationsRunningChange={(val) => {
					const newList = [...formState.applicants];
					newList[selectedIndex] = { ...newList[selectedIndex], ObligationsRunning: val };
					formState.replaceApplicants(newList);
				}}
				onPendingValidChange={handlePendingValidChange}
			/>

			<!-- R4: Company financials documentation flags (inline view) -->
			{#each visibleFinancialsFlags as flag (flag.entityName)}
				<div
					class="mx-1 mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-500 dark:bg-amber-950/30"
				>
					<div class="flex items-start gap-3">
						<Building2 class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
								{flag.entityName} — financials needed for documentation
							</p>
							<p class="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
								{flag.reason}
							</p>
						</div>
						<button
							type="button"
							class="shrink-0 text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
							onclick={() => dismissCompanyFinancialsFlag(flag.entityName)}
						>
							<X class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}

			<!-- R4: Multi-company guidance note -->
			{#if showMultiCompanyGuidance && visibleFinancialsFlags.length === 0}
				<div
					class="mx-1 mt-2 rounded-lg bg-(--form-bg-alt) px-4 py-2.5 text-xs text-(--form-text-muted)"
				>
					Director/partner in multiple companies? You can add another entry for each company using
					the same income profile.
					<button
						type="button"
						class="ml-2 text-(--form-text-muted) opacity-60 hover:opacity-100"
						onclick={() => {
							showMultiCompanyGuidance = false;
						}}
					>
						Dismiss
					</button>
				</div>
			{/if}

			<!-- Cross-field warnings — scoped to current tab (single-applicant inline view) -->
			{#if modalCrossWarnings.length > 0}
				<div class="mt-1">
					<CrossFieldWarningBanner
						warnings={modalCrossWarnings}
						onNavigate={(tabId) => {
							handleTabChange(tabId);
						}}
						onFixContradiction={detachOrphanDirector}
					/>
				</div>
			{/if}

			<!-- Tab Navigation Buttons -->
			<div class="mt-2 flex items-center justify-between pt-4">
				{#if canGoToPreviousTab()}
					<button
						type="button"
						class="font-titleMedium flex cursor-pointer items-center gap-2 rounded-lg bg-(--form-bg-alt) px-5
							py-2.5 text-sm text-(--form-text)
							transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
						onclick={goToPreviousTab}
					>
						<ChevronLeft class="h-4 w-4" />
						<span>Previous</span>
					</button>
				{:else}
					<div></div>
				{/if}

				{#if getCurrentTabIndex() < reactiveModalTabs.length - 1}
					<button
						type="button"
						class="font-titleMedium flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm
							{canGoToNextTab()
							? 'nav-btn-gradient text-white shadow-[0_4px_12px_rgba(221,190,169,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)]'
							: 'cursor-not-allowed bg-(--form-bg-alt) text-(--form-text-muted) opacity-50'}
							transition-all duration-200 active:scale-[0.98]"
						onclick={goToNextTab}
						disabled={!canGoToNextTab()}
					>
						<span>Next</span>
						<ChevronRight class="h-4 w-4" />
					</button>
				{:else}
					<div></div>
				{/if}
			</div>
		</div>
	{/if}
	<!-- A Company applicant never reaches this single-inline block — it always
	     uses the multi cards + modal path below (see isSingleApplicantInline /
	     applicantViewMode.ts), which mounts <Company> with a working onSubmit. -->
{:else}
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MULTI APPLICANT — Card/Table + Modal                            -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- ── Obligation Dedup Warning ── -->
	{#if obligationDupWarnings.length > 0}
		<div class="warning-message mt-4 mb-2">
			<CircleAlert size="18" class="" />
			<div class="alertText">
				<p class="font-titleMedium">Possible duplicate obligations detected:</p>
				<ul class="mt-1 list-inside list-disc space-y-0.5">
					{#each obligationDupWarnings as warning}
						<li>
							{warning.personName} has obligations with "{warning.lender}" in multiple entries.
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- Cross-field advisory warnings — page level shows:
		   • Structural issues (orphaned directors, company problems) needing
		     a "Detach" fix action.
		   • Cross-applicant advisories (applicantIndex = -1) like the NBFC
		     single-applicant warning — these are about the applicant LIST as
		     a whole, not any one row, so they belong here, not inside a
		     per-applicant modal where the user can't act on them. Reactive
		     to applicants array changes.
		 Per-applicant warnings (credit, income, obligations) still show
		 inside the modal on the relevant tab where the user can fix them. -->
	{@const pageWarnings = incomeWarnings.filter(
		(w) =>
			w.fixAction === 'detach' || w.category === 'company_no_directors' || w.applicantIndex === -1
	)}

	{#if pageWarnings.length > 0}
		<CrossFieldWarningBanner warnings={pageWarnings} onFixContradiction={detachOrphanDirector} />
	{/if}

	<!-- CARD VIEW (mobile) -->
	<div class="mt-2 mb-8 grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:hidden">
		{#each formState.applicants as any[] as applicant, i}
			{@const prefix =
				applicant.gender === 'male'
					? 'Mr.'
					: applicant.gender === 'female'
						? 'Ms.'
						: applicant.gender === 'others'
							? 'Mx.'
							: ''}
			<ApplicantCard
				applicant={applicant as any}
				index={i}
				{prefix}
				{isSecuredLoan}
				warningCount={warningCountForApplicant(i)}
				onOpen={openModal}
				onReset={handleResetApplicant}
			/>
		{/each}
	</div>

	<!-- TABLE VIEW (desktop) -->
	<div class="mt-4 mb-8 hidden w-full md:block">
		<div
			class="overflow-hidden rounded-2xl border border-(--form-border) bg-(--form-bg-card) shadow-md"
		>
			<div class="bg-ddsa-gradient-primary h-1.5 w-full"></div>
			<div
				class="font-titleMedium smallText hidden grid-cols-12 border-b border-[var(--ddsa-primary-500)] bg-gradient-to-br from-[var(--form-bg-alt)] to-stone-50/30 px-5 py-3.5 text-[var(--form-text-muted)] uppercase md:grid dark:to-[var(--form-bg-alt)]"
			>
				<div class="col-span-3">Applicant</div>
				<div class="col-span-2 text-center">Age / Category</div>
				<div class="col-span-2 text-center">Marital Status</div>
				<div class="col-span-2 text-center">NRI</div>
				<div class="col-span-2 text-center">Status</div>
				<div class="col-span-1 text-center">Action</div>
			</div>

			{#each formState.applicants as any[] as applicant, i}
				<ApplicantRow
					applicant={applicant as any}
					index={i}
					{isSecuredLoan}
					warningCount={warningCountForApplicant(i)}
					onOpen={openModal}
					onReset={handleResetApplicant}
				/>
			{/each}
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MODAL — New 4-Tab Structure                                     -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if showModal}
		<Modal bind:showModal closeOnOutside={false} onclose={closeModal}>
			{#snippet modalTitle()}
				<div class="flex items-center gap-3">
					{#if formState.applicants[selectedIndex]?.applicantType === 'Individual'}
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--trial-accent)/25 bg-linear-to-br from-(--trial-accent)/20 via-(--trial-accent)/10 to-transparent"
						>
							{#if formState.applicants[selectedIndex]?.gender === 'male'}
								<Mars size={16} class="text-blue-500" />
							{:else if formState.applicants[selectedIndex]?.gender === 'female'}
								<Venus size={16} class="text-pink-500" />
							{/if}
						</div>
						<div class="flex min-w-0 flex-wrap items-center gap-2">
							<h2 class="font-titleBold line-clamp-1 text-base text-(--form-text)">
								{capitalizeName(formState.applicants[selectedIndex]?.fullName)}
							</h2>
							{#if formState.applicants[selectedIndex]?.age}
								<span
									class="font-titleMedium inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-700 dark:border-stone-700/40 dark:bg-stone-900/20 dark:text-stone-400"
								>
									{formState.applicants[selectedIndex]?.age} yrs
								</span>
							{/if}
							{#if formState.applicants[selectedIndex]?.maritalStatus}
								<span
									class="font-titleMedium inline-flex items-center rounded-md border border-(--form-border) bg-(--form-bg-alt) px-2 py-0.5 text-[11px] text-(--form-text-secondary)"
								>
									{capitalizeName(formState.applicants[selectedIndex]?.maritalStatus)}
								</span>
							{/if}
						</div>
					{:else if formState.applicants[selectedIndex]?.applicantType === 'Company'}
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--trial-accent)/25 bg-linear-to-br from-(--trial-accent)/20 via-(--trial-accent)/10 to-transparent"
						>
							<Building2 size={16} class="text-stone-600" />
						</div>
						<div class="flex min-w-0 flex-wrap items-center gap-2">
							<h2 class="font-titleBold line-clamp-1 text-base text-(--form-text)">
								{formState.applicants[selectedIndex]?.companyName ?? ''}
							</h2>
						</div>
					{/if}
				</div>
			{/snippet}

			{#if formState.applicants[selectedIndex]?.applicantType === 'Company'}
				<!-- Company applicant: render Company.svelte as full replacement -->
				<Company
					{selectedIndex}
					bind:showmodal={showModal}
					bind:answers={formState.applicants[selectedIndex]}
					onSubmit={closeModal}
					loanCategory={formState.applicationData?.loanCategory}
					businessEntityType={formState.applicationData?.businessEntityType}
					professionalCategory={formState.applicants[selectedIndex]?.professionalCategory as string}
				/>
			{:else}
				<IncomeModalContent
					bind:applicant={formState.applicants[selectedIndex]}
					{selectedIndex}
					activeTab={modalActiveTab}
					tabs={reactiveModalTabs}
					sectionCompletion={modalSectionCompletion}
					{selectedProfiles}
					{answersContext}
					{incomeEntries}
					{restorePromptProfiles}
					{editingEntry}
					{lockedProfiles}
					{noIncomeReason}
					{emiPaidByRequired}
					loanProduct={formState.applicationData?.loanType ?? 'Personal Loan'}
					loanScope={(formState.applicationData as any)?.loanType ?? ''}
					professionalCategory={formState.applicants[selectedIndex]?.professionalCategory as string}
					isLinkedEntry={isEditingLinkedEntry}
					{linkedSourceName}
					linkedEntryWarnings={linkedEntryValidation}
					{linkedOtherShareholding}
					{firmNameOptions}
					{modalCrossWarnings}
					selectedRole={getApplicantRole(formState.applicants[selectedIndex])}
					{hasPendingValidObligation}
					bind:incomeTabRef={modalIncomeTabRef}
					onTabChange={handleTabChange}
					onNoIncomeReasonChange={handleNoIncomeReasonChange}
					onProfileSelectionChange={handleProfileSelectionChange}
					onAddEntry={handleAddEntry}
					onUpdateEntry={handleUpdateEntry}
					onCancelEdit={handleCancelEdit}
					onEditEntry={handleEditEntry}
					onDeleteEntry={handleDeleteEntry}
					onRestoreProfile={handleRestoreProfile}
					onDenyRestore={handleDenyRestore}
					onCreditScoreChange={handleCreditScoreChange}
					onObligationUpdate={handleObligationUpdate}
					onObligationsRunningChange={(val) => {
						const newList = [...formState.applicants];
						newList[selectedIndex] = { ...newList[selectedIndex], ObligationsRunning: val };
						formState.replaceApplicants(newList);
					}}
					onPendingValidChange={handlePendingValidChange}
					onDoneClick={handleDoneClick}
					{canGoToPreviousTab}
					{canGoToNextTab}
					{goToPreviousTab}
					{goToNextTab}
					{getCurrentTabIndex}
				/>

				<!-- R4: Company financials documentation flags (modal view) -->
				{#each visibleFinancialsFlags as flag (flag.entityName)}
					<div
						class="mx-2 mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-500 dark:bg-amber-950/30"
					>
						<div class="flex items-start gap-3">
							<Building2 class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
									{flag.entityName} — financials needed for documentation
								</p>
								<p class="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
									{flag.reason}
								</p>
							</div>
							<button
								type="button"
								class="shrink-0 text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
								onclick={() => dismissCompanyFinancialsFlag(flag.entityName)}
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</Modal>
	{/if}
{/if}

<!-- GPA is now a separate wizard step (step 2) in ApplicantFormSecured -->

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- CONFIRMATION DIALOG — Reset / Remove Applicant                  -->
<!-- ═══════════════════════════════════════════════════════════════ -->
{#if confirmAction}
	{@const name =
		confirmAction.applicant.applicantType === 'Company'
			? (confirmAction.applicant.companyName ?? 'Company')
			: (confirmAction.applicant.fullName ?? 'Applicant')}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 px-4"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-(--form-border) bg-(--form-bg-card) p-6 shadow-2xl"
		>
			{#if confirmAction.type === 'reset'}
				<h3 class="font-titleBold mb-2 text-base text-(--form-text)">
					Reset {name}'s Data?
				</h3>
				<p class="mb-5 font-paragraph text-sm leading-relaxed text-(--form-text-secondary)">
					This will clear all income profiles, credit score, existing loans, and detailed profile
					data for <strong>{name}</strong>. Basic info (name, age, gender, marital status) will be
					kept. You can restore the cleared data later from the recovery list.
				</p>
			{:else}
				<h3 class="font-titleBold mb-2 text-base text-(--form-text)">
					Remove {name}?
				</h3>
				<p class="mb-5 font-paragraph text-sm leading-relaxed text-(--form-text-secondary)">
					This will remove <strong>{name}</strong> from the application entirely. All their data will
					be saved for recovery. You can restore this applicant later from the recovery list.
				</p>
			{/if}

			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={cancelConfirmAction}
					class="font-titleMedium rounded-lg border border-(--form-border) bg-(--form-bg-alt) px-4 py-2 text-sm text-(--form-text) transition-colors hover:bg-(--form-hover)"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={executeConfirmedAction}
					class="font-titleMedium rounded-lg px-4 py-2 text-sm text-white transition-colors
						{confirmAction.type === 'remove'
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-(--trial-accent) hover:opacity-90'}"
				>
					{confirmAction.type === 'reset' ? 'Reset Data' : 'Remove Applicant'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- The Same-Company confirmation prompt is rendered at the form/+layout
     level via SameCompanyPromptModal.svelte (reading from
     `dialogState.sameCompanyPrompt`). See the $effect at the top of the
     <script> block — it mirrors the local `sameCompanyPrompt` payload
     into dialogState so the layout-level modal has what it needs.
     This approach guarantees the prompt's <dialog> is outside the
     per-applicant profile modal's top-layer slot, fixing the
     "modal appears behind the profile modal" stacking bug. -->

<style>
	/* same-company modal styles moved with the markup to
	   src/lib/components/SameCompanyPromptModal.svelte (S104, Issue A) */

	/* ── Nav buttons — matches FormNavigationBar gradient ── */
	:global(.nav-btn-gradient) {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500) 0%,
			var(--ddsa-accent-500) 51%,
			var(--ddsa-primary-500) 100%
		);
		background-size: 200% auto;
		transition: all 0.4s ease;
	}
	:global(.nav-btn-gradient:hover:not(:disabled)) {
		background-position: right center;
	}
</style>
