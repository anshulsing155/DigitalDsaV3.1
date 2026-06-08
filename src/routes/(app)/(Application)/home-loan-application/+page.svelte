<script lang="ts">
	import { onMount } from 'svelte';
	import clientLogger from '$lib/utils/clientLogger';
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import type { LoanOffer } from '$lib/types/loanTypes';
	import { existingUser } from '$lib/stores/loanData';
	import TextField from '$lib/components/TextField.svelte';
	import EmailField from '$lib/components/EmailField.svelte';
	import AlphaNumeric from '$lib/components/AlphaNumeric.svelte';
	import InfoModal from '$lib/components/InfoModal.svelte';
	import LoanApplicationShell from '$lib/components/LoanApplicationShell.svelte';
	import { openModal } from '$lib/stores/modal';
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import {
		LOAN_APP_CONFIGS,
		formatLoanCurrency,
		getValidationErrorMessage,
		validateApplicationForm
	} from '$lib/utils/applicationFormUtils';

	const config = LOAN_APP_CONFIGS.home;

	// Type for parsed user data from localStorage
	interface ParsedUserData {
		fullName?: string;
		employmentType?: string;
		fixedSalary?: string | number;
		loanAmount?: string | number;
		mortgageYear?: string | number;
		loanType?: string;
		allApplicantDetails?: Record<string, unknown>;
		[key: string]: unknown;
	}

	let selectedBankOffer = $state<LoanOffer | null>(null);
	let userData = $state<ParsedUserData>({});
	let loading = $state(true);
	let submitting = $state(false);
	let submitted = $state(false);
	let storedOffers: string | null;
	let allApplicants: Record<string, unknown> | undefined;

	let formApplicationData = $state({
		fullName: '',
		email: '',
		phone: '',
		alternatePhone: '',
		panCard: '',
		aadharCard: '',
		employmentType: '',
		monthlyIncome: '',
		loanAmount: '',
		tenure: '',
		termsAccepted: false
	});

	let user = $derived(page.data.user);
	$effect(() => {
		if (user) {
			formApplicationData.email = user.email || '';
			formApplicationData.phone = user.mobileNumber || '';
		}
	});

	function updateForm<K extends keyof typeof formApplicationData>(
		key: K,
		value: (typeof formApplicationData)[K]
	) {
		formApplicationData = { ...formApplicationData, [key]: value };
	}

	$effect(() => {
		Array(userData).map((item: ParsedUserData) => {
			Array(item.allApplicantDetails).map((applicant) => {
				allApplicants = applicant as Record<string, unknown>;
			});
		});
	});

	$effect(() => {
		if (userData && Object.keys(userData).length > 0) {
			formApplicationData = {
				...formApplicationData,
				fullName: userData.fullName || formApplicationData.fullName,
				employmentType: userData.employmentType || formApplicationData.employmentType,
				monthlyIncome: String(userData.fixedSalary ?? '') || formApplicationData.monthlyIncome,
				loanAmount: String(Number(userData.loanAmount) || '') || formApplicationData.loanAmount,
				tenure: String(userData.mortgageYear ?? '') || formApplicationData.tenure,
				email: formApplicationData.email || $existingUser.email || '',
				phone: formApplicationData.phone || $existingUser.phone || ''
			};
		}
	});

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const offerIndex = urlParams.get('offer');

		if (offerIndex) {
			storedOffers = localStorage.getItem(config.storageKey);

			if (storedOffers) {
				try {
					const parsed = JSON.parse(storedOffers);
					userData = parsed.applicationData;
					selectedBankOffer = parsed.offer;
				} catch (e) {
					clientLogger.error({ err: e }, 'Failed to parse stored offer');
				}
			}
		}

		loading = false;
	});

	async function handleSubmit() {
		if (!formApplicationData.employmentType) formApplicationData.employmentType = 'Salaried';
		if (!formApplicationData.monthlyIncome) formApplicationData.monthlyIncome = '50000';
		if (!formApplicationData.loanAmount) formApplicationData.loanAmount = '100000';
		if (!formApplicationData.tenure)
			formApplicationData.tenure = '1' as typeof formApplicationData.tenure;

		if (!formApplicationData.termsAccepted) {
			alert('Please accept the terms and conditions');
			return;
		}

		const missing = validateApplicationForm(formApplicationData, config.hasEmploymentFields);

		if (missing.length > 0) {
			openModal(`Please fill all required fields: -<br> ${missing.join('<br>')}`);
			return;
		}

		submitting = true;
		const fullData = {
			...userData,
			...formApplicationData,
			phone: Number(formApplicationData.phone),
			aadharCard: Number(formApplicationData.aadharCard),
			tenure: Number(formApplicationData.tenure),
			selectedBankOffer: {
				...selectedBankOffer,
				applied: true
			}
		};

		try {
			const res = await secureFetch('/api/appliedApplication', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(fullData)
			});

			const result = await res.json();

			if (result.success) {
				submitted = true;
				submitting = false;
			} else {
				openModal('Failed to submit the application. Please try again.');
			}
		} catch (error) {
			clientLogger.error({ err: error }, 'Application submission failed:');
			openModal('An error occurred while submitting. Please try again.');
		} finally {
			submitting = false;
		}
	}
