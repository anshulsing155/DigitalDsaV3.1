<script lang="ts">
	/**
	 * IncomeProfileSelector — Tab 1 of Income & Credit Assessment
	 * ═══════════════════════════════════════════════════════════════════
	 * Multi-select card/chip component where applicant declares all
	 * income sources. Cards are grouped by category.
	 *
	 * Rules:
	 * - Multiple profiles can be selected (salaried + director + rental etc.)
	 * - "No Current Income" is exclusive — auto-deselects others
	 * - Cards with showWhen conditions are hidden when condition is false
	 * - On mobile: 1 column grid; desktop: 2-3 column grid
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { getIcon, Check, AlertCircle, Info, Lock } from '$lib/utils/iconRegistry';
	import {
		INCOME_PROFILE_CARDS,
		validateProfileSelection,
		getProfileCardsForLoan
	} from '$lib/config/incomeProfiles';
	import { NO_INCOME_REASON_OPTIONS } from '$lib/config/incomeProfiles/profileCards';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { deviceState } from '$lib/stores/device.svelte';
	import { uiState } from '$lib/state/ui.svelte';
	import SelectField from './SelectField.svelte';
	import type { IncomeProfileType, IncomeProfileCard } from '$lib/types/incomeProfile';

	interface Props {
		/** Currently selected profile types (bindable for parent sync) */
		selectedProfiles: IncomeProfileType[];
		/** Answers map for showWhen evaluation (applicant context) */
		answersContext?: Record<string, unknown>;
		/** Callback when selection changes */
		onSelectionChange?: (profiles: IncomeProfileType[]) => void;
		/** Whether the selector is disabled */
		disabled?: boolean;
		/** Error message to display */
		error?: string | null;
		/** Loan name — used to order profiles by relevance (e.g. "Business Loan") */
		loanName?: string;
		/** Profiles that cannot be deselected (auto-set by loan/entity type) */
		lockedProfiles?: IncomeProfileType[];
		/** Current noIncomeReason value */
		noIncomeReason?: string;
		/** Callback when noIncomeReason changes */
		onNoIncomeReasonChange?: (reason: string) => void;
	}

	let {
		selectedProfiles = $bindable([]),
		answersContext = {},
		onSelectionChange,
		disabled = false,
		error = $bindable(null),
		loanName = '',
		lockedProfiles = [],
		noIncomeReason = '',
		onNoIncomeReasonChange
	}: Props = $props();

	function isLocked(type: IncomeProfileType): boolean {
		return lockedProfiles.includes(type);
	}

	// ── Derived: filter cards by showWhen visibility ──────────────
	// When a loanName is provided, cards are reordered so that the most
	// relevant profiles for that loan type appear first (UX convenience).
	let visibleCards = $derived.by(() => {
		const base = loanName
			? getProfileCardsForLoan(loanName)
			: INCOME_PROFILE_CARDS.map((c) => ({ ...c, recommended: false }));
		return base.filter((card) => shouldShow(card.showWhen as any, answersContext));
	});

	// ── Derived: should promote no_current_income to top? ────────
	// Promote when applicant is NOT on EMI (non-earning co-applicant scenario)
	let shouldPromoteNoIncome = $derived(answersContext?.onEMI !== true);

	// ── Promoted no-income card (extracted from other_income) ─────
	let promotedNoIncomeCard = $derived.by(() => {
		if (!shouldPromoteNoIncome) return null;
		return visibleCards.find((c) => c.type === 'no_current_income') ?? null;
	});

	// ── Group cards by category for section display ──────────────
	let employmentBusinessCards = $derived(
		visibleCards.filter((c) => c.category === 'employment_business')
	);

	let otherIncomeCards = $derived.by(() => {
		let others = visibleCards.filter((c) => c.category === 'other_income');
		// If promoted, remove from "Other Income" section to avoid duplicate
		if (promotedNoIncomeCard) others = others.filter((c) => c.type !== 'no_current_income');
		// Hide exclusive options when any earning profile is already selected (manual or auto-set)
		if (hasNonExclusiveSelected) others = others.filter((c) => !c.exclusive);
		return others;
	});

	// ── Hide exclusive "No Current Income" when any earning profile is selected ──
	// This covers both manually selected AND auto-set profiles (getAutoSelectedProfiles)
	let hasNonExclusiveSelected = $derived(
		selectedProfiles.some((p) => !INCOME_PROFILE_CARDS.find((c) => c.type === p)?.exclusive)
	);

	// ── Show noIncomeReason dropdown when sole selection is no_current_income ──
	let showNoIncomeReason = $derived(
		selectedProfiles.length === 1 && selectedProfiles[0] === 'no_current_income'
	);

	// ── Auto-add locked profiles to selection if missing ──────────
	$effect(() => {
		if (lockedProfiles.length === 0) return;
		const missing = lockedProfiles.filter((p) => !selectedProfiles.includes(p));
		if (missing.length > 0) {
			// Remove exclusive "no_current_income" if we're adding earning profiles
			const withoutExclusive = selectedProfiles.filter((p) => p !== 'no_current_income');
			selectedProfiles = [...withoutExclusive, ...missing];
			onSelectionChange?.(selectedProfiles);
		}
	});

	// ── Auto-DROP selected profiles whose card is hidden by showWhen ──
	// Pitfall #12 specialization (auto-clear parity) for the income profile
	// cards. When the DSA toggles isNRI=Yes (or any other answer that flips
	// a card's showWhen to false), the card disappears from the UI but the
	// underlying selection lingered in selectedProfiles — and through it,
	// in applicantData.selectedProfiles and incomeEntries. The Income Details
	// step then demanded an entry for the now-hidden profile ("Missing: Business
	// Proprietorship") with no way for the DSA to fulfil it. Emitting the
	// filtered set via onSelectionChange routes through the parent's
	// handleProfileSelectionChange which soft-deletes the corresponding
	// incomeEntries (parity with the secured-loan applyNriCleanup cascade).
	// Locked profiles are never dropped — the locked-auto-add $effect above
	// would re-add them on the next tick anyway, so excluding them here
	// prevents an effect-vs-effect ping-pong.

	// Track profiles auto-dropped in THIS component lifecycle so we can show a
	// reassuring toast when their card reappears (e.g. isNRI Yes→No). Lives
	// only in component state — historical drops from a previous mount are
	// intentionally NOT surfaced; the round-trip toast is a "you didn't lose
	// what you typed five seconds ago" reassurance, not an archive prompt.
	let autoDroppedProfiles = $state<Set<IncomeProfileType>>(new Set());

	$effect(() => {
		// Defensive: don't run when answers haven't loaded yet. shouldShow on
		// undefined isNRI hides business cards by default; dropping a legit
		// selection during a transient empty state would be silent data loss.
		if (Object.keys(answersContext).length === 0) return;
		if (selectedProfiles.length === 0) return;

		const lockedSet = new Set(lockedProfiles);
		const filtered = selectedProfiles.filter((p) => {
			if (lockedSet.has(p)) return true;
			const card = INCOME_PROFILE_CARDS.find((c) => c.type === p);
			if (!card) return false;
			return shouldShow(card.showWhen as any, answersContext);
		});
		if (filtered.length !== selectedProfiles.length) {
			// Remember which ones we just dropped so the reappearance toast can
			// fire on the inverse flip. Using a fresh Set keeps the $state
			// reactive (mutating the existing Set wouldn't trigger Svelte 5).
			const dropped = selectedProfiles.filter((p) => !filtered.includes(p));
			autoDroppedProfiles = new Set([...autoDroppedProfiles, ...dropped]);
			selectedProfiles = filtered;
			onSelectionChange?.(filtered);
		}
	});

	// ── Reappearance toast: card becomes visible again after we auto-dropped ──
	// User scenario: NRI=Yes hides Business Owner → we soft-drop it; later the
	// DSA flips NRI=No → card reappears. They need to know their FY data / GST
	// details / etc. are still preserved — either auto-restored (unsecured
	// loans go through `_stashedIncomeEntries` pop) or one-tap-away (secured
	// loans go through the S104 auto-restore on re-select). Two distinct
	// toast messages handle the two cases so we don't lie about state.
	$effect(() => {
		if (autoDroppedProfiles.size === 0) return;
		const visibleTypes = new Set(visibleCards.map((c) => c.type));
		const reappeared: IncomeProfileType[] = [];
		for (const p of autoDroppedProfiles) {
			if (visibleTypes.has(p)) reappeared.push(p);
		}
		if (reappeared.length === 0) return;

		const labelFor = (p: IncomeProfileType) =>
			INCOME_PROFILE_CARDS.find((c) => c.type === p)?.label ?? p;

		// Unsecured loans re-add to selectedProfiles automatically via the
		// _stashedIncomeEntries pop — those profiles are already re-selected
		// when we see them reappear, so the message is past-tense.
		const alreadyRestored = reappeared.filter((p) => selectedProfiles.includes(p));
		// Secured loans soft-delete to applicantDataStore — the card is back
		// but unchecked; the DSA needs to tap to trigger S104 auto-restore.
		const needsTap = reappeared.filter((p) => !selectedProfiles.includes(p));

		if (alreadyRestored.length > 0) {
			uiState.info(`Earlier ${alreadyRestored.map(labelFor).join(', ')} details restored.`, 5000);
		}
		if (needsTap.length > 0) {
			uiState.info(
				`Earlier ${needsTap.map(labelFor).join(', ')} details are preserved — tap the card to bring them back.`,
				8000
			);
		}

		// Clear the reappeared set so we don't re-fire on every subsequent
		// answersContext change. Profiles that stay hidden (e.g. user flipped
		// NRI back to Yes again before re-tapping) stay in the set, ready to
		// fire the toast when they next become visible.
		const remaining = new Set(autoDroppedProfiles);
		for (const p of reappeared) remaining.delete(p);
		autoDroppedProfiles = remaining;
	});

	// ── Derived: validation state ──────────────────────────────────
	let validationResult = $derived(validateProfileSelection(selectedProfiles));

	// ── Toggle a profile card ──────────────────────────────────────
	function toggleProfile(type: IncomeProfileType, card: IncomeProfileCard) {
		if (disabled) return;

		const isCurrentlySelected = selectedProfiles.includes(type);

		if (isCurrentlySelected) {
			// Prevent deselection of locked profiles
			if (isLocked(type)) return;
			// Deselect
			selectedProfiles = selectedProfiles.filter((p) => p !== type);
		} else {
			// Select — handle exclusive logic
			if (card.exclusive) {
				// "No Current Income" clears all other selections — but can't select if locked profiles exist
				if (lockedProfiles.length > 0) return;
				selectedProfiles = [type];
			} else {
				// Regular profile — remove "no_current_income" if present
				const withoutExclusive = selectedProfiles.filter(
					(p) => !INCOME_PROFILE_CARDS.find((c) => c.type === p)?.exclusive
				);
				selectedProfiles = [...withoutExclusive, type];
			}
		}

		// Clear error on interaction
		error = null;

		// Notify parent
		onSelectionChange?.(selectedProfiles);
	}

	// ── Check if a card is selected ────────────────────────────────
	function isSelected(type: IncomeProfileType): boolean {
		return selectedProfiles.includes(type);
	}

	// $effect(() => {
	// 	console.log('lockedProfiles: ', lockedProfiles, "selectedProfiles: ",selectedProfiles);
	// });
