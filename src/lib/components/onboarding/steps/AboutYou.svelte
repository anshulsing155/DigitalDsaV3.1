<script lang="ts">
	import { onMount } from 'svelte';
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import { showEmailOtpModal } from '$lib/stores/modal';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { addToast } from '$lib/state/ui.svelte';
	import { emailVerificationState } from '$lib/stores/emailVerificationContext.svelte';
	import { BadgeCheck } from '$lib/utils/iconRegistry';

	// Fetched on mount from /api/location/cities to keep the 763 KB pincode JSON
	// out of the client bundle (PERF-4). Empty until the first response lands —
	// city dropdown stays inert for a few hundred ms during onboarding.
	let cityOptions = $state<string[]>([]);

	onMount(async () => {
		try {
			const res = await fetch('/api/location/cities');
			if (res.ok) {
				const data = (await res.json()) as { data?: { cities?: string[] } };
				cityOptions = data.data?.cities ?? [];
			}
		} catch {
			cityOptions = [];
		}
	});

	let citySearch = $state('');
	let showCityDropdown = $state(false);

	const filteredCities = $derived(
		citySearch.length >= 2
			? cityOptions.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 20)
			: []
	);

	function selectCity(city: string) {
		onboardingState.data.workingCity = city;
		citySearch = city;
		showCityDropdown = false;
		clearError('workingCity');
	}

	function clearError(field: string) {
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated[field];
			return updated;
		});
	}

	function handleNameInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		onboardingState.data.name = val;
		clearError('name');
	}

	function handlePanInput(e: Event) {
		const val = (e.target as HTMLInputElement).value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 10);
		onboardingState.data.panNumber = val;
		(e.target as HTMLInputElement).value = val;
		clearError('panNumber');
	}

	function handleEmailInput(e: Event) {
		onboardingState.data.email = (e.target as HTMLInputElement).value;
		clearError('email');
	}

	// ── Email Verify ──
	let isVerifying = $state(false);

	async function openEmailModal() {
		if (isVerifying) return;
		const email = onboardingState.data.email?.trim();
		if (!email) return;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			onboardingState.setErrors({
				...onboardingState.errors,
				email: 'Enter a valid email address'
			});
			return;
		}

		isVerifying = true;
		try {
			const checkRes = await fetch('/api/auth/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role: 'dsa' })
			});
			const check = await checkRes.json();
			if (!checkRes.ok || !check.success) {
				onboardingState.setErrors({
					...onboardingState.errors,
					email: check.error || 'Email check failed'
				});
				return;
			}

			const sendRes = await fetch('/api/auth/send-email-verification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role: 'dsa' })
			});
			const send = await sendRes.json();
			if (!sendRes.ok || !send.success) {
				onboardingState.setErrors({
					...onboardingState.errors,
					email: send.error || 'Failed to send OTP'
				});
				return;
			}

			emailVerificationState.setContext(email, 'dsa');
			dialogState.showEmailOtpModal = true;
		} catch {
			addToast({ type: 'error', message: 'Network error. Try again.' });
		} finally {
			isVerifying = false;
		}
	}

	// Init city search from state
	$effect(() => {
		if (onboardingState.data.workingCity && !citySearch) {
			citySearch = onboardingState.data.workingCity;
		}
	});
</script>

