<script lang="ts">
	import type {
		Applicant,
		RelationType,
		Relationship,
		ForbiddenRelation,
		PersonBOption,
		RelationOption
	} from './types';
	import {
		validateRelationship,
		getGroupedRelationsForPersonA,
		getPersonBOptionsWithLikelihood
	} from './relationshipValidator';
	import {
		BadgePlus,
		Plus,
		AlertCircle,
		CircleCheck,
		TriangleAlert
	} from '$lib/utils/iconRegistry';

	interface Props {
		applicants?: Applicant[];
		existingRelationships?: Relationship[];
		forbiddenRelationships?: ForbiddenRelation[];
		isComplete?: boolean;
		onAdd: (personA: Applicant, relation: RelationType, personB: Applicant) => void;
	}

	let {
		applicants = [],
		existingRelationships = [],
		forbiddenRelationships = [],
		isComplete = false,
		onAdd
	}: Props = $props();

	/** Build a disambiguating label for same-name applicants.
	 *  Priority: age → gender → maritalStatus → director/company info.
	 *  Only adds the next differentiator if the previous ones still match. */
	function getApplicantLabel(applicant: Applicant): string {
		const name = applicant.fullName || 'Unknown';
		const normName = name.toLowerCase();

		// Find all same-name applicants
		const sameNamePeople = applicants.filter((a) => (a.fullName ?? '').toLowerCase() === normName);
		if (sameNamePeople.length <= 1) return name;

		// Build progressive differentiator — stop as soon as unique
		const parts: string[] = [];
		let remaining = sameNamePeople;

		// 1. Age
		const ageVal = applicant.age ?? applicant.age;
		if (ageVal) {
			parts.push(`Age ${ageVal}`);
			remaining = remaining.filter((a) => (a.age ?? a.age) === ageVal);
			if (remaining.length <= 1) return `${name} (${parts.join(', ')})`;
		}

		// 2. Gender
		if (applicant.gender) {
			parts.push(String(applicant.gender));
			remaining = remaining.filter((a) => a.gender === applicant.gender);
			if (remaining.length <= 1) return `${name} (${parts.join(', ')})`;
		}

		// 3. Marital Status
		if (applicant.maritalStatus) {
			parts.push(String(applicant.maritalStatus));
			remaining = remaining.filter((a) => a.maritalStatus === applicant.maritalStatus);
			if (remaining.length <= 1) return `${name} (${parts.join(', ')})`;
		}

		// 4. Director/Company info
		if (applicant._isLinkedDirector) {
			parts.push(
				`${applicant._directorRole ?? 'Director'}, ${applicant._companyName ?? 'Company'}`
			);
			remaining = remaining.filter((a) => a._companyName === applicant._companyName);
			if (remaining.length <= 1) return `${name} (${parts.join(', ')})`;
		}

		// 5. Still not unique — append numeric suffix (_1, _2, ...)
		const idx = sameNamePeople.indexOf(applicant);
		const suffix = `_${idx + 1}`;
		return parts.length > 0 ? `${name} (${parts.join(', ')}) ${suffix}` : `${name} ${suffix}`;
	}

	/* =====================================================
	   FORM STATE (ONLY USER-DRIVEN MUTATIONS)
	===================================================== */

	let selectedPersonA: Applicant | null = $state(null);
	let selectedRelation: RelationType | null = $state(null);
	let selectedPersonB: Applicant | null = $state(null);

	/* =====================================================
	   DERIVED DATA (PURE REACTIVITY)
	===================================================== */

	// Get grouped relations for Person A (smart filtering based on age, gender, marital status)
	let availableRelationsGrouped = $derived(
		selectedPersonA
			? getGroupedRelationsForPersonA(selectedPersonA, applicants, existingRelationships)
			: new Map()
	);

	let personBOptions = $derived(
		selectedPersonA && selectedRelation
			? getPersonBOptionsWithLikelihood(
					selectedPersonA,
					selectedRelation,
					applicants as any,
					existingRelationships ?? []
				)
			: []
	);

	let validationErrors = $derived(
		selectedPersonA && selectedRelation && selectedPersonB
			? validateRelationship(
					selectedPersonA,
					selectedRelation,
					selectedPersonB,
					existingRelationships,
					forbiddenRelationships,
					applicants as any
				)
			: []
	);

	// Only hard errors block submission; warnings are shown but allow Add
	let hardErrors = $derived(validationErrors.filter((e) => e.severity !== 'warning'));
	let warnings = $derived(validationErrors.filter((e) => e.severity === 'warning'));
	let displayMessage = $derived(hardErrors[0]?.message ?? warnings[0]?.message ?? null);
	let displayIsWarning = $derived(hardErrors.length === 0 && warnings.length > 0);

	let isValid = $derived(
		!!selectedPersonA && !!selectedRelation && !!selectedPersonB && hardErrors.length === 0
	);

	/* =====================================================
	   EXPLICIT USER INTENT HANDLERS
	===================================================== */

	function onPersonASelect(person: Applicant | null) {
		selectedPersonA = person;
		selectedRelation = null;
		selectedPersonB = null;
	}

	function onRelationSelect(relation: RelationType | null) {
		if (!relation) {
			selectedRelation = null;
			selectedPersonB = null;
			return;
		}
		selectedRelation = relation;
		// Clear Person B only if they're no longer in the valid options for this relation
		if (selectedPersonB && selectedPersonA) {
			const stillValid = personBOptions.some((o) => o.applicant.id === selectedPersonB!.id);
			if (!stillValid) selectedPersonB = null;
		}
	}

	function onPersonBSelect(option: PersonBOption | null) {
		selectedPersonB = option?.applicant ?? null;
	}

	function handleAdd() {
		if (!isValid || !selectedPersonA || !selectedRelation || !selectedPersonB) return;

		onAdd(selectedPersonA, selectedRelation, selectedPersonB);

		resetForm();
	}

	function resetForm() {
		selectedPersonA = null;
		selectedRelation = null;
		selectedPersonB = null;
	}
