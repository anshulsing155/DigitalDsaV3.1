<script lang="ts">
	import { isMobile, isNative } from '$lib/stores/device';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		CircleCheckBig,
		CircleAlert,
		Pencil,
		Trash2
	} from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import { goto } from '$app/navigation';
	import SalariedPerson from '$lib/components/SalariedPerson.svelte';
	import SelfEmploymentOther from '$lib/components/SelfEmploymentOther.svelte';
	import SelfEmploymentProfessional from '$lib/components/SelfEmploymentProfessional.svelte';
	import CompanyDetails from '$lib/components/CompanyDetails.svelte';
	import SelectionCustom from '$lib/components/_archive/SelectionCustom.svelte';
	import { browser } from '$app/environment';

	let showModal = $state(false);
	let selectedIndex = $state(-1);

	let allApplicantsFinancialCompleted = $derived(
		formState.applicants.length > 0 &&
			formState.applicants.every((a) => a.financialCompleted === true)
	);

	let applicantOptions = [
		{ label: 'Government', value: 'Salaried(Government)' },
		{ label: 'Private', value: 'Salaried(Private)' },
		{ label: 'Self Employment(Others)', value: 'Self-employed(Other)' },
		{ label: 'Self Employment(Professional)', value: 'Self-employed(Professional)' }
	];

	function openModal(applicant: Record<string, unknown>, index: number) {
		selectedIndex = index;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function deleteApplicant(index: number) {
		// Close modal if open for this applicant
		if (showModal && selectedIndex === index) {
			showModal = false;
		}
		// Adjust selectedIndex if needed
		if (selectedIndex > index) {
			selectedIndex = selectedIndex - 1;
		}
		formState.replaceApplicants(formState.applicants.filter((_, i) => i !== index));

		// If no applicants left, go back to applicant page
		if (formState.applicants.length === 0) {
			goto('/applicantForm');
		}
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

	function nextButton() {
		if (formState.applicationData.loanName == 'Home Loan') {
			goto('/form/home-Loan');
		} else if (formState.applicationData.loanName == 'Loan Against Property') {
			goto('/form/Lap');
		} else if (formState.applicationData.loanName == 'Plot Loan') {
			goto('/form/plot-Loan');
		}
	}

	function backButton() {
		const pageIndex = formState.pageIndexObject[0] as any;
		if (formState.applicationData.loanName == 'Home Loan') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined) {
				if (formState.applicationData.LoanType != 'New Loan') {
					pageIndex.currentPageIndex = 1;
				} else {
					pageIndex.currentPageIndex -= 2;
				}

				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		} else if (formState.applicationData.loanName == 'Loan Against Property') {
			if (pageIndex && pageIndex.currentPageIndex !== undefined) {
				pageIndex.currentPageIndex = pageIndex.currentPageIndex - 3;
				formState.replacePageIndexObject([...formState.pageIndexObject]);
			}
		}

		if (formState.applicants.length > 1) {
			goto('/applicantForm/relationShip');
		} else {
			goto('/applicantForm');
		}
	}
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

			<!-- Applicant Table -->
			<div class="mt-4 rounded-lg border border-gray-200">
				<table class="w-full text-sm">
					<thead class="border-b border-gray-200 bg-gray-50">
						<tr>
							<th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">#</th>
							<th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">Name</th>
							<th
								class="hidden px-3 py-2.5 text-left text-xs font-semibold text-gray-600 sm:table-cell"
								>Employment</th
							>
							<th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Status</th>
							<th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each formState.applicants as applicant, i}
							<tr class="border-t border-gray-100 transition-colors hover:bg-gray-50">
								<td class="px-3 py-2.5 text-gray-500">{i + 1}</td>
								<td class="px-3 py-2.5">
									<div class="font-medium text-gray-900">
										{applicant.fullName || applicant.companyName || '—'}
									</div>
									<div class="mt-0.5 text-xs text-gray-500 sm:hidden">
										{applicant.applicantType === 'Company'
											? 'Company'
											: (applicant.employmentType ?? 'Not set')}
									</div>
								</td>
								<td class="hidden px-3 py-2.5 text-gray-600 sm:table-cell">
									{applicant.applicantType === 'Company'
										? 'Company'
										: (applicant.employmentType ?? '—')}
								</td>
								<td class="px-3 py-2.5 text-center">
									{#if applicant.financialCompleted}
										<CircleCheckBig size="18" class="inline-block text-green-600" />
									{:else}
										<CircleAlert size="18" class="inline-block text-red-500" />
									{/if}
								</td>
								<td class="px-3 py-2.5">
									<div class="flex items-center justify-center gap-2">
										<button
											onclick={() => openModal(applicant, i)}
											class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
											aria-label="Edit financials"
										>
											<Pencil size="15" />
										</button>
										<button
											onclick={() => deleteApplicant(i)}
											class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
											aria-label="Delete applicant"
										>
											<Trash2 size="15" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Navigation Buttons -->
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
						disabled={!allApplicantsFinancialCompleted}
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

	<!-- Modal -->
	{#if showModal}
		<div
			class="fixed inset-0 z-50 flex w-full items-center justify-center overflow-y-auto bg-black/70"
		>
			<div
				class="relative mx-2 flex h-fit max-h-screen w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary bg-white px-2 py-4 shadow-lg sm:mx-6 md:p-4"
			>
				<div
					class="absolute top-0 left-1/2 z-50 flex w-full max-w-4xl -translate-x-1/2
               items-center justify-between border-b border-gray-400 bg-white
               p-2 shadow-md md:px-4 md:py-2"
				>
					<h2
						class="line-clamp-1 text-lg font-semibold text-black uppercase underline decoration-primary underline-offset-4"
					>
						{formState.applicants[selectedIndex].fullName ||
							formState.applicants[selectedIndex].companyName}
					</h2>

					<button
						class="h-8 w-8 rounded bg-gray-200 text-sm font-semibold hover:bg-primary hover:text-black md:h-10 md:w-10 md:text-lg"
						onclick={closeModal}
					>
						✕
					</button>
				</div>
				<div class="mt-10 mb-4 overflow-y-auto">
					{#if formState.applicants[selectedIndex].applicantType == 'Individual'}
						<div class="mt-6">
							<div class="space-y-1 text-sm text-gray-700">
								<label for="" class="labelText block text-black"> Select employment Type</label>
								<SelectionCustom
									value={formState.applicants[selectedIndex]?.employmentType ?? ''}
									options={applicantOptions}
									onchange={(val) => {
										// mutation — direct bind to $store[i].prop bypasses store
										const updated = [...formState.applicants];
										updated[selectedIndex] = {
											...updated[selectedIndex],
											employmentType: String(val)
										};
										formState.replaceApplicants(updated);
									}}
								/>
							</div>
						</div>

						{#if formState.applicants[selectedIndex]?.employmentType == 'Salaried(Government)'}
							<SalariedPerson bind:showmodal={showModal} bind:selectedIndex />
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Salaried(Private)'}
							<SalariedPerson bind:showmodal={showModal} bind:selectedIndex />
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Self-employed(Other)'}
							<SelfEmploymentOther bind:showmodal={showModal} bind:selectedIndex />
						{:else if formState.applicants[selectedIndex]?.employmentType == 'Self-employed(Professional)'}
							<SelfEmploymentProfessional bind:showmodal={showModal} bind:selectedIndex />
						{/if}
					{:else if formState.applicants[selectedIndex].applicantType == 'Company'}
						<div class="">
							<CompanyDetails bind:showmodal={showModal} bind:selectedIndex />
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
	}
</style>