<div class="space-y-6">
	<!-- Name -->
	<div>
		<label for="ob_name" class="mb-1.5 block text-sm font-medium text-white/70">
			Full Name <span class="text-[var(--ddsa-error)]">*</span>
		</label>
		<input
			id="ob_name"
			type="text"
			value={onboardingState.data.name}
			oninput={handleNameInput}
			placeholder="Your full name"
			maxlength={100}
			class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 transition outline-none focus:border-[var(--ddsa-primary-400)]/50 focus:ring-1 focus:ring-[var(--ddsa-primary-400)]/30"
		/>
		{#if onboardingState.errors.name}
			<p class="mt-1 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.name}</p>
		{/if}
	</div>

	<!-- PAN -->
	<div>
		<label for="ob_pan" class="mb-1.5 block text-sm font-medium text-white/70">
			PAN Number <span class="text-[var(--ddsa-error)]">*</span>
		</label>
		<input
			id="ob_pan"
			type="text"
			value={onboardingState.data.panNumber || ''}
			oninput={handlePanInput}
			placeholder="ABCDE1234F"
			maxlength={10}
			class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-mono text-sm tracking-wider text-white uppercase placeholder-white/30 transition outline-none focus:border-[var(--ddsa-primary-400)]/50 focus:ring-1 focus:ring-[var(--ddsa-primary-400)]/30"
		/>
		{#if onboardingState.errors.panNumber}
			<p class="mt-1 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.panNumber}</p>
		{/if}
	</div>

	<!-- Working City (searchable) -->
	<div class="relative">
		<label for="ob_city" class="mb-1.5 block text-sm font-medium text-white/70">
			Working City <span class="text-[var(--ddsa-error)]">*</span>
		</label>
		<input
			id="ob_city"
			type="text"
			bind:value={citySearch}
			oninput={() => {
				showCityDropdown = true;
				clearError('workingCity');
			}}
			onfocus={() => {
				if (citySearch.length >= 2) showCityDropdown = true;
			}}
			placeholder="Start typing your city..."
			class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 transition outline-none focus:border-[var(--ddsa-primary-400)]/50 focus:ring-1 focus:ring-[var(--ddsa-primary-400)]/30"
		/>
		{#if showCityDropdown && filteredCities.length > 0}
			<div
				class="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-[var(--ddsa-secondary-700)] shadow-xl"
			>
				{#each filteredCities as city}
					<button
						type="button"
						class="w-full px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/[0.06]"
						onclick={() => selectCity(city)}
					>
						{city}
					</button>
				{/each}
			</div>
		{/if}
		{#if onboardingState.data.workingCity}
			<p class="mt-1 text-xs text-emerald-400/70">Selected: {onboardingState.data.workingCity}</p>
		{/if}
		{#if onboardingState.errors.workingCity}
			<p class="mt-1 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.workingCity}</p>
		{/if}
	</div>

	<!-- Email (optional) -->
	<div>
		<label for="ob_email" class="mb-1.5 block text-sm font-medium text-white/70">
			Email <span class="text-xs text-white/30">(optional)</span>
		</label>
		<div class="flex gap-2">
			<input
				id="ob_email"
				type="email"
				value={onboardingState.data.email || ''}
				oninput={handleEmailInput}
				placeholder="you@example.com"
				readonly={emailVerificationState.verified}
				class="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 transition outline-none focus:border-[var(--ddsa-primary-400)]/50 focus:ring-1 focus:ring-[var(--ddsa-primary-400)]/30 {emailVerificationState.verified
					? 'opacity-60'
					: ''}"
			/>
			{#if onboardingState.data.email && !emailVerificationState.verified}
				<button
					type="button"
					onclick={openEmailModal}
					disabled={isVerifying}
					class="shrink-0 rounded-xl border border-[var(--ddsa-primary-400)]/30 bg-[var(--ddsa-primary-400)]/10 px-4 py-3 text-xs font-medium text-[var(--ddsa-primary-300)] transition hover:bg-[var(--ddsa-primary-400)]/20 disabled:opacity-50"
				>
					{isVerifying ? 'Sending...' : 'Verify'}
				</button>
			{/if}
		</div>
		{#if emailVerificationState.verified}
			<p class="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
				<BadgeCheck class="h-3.5 w-3.5" /> Verified
			</p>
		{:else if onboardingState.errors.email}
			<p class="mt-1 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.email}</p>
		{:else}
			<p class="mt-1 text-xs text-white/25">For notifications and updates</p>
		{/if}
	</div>
</div>
