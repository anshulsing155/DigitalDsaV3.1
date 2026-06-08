<script lang="ts">
	import type { DeviationsData } from '$lib/types/policyCapture.js';
	import { createDefaultDeviations } from '$lib/types/policyCapture.js';
	import DeviationBuilder from '../DeviationBuilder.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: DeviationsData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: DeviationsData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let {
		data,
		isReadOnly,
		unknownFields: _unknownFields,
		onUpdate,
		onUnknownToggle: _onUnknownToggle
	}: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<DeviationsData>(data ?? createDefaultDeviations());

	function update<K extends keyof DeviationsData>(key: K, value: DeviationsData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Deviations</h3>
		<p class="mt-1 text-sm text-gray-500">
			Deviations are rules the bank can relax with appropriate approval authority. Add each
			deviation with its condition and who can approve it.
		</p>
	</div>

	<DeviationBuilder
		entries={form.entries}
		{isReadOnly}
		onUpdate={(entries) => update('entries', entries)}
	/>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Other deviation info not covered above?"
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
