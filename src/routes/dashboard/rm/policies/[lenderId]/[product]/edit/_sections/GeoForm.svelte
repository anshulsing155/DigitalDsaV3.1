<script lang="ts">
	import type { GeoConfig } from '$lib/config/pms/policyTypes.js';
	import ArrayInput from './ArrayInput.svelte';

	let { value = $bindable<GeoConfig>() }: { value: GeoConfig } = $props();
</script>

<div class="space-y-4">
	<ArrayInput bind:values={value.allowedStates} label="Allowed states" placeholder="e.g. Maharashtra" />
	<ArrayInput bind:values={value.excludedCities} label="Excluded cities" placeholder="e.g. Dharavi" />
	<label class="block">
		<span class="text-xs font-medium text-gray-600">Notes</span>
		<textarea bind:value={value.notes} rows={2} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"></textarea>
	</label>
</div>
