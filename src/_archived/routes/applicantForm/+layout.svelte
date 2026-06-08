<script lang="ts">
	import { onMount } from 'svelte';
	import { applicationData } from '$lib/stores/applicationData';
	import { saveFormToStorage } from '$lib/storage/formPersistence';
	import InfoModal from '$lib/components/InfoModal.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import MonthYearModal from '$lib/components/MonthYearModal.svelte';
	import { isDateAreaOpen, isDateAreaOpenContext } from '$lib/stores/modal';

	export function initAutoSave() {
		onMount(() => {
			const unsubscribe = applicationData.subscribe((data) => {
				saveFormToStorage(data);
			});
			return () => unsubscribe();
		});
	}
</script>

<Seo
	title="Get Started with DigitalDSA - Your Trusted Loan Partner"
	description="Compare for loans with DigitalDSA. Fast, secure, and hassle-free loan applications tailored to your needs."
/>

<slot />
<InfoModal />

{#if $isDateAreaOpen}
	<MonthYearModal
		minYear={$isDateAreaOpenContext.minYear}
		introduceMonthIndia={$isDateAreaOpenContext.introduceMonthIndia}
	/>
{/if}
