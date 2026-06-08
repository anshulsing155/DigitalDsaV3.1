<script lang="ts">
	import AboutYou from '$lib/components/onboarding/steps/AboutYou.svelte';
	import YourBusiness from '$lib/components/onboarding/steps/YourBusiness.svelte';
	import WhatBringsYou from '$lib/components/onboarding/steps/WhatBringsYou.svelte';
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	// DSA-only: auto-select role
	if (onboardingState.data.selectedRole !== 'dsa') {
		onboardingState.data.selectedRole = 'dsa' as any;
	}
</script>

{#if onboardingState.activeStep === 0}
	<AboutYou />
{:else if onboardingState.activeStep === 1}
	<YourBusiness />
{:else if onboardingState.activeStep === 2}
	<WhatBringsYou />
{/if}
