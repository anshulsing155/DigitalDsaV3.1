<script lang="ts">
	import CustomSelect from '../CustomSelect.svelte';

	interface Props {
		options?: { label: string; value: string | number; disabled?: boolean }[];
		value?: string | number;
		onchange?: (value: string | number) => void;
	}

	let { options = [], value = $bindable(''), onchange }: Props = $props();

	// Filter out disabled options for the custom select
	let enabledOptions = $derived(options.filter((opt) => !opt.disabled));

	function handleChange(newValue: string | number) {
		value = newValue;
		onchange?.(newValue);
	}
</script>

<div class="w-full space-y-1">
	<CustomSelect
		id="selection-custom"
		options={enabledOptions}
		bind:value
		placeholder="Select option"
		onChange={handleChange}
	/>
</div>
