<script lang="ts">
	import { formState } from '$lib/state/form.svelte';
	import Company from './Company.svelte';
	import { onMount } from 'svelte';

	interface Props {
		selectedIndex?: number;
		showmodal?: boolean;
		answers?: any;
		modalActiveTab?: string;
	}

	let {
		selectedIndex = $bindable(0),
		showmodal = $bindable(undefined),
		answers = $bindable({}),
		modalActiveTab = undefined
	}: Props = $props();

	// const directorsFilterQuestions = directorsQuestion.directors.slice(1);

	onMount(() => {
		const applicant = formState.applicants[selectedIndex];
		answers = structuredClone($state.snapshot(applicant ?? {}));

		if (answers.companyType === 'One Person Company (OPC)') {
			answers.directorsValidate = true;
		} else {
			answers.directorsValidate = false;
		}
	});
</script>

<div class="">
	<!-- <Company bind:answers {directorsFilterQuestions} bind:selectedIndex bind:showmodal /> -->
	<Company bind:answers bind:selectedIndex bind:showmodal {modalActiveTab} />
</div>
