<script lang="ts">
	/**
	 * DirectorFormModal — Single-director edit modal
	 * ═══════════════════════════════════════════════════════════════════
	 * Opens from the applicant summary table when clicking a director sub-row.
	 * Handles form fields, validation, name matching (for professional loans),
	 * and locked fields from linked individuals.
	 *
	 * For secured loans: includes Location, On Property, On EMI fields.
	 * All company types show On Property / On EMI fields in secured loans.
	 * ═══════════════════════════════════════════════════════════════════
	 */
	import Modal from '$lib/components/Modal.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import {
		Lock,
		Users,
		CircleAlert,
		Info,
		User,
		Calendar,
		CircleUser,
		Percent,
		Home,
		CreditCard,
		BriefcaseBusiness,
		RotateCcw
	} from '$lib/utils/iconRegistry';
	import { applicantState, type RecoveryScope } from '$lib/state/applicant.svelte';
	import {
		type DirectorForm,
		type MatchInfo,
		validateDirectorField,
		validateDirectorForm,
		findNameMatchInApplicants,
		findAllNameMatchesInApplicants,
		findSameCompanyDuplicate,
		findApplicantMatchByDetails,
		findCrossCompanyDirectorMatch,
		normalizeName,
		getTotalOwnership,
		getDefaultDesignation,
		GENDER_LABEL,
		MARITAL_LABEL,
		DESIGNATION_LABEL,
		OPC_DESIGNATION,
		DESIGNATION_BY_COMPANY
	} from '$lib/utils/directorFormUtils';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import { validateDirectorRestoreCompatibility } from '$lib/utils/directorRestoreHandler';
	import { STAKE_FULL_FINANCIALS_THRESHOLD } from '$lib/utils/applicantRoleUtils';
	import type { DirectorDesignation } from '$lib/types/form';

	// ── Props ────────────────────────────────────────────────────────
	interface ExistingIndividual {
		id: string;
		name: string;
	}

	interface Props {
		open: boolean;
		directorIndex: number;
		memberLabel: string;
		initialData: DirectorForm;
		allForms: DirectorForm[];
		isUnsecured: boolean;
		/** Company type — controls stake validation rules and field visibility */
		companyType?: string;
		/** For professional loans — existing non-director individuals to link */
		existingIndividuals?: ExistingIndividual[];
		/** Full applicants array for name matching */
		applicants?: Array<Record<string, unknown>>;
		/** All companies' director forms — for cross-company matching */
		allCompanyDirectorForms?: Map<string, DirectorForm[]>;
		/** Current company's ID */
		currentCompanyId?: string;
		/** Company applicants (for display names in banners) */
		companyApplicants?: Array<{ id: string; companyName: string }>;
		/** Recovery scope for filtering recovery bin entries */
		recoveryScope?: RecoveryScope;
		/** Professional Loan: directors are always non-financial — hide loanRole selector */
		isProfessionalLoan?: boolean;
		onSave: (data: DirectorForm) => void;
		onClose: () => void;
	}

	let {
		open = $bindable(true),
		directorIndex,
		memberLabel,
		initialData,
		allForms,
		isUnsecured,
		companyType = '',
		existingIndividuals = [],
		applicants = [],
		allCompanyDirectorForms,
		currentCompanyId,
		companyApplicants = [],
		recoveryScope,
		isProfessionalLoan = false,
		onSave,
		onClose
	}: Props = $props();

	// ── Local form state (clone of initialData) ──────────────────────
	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy, $effect below re-syncs on prop change
	// Use $state.snapshot() first to strip Svelte proxies that structuredClone can't handle,
	// then structuredClone for a deep copy. pendingMatch may contain non-cloneable references.
	let form: DirectorForm = $state(structuredClone($state.snapshot(initialData)));
	let fieldErrors: Record<string, string> = $state({});
	let hasTriedSave = $state(false);
	// Per-field "user has finished interacting" flag. Surfaces validation errors
	// only after blur or first save attempt — never on first keystroke. Previously
	// the fullName error displayed as soon as form.fullName was truthy (i.e. one
	// character typed), which spooked users mid-typing.
	let nameBlurred = $state(false);
	let nameWarning = $state('');
	let shakeMatchBanner = $state(false);

	// OPC and Partnership directors/partners are domestic by definition — NRI not applicable.
	// Only Pvt Ltd and LLP directors can be NRIs (they may live abroad but sit on Indian boards).
	const NRI_ALLOWED_COMPANY_TYPES = ['Private Limited', 'LLP'];
	const isNRIDisabled = $derived(
		!NRI_ALLOWED_COMPANY_TYPES.includes(companyType) || isLocked('isNRI')
	);

	// Reset form when initialData changes (different director opened)
	// IMPORTANT: mutate the clone BEFORE assigning to `form` — writing
	// `form.isNRI = 'No'` would read `form` inside the effect, making it
	// a dependency and causing an infinite loop (effect_update_depth_exceeded).
	$effect(() => {
		const cloned = structuredClone($state.snapshot(initialData));
		// Force isNRI to "No" for OPC/Partnership — domestic entity directors
		if (!NRI_ALLOWED_COMPANY_TYPES.includes(companyType)) {
			cloned.isNRI = 'No';
		}
		form = cloned;
		fieldErrors = {};
		hasTriedSave = false;
		nameBlurred = false;
		nameWarning = '';
	});

	// ── Field update with validation ─────────────────────────────────
	// Mutates the $state proxy field-in-place so only readers of that specific field
	// re-run — avoids invalidating every form.* binding on every keystroke.
	// The no-op guard also prevents $effect loops when called from reactive contexts.
	function updateField(field: keyof DirectorForm, value: string) {
		if ((form as unknown as Record<string, unknown>)[field] === value) return;
		(form as unknown as Record<string, unknown>)[field] = value;
		const error = validateDirectorField(field, value, isUnsecured, companyType);
		if (error) {
			fieldErrors = { ...fieldErrors, [field]: error };
		} else {
			const { [field]: _, ...rest } = fieldErrors;
			fieldErrors = rest;
		}
	}

	// When a pending match exists, block all field editing until user answers
	const hasPendingMatch = $derived(!!form.pendingMatch);

	function isLocked(field: string): boolean {
		if (form.lockedFields.includes(field)) return true;
		if (isPrimaryElsewhere && SHARED_IDENTITY_FIELDS.includes(field)) return true;
		return false;
	}

	// ── Autofill / paste detection: watch fullName for changes not caught by blur ──
	// Only fires when modal is open and name changes AFTER initial load (skip first render).
	let _prevFullName = '';
	let _autofillTimer: ReturnType<typeof setTimeout> | null = null;
	let _autofillReady = false;
	// Track the name for which user denied recovery — don't re-trigger until
	// the name changes significantly (different first 3 chars = different person)
	// Track the name for which detection already ran — prevents re-triggering
	// on every keystroke. Only re-triggers when name changes to a different person.
	let _detectionRanForKey: string | null = null;
	$effect(() => {
		if (!open) {
			// Reset when modal closes — don't fire on close
			_prevFullName = '';
			_autofillReady = false;
			_detectionRanForKey = null;
			if (_autofillTimer) {
				clearTimeout(_autofillTimer);
				_autofillTimer = null;
			}
			return;
		}
		const name = form.fullName;
		if (!_autofillReady) {
			// Skip the initial render when modal opens with pre-filled name
			_prevFullName = name;
			_autofillReady = true;
			return;
		}
		if (name !== _prevFullName) {
			_prevFullName = name;
			if (_autofillTimer) clearTimeout(_autofillTimer);
			if (name.trim().length >= 3) {
				_autofillTimer = setTimeout(() => handleNameBlur(), 400);
			}
		}
	});

	// ── Name blur: check for matches ─────────────────────────────────
	function handleNameBlur() {
		const name = form.fullName.trim();
		if (name.length < 3) {
			form.pendingMatch = null;
			nameWarning = '';
			return;
		}

		// Check same-company duplicate (exact name match only)
		const dup = findSameCompanyDuplicate(allForms, directorIndex, name);
		if (dup) {
			nameWarning = `Same name as ${memberLabel} ${dup.dupIdx + 1}. If these are different people, you may continue.`;
			form.pendingMatch = null;
			return;
		}
		nameWarning = '';

		// Don't re-check if already restored or already confirmed as different person
		if (form.restoredFrom) return;
		if (form.crossCompanyMatch && !form.crossCompanyMatch.confirmed) return;

		// Same pattern as main applicant's restoreAskedForKey — don't re-trigger
		// detection for the same name. Re-triggers only when name changes.
		const detectionKey = name.toLowerCase().slice(0, 5);
		if (_detectionRanForKey === detectionKey) return;
		_detectionRanForKey = detectionKey;

		// Check cross-company directors
		if (allCompanyDirectorForms && currentCompanyId) {
			const crossMatch = findCrossCompanyDirectorMatch(
				name,
				allCompanyDirectorForms,
				currentCompanyId
			);
			if (crossMatch) {
				const companyLabel =
					companyApplicants.find((c) => c.id === crossMatch.companyId)?.companyName ??
					'another company';
				form.pendingMatch = {
					source: `Director of ${companyLabel}`,
					data: {
						gender: crossMatch.form.gender,
						age: crossMatch.form.age,
						maritalStatus: crossMatch.form.maritalStatus,
						isNRI: crossMatch.form.isNRI,
						location: crossMatch.form.location
					},
					lockedFields: ['gender', 'age', 'maritalStatus', 'isNRI', 'location'],
					matchedId: crossMatch.form.id
				};
				return;
			}
		}

		// Collect ALL matches: live applicants + recovery bin
		// Filter out UUIDs the user already denied ("Not this person") so the
		// modal doesn't keep reappearing after dismissal.
		const liveMatches = findAllNameMatchesInApplicants(name, applicants, currentCompanyId);
		const recoveryMatches = applicantState.filterDeniedMatches(
			applicantState.findRecoverableByName(
				{ applicantType: 'Individual', fullName: name } as Record<string, unknown>,
				recoveryScope
			)
		);

		const allModalMatches = [
			// Live applicants (already in form) — filter denied UUIDs
			...applicantState.filterDeniedMatches(
				liveMatches.map((m) => ({
					uuid: m.matchedId ?? '',
					displayName: m.source,
					deletedAt: 0,
					data: applicants.find((a) => a.id === m.matchedId) ?? {},
					matchSource: 'live' as const,
					liveIndex: applicants.findIndex((a) => a.id === m.matchedId)
				}))
			),
			// Recovery bin (previously deleted) — already filtered above
			...recoveryMatches
				.sort((a, b) => b.deletedAt - a.deletedAt)
				.map((m) => {
					// Compute role compatibility warning
					const compat = companyType
						? validateDirectorRestoreCompatibility(m, companyType, memberLabel.toLowerCase())
						: undefined;
					return {
						uuid: m.uuid,
						displayName: m.displayName,
						deletedAt: m.deletedAt,
						data: m.data ?? {},
						matchSource: 'recovery' as const,
						summary: m.summary,
						// Context fields for disambiguation
						linkedCompanyName: m.linkedCompanyName,
						directorRole: m.directorRole,
						loanProduct: m.loanProduct,
						employmentType: m.employmentType,
						roleWarning: compat?.warning
					};
				})
		];

		if (allModalMatches.length === 1 && liveMatches.length === 1) {
			// Single live match: use inline banner
			form.pendingMatch = liveMatches[0];
			return;
		} else if (allModalMatches.length > 0) {
			// Multiple matches (or single recovery): show selection modal
			// Pass company name + entity type into the restore intent so the
			// director restore handler can match by content (Issue #2 / Option B)
			// when the saved match has a different company UUID but is the same
			// company by name + entity type.
			const currentCompanyName = currentCompanyId
				? companyApplicants.find((c) => c.id === currentCompanyId)?.companyName
				: undefined;
			restoreIntentState.set({
				open: true,
				matches: allModalMatches as any[],
				directorRestore: currentCompanyId
					? {
							companyId: currentCompanyId,
							directorIdx: directorIndex,
							companyName: currentCompanyName,
							companyEntityType: companyType || undefined
						}
					: undefined
			});
			return;
		}

		form.pendingMatch = null;
	}

	// ── Accept/reject name match ─────────────────────────────────────
	function acceptMatch() {
		if (!form.pendingMatch) return;
		const match = form.pendingMatch;

		// Determine if this is a cross-company director match (lock fields)
		// vs a live applicant/recovery match (pre-fill but editable)
		const isCrossCompanyMatch = match.source?.startsWith('Director of ');

		form = {
			...form,
			...match.data,
			restoredFrom: match.source,
			// Only lock fields for cross-company matches — live applicant matches are editable
			lockedFields: isCrossCompanyMatch ? match.lockedFields : [],
			pendingMatch: null,
			// Only set crossCompanyMatch for actual cross-company director matches
			crossCompanyMatch:
				isCrossCompanyMatch && match.matchedId
					? {
							confirmed: true,
							matchedCompanyId: currentCompanyId ?? '',
							matchedDirectorId: match.matchedId
						}
					: form.crossCompanyMatch
		};
		if (isUnsecured) {
			form.location = 'same_city';
			form.onProperty = 'false';
		}
		if (match.matchedId) {
			form.id = match.matchedId;
		}

		// Clear errors for locked fields
		const cleaned = { ...fieldErrors };
		for (const f of match.lockedFields) delete cleaned[f];

		// Validate restored ownership doesn't push total over 100%
		if (form.ownershipPercent) {
			const otherForms = allForms.filter((_, i) => i !== directorIndex);
			const othersTotal = getTotalOwnership(otherForms);
			const restoredStake = Number(form.ownershipPercent) || 0;
			if (othersTotal + restoredStake > 100) {
				cleaned.ownershipPercent = `Total would be ${othersTotal + restoredStake}% (max 100%). Please adjust.`;
				// Unlock ownership so DSA can correct it
				form.lockedFields = form.lockedFields.filter((f) => f !== 'ownershipPercent');
			}
		}
		fieldErrors = cleaned;
	}

	function rejectMatch() {
		const match = form.pendingMatch;
		form = {
			...form,
			pendingMatch: null,
			restoredFrom: '',
			lockedFields: [],
			// Persist "different person" confirmation
			crossCompanyMatch: match?.matchedId
				? {
						confirmed: false,
						matchedCompanyId: currentCompanyId ?? '',
						matchedDirectorId: match.matchedId
					}
				: form.crossCompanyMatch
		};
	}

	// ── Link existing individual (professional loans) ────────────────
	function linkExistingIndividual(individual: ExistingIndividual) {
		// Find in applicants and create match
		const match = findNameMatchInApplicants(individual.name, applicants);
		if (match) {
			form = {
				...form,
				fullName: individual.name,
				...match.data,
				restoredFrom: match.source,
				lockedFields: match.lockedFields,
				pendingMatch: null
			};
			if (isUnsecured) {
				form.location = 'same_city';
				form.onProperty = 'false';
			}
			if (match.matchedId) {
				form.id = match.matchedId;
			}
		}
	}

	// ── Save ─────────────────────────────────────────────────────────
	function handleSave() {
		// Block save if pending match question is unanswered
		if (form.pendingMatch) {
			// Force re-trigger: reset first so the animation restarts on repeated clicks
			shakeMatchBanner = false;
			requestAnimationFrame(() => {
				shakeMatchBanner = true;
				setTimeout(() => {
					shakeMatchBanner = false;
				}, 600);
			});
			return;
		}

		hasTriedSave = true;
		const errors = validateDirectorForm(form, isUnsecured, companyType, isProfessionalLoan);
		// Skip validation errors for locked fields (synced from linked Individual at commit time)
		if (isPrimaryElsewhere) {
			for (const field of SHARED_IDENTITY_FIELDS) {
				delete errors[field];
			}
		}
		if (Object.keys(errors).length > 0) {
			fieldErrors = errors;
			return;
		}

		// Check if this director matches an existing standalone Individual applicant
		// Skip if already restored/linked from a match
		if (!form.restoredFrom) {
			const match = findApplicantMatchByDetails(form, applicants);
			if (match && match.matchedId !== form.id) {
				openConfirmModal(
					'Existing Applicant Found',
					`This ${memberLabel.toLowerCase()} "${form.fullName}" matches existing Applicant ${match.applicantIndex + 1} ("${match.matchedName}") by name, age, and gender. Would you like to bring them under this company? This avoids duplicate entries.`,
					() => {
						// Merge: set director's ID to matched applicant's ID so commitDirectorsToApplicants merges them
						form.id = match.matchedId;
						form.restoredFrom = `Applicant ${match.applicantIndex + 1} (${match.matchedName})`;
						onSave($state.snapshot(form) as DirectorForm);
					},
					{
						confirmLabel: 'Yes, merge',
						cancelLabel: 'No, keep separate',
						onCancel: () => {
							// Save as-is without merging
							onSave($state.snapshot(form) as DirectorForm);
						}
					}
				);
				return;
			}
		}

		onSave($state.snapshot(form) as DirectorForm);
	}

	function handleClose() {
		open = false;
		onClose();
	}

	// ── Derived ──────────────────────────────────────────────────────
	const isOPCCompany = $derived(companyType === 'One Person Company (OPC)');
	const lockOwnership = $derived(isOPCCompany);

	// Allowed designations for the current company type (empty for unknown types).
	const allowedDesignations = $derived(DESIGNATION_BY_COMPANY[companyType] ?? []);

	// Show designation whenever the company type has any allowed designation.
	// (OPC, Pvt Ltd, Partnership, LLP all qualify; unknown types hide the field.)
	const showDesignation = $derived(allowedDesignations.length > 0);

	// Lock when only one designation is valid for this company type:
	//   - OPC            → Managing Director
	//   - Partnership    → Partner
	//   - LLP            → Designated Partner
	// Pvt Ltd has two options (MD / Director), so the user chooses.
	const lockDesignation = $derived(allowedDesignations.length === 1);

	// Label shown in the read-only badge (e.g. "Managing Director").
	const lockedDesignationLabel = $derived(
		lockDesignation ? (DESIGNATION_LABEL[allowedDesignations[0]] ?? '') : ''
	);

	const designationOptions = $derived(
		allowedDesignations.map((value) => ({
			label: DESIGNATION_LABEL[value] ?? value,
			value
		}))
	);

	// Keep form.designation in sync with the allowed set when companyType changes.
	// - Single allowed → force to that value (auto-set, matches the read-only badge)
	// - Multiple allowed (Pvt Ltd) → if current is empty or invalid, fall back to
	//   the sensible default ('director'). This ensures the dropdown always reads
	//   as interactive (visible value) and matches createEmptyDirectorForm so
	//   freshly-created and entity-switched forms behave consistently.
	$effect(() => {
		const allowed = allowedDesignations;
		if (allowed.length === 0) return; // unknown type; leave as-is
		const current = form.designation as DirectorDesignation;
		if (allowed.length === 1) {
			if (current !== allowed[0]) updateField('designation', allowed[0]);
			return;
		}
		// Multiple allowed: if empty OR invalid for this company type, set to default
		if (!current || !allowed.includes(current)) {
			const fallback = getDefaultDesignation(companyType) as DirectorDesignation;
			// Guard against infinite loop: only update if the value actually changes
			if (fallback && current !== fallback) updateField('designation', fallback);
		}
	});

	// LoanRole is only applicable for PvtLtd/OPC in unsecured loans
	// Professional Loan: directors are always non-financial — skip loanRole entirely
	const ROLE_BASED_TYPES = ['Private Limited', 'One Person Company (OPC)'];
	const showLoanRole = $derived(
		isUnsecured && !isProfessionalLoan && ROLE_BASED_TYPES.includes(companyType)
	);
	// Threshold mirrors the rule-engine constant (STAKE_FULL_FINANCIALS_THRESHOLD = 20).
	// Frontend previously hardcoded 25, which drifted from the backend's 20: a 22%
	// director got asked to pick a loanRole that the rule engine then silently
	// overrode to 'borrower' anyway. Aligning to the constant eliminates the
	// disagreement (P16, 2026-05-25).
	const stakeExceedsThreshold = $derived(
		Number(form.ownershipPercent) > STAKE_FULL_FINANCIALS_THRESHOLD
	);
	// OPC director always has 100% stake, but lock loanRole explicitly too.
	// When locked, the role is forced to 'co_borrower' (full financials required) —
	// the lender treats stake over the threshold as full participation regardless
	// of any other designation. Surfacing this as a read-only badge instead of a
	// disabled dropdown — disabled dropdowns confused users into thinking the
	// field was required-but-blank. (Reported 2026-05-02.)
	const lockLoanRole = $derived(isOPCCompany || stakeExceedsThreshold);

	// Auto-set form.loanRole to the implied value whenever the role is locked.
	// Otherwise the read-only badge would show a stale or empty value.
	$effect(() => {
		if (showLoanRole && lockLoanRole && form.loanRole !== 'co_borrower') {
			updateField('loanRole', 'co_borrower');
		}
	});

	/** Human-readable label for the auto-locked loan role (used in read-only badge). */
	const lockedLoanRoleLabel = $derived(
		isOPCCompany
			? 'Co-borrower (full financials) — single member of OPC'
			: `Co-borrower (full financials) — stake exceeds ${STAKE_FULL_FINANCIALS_THRESHOLD}%`
	);

	const showLinkBanner = $derived(
		existingIndividuals.length > 0 && !form.restoredFrom && !form.fullName.trim()
	);

	/** Show On Property / On EMI fields for ALL company types in secured loans */
	const showOnPropertyEMI = $derived(!isUnsecured);

	// ── Options arrays for SelectField ──────────────────────────────
	const genderOptions = Object.entries(GENDER_LABEL).map(([value, label]) => ({ label, value }));
	const maritalOptions = Object.entries(MARITAL_LABEL).map(([value, label]) => ({ label, value }));
	const nriOptions = [
		{ label: 'Yes', value: 'Yes' },
		{ label: 'No', value: 'No' }
	];
	const yesNoOptions = [
		{ label: 'Yes', value: 'true' },
		{ label: 'No', value: 'false' }
	];
	const loanRoleOptions = [
		{ label: 'Co-borrower (full financials)', value: 'co_borrower' },
		{ label: 'Guarantor (CIBIL + obligations)', value: 'guarantor' },
		{ label: 'Information only (profile)', value: 'information_only' }
	];

	/** Is this director's "primary home" a different company?
	 * Only true AFTER user has confirmed "Yes, same person" via the pending match prompt.
	 * Before confirmation, we show the prompt instead of silently locking fields. */
	const isPrimaryElsewhere = $derived.by(() => {
		// Only lock fields if user explicitly confirmed same-person match
		if (form.crossCompanyMatch?.confirmed) return true;
		// If match was explicitly rejected, or no match state yet, don't lock
		return false;
	});

	/** Shared identity fields that are locked when primary is elsewhere */
	const SHARED_IDENTITY_FIELDS = ['gender', 'age', 'maritalStatus', 'isNRI', 'onProperty', 'onEMI'];

	// ── Auto-populate locked fields from linked Individual ─────────
	$effect(() => {
		if (!isPrimaryElsewhere) return;
		// Find the linked Individual by matching director name
		const dirName = form.fullName.trim().toLowerCase();
		if (!dirName) return;
		const linked = applicants.find(
			(a) =>
				a.applicantType === 'Individual' &&
				String(a.fullName ?? '')
					.trim()
					.toLowerCase() === dirName
		) as Record<string, unknown> | undefined;
		if (!linked) return;

		// Sync identity fields from the Individual → director form.
		// Always overwrite locked fields so they stay reactive — when the DSA
		// changes flags on the Individual, the director form reflects it live.
		let updated = false;
		const patch: Partial<DirectorForm> = {};
		if (linked.gender) {
			const v = String(linked.gender);
			if (form.gender !== v) {
				patch.gender = v;
				updated = true;
			}
		}
		if (linked.age) {
			const v = String(linked.age);
			if (form.age !== v) {
				patch.age = v;
				updated = true;
			}
		}
		if (linked.maritalStatus) {
			const v = String(linked.maritalStatus);
			if (form.maritalStatus !== v) {
				patch.maritalStatus = v;
				updated = true;
			}
		}
		if (linked.isNRI !== undefined) {
			const v = String(linked.isNRI);
			if (form.isNRI !== v) {
				patch.isNRI = v;
				updated = true;
			}
		}
		if (linked.onProperty !== undefined) {
			const v = String(linked.onProperty);
			if (form.onProperty !== v) {
				patch.onProperty = v;
				updated = true;
			}
		}
		if (linked.onEMI !== undefined) {
			const v = String(linked.onEMI);
			if (form.onEMI !== v) {
				patch.onEMI = v;
				updated = true;
			}
		}
		if (updated) {
			form = { ...form, ...patch };
		}
	});
