<script lang="ts">
	import type { LoanOffer } from '$lib/types/loanTypes';
	import { goto } from '$app/navigation';

	interface Props {
		offer: LoanOffer;
		offerIndex?: number;
		onApply?: () => void;
		index?: number;
	}

	let { offer, offerIndex = 0, onApply = () => {}, index }: Props = $props();

	function handleApply() {
		// Navigate to the loan application page with the correct offer index
		const idx = offerIndex ?? index ?? 0;
		goto(`/loan-application?offer=${idx}`);
	}

	let showDetails = $state(false);
	let activeTab = $state('overview');

	function toggleDetails() {
		showDetails = !showDetails;
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getBankLogo(bankName: string): string {
		// You can add actual bank logos here
		const logos: { [key: string]: string } = {
			SBI: '🏦',
			HDFC: '🏛️',
			ICICI: '🏢',
			Axis: '🏪',
			Kotak: '🏬',
			default: '🏦'
		};
		return logos[bankName] || logos.default;
	}

	function getStatusColor(status: string): string {
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
</script>

<div
	class="rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-lg transition-all duration-300 hover:shadow-xl"
>
	<!-- Card Header -->
	<div class="border-b border-[var(--form-border)] p-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center space-x-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-2xl text-yellow-700"
				>
					{getBankLogo(offer.bankName || 'Bank')}
				</div>
				<div>
					<h3 class="text-xl font-bold text-[var(--form-text)]">
						{offer.bankName || 'Bank'} Personal Loan
					</h3>
					{#if offer.productName}
						<p class="text-sm text-[var(--form-text-secondary)]">{offer.productName}</p>
					{/if}
					{#if offer.error}
						<span
							class="smallText inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium {getStatusColor(
								offer.error.status
							)}"
						>
							{offer.error.status}
						</span>
					{:else}
						<span
							class="smallText inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium {getStatusColor(
								'approved'
							)}"
						>
							Eligible
						</span>
					{/if}
				</div>
			</div>
			<div class="text-right">
				<div class="text-sm text-[var(--form-text-muted)]">
					Offer #{(index ?? offerIndex ?? 0) + 1}
				</div>
			</div>
		</div>
	</div>

	<!-- Key Metrics -->
	<div class="p-6">
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="text-center">
				<div class="text-2xl font-bold text-green-600 dark:text-green-400">
					{formatCurrency(offer.SanctionAmount)}
				</div>
				<div class="text-sm text-[var(--form-text-muted)]">Loan Amount</div>
			</div>
			<div class="text-center">
				<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
					{formatCurrency(offer.emi)}
				</div>
				<div class="text-sm text-[var(--form-text-muted)]">Monthly EMI</div>
			</div>
			<div class="text-center">
				<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
					{offer.tenure} years
				</div>
				<div class="text-sm text-[var(--form-text-muted)]">Tenure</div>
			</div>
			<div class="text-center">
				<div class="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
					{offer.annualRate}%
				</div>
				<div class="text-sm text-[var(--form-text-muted)]">Interest Rate</div>
			</div>
		</div>

		<!-- Error Messages -->
		{#if offer.error && offer.error.reasons.length > 0}
			<div
				class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40"
			>
				<h4 class="text-regularText text-error">⚠️ Application Issues:</h4>
				<ul class="mt-2 space-y-1">
					{#each offer.error.reasons as reason}
						<li class="text-sm text-[var(--color-error)] dark:text-red-400">• {reason}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Suggestions -->
		{#if offer.suggestionMsg && offer.suggestionMsg.length > 0}
			<div
				class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
			>
				<h4 class="text-sm font-medium text-blue-800 dark:text-blue-400">
					💡 Suggestions to Improve:
				</h4>
				<ul class="mt-2 space-y-1">
					{#each offer.suggestionMsg as suggestion}
						<li class="text-sm text-blue-700 dark:text-blue-400">• {suggestion}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="mt-6 flex space-x-3">
			<button
				onclick={handleApply}
				class="flex-1 rounded-lg bg-yellow-500 px-4 py-3 text-center text-sm font-semibold text-gray-900 transition-colors hover:bg-yellow-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--form-bg-card)]"
				disabled={offer.error?.status === 'Rejected'}
			>
				{#if offer.error?.status === 'Rejected'}
					Not Eligible
				{:else}
					Apply Now
				{/if}
			</button>
			<button
				onclick={toggleDetails}
				class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3 text-sm font-medium text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--form-bg-card)]"
			>
				{showDetails ? 'Hide Details' : 'View Details'}
			</button>
		</div>
	</div>

	<!-- Detailed Information -->
	{#if showDetails}
		<div class="border-t border-[var(--form-border)] bg-[var(--form-bg-alt)]">
			<!-- Tab Navigation -->
			<div class="border-b border-[var(--form-border)]">
				<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
					<button
						onclick={() => (activeTab = 'overview')}
						class="{activeTab === 'overview'
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-[var(--form-text-muted)] hover:border-[var(--form-border)] hover:text-[var(--form-text-secondary)]'} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap"
					>
						Overview
					</button>
					<button
						onclick={() => (activeTab = 'documents')}
						class="{activeTab === 'documents'
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-[var(--form-text-muted)] hover:border-[var(--form-border)] hover:text-[var(--form-text-secondary)]'} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap"
					>
						Documents
					</button>
					<button
						onclick={() => (activeTab = 'charges')}
						class="{activeTab === 'charges'
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-[var(--form-text-muted)] hover:border-[var(--form-border)] hover:text-[var(--form-text-secondary)]'} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap"
					>
						Charges
					</button>
					<button
						onclick={() => (activeTab = 'features')}
						class="{activeTab === 'features'
							? 'border-indigo-500 text-indigo-600'
							: 'border-transparent text-[var(--form-text-muted)] hover:border-[var(--form-border)] hover:text-[var(--form-text-secondary)]'} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap"
					>
						Features
					</button>
				</nav>
			</div>

			<!-- Tab Content -->
			<div class="p-6">
				{#if activeTab === 'overview'}
					<div class="space-y-6">
						<!-- Eligibility Details -->
						{#if offer.checkEligibilityData}
							<div>
								<h4 class="mb-3 text-lg font-semibold text-[var(--form-text)]">
									📊 Eligibility Analysis
								</h4>
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div
										class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4"
									>
										<div class="text-sm text-[var(--form-text-secondary)]">Max Eligible Amount</div>
										<div class="text-xl font-bold text-green-600 dark:text-green-400">
											{formatCurrency(offer.checkEligibilityData.maxEligibleLoanAmount)}
										</div>
									</div>
									<div
										class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4"
									>
										<div class="text-sm text-[var(--form-text-secondary)]">FOIR Ratio</div>
										<div class="text-xl font-bold text-blue-600 dark:text-blue-400">
											{(offer.checkEligibilityData.foir * 100).toFixed(1)}%
										</div>
									</div>
									<div
										class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4"
									>
										<div class="text-sm text-[var(--form-text-secondary)]">Monthly Income</div>
										<div class="text-xl font-bold text-purple-600 dark:text-purple-400">
											{formatCurrency(offer.checkEligibilityData.totalMonthlyIncome)}
										</div>
									</div>
									<div
										class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4"
									>
										<div class="text-sm text-[var(--form-text-secondary)]">Max Loan Capacity</div>
										<div class="text-xl font-bold text-neutral-600 dark:text-neutral-400">
											{formatCurrency(offer.checkEligibilityData.maximumLoanCapacity)}
										</div>
									</div>
								</div>
							</div>

							<!-- Optimization Suggestions -->
							{#if offer.checkEligibilityData.maximumTenure?.length > 0}
								<div>
									<h4 class="mb-3 text-lg font-semibold text-[var(--form-text)]">
										🎯 Optimization Opportunities
									</h4>
									<div class="space-y-3">
										{#each offer.checkEligibilityData.maximumTenure as tenure}
											<div
												class="rounded-lg border border-green-200 bg-[var(--form-bg-card)] p-4 dark:border-green-800"
											>
												<div class="flex items-start justify-between">
													<div>
														<div class="font-medium text-green-800 dark:text-green-400">
															Extended Tenure Available
														</div>
														<div class="mt-1 text-sm text-[var(--form-text-secondary)]">
															{tenure.reason}
														</div>
													</div>
													<div class="text-right">
														<div class="text-lg font-bold text-green-600 dark:text-green-400">
															Up to {tenure.reasonValue} years
														</div>
													</div>
												</div>
											</div>
										{/each}
										{#each offer.checkEligibilityData.minimumInterestRate || [] as rate}
											<div
												class="rounded-lg border border-blue-200 bg-[var(--form-bg-card)] p-4 dark:border-blue-800"
											>
												<div class="flex items-start justify-between">
													<div>
														<div class="font-medium text-blue-800 dark:text-blue-400">
															Better Interest Rate Possible
														</div>
														<div class="mt-1 text-sm text-[var(--form-text-secondary)]">
															{rate.reason}
														</div>
													</div>
													<div class="text-right">
														<div class="text-lg font-bold text-blue-600 dark:text-blue-400">
															As low as {rate.reasonValue}%
														</div>
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{:else if activeTab === 'documents'}
					<div>
						<h4 class="mb-4 text-lg font-semibold text-[var(--form-text)]">
							📄 Required Documents
						</h4>
						<div class="space-y-3">
							{#each offer.requiredDocuments as document}
								<div
									class="flex items-start space-x-3 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4"
								>
									<div class="flex-shrink-0">
										<div class="mt-2 h-2 w-2 rounded-full bg-indigo-600"></div>
									</div>
									<div class="text-sm text-[var(--form-text-secondary)]">{document}</div>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'charges'}
					<div>
						<h4 class="mb-4 text-lg font-semibold text-[var(--form-text)]">
							💰 Loan Charges & Fees
						</h4>
						<div class="space-y-3">
							{#each offer.loanCharges as charge}
								<div
									class="rounded-lg border border-yellow-200 bg-[var(--form-bg-card)] p-4 dark:border-yellow-800"
								>
									<div class="text-sm text-[var(--form-text-secondary)]">{charge}</div>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'features'}
					<div>
						<h4 class="mb-4 text-lg font-semibold text-[var(--form-text)]">
							✨ Loan Features & Benefits
						</h4>
						<div class="space-y-6">
							{#each Object.entries(offer.feature) as [category, features]}
								<div>
									<h5 class="text-md mb-3 font-medium text-[var(--form-text)]">{category}</h5>
									<div class="space-y-2">
										{#each features as feature}
											<div
												class="flex items-start space-x-3 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-3"
											>
												<div class="flex-shrink-0">
													<svg
														class="mt-0.5 h-5 w-5 text-yellow-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clip-rule="evenodd"
														/>
													</svg>
												</div>
												<div class="text-sm text-[var(--form-text-secondary)]">{feature}</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
