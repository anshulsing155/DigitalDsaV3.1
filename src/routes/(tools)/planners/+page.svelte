<script lang="ts">
	/**
	 * Planner Index Page — Lists all available planners.
	 */
	import { goto } from '$app/navigation';
	import { PLANNER_LIST } from '$lib/tools/constants.js';
</script>

<svelte:head>
	<title>Loan Planners — Part-Payment, EMI & Budget Planning | DigitalDSA</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<h1 class="text-2xl font-bold text-[var(--ddsa-secondary)] sm:text-3xl">Loan Planners</h1>
	<p class="mt-2 text-sm text-[var(--ddsa-secondary-500)]">
		Plan your loan repayment strategy — see how part-payments and EMI changes can save you lakhs in
		interest.
	</p>

	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each PLANNER_LIST as tool (tool.id)}
			<button
				type="button"
				onclick={() => goto(tool.publicRoute)}
				class="card-surface p-6 text-left transition-all hover:border-[var(--ddsa-primary-200)] hover:shadow-md"
			>
				<h3 class="text-base font-semibold text-[var(--ddsa-secondary)]">{tool.label}</h3>
				<p class="mt-2 text-sm text-[var(--ddsa-secondary-500)]">{tool.description}</p>
			</button>
		{/each}
	</div>
</div>
