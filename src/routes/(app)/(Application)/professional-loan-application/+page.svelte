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
	import SelectField from '$lib/components/SelectField.svelte';
	import InfoModal from '$lib/components/InfoModal.svelte';
	import LoanApplicationShell from '$lib/components/LoanApplicationShell.svelte';
	import { openModal } from '$lib/stores/modal';
	import { t } from '$lib/i18n';
	import {
		LOAN_APP_CONFIGS,
		formatLoanCurrency,
		getValidationErrorMessage,
		validateApplicationForm
	} from '$lib/utils/applicationFormUtils';

	const config = LOAN_APP_CONFIGS.professional;

	// Type for parsed user data from localStorage
	interface ParsedUserData {
		fullName?: string;
		loanAmount?: string | number;
		mortgageYear?: string | number;
		[key: string]: unknown;
	}

	let selectedBankOffer = $state<LoanOffer | null>(null);
	let userData = $state<ParsedUserData>({});
	let loading = $state(true);
	let submitting = $state(false);
	let termError = $state<string | null>(null);
	let showError = $state(false);
	let submitted = $state(false);

	function validateTerm() {
		if (!formApplicationData.tenure) {
			termError = 'Please select a tenure';
		} else {
			termError = null;
		}
	}

	function handleFocus() {
		showError = true;
		validateTerm();
	}

	function handleBlur() {
		showError = false;
	}

	let formApplicationData = $state({
		fullName: '',
		email: '',
		phone: '',
		alternatePhone: '',
		panCard: '',
		aadharCard: '',
		loanAmount: '',
		tenure: '',
		termsAccepted: false
	});

	$effect(() => {
		if (userData && Object.keys(userData).length > 0) {
			formApplicationData.fullName = userData.fullName || formApplicationData.fullName;
			formApplicationData.loanAmount =
				String(Number(userData.loanAmount) || '') || formApplicationData.loanAmount;
			formApplicationData.tenure =
				String(userData.mortgageYear ?? '') || formApplicationData.tenure;
			formApplicationData.email = $existingUser.email || '';
			formApplicationData.phone = $existingUser.phone || '';
		}
	});

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const offerIndex = urlParams.get('offer');

		if (offerIndex) {
			const storedOffers = localStorage.getItem(config.storageKey);

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
		if (!formApplicationData.loanAmount) formApplicationData.loanAmount = '100000';
		if (!formApplicationData.tenure)
			formApplicationData.tenure = '1' as typeof formApplicationData.tenure;

		if (!formApplicationData.termsAccepted) {
			alert('Please accept the terms and conditions');
			return;
		}

		const missing = validateApplicationForm(formApplicationData, config.hasEmploymentFields);

		if (missing.length > 0) {
			openModal(`Please fill all required fields:\n- ${missing.join('\n- ')}`);
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

	function updateForm<K extends keyof typeof formApplicationData>(
		key: K,
		value: (typeof formApplicationData)[K]
	) {
		formApplicationData = { ...formApplicationData, [key]: value };
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
			<!-- Offer summary banner -->
			<div class="border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
				<h3 class="text-subTitleText mb-4 font-semibold text-blue-900">
					{selectedBankOffer.bankName}
				</h3>
				<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
					<div>
						<div class="smallText mt-1 text-blue-900">Loan Amount</div>
						<div class="text-inputText font-semibold tracking-wide text-blue-900">
							{formatLoanCurrency(selectedBankOffer.SanctionAmount)}
						</div>
					</div>
					<div>
						<div class="smallText mt-1 text-blue-900">Monthly EMI</div>
						<div class="text-inputText font-semibold tracking-wide text-blue-900">
							{formatLoanCurrency(selectedBankOffer.emi)}
						</div>
					</div>
					<div>
						<div class="smallText mt-1 text-blue-900">Tenure</div>
						<div class="text-inputText font-semibold tracking-wide text-blue-900">
							{selectedBankOffer.tenure || 'N/A'} Years
						</div>
					</div>
					<div>
						<div class="smallText mt-1 text-blue-900">Interest Rate</div>
						<div class="text-inputText font-semibold tracking-wide text-blue-900">
							{selectedBankOffer.annualRate || 'N/A'}%
						</div>
					</div>
				</div>
			</div>

			<!-- Application form -->
			<form method="POST" onsubmit={handleSubmit} class="p-4 sm:p-6">
				<div class="space-y-6">
					<!-- Personal Information -->
					<div>
						<h3
							class="text-inputText md:text-subTitleText mb-4 border-b border-grayTwo pb-2 font-semibold text-blue-900"
						>
							Personal Information
						</h3>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<TextField
								label="Full Name"
								placeholder="Enter full name"
								type="text"
								uiType="text"
								icon="user"
								bind:value={formApplicationData.fullName}
								onInput={(val) => (formApplicationData.fullName = val)}
								error={getValidationErrorMessage(formApplicationData.fullName, 'text')}
							/>

							<EmailField
								label="Email"
								placeholder="Enter your email"
								bind:value={formApplicationData.email}
								onInput={(val) => updateForm('email', val)}
								readonly
							/>

							<TextField
								label="Phone"
								placeholder="Enter phone number"
								type="number"
								uiType="number"
								icon="phone"
								bind:value={formApplicationData.phone}
								onInput={(val) => updateForm('phone', val)}
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
								bind:value={formApplicationData.panCard}
								onInput={(val) => updateForm('panCard', val)}
							/>

							<AlphaNumeric
								label="Aadhar Card Number"
								placeholder="Enter 12-digit Aadhar"
								type="AADHAR"
								onInput={(val) => updateForm('aadharCard', val)}
								bind:value={formApplicationData.aadharCard}
							/>
						</div>
					</div>

					<!-- Loan Details (no employment section for professional loans) -->
					<div>
						<h3
							class="text-inputText md:text-subTitleText mb-4 border-b border-grayTwo pb-2 font-semibold text-blue-900"
						>
							Loan Details
						</h3>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<TextField
								label="Desired Loan Amount"
								icon="indian-rupee"
								bind:value={formApplicationData.loanAmount}
								type="text"
								uiType="number"
								placeholder="Enter your desired amount"
								onInput={(val) => (formApplicationData.loanAmount = val)}
								error={getValidationErrorMessage(formApplicationData.loanAmount, 'number')}
								readonly={true}
							/>

							<SelectField
								id="tenure"
								label="Preferred Tenure"
								icon="calendar"
								error={showError ? termError : null}
								bind:value={formApplicationData.tenure}
								readonly={true}
								options={[
									{ label: '1 year', value: 1 },
									{ label: '2 years', value: 2 },
									{ label: '3 years', value: 3 },
									{ label: '4 years', value: 4 },
									{ label: '5 years', value: 5 },
									{ label: '6 years', value: 6 },
									{ label: '7 years', value: 7 }
								]}
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
							<span class="text-sm text-[var(--form-text-secondary)]">
								I agree to the
								<button
									type="button"
									onclick={() =>
										openModal(
											'Digital DSA provides services for personal use, requiring accurate information and compliance with laws. Users accept electronic communication, content guidelines, intellectual property rules, and indemnify Digital DSA against violations.'
										)}
									class="font-inherit inline cursor-pointer border-0 bg-transparent p-0 font-medium text-inherit text-primary underline-offset-4 hover:underline"
									>Terms and Conditions</button
								>
								and
								<button
									type="button"
									onclick={() =>
										openModal(
											'Digital DSA, owned by E YANTRIK, safeguards user data with strict privacy controls. It collects, processes, and shares information responsibly, ensuring compliance, transparency, user rights, secure services, and periodic policy updates.'
										)}
									class="font-inherit inline cursor-pointer border-0 bg-transparent p-0 font-medium text-inherit text-primary underline-offset-4 hover:underline"
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
							class="text-button flex-1 cursor-pointer rounded-lg border border-[var(--form-border)] px-6 py-3 text-grayOne transition-colors hover:bg-[var(--form-bg-alt)]"
						>
							{t('app.submitted.backToOffers')}
						</button>
						<button
							type="submit"
							disabled={submitting}
							class="text-button flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
