<script lang="ts">
	import { isMobile } from '$lib/stores/device';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import { isNative } from '$lib/stores/device';
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import { ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import { goto } from '$app/navigation';
	import RelationTable from '$lib/components/RelationTable.svelte';
	import { applicantsStore } from '$lib/stores/loanData';

	let isNextEnabled = $state(false);
</script>

<div
	class="form-container mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center p-2 md:px-6 md:py-8"
>
	<div class="flex w-full flex-col">
		{#if $isMobile || $isNative}
			<div class="flex w-full items-center justify-center rounded-t-xl bg-black py-2">
				<FormLogo />
			</div>
		{/if}

		<div
			class="inset-1 flex flex-col gap-4 rounded-b-xl border border-gray-200/50 bg-white px-2 py-4 shadow-md backdrop-blur-md md:p-6"
		>
			<div class="flex items-center justify-between">
				<h2 class="titleText">Applicant's Relationship</h2>
				{#if !$isMobile && !$isNative}
					<FormLogo />
				{/if}
			</div>
			<div>
				<RelationTable bind:nextButtonValidate={isNextEnabled} />
			</div>

			<div
				class="flex w-full flex-col justify-between space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4"
			>
				<div class="flex w-full items-end justify-between gap-3">
					<NavigationButton
						btnName="Previous"
						iconPosition="left"
						icon={ChevronLeft}
						btnClass="bg-grayOne hover:bg-grayOne/90 text-white"
						onClick={() => {
							goto('/applicantForm');
						}}
					/>

					<NavigationButton
						btnName="Next"
						iconPosition="right"
						disabled={!isNextEnabled}
						icon={ChevronRight}
						btnClass="gold-gradient text-black font-titleMedium buttonText"
						onClick={() => {
							goto('/applicantForm/incomePage');
						}}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
	}
</style>
