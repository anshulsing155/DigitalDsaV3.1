<script lang="ts">
	import type { EligibilityConfig } from '$lib/config/pms/policyTypes.js';
	import ArrayInput from './ArrayInput.svelte';

	let { value = $bindable<EligibilityConfig>() }: { value: EligibilityConfig } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Minimum age</span>
			<input
				type="number"
				bind:value={value.minAge}
				min="18"
				max="99"
				class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
			/>
		</label>
		<label class="block">
			<span class="text-xs font-medium text-gray-600">Maximum age</span>
			<input
				type="number"
				bind:value={value.maxAge}
				min="18"
				max="99"
				class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
			/>
		</label>
	</div>

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Minimum credit score</span>
		<input
			type="number"
			bind:value={value.minCreditScore}
			min="300"
			max="900"
			class="mt-1 w-full max-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
		/>
	</label>

	<ArrayInput bind:values={value.allowedEmploymentTypes} label="Allowed employment types" placeholder="e.g. salaried" />
	<ArrayInput bind:values={value.allowedNationalities} label="Allowed nationalities" placeholder="e.g. Indian" />

	<label class="flex items-center gap-2 text-sm text-gray-700">
		<input type="checkbox" bind:checked={value.isDefaulterAllowed} class="rounded" />
		Defaulter applicants allowed
	</label>

	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea
			bind:value={value.notes}
			rows={2}
			placeholder="Optional notes (exceptions, caveats, etc.)"
			class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
		></textarea>
	</label>
</div>
