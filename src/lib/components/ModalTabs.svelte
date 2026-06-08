<script lang="ts">
	import { Check, Lock } from '$lib/utils/iconRegistry';

	interface Tab {
		id: string;
		label: string;
		complete?: boolean;
	}

	interface Props {
		tabs: Tab[];
		activeTab: string;
		onTabChange: (id: string) => void;
	}

	let { tabs, activeTab, onTabChange }: Props = $props();

	// A tab is locked if any previous tab is not complete
	function isTabLocked(index: number): boolean {
		for (let i = 0; i < index; i++) {
			if (!tabs[i].complete) return true;
		}
		return false;
	}

	function handleTabClick(tab: Tab, index: number) {
		if (isTabLocked(index)) return;
		onTabChange(tab.id);
	}
</script>

<!-- Stepper container -->
<div class="mb-4 w-full px-2 py-4">
	<div class="relative flex items-start justify-between">
		{#each tabs as tab, i}
			{@const locked = isTabLocked(i)}
			{@const isActive = activeTab === tab.id}
			{@const isComplete = tab.complete && !isActive}

			<!-- Step -->
			<div class="group relative z-10 flex flex-1 flex-col items-center">
				<!-- Step circle -->
				<button
					type="button"
					onclick={() => handleTabClick(tab, i)}
					disabled={locked}
					class={`
						relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full
						font-titleBold text-sm transition-all duration-300
						${
							isActive
								? 'scale-110 bg-gradient-to-br from-stone-500 to-neutral-500 text-white shadow-lg ring-4 shadow-stone-500/30 ring-stone-100 dark:ring-stone-900/50'
								: isComplete
									? 'bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow-md shadow-gray-500/20'
									: locked
										? 'cursor-not-allowed border-2 border-[var(--dash-border)] bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
										: 'cursor-pointer border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-stone-400 hover:text-stone-600 dark:hover:border-stone-500 dark:hover:text-stone-400'
						}
					`}
					aria-label={locked
						? `Step ${i + 1}: ${tab.label} — complete previous step first`
						: `Step ${i + 1}: ${tab.label}`}
				>
					{#if isComplete}
						<Check class="h-5 w-5" strokeWidth={3} />
					{:else if locked}
						<Lock class="h-4 w-4" />
					{:else}
						{i + 1}
					{/if}

					<!-- Active pulse ring -->
					{#if isActive}
						<span class="animate-ping-slow absolute inset-0 rounded-full bg-stone-400/30"></span>
					{/if}
				</button>

				<!-- Label -->
				<span
					class={`
						mt-2.5 max-w-[6rem] text-center font-titleMedium text-xs leading-tight transition-colors
						duration-200 sm:max-w-[8rem]
						${
							isActive
								? 'font-titleBold text-stone-700 dark:text-stone-400'
								: isComplete
									? 'font-titleMedium text-[var(--dash-text-secondary)]'
									: locked
										? 'text-[var(--dash-text-muted)]'
										: 'text-[var(--dash-text-secondary)]'
						}
					`}
				>
					{tab.label}
				</span>

				<!-- Locked tooltip -->
				{#if locked}
					<span
						class="mt-1.5 max-w-[7rem] text-center font-paragraph text-[10px] leading-tight text-red-400"
					>
						Complete previous step
					</span>
				{/if}
			</div>

			<!-- Connecting line (between steps) -->
			{#if i < tabs.length - 1}
				<div class="mt-5 flex flex-1 items-center px-1 sm:px-2">
					<div
						class={`
							h-0.5 w-full rounded-full transition-all duration-500
							${
								tab.complete
									? 'bg-gradient-to-r from-gray-500 to-gray-400'
									: isActive
										? 'bg-gradient-to-r from-stone-300 to-[var(--dash-bg-alt)]'
										: 'bg-[var(--dash-bg-alt)]'
							}
						`}
					></div>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	@keyframes ping-slow {
		0% {
			transform: scale(1);
			opacity: 0.4;
		}
		75%,
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	:global(.animate-ping-slow) {
		animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
</style>
