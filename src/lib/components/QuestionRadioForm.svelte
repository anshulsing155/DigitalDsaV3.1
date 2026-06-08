<script lang="ts">
	import Radio from './Radio.svelte';

	interface QuestionOption {
		label: string;
		value: string;
	}

	interface Props {
		question: string;
		description: string;
		options?: QuestionOption[];
		selectedOption?: string | null;
		type?: string;
		onchange?: ((detail: { value: string }) => void) | null;
	}

	let {
		question,
		description,
		options = [],
		selectedOption = $bindable(null),
		type = 'radio',
		onchange = null
	}: Props = $props();

	function handleChange(value: string) {
		selectedOption = value;
		onchange?.({ value });
	}
</script>

<div class="flex h-full flex-col gap-4">
	<h2 class="text-md font-bold tracking-wide">{question}</h2>
	<p class="text-sm text-gray-600 italic">{description}</p>

	{#if type === 'radio'}
		<Radio
			{options}
			bind:value={selectedOption as any}
			name={question}
			label={question}
			onChange={(value) => handleChange(value as string)}
		/>
	{:else if type === 'select'}
		<!-- <Select bind:selected={selectedOption} {options} /> -->
		select hu kya
	{/if}
</div>