</script>

<Modal bind:showModal={open} onclose={handleClose} closeOnOutside={false} maxWidth="max-w-xl">
	{#snippet modalTitle()}
		<div class="flex items-center gap-2">
			<Users size={18} class="text-[var(--form-text)]" />
			<h3 class="font-titleBold text-labelQuestion !m-0 text-[var(--form-text)]">
				Stakeholder {directorIndex + 1} ({memberLabel})
			</h3>
		</div>
	{/snippet}

	<div class="director-form mt-4 space-y-5">
		<!-- Cross-company primary elsewhere banner -->
		{#if isPrimaryElsewhere}
			<div class="warning-message !border-l-1">
				<Info size={18} class="shrink-0" />
				<p class="alertText">
					This person's details are managed from their primary entry. Shared fields (gender, age,
					marital status, NRI, property & EMI) are synced automatically.
				</p>
			</div>
		{/if}

		<!-- Link existing individual banner (professional loans) -->
		{#if showLinkBanner}
			<div class="warning-message flex justify-between !border-l-1">
				<p class="font-titleMedium mb-2">
					Is this {memberLabel.toLowerCase()} one of the existing applicants?
				</p>
				<div class="flex flex-wrap gap-2">
					{#each existingIndividuals as ind (ind.id)}
						<button
							onclick={() => linkExistingIndividual(ind)}
							class="cursor-pointer rounded-lg border px-3 py-1.5 transition-colors hover:opacity-90"
						>
							{ind.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Pending match prompt — user MUST answer before editing or saving -->
		{#if form.pendingMatch}
			<div
				class="warning-message flex flex-col gap-2 !border-l-1 {shakeMatchBanner
					? 'shake-horizontal'
					: ''}"
			>
				<p class="alertText font-titleBold">We found an existing record matching this name</p>
				<p class="alertText mt-1">
					<strong class="font-titleBold">
						"{form.fullName}"
					</strong>
					matches
					<strong class="font-titleBold">
						{form.pendingMatch.source}
					</strong> already in the system. If this is the same person, their details will be auto-filled
					to avoid duplicate data entry. Please confirm before proceeding.
				</p>
				<div class="mt-3 flex gap-2">
					<button
						onclick={acceptMatch}
						class="buttonText cursor-pointer rounded-lg bg-amber-600 px-4 py-1.5 text-white transition-colors hover:bg-amber-700"
					>
						Yes, same person — auto-fill
					</button>
					<button
						onclick={rejectMatch}
						class="buttonText cursor-pointer rounded-lg border border-amber-300 px-4 py-1.5 text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
					>
						No, different person
					</button>
				</div>
			</div>
		{/if}

		<!-- Name warning -->
		{#if nameWarning}
			<div class="warning-message !border-l-1">
				{nameWarning}
			</div>
		{/if}

		<!-- Form fields — disabled when pending match requires user answer -->
		<div class={hasPendingMatch ? 'pointer-events-none opacity-40' : ''}>
			<!-- ── Personal Details ── -->
			<p
				class="font-titleBold tinyText mt-1 tracking-widest text-(--form-text-muted) uppercase underline underline-offset-4"
			>
				Personal Details
			</p>
			<div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
				<!-- Full Name -->
				<div class="col-span-2">
					<TextField
						id="director-fullName"
						label={isLocked('fullName') ? 'Full Name 🔒' : 'Full Name'}
						value={form.fullName}
						placeholder="e.g. Rajesh Kumar Sharma"
						inputFieldClass="rounded-[1rem]"
						icon="user"
						labelClass="mb-1"
						disabled={isLocked('fullName')}
						required={true}
						maxLength={50}
						error={(hasTriedSave || nameBlurred) && fieldErrors.fullName
							? fieldErrors.fullName
							: null}
						onInput={(v) => updateField('fullName', v)}
						onBlur={() => {
							nameBlurred = true;
							handleNameBlur();
						}}
					/>
					<!-- Re-trigger recovery link — same pattern as main applicant flow -->
					{#if applicantState.hasDeniedUUIDs() && form.fullName.trim().length >= 3 && !form.restoredFrom}
						<button
							type="button"
							class="tinyText cursor-pointer text-primary underline-offset-4 hover:underline"
							onclick={() => {
								applicantState.clearAllDeniedUUIDs();
								_detectionRanForKey = null;
								handleNameBlur();
							}}
						>
							Check for previous records
						</button>
					{/if}
				</div>

				<!-- Gender -->
				<SelectField
					id="director-gender"
					label={isLocked('gender') ? 'Gender 🔒' : 'Gender'}
					labelClass="mb-1"
					selectIconClass="rounded-l-[1rem] border-r"
					options={genderOptions}
					value={form.gender}
					disabled={isLocked('gender')}
					required={true}
					icon="VenusAndMars"
					subLabel="gender"
					onChange={(v) => updateField('gender', String(v))}
					error={hasTriedSave && fieldErrors.gender ? fieldErrors.gender : null}
				/>

				<!-- Age -->
				<TextField
					id="director-age"
					label={isLocked('age') ? 'Age 🔒' : 'Age'}
					labelClass="mb-1"
					inputFieldClass="rounded-[1rem]"
					value={form.age}
					placeholder="e.g. 35"
					icon="Calendar"
					disabled={isLocked('age')}
					required={true}
					uiType="number"
					type="text"
					error={hasTriedSave && fieldErrors.age ? fieldErrors.age : null}
					onInput={(v) => updateField('age', v)}
				/>

				<!-- Marital Status -->
				<SelectField
					id="director-maritalStatus"
					label={isLocked('maritalStatus') ? 'Marital Status 🔒' : 'Marital Status'}
					labelClass="mb-1"
					selectIconClass="rounded-l-[1rem] border-r"
					options={maritalOptions}
					value={form.maritalStatus}
					disabled={isLocked('maritalStatus')}
					required={true}
					icon="Heart"
					subLabel="status"
					onChange={(v) => updateField('maritalStatus', String(v))}
					error={hasTriedSave && fieldErrors.maritalStatus ? fieldErrors.maritalStatus : null}
				/>

				<!-- Is NRI — disabled for OPC/Partnership (domestic), editable for Pvt Ltd/LLP -->
				<SelectField
					id="director-isNRI"
					label={isNRIDisabled ? 'Is NRI? 🔒' : 'Is NRI?'}
					labelClass="mb-1"
					selectIconClass="rounded-l-[1rem] border-r"
					options={nriOptions}
					value={form.isNRI}
					disabled={isNRIDisabled}
					required={true}
					icon="Globe"
					subLabel="NRI status"
					onChange={(v) => updateField('isNRI', String(v))}
					error={hasTriedSave && fieldErrors.isNRI ? fieldErrors.isNRI : null}
				/>
			</div>

			<!-- ── Stake & Role ── -->
			<p
				class="font-titleBold tinyText mt-1 mt-4 tracking-widest text-(--form-text-muted) uppercase underline underline-offset-4"
			>
				Stake &amp; Role
			</p>
			<div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-4">
				<!-- Ownership % -->
				<TextField
					id="director-ownership"
					label={lockOwnership ? 'Ownership % 🔒' : 'Ownership %'}
					labelClass="mb-1"
					inputFieldClass="rounded-[1rem]"
					value={form.ownershipPercent}
					placeholder="e.g. 51"
					icon="Percent"
					disabled={lockOwnership}
					required={true}
					uiType="number"
					fieldType="percentage"
					type="text"
					maxLimit={100}
					helperText={lockOwnership ? 'OPC — sole director owns 100%' : ''}
					error={hasTriedSave && fieldErrors.ownershipPercent ? fieldErrors.ownershipPercent : null}
					onInput={(v) => updateField('ownershipPercent', v)}
				/>

				<!-- Designation — dropdown for Pvt Ltd, read-only badge for OPC/Partnership/LLP -->
				{#if showDesignation}
					<!-- {#if lockDesignation} -->
					<!-- Read-only badge: guarantees the auto-set value is always visible
						     (a disabled SelectField can render blank if the value doesn't resolve) -->
					<!-- <div class="flex flex-col gap-1.5">
							<p class="font-titleMedium text-sm text-(--form-text)">
								Designation <span class="text-xs text-(--form-text-muted) italic">(auto)</span>
							</p>
							<div
								class="flex items-center gap-2 rounded-lg border border-(--form-border) bg-(--form-bg-alt) px-4 py-3"
							>
								<Lock class="h-4 w-4 shrink-0 text-(--form-text-muted)" />
								<span class="text-sm font-medium text-(--form-text)">
									{lockedDesignationLabel}
								</span>
							</div>
							<p class="smallText text-[var(--form-text-muted)]">
								Set from company type — cannot be changed
							</p>
						</div> -->

					<SelectField
						id="director-designation"
						label={lockDesignation ? 'Designation 🔒' : 'Designation'}
						labelClass="mb-1"
						selectIconClass="rounded-l-[1rem] border-r"
						options={designationOptions}
						value={form.designation}
						disabled={lockDesignation}
						required={true}
						icon="BriefcaseBusiness"
						subLabel="designation"
						onChange={(v) => updateField('designation', String(v))}
						error={hasTriedSave && fieldErrors.designation ? fieldErrors.designation : null}
					/>
					<!-- {:else} -->
					<!-- <SelectField
							id="director-designation"
							label="Designation"
							labelClass="mb-1"
							options={designationOptions}
							value={form.designation}
							required={true}
							icon="BriefcaseBusiness"
							subLabel="designation"
							onChange={(v) => updateField('designation', String(v))}
							error={hasTriedSave && fieldErrors.designation ? fieldErrors.designation : null}
						/> -->
					<!-- {/if} -->
				{/if}

				<!-- On Property + Will Pay EMI — forced into same row via col-span-2 nested grid -->
				{#if showOnPropertyEMI}
					<div class="col-span-2 grid grid-cols-2 gap-x-4">
						<SelectField
							id="director-onProperty"
							label={isLocked('onProperty') ? 'On Property? 🔒' : 'On Property?'}
							labelClass="mb-1"
							selectIconClass="rounded-l-[1rem] border-r"
							options={yesNoOptions}
							value={form.onProperty}
							disabled={isLocked('onProperty')}
							required={true}
							icon="home"
							subLabel="option"
							onChange={(v) => updateField('onProperty', String(v))}
							error={hasTriedSave && fieldErrors.onProperty ? fieldErrors.onProperty : null}
						/>
						<SelectField
							id="director-onEMI"
							label={isLocked('onEMI') ? 'Will Pay EMI? 🔒' : 'Will Pay EMI?'}
							labelClass="mb-1"
							selectIconClass="rounded-l-[1rem] border-r"
							options={yesNoOptions}
							value={form.onEMI}
							disabled={isLocked('onEMI')}
							required={true}
							icon="credit-card"
							subLabel="option"
							onChange={(v) => updateField('onEMI', String(v))}
							error={hasTriedSave && fieldErrors.onEMI ? fieldErrors.onEMI : null}
						/>
					</div>
				{/if}

				<!-- Role in Loan (PvtLtd/OPC unsecured only) -->
				{#if showLoanRole}
					<div class="col-span-2">
						{#if lockLoanRole}
							<!-- Read-only badge — same pattern as the locked Designation field above.
								 The value is auto-set via $effect so the user always sees the implied
								 role rather than a confusing disabled dropdown showing "Select role". -->
							<div class="flex flex-col gap-1.5">
								<p class="font-titleMedium text-sm text-(--form-text)">
									Role in Loan <span class="text-xs text-(--form-text-muted) italic">(auto)</span>
								</p>
								<div
									class="flex items-center gap-2 rounded-lg border border-(--form-border) bg-(--form-bg-alt) px-4 py-3"
								>
									<Lock class="h-4 w-4 shrink-0 text-(--form-text-muted)" />
									<span class="text-sm font-medium text-(--form-text)">
										{lockedLoanRoleLabel}
									</span>
								</div>
								<p class="text-xs text-(--form-text-muted)">
									Set automatically — full financials are required at this stake level.
								</p>
							</div>
						{:else}
							<SelectField
								id="director-loanRole"
								label="Role in Loan"
								selectIconClass="rounded-l-[1rem] border-r"
								options={loanRoleOptions}
								value={form.loanRole}
								required={true}
								icon="BriefcaseBusiness"
								subLabel="role"
								onChange={(v) => updateField('loanRole', String(v))}
								error={hasTriedSave && !form.loanRole ? 'Loan role is required' : null}
							/>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Restored from indicator -->
			{#if form.restoredFrom}
				<div class="success-message mt-4 !border-l-1">
					<Lock size={18} />
					<p>Linked from : {form.restoredFrom}</p>
				</div>
			{/if}
		</div>
		<!-- /hasPendingMatch wrapper -->

		<!-- Footer buttons -->
		<div class="flex items-center justify-end gap-3 border-t border-[var(--form-border)] pt-4">
			<button
				onclick={handleClose}
				class="rounded-lg border border-[var(--form-border)] hover:border-[var(--form-border-hover)] px-4 py-2 text-[var(--form-text)] buttonText transition-all hover:bg-[var(--form-bg-alt)] cursor-pointer"
			>
				Cancel
			</button>
			<button
				onclick={handleSave}
				class="bg-ddsa-gradient-primary rounded-lg px-5 py-2 text-[var(--form-text)] buttonText transition-all cursor-pointer hover:opacity-90"
			>
				Save {memberLabel}
			</button>
		</div>
	</div>
</Modal>

<style>
	@keyframes shake-horizontal {
		0%,
		100% {
			transform: translateX(0);
		}
		10%,
		30%,
		50%,
		70%,
		90% {
			transform: translateX(-4px);
		}
		20%,
		40%,
		60%,
		80% {
			transform: translateX(4px);
		}
	}
	:global(.shake-horizontal) {
		animation: shake-horizontal 0.5s ease-in-out;
	}

	/* ── Director form: lighter icon style (no dark backgrounds) ── */
	.director-form :global(.icon-empty) {
		background: transparent !important;
		border-right: 1px solid var(--form-border, #e2e8f0);
	}
	.director-form :global(.icon-empty) :global(svg) {
		color: #9ca3af !important; /* gray-400 */
	}
	.director-form :global(.icon-filled) {
		background: transparent !important;
		border-right: 1px solid var(--ddsa-primary-500);
	}
	.director-form :global(.icon-filled) :global(svg) {
		color: var(--ddsa-primary-500) !important;
	}
	.director-form :global(.icon-focused) {
		background: transparent !important;
		border-right: 1px solid var(--ddsa-primary-500);
		box-shadow: none !important;
	}
	.director-form :global(.icon-focused) :global(svg) {
		color: var(--ddsa-primary-500) !important;
	}
	:global(.dark) .director-form :global(.icon-empty) {
		background: transparent !important;
		border-right: 1px solid var(--form-border, #334155);
	}
	:global(.dark) .director-form :global(.icon-empty) :global(svg) {
		color: #6b7280 !important; /* gray-500 */
	}

	/* ── Uniform input background: match TextField to CustomSelect ── */
	.director-form :global(input.inputText) {
		background-color: var(--form-bg-input, var(--form-bg-card)) !important;
	}
	/* ── Disabled/locked inputs: visible grayout ── */
	.director-form :global(input:disabled),
	.director-form :global(select:disabled) {
		opacity: 0.55 !important;
		cursor: not-allowed !important;
		background-color: var(--form-bg-disabled, #f1f5f9) !important;
	}
	:global(.dark) .director-form :global(input:disabled),
	:global(.dark) .director-form :global(select:disabled) {
		background-color: var(--form-bg-disabled, #1e293b) !important;
	}
</style>
