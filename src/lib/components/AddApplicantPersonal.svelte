<script lang="ts">
	/**
	 * AddApplicantPersonal — Step 0 for Personal Loan
	 * ═══════════════════════════════════════════════════════════════════
	 * 2-way split:
	 *   A: Individual → Single person applying alone (lock to 1)
	 *   B: Joint → Two or more people applying together (2+ required)
	 * Fields: name, gender, age, maritalStatus, isNRI
	 *
	 * Income auto-select: salaried_regular
	 * ═══════════════════════════════════════════════════════════════════
	 */
	import { CircleAlert, CirclePlus, Trash2, Pencil, User, Users } from '$lib/utils/iconRegistry';
	import SuggestPrimaryBanner from './form-wizard/SuggestPrimaryBanner.svelte';
	import { formState } from '$lib/state/form.svelte';
	import type { LegacyApplicant } from '$lib/stores/loanData';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		buildDetectionKey,
		buildMatchSignature,
		type RecoveryScope
	} from '$lib/state/applicant.svelte';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import {
		userRelationships,
		removeRelationshipsBatch,
		clearAllRelationships
	} from '$lib/components/relationship-capture/relationshipStore';
	import { categoryFromScope } from '$lib/utils/recoveryCompatibility';
	import { closeConfirmModal } from '$lib/stores/confirmModal';
	import { applicantState } from '$lib/state/applicant.svelte';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import { applyNriIncomeStashForApplicant } from '$lib/utils/unsecuredApplicantHandlers';
	import { captureRelationshipsForRecovery } from '$lib/utils/restoreRelationships';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { getAutoSelectedProfiles } from '$lib/config/incomeProfiles/profileCards';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		isNextEnabled?: boolean;
		disabledReason?: string;
	}

	let { isNextEnabled = $bindable(false), disabledReason = $bindable('') }: Props = $props();

	const MAX_APPLICANTS = 8;
	const RECOVERY_SCOPE: RecoveryScope = 'personal::individual';

	// ═══════════════════════════════════════════════════════════════════
	// APPLICANT TYPE SELECTION
	// ═══════════════════════════════════════════════════════════════════

	type ApplicantType = 'individual' | 'joint' | null;
	let applicantType: ApplicantType = $state(null);

	// On mount, derive applicantType from existing applicants
	onMount(() => {
		closeConfirmModal();
		const individuals = formState.applicants.filter((a) => a.applicantType === 'Individual');
		if (individuals.length > 1) {
			applicantType = 'joint';
		} else if (individuals.length === 1) {
			applicantType = 'individual';
		}
	});

	function selectType(type: ApplicantType) {
		if (applicantType === type) return;

		if (formState.applicants.length > 0) {
			// Save each existing applicant to the recovery bin before clearing.
			// Mirrors AddApplicantBusiness.svelte selectEntityType — DSA can restore
			// a previously entered applicant by typing their name again.
			for (const applicant of formState.applicants) {
				if (!applicant.applicantType || !applicant.id) continue;
				const matchSig = buildMatchSignature(applicant as Record<string, unknown>);
				if (!matchSig) continue;
				applicantState.removeToRecovery(
					applicant.id as string,
					$state.snapshot(applicant) as Record<string, unknown>,
					(applicant.fullName as string) || 'Unnamed',
					matchSig,
					RECOVERY_SCOPE
				);
			}
			formState.replaceApplicants([]);
			clearAllRelationships();
			incomeProfileStore.clearAll();
		}

		applicantType = type;
		resetForm();
		globalError = '';
	}

	// ── Inline question definitions ─────────────────────────────────
	// These replace the JSON config. No showWhen needed — all fields always visible.
	const QUESTIONS = [
		{
			key: 'fullName',
			question: 'Full Name',
			type: 'text' as const,
			styleClass: 'col-span-2',
			icon: 'user',
			placeholder: 'Enter full name',
			inputRestriction: 'alphabet',
			maxlength: 50,
			maxLengthErrorMessage: 'Name must not exceed 50 characters',
			required: true,
			options: []
		},
		{
			key: 'gender',
			question: 'Gender',
			type: 'select' as const,
			styleClass: 'col-span-1',
			icon: 'venus-and-mars',
			required: true,
			options: [
				{ label: 'Male', value: 'male' },
				{ label: 'Female', value: 'female' }
			]
		},
		{
			key: 'age',
			question: 'Age',
			type: 'text' as const,
			styleClass: 'col-span-1',
			icon: 'calendar',
			placeholder: 'Enter age',
			inputRestriction: 'numeric',
			maxlength: 2,
			required: true,
			options: []
		},
		{
			key: 'maritalStatus',
			question: 'Marital Status',
			type: 'select' as const,
			styleClass: 'col-span-1',
			icon: 'users',
			required: true,
			options: [
				{ label: 'Single', value: 'single' },
				{ label: 'Married', value: 'married' },
				{ label: 'Divorced', value: 'divorced' },
				{ label: 'Separated', value: 'separated' },
				{ label: 'Widowed', value: 'widowed' }
			]
		},
		{
			key: 'isNRI',
			question: 'Is NRI?',
			type: 'select' as const,
			styleClass: 'col-span-1',
			icon: 'flag',
			required: true,
			options: [
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			]
		}
	];

	// ── Form state ──────────────────────────────────────────────────
	let editingIndex: number | null = $state(null);
	let formApplicant: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: 'Individual',
		touchedFields: {}
	});
	let formErrors: Record<string, string> = $state({});
	let hasTriedToAdd = $state(false);
	let globalError = $state('');
	// restoreAskedForKey now lives in applicantState.restoreAskedKeys (CLAUDE.md Pitfall #30)

	// ── Derived ─────────────────────────────────────────────────────
	const applicantCount = $derived(formState.applicants.filter((a) => a.applicantType).length);

	/** Individual: lock to 1 applicant. Joint: allow multiple. */
	const canAddMore = $derived(
		applicantType === 'joint'
			? applicantCount < MAX_APPLICANTS
			: formState.applicants.filter((a) => a.applicantType === 'Individual').length === 0
	);

	// Auto-derive applicationStructure
	$effect(() => {
		const typed = formState.applicants.filter((a) => a.applicantType);
		if (typed.length === 0) return;
		const derived = typed.length === 1 ? 'individual' : 'group_individuals';
		const current = formState.applicationData.applicationStructure as string | undefined;
		if (current !== derived) {
			formState.setApplicationField('applicationStructure' as any, derived as any);
		}
	});

	// Completion status
	const applicantCompletionStatus = $derived.by(() => {
		return formState.applicants.map((applicant) => {
			if (!applicant.applicantType) return false;
			const errors = getApplicantErrors(applicant as LegacyApplicant);
			return Object.keys(errors).length === 0;
		});
	});

	// Duplicate detection
	const duplicateIndexes = $derived.by(() => {
		const dup = new Set<number>();
		const applicants = formState.applicants as LegacyApplicant[];
		for (let i = 0; i < applicants.length; i++) {
			for (let j = i + 1; j < applicants.length; j++) {
				const a = applicants[i],
					b = applicants[j];
				if (!a?.applicantType || !b?.applicantType) continue;
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

	// isNextEnabled
	$effect(() => {
		if (!applicantType) {
			isNextEnabled = false;
			disabledReason = 'Select who is applying — Individual or Joint';
			return;
		}
		if (applicantType === 'individual') {
			// Need exactly 1 complete applicant
			const hasOne = applicantCount === 1;
			const allComplete =
				applicantCompletionStatus.length > 0 && applicantCompletionStatus.every(Boolean);
			isNextEnabled = hasOne && allComplete && !globalError;
			if (!hasOne) {
				disabledReason = 'Add an applicant to continue';
			} else if (!allComplete) {
				disabledReason = 'Complete all required fields for the applicant';
			} else if (globalError) {
				disabledReason = globalError;
			} else {
				disabledReason = '';
			}
		} else {
			// Joint: 2+ complete applicants, no duplicates
			const hasEnough = applicantCount >= 2;
			const allComplete =
				applicantCompletionStatus.length > 0 && applicantCompletionStatus.every(Boolean);
			const noDuplicates = duplicateIndexes.size === 0;
			isNextEnabled = hasEnough && allComplete && noDuplicates && !globalError;
			if (!hasEnough) {
				disabledReason = 'Add at least 2 applicants for a joint application';
			} else if (!allComplete) {
				disabledReason = 'Complete all required fields for every applicant';
			} else if (!noDuplicates) {
				disabledReason = 'Remove duplicate applicants';
			} else if (globalError) {
				disabledReason = globalError;
			} else {
				disabledReason = '';
			}
		}
	});

	// ── Sync for restore modal ──────────────────────────────────────
	// Session 33: Redesigned — restore adds directly to table (page-level onConfirm),
	// so when the modal closes we just reset the form instead of pre-filling it.
	// This prevents the old bug where cancel left stale data in form fields.
	let wasRestoreOpen = $state(false);
	$effect(() => {
		const isOpen = restoreIntentState.open;
		if (wasRestoreOpen && !isOpen) {
			// Modal closed (confirm or cancel). Either way, reset the inline form.
			// If confirmed: data is already in formState.applicants (page-level callback).
			// If cancelled: typed name should be cleared so user can start fresh.
			editingIndex = null;
			resetForm();
		}
		wasRestoreOpen = isOpen;
	});

	// ── Validation ──────────────────────────────────────────────────
	function validateField(key: string, value: unknown): string | null {
		if (key === 'fullName') {
			if (!value || String(value).trim() === '') return 'Name is required';
			if (String(value).trim().length < 2) return 'Name must contain at least 2 characters';
			if (/(.)\1{2,}/.test(String(value))) return 'Name should not contain repetitive characters';
		} else if (key === 'gender') {
			if (!value) return 'Gender is required';
		} else if (key === 'age') {
			if (!value || value === '' || value === 0) return 'Age is required';
			const num = Number(value);
			if (num < 18) return 'Age must be at least 18 years';
			if (num > 80) return 'Age must not be more than 80 years';
		} else if (key === 'maritalStatus') {
			if (!value) return 'Marital status is required';
		} else if (key === 'isNRI') {
			if (!value) return 'NRI status is required';
		}
		return null;
	}

	function getApplicantErrors(applicant: LegacyApplicant): Record<string, string> {
		const errors: Record<string, string> = {};
		for (const q of QUESTIONS) {
			const error = validateField(q.key, applicant[q.key]);
			if (error) errors[q.key] = error;
		}
		return errors;
	}

	// ── Field handlers ──────────────────────────────────────────────
	function updateFormField(_index: number, key: string, value: unknown) {
		formState.applicantStepTouched = true;
		// Pitfall #57: capture previous isNRI before overwrite.
		const previousIsNRI = key === 'isNRI' ? (formApplicant.isNRI as string | undefined) : undefined;
		formApplicant = {
			...formApplicant,
			[key]: value,
			touchedFields: {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
			}
		};

		const error = validateField(key, value);
		if (error) {
			formErrors = { ...formErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = formErrors;
			formErrors = rest;
		}

		// Name-change detection for recovery
		if (key === 'fullName') {
			const nameValue = String(value || '').trim();
			if (nameValue.length >= 2) {
				detectCachedApplicantForForm();
			} else {
				applicantState.clearAllRestoreAsked();
			}
		}

		// Pitfall #57: NRI flip stashes / restores NRI-incompatible business
		// income entries. No-op when applicant isn't yet in formState.applicants
		// (new add — the next save will write isNRI=Yes with no stale data).
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

	// ── QuestionRenderer validation callback ────────────────────────
	function onValidate(_applicant: any, _index: number, key: string): string | null {
		return validateField(key, formApplicant[key]);
	}

	// ── Save / Edit / Delete ────────────────────────────────────────
	function saveApplicant() {
		formState.applicantStepTouched = true;
		hasTriedToAdd = true;

		// Validate local form
		const errors = getApplicantErrors(formApplicant as LegacyApplicant);
		if (Object.keys(errors).length > 0) {
			formErrors = errors;
			// Mark all invalid fields as touched
			const touched: Record<string, boolean> = {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
			};
			for (const key of Object.keys(errors)) touched[key] = true;
			formApplicant = { ...formApplicant, touchedFields: touched };
			return;
		}

		// Validate existing table rows
		let tableValid = true;
		for (let i = 0; i < formState.applicants.length; i++) {
			if (i === editingIndex) continue; // Skip the one being edited
			const ap = formState.applicants[i] as LegacyApplicant;
			if (!ap.applicantType) continue;
			const apErrors = getApplicantErrors(ap);
			if (Object.keys(apErrors).length > 0) {
				tableValid = false;
				globalError = 'Please fix errors in existing applicants before adding a new one.';
				break;
			}
		}
		if (!tableValid) return;

		// Auto-select income profiles
		const autoProfiles = getAutoSelectedProfiles({
			loanCategory: 'personal',
			applicantType: 'Individual'
		});

		const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
		snapshot.selectedIncomeProfiles = autoProfiles;
		// Personal loan: all individuals pay EMI, no property involved
		snapshot.onEMI = true;
		snapshot.onProperty = false;

		if (editingIndex !== null) {
			// Update existing
			const updatedList = [...formState.applicants];
			updatedList[editingIndex] = snapshot;
			formState.replaceApplicants(updatedList);
			cancelEdit();
		} else {
			// Add new
			if (canAddMore) {
				formState.replaceApplicants([...formState.applicants, snapshot]);
				resetForm();
			}
		}

		globalError = '';
	}

	function startEdit(index: number) {
		editingIndex = index;
		formApplicant = { ...formState.applicants[index] };
		formErrors = {};
		hasTriedToAdd = false;
	}

	function cancelEdit() {
		editingIndex = null;
		resetForm();
	}

	function resetForm() {
		formApplicant = {
			id: uuidv4(),
			applicantType: 'Individual',
			touchedFields: {}
		};
		formErrors = {};
		hasTriedToAdd = false;
		applicantState.clearAllRestoreAsked();
	}

	function deleteApplicant(index: number) {
		const applicant = formState.applicants[index];
		if (!applicant) return;

		globalError = '';

		if (editingIndex === index) {
			cancelEdit();
		} else if (editingIndex !== null && editingIndex > index) {
			editingIndex = editingIndex - 1;
		}

		// Recovery: save to recovery bin if it has a name
		if (applicant.applicantType && applicant.fullName) {
			const matchSignature = buildMatchSignature(applicant);
			if (matchSignature && applicant.id) {
				const displayName = (applicant.fullName as string) || 'Unnamed';
				const savedRelationships = captureRelationshipsForRecovery(
					applicant.id,
					formState.applicants as any[]
				);

				// Clean up relationships
				cleanupRelationshipsForApplicant(applicant.id);

				const recoveryData = $state.snapshot(applicant) as Record<string, unknown>;
				if (savedRelationships.length > 0) {
					recoveryData._savedRelationships = savedRelationships;
				}
				// Embed structured income data so restoration can recover income profiles
				const structuredData = applicantDataStore.get(applicant.id);
				if (structuredData) {
					recoveryData._structured = $state.snapshot(structuredData) as unknown;
				}
				applicantState.removeToRecovery(
					applicant.id,
					recoveryData,
					displayName,
					matchSignature,
					RECOVERY_SCOPE
				);
			}
		} else {
			cleanupRelationshipsForApplicant(applicant.id);
		}

		// Clean up income profile store
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

		// Allow re-detection after delete
		const deletedKey = buildDetectionKey(applicant);
		if (deletedKey) applicantState.clearDeniedPrefix(deletedKey, RECOVERY_SCOPE);
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

	// ── Cached applicant detection ──────────────────────────────────
	function detectCachedApplicantForForm() {
		if (!formApplicant.applicantType) return;
		const detectionKey = buildDetectionKey(formApplicant);
		if (!detectionKey) return;
		if (applicantState.hasRestoreAsked(detectionKey)) return;

		const nameValue = formApplicant.fullName;
		if (!nameValue || String(nameValue).trim().length < 2) return;

		const cache = applicantState.recoveryBin;
		if (cache.length === 0) return;

		const alreadyAddedSignatures = new Set(
			formState.applicants
				.filter((_, i) => i !== editingIndex)
				.map((a) => buildMatchSignature(a as Record<string, unknown>))
				.filter(Boolean) as string[]
		);

		// Same-scope matches
		const sameScopeRaw = applicantState
			.findRecoverableByName(formApplicant, RECOVERY_SCOPE)
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

		// Cross-loan suggestions: entries from other loan scopes, compatibility-filtered
		const namePrefix = String(nameValue).trim();
		const crossLoanRaw = applicantState.findCrossLoanSuggestions(
			namePrefix,
			RECOVERY_SCOPE,
			categoryFromScope(RECOVERY_SCOPE)
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
		// Pitfall #32: slotApplicantType hint refuses Company restores into
		// this Individual-only flow.
		restoreIntentState.set({
			open: true,
			currentIndex: editingIndex ?? formState.applicants.length,
			matches: allMatches,
			detectionKey,
			recoveryScope: RECOVERY_SCOPE,
			slotApplicantType: 'Individual'
		});
	}

	// ── Display helpers ─────────────────────────────────────────────
	function getDisplayName(applicant: LegacyApplicant, index: number): string {
		return (applicant.fullName as string) || `Applicant ${index + 1}`;
	}

	function getSubDetails(applicant: LegacyApplicant): string {
		return [
			applicant.age ? `Age ${applicant.age}` : '',
			applicant.gender || '',
			applicant.maritalStatus || '',
			applicant.isNRI === 'Yes' ? 'NRI' : ''
		]
			.filter(Boolean)
			.join(' · ');
	}

	// ── Exported methods (contract with ApplicantFormUnsecured) ─────
	export function validateStep(): boolean {
		if (!applicantType) {
			globalError = 'Please select who is applying.';
			return false;
		}

		const applicants = formState.applicants;
		const hasAny = applicants.some((a) => a.applicantType);
		if (applicants.length === 0 || !hasAny) {
			globalError = 'Please add at least one applicant before proceeding.';
			return false;
		}

		if (applicantType === 'joint' && applicants.filter((a) => a.applicantType).length < 2) {
			globalError = 'Joint application requires at least 2 applicants.';
			return false;
		}

		if (duplicateIndexes.size > 0) {
			globalError = 'Two or more applicants have identical details. Each applicant must be unique.';
			return false;
		}

		formState.applicantStepTouched = true;
		hasTriedToAdd = true;

		let allValid = true;
		for (let i = 0; i < applicants.length; i++) {
			const ap = applicants[i] as LegacyApplicant;
			if (!ap.applicantType) continue;
			const errors = getApplicantErrors(ap);
			if (Object.keys(errors).length > 0) {
				allValid = false;
			}
		}

		if (!allValid) {
			globalError = 'Please fix validation errors before proceeding.';
			setTimeout(() => scrollToFirstError(), 80);
			return false;
		}

		globalError = '';
		return true;
	}
</script>

<div>
	<!-- ── Applicant Type Selector ── -->
	{#if !applicantType}
		<div class="mt-4 space-y-3">
			<p class="text-sm font-semibold text-[var(--form-text-label)]">Who is applying?</p>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<button
					onclick={() => selectType('individual')}
					class="flex items-center gap-3 rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
				>
					<User size={24} class="shrink-0 text-primary" />
					<div>
						<p class="font-semibold text-[var(--form-text)]">Individual</p>
						<p class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
							Single person applying alone
						</p>
					</div>
				</button>
				<button
					onclick={() => selectType('joint')}
					class="flex items-center gap-3 rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
				>
					<Users size={24} class="shrink-0 text-primary" />
					<div>
						<p class="font-semibold text-[var(--form-text)]">Joint</p>
						<p class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
							Two or more people applying together
						</p>
					</div>
				</button>
			</div>
		</div>
	{:else}
		<!-- Type badge + change button -->
		<div class="mb-4 flex items-center gap-2">
			<div
				class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
			>
				{#if applicantType === 'individual'}<User size={14} />{:else}<Users size={14} />{/if}
				{applicantType === 'individual' ? 'Individual' : 'Joint Application'}
			</div>
			<button
				onclick={() => {
					applicantType = null;
				}}
				class="text-xs text-[var(--form-text-muted)] underline hover:text-[var(--form-text-secondary)]"
				>Change</button
			>
		</div>

		<!-- ── Global Error Banner ── -->
		{#if globalError}
			<div
				data-error="true"
				class="mt-3 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			>
				<CircleAlert size="20" class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
				<p class="text-sm font-medium text-red-600 dark:text-red-400">{globalError}</p>
			</div>
		{/if}

		<!-- Joint info banner -->
		{#if applicantType === 'joint' && applicantCount < 2}
			<div
				class="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
			>
				<CircleAlert size="16" class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
				<p class="text-xs text-blue-700 dark:text-blue-300">
					Joint application requires at least 2 applicants. Please add {2 - applicantCount} more.
				</p>
			</div>
		{/if}

		<!-- ── Applicant Form ── -->
		{#if canAddMore || editingIndex !== null}
			<fieldset
				class="relative mt-4 rounded-xl px-4 pt-3 pb-4 transition-all
				{editingIndex !== null
					? 'border border-primary/40 bg-primary/5'
					: 'border border-[var(--form-border)] bg-[var(--form-bg-card)]'}"
			>
				<legend
					class="px-2 text-sm font-semibold
					{editingIndex !== null ? 'text-primary' : 'text-[var(--form-text-label)]'}"
				>
					{editingIndex !== null ? `Editing Applicant ${editingIndex + 1}` : 'New Applicant'}
					{#if editingIndex !== null}
						<button
							onclick={cancelEdit}
							class="ml-2 text-xs font-normal text-[var(--form-text-muted)] underline hover:text-[var(--form-text-secondary)]"
						>
							Cancel
						</button>
					{/if}
				</legend>

				<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
					{#each QUESTIONS as q (q.key)}
						<QuestionRenderer
							{q}
							index={editingIndex ?? formState.applicants.length}
							applicant={formApplicant}
							applicationData={formState.applicationData}
							applicantErrors={{ [editingIndex ?? formState.applicants.length]: formErrors }}
							showValidationErrors={hasTriedToAdd}
							isTouched={(formApplicant.touchedFields as Record<string, boolean>)?.[q.key] === true}
							{onValidate}
							onFieldChange={updateFormField}
							onFieldBlur={handleFormFieldBlur}
						/>
					{/each}
				</div>

				<!-- Action button -->
				<div
					class="mt-6 flex flex-col items-center gap-2 border-t border-[var(--form-border)] pt-4"
				>
					<button
						onclick={saveApplicant}
						class="px-6 py-2.5 {editingIndex !== null
							? 'bg-amber-600 hover:bg-amber-700'
							: 'bg-primary hover:opacity-90'} flex items-center gap-2 rounded-full text-sm font-semibold text-white shadow transition-all"
					>
						{#if editingIndex !== null}
							Update Applicant {editingIndex + 1}
						{:else}
							<CirclePlus size="16" />
							Add Applicant
						{/if}
					</button>
					{#if editingIndex !== null}
						<button
							onclick={cancelEdit}
							class="text-xs text-[var(--form-text-muted)] underline hover:text-[var(--form-text-secondary)]"
						>
							Cancel
						</button>
					{/if}
				</div>
			</fieldset>
		{:else if applicantCount > 0}
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
							: 'Individual personal loans support only 1 applicant'}
					</p>
					<p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
						{applicantType === 'joint'
							? 'To add another applicant, remove one from the table below.'
							: 'Switch to a Joint application above to add co-applicants.'}
					</p>
				</div>
			</div>
		{/if}

		<!-- ── Added Applicants Table ── -->
		{#if formState.applicants.some((a) => a.applicantType)}
			<div class="mt-8 border-t border-dashed border-[var(--form-border)] pt-6">
				<h4
					class="mb-3 text-sm font-semibold tracking-wider text-[var(--form-text-muted)] uppercase"
				>
					Added Applicants ({applicantCount})
				</h4>
			</div>
			<div
				class="mb-3 overflow-hidden rounded-xl border border-[var(--ddsa-primary-500)]/20 bg-[var(--ddsa-primary-500)]/[0.08] shadow-sm"
			>
				<table class="w-full text-sm">
					<thead class="bg-[var(--ddsa-primary-500)]/[0.12]">
						<tr>
							<th
								class="w-12 px-3 py-2.5 text-left text-xs font-semibold text-[var(--form-text-muted)]"
								>#</th
							>
							<th
								class="flex-1 px-3 py-2.5 text-left text-xs font-semibold text-[var(--form-text-muted)]"
								>Name & Details</th
							>
							<th
								class="w-16 px-3 py-2.5 text-center text-xs font-semibold text-[var(--form-text-muted)]"
								>Status</th
							>
							<th
								class="w-20 px-3 py-2.5 text-center text-xs font-semibold text-[var(--form-text-muted)]"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each formState.applicants as applicant, index (applicant.id)}
							{#if applicant.applicantType}
								<tr
									id="applicant-row-{applicant.id}"
									class="border-t border-[var(--ddsa-primary-500)]/10 transition-colors
									{editingIndex === index
										? 'bg-[var(--ddsa-primary-500)]/20'
										: 'hover:bg-[var(--ddsa-primary-500)]/[0.06]'}
									{duplicateIndexes.has(index) ? '!bg-red-500/15' : ''}"
								>
									<td class="px-3 py-2.5 text-[var(--form-text-muted)]">{index + 1}</td>
									<td class="px-3 py-2.5">
										<div class="font-medium text-[var(--form-text)]">
											{getDisplayName(applicant as LegacyApplicant, index)}
										</div>
										<div class="mt-1 text-xs text-[var(--form-text-secondary)]">
											{getSubDetails(applicant as LegacyApplicant)}
										</div>
									</td>
									<td class="px-3 py-2.5 text-center">
										{#if applicantCompletionStatus[index]}
											<span
												class="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
											>
												<CircleAlert size="14" /> OK
											</span>
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
													? 'bg-[var(--ddsa-primary-500)]/25 text-[var(--ddsa-primary-500)]'
													: 'text-[var(--form-text-muted)] hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]'} transition-colors"
												aria-label="Edit applicant"
												disabled={editingIndex === index}
											>
												<Pencil size="15" />
											</button>
											<button
												onclick={() => deleteApplicant(index)}
												class="rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
												aria-label="Delete applicant"
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

			<!-- ── Suggest Primary Applicant Banner ── -->
			<!-- Advisory: shown when a co-applicant would make a stronger primary. -->
			<SuggestPrimaryBanner
				applicants={formState.applicants as Array<Record<string, unknown>>}
				loanName={String(formState.applicationData.loanName ?? '')}
				onSetPrimary={(i) => formState.setPrimaryApplicant(i)}
			/>
		{/if}
	{/if}
</div>
