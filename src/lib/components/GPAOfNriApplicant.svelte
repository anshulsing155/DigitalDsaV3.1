<script lang="ts">
	/**
	 * GPA of NRI Applicant — Multi-Entry with Per-Applicant Assignment
	 * ═══════════════════════════════════════════════════════════════════
	 * When ALL individual applicants are NRI, a General Power of Attorney
	 * (GPA) is required. This component allows adding multiple GPA entries
	 * and assigning each to one or more NRI applicants.
	 *
	 * Modes:
	 *   - Standalone (standalone=true): Rendered as own wizard step with header
	 *   - Embedded (standalone=false): Legacy embedded mode
	 *   - Single NRI applicant: Flattened inline form (no table/multi-select)
	 *   - Multiple NRI applicants: Full table + form + assignment
	 *
	 * Data: formState.applicationData.gpaProfiles: GpaEntry[]
	 * Validation: gpaValidate = true only when every NRI applicant is covered
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import { untrack } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import InputField from './InputField.svelte';
	import NewSelect from './NewSelect.svelte';
	import {
		Plus,
		Pencil,
		Trash2,
		CircleAlert,
		CircleCheckBig,
		User,
		Users,
		ChevronDown,
		Check
	} from '$lib/utils/iconRegistry';

	// ── Props ────────────────────────────────────────────────────
	interface Props {
		standalone?: boolean;
		isNextEnabled?: boolean;
	}

	let { standalone = false, isNextEnabled = $bindable(false) }: Props = $props();

	// ── Types ────────────────────────────────────────────────────
	interface GpaEntry {
		id: string;
		name: string;
		age: string;
		gender: string;
		relationshipType: string;
		cibilScore: string;
		applicantIds: string[];
	}

	// ── State: GPA entries list ──────────────────────────────────
	let gpaEntries = $state<GpaEntry[]>([]);

	// ── State: Form visibility + fields ─────────────────────────
	let showForm = $state(false);
	let formName = $state('');
	let formAge = $state('');
	let formGender = $state('');
	let formRelationshipType = $state('');
	let formCibilScore = $state('');
	let formApplicantIds = $state<string[]>([]);
	let errors: Record<string, string> = $state({});
	let editingId = $state<string | null>(null);
	let showApplicantDropdown = $state(false);

	// ── Single-mode initialization tracking ─────────────────────
	let singleModeInitForId: string | null = null;

	// ── Derived: NRI Individual Applicants ────────────────────────
	let nriApplicants = $derived(
		(formState.applicants as any[]).filter(
			(a) => a.applicantType === 'Individual' && a.isNRI === 'Yes'
		)
	);

	// ── Derived: Is single-applicant mode? ───────────────────────
	let isSingleMode = $derived(nriApplicants.length === 1);

	// ── Derived: Uncovered applicant IDs ─────────────────────────
	let coveredIds = $derived.by(() => {
		const ids = new Set<string>();
		for (const entry of gpaEntries) {
			for (const id of entry.applicantIds) ids.add(id);
		}
		return ids;
	});

	let uncoveredApplicants = $derived(nriApplicants.filter((a: any) => !coveredIds.has(a.id)));

	let allCovered = $derived(nriApplicants.length > 0 && uncoveredApplicants.length === 0);

	// ── Derived: IDs covered by OTHER entries (excludes entry being edited) ──
	let otherCoveredIds = $derived.by(() => {
		const ids = new Set<string>();
		for (const entry of gpaEntries) {
			if (entry.id === editingId) continue;
			for (const id of entry.applicantIds) ids.add(id);
		}
		return ids;
	});

	// ── Derived: Applicants available for dropdown selection ─────
	// When adding new: only uncovered applicants
	// When editing: uncovered + those assigned to the current entry
	let selectableApplicants = $derived(nriApplicants.filter((a: any) => !otherCoveredIds.has(a.id)));

	// ── Bind isNextEnabled for parent nav gating ────────────────
	$effect(() => {
		// Single mode: form validity directly gates Next (auto-save handles persistence)
		// Multi mode: all NRI applicants must be covered by GPA entries
		isNextEnabled = isSingleMode ? !!isFormValid : allCovered;
	});

	// ── Migration: old single gpaProfile → new gpaProfiles ──────
	$effect(() => {
		const data = untrack(() => formState.applicationData);
		if (!data) return;

		// If new gpaProfiles exists, load it
		if ((data as any).gpaProfiles && Array.isArray((data as any).gpaProfiles)) {
			const stored = (data as any).gpaProfiles as GpaEntry[];
			if (stored.length > 0 && gpaEntries.length === 0) {
				gpaEntries = stored;
			}
			return;
		}

		// Migrate old single gpaProfile
		if ((data as any).gpaProfile && gpaEntries.length === 0) {
			const old = (data as any).gpaProfile as Record<string, string>;
			const allNriIds = nriApplicants.map((a: any) => a.id);
			if (old.name) {
				gpaEntries = [
					{
						id: uuidv4(),
						name: old.name || '',
						age: old.age || '',
						gender: old.gender || '',
						relationshipType: old.relationshipType || '',
						cibilScore: old.cibilScore || '',
						applicantIds: allNriIds
					}
				];
			}
		}
	});

	// ── Cleanup: prune stale GPA entries when NRI applicants change ──
	// If an applicant is deleted or their NRI status changes, remove their ID
	// from GPA entries. If a GPA entry has no valid applicants left, remove it entirely.
	$effect(() => {
		const currentNriIds = new Set(nriApplicants.map((a: any) => a.id));
		const currentEntries = gpaEntries;
		if (currentEntries.length === 0) return;

		let changed = false;
		const pruned: GpaEntry[] = [];

		for (const entry of currentEntries) {
			const validIds = entry.applicantIds.filter((id) => currentNriIds.has(id));
			if (validIds.length === 0) {
				// No valid applicants left — remove entire entry
				changed = true;
				continue;
			}
			if (validIds.length !== entry.applicantIds.length) {
				// Some IDs removed — update entry
				changed = true;
				pruned.push({ ...entry, applicantIds: validIds });
			} else {
				pruned.push(entry);
			}
		}

		if (changed) {
			gpaEntries = pruned;
		}
	});

	// ── Single-mode auto-init: pre-fill form from existing entry ─
	// Re-runs when the single NRI applicant changes (e.g. multi→single transition)
	$effect(() => {
		if (nriApplicants.length === 1) {
			const singleId = (nriApplicants[0] as any).id;

			// Skip if already initialized for this exact applicant
			if (singleModeInitForId === singleId) return;
			singleModeInitForId = singleId;

			formApplicantIds = [singleId];

			// Find existing GPA entry for this applicant (may be among multiple entries)
			const existingEntry = gpaEntries.find((e) => e.applicantIds.includes(singleId));
			if (existingEntry) {
				const entry = $state.snapshot(existingEntry);
				formName = entry.name;
				formAge = entry.age;
				formGender = entry.gender;
				formRelationshipType = entry.relationshipType;
				formCibilScore = entry.cibilScore;
				editingId = entry.id;
			}

			showForm = true;
		} else {
			// Reset when switching away from single mode (e.g. single→multi)
			singleModeInitForId = null;
		}
	});

	// ── Single-mode auto-save: persist GPA entry as fields change ──
	// No explicit "Save" button needed — data auto-persists, Next gates on isFormValid
	$effect(() => {
		if (!isSingleMode || nriApplicants.length !== 1) return;

		// Read all form fields (reactive triggers)
		const name = formName;
		const age = formAge;
		const gender = formGender;
		const rel = formRelationshipType;
		const cibil = formCibilScore;
		const singleId = (nriApplicants[0] as any).id;

		// Read editingId without subscribing (avoid circular re-triggers)
		const currentEditId = untrack(() => editingId);

		const entry: GpaEntry = {
			id: currentEditId || uuidv4(),
			name: name.trim(),
			age: age.trim(),
			gender,
			relationshipType: rel,
			cibilScore: cibil.trim(),
			applicantIds: [singleId]
		};

		if (!currentEditId) {
			editingId = entry.id;
		}

		// Write to gpaEntries without subscribing to it (sync effect picks up the change)
		untrack(() => {
			if (currentEditId) {
				gpaEntries = gpaEntries.map((e) => (e.id === currentEditId ? entry : e));
			} else {
				gpaEntries = [entry];
			}
		});
	});

	// ── Sync to formState ────────────────────────────────────────
	$effect(() => {
		// Read reactive values — snapshot to get plain objects
		const entries = $state.snapshot(gpaEntries);
		const covered = allCovered;
		const nriCount = nriApplicants.length;

		const currentData = untrack(() => formState.applicationData);
		if (!currentData) return;

		const updated = { ...currentData } as any;
		updated.gpaProfiles = entries;
		// Single mode: valid when form is complete; Multi mode: valid when all NRI covered
		updated.gpaValidate = nriCount > 0 && (isSingleMode ? !!isFormValid : covered);

		// Clean up old single-entry field
		delete updated.gpaProfile;

		untrack(() => {
			formState.replaceApplicationData(updated);
		});
	});

	// ── Validation ───────────────────────────────────────────────

	function validateName(value: string): string {
		if (!value || value.trim().length === 0) return 'Full Name is required';
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

	function validateCibilScore(value: string): string {
		if (!value || value.trim().length === 0) return 'CIBIL Score is required';
		const score = Number(value);
		if (!Number.isFinite(score) || isNaN(score)) return 'CIBIL Score must be a valid number';
		if (score < 300) return 'CIBIL Score must be at least 300';
		if (score > 900) return 'CIBIL Score must be at most 900';
		return '';
	}

	function validateSelectField(value: string, fieldName: string): string {
		if (!value || value.trim().length === 0) return `${fieldName} is required`;
		return '';
	}

	function validateField(key: string) {
		const validators: Record<string, () => string> = {
			name: () => validateName(formName),
			age: () => validateAge(formAge),
			gender: () => validateSelectField(formGender, 'Gender'),
			relationshipType: () => validateSelectField(formRelationshipType, 'Relationship Type'),
			cibilScore: () => validateCibilScore(formCibilScore)
		};
		const fn = validators[key];
		if (fn) errors = { ...errors, [key]: fn() };
	}

	let isFormValid = $derived(
		formName.trim().length >= 2 &&
			!validateName(formName) &&
			formAge &&
			!validateAge(formAge) &&
			formGender &&
			!validateSelectField(formGender, 'Gender') &&
			formRelationshipType &&
			!validateSelectField(formRelationshipType, 'Relationship Type') &&
			formCibilScore &&
			!validateCibilScore(formCibilScore) &&
			formApplicantIds.length > 0
	);

	// ── Form Actions ─────────────────────────────────────────────

	function resetForm() {
		formName = '';
		formAge = '';
		formGender = '';
		formRelationshipType = '';
		formCibilScore = '';
		formApplicantIds = [];
		errors = {};
		editingId = null;
		showApplicantDropdown = false;
	}

	/** Open form for a fresh new entry, pre-selecting uncovered applicants */
	function openAddForm() {
		resetForm();
		// Pre-select uncovered applicants
		formApplicantIds = uncoveredApplicants.map((a: any) => a.id);
		showForm = true;
	}

	/** Open form to add GPA for the remaining uncovered applicants */
	function openAddForRemaining() {
		resetForm();
		formApplicantIds = uncoveredApplicants.map((a: any) => a.id);
		showForm = true;
	}

	function closeForm() {
		resetForm();
		showForm = false;
	}

	function handleAddOrUpdate() {
		if (!isFormValid) return;

		const entry: GpaEntry = {
			id: editingId || uuidv4(),
			name: formName.trim(),
			age: formAge.trim(),
			gender: formGender,
			relationshipType: formRelationshipType,
			cibilScore: formCibilScore.trim(),
			applicantIds: [...formApplicantIds]
		};

		if (editingId) {
			gpaEntries = gpaEntries.map((e) => (e.id === editingId ? entry : e));
		} else {
			gpaEntries = [...gpaEntries, entry];
		}

		// Close form after adding/updating in multi mode
		// (Single mode uses auto-save, this function is only called from multi mode)
		showForm = false;
		resetForm();
	}

	function handleEdit(entry: GpaEntry) {
		// Snapshot to extract plain values from Svelte 5 proxy
		const plain = $state.snapshot(entry);
		editingId = plain.id;
		formName = plain.name;
		formAge = plain.age;
		formGender = plain.gender;
		formRelationshipType = plain.relationshipType;
		formCibilScore = plain.cibilScore;
		formApplicantIds = [...plain.applicantIds];
		errors = {};
		showForm = true;
	}

	function handleDelete(entryId: string) {
		gpaEntries = gpaEntries.filter((e) => e.id !== entryId);
		if (editingId === entryId) {
			resetForm();
			showForm = false;
		}
	}

	function toggleApplicant(id: string) {
		if (formApplicantIds.includes(id)) {
			formApplicantIds = formApplicantIds.filter((a) => a !== id);
		} else {
			formApplicantIds = [...formApplicantIds, id];
		}
	}

	function getApplicantName(id: string): string {
		// Search all applicants — stale entries are auto-cleaned, but fallback gracefully
		const a = (formState.applicants as any[]).find((ap) => ap.id === id);
		return a?.fullName || a?.companyName || 'Applicant';
	}

	// Relationship options
	const RELATIONSHIP_OPTIONS = [
		{
			label: 'Immediate Family',
			labelHtml:
				'Immediate Family <span class="italic text-gray-500">(Spouse, Parent, Sibling)</span>',
			value: 'Immediate Family'
		},
		{
			label: 'Extended Family',
			labelHtml:
				'Extended Family <span class="italic text-gray-500">(Cousin, Uncle, Grandparent)</span>',
			value: 'Extended Family'
		},
		{
			label: 'Through Marriage',
			labelHtml: 'Through Marriage <span class="italic text-gray-500">(In-laws)</span>',
			value: 'Through Marriage'
		},
		{
			label: 'Not Related',
			labelHtml: 'Not Related <span class="italic text-gray-500">(Friend, Colleague)</span>',
			value: 'Not Related'
		}
	];

	const GENDER_OPTIONS = [
		{ label: 'Male', value: 'male' },
		{ label: 'Female', value: 'female' }
	];
