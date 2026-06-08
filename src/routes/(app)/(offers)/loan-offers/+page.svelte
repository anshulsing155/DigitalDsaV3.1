<script lang="ts">
	import { onMount } from 'svelte';
	import clientLogger from '$lib/utils/clientLogger';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { safeLocalStorage } from '$lib/utils/safeStorage';
	import LoanOfferCard from '$lib/components/LoanOfferCard.svelte';
	import type { LoanOffer } from '$lib/types/loanTypes';

	// Sample data structure based on the API response you provided
	let loanOffers = $state<LoanOffer[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Get loan offers data from URL params or localStorage
	onMount(() => {
		try {
			// Try to get data from URL params first
			const offersParam = $page.url.searchParams.get('offers');
			if (offersParam) {
				loanOffers = JSON.parse(decodeURIComponent(offersParam));
			} else {
				// Fallback to localStorage
				const storedOffers = safeLocalStorage.getItem('loanOffers');
				if (storedOffers) {
					loanOffers = JSON.parse(storedOffers);
				} else {
					// If no data found, redirect back to form
					goto(ROUTES.FORM.HOW_CAN_WE_HELP);
					return;
				}
			}
			loading = false;
		} catch (err) {
			clientLogger.error({ err }, 'Error loading loan offers:');
			error = 'Failed to load loan offers. Please try again.';
			loading = false;
		}
	});

	function handleApplyLoan(offer: LoanOffer): void {
		// Store the selected offer and redirect to application
		safeLocalStorage.setItem('selectedLoanOffer', JSON.stringify(offer));
		// You can redirect to a specific application page or contact form
		goto('/form/loan-application?bank=' + encodeURIComponent(offer.bankName || 'Unknown'));
	}

	function goBack(): void {
		history.back();
	}
</script>

<svelte:head>
	<title>Loan Offers - DigitalDSA</title>
	<meta name="description" content="Compare and apply for the best loan offers from top banks" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Header -->
	<div class="bg-[var(--form-bg-card)] shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-[var(--form-text)]">Loan Offers</h1>
					<p class="mt-2 text-[var(--form-text-secondary)]">
						Compare offers from top banks and choose the best one for you
					</p>
				</div>
				<button
					onclick={goBack}
					class="inline-flex items-center rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-2 text-sm font-medium text-[var(--form-text-secondary)] shadow-sm hover:bg-[var(--form-bg-alt)] focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					<svg class="mr-2 -ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
					></div>
					<p class="mt-4 text-[var(--form-text-secondary)]">Loading your loan offers...</p>
				</div>
			</div>
		{:else if error}
			<div class="rounded-md bg-red-50 p-4 dark:bg-red-950/40">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-regularText text-error">Error</h3>
						<p class="smallText mt-1 text-error">{error}</p>
					</div>
				</div>
			</div>
		{:else if loanOffers.length === 0}
			<div class="py-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-[var(--form-text-muted)]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-[var(--form-text)]">No loan offers available</h3>
				<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
					Please complete the loan application form to see available offers.
				</p>
				<div class="mt-6">
					<button
						onclick={() => goto(ROUTES.FORM.HOW_CAN_WE_HELP)}
						class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						Start Application
					</button>
				</div>
			</div>
		{:else}
			<!-- Loan Offers Grid -->
			<div class="space-y-6">
				{#each loanOffers as offer, index}
					<LoanOfferCard {offer} {index} onApply={() => handleApplyLoan(offer)} />
				{/each}
			</div>

			<!-- Additional Information -->
			<div class="mt-12 rounded-lg bg-[var(--form-bg-card)] p-6 shadow-sm">
				<h2 class="mb-4 text-xl font-semibold text-[var(--form-text)]">Important Information</h2>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<h3 class="mb-2 text-lg font-medium text-[var(--form-text)]">📋 Next Steps</h3>
						<ul class="space-y-2 text-sm text-[var(--form-text-secondary)]">
							<li class="flex items-start">
								<span class="mr-2 text-green-500">✓</span>
								Choose the best offer that suits your needs
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-green-500">✓</span>
								Click "Apply Now" to proceed with the application
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-green-500">✓</span>
								Prepare required documents for verification
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-green-500">✓</span>
								Complete the bank's application process
							</li>
						</ul>
					</div>
					<div>
						<h3 class="mb-2 text-lg font-medium text-[var(--form-text)]">⚠️ Important Notes</h3>
						<ul class="space-y-2 text-sm text-[var(--form-text-secondary)]">
							<li class="flex items-start">
								<span class="mr-2 text-yellow-500">•</span>
								Interest rates and terms are subject to bank approval
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-yellow-500">•</span>
								Final loan amount may vary based on eligibility
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-yellow-500">•</span>
								Processing fees and charges apply as per bank policy
							</li>
							<li class="flex items-start">
								<span class="mr-2 text-yellow-500">•</span>
								Loan approval is subject to credit verification
							</li>
						</ul>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
