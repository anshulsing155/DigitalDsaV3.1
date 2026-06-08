<script lang="ts">
	/**
	 * Business Runner Page — Sole-Proprietorship Co-Applicant Capture
	 * ═══════════════════════════════════════════════════════════════════
	 * Renders ONLY when a female sole proprietor declared on "Who runs the
	 * business?" that someone else (Husband / Father / Son / Other) runs the
	 * business. That person was auto-added to formState.applicants as a
	 * `business_runner` co-applicant by AddApplicantBusiness; this page is
	 * where the DSA fills in that person's actual name + age + (for Other)
	 * gender + relation.
	 *
	 * Why a dedicated page (Option 3) instead of inline / auto-magic:
	 *  - DSA sees a clear "Business Runner Details" step instead of a
	 *    silently-added card hidden in a multi-applicant list.
	 *  - Age-gap validation against the proprietor's age fires on a real
	 *    field with a real message ("Husband must be within 15 years of
	 *    proprietor (32 yrs) → 17–47") instead of post-save silent scrubs.
	 *  - For Husband / Father / Son the gender is hidden (locked male) and
	 *    the relation is hidden (already known from the answer above) —
	 *    fewer questions, no DSA confusion.
	 *  - For Other the gender + relation are asked here, so the separate
	 *    Family Relationships picker page is no longer needed at all for
	 *    sole-prop cases.
	 *
	 * Sub-step slot: `applicantPageIndex === 1` (reused from the
	 * Family-Relationships slot — they're mutually exclusive for sole prop).
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import { untrack } from 'svelte';
	import InputField from './InputField.svelte';
	import NewSelect from './NewSelect.svelte';
	import {
		ageGapBoundsFor,
		isRunnerAgeValid,
		relationLocksGender,
		runnerIsOther,
		MIN_CO_APPLICANT_AGE
	} from '$lib/utils/businessRunnerCoApplicant';
	import { Users, User } from '$lib/utils/iconRegistry';

	interface Props {
		isNextEnabled?: boolean;
	}

	let { isNextEnabled = $bindable(false) }: Props = $props();

	// ── Read proprietor + runner from formState ─────────────────────
	const proprietor = $derived(
		(formState.applicants as Array<Record<string, unknown>>).find(
			(a) => a.applicantSubType === 'sole_proprietor'
		)
	);

	const runner = $derived(
		(formState.applicants as Array<Record<string, unknown>>).find(
			(a) => a.applicantSubType === 'business_runner'
		)
	);

	const whoRuns = $derived((runner?.businessRunnerRelation as string) ?? '');

	const proprietorAge = $derived(
		typeof proprietor?.age === 'number'
			? proprietor.age
			: typeof proprietor?.age === 'string' && proprietor.age.trim() !== ''
				? Number(proprietor.age)
				: undefined
	);

	const proprietorName = $derived(
		(proprietor?.fullName as string)?.trim() || 'the proprietor'
	);

	// ── Page-level label for the runner role ────────────────────────
	const runnerRoleLabel = $derived(
		whoRuns === 'husband'
			? 'Husband'
			: whoRuns === 'father'
				? 'Father'
				: whoRuns === 'son'
					? 'Son'
					: whoRuns === 'other'
						? 'Co-Applicant'
						: 'Business Runner'
	);

	// ── Local form state (hydrates from runner; writes back on change) ──
	let formName = $state('');
	let formAge = $state('');
	let formGender = $state('');
	let formOtherRelation = $state('');

	// Track which runner+relation we hydrated from so a different runner
	// (re-stash) OR a relation flip (DSA changed "Who runs the business?"
	// from Husband to Father after first visit) re-hydrates the buffer cleanly.
	let hydratedFor = $state<string | null>(null);

	$effect(() => {
		if (!runner || !runner.id) return;
		const key = `${runner.id}|${runner.businessRunnerRelation ?? ''}`;
		if (key === hydratedFor) return;
		untrack(() => {
			formName = (runner.fullName as string) ?? '';
			formAge = runner.age !== undefined && runner.age !== null ? String(runner.age) : '';
			formGender = (runner.gender as string) ?? '';
			formOtherRelation = (runner.otherRunnerRelationLabel as string) ?? '';
			hydratedFor = key;
		});
	});

	// ── Age bounds (drives placeholder + validator) ────────────────
	const ageBounds = $derived(ageGapBoundsFor(whoRuns, proprietorAge));

	// ── Validation derivations ─────────────────────────────────────
	const nameValid = $derived(formName.trim().length >= 2);
	const ageNumeric = $derived(Number(formAge));
	const ageValid = $derived(isRunnerAgeValid(whoRuns, proprietorAge, ageNumeric));
	const needsGender = $derived(runnerIsOther(whoRuns) && !relationLocksGender(whoRuns));
	const genderValid = $derived(!needsGender || formGender === 'male' || formGender === 'female');
	const needsRelationLabel = $derived(whoRuns === 'other');
	const relationLabelValid = $derived(!needsRelationLabel || formOtherRelation.trim().length >= 2);

	const formValid = $derived(nameValid && ageValid && genderValid && relationLabelValid);

	// ── Error messages (only render after touch / on submit attempt) ──
	let touched = $state({ name: false, age: false, gender: false, otherRelation: false });

	const nameError = $derived(
		touched.name && !nameValid ? 'Please enter the full name (minimum 2 characters).' : ''
	);
	const ageError = $derived.by(() => {
		if (!touched.age) return '';
		if (!formAge) return 'Please enter the age.';
		if (!Number.isFinite(ageNumeric) || ageNumeric <= 0) return 'Please enter a valid age.';
		if (ageBounds && !ageValid) return ageBounds.label;
		if (ageNumeric < MIN_CO_APPLICANT_AGE)
			return `Must be at least ${MIN_CO_APPLICANT_AGE} (co-applicant minimum).`;
		return '';
	});
	const genderError = $derived(
		touched.gender && needsGender && !genderValid ? 'Please select a gender.' : ''
	);
	const otherRelationError = $derived(
		touched.otherRelation && needsRelationLabel && !relationLabelValid
			? 'Please describe the relation (e.g. Brother, Mother, Friend).'
			: ''
	);

	// ── Gender-filtered relation options for 'Other' ───────────────
	const otherRelationOptions = $derived.by(() => {
		// Generic, gender-aware label set. Husband / Father / Son are excluded
		// here because they're separate top-level "Who runs the business?"
		// answers — picking Other means the relation is NOT one of those.
		const male = [
			{ label: 'Brother', value: 'Brother' },
			{ label: 'Uncle', value: 'Uncle' },
			{ label: 'Nephew', value: 'Nephew' },
			{ label: 'Cousin', value: 'Cousin (Male)' },
			{ label: 'Trusted Friend / Business Partner', value: 'Friend' },
			{ label: 'Other male relative', value: 'Other male relative' }
		];
		const female = [
			{ label: 'Mother', value: 'Mother' },
			{ label: 'Sister', value: 'Sister' },
			{ label: 'Daughter', value: 'Daughter' },
			{ label: 'Aunt', value: 'Aunt' },
			{ label: 'Niece', value: 'Niece' },
			{ label: 'Cousin', value: 'Cousin (Female)' },
			{ label: 'Trusted Friend / Business Partner', value: 'Friend' },
			{ label: 'Other female relative', value: 'Other female relative' }
		];
		if (formGender === 'male') return male;
		if (formGender === 'female') return female;
		return [...male, ...female];
	});

	const genderOptions = [
		{ label: 'Male', value: 'male' },
		{ label: 'Female', value: 'female' }
	];

	// ── Persist runner edits back to formState ─────────────────────
	function persistRunnerField(patch: Record<string, unknown>) {
		if (!runner?.id) return;
		const id = runner.id as string;
		const next = (formState.applicants as Array<Record<string, unknown>>).map((a) =>
			a.id === id ? { ...a, ...patch } : a
		);
		formState.replaceApplicants(next);
	}

	function onNameInput() {
		persistRunnerField({ fullName: formName });
	}

	function onAgeInput() {
		const n = Number(formAge);
		persistRunnerField({ age: Number.isFinite(n) && n > 0 ? n : undefined });
	}

	function onGenderChange(val: string | number) {
		formGender = String(val);
		// Reset the relation label when gender flips (options change set)
		formOtherRelation = '';
		persistRunnerField({ gender: formGender, otherRunnerRelationLabel: '' });
	}

	function onOtherRelationChange(val: string | number) {
		formOtherRelation = String(val);
		persistRunnerField({ otherRunnerRelationLabel: formOtherRelation });
	}

	// ── Expose Next-enable ────────────────────────────────────────
	$effect(() => {
		isNextEnabled = formValid;
	});
</script>

<div class="runner-page">
	<div class="page-header">
		<div class="header-icon">
			<Users size="20" />
		</div>
		<div class="header-text">
			<h1 class="page-title">{runnerRoleLabel} Details</h1>
			<p class="page-subtitle">
				{#if whoRuns === 'other'}
					You said someone else runs the business. Please share their details so we can add
					them as a co-applicant.
				{:else}
					You said your <strong>{runnerRoleLabel.toLowerCase()}</strong> runs the business. Please
					share their details so we can add them as a co-applicant.
				{/if}
			</p>
		</div>
	</div>

	{#if !runner}
		<div class="empty-state">
			<p>No runner co-applicant found. Please go back and pick "Who runs the business?".</p>
		</div>
	{:else}
		<div class="form-card">
			<div class="form-grid">
				<!-- Full Name -->
				<div class="field-wide">
					<InputField
						id="runner-name"
						label="Full Name"
						placeholder="Enter their full name"
						bind:value={formName}
						required={true}
						icon={User}
						error={nameError}
						validateOnInput={true}
						onInput={() => {
							touched.name = true;
							onNameInput();
						}}
						onBlur={() => {
							touched.name = true;
						}}
					/>
				</div>

				<!-- Age -->
				<div class="field-half">
					<InputField
						id="runner-age"
						label="Age (years)"
						placeholder={ageBounds?.label ?? `At least ${MIN_CO_APPLICANT_AGE}`}
						bind:value={formAge}
						type="number"
						required={true}
						inputRestriction="numeric"
						maxlength={3}
						error={ageError}
						validateOnInput={true}
						onInput={() => {
							touched.age = true;
							onAgeInput();
						}}
						onBlur={() => {
							touched.age = true;
						}}
					/>
					{#if ageBounds && !ageError}
						<p class="hint">{ageBounds.label}</p>
					{/if}
				</div>

				<!-- Gender — only for Other -->
				{#if needsGender}
					<div class="field-half">
						<NewSelect
							id="runner-gender"
							label="Gender"
							placeholder="Select gender"
							value={formGender}
							options={genderOptions}
							required={true}
							error={genderError}
							onChange={(v) => {
								touched.gender = true;
								onGenderChange(v);
							}}
						/>
					</div>
				{/if}

				<!-- Relation label — only for Other (after gender picked) -->
				{#if needsRelationLabel && formGender}
					<div class="field-wide">
						<NewSelect
							id="runner-relation"
							label="Their relation to {proprietorName}"
							placeholder="Select relation"
							value={formOtherRelation}
							options={otherRelationOptions}
							required={true}
							error={otherRelationError}
							onChange={(v) => {
								touched.otherRelation = true;
								onOtherRelationChange(v);
							}}
						/>
					</div>
				{/if}
			</div>

			<!-- Informational badges for the locked relation cases -->
			{#if relationLocksGender(whoRuns)}
				<div class="locked-note">
					<span class="badge">Gender: Male</span>
					<span class="badge">Relation: {runnerRoleLabel} of {proprietorName}</span>
					<span class="badge-text">— locked because you picked {runnerRoleLabel} above.</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.runner-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 0.5rem;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 12px;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.25);
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.page-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 1.125rem;
		color: var(--form-text);
		margin: 0;
		line-height: 1.3;
	}

	.page-subtitle {
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.8125rem;
		color: var(--form-text-muted);
		margin: 0;
	}

	.form-card {
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 1.25rem;
	}

	.field-wide {
		grid-column: 1 / -1;
	}

	.field-half {
		grid-column: span 1;
	}

	.hint {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--form-text-muted);
	}

	.locked-note {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		background: var(--form-bg-alt, rgba(0, 0, 0, 0.03));
		border: 1px dashed var(--form-border);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		background: var(--ddsa-primary-50, rgba(203, 153, 126, 0.1));
		color: var(--ddsa-primary-700, #8b5e3c);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.badge-text {
		font-size: 0.75rem;
		color: var(--form-text-muted);
	}

	.empty-state {
		padding: 2rem 1.5rem;
		text-align: center;
		background: var(--form-bg-card);
		border: 1px dashed var(--form-border);
		border-radius: 12px;
		color: var(--form-text-muted);
		font-size: 0.875rem;
	}

	@media (max-width: 540px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.field-half {
			grid-column: 1 / -1;
		}
	}
</style>
