<script lang="ts">
	/**
	 * AddApplicantProfessional — Step 0 for Professional Loan
	 * ═══════════════════════════════════════════════════════════════════
	 * 3-way split:
	 *   A: Individual → Single professional applying alone (lock to 1)
	 *   B: Joint → Two or more professionals applying together (2+ required)
	 *   C: Company / Firm → Professional firm identity details only
	 *      (name, type, country, partner count, hasRelatedDirectors).
	 *      Partners captured in Step 0.5 (DirectorCards).
	 * Income auto-select: professional_practice for all individuals
	 * ═══════════════════════════════════════════════════════════════════
	 */
	import {
		CircleAlert,
		CirclePlus,
		Info,
		Trash2,
		Pencil,
		Building2,
		User,
		Users,
		Lock
	} from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import type { LegacyApplicant } from '$lib/stores/loanData';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import ApplicantSummaryTable, { type DirectorDisplayRow } from './ApplicantSummaryTable.svelte';
	import DirectorFormModal from './DirectorFormModal.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		buildDetectionKey,
		buildMatchSignature,
		applicantState,
		type RecoveryScope
	} from '$lib/state/applicant.svelte';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import {
		userRelationships,
		removeRelationshipsBatch,
		getRelationshipsForApplicant
	} from '$lib/components/relationship-capture/relationshipStore';
	import { openConfirmModal, closeConfirmModal } from '$lib/stores/confirmModal';
	import { captureRelationshipsForRecovery } from '$lib/utils/restoreRelationships';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import { getAutoSelectedProfiles } from '$lib/config/incomeProfiles/profileCards';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import {
		type DirectorForm,
		ROLE_MAP,
		MEMBER_LABEL_MAP,
		isCardComplete,
		initDirectorForms,
		commitDirectorsToApplicants,
		validateAllDirectors,
		createEmptyDirectorForm,
		recomputeStakeAfterEntityChange,
		resizeDirectorForms,
		getStakeValidationRule,
		getMinDirectors,
		checkOpcDuplicate
	} from '$lib/utils/directorFormUtils';
	import { syncAutoIncomeEntries } from '$lib/utils/directorAutoIncome';
	import { applyNriIncomeStashForApplicant } from '$lib/utils/unsecuredApplicantHandlers';
	import type { IncomeSourceEntry } from '$lib/types/incomeProfile';
	import type { DirectorRestorePayload } from '$lib/utils/directorRestoreHandler';
	import DirectorRemovePickerModal from './DirectorRemovePickerModal.svelte';
	import ApplicantKeepPickerModal, {
		type PickableApplicant
	} from './ApplicantKeepPickerModal.svelte';
	import {
		BASE_INDIVIDUAL_QUESTIONS,
		PROFESSIONAL_CATEGORY_QUESTION,
		PROFESSIONAL_COMPANY_QUESTIONS
	} from '$lib/config/applicantQuestions';
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

	const MAX_APPLICANTS = 8;
	const COMPANY_SCOPE: RecoveryScope = 'professional::company';

	// ═══════════════════════════════════════════════════════════════════
	// APPLICANT TYPE SELECTION
	// ═══════════════════════════════════════════════════════════════════

	type ApplicantType = 'individual' | 'joint' | 'company' | null;
	let applicantType: ApplicantType = $state(null);

	/** Read professionalApplicantType from loan-level answers (same pattern as getLoanLevelProfCategory) */
	function getLoanLevelApplicantType(): ApplicantType {
		const ld = formState.loanData as Record<string, unknown>;
		const loanAnswers = (ld?.['Professional Loan'] ?? {}) as Record<string, unknown>;
		const val = (loanAnswers.professionalApplicantType as string) || '';
		if (['individual', 'joint', 'company'].includes(val)) return val as ApplicantType;
		return null;
	}

	// Applicant type is set on the Loan Requirements page (professionalApplicantType).
	// Loan-level answer is the source of truth — if it conflicts with existing
	// applicants (e.g., user went Company then switched to Joint), clean up stale data.
	onMount(() => {
		closeConfirmModal();

		// Read from loan-level answer (authoritative source)
		const loanLevelType = getLoanLevelApplicantType();

		if (loanLevelType) {
			applicantType = loanLevelType;

			// Clean up applicants that don't match the selected type
			const hasCompany = formState.applicants.some((a) => a.applicantType === 'Company');
			const individuals = formState.applicants.filter((a) => a.applicantType === 'Individual');

			if (loanLevelType === 'company') {
				// Company path — restore company form from existing applicant
				if (hasCompany) {
					const existing = formState.applicants.find((a) => a.applicantType === 'Company');
					if (existing) {
						companyForm = { ...existing };
						isCompanySaved = true;
					}
				}
			} else {
				// Individual or Joint path — remove any stale Company applicant
				// and its linked directors from a previous Company selection
				if (hasCompany) {
					const companyId = formState.applicants.find((a) => a.applicantType === 'Company')?.id;
					const cleaned = formState.applicants.filter((a) => {
						// Remove the Company applicant itself
						if (a.applicantType === 'Company') return false;
						// Remove directors that were linked to it
						if (companyId && a.linkedCompanyId === companyId) return false;
						return true;
					});
					formState.replaceApplicants(cleaned);
				}

				// Joint → Individual reconciliation: if the loan-level answer is
				// "individual" but we already have 2+ Individual applicants on
				// record (from a previous Joint session), ask the user which one
				// to keep rather than silently dropping data.
				if (loanLevelType === 'individual') {
					const individualsNow = formState.applicants.filter(
						(a) => a.applicantType === 'Individual'
					);
					if (individualsNow.length > 1) {
						// Reset any stale inner-wizard step recorded during the prior
						// multi-applicant session. Without this, the outer nav bar may
						// show a "Show Offers" button (step 3 + last page) while the
						// modal is open, which is confusing.
						formState.applicantPageIndex = 0;

						applicantPickerCandidates = individualsNow.map((a) => ({
							id: String(a.id ?? ''),
							fullName: (a.fullName as string) ?? '',
							age: (a.age as string | number | undefined) ?? '',
							gender: (a.gender as string | undefined) ?? ''
						}));
						applicantPickerKeepCount = 1;
						showApplicantKeepPicker = true;
					}
				}
			}
		} else {
			// No loan-level answer (backward compat) — infer from existing applicants
			const hasCompany = formState.applicants.some((a) => a.applicantType === 'Company');
			const individuals = formState.applicants.filter((a) => a.applicantType === 'Individual');
			if (hasCompany) {
				applicantType = 'company';
				const existing = formState.applicants.find((a) => a.applicantType === 'Company');
				if (existing) {
					companyForm = { ...existing };
					isCompanySaved = true;
				}
			} else if (individuals.length > 1) {
				applicantType = 'joint';
			} else if (individuals.length === 1) {
				applicantType = 'individual';
			}
		}
	});

	const isIndividualPath = $derived(applicantType === 'individual' || applicantType === 'joint');
	const isCompanyMode = $derived(applicantType === 'company');

	/** Recovery scope for individual applicants — individual practitioner vs firm partner */
	const individualScope = $derived<RecoveryScope>(
		isCompanyMode ? 'professional::partner' : 'professional::individual'
	);

	// ═══════════════════════════════════════════════════════════════════
	// Session 33: Label lookup for professionalCategory badge
	const PROF_CATEGORY_LABELS: Record<string, string> = {
		doctor: 'Doctor / Medical',
		ca: 'Chartered Accountant (CA)',
		lawyer: 'Lawyer / Advocate',
		architect: 'Architect'
	};

	// QUESTION DEFINITIONS (shared from applicantQuestions.ts)
	// ═══════════════════════════════════════════════════════════════════

	const INDIVIDUAL_QUESTIONS = [...BASE_INDIVIDUAL_QUESTIONS, PROFESSIONAL_CATEGORY_QUESTION];
	const COMPANY_QUESTIONS = PROFESSIONAL_COMPANY_QUESTIONS;

	// ═══════════════════════════════════════════════════════════════════
	// FORM STATE
	// ═══════════════════════════════════════════════════════════════════

	let globalError = $state('');
	let hasTriedToAdd = $state(false);
	// restoreAskedForKey now lives in applicantState.restoreAskedKeys (CLAUDE.md Pitfall #30)

	// Individual form
	/** Pre-fill professionalCategory from loan-level answer (set on Loan Requirements page) */
	function getLoanLevelProfCategory(): string {
		const ld = formState.loanData as Record<string, unknown>;
		const loanAnswers = (ld?.['Professional Loan'] ?? {}) as Record<string, unknown>;
		return (loanAnswers.professionalCategory as string) || '';
	}

	let editingIndex: number | null = $state(null);
	let formApplicant: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: 'Individual',
		isNRI: 'No',
		touchedFields: {},
		professionalCategory: getLoanLevelProfCategory()
	});
	let formErrors: Record<string, string> = $state({});

	// Company form (company path only)
	let companyForm: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: 'Company',
		touchedFields: {}
	});
	let companyErrors: Record<string, string> = $state({});

	// Filter company questions (hide director-specific for OPC)
	const isOPC = $derived(companyForm.companyType === 'One Person Company (OPC)');
	// hasRelatedDirectors removed — auto-derived from relationship page
	const visibleCompanyQuestions = $derived(
		COMPANY_QUESTIONS.filter((q) => {
			// numberOfDirectorsOrPartners: always shown, disabled for OPC (handled by isFieldDisabled)
			if (q.key === 'hasRelatedDirectors') return false;
			return true;
		})
	);
	// OPC duplicate warning — warn if another OPC with same name exists
	const opcDuplicateWarning = $derived(
		checkOpcDuplicate(
			(companyForm.companyName as string) ?? '',
			(companyForm.companyType as string) ?? '',
			(companyForm.id as string) ?? '',
			formState.applicants as Array<Record<string, unknown>>
		)
	);

	let isCompanySaved = $state(false);
	let _isEditingCompany = $state(false);
	let hasTriedCompany = $state(false);

	// ── Director/Partner inline management ──────────────────────────
	let directorForms: DirectorForm[] = $state([]);
	let editingDirectorIdx: number | null = $state(null);
	let directorModalOpen = $state(false);
	let directorError = $state('');
	// Removal picker state
	let showRemovePicker = $state(false);
	let removePickerFilled: DirectorForm[] = $state([]);
	let removePickerTargetCount = $state(0);

	// ── Applicant reconciliation picker ─────────────────────────────
	// Shown when the loan-level applicant type is "Individual" but multiple
	// Individual applicants were previously entered (e.g., user started in
	// Joint mode, added 2 applicants, then switched back to Individual).
	// User must pick exactly one applicant to keep.
	let showApplicantKeepPicker = $state(false);
	let applicantPickerCandidates: PickableApplicant[] = $state([]);
	let applicantPickerKeepCount = $state(1);

	// ═══════════════════════════════════════════════════════════════════
	// DERIVED
	// ═══════════════════════════════════════════════════════════════════

	const individualApplicants = $derived(
		formState.applicants.filter((a) => a.applicantType === 'Individual')
	);

	const _companyApplicant = $derived(
		formState.applicants.find((a) => a.applicantType === 'Company')
	);

	const totalApplicantCount = $derived(formState.applicants.filter((a) => a.applicantType).length);

	// Individual: lock to 1 applicant. Joint: allow multiple.
	const canAddMore = $derived(
		applicantType === 'joint'
			? totalApplicantCount < MAX_APPLICANTS
			: individualApplicants.length === 0
	);

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
			formState.setApplicationField(
				'applicationStructure' as any,
				derivedApplicationStructure as any
			);
		}
	});

	// Completion status
	const applicantCompletionStatus = $derived.by(() => {
		return formState.applicants.map((applicant) => {
			if (!applicant.applicantType) return false;
			if (applicant.applicantType === 'Company') {
				return Object.keys(getCompanyErrors(applicant as LegacyApplicant)).length === 0;
			}
			return Object.keys(getIndividualErrors(applicant as LegacyApplicant)).length === 0;
		});
	});

	// Duplicate detection (individuals only)
	const duplicateIndexes = $derived.by(() => {
		const dup = new Set<number>();
		const applicants = formState.applicants as LegacyApplicant[];
		for (let i = 0; i < applicants.length; i++) {
			if (applicants[i]?.applicantType !== 'Individual') continue;
			for (let j = i + 1; j < applicants.length; j++) {
				if (applicants[j]?.applicantType !== 'Individual') continue;
				const a = applicants[i],
					b = applicants[j];
				const norm = (v: unknown) => (v ?? '').toString().trim().toLowerCase();
				if (
					norm(a.fullName) === norm(b.fullName) &&
					norm(a.age) === norm(b.age) &&
					norm(a.gender) === norm(b.gender)
				) {
					dup.add(i);
					dup.add(j);
				}
			}
		}
		return dup;
	});

	// Primary applicant MUST match loan-level profession. If mismatch detected
	// (e.g., after restore/reorder), block Next and show clear guidance.
	const loanProfCategory = $derived(getLoanLevelProfCategory());
	const hasProfCategoryMismatch = $derived.by(() => {
		if (!loanProfCategory) return false;
		const primary = formState.applicants.find((a: any) => a.applicantType === 'Individual');
		if (primary) {
			return !!primary.professionalCategory && primary.professionalCategory !== loanProfCategory;
		}
		return false;
	});

	// isNextEnabled + disabledReason — derived from actual validation state
	$effect(() => {
		if (!applicantType) {
			isNextEnabled = false;
			disabledReason = 'Go back to Loan Requirements and select who is applying';
			return;
		}
		if (applicantType === 'individual') {
			const hasOne = individualApplicants.length === 1;
			const allComplete =
				applicantCompletionStatus.length > 0 && applicantCompletionStatus.every(Boolean);
			isNextEnabled = hasOne && allComplete && !hasProfCategoryMismatch;
			if (individualApplicants.length === 0) {
				disabledReason = 'Add an applicant to continue';
			} else if (individualApplicants.length > 1) {
				// Common after switching Joint → Individual with multiple applicants still present
				disabledReason = showApplicantKeepPicker
					? 'Choose which applicant to keep'
					: 'Individual loan allows only one applicant — remove the extras';
			} else if (!allComplete) {
				disabledReason = 'Complete all required fields for the applicant';
			} else if (hasProfCategoryMismatch) {
				disabledReason = `Primary applicant must be a ${PROF_CATEGORY_LABELS[loanProfCategory] || loanProfCategory}`;
			} else {
				disabledReason = '';
			}
		} else if (applicantType === 'joint') {
			const hasEnough = individualApplicants.length >= 2;
			const allComplete =
				applicantCompletionStatus.length > 0 && applicantCompletionStatus.every(Boolean);
			isNextEnabled =
				hasEnough && allComplete && duplicateIndexes.size === 0 && !hasProfCategoryMismatch;
			if (!hasEnough) disabledReason = 'Add at least 2 applicants for a joint application';
			else if (!allComplete) disabledReason = 'Complete all required fields for every applicant';
			else if (duplicateIndexes.size > 0) disabledReason = 'Remove duplicate applicants';
			else if (hasProfCategoryMismatch)
				disabledReason = `Primary applicant (Applicant 1) must be a ${PROF_CATEGORY_LABELS[loanProfCategory] || loanProfCategory}`;
			else disabledReason = '';
		} else {
			// Company path: company fields valid + all directors complete
			const errors = getCompanyErrors(companyForm as LegacyApplicant);
			const companyValid = Object.keys(errors).length === 0;
			const ct = (companyForm.companyType as string) ?? '';
			const allDirectorsComplete =
				directorForms.length > 0 && directorForms.every((d) => isCardComplete(d, true, ct, true));
			isNextEnabled = companyValid && allDirectorsComplete;
			if (!companyValid) disabledReason = 'Complete all company/firm details';
			else if (!allDirectorsComplete) disabledReason = 'Complete all partner/director details';
			else disabledReason = '';
		}
	});

	// ── Auto-save company to formState when all fields are valid ──
	// This triggers director form initialization without waiting for Next click.
	let lastAutoSaveKey = '';
	$effect(() => {
		if (!isCompanyMode) return;
		// Track companyForm fields to react to changes
		const key = `${companyForm.companyName}|${companyForm.registrationCountry}|${companyForm.companyType}|${companyForm.numberOfDirectorsOrPartners}|${companyForm.hasRelatedDirectors}`;
		if (key === lastAutoSaveKey) return;
		const errors = getCompanyErrors(companyForm as LegacyApplicant);
		if (Object.keys(errors).length > 0) return;
		lastAutoSaveKey = key;
		// All company fields valid — auto-save
		const snapshot = $state.snapshot(companyForm) as Record<string, unknown>;
		if (!snapshot.professionalCategory) {
			snapshot.professionalCategory = getLoanLevelProfCategory();
		}
		// Professional firm is the borrower — on EMI, no property
		snapshot.onEMI = true;
		snapshot.onProperty = false;
		const existingIdx = formState.applicants.findIndex(
			(a) => a.applicantType === 'Company' || a.id === snapshot.id
		);
		if (existingIdx >= 0) {
			// Update in-place — never create a second company
			const updated = [...formState.applicants];
			updated[existingIdx] = snapshot;
			formState.replaceApplicants(updated);
		} else {
			// Professional Loan allows only ONE company — guard against duplicates
			const alreadyHasCompany = formState.applicants.some((a) => a.applicantType === 'Company');
			if (alreadyHasCompany) return;
			formState.replaceApplicants([snapshot, ...formState.applicants]);
		}
		isCompanySaved = true;
	});

	// ── Initialize director forms when company is saved or partner count changes ──
	$effect(() => {
		if (!isCompanyMode || !isCompanySaved) {
			directorForms = [];
			return;
		}
		const count = Number(companyForm.numberOfDirectorsOrPartners) || 1;
		if (directorForms.length === count) return;
		// Pass companyType so designation defaults are applied per entity type
		// (OPC → MD locked; Partnership → Partner; LLP → Designated Partner;
		// Pvt Ltd → Director default with MD as alternate). Keeps the table
		// status accurate without waiting for the modal to open.
		const createOpts = {
			isOPC,
			companyType: (companyForm.companyType as string) ?? ''
		};

		if (directorForms.length === 0) {
			// First init
			const company = formState.applicants.find((a) => a.applicantType === 'Company');
			directorForms = company
				? initDirectorForms(company as Record<string, unknown>, true)
				: Array.from({ length: count }, () => createEmptyDirectorForm(true, createOpts));
			while (directorForms.length < count) {
				directorForms = [...directorForms, createEmptyDirectorForm(true, createOpts)];
			}
			return;
		}

		// Count changed with existing forms — use smart resize
		const { forms, needsUserChoice } = resizeDirectorForms(directorForms, count, true);
		if (needsUserChoice.length > 0) {
			removePickerFilled = needsUserChoice;
			removePickerTargetCount = count;
			showRemovePicker = true;
		} else {
			directorForms = forms;
		}
	});

	// ── Derive director display rows for summary table ──────────────
	const directorRowsMap = $derived.by(() => {
		const company = formState.applicants.find((a) => a.applicantType === 'Company');
		if (!company?.id || directorForms.length === 0) return new Map<string, DirectorDisplayRow[]>();
		const ct = (company.companyType as string) ?? '';
		const companyId = company.id as string;
		const memberLabel = MEMBER_LABEL_MAP[ct] ?? 'Partner';
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
				name: d.fullName?.trim() || `${memberLabel} ${i + 1}`,
				role: memberLabel,
				isComplete: isCardComplete(d, true, ct, true),
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
			.map((a, i) => ({ applicant: a as Record<string, any>, originalIndex: i }))
	);

	function getCompanyDisplayName(applicant: Record<string, any>, _index: number): string {
		return applicant.companyName || 'Firm';
	}

	function getCompanyStatus(_applicant: Record<string, any>, _index: number): string {
		return isCompanySaved ? 'complete' : 'pending';
	}

	// ── Existing individuals for director linking (professional loan feature) ──
	const existingNonDirectorIndividuals = $derived(
		formState.applicants
			.filter((a) => a.applicantType === 'Individual' && !a.linkedCompanyId)
			.map((a) => ({
				id: a.id as string,
				name: (a.fullName as string) || 'Unnamed'
			}))
	);

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

		// Persist immediately so a Previous-click doesn't lose the saved data.
		// Parity with AddApplicantBusiness.handleDirectorSave. See CLAUDE.md Pitfall #25.
		const company = formState.applicants.find((a) => a.applicantType === 'Company');
		if (!company?.id) return;
		const companyId = company.id as string;
		const companyType = (company.companyType as string) ?? '';
		const role = ROLE_MAP[companyType] ?? 'partner';
		let newApplicants = commitDirectorsToApplicants(
			companyId,
			$state.snapshot(nextForms) as DirectorForm[],
			formState.applicants as Array<Record<string, unknown>>,
			role
		);
		// Professional Loan: all directors/partners are non-financial co-applicants.
		newApplicants = newApplicants.map((a) => {
			if (a.applicantType === 'Individual' && a.linkedCompanyId) {
				return { ...a, applicantClassification: 'co_applicant_non_financial' };
			}
			return a;
		});
		// Sync auto-income entries on linked Individuals — parity with HL.
		// Even though Professional Loan directors are non-financial co-applicants,
		// the income page reads incomeEntries to show the Director-in-Company
		// row; without this, the modal's Income Details tab is empty and the
		// company combobox can't auto-link. See CLAUDE.md Pitfall #29 + #44.
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

	function handleRemovePickerConfirm(keepIndexes: number[]) {
		const kept = keepIndexes.map((i) => removePickerFilled[i]);
		// Pass companyType so refilled empty forms get the correct designation default.
		const refillOpts = {
			isOPC,
			companyType: (companyForm.companyType as string) ?? ''
		};
		while (kept.length < removePickerTargetCount) {
			kept.push(createEmptyDirectorForm(true, refillOpts));
		}
		directorForms = kept;
		showRemovePicker = false;
		removePickerFilled = [];
	}

	function handleRemovePickerCancel() {
		companyForm = { ...companyForm, numberOfDirectorsOrPartners: String(directorForms.length) };
		showRemovePicker = false;
		removePickerFilled = [];
	}

	// ── Applicant keep picker handlers (Joint → Individual reconciliation) ──
	function handleApplicantKeepConfirm(keepIds: string[]) {
		const keepSet = new Set(keepIds);

		// Figure out which applicant ids are being dropped so we can purge
		// relationships that reference them (otherwise stale edges remain in
		// userRelationships pointing at non-existent applicants).
		const removedIds: string[] = [];
		for (const a of formState.applicants) {
			if (a.applicantType !== 'Individual') continue;
			const id = String(a.id ?? '');
			if (id && !keepSet.has(id)) removedIds.push(id);
		}

		// Retain only the chosen Individual(s); keep any non-Individual rows untouched
		// (should be none at this point, but defensive).
		const retained = formState.applicants.filter((a) => {
			if (a.applicantType !== 'Individual') return true;
			return keepSet.has(String(a.id ?? ''));
		});
		formState.replaceApplicants(retained);

		// Purge any user-captured relationship that involves a removed applicant.
		if (removedIds.length > 0) {
			const relIdsToRemove = new Set<string>();
			for (const removedId of removedIds) {
				for (const rel of getRelationshipsForApplicant(removedId)) {
					relIdsToRemove.add(rel.id);
				}
			}
			if (relIdsToRemove.size > 0) removeRelationshipsBatch(relIdsToRemove);
		}

		// Reset the inner applicant-page sub-step since any progress recorded
		// against removed applicants (e.g., multi-applicant step 3 "income")
		// is no longer valid.
		formState.applicantPageIndex = 0;

		showApplicantKeepPicker = false;
		applicantPickerCandidates = [];
	}

	function handleApplicantKeepCancel() {
		// User dismissed the picker without choosing. Nothing is removed — the
		// wizard will remain in an invalid state (Next disabled with a clear
		// reason) until the user either picks or adds/removes applicants
		// manually via the existing UI.
		showApplicantKeepPicker = false;
		applicantPickerCandidates = [];
	}

	// ── Partnership dissolution risk (2-partner firms) ──────────────
	const isPartnershipDissolutionRisk = $derived(
		(companyForm.companyType === 'Partnership Firm' || companyForm.companyType === 'LLP') &&
			directorForms.length === 2 &&
			isCompanySaved
	);

	// ── Stake total for director summary ──────────────────────────────
	const stakeTotal = $derived(
		directorForms.reduce((sum, d) => sum + (Number(d.ownershipPercent) || 0), 0)
	);
	const stakeRule = $derived(
		companyForm.companyType ? getStakeValidationRule(companyForm.companyType as string) : 'none'
	);
	const stakeValid = $derived(
		stakeRule === 'none' ? true : stakeRule === 'exact_100' ? stakeTotal === 100 : stakeTotal <= 100
	);

	// Restore modal sync
	// Session 33: Redesigned — restore adds directly to table (page-level onConfirm),
	// so when the modal closes we just reset the form instead of pre-filling it.
	let wasRestoreOpen = $state(false);
	$effect(() => {
		const isOpen = restoreIntentState.open;
		if (wasRestoreOpen && !isOpen) {
			// Modal closed (confirm or cancel). Reset forms to allow fresh input.
			editingIndex = null;
			resetIndividualForm();
		}
		wasRestoreOpen = isOpen;
	});

	// OPC auto-set
	$effect(() => {
		if (isOPC && companyForm.numberOfDirectorsOrPartners !== '1') {
			companyForm = { ...companyForm, numberOfDirectorsOrPartners: '1' };
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// VALIDATION
	// ═══════════════════════════════════════════════════════════════════

	// Validation wrappers — delegate to shared utilities with local context
	function validateIndividualField(key: string, value: unknown): string | null {
		return _validateIndividualField(key, value, { requireProfessionalCategory: true });
	}

	function validateCompanyField(key: string, value: unknown): string | null {
		return _validateCompanyField(key, value, {
			isOPC,
			companyType: (companyForm.companyType as string) ?? '',
			entityLabel: 'Firm'
		});
	}

	function getIndividualErrors(applicant: LegacyApplicant): Record<string, string> {
		return _getIndividualErrors(applicant as Record<string, unknown>, INDIVIDUAL_QUESTIONS, {
			requireProfessionalCategory: true
		});
	}

	function getCompanyErrors(applicant: LegacyApplicant): Record<string, string> {
		return _getCompanyErrors(applicant as Record<string, unknown>, visibleCompanyQuestions, {
			isOPC,
			companyType: (companyForm.companyType as string) ?? '',
			entityLabel: 'Firm'
		});
	}

	// ═══════════════════════════════════════════════════════════════════
	// FIELD HANDLERS — Individual
	// ═══════════════════════════════════════════════════════════════════

	function updateFormField(_index: number, key: string, value: unknown) {
		formState.applicantStepTouched = true;
		globalError = '';
		// Pitfall #57: capture previous isNRI before overwrite for stash/restore.
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

	function onValidateIndividual(_applicant: any, _index: number, key: string): string | null {
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
				return;
			}
		}

		companyForm = {
			...companyForm,
			[key]: value,
			touchedFields: { ...((companyForm.touchedFields as Record<string, boolean>) ?? {}) }
		};
		// OPC: force 1 partner. Non-OPC: clear if below minimum
		if (key === 'companyType') {
			if (value === 'One Person Company (OPC)') {
				companyForm.numberOfDirectorsOrPartners = '1';
			} else {
				const min = getMinDirectors(String(value));
				const current = Number(companyForm.numberOfDirectorsOrPartners) || 0;
				if (current < min) {
					companyForm.numberOfDirectorsOrPartners = '';
				}
			}
		}
		const error = validateCompanyField(key, value);
		if (error) {
			companyErrors = { ...companyErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = companyErrors;
			companyErrors = rest;
		}
		// Re-validate numberOfDirectorsOrPartners when companyType changes
		if (key === 'companyType') {
			const dirError = validateCompanyField(
				'numberOfDirectorsOrPartners',
				companyForm.numberOfDirectorsOrPartners
			);
			if (dirError) {
				companyErrors = { ...companyErrors, numberOfDirectorsOrPartners: dirError };
			} else {
				const { numberOfDirectorsOrPartners: _, ...rest } = companyErrors;
				companyErrors = rest;
			}
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
		// Pitfall #32: pass slot type hints (Company + companyType).
		restoreIntentState.set({
			open: true,
			currentIndex: companyIndex >= 0 ? companyIndex : formState.applicants.length,
			matches: allMatches,
			detectionKey,
			recoveryScope: COMPANY_SCOPE,
			slotApplicantType: 'Company',
			slotCompanyType: ((companyForm.companyType as string | undefined) ?? '')
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

	function onValidateCompany(_applicant: any, _index: number, key: string): string | null {
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
		// Inherit professionalCategory from loan-level answer
		if (!snapshot.professionalCategory) {
			snapshot.professionalCategory = getLoanLevelProfCategory();
		}
		// Professional firm is the borrower — on EMI, no property
		snapshot.onEMI = true;
		snapshot.onProperty = false;
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

	function saveIndividual() {
		formState.applicantStepTouched = true;
		hasTriedToAdd = true;
		const errors: Record<string, string> = {};
		for (const q of INDIVIDUAL_QUESTIONS) {
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
			return;
		}
		// Validate existing table rows
		for (let i = 0; i < formState.applicants.length; i++) {
			if (i === editingIndex) continue;
			const ap = formState.applicants[i] as LegacyApplicant;
			if (ap.applicantType !== 'Individual') continue;
			if (Object.keys(getIndividualErrors(ap)).length > 0) {
				globalError = 'Please fix errors in existing applicants before adding a new one.';
				return;
			}
		}
		// Income auto-select: professional_practice for all
		const autoProfiles = getAutoSelectedProfiles({
			loanCategory: 'professional',
			applicantType: 'Individual'
		});
		const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
		snapshot.selectedIncomeProfiles = autoProfiles;
		// Professional loan: individual/joint practitioners pay EMI, no property
		snapshot.onEMI = true;
		snapshot.onProperty = false;
		// All applicants in professional loan must have professional education
		snapshot.education = 'professional';
		// Force-sync professionalCategory from loan level for primary applicant.
		// The locked field shows the correct value visually, but formApplicant may
		// have the old value if the user changed it on Loan Requirements after adding.
		const targetIndex = editingIndex ?? formState.applicants.length;
		if (targetIndex === 0) {
			const loanProfCat = getLoanLevelProfCategory();
			if (loanProfCat) {
				snapshot.professionalCategory = loanProfCat;
			}
		}
		if (editingIndex !== null) {
			const updated = [...formState.applicants];
			updated[editingIndex] = snapshot;
			formState.replaceApplicants(updated);
			cancelEdit();
		} else {
			if (canAddMore) {
				formState.replaceApplicants([...formState.applicants, snapshot]);
				resetIndividualForm();
			}
		}
		globalError = '';
	}

	function startEdit(index: number) {
		editingIndex = index;
		formApplicant = { ...formState.applicants[index] };
		// Professional loans: NRI always defaults to No
		if (!formApplicant.isNRI) formApplicant.isNRI = 'No';
		// Sync professionalCategory from loan-level for primary applicant.
		// The locked field displays the loan-level value, but the underlying
		// formApplicant still has the old value from when it was first saved.
		if (index === 0) {
			const loanProfCat = getLoanLevelProfCategory();
			if (loanProfCat) {
				formApplicant.professionalCategory = loanProfCat;
			}
		}
		formErrors = {};
		hasTriedToAdd = false;
	}

	function cancelEdit() {
		editingIndex = null;
		resetIndividualForm();
	}

	function resetIndividualForm() {
		// Session 33: Only pre-fill professionalCategory for the primary applicant (index 0).
		// Secondary applicants can choose their own profession independently.
		const isPrimary = formState.applicants.length === 0;
		formApplicant = {
			id: uuidv4(),
			applicantType: 'Individual',
			isNRI: 'No',
			touchedFields: {},
			...(isPrimary ? { professionalCategory: getLoanLevelProfCategory() } : {})
		};
		formErrors = {};
		hasTriedToAdd = false;
		applicantState.clearAllRestoreAsked();
	}

	function _resetCompanyForm() {
		companyForm = { id: uuidv4(), applicantType: 'Company', touchedFields: {} };
		companyErrors = {};
		hasTriedCompany = false;
	}

	function deleteApplicant(index: number) {
		const applicant = formState.applicants[index];
		if (!applicant) return;
		globalError = '';
		if (editingIndex === index) cancelEdit();
		else if (editingIndex !== null && editingIndex > index) editingIndex = editingIndex - 1;
		// Recovery: save to recovery bin for both Individual and Company
		const hasName =
			applicant.applicantType === 'Company'
				? Boolean(applicant.companyName)
				: Boolean(applicant.fullName);
		if (applicant.applicantType && hasName) {
			const matchSignature = buildMatchSignature(applicant);
			if (matchSignature && applicant.id) {
				const displayName =
					applicant.applicantType === 'Company'
						? (applicant.companyName as string) || 'Unnamed Firm'
						: (applicant.fullName as string) || 'Unnamed';
				const savedRelationships = captureRelationshipsForRecovery(
					applicant.id,
					formState.applicants as any[]
				);
				cleanupRelationshipsForApplicant(applicant.id);
				const recoveryData = $state.snapshot(applicant) as Record<string, unknown>;
				if (savedRelationships.length > 0) recoveryData._savedRelationships = savedRelationships;
				// Embed structured income data for restoration
				const structuredData = applicantDataStore.get(applicant.id);
				if (structuredData) {
					recoveryData._structured = $state.snapshot(structuredData) as unknown;
				}
				const scope = applicant.applicantType === 'Company' ? COMPANY_SCOPE : individualScope;
				applicantState.removeToRecovery(
					applicant.id,
					recoveryData,
					displayName,
					matchSignature,
					scope
				);
			} else {
				cleanupRelationshipsForApplicant(applicant.id);
			}
		} else {
			cleanupRelationshipsForApplicant(applicant.id);
		}
		incomeProfileStore.clearApplicantProfiles(index);
		for (let i = index + 1; i < formState.applicants.length; i++) {
			const profilesAtI = incomeProfileStore.getApplicantProfiles(i);
			if (Object.keys(profilesAtI).length > 0) {
				incomeProfileStore.clearApplicantProfiles(i);
				for (const [empType, profile] of Object.entries(profilesAtI)) {
					incomeProfileStore.saveProfile(i - 1, empType, profile.data);
				}
			}
		}
		formState.replaceApplicants(formState.applicants.filter((_, i) => i !== index));
		const deletedKey = buildDetectionKey(applicant);
		const deletedScope = applicant.applicantType === 'Company' ? COMPANY_SCOPE : individualScope;
		if (deletedKey) applicantState.clearDeniedPrefix(deletedKey, deletedScope);
		applicantState.clearAllRestoreAsked();
	}

	function cleanupRelationshipsForApplicant(applicantId: string | undefined) {
		if (!applicantId) return;
		const rels = get(userRelationships);
		const orphanedIds = new Set(
			rels.filter((r) => r.fromId === applicantId || r.toId === applicantId).map((r) => r.id)
		);
		if (orphanedIds.size > 0) removeRelationshipsBatch(orphanedIds);
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
		restoreIntentState.set({
			open: true,
			currentIndex: editingIndex ?? formState.applicants.length,
			matches: allMatches,
			detectionKey,
			recoveryScope: individualScope,
			slotApplicantType: 'Individual'
		});
	}

	// ═══════════════════════════════════════════════════════════════════
	// DISPLAY HELPERS
	// ═══════════════════════════════════════════════════════════════════

	function getDisplayName(applicant: LegacyApplicant, index: number): string {
		if (applicant.applicantType === 'Company') return (applicant.companyName as string) || 'Firm';
		return (applicant.fullName as string) || `Applicant ${index + 1}`;
	}

	const CATEGORY_LABELS: Record<string, string> = {
		doctor: 'Doctor',
		ca: 'CA',
		lawyer: 'Lawyer',
		architect: 'Architect'
	};

	function getSubDetails(applicant: LegacyApplicant): string {
		if (applicant.applicantType === 'Company') {
			return [applicant.companyType || '', applicant.registrationCountry || '']
				.filter(Boolean)
				.join(' · ');
		}
		return [
			applicant.age ? `Age ${applicant.age}` : '',
			applicant.gender || '',
			applicant.professionalCategory
				? CATEGORY_LABELS[applicant.professionalCategory as string] || ''
				: '',
			applicant.maritalStatus || '',
			applicant.isNRI === 'Yes' ? 'NRI' : '',
			applicant.role
				? `(${String(applicant.role).charAt(0).toUpperCase() + String(applicant.role).slice(1)})`
				: ''
		]
			.filter(Boolean)
			.join(' · ');
	}

	function getIndividualNumber(index: number): number {
		return (
			formState.applicants.slice(0, index).filter((a) => a.applicantType === 'Individual').length +
			1
		);
	}

	// ═══════════════════════════════════════════════════════════════════
	// EXPORTED METHODS
	// ═══════════════════════════════════════════════════════════════════

	// Director-modal-triggered restore. Mirrors AddApplicantBusiness.applyDirectorRestore;
	// the BL/Prof director restore path bails inside `prefillApplicantRestore` because
	// `restoreIntentState.currentIndex` is undefined (target is a director sub-form,
	// not an applicants-list slot). The +page.svelte onConfirm now routes through
	// `handleRestoreModalConfirm` in `directorRestoreHandler.ts`, which calls this
	// method for the director path. Pvt Ltd → OPC → Pvt Ltd → re-add same-named
	// partner repro.
	export function applyDirectorRestore(
		companyId: string,
		dirIdx: number,
		restore: DirectorRestorePayload
	): void {
		// Guard: this component manages partners/directors for the Company applicant
		// in formState; reject if companyId doesn't match a known Company.
		const company = formState.applicants.find(
			(a) => a.id === companyId && a.applicantType === 'Company'
		);
		// Pitfall #56 (restore-button unresponsive): silent return left the
		// modal stuck open forever. Reset restoreIntentState on hard guard
		// failure; grow the array on the boundary `dirIdx === length` case.
		if (!company || dirIdx < 0) {
			restoreIntentState.reset();
			return;
		}
		while (dirIdx >= directorForms.length) {
			const refillOpts = {
				isOPC,
				companyType: (companyForm.companyType as string) ?? ''
			};
			directorForms = [...directorForms, createEmptyDirectorForm(true, refillOpts)];
		}

		// Prevent duplicate director IDs within this company. Two partners restored
		// from the same recovery entry would otherwise share an ID → each_key
		// duplicate crash in the cards renderer.
		let effectiveId = restore.matchedId;
		const idAlreadyUsed = directorForms.some(
			(f, i) => i !== dirIdx && f.id === restore.matchedId
		);
		if (idAlreadyUsed) {
			effectiveId = uuidv4();
		}

		// Merge restored data onto the existing director form. Keep existing
		// ownershipPercent lock (set by cross-company match) and union in the
		// restore's locked fields (gender/age/maritalStatus/isNRI typically locked).
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

		// Restore structured income/obligation/CIBIL data for the linked Individual.
		// applicantDataStore is keyed by the director's effective ID — keep in sync.
		if (restore.structured && effectiveId) {
			applicantDataStore.fromJSON({
				...applicantDataStore.toJSON(),
				[effectiveId]: restore.structured as any
			});
		}

		// Commit directors back into formState.applicants so the linked Individual
		// exists immediately (mirrors handleDirectorSave above).
		const companyType = (company.companyType as string) ?? '';
		const role = ROLE_MAP[companyType] ?? 'partner';
		let newApplicants = commitDirectorsToApplicants(
			companyId,
			$state.snapshot(next) as DirectorForm[],
			formState.applicants as Array<Record<string, unknown>>,
			role
		);
		// Merge any profile fields (education, religion, etc.) onto the linked
		// Individual created/refreshed by commitDirectorsToApplicants. These
		// bypass DirectorForm — they live on the Individual itself.
		if (restore.profileFields && Object.keys(restore.profileFields).length > 0) {
			const idx = newApplicants.findIndex((a) => a.id === effectiveId);
			if (idx >= 0) {
				newApplicants[idx] = {
					...newApplicants[idx],
					...restore.profileFields
				};
			}
		}
		// Professional Loan: all partners/directors are non-financial co-applicants.
		// Parity with handleDirectorSave + validateStep.
		newApplicants = newApplicants.map((a) => {
			if (a.applicantType === 'Individual' && a.linkedCompanyId) {
				return { ...a, applicantClassification: 'co_applicant_non_financial' };
			}
			return a;
		});
		// Pitfall #46 — sync auto-income entries on linked Individuals. Locked by
		// directorAutoIncomeWiring.test.ts; without it the Director-in-Company
		// auto-row is never created and sourceCompanyId is lost.
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

		// Close the restore modal — caller already calls reset() but be defensive.
		restoreIntentState.reset();
	}

	export function validateStep(): boolean {
		if (!applicantType) {
			globalError = 'Please select who is applying.';
			return false;
		}
		if (applicantType === 'individual') {
			if (individualApplicants.length === 0) {
				globalError = 'Please add an applicant.';
				return false;
			}
		} else if (applicantType === 'joint') {
			if (individualApplicants.length < 2) {
				globalError = 'Joint application requires at least 2 applicants.';
				return false;
			}
			if (duplicateIndexes.size > 0) {
				globalError = 'Two or more applicants have identical details.';
				return false;
			}
		} else {
			// Company path: validate and auto-save firm details on Next
			hasTriedCompany = true;
			const errors = getCompanyErrors(companyForm as LegacyApplicant);
			if (Object.keys(errors).length > 0) {
				companyErrors = errors;
				globalError = 'Firm details are incomplete.';
				return false;
			}
			// Auto-save company to formState
			const snapshot = $state.snapshot(companyForm) as Record<string, unknown>;
			if (!snapshot.professionalCategory) {
				snapshot.professionalCategory = getLoanLevelProfCategory();
			}
			// Professional firm is the borrower — on EMI, no property
			snapshot.onEMI = true;
			snapshot.onProperty = false;
			// Always update existing company — never create duplicates
			const updated = [...formState.applicants];
			const companyIdx = updated.findIndex(
				(a) => a.applicantType === 'Company' || a.id === snapshot.id
			);
			if (companyIdx >= 0) {
				updated[companyIdx] = snapshot;
				formState.replaceApplicants(updated);
			} else if (!updated.some((a) => a.applicantType === 'Company')) {
				// Only add if no company exists yet
				formState.replaceApplicants([snapshot, ...updated]);
			}
			isCompanySaved = true;

			// Validate all directors/partners are complete
			const companyType = (snapshot.companyType as string) ?? '';
			const memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Partner';
			const dirErrors = validateAllDirectors(directorForms, true, memberLabel, companyType, true);
			if (dirErrors.length > 0) {
				directorError = dirErrors[0];
				globalError = dirErrors[0];
				return false;
			}
			directorError = '';

			// Commit directors to formState
			const companyId = snapshot.id as string;
			const role = ROLE_MAP[companyType] ?? 'partner';
			let newApplicants = commitDirectorsToApplicants(
				companyId,
				$state.snapshot(directorForms) as DirectorForm[],
				formState.applicants as Array<Record<string, unknown>>,
				role
			);
			// Professional Loan: all directors/partners are non-financial co-applicants.
			// Their income is assessed at firm level, not individually.
			newApplicants = newApplicants.map((a) => {
				if (a.applicantType === 'Individual' && a.linkedCompanyId) {
					return { ...a, applicantClassification: 'co_applicant_non_financial' };
				}
				return a;
			});
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
		// Individual/Joint: validate all applicants
		if (isIndividualPath) {
			formState.applicantStepTouched = true;
			let allValid = true;
			for (let i = 0; i < formState.applicants.length; i++) {
				const ap = formState.applicants[i] as LegacyApplicant;
				if (!ap.applicantType) continue;
				const errors = getIndividualErrors(ap);
				if (Object.keys(errors).length > 0) allValid = false;
			}
			if (!allValid) {
				globalError = 'Please fix validation errors before proceeding.';
				setTimeout(() => scrollToFirstError(), 80);
				return false;
			}
		}
		globalError = '';
		return true;
	}

	// $effect(() => {
	// 	console.log('formState.applicationData: ', formState.applicationData);
	// });
</script>

<div>
	<!-- Session 33: Show profession mismatch warning above all content -->
	{#if hasProfCategoryMismatch}
		{@const primaryApplicant = formState.applicants.find((a) => a.applicantType === 'Individual')}
		{@const primaryName = (primaryApplicant?.fullName as string) || 'The primary applicant'}
		{@const primaryProf =
			PROF_CATEGORY_LABELS[(primaryApplicant?.professionalCategory as string) ?? ''] ||
			(primaryApplicant?.professionalCategory as string) ||
			'unknown'}
		{@const loanProf = PROF_CATEGORY_LABELS[loanProfCategory] || loanProfCategory}
		<div
			class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			role="alert"
		>
			<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
			<p class="text-sm font-medium text-red-600 dark:text-red-400">
				<strong>{primaryName}</strong> is a <strong>{primaryProf}</strong>, but this is a
				<strong>{loanProf}</strong>
				loan. The primary applicant (Applicant 1) must be a {loanProf}. Either remove this applicant
				and add a {loanProf} as primary, or reorder so a {loanProf} is first.
			</p>
		</div>
	{/if}

	<!-- Applicant type is set on the Loan Requirements page — show read-only badge -->
	{#if applicantType}
		{@const typeLabels = { individual: 'Individual', joint: 'Joint', company: 'Company / Firm' }}
		{@const TypeIcon =
			applicantType === 'company' ? Building2 : applicantType === 'joint' ? Users : User}
		<div class="mt-4 flex items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5"
			>
				<TypeIcon size={18} class="text-primary" />
				<span class="text-sm font-semibold text-primary">{typeLabels[applicantType]}</span>
				<Lock size={14} class="ml-1 text-primary/50" />
			</div>
			<span class="text-xs text-(--form-text-muted)">Set from Loan Requirements</span>
		</div>
	{/if}

	{#if applicantType}
		{#if globalError}
			<div
				data-error="true"
				class="mt-3 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			>
				<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
				<p class="text-sm font-medium text-red-600 dark:text-red-400">{globalError}</p>
			</div>
		{/if}

		{#if isIndividualPath}
			<!-- ════════════════════════════════════════════════════════ -->
			<!-- INDIVIDUAL / JOINT PATH                                 -->
			<!-- ════════════════════════════════════════════════════════ -->

			<!-- Joint info banner -->
			{#if applicantType === 'joint' && individualApplicants.length < 2}
				<div
					class="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
				>
					<CircleAlert size="16" class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
					<p class="text-xs text-blue-700 dark:text-blue-300">
						Joint application requires at least 2 applicants. Please add {2 -
							individualApplicants.length} more.
					</p>
				</div>
			{/if}

			{#if canAddMore || editingIndex !== null}
				<fieldset
					class="relative mt-4 rounded-xl px-4 pt-3 pb-4 transition-all
					{editingIndex !== null
						? 'border border-primary/40 bg-primary/5'
						: 'border border-(--form-border) bg-(--form-bg-card)'}"
				>
					<legend
						class="px-2 text-sm font-semibold {editingIndex !== null
							? 'text-primary'
							: 'text-(--form-text-label)'}"
					>
						{editingIndex !== null ? `Editing Applicant ${editingIndex + 1}` : 'New Applicant'}
						{#if editingIndex !== null}
							<button
								onclick={cancelEdit}
								class="ml-2 text-xs font-normal text-(--form-text-muted) underline hover:text-(--form-text-secondary)"
								>Cancel</button
							>
						{/if}
					</legend>
					<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
						{#each INDIVIDUAL_QUESTIONS as q (q.key)}
							{@const currentApplicantIndex = editingIndex ?? formState.applicants.length}
							{@const loanProfCategory = getLoanLevelProfCategory()}
							{@const isProfLockedByLoan =
								q.key === 'professionalCategory' &&
								currentApplicantIndex === 0 &&
								!!loanProfCategory}
							{@const isNriLocked = q.key === 'isNRI'}
							<QuestionRenderer
								{q}
								index={currentApplicantIndex}
								applicant={formApplicant}
								applicationData={formState.applicationData}
								applicantErrors={{ [currentApplicantIndex]: formErrors }}
								showValidationErrors={hasTriedToAdd}
								isTouched={(formApplicant.touchedFields as Record<string, boolean>)?.[q.key] ===
									true}
								onValidate={onValidateIndividual}
								onFieldChange={updateFormField}
								onFieldBlur={handleFormFieldBlur}
								disabled={isProfLockedByLoan || isNriLocked}
								lockedLabel={isProfLockedByLoan
									? `Set from Loan Requirements — ${PROF_CATEGORY_LABELS[loanProfCategory] || loanProfCategory}`
									: isNriLocked
										? 'Professional loans are for Indian residents only'
										: undefined}
							/>
						{/each}
					</div>
					<!-- Primary profession field is locked to loan-level — no inline mismatch possible -->
					<div class="mt-6 flex flex-col items-center gap-2 border-t border-(--form-border) pt-4">
						<button
							onclick={saveIndividual}
							class="px-6 py-2.5 {editingIndex !== null
								? 'bg-amber-600 hover:bg-amber-700'
								: 'bg-primary hover:opacity-90'} flex items-center gap-2 rounded-full text-sm font-semibold text-white shadow transition-all"
						>
							{#if editingIndex !== null}Update Applicant {editingIndex + 1}{:else}<CirclePlus
									size="16"
								/> Add Applicant{/if}
						</button>
						{#if editingIndex !== null}
							<button
								onclick={cancelEdit}
								class="text-xs text-(--form-text-muted) underline hover:text-(--form-text-secondary)"
								>Cancel</button
							>
						{/if}
					</div>
				</fieldset>
			{:else if totalApplicantCount > 0}
				<!-- Applicant cap reached: explain why the Add form is gone -->
				<div
					class="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20"
					role="status"
					aria-live="polite"
				>
					<svg
						class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<p class="text-sm font-semibold text-amber-800 dark:text-amber-200">
							{applicantType === 'joint'
								? `Maximum ${MAX_APPLICANTS} applicants reached`
								: 'Individual professional loans support only 1 applicant'}
						</p>
						<p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
							{applicantType === 'joint'
								? 'To add another applicant, remove one from the table below.'
								: 'Switch to a Joint application above to add co-applicants.'}
						</p>
					</div>
				</div>
			{/if}
		{:else}
			<!-- ════════════════════════════════════════════════════════ -->
			<!-- COMPANY / FIRM PATH                                     -->
			<!-- ════════════════════════════════════════════════════════ -->

			<!-- Firm Details Section — always open, saved on Next -->
			<fieldset
				class="relative mt-4 rounded-xl border border-blue-200 bg-blue-50/50 px-4 pt-3 pb-4 dark:border-blue-800 dark:bg-blue-900/10"
			>
				<legend class="px-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
					Firm Details
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
							disabled={q.key === 'numberOfDirectorsOrPartners' && isOPC}
							lockedLabel={q.key === 'numberOfDirectorsOrPartners' && isOPC
								? '1 — OPC has a single director'
								: undefined}
						/>
					{/each}
				</div>
			</fieldset>

			<!-- ── Partner Summary Table + Modal ── -->
			{#if isCompanySaved && directorForms.length > 0}
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

				<!-- ── OPC Duplicate Warning ── -->
				{#if opcDuplicateWarning}
					<div
						class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
					>
						<CircleAlert size="18" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
						<p class="text-xs text-amber-700 dark:text-amber-300">{opcDuplicateWarning}</p>
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
				{@const ct = (companyForm.companyType as string) ?? ''}
				{@const memberLabel = MEMBER_LABEL_MAP[ct] ?? 'Partner'}
				{@const currentCompanyId =
					(formState.applicants.find((a) => a.applicantType === 'Company')?.id as
						| string
						| undefined) ?? undefined}
				<DirectorFormModal
					bind:open={directorModalOpen}
					directorIndex={editingDirectorIdx}
					{memberLabel}
					initialData={directorForms[editingDirectorIdx]}
					allForms={directorForms}
					isUnsecured={true}
					isProfessionalLoan={true}
					companyType={ct}
					{currentCompanyId}
					existingIndividuals={existingNonDirectorIndividuals}
					applicants={formState.applicants as Array<Record<string, unknown>>}
					recoveryScope="professional::partner"
					onSave={handleDirectorSave}
					onClose={handleDirectorModalClose}
				/>
			{/if}

			{#if showRemovePicker}
				{@const companyType = (companyForm.companyType as string) ?? ''}
				{@const rmLabel = MEMBER_LABEL_MAP[companyType] ?? 'Partner'}
				<DirectorRemovePickerModal
					bind:open={showRemovePicker}
					memberLabel={rmLabel}
					filledDirectors={removePickerFilled}
					targetCount={removePickerTargetCount}
					onConfirm={handleRemovePickerConfirm}
					onCancel={handleRemovePickerCancel}
				/>
			{/if}
		{/if}

		<!-- ── Applicants Table (individual/joint mode only) ── -->
		{#if isIndividualPath && individualApplicants.length > 0}
			<div class="mt-8 border-t border-dashed border-(--form-border) pt-6">
				<h4 class="mb-3 text-sm font-semibold tracking-wider text-(--form-text-muted) uppercase">
					Applicants Added ({individualApplicants.length})
				</h4>
			</div>
			<div
				class="mb-3 overflow-hidden rounded-xl border border-(--ddsa-primary-500)/20 bg-[var(--ddsa-primary-500)]/[0.08] shadow-sm"
			>
				<table class="w-full text-sm">
					<thead class="bg-[var(--ddsa-primary-500)]/[0.12]">
						<tr>
							<th class="w-12 px-3 py-2.5 text-left text-xs font-semibold text-(--form-text-muted)"
								>#</th
							>
							<th
								class="flex-1 px-3 py-2.5 text-left text-xs font-semibold text-(--form-text-muted)"
								>Name & Details</th
							>
							<th
								class="w-16 px-3 py-2.5 text-center text-xs font-semibold text-(--form-text-muted)"
								>Status</th
							>
							<th
								class="w-20 px-3 py-2.5 text-center text-xs font-semibold text-(--form-text-muted)"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each formState.applicants as applicant, index (applicant.id)}
							{#if applicant.applicantType === 'Individual'}
								<tr
									id="applicant-row-{applicant.id}"
									class="border-t border-(--ddsa-primary-500)/10 transition-colors {editingIndex ===
									index
										? 'bg-(--ddsa-primary-500)/20'
										: 'hover:bg-[var(--ddsa-primary-500)]/[0.06]'} {duplicateIndexes.has(index)
										? 'bg-red-500/15!'
										: ''}"
								>
									<td class="px-3 py-2.5 text-(--form-text-muted)">{getIndividualNumber(index)}</td>
									<td class="px-3 py-2.5">
										<div class="flex items-center gap-2 font-medium text-(--form-text)">
											{getDisplayName(applicant as LegacyApplicant, index)}
											{#if index === 0 && applicant.applicantType === 'Individual'}
												<span
													class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
													>Primary — Profession</span
												>
											{/if}
										</div>
										<div class="mt-1 text-xs text-(--form-text-secondary)">
											{getSubDetails(applicant as LegacyApplicant)}
										</div>
									</td>
									<td class="px-3 py-2.5 text-center">
										{#if applicantCompletionStatus[index]}
											<span class="text-xs font-medium text-green-600 dark:text-green-400">OK</span>
										{:else}
											<span class="text-xs font-medium text-amber-600 dark:text-amber-400"
												>Incomplete</span
											>
										{/if}
									</td>
									<td class="px-3 py-2.5">
										<div class="flex items-center justify-center gap-2">
											<button
												onclick={() => startEdit(index)}
												class="rounded-md p-1.5 {editingIndex === index
													? 'bg-(--ddsa-primary-500)/25 text-(--ddsa-primary-500)'
													: 'text-(--form-text-muted) hover:bg-(--ddsa-primary-500)/20 hover:text-(--ddsa-primary-500)'} transition-colors"
												aria-label="Edit"
												disabled={editingIndex === index}
											>
												<Pencil size="15" />
											</button>
											<button
												onclick={() => deleteApplicant(index)}
												class="rounded-md p-1.5 text-(--form-text-muted) transition-colors hover:bg-red-500/20 hover:text-red-500"
												aria-label="Delete"
											>
												<Trash2 size="15" />
											</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- ── Applicant reconciliation modal (Joint → Individual switch) ── -->
	{#if showApplicantKeepPicker}
		<ApplicantKeepPickerModal
			bind:open={showApplicantKeepPicker}
			applicants={applicantPickerCandidates}
			keepCount={applicantPickerKeepCount}
			memberLabel="applicant"
			onConfirm={handleApplicantKeepConfirm}
			onCancel={handleApplicantKeepCancel}
		/>
	{/if}
</div>
