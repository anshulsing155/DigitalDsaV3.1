<script lang="ts">
	/**
	 * AddApplicantBusiness — Step 0 for Business Loan
	 * ═══════════════════════════════════════════════════════════════════
	 * Auto-reads businessEntityType from formState.applicationData.
	 * Two paths:
	 *   A: Sole Proprietorship → Individual form (like Personal + businessTradeName)
	 *   B: Company → Company identity details + inline director management.
	 *      Directors/partners are shown as indented sub-rows in the summary table
	 *      and edited via DirectorFormModal (no separate Step 0.5).
	 *      Business profile (industry, turnover, etc.) captured in Step 3 (CompanyBusinessProfile).
	 * ═══════════════════════════════════════════════════════════════════
	 */
	import { CircleAlert, Info, Store, Building2 } from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import type { LegacyApplicant } from '$lib/stores/loanData';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import ApplicantSummaryTable, { type DirectorDisplayRow } from './ApplicantSummaryTable.svelte';
	import DirectorFormModal from './DirectorFormModal.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { onMount, untrack } from 'svelte';
	import {
		buildDetectionKey,
		buildMatchSignature,
		applicantState,
		type RecoveryScope
	} from '$lib/state/applicant.svelte';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import type { DirectorRestorePayload } from '$lib/utils/directorRestoreHandler';
	import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import { openConfirmModal, closeConfirmModal } from '$lib/stores/confirmModal';
	import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import { get } from 'svelte/store';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { getAutoSelectedProfiles } from '$lib/config/incomeProfiles/profileCards';
	import {
		type DirectorForm,
		ROLE_MAP,
		isCardComplete,
		initDirectorForms,
		commitDirectorsToApplicants,
		validateAllDirectors,
		createEmptyDirectorForm,
		resizeDirectorForms,
		getStakeValidationRule,
		getMinDirectors,
		recomputeStakeAfterEntityChange
	} from '$lib/utils/directorFormUtils';
	import { syncAutoIncomeEntries } from '$lib/utils/directorAutoIncome';
	import { applyNriIncomeStashForApplicant } from '$lib/utils/unsecuredApplicantHandlers';
	import type { IncomeSourceEntry } from '$lib/types/incomeProfile';
	import DirectorRemovePickerModal from './DirectorRemovePickerModal.svelte';
	import {
		BASE_INDIVIDUAL_QUESTIONS,
		BUSINESS_COMPANY_QUESTIONS,
		type ApplicantQuestion
	} from '$lib/config/applicantQuestions';
	import {
		syncBusinessRunnerCoApplicant,
		BUSINESS_RUNNER_OPTIONS,
		getBusinessRunnerOptionsForMaritalStatus
	} from '$lib/utils/businessRunnerCoApplicant';
	import {
		addRelationship,
		getRelationshipsForApplicant,
		removeRelationshipsBatch
	} from '$lib/components/relationship-capture/relationshipStore';
	import { getRelationshipCategory } from '$lib/components/relationship-capture/categoryClassifier';
	import type { Relationship, RelationType } from '$lib/components/relationship-capture/types';
	import { businessRunnerStashStore } from '$lib/stores/businessRunnerStash';
	import {
		validateIndividualField as _validateIndividualField,
		validateCompanyField as _validateCompanyField,
		getIndividualErrors as _getIndividualErrors,
		getCompanyErrors as _getCompanyErrors
	} from '$lib/utils/applicantFormValidation';
	import { categoryFromScope } from '$lib/utils/recoveryCompatibility';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		isNextEnabled?: boolean;
		disabledReason?: string;
	}
	let { isNextEnabled = $bindable(false), disabledReason = $bindable('') }: Props = $props();

	const COMPANY_SCOPE: RecoveryScope = 'business::company';

	// ═══════════════════════════════════════════════════════════════════
	// ENTITY TYPE RESOLUTION
	// ═══════════════════════════════════════════════════════════════════

	const ENTITY_MAP: Record<string, { companyType: string; memberLabel: string; isOPC?: boolean }> =
		{
			partnership: { companyType: 'Partnership Firm', memberLabel: 'Partner' },
			llp: { companyType: 'LLP', memberLabel: 'Partner' },
			private_limited: { companyType: 'Private Limited', memberLabel: 'Director' },
			opc: { companyType: 'One Person Company (OPC)', memberLabel: 'Director', isOPC: true }
		};

	// OPC allows 1 director max; sole prop is handled by wasSoleProp logic; others are uncapped.
	function getEntityDirectorCap(type: string): number {
		if (ENTITY_MAP[type]?.isOPC) return 1;
		return Infinity;
	}

	const entityType = $derived(
		(formState.applicationData as Record<string, unknown>)?.businessEntityType as string | undefined
	);
	const isSoleProp = $derived(entityType === 'proprietorship');
	const entityConfig = $derived(
		!isSoleProp && entityType ? (ENTITY_MAP[entityType] ?? null) : null
	);

	/** Recovery scope for individual applicants — sole prop vs director/partner */
	const individualScope = $derived<RecoveryScope>(
		isSoleProp ? 'business::individual' : 'business::director'
	);

	// ═══════════════════════════════════════════════════════════════════
	// QUESTION DEFINITIONS (shared from applicantQuestions.ts)
	// ═══════════════════════════════════════════════════════════════════

	const INDIVIDUAL_QUESTIONS = BASE_INDIVIDUAL_QUESTIONS;

	// Sole prop uses individual questions but WITHOUT businessTradeName.
	// WHY businessTradeName removed: Sole proprietors may have multiple firms —
	// the trade name is captured per income source in the Income tab (profileFormConfig.ts).
	// isNRI kept visible but disabled — sole proprietorship is domestic by definition.
	// Auto-set to "No" in resetIndividualForm + QuestionRenderer renders it as disabled.
	//
	// P12: a FEMALE sole proprietor is additionally asked "Who runs the business?".
	// If the answer is not "Self", that person becomes a co-applicant (handled in the
	// sole-prop auto-save effect). The question is appended reactively to PROP_QUESTIONS
	// (declared after formApplicant) only when gender === 'female'.
	// WHO_RUNS_QUESTION's options depend on the proprietor's marital status —
	// see getBusinessRunnerOptionsForMaritalStatus. "Husband" is hidden when
	// not currently married (Single / Divorced / Separated / Widowed) since a
	// non-existent / former spouse cannot be currently running the business.
	// Built as a $derived (just below formApplicant) so it tracks marital
	// status changes. The const below is the static shape minus options;
	// the derived `whoRunsQuestion` fills in options reactively.
	const WHO_RUNS_QUESTION_BASE: Omit<ApplicantQuestion, 'options'> = {
		key: 'whoRunsTheBusiness',
		question: 'Who runs the business?',
		type: 'select',
		styleClass: 'col-span-2',
		icon: 'users',
		required: true
	};

	const COMPANY_QUESTIONS = BUSINESS_COMPANY_QUESTIONS;

	// Filter company questions based on entity type
	// hasRelatedDirectors removed — auto-derived from relationship page
	const visibleCompanyQuestions = $derived(
		COMPANY_QUESTIONS.filter((q) => {
			// numberOfDirectorsOrPartners: always shown, disabled for OPC (handled by isFieldDisabled)
			if (q.key === 'hasRelatedDirectors') return false;
			return true;
		})
	);

	// ═══════════════════════════════════════════════════════════════════
	// FORM STATE
	// ═══════════════════════════════════════════════════════════════════

	let globalError = $state('');
	let entityChangeWarning = $state('');
	let hasTriedToAdd = $state(false);
	// restoreAskedForKey now lives in applicantState.restoreAskedKeys (CLAUDE.md Pitfall #30)

	// Individual form (sole prop applicants AND company directors)
	let editingIndex: number | null = $state(null);
	let formApplicant: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: 'Individual',
		isNRI: 'No',
		touchedFields: {}
	});
	let formErrors: Record<string, string> = $state({});

	// "Who runs the business?" with options filtered by marital status —
	// "Husband" only when currently married, so we never offer
	// Single + Husband (user-reported 2026-05-26, BL screenshot).
	const whoRunsQuestion = $derived<ApplicantQuestion>({
		...WHO_RUNS_QUESTION_BASE,
		options: getBusinessRunnerOptionsForMaritalStatus(
			formApplicant.maritalStatus as string | undefined
		)
	});

	// Proprietor question list — append "Who runs the business?" only for a FEMALE
	// proprietor (P12). Derived so the question appears/disappears as gender changes
	// AND as marital status changes the available runner relations.
	const PROP_QUESTIONS = $derived<ApplicantQuestion[]>(
		(formApplicant.gender as string) === 'female'
			? [...BASE_INDIVIDUAL_QUESTIONS, whoRunsQuestion]
			: [...BASE_INDIVIDUAL_QUESTIONS]
	);

	// Company form (company path only)
	let companyForm: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: 'Company',
		touchedFields: {}
	});
	let companyErrors: Record<string, string> = $state({});
	let isCompanySaved = $state(false);
	let _isEditingCompany = $state(false);
	let hasTriedCompany = $state(false);

	// ── Director/Partner inline management ──────────────────────────
	let directorForms: DirectorForm[] = $state([]);
	let editingDirectorIdx: number | null = $state(null);
	let directorModalOpen = $state(false);
	let directorError = $state('');
	// Removal picker state (when count decreases and filled > new count)
	let showRemovePicker = $state(false);
	let removePickerFilled: DirectorForm[] = $state([]);
	let removePickerTargetCount = $state(0);
	// Captured before selectEntityType writes new type — used to revert on cancel
	let previousEntityTypeForRevert = $state('');

	// ═══════════════════════════════════════════════════════════════════
	// DERIVED
	// ═══════════════════════════════════════════════════════════════════

	// Memoized applicationStructure — only recomputes when applicant types actually change
	const derivedApplicationStructure = $derived.by(() => {
		const typed = formState.applicants.filter((a) => a.applicantType);
		if (typed.length === 0) return undefined;
		const hasInd = typed.some((a) => a.applicantType === 'Individual');
		const hasCo = typed.some((a) => a.applicantType === 'Company');
		if (hasInd && hasCo) return 'mix';
		if (hasCo) return 'company';
		if (typed.length === 1) return 'individual';
		return 'group_individuals';
	});
	// Sync derived structure to formState (side effect kept minimal)
	$effect(() => {
		if (derivedApplicationStructure === undefined) return;
		const current = formState.applicationData.applicationStructure as string | undefined;
		if (current !== derivedApplicationStructure) {
			// applicationStructure is part of ApplicationData's string index signature,
			// not a declared property — use setApplicationData with a partial object
			// so we don't need to cast the key/value through the generic.
			formState.setApplicationData({ applicationStructure: derivedApplicationStructure });
		}
	});

	// NOTE: Entity type change clearing + recovery is handled in selectEntityType().
	// No redundant $effect needed — entityType only changes via selectEntityType().

	// Borrowing-firm declaration (Partnership/LLP — "at least one partner declared
	// income from the firm") is NOT checked on this Who's-Applying page anymore. It
	// was a chicken-and-egg gate (blocked Next before income could be entered). It is
	// now validated on the partner's income step before navigating away.
	// See checkBorrowingFirmDeclaration usage in the business-loan +page.svelte.

	// isNextEnabled — derived from actual validation state, NOT from stale globalError
	$effect(() => {
		if (!entityType) {
			isNextEnabled = false;
			disabledReason = 'Select business type — Sole Proprietorship or Company';
		} else if (isSoleProp) {
			const errors = getIndividualErrors(formApplicant as LegacyApplicant, PROP_QUESTIONS);
			isNextEnabled = Object.keys(errors).length === 0;
			disabledReason = isNextEnabled ? '' : 'Complete all required fields';
		} else {
			// Company path: company fields valid + all directors complete.
			// The borrowing-firm income declaration is intentionally NOT gated here —
			// income isn't entered on this "Who's Applying" page, so requiring it would
			// be a chicken-and-egg block (Next disabled before you can reach the income
			// step to satisfy it). It's enforced on the partner's income step instead,
			// before navigating away. See checkBorrowingFirmDeclaration usage there.
			const errors = getCompanyErrors(companyForm as LegacyApplicant);
			const companyValid = Object.keys(errors).length === 0;
			const ct = entityConfig?.companyType ?? '';
			const allDirectorsComplete =
				directorForms.length > 0 && directorForms.every((d) => isCardComplete(d, true, ct));
			isNextEnabled = companyValid && allDirectorsComplete;
			if (!companyValid) {
				disabledReason = 'Complete all company details';
			} else if (!allDirectorsComplete) {
				disabledReason = 'Complete all director/partner details';
			} else {
				disabledReason = '';
			}
		}
	});

	// ── Auto-save company to formState when all fields are valid ──
	// This triggers director form initialization without waiting for Next click.
	let lastAutoSaveKey = '';
	$effect(() => {
		if (!entityConfig || isSoleProp) return;
		// Track companyForm fields to react to changes
		const key = `${companyForm.companyName}|${companyForm.registrationCountry}|${companyForm.numberOfDirectorsOrPartners}|${companyForm.hasRelatedDirectors}`;
		if (key === lastAutoSaveKey) return;
		const errors = getCompanyErrors(companyForm as LegacyApplicant);
		if (Object.keys(errors).length > 0) return;
		lastAutoSaveKey = key;
		// All company fields valid — auto-save
		const snapshot = $state.snapshot(companyForm) as Record<string, unknown>;
		snapshot.companyType = entityConfig.companyType;
		// Business loan: company is the borrower — always on EMI, no property
		snapshot.onEMI = true;
		snapshot.onProperty = false;
		const existingIdx = formState.applicants.findIndex((a) => a.applicantType === 'Company');
		if (existingIdx >= 0) {
			const updated = [...formState.applicants];
			updated[existingIdx] = snapshot;
			formState.replaceApplicants(updated);
		} else {
			formState.replaceApplicants([snapshot, ...formState.applicants]);
		}
		isCompanySaved = true;
	});

	// ── Auto-save Sole Proprietor to formState when all fields are valid ──
	// Mirrors the company auto-save above so the Income & Credit page sees the
	// applicant (with the locked 'business_proprietorship' income profile) the
	// instant the form is complete — no longer requires a Next click first.
	// `applicantSubType: 'sole_proprietor'` mirrors the secured-loan convention
	// so any cross-loan code that looks for sole-prop applicants finds them.
	let lastSolePropSyncKey = '';
	$effect(() => {
		if (!isSoleProp) return;
		const gender = formApplicant.gender as string;

		// ── Hygiene (Pitfall #12 parity): NO stale pollution on gender change. ──
		// "Who runs the business?" applies ONLY to a female proprietor. The instant
		// gender is anything else, scrub the stored answer so it can never resurface
		// (female→male→female must NOT silently re-apply an old "Husband").
		if (gender !== 'female' && formApplicant.whoRunsTheBusiness) {
			formApplicant.whoRunsTheBusiness = '';
		}

		// Same hygiene for marital-status changes: if the previously-stored
		// "Who runs the business?" value is no longer in the filtered options
		// for the current marital status, scrub it. Example: DSA picked
		// Married + Husband, then changed marital status to Single — "Husband"
		// is now invalid, must be cleared so the Next-disabled validator
		// re-surfaces the question instead of silently submitting Single+Husband.
		if (gender === 'female' && formApplicant.whoRunsTheBusiness) {
			const allowed = getBusinessRunnerOptionsForMaritalStatus(
				formApplicant.maritalStatus as string | undefined
			);
			const currentValue = formApplicant.whoRunsTheBusiness as string;
			if (!allowed.some((o) => o.value === currentValue)) {
				formApplicant.whoRunsTheBusiness = '';
			}
		}
		const whoRuns = gender === 'female' ? ((formApplicant.whoRunsTheBusiness as string) ?? '') : '';
		const proprietorId = formApplicant.id as string;

		// Proprietor completeness gates the proprietor UPSERT only — never the runner
		// REMOVAL (so a gender flip mid-edit can't strand an orphaned runner).
		const proprietorValid =
			Object.keys(getIndividualErrors(formApplicant as LegacyApplicant, PROP_QUESTIONS)).length === 0;

		const key = `${formApplicant.fullName}|${gender}|${formApplicant.age}|${formApplicant.maritalStatus}|${formApplicant.isNRI}|${whoRuns}|${proprietorValid}`;
		if (key === lastSolePropSyncKey) return;
		lastSolePropSyncKey = key;

		untrack(() => {
			let next = [...formState.applicants] as Array<Record<string, unknown>>;

			// 1. Upsert the proprietor — only when the form is valid.
			if (proprietorValid) {
				const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
				snapshot.applicantSubType = 'sole_proprietor';
				snapshot.selectedIncomeProfiles = getAutoSelectedProfiles({
					loanCategory: 'business',
					applicantType: 'Individual',
					businessEntityType: entityType
				});
				// Sole proprietor is the borrower — always on EMI, no property
				snapshot.onEMI = true;
				snapshot.onProperty = false;
				const existingIdx = next.findIndex((a) => a.id === proprietorId);
				if (existingIdx >= 0) next[existingIdx] = snapshot;
				else next = [...next, snapshot];
			}

			// 2. Reconcile the business-runner co-applicant — ALWAYS (regardless of
			//    proprietor validity). Self/blank → remove any runner; husband/father/
			//    son/other → a verification-only co-applicant (non_applicant_full_financial).
			//    Adding one flips the case to the multi-applicant view, which is intended.
			//    A previously-removed runner is rehydrated from the stash (retrieve earlier
			//    details): reusing its id also re-links its income/obligations.
			const stash = get(businessRunnerStashStore);
			const sync = syncBusinessRunnerCoApplicant(proprietorId, whoRuns, next, stash[proprietorId]);
			formState.replaceApplicants(sync.applicants);

			// Stash a removed runner so the proprietor can retrieve it on returning to female.
			if (sync.removedRunner) {
				businessRunnerStashStore.update((s) => ({ ...s, [proprietorId]: sync.removedRunner! }));
			}

			// 3. Relationship hygiene: drop any edge involving the runner, then add the
			//    fresh one. On removal (runnerId set, relationshipToAdd null) this still
			//    clears its relationships — no dangling edges. 'Other' adds no edge.
			if (sync.runnerId) {
				const staleIds = getRelationshipsForApplicant(sync.runnerId).map((r) => r.id);
				if (staleIds.length > 0) removeRelationshipsBatch(new Set(staleIds));
			}
			if (sync.relationshipToAdd) {
				const relationType = sync.relationshipToAdd.relationType as RelationType;
				const relationship: Relationship = {
					id: `runner-${sync.relationshipToAdd.fromId}-${sync.relationshipToAdd.toId}`,
					fromId: sync.relationshipToAdd.fromId,
					toId: sync.relationshipToAdd.toId,
					relationType,
					category: getRelationshipCategory(relationType),
					source: 'user-defined',
					createdAt: new Date()
				};
				addRelationship(relationship);
			}
		});
	});

	// ── Initialize director forms when company is saved or director count changes ──
	$effect(() => {
		if (!entityConfig || !isCompanySaved) {
			directorForms = [];
			return;
		}
		const count =
			Number(companyForm.numberOfDirectorsOrPartners) ||
			getMinDirectors(entityConfig?.companyType ?? '');
		if (directorForms.length === count) return; // no change
		const createOpts = { isOPC: !!entityConfig.isOPC, companyType: entityConfig.companyType };

		if (directorForms.length === 0) {
			// First init — load from saved data or create empty
			const company = formState.applicants.find((a) => a.applicantType === 'Company');
			directorForms = company
				? initDirectorForms(company as Record<string, unknown>, true)
				: Array.from({ length: count }, () => createEmptyDirectorForm(true, createOpts));
			// Pad if saved data had fewer than current count
			while (directorForms.length < count) {
				directorForms = [...directorForms, createEmptyDirectorForm(true, createOpts)];
			}
			return;
		}

		// Count changed with existing forms — use smart resize
		const { forms, needsUserChoice } = resizeDirectorForms(directorForms, count, true);
		if (needsUserChoice.length > 0) {
			// More filled directors than new count — ask user which to remove
			removePickerFilled = needsUserChoice;
			removePickerTargetCount = count;
			showRemovePicker = true;
			// Don't update directorForms yet — wait for user choice
		} else {
			directorForms = forms;
		}
	});

	// ── Derive director display rows for summary table ──────────────
	const directorRowsMap = $derived.by(() => {
		const company = formState.applicants.find((a) => a.applicantType === 'Company');
		if (!company?.id || directorForms.length === 0 || !entityConfig)
			return new Map<string, DirectorDisplayRow[]>();
		const ct = entityConfig.companyType;
		const companyId = company.id as string;
		const rows: DirectorDisplayRow[] = directorForms.map((d, i) => {
			// Find linked Individual applicant to read classification
			const normalizedName = d.fullName?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
			const linkedApplicant = normalizedName
				? formState.applicants.find(
						(a) =>
							a.applicantType === 'Individual' &&
							a.linkedCompanyId === companyId &&
							((a.fullName as string) ?? '').trim().toLowerCase().replace(/\s+/g, ' ') ===
								normalizedName
					)
				: undefined;
			return {
				id: d.id,
				directorIndex: i,
				name: d.fullName?.trim() || `${entityConfig.memberLabel} ${i + 1}`,
				role: entityConfig.memberLabel,
				isComplete: isCardComplete(d, true, ct),
				ownershipPercent: d.ownershipPercent || undefined,
				applicantClassification: linkedApplicant?.applicantClassification as string | undefined
			};
		});
		return new Map<string, DirectorDisplayRow[]>([[companyId, rows]]);
	});

	// ── Summary table entries for company path ──────────────────────
	const companySortedEntries = $derived(
		formState.applicants
			.filter((a) => a.applicantType === 'Company')
			.map((a, i) => ({ applicant: a as Record<string, unknown>, originalIndex: i }))
	);

	function getCompanyDisplayName(applicant: Record<string, unknown>, _index: number): string {
		return (applicant.companyName as string) || 'Company';
	}

	function getCompanyStatus(_applicant: Record<string, unknown>, _index: number): string {
		// Company itself is always complete if saved; directors checked separately
		return isCompanySaved ? 'complete' : 'pending';
	}

	// ── Director modal handlers ─────────────────────────────────────
	function handleEditDirector(_companyId: string, directorIndex: number) {
		editingDirectorIdx = directorIndex;
		directorModalOpen = true;
	}

	function handleDirectorSave(data: DirectorForm) {
		if (editingDirectorIdx === null) return;
		const nextForms = directorForms.map((d, i) => (i === editingDirectorIdx ? data : d));
		directorForms = nextForms;
		editingDirectorIdx = null;
		directorModalOpen = false;
		directorError = '';
		globalError = '';

		// Persist immediately to formState.applicants[Company].directors so a
		// Previous-click (which unmounts this component) doesn't lose the
		// just-saved data. Without this commit, on remount initDirectorForms
		// reads empty company.directors and falls back to "Director N"
		// placeholders with isComplete=false → table shows "Pending" again.
		// Issue #7 (CLAUDE.md Pitfall #25): commits previously deferred until
		// the Next-click validation block.
		const company = formState.applicants.find((a) => a.applicantType === 'Company');
		if (!company?.id || !entityConfig) return;
		const companyId = company.id as string;
		const role = ROLE_MAP[entityConfig.companyType ?? ''] ?? 'director';
		let newApplicants = commitDirectorsToApplicants(
			companyId,
			$state.snapshot(nextForms) as DirectorForm[],
			formState.applicants as Array<Record<string, unknown>>,
			role
		);
		// Parity with Home Loan's applicantFormManager.handleDirectorSave:
		// after committing directors to Individuals, sync the auto-created
		// director_company / business_partnership income entries on each
		// linked Individual. Without this step, the Director modal's Income
		// Details tab shows "No income sources added yet" instead of the
		// pre-created locked row that HL produces — and the Director-in-Company
		// income form has no sourceCompanyId so the company combobox isn't
		// auto-linked. See CLAUDE.md Pitfall #29 + #44.
		newApplicants = newApplicants.map((a) => {
			const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
			if (a.applicantType !== 'Individual' || ids.length === 0) return a;
			const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
			const name = (a.fullName as string) || '';
			return {
				...a,
				incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name)
			};
		});
		formState.replaceApplicants(newApplicants);
	}

	function handleDirectorModalClose() {
		editingDirectorIdx = null;
		directorModalOpen = false;
	}

	// ── Director restore (RestoreApplicantModal → director slot) ─────────
	// Public ref export. Called by ApplicantFormUnsecured.applyDirectorRestore,
	// which is in turn invoked from the BL +page.svelte onConfirm via
	// `handleRestoreModalConfirm` in `directorRestoreHandler.ts`.
	//
	// Mirrors `applicantFormManager.applyDirectorRestore` for the secured-loan
	// flow, but writes to the local BL `directorForms` $state array (BL doesn't
	// use the legacy directorFormsMap in applicantFormManager).
	//
	// Why this exists: pre-fix, the BL/PL/Prof page onConfirm only called
	// `prefillApplicantRestore(match)`. For a director-modal-triggered restore,
	// `restoreIntentState.currentIndex` is undefined (the target is a director
	// sub-form, not an applicants-list slot), so `prefillApplicantRestore`
	// bailed at the early guard and returned null — without resetting the
	// intent. The modal stayed open forever. (User-reported 2026-05-23,
	// Pvt Ltd → OPC → Pvt Ltd → re-add same-named director repro.)
	export function applyDirectorRestore(
		companyId: string,
		dirIdx: number,
		restore: DirectorRestorePayload
	): void {
		// Guard: this BL component manages directors for the Company applicant
		// in formState; reject if companyId doesn't match a known Company.
		const company = formState.applicants.find(
			(a) => a.id === companyId && a.applicantType === 'Company'
		);
		// Pitfall #56 (restore-button unresponsive): if the guard fails, we
		// MUST reset restoreIntentState — otherwise the modal stays open
		// forever (the "Restore button does nothing" repro from the PDF,
		// pages 5-6). Previous behavior silently returned, leaving the
		// singleton open=true and the user with no recourse but "Not this
		// person".
		if (!company || dirIdx < 0) {
			restoreIntentState.reset();
			return;
		}
		// dirIdx may legitimately point one slot past the end during a fast
		// stakeholder-count-bump → click-card sequence (the $effect that
		// grows directorForms hasn't flushed yet). Grow defensively rather
		// than rejecting.
		while (dirIdx >= directorForms.length) {
			directorForms = [
				...directorForms,
				createEmptyDirectorForm(true, {
					isOPC: !!entityConfig?.isOPC,
					companyType: entityConfig?.companyType
				})
			];
		}

		// Prevent duplicate director IDs within this company. Two directors
		// restored from the same recovery entry would otherwise share an ID
		// → each_key duplicate crash in the cards renderer.
		let effectiveId = restore.matchedId;
		const idAlreadyUsed = directorForms.some(
			(f, i) => i !== dirIdx && f.id === restore.matchedId
		);
		if (idAlreadyUsed) {
			effectiveId = uuidv4();
		}

		// Merge restored data onto the existing director form. We keep the
		// existing lockedFields for ownershipPercent (set elsewhere by the
		// cross-company match path) but also accept the restore's locked
		// fields (gender/age/maritalStatus/isNRI are typically locked on
		// recovery restores).
		const next: DirectorForm[] = directorForms.map((d, i) => {
			if (i !== dirIdx) return d;
			return {
				...d,
				...restore.data,
				id: effectiveId,
				restoredFrom: restore.source,
				lockedFields: Array.from(
					new Set([
						...d.lockedFields.filter((f) => f === 'ownershipPercent'),
						...restore.lockedFields
					])
				),
				pendingMatch: null
			} as DirectorForm;
		});
		directorForms = next;

		// Restore structured income/obligation/CIBIL data for the linked
		// Individual that this director will commit into. applicantDataStore
		// is keyed by the director's effective ID — keep them in sync.
		if (restore.structured && effectiveId) {
			// `as any` matches applicantFormManager.applyDirectorRestore — the
			// fromJSON store contract requires the full ApplicantData shape per
			// key, but recovery `structured` envelopes are a partial subset
			// (only the data that was saved at deletion time). The store merges
			// the partial onto whatever already exists at that key.
			applicantDataStore.fromJSON({
				...applicantDataStore.toJSON(),
				[effectiveId]: restore.structured as any
			});
		}

		// Commit directors back into formState.applicants so the linked
		// Individual exists immediately (mirrors handleDirectorSave below).
		// Without this, the restored data sits in applicantDataStore with no
		// applicants-list entry pointing at it.
		if (entityConfig) {
			const role = ROLE_MAP[entityConfig.companyType ?? ''] ?? 'director';
			let newApplicants = commitDirectorsToApplicants(
				companyId,
				$state.snapshot(next) as DirectorForm[],
				formState.applicants as Array<Record<string, unknown>>,
				role
			);
			// Merge any profile fields (education, religion, etc.) onto the
			// linked Individual created/refreshed by commitDirectorsToApplicants.
			// These bypass DirectorForm — they live on the Individual itself.
			if (restore.profileFields && Object.keys(restore.profileFields).length > 0) {
				const idx = newApplicants.findIndex((a) => a.id === effectiveId);
				if (idx >= 0) {
					newApplicants[idx] = {
						...newApplicants[idx],
						...restore.profileFields
					};
				}
			}
			// Parity with handleDirectorSave (CLAUDE.md Pitfall #29 + #44): after
			// committing directors, sync the auto-created director_company /
			// business_partnership income entries on each linked Individual so the
			// Director modal's Income Details tab shows the pre-created locked row
			// with the company auto-linked — exactly like Home Loan. Locked by
			// directorAutoIncomeWiring.test.ts.
			newApplicants = newApplicants.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				return {
					...a,
					incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name)
				};
			});
			formState.replaceApplicants(newApplicants);
		}

		// Close the restore modal — caller already calls reset() but be
		// defensive in case applyDirectorRestore is ever invoked directly.
		restoreIntentState.reset();
	}

	function handleRemovePickerConfirm(keepIndexes: number[]) {
		const kept = keepIndexes.map((i) => removePickerFilled[i]);

		// Save each discarded director's linked Individual applicant to the recovery bin.
		// We save the Individual (which carries income/CIBIL/obligations data), not the DirectorForm.
		const keepSet = new Set(keepIndexes);
		const company = formState.applicants.find((a) => a.applicantType === 'Company');
		const companyId = company?.id as string | undefined;

		for (let i = 0; i < removePickerFilled.length; i++) {
			if (keepSet.has(i)) continue;
			const director = removePickerFilled[i];
			if (!director.fullName?.trim()) continue;

			const linkedApplicant = companyId
				? formState.applicants.find(
						(a) =>
							a.applicantType === 'Individual' &&
							a.linkedCompanyId === companyId &&
							(a.fullName as string)?.trim().toLowerCase() ===
								director.fullName.trim().toLowerCase()
					)
				: undefined;

			if (linkedApplicant?.id) {
				const matchSig = buildMatchSignature(linkedApplicant as Record<string, unknown>);
				if (matchSig) {
					applicantState.removeToRecovery(
						linkedApplicant.id as string,
						$state.snapshot(linkedApplicant) as Record<string, unknown>,
						director.fullName.trim(),
						matchSig,
						'business::director'
					);
				}
			}
		}

		const createOpts = entityConfig
			? { isOPC: !!entityConfig.isOPC, companyType: entityConfig.companyType }
			: undefined;
		while (kept.length < removePickerTargetCount) {
			kept.push(createEmptyDirectorForm(true, createOpts));
		}

		// Pitfall #56: recompute ownershipPercent immediately so OPC's lone
		// director shows 100% (not the stale Pvt-Ltd 50%) on the same render
		// frame as the picker confirm. The previous behavior required a
		// Next→Previous navigation cycle to refresh — `initDirectorForms`
		// would re-apply the OPC=100 rule only on remount.
		// `previousEntityTypeForRevert` holds the entity type *before* the
		// switch that opened this picker, mapped to its companyType via
		// ENTITY_MAP. If unavailable (defensive), pass '' so the helper
		// short-circuits when no entity transition is happening.
		const prevCompanyType = previousEntityTypeForRevert
			? (ENTITY_MAP[previousEntityTypeForRevert]?.companyType ?? '')
			: '';
		const newCompanyType = entityConfig?.companyType ?? '';
		directorForms = recomputeStakeAfterEntityChange(kept, newCompanyType, prevCompanyType);

		// Pitfall #25 + #52: persist immediately to formState.applicants[Company].directors.
		// Without this commit, the local directorForms shows [kept...] but the
		// persisted company.directors still holds the pre-removal array — on a
		// later Previous→Next remount, initDirectorForms reads the stale array
		// and resurrects the removed director (BL "Tanisha reappears after
		// Pvt Ltd → OPC → Pvt Ltd + Stakeholders=2 + Prev/Next" repro).
		// Mirrors the pattern in handleDirectorSave / handleDirectorRestore /
		// validateAndCommit (the other 3 commit sites in this file).
		if (companyId && entityConfig) {
			const role = ROLE_MAP[entityConfig.companyType ?? ''] ?? 'director';
			// Persist the *recomputed* directorForms (with OPC=100 applied),
			// not the pre-recompute `kept` snapshot. Otherwise the stake fix
			// lives only in local state and gets overwritten by the next
			// initDirectorForms() that reads company.directors back.
			let newApplicants = commitDirectorsToApplicants(
				companyId,
				$state.snapshot(directorForms) as DirectorForm[],
				formState.applicants as Array<Record<string, unknown>>,
				role
			);
			// Pitfall #46: pair syncAutoIncomeEntries with every commitDirectorsToApplicants.
			newApplicants = newApplicants.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				return {
					...a,
					incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name)
				};
			});
			formState.replaceApplicants(newApplicants);
		}

		showRemovePicker = false;
		removePickerFilled = [];
	}

	function handleRemovePickerCancel() {
		// Revert the director count back to match current forms
		companyForm = { ...companyForm, numberOfDirectorsOrPartners: String(directorForms.length) };
		// Revert the entity type if a cap-triggered modal was dismissed.
		// The DSA never confirmed the entity change — modal was the confirmation step.
		if (previousEntityTypeForRevert && previousEntityTypeForRevert !== entityType) {
			formState.replaceApplicationData({
				...formState.applicationData,
				businessEntityType: previousEntityTypeForRevert
			});
		}
		previousEntityTypeForRevert = '';
		showRemovePicker = false;
		removePickerFilled = [];
	}

	// ── Partnership dissolution risk (2-partner firms) ──────────────
	const isPartnershipDissolutionRisk = $derived(
		(entityType === 'partnership' || entityType === 'llp') &&
			directorForms.length === 2 &&
			isCompanySaved
	);

	// ── Stake total for director summary ──────────────────────────────
	const stakeTotal = $derived(
		directorForms.reduce((sum, d) => sum + (Number(d.ownershipPercent) || 0), 0)
	);
	const stakeRule = $derived(
		entityConfig ? getStakeValidationRule(entityConfig.companyType) : 'none'
	);
	const stakeValid = $derived(
		stakeRule === 'none' ? true : stakeRule === 'exact_100' ? stakeTotal === 100 : stakeTotal <= 100
	);

	// ═══════════════════════════════════════════════════════════════════
	// ENTITY TYPE SELECTION (inline on this page)
	// ═══════════════════════════════════════════════════════════════════

	const ENTITY_OPTIONS: {
		value: string;
		label: string;
		description: string;
		icon: typeof Store;
	}[] = [
		{
			value: 'proprietorship',
			label: 'Sole Proprietorship',
			description: 'Individual running a business',
			icon: Store
		},
		{
			value: 'partnership',
			label: 'Partnership',
			description: 'Two or more partners',
			icon: Building2
		},
		{ value: 'llp', label: 'LLP', description: 'Limited Liability Partnership', icon: Building2 },
		{
			value: 'private_limited',
			label: 'Private Limited',
			description: 'Pvt Ltd company',
			icon: Building2
		},
		{
			value: 'opc',
			label: 'One Person Company',
			description: 'Single-member company',
			icon: Store
		}
	];

	/**
	 * Confirmation gate for entity-type changes.
	 *
	 * Wraps selectEntityType with explicit user confirmation when the change
	 * would destroy or substantially restructure existing data. Without this
	 * gate, a user clicking a different tile silently triggers cascading
	 * cleanup — directors get moved to recovery, proprietor data is lost,
	 * label changes happen invisibly. This caused real user complaints
	 * (2026-05-02): "user can come back after selecting guarantor but not
	 * filling those details then this page is not letting him go further. so
	 * errors should be populated on it's pages only. no combinedly".
	 *
	 * Four transition severities — only the destructive ones prompt:
	 *   1. First selection (no previous type): apply directly. No prompt.
	 *   2. Label-only change (Pvt Ltd ↔ Partnership ↔ LLP ↔ Pvt Ltd):
	 *      Director ↔ Partner role rename. No data loss. No prompt; the
	 *      existing inline banner ("Roles updated") communicates the change.
	 *   3. Reduce-to-1 (anything → OPC) with N>1 filled directors: warn
	 *      and explain that the next step will let them pick which one to
	 *      keep. Then the existing DirectorRemovePickerModal does the picking.
	 *   4. Sole-prop ↔ Company crossover: ALL applicants get moved to
	 *      the recovery bin (recoverable but disruptive). Warn explicitly.
	 */
	function requestEntityChange(newType: string) {
		const previousType = entityType;
		// No-op: same tile clicked twice
		if (previousType === newType) return;

		// First selection — no prior data, no warning needed
		if (!previousType) {
			selectEntityType(newType);
			return;
		}

		const wasSoleProp = previousType === 'proprietorship';
		const isSolePropNew = newType === 'proprietorship';
		const filledDirectors = directorForms.filter((d) => d.fullName?.trim()).length;
		const newCap = getEntityDirectorCap(newType);

		// Severity 4 — Sole prop ↔ Company crossover (highest impact)
		if (wasSoleProp !== isSolePropNew) {
			const fromLabel = wasSoleProp ? 'Sole Proprietorship' : 'company';
			const toLabel = isSolePropNew ? 'Sole Proprietorship' : 'company';
			const movedThing = wasSoleProp
				? 'the proprietor details you entered'
				: 'all directors/partners and the company details you entered';

			openConfirmModal(
				`Switch to ${toLabel === 'company' ? ENTITY_MAP[newType]?.companyType ?? 'Company' : toLabel}?`,
				`This changes the structure from ${fromLabel} to ${toLabel}. ${movedThing} will be moved to the recovery bin (you can restore them later from the modal that appears when you re-enter a matching name). Continue?`,
				() => selectEntityType(newType),
				{ confirmLabel: 'Yes, Switch', cancelLabel: 'Cancel' }
			);
			return;
		}

		// Severity 3 — OPC cap reduces director count below filled count
		if (newCap !== Infinity && filledDirectors > newCap) {
			const newConfig = ENTITY_MAP[newType];
			openConfirmModal(
				`Switch to ${newConfig?.companyType ?? 'OPC'}?`,
				`${newConfig?.companyType ?? 'OPC'} requires exactly ${newCap} director. You currently have ${filledDirectors} filled. The next step will let you choose which one to keep — the others will be removed (recoverable). Continue?`,
				() => selectEntityType(newType),
				{ confirmLabel: 'Yes, Choose Director to Keep', cancelLabel: 'Cancel' }
			);
			return;
		}

		// Severity 2 — Label change (Director ↔ Partner) without count reduction.
		// Apply directly; selectEntityType shows an inline banner explaining the
		// rename. No data is lost, so no confirmation needed.
		// Severity 1 — first selection (no previous type) is handled above.
		selectEntityType(newType);
	}

	function selectEntityType(type: string) {
		const previousType = entityType;
		const wasSoleProp = previousType === 'proprietorship';
		const isSolePropNow = type === 'proprietorship';
		// Capture before writing — needed to revert on cancel if the modal is dismissed
		previousEntityTypeForRevert = previousType ?? '';

		formState.replaceApplicationData({
			...formState.applicationData,
			businessEntityType: type
		});

		// Clean up stale applicants when switching between sole prop ↔ company
		// Save existing applicants to recovery bin before clearing.
		// Special case: when LEAVING sole prop, the business-runner co-applicant
		// is stashed in businessRunnerStashStore (keyed by proprietor id) instead
		// of routed to the generic recovery bin. Two reasons:
		//   1. Same-proprietor return: if the DSA re-enters this proprietor later,
		//      syncBusinessRunnerCoApplicant's stash lookup (rebuildFromStash)
		//      rebuilds the runner with the original id + all preserved fields
		//      — including the data entered on the Business Runner Page (name,
		//      age, gender, otherRunnerRelationLabel).
		//   2. Cross-proprietor leak prevention: the runner's name-based signature
		//      could otherwise restore him under a DIFFERENT proprietor whose
		//      husband happens to share name+demographics. Stashing by proprietor
		//      id scopes the data correctly.
		if (previousType && wasSoleProp !== isSolePropNow) {
			if (wasSoleProp) {
				const proprietor = formState.applicants.find(
					(a) => a.applicantSubType === 'sole_proprietor'
				);
				const runner = formState.applicants.find(
					(a) => a.applicantSubType === 'business_runner'
				);
				if (proprietor?.id && runner) {
					businessRunnerStashStore.update((s) => ({
						...s,
						[proprietor.id as string]: $state.snapshot(runner) as Record<string, unknown>
					}));
				}
			}
			for (const applicant of formState.applicants) {
				if (!applicant.applicantType || !applicant.id) continue;
				// Runner is stashed above — keep it out of the generic recovery bin so
				// it can't be wrongly restored under a different proprietor by name.
				if (applicant.applicantSubType === 'business_runner') continue;
				const matchSignature = buildMatchSignature(applicant);
				if (!matchSignature) continue;
				const isCompany = applicant.applicantType === 'Company';
				const displayName = isCompany
					? (applicant.companyName as string) || 'Unnamed Company'
					: (applicant.fullName as string) || 'Unnamed';
				const scope = isCompany ? COMPANY_SCOPE : individualScope;
				applicantState.removeToRecovery(
					applicant.id as string,
					$state.snapshot(applicant) as Record<string, unknown>,
					displayName,
					matchSignature,
					scope
				);
			}
			formState.replaceApplicants([]);
			clearAllRelationships();
			incomeProfileStore.clearAll();
			editingIndex = null;
			isCompanySaved = false;
			resetCompanyForm();
			resetIndividualForm();
		}

		// Session 33: Sync director/partner roles when switching between company entity types
		// E.g., Partnership (Partner) → Private Limited (Director) — update all existing directors
		const oldConfig = previousType ? ENTITY_MAP[previousType] : null;
		const newConfig = ENTITY_MAP[type];
		if (
			oldConfig &&
			newConfig &&
			oldConfig.memberLabel !== newConfig.memberLabel &&
			!wasSoleProp &&
			!isSolePropNow
		) {
			const updatedApplicants = formState.applicants.map((a) => {
				if (a.applicantType === 'Individual' && a._linkedCompanyId) {
					// Update directorRole to match new entity type
					const newRole = newConfig.memberLabel.toLowerCase() as 'director' | 'partner';
					return { ...a, directorRole: newRole, _directorRole: newRole };
				}
				if (a.applicantType === 'Company') {
					// Update companyType on the company applicant
					return { ...a, companyType: newConfig.companyType };
				}
				return a;
			});
			formState.replaceApplicants(updatedApplicants);
			entityChangeWarning = `Roles updated: ${oldConfig.memberLabel} → ${newConfig.memberLabel} for all existing members.`;
			setTimeout(() => {
				entityChangeWarning = '';
			}, 5000);
		}

		// Pitfall #56: when entity-type change does NOT trigger the
		// resize/remove-picker path (e.g. OPC → Pvt Ltd has cap=Infinity so no
		// modal opens), recompute stakes here so the former OPC director's
		// locked-100% gets unlocked + cleared immediately. Without this, the
		// stale 100% would survive into the new multi-director regime — a
		// later 50% manual entry on Director 2 produces a 150% overflow.
		// Idempotent + safe to call even when the remove-picker WILL run
		// (handleRemovePickerConfirm calls it again post-resize); the helper
		// is a no-op when neither side is OPC.
		if (oldConfig && newConfig && !wasSoleProp && !isSolePropNow) {
			const recomputed = recomputeStakeAfterEntityChange(
				directorForms,
				newConfig.companyType,
				oldConfig.companyType
			);
			if (recomputed !== directorForms) {
				directorForms = recomputed;
				// Persist immediately if the Company applicant exists.
				const companyApp = formState.applicants.find((a) => a.applicantType === 'Company');
				if (companyApp?.id) {
					const role = ROLE_MAP[newConfig.companyType] ?? 'director';
					let newApplicants = commitDirectorsToApplicants(
						companyApp.id as string,
						$state.snapshot(directorForms) as DirectorForm[],
						formState.applicants as Array<Record<string, unknown>>,
						role
					);
					// Pitfall #46 pair — keep auto-income entries in sync.
					newApplicants = newApplicants.map((a) => {
						const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
						if (a.applicantType !== 'Individual' || ids.length === 0) return a;
						const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
						const name = (a.fullName as string) || '';
						return {
							...a,
							incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name)
						};
					});
					formState.replaceApplicants(newApplicants);
				}
			}
		}

		// Enforce max-director cap for the new entity type.
		// Example: Partnership (3 directors) → OPC (cap = 1).
		// Lower numberOfDirectorsOrPartners to the cap — the existing $effect
		// watches this value, calls resizeDirectorForms, and if filled directors
		// exceed the new count, opens DirectorRemovePickerModal automatically.
		const newCap = getEntityDirectorCap(type);
		if (newCap !== Infinity && !wasSoleProp && !isSolePropNow) {
			const filledCount = directorForms.filter((d) => d.fullName?.trim()).length;
			if (filledCount > newCap) {
				companyForm = { ...companyForm, numberOfDirectorsOrPartners: String(newCap) };
				// $effect fires → resizeDirectorForms → needsUserChoice.length > 0 → modal opens.
				// If cancelled, handleRemovePickerCancel reverts both count and entity type.
			}
		}

		// Initialize company form when switching to a company entity.
		// Existing values (companyName, registrationCountry, stakeholder count) are
		// preserved when valid — only the count is cleared when below the new entity's
		// minimum. This avoids forcing the DSA to drop already-entered partners just
		// because they switched a label (e.g., Partnership 3 → LLP 3, both min=2).
		// The entity-type tile selector at the top + the entity-type badge in the
		// "Company Details" legend make the structural change visible without losing
		// typed data.
		const config = newConfig;
		if (config) {
			const existing = formState.applicants.find((a) => a.applicantType === 'Company');
			if (existing) {
				companyForm = { ...existing, companyType: config.companyType };
				isCompanySaved = true;
				// Sync the persisted Company applicant's companyType so the
				// ADDED APPLICANTS table reflects the new entity selection.
				// Previously only the local `companyForm` buffer was rewritten,
				// so switching Pvt Ltd → OPC → Pvt Ltd left the table classification
				// stuck on "One Person Company (OPC)" (BL UI-not-updating report).
				if (existing.companyType !== config.companyType) {
					const syncedApplicants = formState.applicants.map((a) =>
						a.applicantType === 'Company' ? { ...a, companyType: config.companyType } : a
					);
					formState.replaceApplicants(syncedApplicants);
				}
			} else {
				companyForm = {
					id: uuidv4(),
					applicantType: 'Company',
					companyType: config.companyType,
					onEMI: true,
					onProperty: false,
					touchedFields: {}
				};
				isCompanySaved = false;
			}
			// OPC: force 1 director. Non-OPC: clear if currently below the new minimum
			// (cap-violations handled separately above by the newCap block).
			if (config.isOPC) {
				companyForm.numberOfDirectorsOrPartners = '1';
			} else {
				const min = getMinDirectors(config.companyType);
				const current = Number(companyForm.numberOfDirectorsOrPartners) || 0;
				if (current < min) {
					companyForm.numberOfDirectorsOrPartners = '';
				}
			}
			companyErrors = {};
			hasTriedCompany = false;
		} else if (isSolePropNow) {
			// Reset individual form for sole prop
			resetIndividualForm();
		}
		globalError = '';
	}

	// ═══════════════════════════════════════════════════════════════════
	// INIT & RESTORE
	// ═══════════════════════════════════════════════════════════════════

	onMount(() => {
		closeConfirmModal();
		if (isSoleProp) {
			// Load existing proprietor data into form
			const existing = formState.applicants.find((a) => a.applicantType === 'Individual');
			if (existing) {
				formApplicant = { ...existing };
				formErrors = {};
				hasTriedToAdd = false;
			}
		} else if (entityConfig) {
			const existing = formState.applicants.find((a) => a.applicantType === 'Company');
			if (existing) {
				companyForm = { ...existing };
				isCompanySaved = true;
			} else {
				companyForm = { ...companyForm, companyType: entityConfig.companyType };
				if (entityConfig.isOPC) {
					companyForm.numberOfDirectorsOrPartners = '1';
				}
			}
		}
	});

	// Restore modal sync
	// Session 33: Redesigned — restore adds directly to table (page-level onConfirm),
	// so for the company/director path we just reset the form on close.
	//
	// 2026-05-04: Sole-proprietor branch was getting wiped on confirm too — but
	// in that mode the inline form IS the single applicant (no table). The
	// restored data was being written to formState.applicants by
	// prefillApplicantRestore, the modal was closing, this effect was firing,
	// and resetIndividualForm() was blanking the UI. The DSA saw empty fields,
	// assumed restore failed, typed a fresh name, and that became a phantom
	// second applicant on the relationships page. Fix: when the user CONFIRMED
	// (restoreIntentState.wasConfirmed) AND we're in sole-prop mode, sync
	// formApplicant from the slot the restore handler just populated.
	let wasRestoreOpen = $state(false);
	$effect(() => {
		const isOpen = restoreIntentState.open;
		if (wasRestoreOpen && !isOpen) {
			const wasConfirmed = restoreIntentState.wasConfirmed;
			const confirmedIdx = restoreIntentState.confirmedIndex;
			if (isSoleProp && wasConfirmed) {
				// Pull the freshly restored slot into the local form so the UI
				// reflects what was just written. Prefer the explicit
				// confirmedIndex; fall back to the only Individual in state.
				const slot =
					confirmedIdx !== undefined
						? formState.applicants[confirmedIdx]
						: formState.applicants.find((a) => a.applicantType === 'Individual');
				if (slot) {
					formApplicant = { ...slot };
					formErrors = {};
					hasTriedToAdd = false;
				} else {
					resetIndividualForm();
				}
			} else {
				// Cancel, or company/director path → reset forms for fresh input.
				editingIndex = null;
				resetIndividualForm();
			}
			// Consume the flag so a subsequent unrelated close doesn't re-fire.
			if (wasConfirmed) restoreIntentState.clearConfirmed();
		}
		wasRestoreOpen = isOpen;
	});

	// Pitfall #40: when the user clicks Cancel on the PendingRestoreBanner,
	// cancelApplicantRestore() rewinds formState.applicants but our local
	// `formApplicant` buffer still holds the values copied in by the effect
	// above. Resync from the (now-rewound) slot — or reset if the slot was
	// removed because the previous slot had no user data.
	let lastCancelledAt = $state(0);
	$effect(() => {
		const tick = restoreIntentState.cancelledAt;
		if (tick === lastCancelledAt) return;
		lastCancelledAt = tick;
		if (!isSoleProp) return;
		const idx = restoreIntentState.cancelledIndex;
		const slot =
			idx !== undefined && idx < formState.applicants.length
				? formState.applicants[idx]
				: formState.applicants.find((a) => a.applicantType === 'Individual');
		if (slot && slot.applicantType === 'Individual') {
			formApplicant = { ...slot };
			formErrors = {};
			hasTriedToAdd = false;
		} else {
			resetIndividualForm();
		}
		restoreIntentState.clearCancelled();
	});

	// ═══════════════════════════════════════════════════════════════════
	// VALIDATION
	// ═══════════════════════════════════════════════════════════════════

	// Validation wrappers — delegate to shared utilities with local context
	function validateIndividualField(key: string, value: unknown): string | null {
		return _validateIndividualField(key, value);
	}

	function validateCompanyField(key: string, value: unknown): string | null {
		return _validateCompanyField(key, value, {
			isOPC: entityConfig?.isOPC ?? false,
			companyType: entityConfig?.companyType ?? '',
			entityLabel: 'Company'
		});
	}

	function getIndividualErrors(
		applicant: LegacyApplicant,
		questions: typeof INDIVIDUAL_QUESTIONS = INDIVIDUAL_QUESTIONS
	): Record<string, string> {
		return _getIndividualErrors(applicant as Record<string, unknown>, questions);
	}

	function getCompanyErrors(applicant: LegacyApplicant): Record<string, string> {
		return _getCompanyErrors(applicant as Record<string, unknown>, visibleCompanyQuestions, {
			isOPC: entityConfig?.isOPC ?? false,
			companyType: entityConfig?.companyType ?? ''
		});
	}

	// ═══════════════════════════════════════════════════════════════════
	// FIELD HANDLERS — Individual
	// ═══════════════════════════════════════════════════════════════════

	function updateFormField(_index: number, key: string, value: unknown) {
		formState.applicantStepTouched = true;
		globalError = '';
		// Pitfall #57: detect isNRI flip BEFORE we overwrite formApplicant —
		// the previous value is needed to decide stash vs restore. The actual
		// stash/restore runs AFTER the auto-save $effect persists the new
		// isNRI to formState.applicants (see below).
		const previousIsNRI = key === 'isNRI' ? (formApplicant.isNRI as string | undefined) : undefined;
		formApplicant = {
			...formApplicant,
			[key]: value,
			touchedFields: { ...((formApplicant.touchedFields as Record<string, boolean>) ?? {}) }
		};
		const error = validateIndividualField(key, value);
		if (error) {
			formErrors = { ...formErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = formErrors;
			formErrors = rest;
		}
		if (key === 'fullName') {
			const nameValue = String(value || '').trim();
			if (nameValue.length >= 2) detectCachedApplicantForForm();
			else applicantState.clearAllRestoreAsked();
		}
		// Pitfall #57: when isNRI flips, stash or restore the applicant's
		// NRI-incompatible business income entries. The helper is a no-op when
		// the applicant doesn't yet exist in formState.applicants (new add) —
		// in that case the next save will write isNRI=Yes with no stale
		// entries to stash, which is correct.
		if (key === 'isNRI' && previousIsNRI !== value) {
			const applicantId = formApplicant.id as string | undefined;
			if (applicantId) {
				applyNriIncomeStashForApplicant(applicantId, value === 'Yes');
			}
		}
	}

	function handleFormFieldBlur(_index: number, key: string, _value: unknown) {
		formApplicant = {
			...formApplicant,
			touchedFields: {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {}),
				[key]: true
			}
		};
	}

	function onValidateIndividual(
		_applicant: Record<string, unknown>,
		_index: number,
		key: string
	): string | null {
		return validateIndividualField(key, formApplicant[key]);
	}

	// ═══════════════════════════════════════════════════════════════════
	// FIELD HANDLERS — Company
	// ═══════════════════════════════════════════════════════════════════

	function updateCompanyField(_index: number, key: string, value: unknown) {
		formState.applicantStepTouched = true;
		globalError = '';

		// Guard: changing hasRelatedDirectors to 'no' when family relationships exist
		if (key === 'hasRelatedDirectors' && value === 'no') {
			const rels = get(userRelationships);
			const hasFamilyRel = rels.some(
				(r) =>
					!r.relationType.toLowerCase().includes('friend') &&
					!r.relationType.toLowerCase().includes('business')
			);
			if (hasFamilyRel) {
				openConfirmModal(
					'Family Relationships Exist',
					'You have already defined family relationships on the Relationships page. Setting "not related" contradicts that. Please remove those relationships first if stakeholders are truly unrelated.',
					() => {
						closeConfirmModal();
					},
					{ confirmLabel: 'OK', cancelLabel: null }
				);
				return; // Don't update the field
			}
		}

		companyForm = {
			...companyForm,
			[key]: value,
			touchedFields: { ...((companyForm.touchedFields as Record<string, boolean>) ?? {}) }
		};
		const error = validateCompanyField(key, value);
		if (error) {
			companyErrors = { ...companyErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = companyErrors;
			companyErrors = rest;
		}
		// FEMA warning: foreign-registered companies are not supported.
		// Reset on EVERY dismissal path — `cancelLabel: null` hides the
		// Cancel button, so the reset only runs via the canonical
		// dismissConfirmModal path (X / Escape / backdrop / route change)
		// when we wire it as `onCancel`. Without that, dismissing the modal
		// leaves "Foreign Country" silently saved. See docs/PITFALLS.md
		// Pitfall #39.
		if (key === 'registrationCountry' && value !== 'India' && value !== '') {
			const resetToIndia = () => {
				companyForm = { ...companyForm, registrationCountry: 'India' };
				const { registrationCountry: _, ...rest } = companyErrors;
				companyErrors = rest;
			};
			openConfirmModal(
				'Foreign Company Not Supported',
				'Foreign-registered companies face significant restrictions for loan approvals in India. Most Indian lenders do not extend credit to foreign entities. Please register an Indian entity or apply as an Individual (NRI/OCI).',
				resetToIndia,
				{ confirmLabel: 'I understand', cancelLabel: null, onCancel: resetToIndia }
			);
			return;
		}
		// Company name detection for recovery
		if (key === 'companyName') {
			const nameValue = String(value || '').trim();
			if (nameValue.length >= 2) detectCachedCompanyForForm();
			else applicantState.clearAllRestoreAsked();
		}
	}

	function detectCachedCompanyForForm() {
		if (!companyForm.applicantType) return;
		const detectionKey = buildDetectionKey(companyForm);
		if (!detectionKey) return;
		if (applicantState.hasRestoreAsked(detectionKey)) return;
		const nameValue = companyForm.companyName;
		if (!nameValue || String(nameValue).trim().length < 2) return;
		const alreadyAddedSignatures = new Set(
			formState.applicants
				.filter((a) => a.applicantType === 'Company')
				.map((a) => buildMatchSignature(a as Record<string, unknown>))
				.filter(Boolean) as string[]
		);
		const sameScopeRaw = applicantState
			.findRecoverableByName(companyForm, COMPANY_SCOPE)
			.filter((entry) => !alreadyAddedSignatures.has(entry.matchSignature));
		const sameScopeMatches = applicantState
			.filterDeniedMatches(sameScopeRaw)
			.sort((a, b) => b.deletedAt - a.deletedAt)
			.map((m) => ({
				uuid: m.uuid,
				displayName: m.displayName,
				deletedAt: m.deletedAt,
				data: m.data,
				summary: m.summary,
				loanProduct: m.loanProduct
			}));

		// Companies don't get cross-loan suggestions (Company entries only suit business/secured)
		// so COMPANY_SCOPE cross-loan is handled by the compatibility matrix naturally.
		const namePrefix = String(nameValue).trim();
		const crossLoanRaw = applicantState.findCrossLoanSuggestions(
			namePrefix,
			COMPANY_SCOPE,
			categoryFromScope(COMPANY_SCOPE)
		);
		const crossLoanMatches = applicantState
			.filterDeniedMatches(crossLoanRaw)
			.sort((a, b) => b.deletedAt - a.deletedAt)
			.map((m) => ({
				uuid: m.uuid,
				displayName: m.displayName,
				deletedAt: m.deletedAt,
				data: m.data,
				summary: m.summary,
				loanProduct: m.loanProduct,
				roleWarning: m.compatibility?.warning,
				isCrossLoan: true as const
			}));

		const allMatches = [...sameScopeMatches, ...crossLoanMatches];
		if (allMatches.length === 0) return;
		applicantState.markRestoreAsked(detectionKey);
		const companyIndex = formState.applicants.findIndex((a) => a.applicantType === 'Company');
		// Pitfall #32: pass slot type hints so the Restore guard can refuse
		// cross-type / cross-companyType restores even when there's no
		// existing slot to inspect (push-new path).
		restoreIntentState.set({
			open: true,
			currentIndex: companyIndex >= 0 ? companyIndex : formState.applicants.length,
			matches: allMatches,
			detectionKey,
			recoveryScope: COMPANY_SCOPE,
			slotApplicantType: 'Company',
			slotCompanyType: (entityConfig?.companyType as string | undefined) ?? ''
		});
	}

	function handleCompanyFieldBlur(_index: number, key: string, _value: unknown) {
		companyForm = {
			...companyForm,
			touchedFields: {
				...((companyForm.touchedFields as Record<string, boolean>) ?? {}),
				[key]: true
			}
		};
	}

	function onValidateCompany(
		_applicant: Record<string, unknown>,
		_index: number,
		key: string
	): string | null {
		return validateCompanyField(key, companyForm[key]);
	}

	// ═══════════════════════════════════════════════════════════════════
	// SAVE / EDIT / DELETE
	// ═══════════════════════════════════════════════════════════════════

	function _saveCompany() {
		hasTriedCompany = true;
		const errors = getCompanyErrors(companyForm as LegacyApplicant);
		if (Object.keys(errors).length > 0) {
			companyErrors = errors;
			const touched: Record<string, boolean> = {
				...((companyForm.touchedFields as Record<string, boolean>) ?? {})
			};
			for (const key of Object.keys(errors)) touched[key] = true;
			companyForm = { ...companyForm, touchedFields: touched };
			return;
		}
		const snapshot = $state.snapshot(companyForm) as Record<string, unknown>;
		snapshot.companyType = entityConfig?.companyType;
		if (isCompanySaved) {
			const updated = [...formState.applicants];
			const companyIdx = updated.findIndex((a) => a.applicantType === 'Company');
			if (companyIdx >= 0) updated[companyIdx] = snapshot;
			formState.replaceApplicants(updated);
		} else {
			formState.replaceApplicants([snapshot, ...formState.applicants]);
		}
		isCompanySaved = true;
		_isEditingCompany = false;
		globalError = '';
	}

	function startEditCompany() {
		_isEditingCompany = true;
		const existing = formState.applicants.find((a) => a.applicantType === 'Company');
		if (existing) companyForm = { ...existing };
	}

	/**
	 * Remove the company row + all its directors/partners.
	 *
	 * Business Loan REQUIRES a Company as the primary applicant — so "delete"
	 * here means "clear everything and return to entity-type selection", not
	 * "leave the form in a director-without-company state". All deleted records
	 * are saved to the recovery bin, mirroring the existing sole-prop ↔ company
	 * crossover behavior in selectEntityType. User confirmation is required
	 * because this is a destructive action with cascading effects.
	 *
	 * Surfaced from the trash icon on the company row in ApplicantSummaryTable
	 * (2026-05-02 user request — previously the only way to start over was
	 * the global Clear Form button or switching to Sole Proprietorship).
	 */
	function handleDeleteCompany() {
		const filledDirectors = directorForms.filter((d) => d.fullName?.trim()).length;
		const message = filledDirectors > 0
			? `This will remove the company and all ${filledDirectors} director(s)/partner(s). Their data will be moved to the recovery bin (you can restore later by re-entering matching names). You will return to the entity-type selection. Continue?`
			: `This will clear the company details. The data will be moved to the recovery bin (you can restore later). You will return to the entity-type selection. Continue?`;

		openConfirmModal(
			'Remove company and start over?',
			message,
			() => {
				// 1. Save every applicant to recovery bin (consistent with sole-prop crossover)
				for (const applicant of formState.applicants) {
					if (!applicant.applicantType || !applicant.id) continue;
					const matchSignature = buildMatchSignature(applicant);
					if (!matchSignature) continue;
					const isCompany = applicant.applicantType === 'Company';
					const displayName = isCompany
						? (applicant.companyName as string) || 'Unnamed Company'
						: (applicant.fullName as string) || 'Unnamed';
					const scope = isCompany ? COMPANY_SCOPE : individualScope;
					applicantState.removeToRecovery(
						applicant.id as string,
						$state.snapshot(applicant) as Record<string, unknown>,
						displayName,
						matchSignature,
						scope
					);
				}
				// 2. Clear all applicants, relationships, income profiles
				formState.replaceApplicants([]);
				clearAllRelationships();
				incomeProfileStore.clearAll();
				// 3. Clear entity type → user lands back on the tile selector
				formState.replaceApplicationData({
					...formState.applicationData,
					businessEntityType: ''
				});
				// 4. Reset all local state
				directorForms = [];
				editingIndex = null;
				editingDirectorIdx = null;
				directorModalOpen = false;
				directorError = '';
				isCompanySaved = false;
				resetCompanyForm();
				resetIndividualForm();
				globalError = '';
				entityChangeWarning = '';
				// 5. Reset auto-save dedup keys — without this, when the user re-creates
				// a company with the same name/country/stakeholder count as before,
				// the auto-save $effect short-circuits (key === lastAutoSaveKey) and
				// never runs, so isCompanySaved stays false and the directors table
				// never appears. Detected 2026-05-02 (user report: "Table missing").
				lastAutoSaveKey = '';
				lastSolePropSyncKey = '';
			},
			{ confirmLabel: 'Yes, Remove', cancelLabel: 'Cancel' }
		);
	}

	function resetIndividualForm() {
		formApplicant = {
			id: uuidv4(),
			applicantType: 'Individual',
			isNRI: 'No',
			touchedFields: {}
		};
		formErrors = {};
		hasTriedToAdd = false;
		applicantState.clearAllRestoreAsked();
	}

	function resetCompanyForm() {
		companyForm = {
			id: uuidv4(),
			applicantType: 'Company',
			companyType: entityConfig?.companyType,
			onEMI: true,
			onProperty: false,
			touchedFields: {}
		};
		if (entityConfig?.isOPC) {
			companyForm.numberOfDirectorsOrPartners = '1';
		}
		companyErrors = {};
		hasTriedCompany = false;
	}

	// ═══════════════════════════════════════════════════════════════════
	// CACHED APPLICANT DETECTION
	// ═══════════════════════════════════════════════════════════════════

	function detectCachedApplicantForForm() {
		if (!formApplicant.applicantType) return;
		const detectionKey = buildDetectionKey(formApplicant);
		if (!detectionKey) return;
		if (applicantState.hasRestoreAsked(detectionKey)) return;
		const nameValue = formApplicant.fullName;
		if (!nameValue || String(nameValue).trim().length < 2) return;
		const alreadyAddedSignatures = new Set(
			formState.applicants
				.filter((_, i) => i !== editingIndex)
				.map((a) => buildMatchSignature(a as Record<string, unknown>))
				.filter(Boolean) as string[]
		);
		const sameScopeRaw = applicantState
			.findRecoverableByName(formApplicant, individualScope)
			.filter((entry) => !alreadyAddedSignatures.has(entry.matchSignature));
		const sameScopeMatches = applicantState
			.filterDeniedMatches(sameScopeRaw)
			.sort((a, b) => b.deletedAt - a.deletedAt)
			.map((m) => ({
				uuid: m.uuid,
				displayName: m.displayName,
				deletedAt: m.deletedAt,
				data: m.data,
				summary: m.summary,
				loanProduct: m.loanProduct,
				employmentType: m.employmentType
			}));

		const namePrefix = String(nameValue).trim();
		const crossLoanRaw = applicantState.findCrossLoanSuggestions(
			namePrefix,
			individualScope,
			categoryFromScope(individualScope)
		);
		const crossLoanMatches = applicantState
			.filterDeniedMatches(crossLoanRaw)
			.sort((a, b) => b.deletedAt - a.deletedAt)
			.map((m) => ({
				uuid: m.uuid,
				displayName: m.displayName,
				deletedAt: m.deletedAt,
				data: m.data,
				summary: m.summary,
				loanProduct: m.loanProduct,
				employmentType: m.employmentType,
				roleWarning: m.compatibility?.warning,
				isCrossLoan: true as const
			}));

		const allMatches = [...sameScopeMatches, ...crossLoanMatches];
		if (allMatches.length === 0) return;
		applicantState.markRestoreAsked(detectionKey);
		// Sole proprietorship has at most ONE Individual slot (the proprietor —
		// it is the same single inline form, not a multi-applicant table). When
		// the DSA renames the proprietor enough to trigger a recovery match,
		// restoration must REPLACE that existing slot, not append a new one.
		// `formState.applicants.length` was the previous default — fine for the
		// company/director path (where each director gets a fresh slot at the
		// end), but wrong for sole prop because it pointed at length=1 when
		// slot 0 already held the auto-saved partial rename. The handler then
		// pushed the restored entry as slot 1, leaving slot 0's stale "ka"
		// alongside the restored "kaira" — the Relationships dropdown surfaced
		// both, the Case Route showed Applicants: 2, and on remount onMount's
		// `find()` returned slot 0 ("ka") so the form rolled back. Detected
		// 2026-05-05.
		const existingSolePropIdx = isSoleProp
			? formState.applicants.findIndex((a) => a.applicantType === 'Individual')
			: -1;
		const targetIndex =
			existingSolePropIdx >= 0
				? existingSolePropIdx
				: (editingIndex ?? formState.applicants.length);
		restoreIntentState.set({
			open: true,
			currentIndex: targetIndex,
			matches: allMatches,
			detectionKey,
			recoveryScope: individualScope,
			slotApplicantType: 'Individual'
		});
	}

	// ═══════════════════════════════════════════════════════════════════
	// EXPORTED METHODS
	// ═══════════════════════════════════════════════════════════════════

	export function validateStep(): boolean {
		if (!entityType) {
			globalError = 'Please select a business entity type.';
			return false;
		}
		if (isSoleProp) {
			// Sole prop: validate form fields and auto-save on Next
			hasTriedToAdd = true;
			const errors: Record<string, string> = {};
			for (const q of PROP_QUESTIONS) {
				const error = validateIndividualField(q.key, formApplicant[q.key]);
				if (error) errors[q.key] = error;
			}
			if (Object.keys(errors).length > 0) {
				formErrors = errors;
				const touched: Record<string, boolean> = {
					...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
				};
				for (const key of Object.keys(errors)) touched[key] = true;
				formApplicant = { ...formApplicant, touchedFields: touched };
				globalError = 'Please complete all required fields.';
				return false;
			}
			// Auto-save proprietor to formState.applicants
			const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
			snapshot.applicantSubType = 'sole_proprietor';
			snapshot.selectedIncomeProfiles = getAutoSelectedProfiles({
				loanCategory: 'business',
				applicantType: 'Individual',
				businessEntityType: entityType
			});
			// Sole proprietor is the borrower — always on EMI, no property
			snapshot.onEMI = true;
			snapshot.onProperty = false;
			const existingIdx = formState.applicants.findIndex((a) => a.id === formApplicant.id);
			if (existingIdx >= 0) {
				const updated = [...formState.applicants];
				updated[existingIdx] = snapshot;
				formState.replaceApplicants(updated);
			} else {
				formState.replaceApplicants([...formState.applicants, snapshot]);
			}
			formState.applicantStepTouched = true;
		} else {
			// Company path: validate and auto-save company details on Next
			hasTriedCompany = true;
			const errors = getCompanyErrors(companyForm as LegacyApplicant);
			if (Object.keys(errors).length > 0) {
				companyErrors = errors;
				globalError = 'Company details are incomplete.';
				return false;
			}
			// Auto-save company to formState
			const snapshot = $state.snapshot(companyForm) as Record<string, unknown>;
			snapshot.companyType = entityConfig?.companyType;
			if (isCompanySaved) {
				const updated = [...formState.applicants];
				const companyIdx = updated.findIndex((a) => a.applicantType === 'Company');
				if (companyIdx >= 0) updated[companyIdx] = snapshot;
				formState.replaceApplicants(updated);
			} else {
				formState.replaceApplicants([snapshot, ...formState.applicants]);
			}
			isCompanySaved = true;

			// Validate all directors are complete
			const memberLabel = entityConfig?.memberLabel ?? 'Director';
			const dirErrors = validateAllDirectors(
				directorForms,
				true,
				memberLabel,
				entityConfig?.companyType
			);
			if (dirErrors.length > 0) {
				directorError = dirErrors[0];
				globalError = dirErrors[0];
				return false;
			}
			directorError = '';

			// Commit directors to formState
			const companyId = snapshot.id as string;
			const role = ROLE_MAP[entityConfig?.companyType ?? ''] ?? 'director';
			let newApplicants = commitDirectorsToApplicants(
				companyId,
				$state.snapshot(directorForms) as DirectorForm[],
				formState.applicants as Array<Record<string, unknown>>,
				role
			);
			// Sync auto-income entries on linked Individuals — parity with HL.
			// See handleDirectorSave above for full rationale (Pitfall #29 + #44).
			newApplicants = newApplicants.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				return {
					...a,
					incomeEntries: syncAutoIncomeEntries(ids, newApplicants, existing, name)
				};
			});
			formState.replaceApplicants(newApplicants);
		}
		globalError = '';
		return true;
	}
