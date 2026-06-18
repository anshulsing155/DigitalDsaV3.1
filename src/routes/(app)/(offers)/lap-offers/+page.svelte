<script lang="ts">
	import { onMount } from 'svelte';
	import clientLogger from '$lib/utils/clientLogger';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { secureFetch } from '$lib/utils/csrf';
	import type { LoanOffer } from '$lib/types/loanTypes';
	import { fly, slide } from 'svelte/transition';
	import Seo from '$lib/components/Seo.svelte';
	import {
		Ban,
		Building2,
		Calendar,
		ChevronDown,
		ChevronUp,
		CircleCheckBig,
		Funnel,
		IndianRupee,
		MoveUpRight,
		Percent
	} from '$lib/utils/iconRegistry';
	import { clickOutside } from '$lib/utils/clickOutside';
	import { formState } from '$lib/state/form.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { safeLocalStorage } from '$lib/utils/safeStorage';

	let allOffers: { data: LoanOffer[]; applicationData: unknown } = $state({
		data: [],
		applicationData: null
	});
	let filteredOffers: LoanOffer[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	// Filter and sort states
	let sortBy: string = $state('eligibility'); // eligibility, interestRate, emi, loanAmount, bankName
	let selectedFilter: string | null = $state(null);
	let sortOrder: string = $state('asc'); // asc, desc
	let filterByBank: string = $state('');
	let filterByStatus: string = $state('all'); // all, eligible, rejected
	let maxInterestRate: number = $state(15);
	let minLoanAmount: number = $state(0);
	let maxLoanAmount: number = $state(10000000);

	let showDropdown = $state(false);

	const filters = [
		{ label: 'Lowest Interest Rate', value: 'interestRate' },
		{ label: 'Highest Loan Amount', value: 'loanAmount' },
		{ label: 'Lowest EMI', value: 'emi' },
		{ label: 'Bank Name A–Z', value: 'bankName' }
	];
	// Apply filters and sorting
	function applyFiltersAndSort(): void {
		let filtered: LoanOffer[] = Array.isArray(allOffers?.data) ? [...allOffers.data] : [];
		// Bank filter (only if selected)
		if (filterByBank) {
			filtered = filtered.filter(
				(offer: LoanOffer) =>
					offer.bankName === filterByBank &&
					(!offer.error?.status || offer.error.status !== 'Rejected')
			);
		}

		// Status filter
		if (filterByStatus !== 'all') {
			if (filterByStatus === 'eligible') {
				filtered = filtered.filter(
					(offer: LoanOffer) => !offer.error?.status || offer.error.status !== 'Rejected'
				);
			} else if (filterByStatus === 'rejected') {
				filtered = filtered.filter((offer: LoanOffer) => offer.error?.status === 'Rejected');
			}
		}

		// Interest rate filter
		filtered = filtered.filter((offer: LoanOffer) => (offer.annualRate || 0) <= maxInterestRate);

		// Loan amount filter
		filtered = filtered.filter((offer: LoanOffer) => {
			const amount = offer.SanctionAmount || 0;
			return amount >= minLoanAmount && amount <= maxLoanAmount;
		});

		// Sorting
		filtered.sort((a: LoanOffer, b: LoanOffer) => {
			let comparison = 0;

			switch (sortBy) {
				case 'eligibility':
					// Eligible offers first
					const aEligible = !a.error?.status || a.error.status !== 'Rejected';
					const bEligible = !b.error?.status || b.error.status !== 'Rejected';
					if (aEligible && !bEligible) comparison = -1;
					else if (!aEligible && bEligible) comparison = 1;
					else comparison = (b.SanctionAmount || 0) - (a.SanctionAmount || 0);
					break;

				case 'interestRate':
					comparison = (a.annualRate || 0) - (b.annualRate || 0);
					break;

				case 'emi':
					comparison = (a.emi || 0) - (b.emi || 0);
					break;

				case 'loanAmount':
					comparison = (a.SanctionAmount || 0) - (b.SanctionAmount || 0);
					break;

				case 'bankName':
					comparison = (a.bankName || '').localeCompare(b.bankName || '');
					break;

				default:
					comparison = 0;
			}

			return sortOrder === 'desc' ? -comparison : comparison;
		});

		filteredOffers = filtered;
	}

	const bankMap = {
		'State Bank of India Loan Against Property - Balance Transfer With TopUp':
			'SBI LAP - BT with Topup',
		'State Bank of India Loan Against Property - Drop-line Overdraft Balance Transfer with TopUp':
			'SBI LAP - DOD BT with Topup',
		'HDFC Bank Loan Against Property - Balance Transfer With TopUp': 'HDFC LAP - BT with Topup',
		'HDFC Bank Loan Against Property - Drop-line Overdraft Balance Transfer with TopUp':
			'HDFC LAP - DOD BT with Topup',
		'ICICI Bank Loan Against Property - Balance Transfer With TopUp': 'ICICI LAP - BT with Topup',
		'Axis Bank Loan Against Property - Balance Transfer With TopUp': 'Axis LAP - BT with Topup',
		'Axis Bank Loan Against Property - Drop-line Overdraft Balance Transfer with TopUp':
			'Axis LAP - DOD BT with Topup',
		'Punjab National Bank': 'PNB',
		'ICICI Bank Loan Against Property - Drop-line Overdraft Balance Transfer with TopUp':
			'ICICI LAP - DOD BT with Topup'
	};

	function formatProductName(productName: string): string {
		for (const [fullName, shortName] of Object.entries(bankMap)) {
			if (productName.startsWith(fullName)) {
				return productName.replace(fullName, shortName);
			}
		}
		return productName; // fallback if no match
	}

	// Apply filter selection
	function applyFilter(optionValue: string): void {
		selectedFilter = optionValue;
		sortBy = optionValue;

		if (optionValue === 'loanAmount') {
			sortOrder = 'desc';
		} else if (optionValue === 'interestRate' || optionValue === 'emi') {
			sortOrder = 'asc';
		} else if (optionValue === 'bankName') {
			sortOrder = 'asc';
		}

		showDropdown = false;
		applyFiltersAndSort();
	}

	const getUserData = async (email: string) => {
		const res = await secureFetch('/api/check-user', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});

		const data = await res.json();
		if (data.success) {
			return data.user;
		} else {
			return null;
		}
	};

	// Run filters whenever state changes
	$effect(() => {
		applyFiltersAndSort();
	});

	function handleApply(offerIndex: number): void {
		const offer = filteredOffers[offerIndex];

		// Use a unique property instead of reference equality
		const originalIndex = allOffers.data.findIndex(
			(o: LoanOffer) =>
				o.productName === offer.productName &&
				o.bankName === offer.bankName &&
				o.SanctionAmount === offer.SanctionAmount
		);

		if (originalIndex === -1) {
			clientLogger.error({ offer }, 'Offer not found in allOffers.data');
			return;
		}

		safeLocalStorage.setItem(
			'selectedLAPOffer',
			JSON.stringify({
				offer,
				applicationData: formState.applicationData,
				currentUser: authState.user ?? {}
			})
		);

		goto(`/lap-loan-application?offer=${originalIndex}`);
	}

	onMount(async () => {
		// const storedOffers = getStoredLAPOffers();
		const storedOffers = safeLocalStorage.getItem('LapOffers');
		if (storedOffers) {
			try {
				allOffers = JSON.parse(storedOffers);
				formState.replaceApplicationData(allOffers.applicationData as any);
				applyFiltersAndSort();
			} catch (_parseError) {
				error = 'Failed to load offers. Please go back and re-evaluate.';
			}
		} else {
			error = 'No loan offers found. Please complete a loan application first.';
		}

		loading = false;
	});

	function formatCurrency(amount: number | undefined): string {
		if (amount == null) return 'N/A';
		return amount.toLocaleString('en-IN');
	}

	function isEligible(offer: LoanOffer): boolean {
		return !offer.error?.status || offer.error.status !== 'Rejected';
	}

	function getStatusColor(status: string | undefined): string {
		switch (status?.toLowerCase()) {
			case 'approved':
				return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800';
			case 'rejected':
				return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
			case 'pending':
				return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800';
			default:
				return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
		}
	}

	$effect(() => {
		if (allOffers?.data?.length) {
			// filter valid offers
			filteredOffers = allOffers.data.filter(
				(o: LoanOffer) =>
					Number(o.SanctionAmount) > 0 || (Number(o.SanctionAmount) >= 0 && o.error?.status)
			);

			// log invalid offers
			const invalidOffers = allOffers.data.filter((o: LoanOffer) => Number(o.SanctionAmount) <= 0);

			// top up only offers
			if (
				formState.applicationData.loanType == 'Top-up Only' &&
				formState.applicationData?.q4_bankName &&
				filteredOffers.length > 0
			) {
				const targetBank = String(formState.applicationData.q4_bankName).trim().toLowerCase();

				const idx = filteredOffers.findIndex(
					(o: LoanOffer) => o.bankName && String(o.bankName).trim().toLowerCase() === targetBank
				);

				if (idx > 0) {
					const copy = [...filteredOffers];
					const [match] = copy.splice(idx, 1);
					copy.unshift(match);
					filteredOffers = copy;
				}
			}
		}
	});

	$effect(() => {
		formState.legacyBackHistory.pageName = 'OfferPage';
	});

	function backFunction(): void {
		formState.legacyBackHistory.pageName = 'OfferPage';

		goto(ROUTES.FORM.LAP);
	}