</script>

{#if isComplete}
	<!-- All relationships defined — block form -->
	<div class="relationship-form-section">
		<div class="success-message">
			<div>
				<CircleCheck class="h-5 w-5 text-primary" />
			</div>
			<p class="alertText font-titleMedium">
				All applicant relationships have been defined. Remove a relationship above to make changes.
			</p>
		</div>
	</div>
{:else}
	<div class="relationship-form-section">
		<div class="form-header">
			<div class="header-icon">
				<BadgePlus />
			</div>
			<h2 class="text-labelQuestion !m-0 text-[var(--form-text-secondary)]">Add Relationship</h2>
		</div>

		<div class="form-container">
			<div class="form-field">
				<label class="smallText !m-0 text-[var(--form-text-muted)] uppercase" for="rel-person-a"
					>Person</label
				>
				<select
					id="rel-person-a"
					bind:value={selectedPersonA}
					onchange={() => onPersonASelect(selectedPersonA)}
					class="dropdown"
					aria-label="Select first person"
				>
					<option value={null}>Select person...</option>
					{#each applicants as applicant (applicant.id)}
						<option value={applicant}>{getApplicantLabel(applicant)}</option>
					{/each}
				</select>
			</div>

			<span class="connector-text">is</span>

			<div class="form-field relation-field">
				<label class="smallText !m-0 text-[var(--form-text-muted)] uppercase" for="rel-type"
					>Relationship</label
				>
				<select
					id="rel-type"
					bind:value={selectedRelation}
					onchange={() => onRelationSelect(selectedRelation)}
					class="dropdown relation-dropdown"
					disabled={!selectedPersonA}
					aria-label="Select relationship type"
				>
					<option value={null}>Select relationship...</option>
					{#if selectedPersonA}
						{#each [...availableRelationsGrouped] as [category, options]}
							<optgroup label={category}>
								{#each options as opt}
									<option value={opt.relation}>
										{opt.relation}
									</option>
								{/each}
							</optgroup>
						{/each}
					{/if}
				</select>
			</div>

			<span class="connector-text">of</span>

			<div class="form-field">
				<label class="smallText !m-0 text-[var(--form-text-muted)] uppercase" for="rel-person-b"
					>Of Person</label
				>
				<select
					id="rel-person-b"
					value={personBOptions.find((o) => o.applicant.id === selectedPersonB?.id) ?? null}
					onchange={(e) => {
						const idx = (e.target as HTMLSelectElement).selectedIndex - 1;
						onPersonBSelect(idx >= 0 ? personBOptions[idx] : null);
					}}
					class="dropdown"
					disabled={!selectedPersonA || !selectedRelation}
					aria-label="Select second person"
				>
					<option value={null}>Select person...</option>
					{#each personBOptions as option (option.applicant.id)}
						<option value={option}>{getApplicantLabel(option.applicant)}</option>
					{/each}
				</select>
			</div>

			<button
				type="button"
				onclick={handleAdd}
				disabled={!isValid}
				aria-label="Add relationship"
				class="add-button"
			>
				<Plus />
				Add
			</button>
		</div>

		{#if displayMessage}
			<div class="warning-message">
				<TriangleAlert class="h-5 w-5 text-primary" />
				<p class="alertText font-titleMedium">{displayMessage}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.relationship-form-section {
		margin-bottom: 0;
	}

	.form-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.875rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 8px;
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(203, 153, 126, 0.25);
	}

	.header-icon :global(svg) {
		width: 16px;
		height: 16px;
	}

	.form-container {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
		padding: 1.25rem;
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(43, 45, 66, 0.04);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
		min-width: 150px;
	}

	.relation-field {
		flex: 1.3;
		min-width: 180px;
	}

	.dropdown {
		width: 100%;
		height: 44px;
		padding: 0 1rem;
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.875rem;
		color: var(--form-text);
		background: var(--form-bg-alt);
		border: 1px solid var(--form-border);
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.875rem center;
		padding-right: 2.5rem;
	}

	.dropdown:hover:not(:disabled) {
		border-color: var(--ddsa-primary-500);
		background-color: var(--form-bg-card);
	}

	.dropdown:focus {
		outline: none;
		border-color: var(--ddsa-primary-500);
		background-color: var(--form-bg-card);
		box-shadow: 0 0 0 3px rgba(203, 153, 126, 0.15);
	}

	.dropdown:disabled {
		background: var(--form-bg-alt);
		color: var(--form-text-muted);
		border-color: var(--form-border);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.dropdown optgroup {
		font-family: var(--font-title);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--form-text-muted);
		background: var(--form-bg-alt);
		padding: 0.5rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.dropdown option {
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.875rem;
		color: var(--form-text);
		padding: 0.5rem 1rem;
		background: var(--form-bg-card);
	}

	.connector-text {
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.8125rem;
		color: var(--form-text-muted);
		font-weight: 500;
		padding-bottom: 0.875rem;
		flex-shrink: 0;
	}

	.add-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 44px;
		padding: 0 1.5rem;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.875rem;
		color: #ffffff;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	}

	.add-button :global(svg) {
		width: 16px;
		height: 16px;
	}

	.add-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(203, 153, 126, 0.35);
	}

	.add-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.add-button:disabled {
		background: var(--form-border);
		color: var(--form-text-muted);
		cursor: not-allowed;
		box-shadow: none;
	}

	@media (max-width: 768px) {
		.form-container {
			gap: 0.75rem;
			padding: 1rem;
		}

		.form-field {
			min-width: 120px;
		}

		.connector-text {
			display: none;
		}
	}

	@media (max-width: 540px) {
		.form-header {
			margin-bottom: 0.75rem;
		}

		.header-icon {
			width: 28px;
			height: 28px;
		}

		.header-icon :global(svg) {
			width: 14px;
			height: 14px;
		}

		.form-container {
			flex-direction: column;
			align-items: stretch;
			gap: 0.875rem;
			padding: 1rem;
			border-radius: 10px;
		}

		.form-field,
		.relation-field {
			flex: none;
			width: 100%;
			min-width: 100%;
		}

		.dropdown {
			height: 48px;
			font-size: 0.9375rem;
			border-radius: 10px;
		}

		.add-button {
			height: 48px;
			width: 100%;
			font-size: 0.9375rem;
			border-radius: 10px;
		}

		.warning-message {
			font-size: 0.75rem;
			padding: 0.625rem 0.875rem;
		}
	}
</style>
