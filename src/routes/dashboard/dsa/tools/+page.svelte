<script lang="ts">
	/**
	 * Dashboard Tools Index — Grid of all calculators and planners.
	 *
	 * Shows all available tools in a card grid within the DSA dashboard.
	 */
	import { goto } from '$app/navigation';
	import { CALCULATOR_LIST, PLANNER_LIST } from '$lib/tools/constants.js';
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6">
	<h1 class="text-2xl font-bold text-[var(--ddsa-secondary)]">Tools</h1>
	<p class="mt-1 text-sm text-[var(--ddsa-secondary-500)]">
		Calculators and planners to help your clients make informed decisions.
	</p>

	<!-- Calculators Section -->
	<h2 class="mt-8 text-base font-semibold text-[var(--ddsa-secondary-700)]">Calculators</h2>
	<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each CALCULATOR_LIST as tool (tool.id)}
			<button
				type="button"
				onclick={() => goto(tool.dashboardRoute)}
				class="card-surface p-5 text-left transition-all hover:border-[var(--ddsa-primary-200)] hover:shadow-md"
			>
				<h3 class="text-sm font-semibold text-[var(--ddsa-secondary)]">{tool.label}</h3>
				<p class="mt-1 text-xs text-[var(--ddsa-secondary-500)]">{tool.description}</p>
			</button>
		{/each}
	</div>

	<!-- Planners Section -->
	<h2 class="mt-8 text-base font-semibold text-[var(--ddsa-secondary-700)]">Planners</h2>
	<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each PLANNER_LIST as tool (tool.id)}
			<button
				type="button"
				onclick={() => goto(tool.dashboardRoute)}
				class="card-surface p-5 text-left transition-all hover:border-[var(--ddsa-primary-200)] hover:shadow-md"
			>
				<h3 class="text-sm font-semibold text-[var(--ddsa-secondary)]">{tool.label}</h3>
				<p class="mt-1 text-xs text-[var(--ddsa-secondary-500)]">{tool.description}</p>
			</button>
		{/each}
	</div>
</div>
