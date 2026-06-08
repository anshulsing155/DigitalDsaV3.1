<script lang="ts">
	import { isMobile, isNative } from '$lib/stores/device';
	import { CircleCheckBig, CirclePlus, ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { goto } from '$app/navigation';
	import SalariedPerson from '$lib/components/SalariedPerson.svelte';
	import ExistingLoanDetails from '$lib/components/ExistingLoanDetails.svelte';
	import SelfEmploymentOther from '$lib/components/SelfEmploymentOther.svelte';
	import SelfEmploymentProfessional from '$lib/components/SelfEmploymentProfessional.svelte';
	import { onMount } from 'svelte';
	import Company from '$lib/components/Company.svelte';
	import BasicInfoUnsecureLoan from '$lib/components/BasicInfoUnsecureLoan.svelte';
	import { browser } from '$app/environment';

	let isNextEnabled = $state(false);
	let selectedId = $state(0);

	let showModal = $state(false);
	let selectedApplicant = $state<Record<string, unknown> | null>(null);
	let selectedIndex = $state(0);

	function addNewApplicant() {
		if (formState.applicationData.loanName == 'Personal Loan') {
			formState.replaceApplicants([{ applicantType: 'Individual' }]);
			showModal = false;
		} else if (formState.applicationData.loanName == 'Business Loan') {
			formState.replaceApplicants([
				{ applicantType: '' as any, employmentType: 'Self-employed(Other)' }
			]);
			showModal = false;
		} else if (formState.applicationData.loanName == 'Professional Loan') {
			formState.replaceApplicants([
				{ applicantType: 'Individual', employmentType: 'Self-employed(Professional)' }
			]);
			showModal = false;
		}
	}

	onMount(() => {
		if (formState.applicants?.length == 1) {
			if (formState.applicationData.loanName == 'Personal Loan') {
				if (
					formState.applicants[0]?.employmentType == 'Self-employed(Other)' ||
					formState.applicants[0]?.employmentType == 'Self-employed(Professional)'
				) {
					formState.replaceApplicants([{ applicantType: 'Individual' }]);
				}
			} else if (formState.applicationData.loanName == 'Business Loan') {
				if (formState.applicants[0]?.employmentType != 'Self-employed(Other)') {
					formState.replaceApplicants([
						{ applicantType: '' as any, employmentType: 'Self-employed(Other)' }
					]);
				}
			} else if (formState.applicationData.loanName == 'Professional Loan') {
				if (formState.applicants[0]?.employmentType != 'Self-employed(Professional)') {
					formState.replaceApplicants([
						{ applicantType: 'Individual', employmentType: 'Self-employed(Professional)' }
					]);
				}
			}
		} else if (formState.applicants?.length > 1) {
			if (formState.applicationData.loanName == 'Personal Loan') {
				formState.replaceApplicants(
					formState.applicants.filter(
						(item) =>
							item.employmentType == 'Salaried(Government)' ||
							item.employmentType == 'Salaried(Private)'
					)
				);
				showModal = true;
			} else if (formState.applicationData.loanName == 'Business Loan') {
				formState.replaceApplicants(
					formState.applicants.filter((item) => item.employmentType == 'Self-employed(Other)')
				);
				showModal = true;
			} else if (formState.applicationData.loanName == 'Professional Loan') {
				formState.replaceApplicants(
					formState.applicants.filter(
						(item) => item.employmentType == 'Self-employed(Professional)'
					)
				);
				showModal = true;
			}
		} else {
			addNewApplicant();
		}
	});

	function openModal(applicant: Record<string, unknown>, index: number) {
		selectedApplicant = applicant;
		selectedIndex = index;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedApplicant = null;
	}

	function nextButton() {
		const pageIndex = formState.pageIndexObject[0] as any;
		if (pageIndex && pageIndex.currentPageIndex !== undefined) {
			if (formState.applicationData.existingLoan == 'No') {
				pageIndex.currentPageIndex += 1;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			} else if (formState.applicationData.existingLoan == 'Yes') {
				pageIndex.currentPageIndex += 2;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		}
		if (formState.applicationData.loanName == 'Personal Loan') {
			goto('/form/unsecureLoan/personal-Loan');
		} else if (formState.applicationData.loanName == 'Business Loan') {
			goto('/form/unsecureLoan/personal-Loan');
		} else if (formState.applicationData.loanName == 'Professional Loan') {
			goto('/form/unsecureLoan/personal-Loan');
		}
	}

	function backButton() {
		const pageIndex = formState.pageIndexObject[0] as any;
		if (
			pageIndex &&
			pageIndex.currentPageIndex !== undefined &&
			pageIndex.initialPoint !== undefined
		) {
			pageIndex.currentPageIndex = pageIndex.initialPoint - 1;
			formState.replacePageIndexObject([...formState.pageIndexObject]);
		}
		if (formState.applicationData.loanName == 'Personal Loan') {
			goto('/form/unsecureLoan/personal-Loan');
		} else if (formState.applicationData.loanName == 'Business Loan') {
			goto('/form/unsecureLoan/business-Loan');
		} else if (formState.applicationData.loanName == 'Professional Loan') {
			goto('/form/unsecureLoan/Professional-Loan');
		}
	}

	function selectApplicant(index: number) {
		selectedId = index;

		setTimeout(() => {
			formState.replaceApplicants(formState.applicants.filter((_, i) => i === index));
			showModal = false;
		}, 1000);
	}

	function businessLoanSelection(loanType: string) {
		const updated = [...formState.applicants];
		if (loanType === 'Company') {
			updated[0] = { ...updated[0], applicantType: 'Company' };
		} else if (loanType === 'Individual') {
			updated[0] = { ...updated[0], applicantType: 'Individual' };
		}
		formState.replaceApplicants(updated);
		selectedIndex = 0;
		showModal = true;
	}

	$effect(() => {
		if (browser) {
			if (showModal) {
				document.body.classList.add('overflow-hidden');
			} else {
				document.body.classList.remove('overflow-hidden');
			}
		}
	});
</script>

<div
	class="form-container relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center p-2 md:px-6 md:py-8"
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
				<h2 class="titleText">Financial Info</h2>
				{#if !$isMobile && !$isNative}
					<FormLogo />
				{/if}
			</div>

			<!-- Cards -->
			<div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
				{#if formState.applicationData?.loanName != 'Business Loan'}
					{#each formState.applicants as applicant, i}
						<button
							class="w-full cursor-pointer rounded-xl border bg-white p-4 text-left shadow-md transition hover:shadow-lg"
							onclick={() => openModal(applicant, i)}
						>
							<h2 class="text-lg font-semibold">{applicant.fullName}</h2>
							<p class="text-sm text-gray-600">{applicant.applicantType}</p>
						</button>
					{/each}
				{:else}
					<button
						onclick={() => {
							businessLoanSelection('Individual');
						}}
						class={`flex w-full items-center gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200
											${
												formState.applicants[0]?.applicantType === 'Individual'
													? 'border-green-600 bg-green-50 shadow-md'
													: 'border-primary bg-white hover:shadow-md'
											}`}
					>
						<div
							class={`rounded-full border p-2 
												${
													formState.applicants[0]?.applicantType === 'Individual'
														? 'border-green-700 bg-green-600 text-white'
														: 'border-green-200 bg-green-50 text-green-700'
												}`}
						>
							<CircleCheckBig size={20} />
						</div>

						<div class="flex flex-col text-left">
							<p class="text-sm font-semibold">Individual</p>
						</div>
					</button>

					<button
						onclick={() => {
							businessLoanSelection('Company');
						}}
						class={`flex w-full items-center gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200
											${
												formState.applicants[0]?.applicantType === 'Company'
													? 'border-green-600 bg-green-50 shadow-md'
													: 'border-primary bg-white hover:shadow-md'
											}`}
					>
						<div
							class={`rounded-full border p-2 
												${
													formState.applicants[0]?.applicantType === 'Company'
														? 'border-green-700 bg-green-600 text-white'
														: 'border-green-200 bg-green-50 text-green-700'
												}`}
						>
							<CircleCheckBig size={20} />
						</div>

						<div class="flex flex-col text-left">
							<p class="text-sm font-semibold">Company</p>
						</div>
					</button>
				{/if}
			</div>

			<!-- Modal -->

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

	{#if showModal}
		{#if formState.applicants.length > 1}
			<div class="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-white">
				<div
					class="relative max-h-[80vh] w-full max-w-[1200px] overflow-y-auto rounded-xl border
							border-stone-300 bg-white p-6 shadow-lg"
				>
					<p class="labelText block px-2 py-1 text-black">
						Select any one applicant that you have already filled out.
					</p>

					<div
						class={`grid ${formState.applicants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} mt-2 gap-4`}
					>
						{#each formState.applicants as val, i}
							<button
								onclick={() => selectApplicant(i)}
								class={`flex w-full items-center gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200
											${
												selectedId === i
													? 'border-green-600 bg-green-50 shadow-md'
													: 'border-primary bg-white hover:shadow-md'
											}`}
							>
								<div
									class={`rounded-full border p-2 
												${
													selectedId === i
														? 'border-green-700 bg-green-600 text-white'
														: 'border-green-200 bg-green-50 text-green-700'
												}`}
								>
									<CircleCheckBig size={20} />
								</div>

								<div class="flex flex-col text-left">
									<p class="text-sm font-semibold">{val.fullName}</p>
									<p class="text-xs text-gray-500">{val.employmentType}</p>
									<p class="text-xs text-gray-500">Age: {val.applicantAge}</p>
								</div>
							</button>
						{/each}
					</div>

					<div class="mt-4 flex justify-end">
						<button
							onclick={() => {
								addNewApplicant();
							}}
							class="inline-flex items-center gap-2 rounded-full border border-blue-400/70
										bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700
										transition hover:border-blue-500 hover:bg-blue-100
										hover:shadow-sm focus:ring-2 focus:ring-blue-400/70 focus:ring-offset-2
										focus:outline-none"
						>
							<CirclePlus size={18} />
							<span>Add New Data</span>
						</button>
					</div>
				</div>
			</div>
		{:else if formState.applicants.length == 1}
			<div
				class="fixed inset-0 z-50 flex w-full items-center justify-center overflow-y-auto bg-black/70"
			>
				<div
					class="relative mx-2 flex h-fit max-h-screen w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary bg-white px-2 py-4 shadow-lg sm:mx-6 md:p-4"
				>
					<!-- Close Button -->
					<div
						class="absolute top-0 left-1/2 z-50 flex w-full max-w-4xl -translate-x-1/2
               items-center justify-between border-b border-gray-400 bg-white
               p-2 shadow-md md:px-4 md:py-2"
					>
						<h2
							class="line-clamp-1 text-lg font-semibold text-black uppercase underline decoration-primary underline-offset-4"
						>
							Name: {formState.applicants[selectedIndex]?.fullName}
						</h2>

						<button
							class="h-8 w-8 rounded bg-gray-200 text-sm font-semibold hover:bg-primary hover:text-black md:h-10 md:w-10 md:text-lg"
							onclick={closeModal}
						>
							✕
						</button>
					</div>
					<div class="mt-16 mb-4 overflow-y-auto">
						<BasicInfoUnsecureLoan />
						{#if formState.applicants[selectedIndex]?.employmentType == 'Salaried(Government)'}
							<SalariedPerson bind:selectedIndex />
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Salaried(Private)'}
							<SalariedPerson bind:selectedIndex />
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Self-employed(Other)'}
							{#if formState.applicants[selectedIndex].applicantType == 'Company'}
								<!-- Do NOT bind:answers to formState.applicants — that creates a
							     two-way store↔component coupling that causes
							     effect_update_depth_exceeded.  Company reads from
							     the store on mount and writes back via update(). -->
								<Company />
							{:else}
								<SelfEmploymentOther bind:selectedIndex />
							{/if}
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Self-employed(Professional)'}
							<SelfEmploymentProfessional bind:selectedIndex />
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
	}
</style>
