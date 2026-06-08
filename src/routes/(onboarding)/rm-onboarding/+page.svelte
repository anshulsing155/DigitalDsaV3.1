<script lang="ts">
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import BasicFields from '$lib/components/onboarding/BasicFields.svelte';
	import OnboardingSelect from '$lib/components/onboarding/OnboardingSelect.svelte';
	import SingleTextField from '$lib/components/SingleTextField.svelte';
	import segmentCities from '$lib/data/segment-cities/segment.json';
	import { isLenderDomain, getLenderNameFromDomain } from '$lib/config/lenderDomains';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	// RM partner signup: auto-select RM role (skip role picker)
	$effect(() => {
		if (!onboardingState.data.selectedRole || onboardingState.data.selectedRole !== 'rm') {
			onboardingState.updateData((d) => ({ ...d, selectedRole: 'rm' as any }));
		}
	});

	// Initialize RM sub-object if needed
	$effect(() => {
		if (!onboardingState.data.rm) {
			onboardingState.updateData((d) => ({
				...d,
				rm: { officialEmail: '', workingCity: '' }
			}));
		}
	});

	// Build city options from segment-cities data (25 major Indian cities)
	const cityOptions = (segmentCities as Array<{ city: string }>)
		.map((item) => ({
			label: item.city,
			value: item.city
		}))
		.sort((a, b) => a.label.localeCompare(b.label));

	// ── Email domain live feedback ─────────────────────────
	let emailDomainStatus = $derived.by(() => {
		const email = onboardingState.data.rm?.officialEmail || '';
		if (!email || !email.includes('@')) return { valid: false, name: '' };
		const valid = isLenderDomain(email);
		const name = valid ? getLenderNameFromDomain(email) || '' : '';
		return { valid, name };
	});

	// ── Field handlers ─────────────────────────────────────
	function handleEmailInput(value: string) {
		onboardingState.updateData((d) => ({
			...d,
			rm: { officialEmail: value, workingCity: d.rm?.workingCity ?? '' }
		}));
		// Clear error on edit
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated['officialEmail'];
			return updated;
		});
	}

	function handleCityChange(value: string | number) {
		onboardingState.updateData((d) => ({
			...d,
			rm: { officialEmail: d.rm?.officialEmail ?? '', workingCity: String(value) }
		}));
		// Clear error on edit
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated['workingCity'];
			return updated;
		});
	}
</script>

<div class="rm-onboarding">
	<h2 class="section-title">Bank RM Details</h2>
	<p class="section-desc">Complete your profile to start receiving case files from DSAs.</p>

	<!-- ── Basic Fields (name, age, gender, email) ────────── -->
	<BasicFields />

	<!-- ── RM-Specific Fields ────────────────────────── -->
	<div class="mt-6 space-y-4">
		<h3 class="text-sm font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase">
			Bank Details
		</h3>

		<!-- Official Bank Email -->
		<div>
			<SingleTextField
				id="rm-official-email"
				label="Official Bank Email <span class='text-red-500'>*</span>"
				placeholder="yourname@bankdomain.com"
				value={onboardingState.data.rm?.officialEmail || ''}
				onInput={handleEmailInput}
				error={onboardingState.errors['officialEmail'] || undefined}
				icon="mail"
				required={true}
				maxLength={254}
			/>
			{#if emailDomainStatus.valid && emailDomainStatus.name}
				<p class="mt-1 flex items-center gap-1 px-1 text-xs text-emerald-600">
					<span>✓</span>
					{emailDomainStatus.name}
				</p>
			{:else if onboardingState.data.rm?.officialEmail && onboardingState.data.rm.officialEmail.includes('@') && !emailDomainStatus.valid}
				<p class="mt-1 px-1 text-xs text-stone-600">
					Domain not recognized. Must be from a bank, NBFC, or HFC (e.g. @hdfcbank.com, @sbi.co.in,
					@bajajfinserv.in)
				</p>
			{:else}
				<p class="mt-1 px-1 text-xs text-[var(--dash-text-muted)]">
					Must be from a recognized bank, NBFC, or HFC domain
				</p>
			{/if}
		</div>

		<!-- Working City (dropdown) -->
		{#if onboardingState.data.rm}
			<OnboardingSelect
				id="rm-working-city"
				label="Working City <span class='text-red-500'>*</span>"
				icon="map-pin"
				required={true}
				bind:value={onboardingState.data.rm.workingCity}
				onChange={handleCityChange}
				error={onboardingState.errors['workingCity'] || undefined}
				selectClass="w-full"
				options={cityOptions}
			/>
		{/if}
	</div>
</div>

<style>
	.rm-onboarding {
		max-width: 480px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a2e);
		margin-bottom: 0.5rem;
	}

	.section-desc {
		font-size: 0.875rem;
		color: var(--text-secondary, #666);
		margin-bottom: 2rem;
	}
</style>
