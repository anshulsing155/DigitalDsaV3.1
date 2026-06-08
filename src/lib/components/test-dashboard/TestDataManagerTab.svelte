<script lang="ts">
	import type { GenerationResult, TestCase, CityTier } from '$lib/testing/types/testData.types';
	import clientLogger from '$lib/utils/clientLogger';

	interface Props {
		schemaConstants: {
			LOAN_NAMES: string[];
			SECURED_LOAN_NAMES: string[];
			EMPLOYMENT_TYPES: string[];
		};
	}

	let { schemaConstants }: Props = $props();

	let LOAN_NAMES = $derived(schemaConstants.LOAN_NAMES);
	let EMPLOYMENT_TYPES = $derived(schemaConstants.EMPLOYMENT_TYPES);
	// SECURED_LOAN_NAMES is a derived view used only via initial state below — keep available
	// for future filter wiring, but suppress unused warning by reading directly inline:
	// svelte-ignore state_referenced_locally
	let selectedLoanName = $state(
		schemaConstants.SECURED_LOAN_NAMES[0] ?? schemaConstants.LOAN_NAMES[0] ?? ''
	);

	let mode: 'select' | 'results' = $state('select');
	let generationResult: GenerationResult | null = $state(null);
	let isGenerating = $state(false);
	let errorMessage = $state('');
	// svelte-ignore state_referenced_locally
	let selectedEmployment = $state(schemaConstants.EMPLOYMENT_TYPES[0] ?? '');
	let selectedCityTier = $state<CityTier>('Metro');
	let maxCombinations = $state(50);

	// Results view
	let expandedCase: string | null = $state(null);

	async function handleGenerate() {
		isGenerating = true;
		errorMessage = '';

		try {
			const { CombinationGenerator } = await import('$lib/testing/generators/combinationGenerator');

			const generator = new CombinationGenerator(Date.now());
			const result = await generator.generate({
				mode: 'filtered',
				filters: {
					loanNames: [selectedLoanName] as any[],
					employmentTypes: [selectedEmployment] as any[],
					cityTiers: [selectedCityTier],
					propertyTypes: ['Flat']
				},
				limits: {
					maxCombinations,
					includeVariations: false
				}
			});

			generationResult = result;
			mode = 'results';
		} catch (error) {
			clientLogger.error({ err: error }, 'Generation error:');
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			isGenerating = false;
		}
	}

	function backToSelection() {
		mode = 'select';
		generationResult = null;
		errorMessage = '';
		expandedCase = null;
	}

	function toggleCase(id: string) {
		expandedCase = expandedCase === id ? null : id;
	}
</script>

