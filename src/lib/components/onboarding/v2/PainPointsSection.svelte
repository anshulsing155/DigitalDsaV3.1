<script lang="ts">
	import type { DsaPainPoints } from '$lib/types/dsaOnboardingV2';
	import type { PainPointOption } from '$lib/data/painPoints';
	import {
		AlertTriangle,
		Check,
		X,
		Plus,
		ChevronUp,
		ChevronDown,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface Props {
		data: DsaPainPoints;
		onUpdate: (data: DsaPainPoints) => void;
		painPointOptions: string[];
		errors?: Record<string, string>;
	}

	let { data, onUpdate, painPointOptions, errors = {} }: Props = $props();

	// ── Internal state (one-time snapshot from prop) ────────────
	// svelte-ignore state_referenced_locally
	let rankedItems = $state<string[]>([...(data.ranked_items ?? [])]);

	// ── Derived ──────────────────────────────────────────────────
	let availableItems = $derived(painPointOptions.filter((item) => !rankedItems.includes(item)));

	let isComplete = $derived(rankedItems.length === 5);
	let spotsRemaining = $derived(5 - rankedItems.length);

	// ── Actions ──────────────────────────────────────────────────
	function addItem(item: string) {
		if (rankedItems.length >= 5) return;
		rankedItems = [...rankedItems, item];
		emitUpdate();
	}

	function removeItem(index: number) {
		rankedItems = rankedItems.filter((_, i) => i !== index);
		emitUpdate();
	}

	function moveUp(index: number) {
		if (index === 0) return;
		const newItems = [...rankedItems];
		[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
		rankedItems = newItems;
		emitUpdate();
	}

	function moveDown(index: number) {
		if (index >= rankedItems.length - 1) return;
		const newItems = [...rankedItems];
		[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
		rankedItems = newItems;
		emitUpdate();
	}

	function emitUpdate() {
		onUpdate({
			ranked_items: rankedItems as PainPointOption[],
			ranked_at: new Date()
		});
	}

	// Rank badge colors
	const rankColors = [
		'bg-red-500 text-white',
		'bg-neutral-500 text-white',
		'bg-stone-500 text-white',
		'bg-yellow-500 text-white',
		'bg-lime-500 text-white'
	];
</script>

<div class="space-y-8">
	<!-- ── Section Header ─────────────────────────────────────── -->
	<div class="flex items-center gap-3 border-b border-[var(--dash-border)] pb-2">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-neutral-100"
		>
			<AlertTriangle class="h-5 w-5 text-red-500" />
		</div>
		<div>
			<h2 class="text-lg font-bold text-[var(--dash-text)]">Your Top Pain Points</h2>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				Select and rank your 5 biggest challenges as a DSA
			</p>
		</div>
	</div>

	<!-- ── Status Bar ─────────────────────────────────────────── -->
	<div
		class="flex items-center justify-between rounded-xl p-4 {isComplete
			? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
			: 'border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950/40'}"
	>
		<div class="flex items-center gap-2">
			{#if isComplete}
				<Check class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				<span class="text-sm font-medium text-emerald-700 dark:text-emerald-400"
					>All 5 pain points selected and ranked</span
				>
			{:else}
				<AlertCircle class="h-5 w-5 text-stone-600 dark:text-stone-400" />
				<span class="text-sm font-medium text-stone-700 dark:text-stone-400">
					Select {spotsRemaining} more pain point{spotsRemaining !== 1 ? 's' : ''}
				</span>
			{/if}
		</div>
		<div class="flex gap-1">
			{#each Array(5) as _, i}
				<div
					class="h-3 w-3 rounded-full transition-all {i < rankedItems.length
						? 'bg-stone-500'
						: 'bg-[var(--dash-bg-alt)]'}"
				></div>
			{/each}
		</div>
	</div>

	{#if errors.ranked_items}
		<p class="flex items-center gap-1 text-xs text-red-500">
			<AlertCircle class="h-3 w-3" />{errors.ranked_items}
		</p>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- ── Your Top 5 (Ranked) ────────────────────────────── -->
		<div class="space-y-3">
			<h3 class="text-sm font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase">
				Your Top 5 <span class="font-normal text-[var(--dash-text-muted)] normal-case"
					>(in order of priority)</span
				>
			</h3>

			{#if rankedItems.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-alt)]/50 px-4 py-12"
				>
					<p class="text-center text-sm text-[var(--dash-text-muted)]">
						Click on pain points from the list to rank them here
					</p>
					<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
						First click = Rank #1, second = Rank #2, etc.
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each rankedItems as item, index}
						<div
							class="group flex items-center gap-3 rounded-xl border-2 border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-3 transition-all hover:border-stone-200 dark:hover:border-stone-800"
						>
							<!-- Rank Badge -->
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold {rankColors[
									index
								]}"
							>
								{index + 1}
							</div>

							<!-- Pain Point Text -->
							<p class="flex-1 text-sm leading-snug text-[var(--dash-text)]">{item}</p>

							<!-- Reorder Buttons -->
							<div
								class="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									type="button"
									disabled={index === 0}
									onclick={() => moveUp(index)}
									class="cursor-pointer rounded p-0.5 text-[var(--dash-text-muted)] hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-stone-400"
									aria-label="Move up"
								>
									<ChevronUp class="h-4 w-4" />
								</button>
								<button
									type="button"
									disabled={index === rankedItems.length - 1}
									onclick={() => moveDown(index)}
									class="cursor-pointer rounded p-0.5 text-[var(--dash-text-muted)] hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-stone-400"
									aria-label="Move down"
								>
									<ChevronDown class="h-4 w-4" />
								</button>
							</div>

							<!-- Remove Button -->
							<button
								type="button"
								onclick={() => removeItem(index)}
								class="flex-shrink-0 cursor-pointer rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
								aria-label="Remove from ranking"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── Available Pain Points ──────────────────────────── -->
		<div class="space-y-3">
			<h3 class="text-sm font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase">
				Available
				<span class="font-normal text-[var(--dash-text-muted)] normal-case"
					>({availableItems.length} remaining)</span
				>
			</h3>

			{#if availableItems.length === 0}
				<div
					class="flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-12 dark:border-emerald-800 dark:bg-emerald-950/20"
				>
					<p class="text-center text-sm text-emerald-500 dark:text-emerald-400">
						All pain points have been ranked
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each availableItems as item}
						<button
							type="button"
							disabled={isComplete}
							onclick={() => addItem(item)}
							class="flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all
								{isComplete
								? 'cursor-not-allowed border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
								: 'cursor-pointer border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-stone-300 hover:bg-stone-50/30 hover:shadow-sm dark:hover:border-stone-800 dark:hover:bg-stone-950/20'}"
						>
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg
								{isComplete ? 'bg-[var(--dash-bg-alt)]' : 'bg-[var(--dash-bg-alt)] group-hover:bg-stone-100'}"
							>
								<Plus
									class="h-4 w-4 {isComplete
										? 'text-[var(--dash-text-muted)]'
										: 'text-[var(--dash-text-muted)]'}"
								/>
							</div>
							<p class="flex-1 text-sm leading-snug">{item}</p>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Tip ────────────────────────────────────────────────── -->
	<div
		class="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
	>
		<p class="text-xs text-blue-700 dark:text-blue-400">
			<strong>Tip:</strong> Rank by what costs you the most time or money. Your #1 pain point will help
			us prioritize which features to show you first.
		</p>
	</div>
</div>
