<script lang="ts">
	/**
	 * @deprecated — Replaced by ApplicantFormSecured + applicantBasicDetailsUnsecuredLoans.json
	 * All 6 loan types (Home, LAP, Plot, Personal, Professional, Business)
	 * now use the unified ApplicantFormSecured + AddApplicant system.
	 * This component is kept for reference only. Do not use in new code.
	 *
	 * BasicInfoFields — Applicant Basic Details for Unsecured Loans
	 * ═══════════════════════════════════════════════════════════════════
	 * Captures core identity fields for single-applicant unsecured loans:
	 *   - Full name (letters + spaces, 2-50 chars)
	 *   - Age (18-80)
	 *   - Gender (Male / Female)
	 *
	 * Employment type is NOT captured here — it auto-derives from
	 * income profile selection in Tab 1 via deriveLegacyEmploymentType().
	 *
	 * Design decisions:
	 *   - Name + Age appear inline (side-by-side) on desktop, stacked on mobile
	 *   - Gender appears full-width below them
	 *   - Each field has an icon for visual consistency
	 *   - Validation happens on blur (not keystroke) to reduce noise
	 *   - Syncs to applicantsStore via debounced queueMicrotask
	 *   - Writes to applicantsStorePayload for submission compatibility
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import InputField from '$lib/components/InputField.svelte';
	import NewSelect from '$lib/components/NewSelect.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { get } from 'svelte/store';
	import {
		applicantRecoveryStore,
		deniedRecoveryPrefixesStore,
		buildDetectionKey,
		matchesByName
	} from '$lib/stores/applicantRecovery';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import applicantBasicDetails from '$lib/config/applicantBasicDetails.json';
	import { onMount } from 'svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { User, Calendar, Venus, BriefcaseBusiness } from '$lib/utils/iconRegistry';
	import clientLogger from '$lib/utils/clientLogger';

	// ── Dev-only logger ──────────────────────────────────────────
	// clientLogger.debug auto-gates to dev (see $lib/utils/clientLogger).
	function devLog(label: string, ...args: unknown[]) {
		clientLogger.debug({ args }, `[BasicInfoFields] ${label}`);
	}

	// ── Props ─────────────────────────────────────────────────────
	interface Props {
		/** Index of the applicant in applicantsStore (always 0 for single-applicant) */
		selectedIndex?: number;
		/** Two-way binding: true when all visible basic fields are filled and valid */
		allFieldsFilled?: boolean;
		/** Loan name context — affects which fields are visible via showWhen rules */
		loanName?: string;
	}

	let { selectedIndex = 0, allFieldsFilled = $bindable(false), loanName = '' }: Props = $props();

	// ── Local State ───────────────────────────────────────────────
	// Local copy of form answers — synced to store via debounced writes.
	// This prevents store mutations on every keystroke (performance).
	let answers: Record<string, any> = $state({});
	let errors: Record<string, string> = $state({});
	let syncScheduled = false;
	let mounted = false;

	// ── Applicant Recovery Detection ─────────────────────────────
	// Tracks the last detection key we triggered a modal for, so we don't
	// re-ask for the same name prefix until the user clears/changes it.
	let restoreAskedForKey: string | null = null;

	// ── Visible Questions ─────────────────────────────────────────
	// Filter the JSON config to get questions visible for this loan type.
	// Employment type (q_employmentType) is excluded — it auto-derives
	// from income profile selection in the next tab.
	let visibleQuestions = $derived.by(() => {
		const context = { ...answers, ...formState.applicationData, loanName };
		return applicantBasicDetails.applicant.filter((q: any) => {
			// Skip employment type — auto-derived from income profiles
			if (q.id === 'q_employmentType') return false;
			// Skip company name for individual applicants in unsecured flow
			// (company details are captured in income profile form instead)
			if (q.id === 'q_companyName') return false;
			return shouldShow(q.showWhen, context);
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// STORE HYDRATION & SYNC
	// ═══════════════════════════════════════════════════════════════

	// Hydrate local state from store on mount (handles fresh start + session resume)
	onMount(() => {
		mounted = true;
		const storeData = formState.applicants[selectedIndex];
		devLog('onMount', { selectedIndex, hasStoreData: !!storeData, loanName });

		if (storeData) {
			// Deep-clone to avoid direct store mutation via object references
			const cloned = structuredClone(storeData);
			for (const [key, value] of Object.entries(cloned)) {
				answers[key] = value;
			}
		}

		// Validate any pre-existing values (e.g. session resume scenario)
		Object.keys(answers).forEach((key) => {
			if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') {
				validateField(key, answers[key]);
			}
		});

		devLog('onMount → hydrated', { visibleCount: visibleQuestions.length });
		return () => {
			mounted = false;
		};
	});

	// Debounced sync — push local answers to shared store
	function syncToStore(): void {
		if (syncScheduled || !mounted) return;
		syncScheduled = true;
		queueMicrotask(() => {
			syncScheduled = false;
			if (!mounted) return;
			const currentApplicants = formState.applicants as Record<string, unknown>[];
			const updated = [...currentApplicants];
			updated[selectedIndex] = { ...updated[selectedIndex], ...answers };
			formState.replaceApplicants(updated as any);
		});
	}

	// ═══════════════════════════════════════════════════════════════
	// PAYLOAD SYNC (for submission compatibility)
	// ═══════════════════════════════════════════════════════════════

	// Build the visible-questions payload for the submission handler.
	// This tells the payload builder which fields were shown to the user.
	let lastPayloadStr = '';
	$effect(() => {
		const _answers = answers;
		const appData = formState.applicationData;
		const applicant = formState.applicants[selectedIndex];
		const context = { ...applicant, ...appData, loanName };

		const questions = applicantBasicDetails.applicant.filter((q: any) => {
			if (q.id === 'q_employmentType') return false;
			if (q.id === 'q_companyName') return false;
			return shouldShow(q.showWhen as any, context);
		});

		const newPayload = [{ AddApplicantQuestions: questions }];
		const newPayloadStr = JSON.stringify(newPayload);

		if (newPayloadStr !== lastPayloadStr) {
			lastPayloadStr = newPayloadStr;
			queueMicrotask(() => {
				const safePayload = Array.isArray(formState.applicantsPayload)
					? [...formState.applicantsPayload]
					: [];
				safePayload[selectedIndex] = { ...safePayload[selectedIndex], ...newPayload[0] } as any;
				formState.replaceApplicantsPayload(safePayload as any);
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// COMPLETION CHECK
	// ═══════════════════════════════════════════════════════════════

	// Updates the bindable `allFieldsFilled` prop.
	// Parent reads this to unlock Tab 1 (income profiles).
	$effect(() => {
		const _answers = answers;
		const _errors = errors;

		if (visibleQuestions.length === 0) {
			allFieldsFilled = false;
		} else {
			allFieldsFilled = visibleQuestions.every((q: any) => {
				const value = _answers[q.key];
				const hasError = _errors[q.key];

				const isFilled =
					value !== undefined &&
					value !== null &&
					value !== '' &&
					!(typeof value === 'number' && isNaN(value));

				const isValid = !hasError || hasError === '';
				return isFilled && isValid;
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// VALIDATION
	// ═══════════════════════════════════════════════════════════════

	function validateFullName(value: string): string {
		if (!value || value.trim().length === 0) return 'Full name is required';
		if (value.trim().length < 2) return 'Name must be at least 2 characters';
		if (!/^[A-Za-z\s]+$/.test(value)) return 'Name can contain only letters and spaces';
		if (/(.)\1{2,}/.test(value)) return 'Name should not contain repetitive characters';
		return '';
	}

	function validateAge(value: string): string {
		if (!value || value.trim().length === 0) return 'Age is required';
		const age = Number(value);
		if (!Number.isFinite(age) || isNaN(age)) return 'Age must be a valid number';
		if (age < 18) return 'Age must be at least 18';
		if (age > 80) return 'Age must be at most 80';
		return '';
	}

	function validateRequired(value: string, fieldName: string): string {
		if (!value || value.trim().length === 0) return `${fieldName} is required`;
		return '';
	}

	function validateField(key: string, value: any) {
		let error = '';
		switch (key) {
			case 'fullName':
				error = validateFullName(value);
				break;
			case 'age':
				error = validateAge(value);
				break;
			case 'gender':
				error = validateRequired(value, 'Gender');
				break;
		}
		errors = { ...errors, [key]: error };
		return error;
	}

	// ── Applicant Recovery Detection ─────────────────────────────
	// Mirrors the logic from AddApplicant.svelte lines 447-498.
	// Searches the recovery cache when 3+ characters are typed in the name field,
	// and triggers the RestoreApplicantModal via restoreApplicantIntent store.
	function detectCachedApplicant() {
		const applicant = formState.applicants[selectedIndex];
		if (!applicant) return;

		// Unsecured loans are always Individual applicantType
		if (!applicant.applicantType) return;

		// Build detection key (name-only)
		const detectionKey = buildDetectionKey(applicant);
		if (!detectionKey) return;

		// Prevent re-asking for the same key (user already dismissed or restored)
		if (restoreAskedForKey === detectionKey) return;

		// Check minimum 3 characters
		const nameValue =
			applicant.applicantType === 'Individual' ? applicant.fullName : applicant.companyName;
		if (!nameValue || String(nameValue).trim().length < 3) return;

		// Check if this prefix has been denied
		const deniedPrefixes = get(deniedRecoveryPrefixesStore);
		if (deniedPrefixes.has(detectionKey)) return;

		const cache = get(applicantRecoveryStore);
		if (cache.length === 0) return;

		// Find ALL matches by name/company (partial match)
		const matches = cache.filter((entry) => matchesByName(entry, applicant));
		if (matches.length === 0) return;

		// Sort by deletion time (newest first)
		const sortedMatches = matches
			.sort((a, b) => b.deletedAt - a.deletedAt)
			.map((m) => ({
				uuid: m.uuid,
				displayName: m.displayName,
				deletedAt: m.deletedAt,
				data: m.data
			}));

		// Show popup modal
		restoreAskedForKey = detectionKey;
		restoreIntentState.set({
			open: true,
			currentIndex: selectedIndex,
			matches: sortedMatches,
			detectionKey: detectionKey
		});
	}

	// ── Event Handlers ────────────────────────────────────────────
	function handleInput(key: string) {
		if (errors[key]) errors = { ...errors, [key]: '' };
		syncToStore();

		// Trigger applicant recovery detection on name input (3+ chars)
		if (key === 'fullName') {
			const nameValue = String(answers[key] || '').trim();
			if (nameValue.length < 3) {
				restoreAskedForKey = null; // Reset when name is cleared/shortened
			} else {
				// Sync first, then detect (needs store to have latest name)
				queueMicrotask(() => detectCachedApplicant());
			}
		}
	}

	function handleBlur(key: string) {
		validateField(key, answers[key]);
		syncToStore();
	}

	function handleSelectChange(key: string) {
		validateField(key, answers[key]);
		syncToStore();
	}

	// ── Icon mapping for question types ───────────────────────────
	function getIconForField(questionId: string): any {
		switch (questionId) {
			case 'q_applicantName':
				return User;
			case 'q_applicantAge':
				return Calendar;
			case 'q_applicantGender':
				return Venus;
			default:
				return BriefcaseBusiness;
		}
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- BASIC DETAILS FORM                                              -->
<!-- Mobile: stacked full-width. Desktop: name+age inline, gender    -->
<!-- below. Subtle fade-in transition on mount.                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->
{#if visibleQuestions.length > 0}
	<div class="animate-fade-in flex flex-col gap-5">
		<!-- Heading -->
		<div class="mb-1">
			<h3 class="font-titleBold text-sm tracking-wide text-gray-700 uppercase dark:text-gray-200">
				Applicant Details
			</h3>
			<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
				Basic information as per PAN card
			</p>
		</div>

		<!-- ── Inline Group: Name + Age (desktop side-by-side) ──── -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
			{#each visibleQuestions as item (item.id)}
				{#if item.type === 'text' || item.type === 'number'}
					<div class="flex flex-col gap-1.5">
						<label for={item.key} class="font-titleMedium text-sm text-gray-600 dark:text-gray-300">
							{item.question}
						</label>
						<InputField
							id={item.key}
							type={item.type}
							inputRestriction={item.inputRestriction as
								| 'numeric'
								| 'alphabet'
								| 'alphanumeric'
								| 'currency'
								| undefined}
							maxlength={item.maxlength}
							bind:value={answers[item.key]}
							icon={item.icon}
							placeholder={item.placeholder}
							error={errors[item.key]}
							onBlur={() => handleBlur(item.key)}
							onInput={() => handleInput(item.key)}
							validateOnInput={true}
							required
						/>
					</div>
				{:else if item.type === 'selection'}
					<div class="flex flex-col gap-1.5">
						<label for={item.key} class="font-titleMedium text-sm text-gray-600 dark:text-gray-300">
							{item.question}
						</label>
						<NewSelect
							id={item.key}
							bind:value={answers[item.key]}
							options={item.options}
							error={errors[item.key]}
							onChange={() => handleSelectChange(item.key)}
							icon={item.icon}
							required
						/>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	:global(.animate-fade-in) {
		animation: fadeIn 0.3s ease-out;
	}
</style>
