<script lang="ts">
	/**
	 * Calculator Index Page — Lists all available calculators.
	 */
	import { goto } from '$app/navigation';
	import { CALCULATOR_LIST } from '$lib/tools/constants.js';
</script>

<svelte:head>
	<title>Loan Calculators — EMI, Eligibility, Affordability & More | DigitalDSA</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<h1 class="text-2xl font-bold text-[var(--ddsa-secondary)] sm:text-3xl">Loan Calculators</h1>
	<p class="mt-2 text-sm text-[var(--ddsa-secondary-500)]">
		Free tools to help you plan your loan — calculate EMI, check eligibility, compare balance
		transfer options, and more.
	</p>

	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each CALCULATOR_LIST as tool (tool.id)}
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