</script>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SECTION: INCOME PROFILE SELECTOR                                  -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<div class="flex flex-col gap-8">
	<!-- Section Header -->
	<div class="flex items-start gap-3 pb-2">
		<div class="flex-1">
			<h3 class="font-titleBold text-sectionHeadingText text-[var(--form-text-secondary)]">
				Select Income Sources
			</h3>
			<p class="alertText mt-1 text-[var(--form-text-label)]">
				Select all income sources for this applicant. You can add specific details for each source
				in the next step.
			</p>
		</div>
	</div>

	<!-- Promoted "No Current Income" Card (for non-EMI applicants, hidden when earning profiles set) -->
	{#if promotedNoIncomeCard && !hasNonExclusiveSelected}
		{@const card = promotedNoIncomeCard}
		{@const selected = isSelected(card.type)}
		{@const CardIcon = getIcon(card.icon)}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<div class="h-1 w-5 rounded-full bg-linear-to-r from-gray-400 to-gray-300"></div>
				<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
					No Income
				</span>
			</div>

			<button
				type="button"
				class="profile-card group relative w-full
					{selected ? 'profile-card-selected' : 'profile-card-unselected'}
					{disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
				onclick={() => toggleProfile(card.type, card)}
				{disabled}
				aria-pressed={selected}
				aria-label="{card.label} - {selected ? 'Selected' : 'Not selected'}"
			>
				{#if selected}
					<div
						class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 shadow-sm dark:bg-stone-900/40"
					>
						<Check class="h-4 w-4 text-primary" />
					</div>
				{/if}

				<div class="flex items-start gap-3 pr-6">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
						{selected ? 'bg-stone-100 text-primary dark:bg-stone-900/40' : 'bg-gray-100 text-gray-500'}
						transition-colors duration-200"
					>
						{#if CardIcon}
							<CardIcon class="h-5 w-5 group-hover:text-primary" />
						{/if}
					</div>

					<div class="flex min-w-0 flex-col">
						<span
							class="font-titleBold text-labelText !m-0 text-[var(--form-text-muted)]
							{selected ? 'text-primary' : ''}"
						>
							{card.label}
						</span>
						<span
							class="tinyText text-[var(--form-text-muted)]
									{selected ? 'text-[var(--form-text-label)]' : ''}"
						>
							{card.description}
						</span>
						{#if !selected}
							<span class="tinyText mt-1 text-[var(--form-text-muted)] italic">
								Select this if applicant has no earnings
							</span>
						{/if}
					</div>
				</div>

				<div class="absolute right-1 bottom-1">
					<span
						class="tinyText rounded-full bg-stone-100 px-2 text-[var(--ddsa-warning)] italic shadow-sm dark:bg-stone-900/40"
						>exclusive</span
					>
				</div>
			</button>
		</div>
	{/if}

	<!-- Employment & Business Income Section -->
	{#if employmentBusinessCards.length > 0}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<div class="bg-ddsa-gradient-primary h-1 w-5 rounded-full"></div>
				<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
					Employment & Business
				</span>
			</div>

			<div class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3">
				{#each employmentBusinessCards as card (card.type)}
					{@const selected = isSelected(card.type)}
					{@const CardIcon = getIcon(card.icon)}

					{@const locked = isLocked(card.type)}
					<button
						type="button"
						class="profile-card group relative
							{selected ? 'profile-card-selected' : 'profile-card-unselected'}
							{disabled || (selected && locked) ? 'cursor-not-allowed' : 'cursor-pointer'}
							{disabled ? 'opacity-50' : ''}"
						onclick={() => toggleProfile(card.type, card)}
						disabled={disabled || (selected && locked)}
						aria-pressed={selected}
						aria-label="{card.label} - {selected ? 'Selected' : 'Not selected'}{locked
							? ' (locked)'
							: ''}"
					>
						<!-- Selection Indicator -->
						{#if selected && locked}
							<div
								class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 shadow-sm dark:bg-stone-900/40"
								title="Auto-set for this loan type — cannot be removed"
							>
								<Lock class="h-4 w-4 text-primary" />
							</div>
						{:else if selected}
							<div
								class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 shadow-sm dark:bg-stone-900/40"
							>
								<Check class="h-4 w-4 text-primary" />
							</div>
						{/if}

						<!-- Card Content -->
						<div class="flex items-start gap-3 pr-6">
							<!-- Icon -->
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
								{selected ? 'bg-stone-100 text-primary dark:bg-stone-900/40 ' : 'bg-gray-100 text-gray-500'}
								transition-colors duration-200"
							>
								{#if CardIcon}
									<CardIcon class="h-5 w-5 group-hover:text-primary" />
								{/if}
							</div>

							<!-- Text -->
							<div class="flex min-w-0 flex-col">
								<span
									class="font-titleBold text-labelText !m-0 text-[var(--form-text-muted)]
									{selected ? 'text-primary' : ''}"
								>
									{card.label}
								</span>
								<span
									class="tinyText text-[var(--form-text-muted)]
									{selected ? 'text-[var(--form-text-label)]' : ''}"
								>
									{card.description}
								</span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Other Income Sources Section -->
	{#if otherIncomeCards.length > 0}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<div class="h-1 w-5 rounded-full bg-linear-to-r from-blue-400 to-indigo-400"></div>
				<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
					Other Income Sources
				</span>
			</div>

			<div class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3">
				{#each otherIncomeCards as card (card.type)}
					{@const selected = isSelected(card.type)}
					{@const locked = isLocked(card.type)}
					{@const CardIcon = getIcon(card.icon)}

					<button
						type="button"
						class="profile-card group relative
							{selected ? 'profile-card-selected' : 'profile-card-unselected'}
							{disabled || (selected && locked) ? 'cursor-not-allowed' : 'cursor-pointer'}
							{disabled ? 'opacity-50' : ''}
							{card.exclusive ? 'border-dashed' : ''}"
						onclick={() => toggleProfile(card.type, card)}
						disabled={disabled || (selected && locked)}
						aria-pressed={selected}
						aria-label="{card.label} - {selected ? 'Selected' : 'Not selected'}{locked
							? ' (locked)'
							: ''}"
					>
						<!-- Selection Indicator -->
						{#if selected && locked}
							<div
								class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 shadow-sm dark:bg-stone-900/40"
								title="Auto-set for this loan type — cannot be removed"
							>
								<Lock class="h-4 w-4 text-primary" />
							</div>
						{:else if selected}
							<div
								class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 shadow-sm dark:bg-stone-900/40"
							>
								<Check class="h-4 w-4 text-primary" />
							</div>
						{/if}

						<!-- Card Content -->
						<div class="flex items-start gap-3 pr-6">
							<!-- Icon -->
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
								{selected
									? card.exclusive
										? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
										: 'bg-stone-100 text-primary dark:bg-stone-900/40'
									: 'bg-gray-100 text-gray-500'}
								transition-colors duration-200"
							>
								{#if CardIcon}
									<CardIcon class="h-5 w-5 group-hover:text-primary" />
								{/if}
							</div>

							<!-- Text -->
							<div class="flex min-w-0 flex-col">
								<span
									class="font-titleBold text-labelText !m-0 text-[var(--form-text-muted)]
									{selected ? (card.exclusive ? 'text-gray-700 dark:text-gray-300' : 'text-primary') : ''}"
								>
									{card.label}
								</span>
								<span
									class="tinyText text-[var(--form-text-muted)]
									{selected
										? card.exclusive
											? 'text-gray-500 dark:text-gray-400'
											: 'text-[var(--form-text-label)]'
										: ''}"
								>
									{card.description}
								</span>
							</div>
						</div>

						<!-- Exclusive Badge -->
						{#if card.exclusive}
							<div class="absolute right-1 bottom-1">
								<span
									class="tinyText rounded-full bg-stone-100 px-2 text-[var(--ddsa-warning)] italic shadow-sm dark:bg-stone-900/40"
									>exclusive</span
								>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Validation Error -->
	{#if error}
		<div class="error-message">
			<AlertCircle class="h-5 w-5 shrink-0 text-red-500" />
			<span class="text-red-600 dark:text-red-400">{error}</span>
		</div>
	{/if}

	<!-- Selection Summary -->
	{#if selectedProfiles.length > 0}
		<div
			class="flex flex-col gap-3 rounded-xl  bg-[var(--form-bg-card)] shadow-sm border border-[var(--form-border)] p-3"
		>
			<div class="flex items-start gap-2">
				<Info class="h-4 w-4 shrink-0 text-[var(--form-text-label)]" />
				<span class="alertText text-[var(--form-text-label)]">
					<span class="font-titleBold"
						>{selectedProfiles.length === 1
							? '1 source selected'
							: `${selectedProfiles.length} sources selected`}</span
					>
					— Proceed to next tab to add details for each source.
				</span>
			</div>

			<!-- No-Income Reason Subcategory (when sole selection is no_current_income) -->
			{#if showNoIncomeReason}
				<div class="pt-1">
					<SelectField
						id="noIncomeReason"
						label="What best describes this applicant's situation?"
						options={NO_INCOME_REASON_OPTIONS}
						value={noIncomeReason}
						onChange={(val) => onNoIncomeReasonChange?.(String(val))}
						required={true}
						icon="user-x"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.profile-card {
		display: flex;
		flex-direction: column;
		padding: 0.875rem;
		border-radius: 0.875rem;
		border: 2px solid transparent;
		transition: all 0.2s ease;
		text-align: left;
	}

	.profile-card-unselected {
		border-color: var(--form-border, #e5e7eb);
		background: var(--form-bg-alt);
	}

	.profile-card-unselected:hover:not(:disabled) {
		border-color: var(--ddsa-primary-400, #fbbf24);
		background: linear-gradient(135deg, var(--ddsa-primary-100) 0%, var(--ddsa-primary-50) 100%);
		transform: translateY(-1px);
	}

	:global(.dark) .profile-card-unselected:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--ddsa-primary-100) 0%, var(--ddsa-primary-50) 100%);
	}

	.profile-card-selected {
		border-color: var(--ddsa-primary-500, #f59e0b);
		background: linear-gradient(135deg, var(--ddsa-primary-100) 0%, var(--ddsa-primary-50) 100%);
		color: var(--ddsa-primary-700);
	}

	:global(.dark) .profile-card-selected {
		border-color: var(--ddsa-primary-500, #f59e0b);
		background: linear-gradient(135deg, var(--ddsa-primary-100) 0%, var(--ddsa-primary-50) 100%);
		color: var(--ddsa-primary-700);
	}

	.profile-card:focus-visible {
		outline: 2px solid var(--ddsa-primary-500, #f59e0b);
		outline-offset: 2px;
	}
</style>
