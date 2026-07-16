<script lang="ts">
	import TextField from '$lib/components/TextField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		question: any;
		value?: string | number;
		onInput: (val: any) => void;
		options?: { label: string; value: string }[];
	}

	let { question, value = $bindable(undefined), onInput, options = [] }: Props = $props();

	const componentMap: Record<string, any> = {
		text: TextField as unknown as any,
		select: SelectField as unknown as any,
		radio: RadioField as unknown as any
	};

	let SelectedComponent = $derived(componentMap[question.type] || null);
</script>

{#if SelectedComponent}
	{@const Component = SelectedComponent}
	<Component
		id={question.id}
		label={question.question}
		description={question.description}
		{value}
		placeholder={question.uiMeta?.placeholder}
		icon={question.uiMeta?.icon}
		{options}
		onChange={(e: any) => onInput(e.detail ?? e)}
		onInput={(e: any) => onInput(e.detail ?? e)}
		textFieldClass={question.textFieldClass}
		selectClass={question.selectClass}
		radioClass={question.radioClass}
	/>
{/if}