</script>

<!-- Click-outside handler for applicant dropdown -->
<svelte:window
	onclick={() => {
		if (showApplicantDropdown) showApplicantDropdown = false;
	}}
/>

<div class="mx-auto w-full {standalone ? 'py-4' : 'mt-4 mb-8'}">
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- STANDALONE HEADER — Page title when rendered as own step       -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if standalone}
		<div class="mb-6">
			<h2 class="font-titleBold text-sectionHeadingText text-[var(--form-text-secondary)]">
				GPA — General Power of Attorney
			</h2>
			<p class="alertText mt-1 text-[var(--form-text-label)]">
				NRI applicants require a GPA holder who can represent them for the loan process in India.
				{#if isSingleMode}
					Please provide details of the person who will act as the GPA.
				{:else}
					Each NRI applicant must be assigned to at least one GPA holder.
				{/if}
			</p>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- SINGLE APPLICANT — Flattened inline form (no table needed)     -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if isSingleMode}
		<div
			class="rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 shadow-sm md:p-5"
		>
			<!-- GPA Person Details — flat form, no applicant selector -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<InputField
					id="gpa_name"
					label="Full Name of GPA Holder"
					type="text"
					inputRestriction="alphabet"
					maxlength={50}
					placeholder="Enter name"
					bind:value={formName}
					icon="user"
					required={true}
					error={errors.name}
					validateOnInput={true}
					onInput={() => {
						errors = { ...errors, name: '' };
					}}
					onBlur={() => validateField('name')}
				/>

				<InputField
					id="gpa_age"
					label="Age"
					type="text"
					inputRestriction="numeric"
					maxlength={2}
					placeholder="Enter age"
					bind:value={formAge}
					icon="calendar"
					required={true}
					error={errors.age}
					validateOnInput={true}
					onInput={() => {
						errors = { ...errors, age: '' };
					}}
					onBlur={() => validateField('age')}
				/>

				<NewSelect
					id="gpa_gender"
					label="Gender"
					labelClass="label-modern"
					bind:value={formGender}
					options={GENDER_OPTIONS}
					icon="venus-and-mars"
					required={true}
					error={errors.gender}
					onChange={() => validateField('gender')}
					onBlur={() => validateField('gender')}
				/>

				<NewSelect
					id="gpa_relationship"
					label="Relationship Type"
					labelClass="label-modern"
					bind:value={formRelationshipType}
					options={RELATIONSHIP_OPTIONS}
					icon="handshake"
					required={true}
					error={errors.relationshipType}
					onChange={() => validateField('relationshipType')}
					onBlur={() => validateField('relationshipType')}
				/>

				<InputField
					id="gpa_cibil"
					label="CIBIL Score"
					type="text"
					inputRestriction="numeric"
					maxlength={3}
					placeholder="300 – 900"
					bind:value={formCibilScore}
					icon="award"
					required={true}
					error={errors.cibilScore}
					validateOnInput={true}
					onInput={() => {
						errors = { ...errors, cibilScore: '' };
					}}
					onBlur={() => validateField('cibilScore')}
				/>
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- MULTI APPLICANT — Table + Form + Assignment                    -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
	{:else}
		<!-- HEADER CARD — Info + Add GPA button (shown only when no GPAs) -->
		{#if gpaEntries.length === 0 && !standalone}
			<div
				class="rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] px-6 py-8 text-center shadow-sm"
			>
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
				>
					<Users size={24} class="text-[var(--form-text-secondary)]" />
				</div>

				<h2 class="text-labelText text-[var(--form-text-secondary)]">
					General Power of Attorney will be required as all the applicants are NRI
				</h2>
				<p class="alertText mb-4 text-[var(--form-text-label)]">
					Use the form to add
					<span class="font-titleMedium tinyText rounded bg-gray-100 px-1.5 py-0.5">GPA for</span>
					{nriApplicants.length} applicant{nriApplicants.length > 1 ? 's' : ''}
				</p>

				{#if !showForm}
					<button
						type="button"
						onclick={openAddForm}
						class="font-titleMedium buttonText inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-5 py-2.5 text-[var(--form-text-secondary)] shadow-sm transition-all duration-200 hover:border-[var(--trial-accent)]/40 hover:shadow-md"
					>
						<Plus size={16} />
						Add GPA
					</button>
				{/if}
			</div>
		{/if}

		<!-- Standalone empty state — cleaner prompt for standalone mode -->
		{#if gpaEntries.length === 0 && standalone && !showForm}
			<div
				class="rounded-2xl border border-dashed border-[var(--form-border)] bg-[var(--form-bg-card)] px-6 py-8 text-center"
			>
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
				>
					<Users size={24} class="text-[var(--form-text-secondary)]" />
				</div>
				<p class="text-labelText mb-4 text-[var(--form-text-secondary)]">
					No GPA profiles added yet. Add a GPA for each NRI applicant.
				</p>
				<button
					type="button"
					onclick={openAddForm}
					class="font-titleMedium buttonText inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-5 py-2.5 text-[var(--form-text-secondary)] shadow-sm transition-all duration-200 hover:border-[var(--trial-accent)]/40 hover:shadow-md"
				>
					<Plus size={16} />
					Add GPA
				</button>
			</div>
		{/if}

		<!-- FORM — Add / Edit GPA Entry -->
		{#if showForm}
			<div
				class="mt-4 rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-5 shadow-sm"
			>
				<h3
					class="text-labelQuestion font-titleBold text-[var(--form-text-secondary)] underline underline-offset-4"
				>
					{editingId ? 'Edit GPA Entry' : 'Add New GPA Entry'}
				</h3>

				<div class="applicant-dropdown relative mb-4">
					<p class="text-labelText font-titleBold text-[var(--form-text-secondary)]">
						Which applicant(s) does this GPA represent?
					</p>

					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							showApplicantDropdown = !showApplicantDropdown;
						}}
						class="flex w-full items-center justify-between rounded-lg border bg-[var(--form-bg-input)] px-3 py-2.5 text-left transition-colors
							{formApplicantIds.length === 0 && !showApplicantDropdown
							? 'border-[var(--form-border)]'
							: showApplicantDropdown
								? 'border-[var(--trial-accent)] ring-1 ring-[var(--trial-accent)]/30'
								: 'border-[var(--trial-accent)]/50'}"
					>
						{#if formApplicantIds.length === 0}
							<span class="text-labelText !m-0 font-paragraph text-[var(--form-text-muted)]"
								>Select applicants…</span
							>
						{:else}
							<div class="flex flex-wrap gap-1.5">
								{#each formApplicantIds as id}
									<span
										class="tinyText inline-flex items-center gap-1 rounded-md bg-[var(--trial-accent)]/10 px-2 py-0.5 text-[var(--form-text)]"
									>
										<User size={11} class="shrink-0 text-[var(--form-text-muted)]" />
										{getApplicantName(id)}
									</span>
								{/each}
							</div>
						{/if}
						<ChevronDown
							size={16}
							class="shrink-0 text-[var(--form-text-muted)] transition-transform duration-200 {showApplicantDropdown
								? 'rotate-180'
								: ''}"
						/>
					</button>

					{#if showApplicantDropdown}
						<div
							class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-lg"
							role="listbox"
							tabindex="0"
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => e.key === 'Escape' && (showApplicantDropdown = false)}
						>
							{#each selectableApplicants as nriApp}
								{@const appId = (nriApp as any).id}
								{@const checked = formApplicantIds.includes(appId)}
								<button
									type="button"
									onclick={() => toggleApplicant(appId)}
									class="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--form-bg-alt)]"
								>
									<div class="flex items-center gap-2.5">
										<div
											class="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-colors
												{checked
												? 'border-[var(--trial-accent)] bg-[var(--trial-accent)]'
												: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}"
										>
											{#if checked}
												<Check size={11} class="text-white" />
											{/if}
										</div>
										<span class="smallText text-[var(--form-text)]">
											{(nriApp as any).fullName ?? 'Applicant'}
										</span>
									</div>
								</button>
							{/each}

							<!-- Done button -->
							<div class="border-t border-[var(--form-border)] px-3 py-2">
								<button
									type="button"
									onclick={() => (showApplicantDropdown = false)}
									class="font-titleMedium buttonText w-full cursor-pointer rounded-md bg-[var(--form-bg-card)] py-1.5 hover:bg-[var(--ddsa-primary-400)]"
								>
									Done
								</button>
							</div>
						</div>
					{/if}

					{#if formApplicantIds.length === 0}
						<p class="tinyText mt-1 font-paragraph text-red-500">Select at least one applicant</p>
					{/if}
				</div>

				<!-- GPA Person Details -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<InputField
						id="gpa_name"
						label="Full Name"
						type="text"
						inputRestriction="alphabet"
						maxlength={50}
						placeholder="Enter name"
						bind:value={formName}
						icon="user"
						required={true}
						error={errors.name}
						validateOnInput={true}
						onInput={() => {
							errors = { ...errors, name: '' };
						}}
						onBlur={() => validateField('name')}
					/>

					<InputField
						id="gpa_age"
						label="Age"
						type="text"
						inputRestriction="numeric"
						maxlength={2}
						placeholder="Enter age"
						bind:value={formAge}
						icon="calendar"
						required={true}
						error={errors.age}
						validateOnInput={true}
						onInput={() => {
							errors = { ...errors, age: '' };
						}}
						onBlur={() => validateField('age')}
					/>

					<NewSelect
						id="gpa_gender"
						label="Gender"
						labelClass="label-modern"
						bind:value={formGender}
						options={GENDER_OPTIONS}
						icon="venus-and-mars"
						required={true}
						error={errors.gender}
						onChange={() => validateField('gender')}
					/>

					<NewSelect
						id="gpa_relationship"
						label="Relationship Type"
						labelClass="label-modern"
						bind:value={formRelationshipType}
						options={RELATIONSHIP_OPTIONS}
						icon="handshake"
						required={true}
						error={errors.relationshipType}
						onChange={() => validateField('relationshipType')}
					/>

					<InputField
						id="gpa_cibil"
						label="CIBIL Score"
						type="text"
						inputRestriction="numeric"
						maxlength={3}
						placeholder="Enter CIBIL"
						bind:value={formCibilScore}
						icon="award"
						required={true}
						error={errors.cibilScore}
						validateOnInput={true}
						onInput={() => {
							errors = { ...errors, cibilScore: '' };
						}}
						onBlur={() => validateField('cibilScore')}
					/>
				</div>

				<!-- Form Action Buttons -->
				<div class="mt-5 flex items-center gap-3">
					<button
						type="button"
						onclick={handleAddOrUpdate}
						disabled={!isFormValid}
						class="font-titleMedium flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm transition-all duration-200
							{isFormValid
							? 'bg-[var(--trial-accent)] text-white hover:shadow-md'
							: 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}"
					>
						{#if editingId}
							<Pencil size={14} />
							Update GPA
						{:else}
							<Plus size={14} />
							Add GPA
						{/if}
					</button>

					<button
						type="button"
						onclick={closeForm}
						class="font-titleMedium rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-4 py-2.5 text-sm text-[var(--form-text)] transition-colors hover:bg-[var(--form-hover)]"
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}

		<!-- GPA PROFILES — Grid table matching Applicant table style -->
		{#if gpaEntries.length > 0}
			<div
				class="mt-4 overflow-hidden rounded-2xl border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-200)] shadow-md"
			>
				<!-- Accent bar -->
				<!-- <div class="h-1.5 w-full bg-gradient-to-r from-stone-500 to-neutral-500"></div> -->

				<!-- Desktop: Column headers (hidden on mobile) -->
				<div
					class="font-titleMedium smallText hidden grid-cols-12 border-b border-[var(--ddsa-primary-500)] bg-gradient-to-br from-[var(--form-bg-alt)] to-stone-50/30 px-5 py-3.5 text-[var(--form-text-muted)] uppercase md:grid dark:to-[var(--form-bg-alt)]"
				>
					<div class="col-span-3">GPA Holder</div>
					<div class="col-span-2 text-center">Age / Gender</div>
					<div class="col-span-2 text-center">CIBIL</div>
					<div class="col-span-3 text-center">Covers</div>
					<div class="col-span-2 text-center">Action</div>
				</div>

				<!-- Desktop: Grid rows (hidden on mobile) -->
				<div class="hidden md:block">
					{#each gpaEntries as entry (entry.id)}
						<div
							class="grid grid-cols-12 items-center border-b border-[var(--form-border)] bg-[var(--form-bg-card)] px-5 py-4 transition-all duration-200 last:border-b-0"
						>
							<!-- GPA Holder: avatar + name + relationship -->
							<div class="col-span-3 flex items-center gap-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--trial-accent)]/25 bg-gradient-to-br from-[var(--trial-accent)]/20 via-[var(--trial-accent)]/10 to-transparent"
								>
									<User size={18} class="text-[var(--form-text-secondary)]" />
								</div>
								<div class="min-w-0">
									<p
										class="font-titleMedium buttonText line-clamp-1 text-[var(--form-text-secondary)]"
									>
										{entry.name}
									</p>
									<p class="tinyText mt-0.5 font-paragraph text-[var(--form-text-secondary)]">
										{entry.relationshipType}
									</p>
								</div>
							</div>

							<!-- Age / Gender -->
							<div class="col-span-2 flex items-center justify-center text-center">
								<span
									class="tinyText inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-[var(--form-text-secondary)]"
								>
									{entry.age} yrs &middot; <span class="capitalize">{entry.gender}</span>
								</span>
							</div>

							<!-- CIBIL -->
							<div class="col-span-2 flex items-center justify-center text-center">
								<span class="buttonText text-[var(--form-text-secondary)]">{entry.cibilScore}</span>
							</div>

							<!-- Covers -->
							<div class="col-span-3 flex flex-wrap items-center justify-center gap-1">
								{#each entry.applicantIds as aId}
									<span
										class="tinyText inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[var(--form-text-secondary)]"
									>
										{getApplicantName(aId)}
									</span>
								{/each}
							</div>

							<!-- Action -->
							<div class="col-span-2 flex items-center justify-center gap-1">
								<button
									type="button"
									onclick={() => handleEdit(entry)}
									title="Edit"
									class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
									aria-label="Edit"
								>
									<Pencil size={15} />
								</button>
								<button
									type="button"
									onclick={() => handleDelete(entry.id)}
									title="Delete"
									class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
									aria-label="Delete"
								>
									<Trash2 size={15} />
								</button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Mobile: Compact cards (hidden on desktop) -->
				<div class="flex flex-col md:hidden">
					{#each gpaEntries as entry (entry.id)}
						<div
							class="border-b border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 last:border-b-0"
						>
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--trial-accent)]/25 bg-gradient-to-br from-[var(--trial-accent)]/20 via-[var(--trial-accent)]/10 to-transparent"
									>
										<User size={16} class="text-[var(--form-text-secondary)]" />
									</div>
									<div>
										<p class="font-titleMedium buttonText text-[var(--form-text-secondary)]">
											{entry.name}
										</p>
										<p class="tinyText font-paragraph text-[var(--form-text-secondary)]">
											&middot; {entry.relationshipType}
										</p>
										<p class="tinyText mt-0.5 font-paragraph text-[var(--form-text-secondary)]">
											&middot; {entry.age} yrs &middot;
											<span class="capitalize">{entry.gender}</span>
											&middot; CIBIL {entry.cibilScore}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-0.5">
									<button
										type="button"
										onclick={() => handleEdit(entry)}
										title="Edit"
										class="rounded-md p-1.5 text-[var(--form-text-secondary)] hover:text-blue-600"
										aria-label="Edit"
									>
										<Pencil size={14} />
									</button>
									<button
										type="button"
										onclick={() => handleDelete(entry.id)}
										title="Delete"
										class="rounded-md p-1.5 text-[var(--form-text-secondary)] hover:text-red-500"
										aria-label="Delete"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
							<div class="mt-2 flex flex-wrap gap-1 pl-12">
								{#each entry.applicantIds as aId}
									<span
										class="tinyText inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[var(--form-text-secondary)]"
									>
										{getApplicantName(aId)}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Uncovered applicants banner + Add for remaining -->
			{#if uncoveredApplicants.length > 0}
				<div class="warning-message mt-3 flex flex-col">
					<div class="flex items-start gap-2">
						<CircleAlert class="h-5 w-5 shrink-0" />
						<p class="font-titleMedium smallText">
							<strong>{uncoveredApplicants.length}</strong> remaining:
							{uncoveredApplicants.map((a: any) => a.fullName).join(', ')}
						</p>
					</div>
					{#if !showForm}
						<button
							type="button"
							onclick={openAddForRemaining}
							class="font-titleMedium smallText inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--ddsa-warning)] px-3 py-1.5"
						>
							<Plus class="h-5 w-5" />
							Add for remaining
						</button>
					{/if}
				</div>
			{:else}
				<div class="success-message mt-3">
					<CircleCheckBig size={16} class="shrink-0 text-green-500" />
					<p class="alertText text-[var(--ddsa-success)]">
						All NRI applicants have a GPA assigned.
					</p>
				</div>
			{/if}
		{/if}
	{/if}
</div>
