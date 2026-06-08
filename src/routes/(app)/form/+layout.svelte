<script lang="ts">
	import { onMount } from 'svelte';
	import { applicationData } from '$lib/stores/applicationData';
	import { saveFormToStorage } from '$lib/storage/formPersistence';
	import InfoModal from '$lib/components/InfoModal.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import MonthYearModal from '$lib/components/MonthYearModal.svelte';
	import SameCompanyPromptModal from '$lib/components/SameCompanyPromptModal.svelte';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { applicantsStore } from '$lib/stores/loanData';
	import ResetDataButton from '$lib/components/ResetDataButton.svelte';
	import DraftExportButton from '$lib/components/form-wizard/DraftExportButton.svelte';
	import { deviceState } from '$lib/stores/device.svelte';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import PayloadDebugger from '$lib/components/PayloadDebugger.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { dev } from '$app/environment';

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
{#if !deviceState.loader}
	<div class="flex h-screen w-screen items-center justify-center bg-[var(--form-bg-card)]">
		<FormLogo />
	</div>
{:else}
	<slot />
	<InfoModal />
	<ConfirmModal />
	<!-- Same-company prompt — layout-level so its <dialog> top-layer slot is
	     above the per-applicant profile modal. State lives in
	     dialogState.sameCompanyPrompt; IncomePageNew mirrors its local
	     prompt payload into that slot. See SameCompanyPromptModal docstring. -->
	<SameCompanyPromptModal />

	{#if dialogState.isDateAreaOpen}
		<MonthYearModal
			minYear={dialogState.isDateAreaOpenContext.minYear}
			maxYear={dialogState.isDateAreaOpenContext.maxYear}
			introduceMonthIndia={dialogState.isDateAreaOpenContext.introduceMonthIndia}
			futureOnly={dialogState.isDateAreaOpenContext.futureOnly ?? false}
		/>
	{/if}

	<DraftExportButton />
	<!-- <ResetDataButton /> -->

	<!-- Payload Debugger - Only visible in development -->
	<!-- {#if dev}
		<PayloadDebugger position="bottom-right" collapsed={true} />
	{/if} -->
{/if}