</script>

<Seo
	title="LAP Offers | DigitalDSA"
	description="View your personalized Loan Against Property offers from multiple banks with competitive interest rates and flexible terms."
/>

<div class="min-h-screen bg-[var(--form-bg-alt)]">
	<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="border-b border-grayTwo bg-[var(--form-bg-card)] shadow-sm">
			<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				<div class="grid items-start gap-4 sm:grid-cols-3">
					<div class="sm:col-span-2">
						<h1 class="text-subTitleText text-primaryText">Loan Against Property Offers</h1>
						<p class="text-regularText text-[var(--form-text-secondary)]">
							Compare offers from multiple banks and choose the best one for you
						</p>
					</div>
					<div class="sm:justify-self-end">
						<button
							onclick={backFunction}
							class="buttonText w-full cursor-pointer rounded-lg border border-primary bg-primary/5 px-4 py-2 text-primaryText transition-colors hover:bg-primary/10 sm:w-auto"
						>
							Get New Offers
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Offers  -->
		<div class="mx-auto flex flex-col gap-4 py-6">
			<div class="relative flex justify-between bg-[var(--form-bg-card)] px-4 py-6 sm:items-center">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<h2 class="buttonText">Approved Offers</h2>
					<div>
						<span
							class="smallText rounded-full border border-primary bg-primary/5 px-2 py-1 text-primaryText"
						>
							{`${filteredOffers.length} Available`}
						</span>
					</div>
				</div>

				<div class="relative" use:clickOutside={() => (showDropdown = false)}>
					<button
						class="buttonText flex cursor-pointer items-center gap-1 rounded-md border-primary py-2 transition-colors sm:px-6 md:border md:bg-primary/5 md:text-primaryText md:hover:bg-primary/10"
						onclick={() => (showDropdown = !showDropdown)}
					>
						<Funnel size={16} />
						{selectedFilter ? filters.find((f) => f.value === selectedFilter)?.label : 'Filter'}
					</button>

					{#if showDropdown}
						<div
							class="absolute right-0 z-10 mt-2 w-48 rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-lg"
							in:fly={{ y: -12, opacity: 0, duration: 160 }}
							out:fly={{ y: 12, opacity: 0, duration: 160 }}
						>
							<div
								class="absolute -top-1 right-4 h-3 w-3 rotate-45 border-t border-l border-[var(--form-border)] bg-[var(--form-bg-card)]"
							></div>

							{#each filters as option}
								<button
									class="smallText block w-full px-4 py-2 text-left hover:bg-[var(--form-bg-alt)]"
									onclick={() => applyFilter(option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			{#if loading}
				<div
					class="flex h-64 items-center justify-center"
					role="status"
					aria-label="Loading offers..."
				>
					<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
					<span class="sr-only">Loading offers...</span>
				</div>
			{:else if error}
				<div class="py-12 text-center">
					<p class="text-[var(--form-text-secondary)]">{error}</p>
					<button
						onclick={() => window.history.back()}
						class="mt-4 rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:opacity-90"
						>Go Back</button
					>
				</div>
			{:else if allOffers.data.length === 0 || filteredOffers.length == 0}
				<div class="py-12 text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--form-bg-alt)]"
					>
						<svg
							class="h-8 w-8 text-[var(--form-text-secondary)]"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							></path>
						</svg>
					</div>
					<h3 class="text-subTitleText mb-2 text-primaryText">No Offers Found</h3>
					<p class="smallText mb-6 text-[var(--form-text-secondary)]">
						Complete the LAP form to get personalized offers
					</p>
					<button
						onclick={() => goto(ROUTES.FORM.LAP)}
						class="btnText cursor-pointer rounded-md bg-primary/5 px-6 py-3 text-primaryText transition-colors hover:bg-primary/10"
					>
						Get Loan Against Property Offers
					</button>
				</div>
			{:else}
				<div class="space-y-4 sm:space-y-6">
					{#each filteredOffers as offer, index}
						<div
							class="{isEligible(offer)
								? 'bg-[var(--form-bg-card)] shadow-sm'
								: 'bg-[var(--form-bg-alt)]'} "
						>
							<div class="flex flex-col p-4">
								<div class="mb-6 flex flex-row items-center justify-between gap-3">
									<div class="flex flex-nowrap items-center gap-3 sm:items-center">
										<div
											class="h-10 w-10 sm:h-12 sm:w-12 {isEligible(offer)
												? 'bg-primary/10'
												: 'bg-error/15'} flex items-center justify-center rounded-lg"
										>
											{#if isEligible(offer)}
												<Building2 class="text-primaryText" size={20} />
											{:else}
												<Building2 class="text-red-900 dark:text-red-400" size={20} />
											{/if}
										</div>
										<div>
											<h3
												class="text-labelText {isEligible(offer)
													? 'text-primaryText'
													: 'text-[var(--form-text-secondary)]'}"
											>
												{offer.bankName || `Bank ${index + 1}`}
											</h3>
											<p
												class="smallText {isEligible(offer)
													? 'text-[var(--form-text-secondary)]'
													: 'text-[var(--form-text-secondary)]'}"
											>
												<!-- Personal Loan Offer -->
												{formatProductName(offer.productName || '')}
											</p>
										</div>
									</div>
									{#if offer.error?.status}
										<span
											class="smallText inline-flex items-center rounded-full px-2.5 py-0.5 {getStatusColor(
												offer.error.status
											)}"
										>
											{offer.error.status}
										</span>
									{:else}
										<div class="flex flex-col gap-1">
											<div
												class="smallText inline-flex items-center gap-2 rounded-full border border-primary bg-primary/5 px-2.5 py-0.5 text-primaryText"
											>
												<CircleCheckBig strokeWidth={3} size={15} /> Eligible
											</div>
										</div>
									{/if}
								</div>

								<!-- Key Metrics Grid -->
								{#if (offer.topDetails && offer.topDetails?.topUpAmount > 0 && formState.applicationData.loanType == 'Balance Transfer With Top-up') || formState.applicationData.loanType == 'New Loan'}
									<div class="flex flex-col gap-2">
										<h2
											class="text-labelText {isEligible(offer)
												? 'font-titleBold text-primaryText underline decoration-primary underline-offset-4'
												: 'text-[var(--form-text-secondary)]'}"
										>
											Loan Details
										</h2>
										<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
											<div class="text-start">
												<div
													class="smallText uppercase {isEligible(offer)
														? 'text-primaryText'
														: 'text-[var(--form-text-secondary)]'} mt-1"
												>
													Sanction Amount
												</div>
												<div
													class="text-sectionHeadingText {isEligible(offer)
														? 'text-primary'
														: 'text-[var(--form-text-secondary)]'}"
												>
													<!-- {formatCurrency(offer.SanctionAmount)} -->
													<IndianRupee size={16} class="inline-block" />
													{formatCurrency(Math.round(offer.SanctionAmount / 10) * 10)}
												</div>
											</div>
											{#if (offer.topDetails?.topUpAmount == 0 && formState.applicationData.loanType == 'Balance Transfer With Top-up') || formState.applicationData.loanType == 'New Loan'}
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Monthly EMI
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<IndianRupee size={16} class="inline-block" />
														{formatCurrency(Math.round(offer.emi))}
													</div>
												</div>
												<div class="text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Tenure
													</div>
													<div
														class="text-sectionHeadingText flex items-center gap-1 {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Calendar size={16} class="inline-block" />{offer.tenure || 'N/A'}Y
													</div>
												</div>
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Interest Rate
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Percent size={16} class="mr-2 inline-block" />{Number(
															offer.annualRate
														).toFixed(2) || 'N/A'}%
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- principal outstanding details -->
								{#if offer.principalOutstandingDetail && (formState.applicationData.loanType == 'Balance Transfer Only' || formState.applicationData.loanType == 'Balance Transfer With Top-up' || formState.applicationData.loanType == 'Top-up Only')}
									<div class="flex flex-col gap-2">
										<h2
											class="text-labelText {isEligible(offer)
												? 'font-titleBold text-primaryText underline decoration-primary underline-offset-4'
												: 'text-[var(--form-text-secondary)]'}"
										>
											Outstanding Details
										</h2>
										<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
											{#if offer.principalOutstandingDetail.principalOutstanding}
												<div class="text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Outstanding Amount
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-primary'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<IndianRupee size={16} class="inline-block" />{formatCurrency(
															Math.round(
																offer.principalOutstandingDetail.principalOutstanding / 10
															) * 10
														)}
													</div>
												</div>
											{/if}

											{#if offer.principalOutstandingDetail.emiOfPrincipalOutstanding}
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Monthly EMI
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<IndianRupee size={16} class="inline-block" />
														{formatCurrency(
															Math.round(offer.principalOutstandingDetail.emiOfPrincipalOutstanding)
														)}
													</div>
												</div>
											{/if}

											{#if offer.principalOutstandingDetail.tenure}
												<div class="text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Tenure
													</div>
													<div
														class="text-sectionHeadingText flex items-center gap-1 {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Calendar size={16} class="inline-block" />{offer
															.principalOutstandingDetail.tenure || 'N/A'} Y
													</div>
												</div>
											{/if}

											{#if offer.principalOutstandingDetail.annualRate}
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Interest Rate
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Percent
															size={16}
															class="mr-2 inline-block"
														/>{offer.principalOutstandingDetail.annualRate.toFixed(2) || 'N/A'}%
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- top up details -->
								{#if offer.topDetails && offer.topDetails.topUpAmount > 0 && (formState.applicationData.loanType == 'Balance Transfer With Top-up' || formState.applicationData.loanType == 'Top-up Only')}
									<div class="flex flex-col gap-2">
										<h2
											class="text-labelText {isEligible(offer)
												? 'font-titleBold text-primaryText underline decoration-primary underline-offset-4'
												: 'text-[var(--form-text-secondary)]'}"
										>
											Top Up Details
										</h2>
										<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
											{#if offer.topDetails.topUpAmount}
												<div class="text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Top up amount
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-primary'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<IndianRupee size={16} class="inline-block" />{formatCurrency(
															offer.topDetails.topUpAmount
														)}
													</div>
												</div>
											{/if}
											{#if offer.topDetails.emiOfTopUp}
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Monthly EMI
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<IndianRupee size={16} class="inline-block" />
														{formatCurrency(Math.round(offer.topDetails.emiOfTopUp))}
													</div>
												</div>
											{/if}
											{#if offer.topDetails.tenure}
												<div class="text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Tenure
													</div>
													<div
														class="text-sectionHeadingText flex items-center gap-1 {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Calendar size={16} class="inline-block" />{offer.topDetails.tenure ||
															'N/A'} Y
													</div>
												</div>
											{/if}
											{#if offer.topDetails.annualRate}
												<div class="text-end md:text-start">
													<div
														class="smallText uppercase {isEligible(offer)
															? 'text-primaryText'
															: 'text-[var(--form-text-secondary)]'} mt-1"
													>
														Interest Rate
													</div>
													<div
														class="text-sectionHeadingText {isEligible(offer)
															? 'text-[var(--form-text)]'
															: 'text-[var(--form-text-secondary)]'}"
													>
														<Percent size={16} class="mr-2 inline-block" />{offer.topDetails
															.annualRate || 'N/A'}%
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Error Messages -->
								{#if offer.error?.message}
									<div
										class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4 dark:border-red-800 dark:bg-red-950/40"
									>
										<div class="flex items-start gap-3">
											<svg
												class="mt-0.5 h-5 w-5 flex-shrink-0 text-error"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
												></path>
											</svg>
											<div>
												<h4 class="text-regularText text-error">Application Status</h4>
												<p class="smallText mt-1 text-error">{offer.error.message}</p>
											</div>
										</div>
									</div>
								{/if}
								{#if offer.suggestions && offer.suggestions.length > 0}
									<div
										class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4 dark:border-yellow-800 dark:bg-yellow-950/40"
									>
										<h4 class="text-labelText mb-2 text-yellow-800 dark:text-yellow-400">
											Suggestions for Better Approval
										</h4>
										<ul class="text-regularText space-y-1 text-yellow-700 dark:text-yellow-400">
											{#each offer.suggestions as suggestion}
												<li class="flex items-start gap-2">
													<span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600"
													></span>
													<span>{suggestion}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								<!-- Rejection Reasons (for rejected offers) -->
								{#if !isEligible(offer) && offer.error?.reasons && offer.error.reasons.length > 0}
									<div
										class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40"
									>
										<h4 class="text-labelText mb-2 flex items-center text-error">
											<svg
												class="mr-2 h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
												></path>
											</svg>
											Rejection Reasons
										</h4>
										<ul class="space-y-1">
											{#each offer.error.reasons as reason}
												<li class="flex items-start text-sm text-[var(--color-error)] dark:text-red-400">
													<span class="mt-2 mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400"
													></span>
													{reason}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Action Buttons -->
								<div class="flex flex-col gap-3 sm:flex-row">
									<button
										onclick={() => handleApply(index)}
										disabled={!isEligible(offer)}
										class="buttonText flex-1 cursor-pointer rounded-md px-4 py-2 text-center transition-colors
										{isEligible(offer)
											? 'bg-primary text-black hover:bg-primary/90'
											: 'cursor-not-allowed bg-[var(--form-bg-alt)] text-[var(--form-text-secondary)]'}"
									>
										{#if isEligible(offer)}
											<span class="flex items-center justify-center gap-2">
												Unlock Offer <MoveUpRight size={16} />
											</span>
										{:else}
											<span class="flex items-center justify-center gap-2">
												Not Eligible <Ban size={16} />
											</span>
										{/if}
									</button>

									{#if offer.suggestionMsg?.length > 0 || offer.requiredDocuments?.length > 0 || Object.keys(offer.feature || {}).length > 0}
										<button
											class="buttonText flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 transition-colors
       										 {isEligible(offer)
												? 'border-[var(--form-border)] text-[var(--form-text-secondary)] hover:bg-[var(--form-bg-alt)]'
												: 'border-[var(--form-border)] text-[var(--form-text-secondary)] hover:bg-[var(--form-bg-alt)]'}"
											onclick={() => (offer.showDetails = !offer.showDetails)}
										>
											{#if offer.showDetails}
												<span class="flex">Hide Details <ChevronUp /></span>
											{:else}
												<span class="flex">Show Details <ChevronDown /></span>
											{/if}
										</button>
									{/if}
								</div>
							</div>
							<!-- details page  -->
							{#if offer.suggestionMsg?.length > 0 || offer.requiredDocuments?.length > 0 || Object.keys(offer.feature || {}).length > 0}
								{#if offer.showDetails}
									<div class="flex flex-col bg-primary/10 p-4" transition:slide>
										<div class="grid gap-4 sm:grid-cols-2" id={'details-' + index}>
											<div>
												{#if offer.suggestionMsg?.length > 0}
													<div class="mt-2">
														<h4 class="text-labelText text-primaryText">Suggestions</h4>
														<ul class="list-disc space-y-1 pl-5">
															{#each offer.suggestionMsg as suggestion}
																<li class="smallText text-grayOne">{suggestion}</li>
															{/each}
														</ul>
													</div>
												{/if}
												{#if offer.loanCharges && offer.loanCharges?.length > 0}
													<div class="mt-2">
														<h4 class="text-labelText text-primaryText">Loan Charges</h4>
														<ul class="list-disc space-y-1 pl-5">
															{#each offer.loanCharges as charge}
																<li class="smallText text-grayOne">{charge}</li>
															{/each}
														</ul>
													</div>
												{/if}
												{#if offer.requiredDocuments && offer.requiredDocuments?.length == 0}
													<div class="mt-2">
														<h4 class="text-labelText text-primaryText">Required Documents</h4>
														<ul class="list-disc space-y-1 pl-5">
															{#each offer.requiredDocuments as docs}
																<li class="smallText text-grayOne">{docs}</li>
															{/each}
														</ul>
													</div>
												{:else}
													<div class="mt-2">
														<h4 class="text-labelText text-primaryText">Required Documents</h4>
														<ul class="list-disc space-y-1 pl-5">
															{#each offer.requiredDocuments as docs}
																{#each (docs as any).docs as doc}
																	<li class="smallText text-grayOne">{doc}</li>
																{/each}

																{#each (docs as any).property as property}
																	<li class="smallText text-grayOne">{property}</li>
																{/each}
															{/each}
														</ul>
													</div>
												{/if}
											</div>

											<div>
												{#if offer.feature && Object.keys(offer.feature).length > 0}
													<div class="flex flex-col gap-2">
														<h4 class="text-labelText text-primaryText underline underline-offset-4">
															Features:
														</h4>
														{#each Object.entries(offer.feature) as [section, items]}
															<div>
																<h4 class="text-labelText text-primaryText">
																	{section}
																</h4>
																<ul class="list-disc space-y-1 pl-5">
																	{#each items as item}
																		<li class="smallText text-grayOne">
																			{item}
																		</li>
																	{/each}
																</ul>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom animations */
	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Smooth transitions */
	* {
		transition: all 0.2s ease-in-out;
	}

	/* Mobile-first responsive utilities */
	@media (max-width: 640px) {
		.grid-cols-2 > * {
			min-width: 0;
		}
	}
</style>