</script>

<div>
	<!-- ── Entity Type Selector — always visible ── -->
	<div class="mt-4 space-y-3">
		<p class="text-sm font-semibold text-[var(--form-text-label)]">
			What type of business entity is this?
		</p>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each ENTITY_OPTIONS as opt (opt.value)}
				<button
					onclick={() => requestEntityChange(opt.value)}
					class="flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all
						{entityType === opt.value
						? 'border-primary bg-primary/10 shadow-md'
						: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:border-primary/50 hover:shadow-md'}"
				>
					<opt.icon size={20} class="shrink-0 text-primary" />
					<div>
						<p class="text-sm font-semibold text-[var(--form-text)]">{opt.label}</p>
						<p class="mt-0.5 text-[10px] text-[var(--form-text-secondary)]">{opt.description}</p>
					</div>
				</button>
			{/each}
		</div>
	</div>

	{#if isSoleProp}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SOLE PROPRIETORSHIP PATH                                    -->
		<!-- ════════════════════════════════════════════════════════════ -->

		{#if globalError}
			<div
				data-error="true"
				class="mt-3 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			>
				<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
				<p class="text-sm font-medium text-red-600 dark:text-red-400">{globalError}</p>
			</div>
		{/if}

		<!-- Sole Prop: single inline form, saved on Next (no Add button, no table) -->
		<fieldset
			class="relative mt-4 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 pt-3 pb-4 transition-all"
		>
			<legend class="px-2 text-sm font-semibold text-[var(--form-text-label)]">
				Proprietor Details
			</legend>
			<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
				{#each PROP_QUESTIONS as q (q.key)}
					<QuestionRenderer
						{q}
						index={0}
						applicant={formApplicant}
						applicationData={formState.applicationData}
						applicantErrors={{ 0: formErrors }}
						showValidationErrors={hasTriedToAdd}
						isTouched={(formApplicant.touchedFields as Record<string, boolean>)?.[q.key] === true}
						onValidate={onValidateIndividual}
						onFieldChange={updateFormField}
						onFieldBlur={handleFormFieldBlur}
						disabled={q.key === 'isNRI'}
					/>
				{/each}
			</div>
		</fieldset>
	{:else if entityConfig}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- COMPANY PATH                                                -->
		<!-- ════════════════════════════════════════════════════════════ -->

		{#if entityChangeWarning}
			<div
				class="mt-3 mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
			>
				<CircleAlert size="20" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
				<p class="text-sm font-medium text-amber-600 dark:text-amber-400">{entityChangeWarning}</p>
			</div>
		{/if}

		{#if globalError}
			<div
				data-error="true"
				class="mt-3 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			>
				<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
				<p class="text-sm font-medium text-red-600 dark:text-red-400">{globalError}</p>
			</div>
		{/if}

		<!-- ── Company Details Section — always open, saved on Next ── -->
		<fieldset
			class="relative mt-4 rounded-xl border border-blue-200 bg-blue-50/50 px-4 pt-3 pb-4 dark:border-blue-800 dark:bg-blue-900/10"
		>
			<legend class="flex items-center gap-2 px-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
				<span>Company Details</span>
				<!-- Entity type badge — derived from selected entity tile, reactively updates
				     when the user switches between Partnership / LLP / Pvt Ltd / OPC -->
				<span
					class="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 uppercase dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
				>
					<Building2 size={11} />
					{entityConfig.companyType}
				</span>
			</legend>
			<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
				{#each visibleCompanyQuestions as q (q.key)}
					<QuestionRenderer
						{q}
						index={0}
						applicant={companyForm}
						applicationData={formState.applicationData}
						applicantErrors={{ 0: companyErrors }}
						showValidationErrors={hasTriedCompany}
						isTouched={(companyForm.touchedFields as Record<string, boolean>)?.[q.key] === true}
						onValidate={onValidateCompany}
						onFieldChange={updateCompanyField}
						onFieldBlur={handleCompanyFieldBlur}
						disabled={q.key === 'numberOfDirectorsOrPartners' && !!entityConfig?.isOPC}
						lockedLabel={q.key === 'numberOfDirectorsOrPartners' && entityConfig?.isOPC
							? '1 — OPC has a single director'
							: undefined}
					/>
				{/each}
			</div>
		</fieldset>

		<!--
			No SuggestPrimaryBanner here — intentional design.
			Business Loan requires a Company as primary applicant. Individuals are
			directors/guarantors only. Swapping primary to an Individual would break
			lender-matching (lenders assess firms, not individuals) and payload semantics
			(Company fields are required at index 0). Individual-only Business Loans are
			not supported. Confirmed 2026-04-23. See docs/APPLICANT-STATE-AUDIT-2026-04-23.md §0.
		-->

		<!-- ── Director/Partner Summary Table + Modal ── -->
		{#if isCompanySaved && directorForms.length > 0}
			<!--
				Delete (trash) icon on the company row triggers handleDeleteCompany
				which shows a confirmation modal explaining what will be removed and
				where the data goes (recovery bin). Confirmed action returns the user
				to the entity-type selection. This is in addition to the entity-type
				tile selector (which now also confirms changes via requestEntityChange)
				and the global Clear Form button. (2026-05-02)
			-->
			<ApplicantSummaryTable
				sortedEntries={companySortedEntries}
				editingIndex={null}
				hasRoleQuestions={false}
				showClassificationBadge={true}
				applicantRoleErrors={[]}
				duplicateIndexes={new Set()}
				pendingHighlightIndexes={new Set()}
				applicantCount={companySortedEntries.length}
				onEdit={() => startEditCompany()}
				onDelete={() => handleDeleteCompany()}
				getDisplayName={getCompanyDisplayName}
				getStatus={getCompanyStatus}
				directorRows={directorRowsMap}
				onEditDirector={handleEditDirector}
			/>

			{#if directorError}
				<div
					data-error="true"
					class="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
				>
					<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
					<p class="text-sm font-medium text-red-600 dark:text-red-400">{directorError}</p>
				</div>
			{/if}

			<!-- Borrowing-firm declaration is validated on the partner's income step
			     (Next-before-navigate), NOT here — see checkBorrowingFirmDeclaration. -->

			<!-- ── Stake Total Footer ── -->
			{#if stakeRule !== 'none' && directorForms.length > 0}
				<div
					class="mt-2 flex items-center justify-between rounded-lg border px-3 py-2 text-sm
					{stakeValid
						? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
						: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'}"
				>
					<span
						class="font-medium {stakeValid
							? 'text-emerald-700 dark:text-emerald-400'
							: 'text-red-600 dark:text-red-400'}"
					>
						Total Stake: {stakeTotal}%
					</span>
					{#if !stakeValid}
						<span class="text-xs text-red-500 dark:text-red-400">
							{stakeRule === 'exact_100' ? 'Must equal exactly 100%' : 'Cannot exceed 100%'}
						</span>
					{/if}
				</div>
			{/if}

			<!-- ── Partnership Dissolution Risk Banner ── -->
			{#if isPartnershipDissolutionRisk}
				<div
					class="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
				>
					<Info size="18" class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
					<p class="text-xs text-blue-700 dark:text-blue-300">
						Two-partner firms have dissolution risk if one partner exits. Lenders may factor this
						into assessment.
					</p>
				</div>
			{/if}
		{/if}

		{#if directorModalOpen && editingDirectorIdx !== null && editingDirectorIdx < directorForms.length}
			{@const currentCompanyId =
				(formState.applicants.find((a) => a.applicantType === 'Company')?.id as
					| string
					| undefined) ?? undefined}
			<DirectorFormModal
				bind:open={directorModalOpen}
				directorIndex={editingDirectorIdx}
				memberLabel={entityConfig?.memberLabel ?? 'Director'}
				initialData={directorForms[editingDirectorIdx]}
				allForms={directorForms}
				isUnsecured={true}
				companyType={entityConfig?.companyType ?? ''}
				{currentCompanyId}
				applicants={formState.applicants as Array<Record<string, unknown>>}
				recoveryScope="business::director"
				onSave={handleDirectorSave}
				onClose={handleDirectorModalClose}
			/>
		{/if}

		{#if showRemovePicker}
			<DirectorRemovePickerModal
				bind:open={showRemovePicker}
				memberLabel={entityConfig?.memberLabel ?? 'Director'}
				filledDirectors={removePickerFilled}
				targetCount={removePickerTargetCount}
				onConfirm={handleRemovePickerConfirm}
				onCancel={handleRemovePickerCancel}
			/>
		{/if}
	{/if}
</div>
