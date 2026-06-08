<script lang="ts">
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import { PAIN_POINTS_OPTIONS } from '$lib/data/painPoints';
	import {
		Search,
		FileText,
		Target,
		Calculator,
		Phone,
		Wallet,
		RotateCcw,
		ArrowLeftRight,
		FileCheck,
		Timer,
		Check
	} from '$lib/utils/iconRegistry';

	const MAX_SELECTION = 3;

	// Map each pain point to a Lucide icon
	const painPointIcons = [
		Search, // Tracking file status
		FileText, // Document collection chaos
		Target, // Don't know which lender
		Calculator, // Can't calculate eligibility
		Phone, // RM doesn't respond
		Wallet, // Commission tracking
		RotateCcw, // No follow-up system
		ArrowLeftRight, // Balance transfer
		FileCheck, // Can't generate proposals
		Timer // WhatsApp coordination
	];

	// Shorter labels for cards
	const shortLabels = [
		'File tracking across lenders',
		'Chaotic document collection',
		'Matching lender to customer',
		'Eligibility calculation',
		'Slow RM response',
		'Commission tracking',
		'Follow-up on old leads',
		'Balance transfer opportunities',
		'Professional proposals',
		'WhatsApp overload'
	];

	function togglePainPoint(point: string) {
		const current: string[] = onboardingState.data.painPoints || [];
		if (current.includes(point)) {
			onboardingState.data.painPoints = current.filter((p: string) => p !== point);
		} else if (current.length < MAX_SELECTION) {
			onboardingState.data.painPoints = [...current, point];
		}
		clearError('painPoints');
	}

	function clearError(field: string) {
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated[field];
			return updated;
		});
	}

	const selected = $derived<string[]>(onboardingState.data.painPoints || []);
	const selectionCount = $derived(selected.length);
</script>

<div class="space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-medium text-white/70">Pick your top 3 challenges</p>
			<p class="mt-0.5 text-xs text-white/30">This helps us personalize your experience</p>
		</div>
		<div
			class="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium
			{selectionCount === MAX_SELECTION ? 'text-emerald-400' : 'text-white/40'}"
		>
			{selectionCount} / {MAX_SELECTION}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
		{#each PAIN_POINTS_OPTIONS as point, i}
			{@const isSelected = selected.includes(point)}
			{@const isDisabled = !isSelected && selectionCount >= MAX_SELECTION}
			{@const Icon = painPointIcons[i]}
			<button
				type="button"
				onclick={() => togglePainPoint(point)}
				disabled={isDisabled}
				class="group relative flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all
					{isSelected
					? 'border-[var(--ddsa-primary-400)]/50 bg-[var(--ddsa-primary-400)]/10'
					: isDisabled
						? 'cursor-not-allowed border-white/[0.03] bg-white/[0.01] opacity-40'
						: 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'}"
			>
				<!-- Check badge -->
				{#if isSelected}
					<div
						class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ddsa-primary-400)]"
					>
						<Check class="h-3 w-3 text-white" />
					</div>
				{/if}

				<!-- Icon -->
				<div
					class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
					{isSelected ? 'bg-[var(--ddsa-primary-400)]/20' : 'bg-white/[0.05]'}"
				>
					<Icon class="h-4 w-4 {isSelected ? 'text-[var(--ddsa-primary-300)]' : 'text-white/40'}" />
				</div>

				<!-- Label -->
				<span
					class="pr-5 text-xs leading-snug {isSelected
						? 'font-medium text-white'
						: 'text-white/50'}"
				>
					{shortLabels[i]}
				</span>
			</button>
		{/each}
	</div>

	{#if onboardingState.errors.painPoints}
		<p class="text-xs text-[var(--ddsa-error)]">{onboardingState.errors.painPoints}</p>
	{/if}
</div>
