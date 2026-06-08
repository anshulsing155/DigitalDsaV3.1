<script lang="ts">
	/**
	 * CombinedPlanner — Toggle between Part-Payment and Flexible EMI planners.
	 *
	 * This wrapper component lets users switch between the two planning
	 * strategies using a tabbed interface. Each sub-planner maintains its
	 * own independent state.
	 */
	import PartPaymentPlanner from './PartPaymentPlanner.svelte';
	import FlexibleEmiPlanner from './FlexibleEmiPlanner.svelte';

	// --- Component Props ---
	interface Props {
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// TAB STATE
	// =========================================================================

	let activeTab: string = $state('part-payment');
</script>

<!-- ======================================================================= -->
<!-- COMBINED PLANNER UI                                                     -->
<!-- ======================================================================= -->

<div class="space-y-6">
	<!-- Tab Switcher -->
	<div class="flex rounded-lg bg-[var(--ddsa-secondary-50)] p-0.5">
		<button
			type="button"
			class="rounded-md px-4 py-2 text-sm font-medium transition-all {activeTab === 'part-payment'
				? 'bg-[var(--ddsa-secondary)] text-white'
				: 'text-[var(--ddsa-secondary-600)]'}"
			onclick={() => (activeTab = 'part-payment')}
		>
			Part-Payment Planner
		</button>
		<button
			type="button"
			class="rounded-md px-4 py-2 text-sm font-medium transition-all {activeTab === 'flexible-emi'
				? 'bg-[var(--ddsa-secondary)] text-white'
				: 'text-[var(--ddsa-secondary-600)]'}"
			onclick={() => (activeTab = 'flexible-emi')}
		>
			Flexible EMI Planner
		</button>
	</div>

	<!-- Active Planner -->
	{#if activeTab === 'part-payment'}
		<PartPaymentPlanner {variant} />
	{:else}
		<FlexibleEmiPlanner {variant} />
	{/if}
</div>
