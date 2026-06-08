<script lang="ts">
	import { isMobile } from '$lib/stores/device';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import { isNative } from '$lib/stores/device';
	import AddApplicant from '$lib/components/AddApplicant.svelte';
	import AgreeModal from '$lib/components/_archive/AgreeModal.svelte';
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import { ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';

	import { goto } from '$app/navigation';
	import RelationTable from '$lib/components/RelationTable.svelte';

	let isNextEnabled = $state(false);

	function backButton(): void {
		const pageIndex = formState.pageIndexObject[0] as any;
		if (formState.applicationData.loanName == 'Home Loan') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined && pageIndex.pageIndexingData) {
				if (formState.applicationData.LoanType != 'New Loan') {
					pageIndex.currentPageIndex = 1;
				} else {
					const index = pageIndex.pageIndexingData.indexOf('tellUs_homeLoan');

					pageIndex.currentPageIndex = index - 1;
				}

				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
			goto('/form/home-Loan');
		} else if (formState.applicationData.loanName == 'Loan Against Property') {
			if (
				pageIndex &&
				pageIndex.currentPageIndex !== undefined &&
				pageIndex.initialPoint !== undefined
			) {
				pageIndex.currentPageIndex = pageIndex.initialPoint - 1;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
			goto('/form/Lap');
		} else if (formState.applicationData.loanName == 'Plot Loan') {
			if (
				pageIndex &&
				pageIndex.currentPageIndex !== undefined &&
				pageIndex.initialPoint !== undefined
			) {
				pageIndex.currentPageIndex = pageIndex.initialPoint - 1;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
			goto('/form/plot-Loan');
		}
	}

	function nextButton(): void {
		const pageIndex = formState.pageIndexObject[0] as any;

		if (formState.applicationData.loanName == 'Home Loan') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined) {
				pageIndex.currentPageIndex += 2;

				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		} else if (formState.applicationData.loanName == 'Loan Against Property') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined) {
				pageIndex.currentPageIndex += 3;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		} else if (formState.applicationData.loanName == 'Plot Loan') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined) {
				pageIndex.currentPageIndex += 3;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		}

		let applicantType = formState.applicants.filter((val) => val.applicantType == 'Individual');

		if (applicantType.length > 1) {
			goto('/applicantForm/relationShip');
		} else {
			goto('/applicantForm/incomePage');
		}
	}
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
				<h2 class="titleText">Applicant Type</h2>
				{#if !$isMobile && !$isNative}
					<FormLogo />
				{/if}
			</div>
			<div>
				<AddApplicant
					bind:isNextEnabled
					label="How many applicants will be included in this loan application?"
					title="Add Applicant"
				/>
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
							backButton();
						}}
					/>

					<NavigationButton
						btnName="Next"
						iconPosition="right"
						disabled={!isNextEnabled}
						icon={ChevronRight}
						btnClass="gold-gradient text-black font-titleMedium buttonText"
						onClick={() => {
							nextButton();
						}}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<AgreeModal />

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
		/* user-select: none; */
	}
</style>
