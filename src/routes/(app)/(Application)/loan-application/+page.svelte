<script lang="ts">
	import { onMount } from 'svelte';
	import clientLogger from '$lib/utils/clientLogger';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { LoanOffer } from '$lib/types/loanTypes';

	let selectedOffer: LoanOffer | null = null;
	let loading = true;
	let applicationData = {
		fullName: '',
		email: '',
		phone: '',
		panCard: '',
		aadharCard: '',
		employmentType: '',
		companyName: '',
		monthlyIncome: '',
		loanAmount: '',
		tenure: '',
		purpose: '',
		termsAccepted: false
	};

	let submitting = false;
	let submitted = false;

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const offerIndex = urlParams.get('offer');

		if (offerIndex) {
			const storedOffers = localStorage.getItem('loanOffers');
			if (storedOffers) {
				const offers = JSON.parse(storedOffers);
				selectedOffer = offers[parseInt(offerIndex)];

				// Pre-fill some data from the offer
				if (selectedOffer) {
					applicationData.loanAmount = selectedOffer.SanctionAmount?.toString() || '';
					applicationData.tenure = selectedOffer.tenure?.toString() || '';
				}
			}
		}

		if (!selectedOffer) {
			// Redirect back to loan offers if no valid offer found
			goto('/loan-offers');
			return;
		}

		loading = false;
	});

	async function handleSubmit() {
		if (!applicationData.termsAccepted) {
			alert('Please accept the terms and conditions');
			return;
		}

		submitting = true;

		try {
			// Here you would typically send the application to your backend
			// For now, we'll just simulate a successful submission
			await new Promise((resolve) => setTimeout(resolve, 2000));

			submitted = true;
			submitting = false;

			// You could also redirect to a success page
			// goto('/application-success');
		} catch (error) {
			clientLogger.error({ err: error }, 'Application submission failed:');
			alert('Failed to submit application. Please try again.');
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Loan Application - Digital DSA</title>
	<meta name="description" content="Apply for your personal loan" />
</svelte:head>

<div class="min-h-screen bg-[var(--form-bg-alt)] py-8">
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex h-64 items-center justify-center">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
			</div>
		{:else if submitted}
			<div class="rounded-lg bg-[var(--form-bg-card)] p-8 text-center shadow-lg">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40"
				>
					<svg
						class="h-8 w-8 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				</div>
				<h2 class="mb-4 text-2xl font-bold text-[var(--form-text)]">
					Application Submitted Successfully!
				</h2>
				<p class="mb-6 text-[var(--form-text-secondary)]">
					Thank you for your loan application. Our team will review your application and contact you
					within 24-48 hours.
				</p>
				<div class="space-y-2">
					<button
						onclick={() => goto('/loan-offers')}
						class="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 sm:w-auto"
					>
						View Other Offers
					</button>
					<button
						onclick={() => goto('/')}
						class="ml-0 w-full rounded-lg bg-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-700 sm:ml-4 sm:w-auto"
					>
						Go to Home
					</button>
				</div>
			</div>
		{:else if selectedOffer}
			<div class="overflow-hidden rounded-lg bg-[var(--form-bg-card)] shadow-lg">
				<!-- Header -->
				<div class="bg-blue-600 p-6 text-white">
					<h1 class="text-2xl font-bold">Loan Application</h1>
					<p class="mt-2 text-blue-100">Complete your application for the selected loan offer</p>
				</div>

				<!-- Selected Offer Summary -->
				<div class="border-b bg-[var(--form-bg-alt)] p-6">
					<h3 class="mb-4 text-lg font-semibold text-[var(--form-text)]">Selected Offer Summary</h3>
					<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div class="text-center">
							<div class="text-2xl font-bold text-blue-600">
								₹{selectedOffer.SanctionAmount?.toLocaleString('en-IN') || 'N/A'}
							</div>
							<div class="text-sm text-[var(--form-text-secondary)]">Loan Amount</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-green-600 dark:text-green-400">
								₹{selectedOffer.emi?.toLocaleString('en-IN') || 'N/A'}
							</div>
							<div class="text-sm text-[var(--form-text-secondary)]">Monthly EMI</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-purple-600">
								{selectedOffer.tenure || 'N/A'} Years
							</div>
							<div class="text-sm text-[var(--form-text-secondary)]">Tenure</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-neutral-600">
								{selectedOffer.annualRate || 'N/A'}%
							</div>
							<div class="text-sm text-[var(--form-text-secondary)]">Interest Rate</div>
						</div>
					</div>
				</div>

				<!-- Application Form -->
				<form onsubmit={handleSubmit} class="p-6">
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<!-- Personal Information -->
						<div class="space-y-4">
							<h3 class="mb-4 text-lg font-semibold text-[var(--form-text)]">
								Personal Information
							</h3>

							<div>
								<label
									for="fullName"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Full Name *</label
								>
								<input
									id="fullName"
									type="text"
									bind:value={applicationData.fullName}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="email"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Email Address *</label
								>
								<input
									id="email"
									type="email"
									bind:value={applicationData.email}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="phone"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Phone Number *</label
								>
								<input
									id="phone"
									type="tel"
									bind:value={applicationData.phone}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="panCard"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>PAN Card Number *</label
								>
								<input
									id="panCard"
									type="text"
									bind:value={applicationData.panCard}
									required
									pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
									placeholder="ABCDE1234F"
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="aadharCard"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Aadhar Card Number *</label
								>
								<input
									id="aadharCard"
									type="text"
									bind:value={applicationData.aadharCard}
									required
									pattern="[0-9]{12}"
									placeholder="123456789012"
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
						</div>

						<!-- Employment & Loan Details -->
						<div class="space-y-4">
							<h3 class="mb-4 text-lg font-semibold text-[var(--form-text)]">
								Employment & Loan Details
							</h3>

							<div>
								<label
									for="employmentType"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Employment Type *</label
								>
								<select
									id="employmentType"
									bind:value={applicationData.employmentType}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								>
									<option value="">Select Employment Type</option>
									<option value="salaried">Salaried</option>
									<option value="self-employed">Self Employed</option>
									<option value="business">Business Owner</option>
								</select>
							</div>

							<div>
								<label
									for="companyName"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Company Name *</label
								>
								<input
									id="companyName"
									type="text"
									bind:value={applicationData.companyName}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="monthlyIncome"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Monthly Income *</label
								>
								<input
									id="monthlyIncome"
									type="number"
									bind:value={applicationData.monthlyIncome}
									required
									min="0"
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="loanAmount"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Desired Loan Amount *</label
								>
								<input
									id="loanAmount"
									type="number"
									bind:value={applicationData.loanAmount}
									required
									min="0"
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>

							<div>
								<label
									for="tenure"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Preferred Tenure (Years) *</label
								>
								<select
									id="tenure"
									bind:value={applicationData.tenure}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								>
									<option value="">Select Tenure</option>
									<option value="1">1 Year</option>
									<option value="2">2 Years</option>
									<option value="3">3 Years</option>
									<option value="4">4 Years</option>
									<option value="5">5 Years</option>
									<option value="6">6 Years</option>
									<option value="7">7 Years</option>
								</select>
							</div>

							<div>
								<label
									for="purpose"
									class="mb-2 block text-sm font-medium text-[var(--form-text-secondary)]"
									>Loan Purpose *</label
								>
								<select
									id="purpose"
									bind:value={applicationData.purpose}
									required
									class="w-full rounded-md border border-[var(--form-border)] px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
								>
									<option value="">Select Purpose</option>
									<option value="debt-consolidation">Debt Consolidation</option>
									<option value="home-renovation">Home Renovation</option>
									<option value="medical-expenses">Medical Expenses</option>
									<option value="education">Education</option>
									<option value="travel">Travel</option>
									<option value="wedding">Wedding</option>
									<option value="business">Business</option>
									<option value="other">Other</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Terms and Conditions -->
					<div class="mt-8 rounded-lg bg-[var(--form-bg-alt)] p-4">
						<label class="flex items-start space-x-3">
							<input
								type="checkbox"
								bind:checked={applicationData.termsAccepted}
								required
								class="mt-1 h-4 w-4 rounded border-[var(--form-border)] text-blue-600 focus:ring-primary"
							/>
							<span class="text-sm text-[var(--form-text-secondary)]">
								I agree to the <a href="/terms" class="text-blue-600 hover:underline"
									>Terms and Conditions</a
								>
								and
								<a href="/privacy" class="text-blue-600 hover:underline">Privacy Policy</a>. I
								authorize the lender to verify my information and credit history.
							</span>
						</label>
					</div>

					<!-- Submit Button -->
					<div class="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => goto('/loan-offers')}
							class="rounded-lg border border-[var(--form-border)] px-6 py-3 text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)]"
						>
							Back to Offers
						</button>
						<button
							type="submit"
							disabled={submitting}
							class="flex items-center space-x-2 rounded-lg bg-blue-600 px-8 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if submitting}
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span>Submitting...</span>
							{:else}
								<span>Submit Application</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom styles for better form appearance */
	input:focus,
	select:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

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
</style>