</script>

<LoanApplicationShell
	loanType={config.loanType}
	loanDisplayName={config.loanDisplayName}
	backRoute={config.offersRoute}
	{loading}
	{submitted}
>
	{#if selectedBankOffer}
		<div
			class="overflow-hidden rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-sm"
		>
			<!-- Offer summary banner — home loan uses nested loanData paths for non-BT -->
			<div class="border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
				<h3 class="text-sectionHeadingText mb-2 text-blue-900">
					{selectedBankOffer.bankName}
				</h3>
				{#if userData.loanType == 'Balance Transfer With Top-up'}
					<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
						<div>
							<div class="smallText mt-1 text-blue-900 uppercase">Sanction Amount</div>
							<div class="text-sectionHeadingText text-blue-900">
								{formatLoanCurrency(selectedBankOffer.SanctionAmount)}
							</div>
						</div>
					</div>
					<!-- Outstanding Amount -->
					<div class="mt-4 flex flex-col gap-2">
						<h class="text-labelText text-blue-900 underline underline-offset-4">Outstanding Amount</h>
						<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
							{#each Array(selectedBankOffer.principalOutstandingDetail) as outstanding}
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">Principal Amount</div>
									<div class="text-sectionHeadingText text-blue-900">
										{formatLoanCurrency(outstanding?.principalOutstanding)}
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">EMI Amount</div>
									<div class="text-sectionHeadingText text-blue-900">
										{formatLoanCurrency(outstanding?.emiOfPrincipalOutstanding)}
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">Tenure</div>
									<div class="text-sectionHeadingText text-blue-900">
										{outstanding?.tenure || 'N/A'} Years
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">Interest Rate</div>
									<div class="text-sectionHeadingText text-blue-900">
										{outstanding?.annualRate || 'N/A'}%
									</div>
								</div>
							{/each}
						</div>
					</div>
					<!-- Top-up Details -->
					<div class="mt-4 flex flex-col gap-2">
						<h class="text-labelText text-blue-900 underline underline-offset-4">Top-up Details</h>
						<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
							{#each Array(selectedBankOffer.topDetails) as topup}
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">TopUp Amount</div>
									<div class="text-sectionHeadingText text-blue-900">
										{formatLoanCurrency(topup?.topUpAmount)}
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">EMI Amount</div>
									<div class="text-sectionHeadingText text-blue-900">
										{formatLoanCurrency(topup?.emiOfTopUp)}
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">Tenure</div>
									<div class="text-sectionHeadingText text-blue-900">
										{topup?.tenure || 'N/A'} Years
									</div>
								</div>
								<div>
									<div class="smallText mt-1 text-blue-900 uppercase">Interest Rate</div>
									<div class="text-sectionHeadingText text-blue-900">
										{topup?.annualRate || 'N/A'}%
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Home loan uses nested loanData.homeLoanData for EMI/tenure/rate -->
					<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
						<div>
							<div class="smallText mt-1 text-blue-900 uppercase">Loan Amount</div>
							<div class="text-sectionHeadingText text-blue-900">
								{formatLoanCurrency(selectedBankOffer.SanctionAmount)}
							</div>
						</div>
						<div>
							<div class="smallText mt-1 text-blue-900 uppercase">Monthly EMI</div>
							<div class="text-sectionHeadingText text-blue-900">
								{formatLoanCurrency(selectedBankOffer?.loanData?.homeLoanData?.emi)}
							</div>
						</div>
						<div>
							<div class="smallText mt-1 text-blue-900 uppercase">Tenure</div>
							<div class="text-sectionHeadingText text-blue-900">
								{selectedBankOffer?.loanData?.homeLoanData?.tenure || 'N/A'} Years
							</div>
						</div>
						<div>
							<div class="smallText mt-1 text-blue-900 uppercase">Interest Rate</div>
							<div class="text-sectionHeadingText text-blue-900">
								{selectedBankOffer?.loanData?.homeLoanData?.interestRate?.toFixed(2) || 'N/A'}%
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Application form -->
			<form method="POST" onsubmit={handleSubmit} class="p-4 sm:p-6">
				<div class="space-y-6">
					<!-- Personal Information -->
					<div>
						<h3 class="text-sectionHeadingText mb-4 border-b border-grayTwo pb-2 text-blue-900">
							Personal Information
						</h3>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<TextField
								label="Full Name"
								placeholder="Enter full name"
								type="text"
								uiType="text"
								icon="user"
								required={true}
								bind:value={formApplicationData.fullName}
								onInput={(val) => (formApplicationData.fullName = val)}
								error={getValidationErrorMessage(formApplicationData.fullName, 'text')}
							/>

							<EmailField
								label="Email"
								placeholder="Enter your email"
								bind:value={formApplicationData.email}
								readonly
							/>

							<TextField
								label="Phone"
								placeholder="Enter phone number"
								type="number"
								uiType="number"
								icon="phone"
								bind:value={formApplicationData.phone}
								error={getValidationErrorMessage(formApplicationData.phone, 'number') || undefined}
								readonly
							/>

							<TextField
								label="Alternate Number"
								placeholder="Enter alternate phone number"
								type="number"
								uiType="number"
								icon="phone"
								bind:value={formApplicationData.alternatePhone}
								onInput={(val) => updateForm('alternatePhone', val)}
								error={getValidationErrorMessage(formApplicationData.alternatePhone, 'number') ||
									undefined}
							/>

							<AlphaNumeric
								label="PAN Card Number"
								placeholder="AAAPA1234A"
								type="PAN"
								required={true}
								bind:value={formApplicationData.panCard}
								onInput={(val) => updateForm('panCard', val)}
							/>

							<AlphaNumeric
								label="Aadhar Card Number"
								placeholder="Enter 12-digit Aadhar"
								type="AADHAR"
								required={true}
								onInput={(val) => updateForm('aadharCard', val)}
								bind:value={formApplicationData.aadharCard}
							/>
						</div>
					</div>

					<!-- Terms and Conditions -->
					<div class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] p-4">
						<label class="flex items-start gap-3">
							<input
								type="checkbox"
								bind:checked={formApplicationData.termsAccepted}
								required
								class="mt-1 h-4 w-4 rounded border-[var(--form-border)] text-blue-600 focus:ring-primary"
							/>
							<span class="smallText text-[var(--form-text-secondary)]">
								I agree to the
								<button
									type="button"
									onclick={() =>
										openModal(
											'Digital DSA provides services for personal use, requiring accurate information and compliance with laws. Users accept electronic communication, content guidelines, intellectual property rules, and indemnify Digital DSA against violations.'
										)}
									class="smallText font-inherit inline cursor-pointer border-0 bg-transparent p-0 text-inherit text-primary underline-offset-4 hover:underline"
									>Terms and Conditions</button
								>
								and
								<button
									type="button"
									onclick={() =>
										openModal(
											'Digital DSA, owned by E YANTRIK, safeguards user data with strict privacy controls. It collects, processes, and shares information responsibly, ensuring compliance, transparency, user rights, secure services, and periodic policy updates.'
										)}
									class="smallText font-inherit inline cursor-pointer border-0 bg-transparent p-0 text-inherit text-primary underline-offset-4 hover:underline"
									>Privacy Policy</button
								>. I authorize the lender to verify my information and credit history.
							</span>
						</label>
					</div>

					<!-- Action buttons -->
					<div class="flex flex-col gap-3 pt-4 sm:flex-row">
						<button
							type="button"
							onclick={() => goto(config.offersRoute)}
							class="buttonText flex-1 cursor-pointer rounded-lg border border-[var(--form-border)] px-6 py-3 text-grayOne transition-colors hover:bg-[var(--form-bg-alt)]"
						>
							{t('app.submitted.backToOffers')}
						</button>
						<button
							type="submit"
							disabled={submitting}
							class="buttonText flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
								<span>{t('app.submitted.submitting')}</span>
							{:else}
								<span>{t('app.submitted.submitBtn')}</span>
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}
</LoanApplicationShell>

<InfoModal />
