<script lang="ts">
	import { onMount } from 'svelte';
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import OnboardingSelect from './OnboardingSelect.svelte';
	import SingleTextField from '../SingleTextField.svelte';
	import BasicFields from './BasicFields.svelte';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { dsaStep2Schema } from '$lib/schemas/onboarding/dsaStep2Schema';

	const lenderOptions = bankData.map((b) => ({ label: b.label, value: b.value }));

	// Fetched on mount from /api/location/cities to keep the 763 KB pincode JSON
	// out of the client bundle (PERF-4). Dropdown shows no options until the
	// first response lands — acceptable for the rarely-hit freelance branch.
	let cityOptions = $state<Array<{ label: string; value: string }>>([]);

	onMount(async () => {
		try {
			const res = await fetch('/api/location/cities');
			if (res.ok) {
				const data = (await res.json()) as { data?: { cities?: string[] } };
				cityOptions = (data.data?.cities ?? []).map((city) => ({ label: city, value: city }));
			}
		} catch {
			cityOptions = [];
		}
	});

	if (!onboardingState.data.dsa) {
		onboardingState.data.dsa = {
			hasDirectDsaCode: undefined,
			lenderName: '',
			dsaCode: '',
			panNumber: '',
			workingCity: '',
			gstNumber: ''
		};
	}

	function setHasDsaCode(val: boolean) {
		onboardingState.updateData((d) => ({
			...d,
			dsa: {
				...(d.dsa ?? {
					hasDirectDsaCode: undefined,
					lenderName: '',
					dsaCode: '',
					panNumber: '',
					workingCity: '',
					gstNumber: ''
				}),
				hasDirectDsaCode: val,
				...(val ? { panNumber: '', workingCity: '' } : { lenderName: '', dsaCode: '' })
			}
		}));

		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated.hasDirectDsaCode;
			delete updated.lenderName;
			delete updated.dsaCode;
			delete updated.panNumber;
			delete updated.workingCity;
			return updated;
		});
	}

	function handleDsaFieldChange(field: string, value: string | number) {
		let normalizedValue = String(value);
		if (field === 'panNumber' || field === 'gstNumber' || field === 'dsaCode') {
			normalizedValue = normalizedValue.toUpperCase();
		}

		onboardingState.updateData((d) => ({
			...d,
			dsa: {
				...(d.dsa ?? {
					hasDirectDsaCode: undefined,
					lenderName: '',
					dsaCode: '',
					panNumber: '',
					workingCity: '',
					gstNumber: ''
				}),
				[field]: normalizedValue
			}
		}));

		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated[field];
			return updated;
		});
	}
</script>

<div class="space-y-8">
	<!-- Section 1: Personal Info -->
	<div>
		<div class="mb-4 flex items-center gap-2">
			<div class="h-1 w-5 rounded-full bg-[var(--ddsa-primary-400)]"></div>
			<h3 class="text-xs font-semibold tracking-wider text-[var(--ddsa-primary-300)] uppercase">
				Personal Info
			</h3>
		</div>
		<BasicFields />
	</div>

	<!-- Divider -->
	<div class="border-t border-white/[0.06]"></div>

	<!-- Section 2: Professional Details -->
	<div>
		<div class="mb-4 flex items-center gap-2">
			<div class="h-1 w-5 rounded-full bg-[var(--ddsa-primary-400)]"></div>
			<h3 class="text-xs font-semibold tracking-wider text-[var(--ddsa-primary-300)] uppercase">
				Professional Details
			</h3>
		</div>

		<!-- DSA Code Question -->
		<div class="space-y-3">
			<p class="text-sm text-[var(--ddsa-gray-300)]">
				Do you have a direct DSA code with any lender / bank?
				<span class="text-[var(--ddsa-error)]">*</span>
			</p>

			{#if onboardingState.errors.hasDirectDsaCode}
				<p class="text-xs text-[var(--ddsa-error)]">{onboardingState.errors.hasDirectDsaCode}</p>
			{/if}

			<div class="grid grid-cols-2 gap-3">
				<button
					type="button"
					class="group cursor-pointer rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all
						{onboardingState.data.dsa?.hasDirectDsaCode === true
						? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
						: 'border-white/[0.08] bg-white/[0.02] text-[var(--ddsa-gray-400)] hover:border-white/[0.15] hover:bg-white/[0.04]'}"
					onclick={() => setHasDsaCode(true)}
				>
					Yes, I have a code
				</button>
				<button
					type="button"
					class="group cursor-pointer rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all
						{onboardingState.data.dsa?.hasDirectDsaCode === false
						? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
						: 'border-white/[0.08] bg-white/[0.02] text-[var(--ddsa-gray-400)] hover:border-white/[0.15] hover:bg-white/[0.04]'}"
					onclick={() => setHasDsaCode(false)}
				>
					Freelance / sub-DSA
				</button>
			</div>
		</div>

		<!-- YES Branch -->
		{#if onboardingState.data.dsa?.hasDirectDsaCode === true}
			<div
				class="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-2 md:gap-3"
			>
				<OnboardingSelect
					id="dsa_lender"
					label="Which lender / bank?"
					icon="landmark"
					required={true}
					bind:value={onboardingState.data.dsa.lenderName}
					onChange={(value) => handleDsaFieldChange('lenderName', value)}
					error={onboardingState.errors.lenderName || undefined}
					selectClass="w-full"
					options={lenderOptions}
				/>

				<SingleTextField
					id="dsa_code"
					label="Your DSA Code"
					placeholder="Enter your DSA code"
					bind:value={onboardingState.data.dsa.dsaCode}
					error={onboardingState.errors.dsaCode || undefined}
					onInput={(value) => handleDsaFieldChange('dsaCode', value)}
					icon="hash"
					required={true}
					maxLength={50}
				/>
			</div>
		{/if}

		<!-- NO Branch -->
		{#if onboardingState.data.dsa?.hasDirectDsaCode === false}
			<div
				class="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 md:grid-cols-2 md:gap-3"
			>
				<SingleTextField
					id="dsa_pan"
					label="PAN Card Number"
					placeholder="e.g. ABCDE1234F"
					bind:value={onboardingState.data.dsa.panNumber}
					error={onboardingState.errors.panNumber || undefined}
					onInput={(value) => handleDsaFieldChange('panNumber', value)}
					icon="id-card"
					required={true}
					maxLength={10}
				/>

				<OnboardingSelect
					id="dsa_city"
					label="Working City"
					icon="map-pin"
					required={true}
					bind:value={onboardingState.data.dsa.workingCity}
					onChange={(value) => handleDsaFieldChange('workingCity', value)}
					error={onboardingState.errors.workingCity || undefined}
					selectClass="w-full"
					options={cityOptions}
				/>
			</div>
		{/if}

		<!-- GST (always optional) -->
		{#if onboardingState.data.dsa?.hasDirectDsaCode !== undefined}
			<div class="mt-5 max-w-md">
				<SingleTextField
					id="dsa_gst"
					label="GST Number (optional)"
					placeholder="e.g. 22ABCDE1234F1Z5"
					bind:value={onboardingState.data.dsa.gstNumber}
					error={onboardingState.errors.gstNumber || undefined}
					onInput={(value) => handleDsaFieldChange('gstNumber', value)}
					icon="receipt"
					maxLength={15}
				/>
				<p class="mt-1 px-1 text-xs text-[var(--ddsa-gray-500)]">
					Leave blank if you receive payouts in cash or don't have GST registration.
				</p>
			</div>
		{/if}
	</div>
</div>