<div class="space-y-4">
	<!-- What this tab does -->
	<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
		<h3 class="text-sm font-bold text-blue-900">What does this do?</h3>
		<p class="mt-1 text-xs leading-relaxed text-blue-800">
			Generates <strong>synthetic test profiles</strong> — fake but realistic applicant data (income,
			employment, property details) for testing. Use this to verify the form handles diverse combinations:
			different city tiers, loan types, employment types, etc.
		</p>
		<p class="mt-2 text-xs text-blue-700">
			<strong>How to use:</strong> Select a Loan Type, Employment Type, City Tier, and max combinations.
			Click "Generate Test Cases". Expand any case to see the full JSON profile.
		</p>
		<p class="mt-2 text-xs text-blue-700">
			<strong>What to report:</strong> "Generated X profiles for [Loan Type]. All profiles valid." Flag
			any unrealistic combinations (e.g., Rural city with 10Cr property, or negative income).
		</p>
	</div>

	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold text-gray-900">Test Data Generator</h2>
			<p class="text-sm text-gray-500">Generate synthetic applicant &amp; property profiles</p>
		</div>
		{#if mode === 'results'}
			<button
				onclick={backToSelection}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				&larr; Back
			</button>
		{/if}
	</div>

	{#if errorMessage}
		<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
			<strong>Error:</strong>
			{errorMessage}
		</div>
	{/if}

	{#if mode === 'select' && !isGenerating}
		<div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Loan -->
				<div>
					<label for="loanName" class="mb-1 block text-xs font-medium text-gray-700"
						>Loan</label
					>
					<select
						id="loanName"
						bind:value={selectedLoanName}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
					>
						{#each LOAN_NAMES as ln}
							<option value={ln}>{ln}</option>
						{/each}
					</select>
				</div>

				<!-- Employment -->
				<div>
					<label for="empType" class="mb-1 block text-xs font-medium text-gray-700"
						>Employment Type</label
					>
					<select
						id="empType"
						bind:value={selectedEmployment}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
					>
						{#each EMPLOYMENT_TYPES as et}
							<option value={et}>{et}</option>
						{/each}
					</select>
				</div>

				<!-- City Tier -->
				<div>
					<label for="cityTier" class="mb-1 block text-xs font-medium text-gray-700"
						>City Tier</label
					>
					<select
						id="cityTier"
						bind:value={selectedCityTier}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
					>
						<option value="Metro">Metro</option>
						<option value="Tier1">Tier 1</option>
						<option value="Tier2">Tier 2</option>
						<option value="Tier3">Tier 3</option>
						<option value="Rural">Rural</option>
					</select>
				</div>

				<!-- Max Combinations -->
				<div>
					<label for="maxCombo" class="mb-1 block text-xs font-medium text-gray-700"
						>Max Combinations</label
					>
					<input
						id="maxCombo"
						type="number"
						bind:value={maxCombinations}
						min="1"
						max="5000"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
					/>
				</div>
			</div>

			<div class="mt-5">
				<button
					onclick={handleGenerate}
					class="rounded-lg bg-[var(--ddsa-primary-500)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--ddsa-primary-600)] disabled:opacity-50"
				>
					Generate Test Cases
				</button>
			</div>
		</div>
	{/if}

	{#if isGenerating}
		<div
			class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12"
		>
			<div class="text-center">
				<div class="mb-4 flex justify-center">
					<div
						class="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
					></div>
				</div>
				<p class="text-sm font-medium text-gray-900">Generating...</p>
			</div>
		</div>
	{/if}

	{#if mode === 'results' && generationResult}
		<!-- Summary -->
		<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
			<div class="grid grid-cols-3 gap-4 text-center">
				<div>
					<p class="text-2xl font-bold text-[var(--ddsa-primary-500)]">
						{generationResult.testCases.length}
					</p>
					<p class="text-xs text-gray-500">Test Cases</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-green-600">{generationResult.success ? 'Yes' : 'No'}</p>
					<p class="text-xs text-gray-500">Success</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-gray-700">{selectedLoanName}</p>
					<p class="text-xs text-gray-500">Loan</p>
				</div>
			</div>
		</div>

		<!-- Test Cases List -->
		<div class="space-y-2">
			{#each generationResult.testCases.slice(0, 50) as testCase, i}
				<div class="rounded-xl border border-gray-100 bg-white shadow-sm">
					<button
						onclick={() => toggleCase(testCase.id ?? `tc-${i}`)}
						class="flex w-full items-center justify-between p-3 text-left text-sm"
					>
						<div class="flex items-center gap-3">
							<span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600"
								>#{i + 1}</span
							>
							<span class="font-medium text-gray-800">{testCase.loanName}</span>
							<span class="text-xs text-gray-500"
								>{testCase.applicants?.[0]?.employmentType ?? ''}</span
							>
						</div>
						<span class="text-xs text-gray-400"
							>{expandedCase === (testCase.id ?? `tc-${i}`) ? '▲' : '▼'}</span
						>
					</button>

					{#if expandedCase === (testCase.id ?? `tc-${i}`)}
						<div class="border-t border-gray-100 p-3">
							<pre
								class="max-h-60 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">{JSON.stringify(
									testCase,
									null,
									2
								)}</pre>
						</div>
					{/if}
				</div>
			{/each}

			{#if generationResult.testCases.length > 50}
				<p class="text-center text-xs text-gray-500">
					Showing 50 of {generationResult.testCases.length} test cases
				</p>
			{/if}
		</div>
	{/if}
</div>
