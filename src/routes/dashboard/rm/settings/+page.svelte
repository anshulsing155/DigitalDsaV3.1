<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import DataExportSection from '$lib/components/account/DataExportSection.svelte';
	import ActiveSessionsSection from '$lib/components/account/ActiveSessionsSection.svelte';

	// ── Types ────────────────────────────────────────────────────
	interface RmProfile {
		name: string;
		email: string;
		rmOfficialEmail: string;
		workingCity: string;
		bankName: string;
		designation: string;
		mobileNumber: number;
		preferred_language: string;
		profileStatus: 'profile_incomplete' | 'active';
		memberSince: string;
	}

	// ── Server data (three states: profile / setup / error) ──────
	const data = $derived(
		$page.data as { profile: RmProfile | null; canSetup: boolean; profileError: boolean }
	);
	const profile = $derived(data.profile);
	const canSetup = $derived(data.canSetup);
	const profileError = $derived(data.profileError);

	// ── Dropdown options ────────────────────────────────────────
	const CITIES = [
		'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata',
		'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
		'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
		'Ranchi', 'Faridabad', 'Coimbatore'
	];

	const DESIGNATIONS = [
		{ value: 'RM', label: 'RM' },
		{ value: 'Senior RM', label: 'Senior RM' },
		{ value: 'Credit Manager', label: 'Credit Manager' },
		{ value: 'Branch Manager', label: 'Branch Manager' },
		{ value: 'Other', label: 'Other' }
	];

	const BANKS = [
		'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India', 'Kotak Mahindra Bank',
		'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank of India',
		'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'Federal Bank', 'Bajaj Finserv',
		'Tata Capital', 'L&T Finance', 'Aditya Birla Finance', 'Other'
	];

	// ═══════════════════════════════════════════════════════════════
	// RENDER (a) — edit existing profile
	// ═══════════════════════════════════════════════════════════════
	let editName = $state('');
	let editWorkingCity = $state('');
	let editDesignation = $state('');
	let saving = $state(false);
	let saveMessage = $state('');
	let saveError = $state(false);
	let initialized = $state(false);

	$effect(() => {
		if (profile && !canSetup && !initialized) {
			editName = profile.name;
			editWorkingCity = profile.workingCity;
			editDesignation = profile.designation;
			initialized = true;
		}
	});

	const hasChanges = $derived(
		profile !== null &&
			(editName.trim() !== profile.name ||
				editWorkingCity !== profile.workingCity ||
				editDesignation !== profile.designation)
	);
	const nameValid = $derived(editName.trim().length >= 2);
	const canSave = $derived(hasChanges && nameValid && !saving);

	const formattedMobile = $derived(
		profile?.mobileNumber
			? `+91 ${String(profile.mobileNumber).replace(/(\d{5})(\d{5})/, '$1 $2')}`
			: ''
	);
	const formattedMemberSince = $derived(
		profile?.memberSince
			? new Date(profile.memberSince).toLocaleDateString('en-IN', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: ''
	);

	async function handleSave() {
		if (!canSave) return;
		saving = true;
		saveMessage = '';
		saveError = false;

		const updatePayload: Record<string, string> = {};
		if (editName.trim() !== profile!.name) updatePayload.name = editName.trim();
		if (editWorkingCity !== profile!.workingCity) updatePayload.workingCity = editWorkingCity;
		if (editDesignation !== profile!.designation) updatePayload.designation = editDesignation;

		try {
			const res = await secureFetch('/api/rm/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatePayload)
			});
			const result = await res.json();
			if (res.ok && result.success) {
				saveMessage = 'Profile updated successfully';
				saveError = false;
				initialized = false;
				await invalidateAll();
			} else {
				saveMessage = result.error || 'Failed to update profile';
				saveError = true;
			}
		} catch {
			saveMessage = 'Network error. Please check your connection and try again.';
			saveError = true;
		} finally {
			saving = false;
		}
	}

	function handleReset() {
		if (!profile) return;
		editName = profile.name;
		editWorkingCity = profile.workingCity;
		editDesignation = profile.designation;
		saveMessage = '';
		saveError = false;
	}

	// ═══════════════════════════════════════════════════════════════
	// RENDER (b) — complete-your-profile setup form
	// ═══════════════════════════════════════════════════════════════
	let setupName = $state('');
	let setupOfficialEmail = $state('');
	let setupBank = $state('');
	let setupDesignation = $state('');
	let setupWorkingCity = $state('');
	let creating = $state(false);
	let setupError = $state('');
	let setupInitialized = $state(false);

	// Prefill from any partial stub data the load returned.
	$effect(() => {
		if (canSetup && profile && !setupInitialized) {
			setupName = profile.name || '';
			setupOfficialEmail = profile.rmOfficialEmail || profile.email || '';
			setupBank = profile.bankName || '';
			setupDesignation = profile.designation || '';
			setupWorkingCity = profile.workingCity || '';
			setupInitialized = true;
		}
	});

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupOfficialEmail.trim()));
	const canCreate = $derived(
		setupName.trim().length >= 2 &&
			emailValid &&
			setupBank.trim().length > 0 &&
			setupWorkingCity.trim().length > 0 &&
			!creating
	);
	const setupMobile = $derived(
		profile?.mobileNumber
			? `+91 ${String(profile.mobileNumber).replace(/(\d{5})(\d{5})/, '$1 $2')}`
			: ''
	);

	async function handleCreate() {
		if (!canCreate) return;
		creating = true;
		setupError = '';
		try {
			const res = await secureFetch('/api/rm/profile/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: setupName.trim(),
					officialEmail: setupOfficialEmail.trim(),
					bankName: setupBank.trim(),
					designation: setupDesignation.trim(),
					workingCity: setupWorkingCity.trim()
				})
			});
			const result = await res.json();
			if (res.ok && result.success) {
				// Re-run the load → page transitions to the profile view (a).
				await invalidateAll();
			} else {
				setupError = result.error || 'Could not create your profile. Please try again.';
			}
		} catch {
			setupError = 'Network error. Please check your connection and try again.';
		} finally {
			creating = false;
		}
	}

	// ═══════════════════════════════════════════════════════════════
	// RENDER (c) — retry on genuine load failure
	// ═══════════════════════════════════════════════════════════════
	let retrying = $state(false);
	async function handleRetry() {
		retrying = true;
		await invalidateAll();
		retrying = false;
	}

	const inputClass =
		'w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] transition-colors placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-primary-500)] focus:ring-2 focus:ring-[var(--ddsa-primary-500)]/20 focus:outline-none';
	const labelClass = 'mb-1.5 block text-xs font-medium text-[var(--dash-text-secondary)]';
</script>

<svelte:head>
	<title>Settings - RM Dashboard</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">
			{canSetup ? 'Complete your RM profile' : 'Settings'}
		</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			{canSetup
				? 'We need a few details to set up your partner account.'
				: 'Manage your RM profile information'}
		</p>
	</div>

	{#if profileError}
		<!-- ═══ (c) Genuine load failure — retryable ═══ -->
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-[var(--dash-text)]">
				We couldn't load your profile right now.
			</h3>
			<p class="mt-2 text-sm text-[var(--dash-text-secondary)]">
				This is on us, not you. Please try again.
			</p>
			<button
				type="button"
				onclick={handleRetry}
				disabled={retrying}
				class="mt-5 rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-all hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{retrying ? 'Retrying…' : 'Retry'}
			</button>
		</div>
	{:else if canSetup}
		<!-- ═══ (b) Complete-your-profile setup form ═══ -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm md:p-6"
		>
			<div class="space-y-5">
				<!-- Name -->
				<div>
					<label for="setup-name" class={labelClass}>Name <span class="text-[var(--dash-contrast-text)]">*</span></label>
					<input id="setup-name" type="text" bind:value={setupName} placeholder="Your full name" class={inputClass} />
				</div>

				<!-- Official email -->
				<div>
					<label for="setup-email" class={labelClass}>Official email <span class="text-[var(--dash-contrast-text)]">*</span></label>
					<input id="setup-email" type="email" bind:value={setupOfficialEmail} placeholder="you@yourbank.com" class={inputClass} />
					<p class="mt-1 text-xs text-[var(--dash-text-muted)]">Use your bank email so we can verify you.</p>
				</div>

				<!-- Bank -->
				<div>
					<label for="setup-bank" class={labelClass}>Bank <span class="text-[var(--dash-contrast-text)]">*</span></label>
					<select id="setup-bank" bind:value={setupBank} class={inputClass}>
						<option value="">Select your bank</option>
						{#each BANKS as bank}
							<option value={bank}>{bank}</option>
						{/each}
					</select>
				</div>

				<!-- Designation (optional) -->
				<div>
					<label for="setup-designation" class={labelClass}>Designation</label>
					<select id="setup-designation" bind:value={setupDesignation} class={inputClass}>
						<option value="">Select designation</option>
						{#each DESIGNATIONS as d}
							<option value={d.value}>{d.label}</option>
						{/each}
					</select>
				</div>

				<!-- Working city -->
				<div>
					<label for="setup-city" class={labelClass}>Working city <span class="text-[var(--dash-contrast-text)]">*</span></label>
					<select id="setup-city" bind:value={setupWorkingCity} class={inputClass}>
						<option value="">Select a city</option>
						{#each CITIES as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>

				<!-- Mobile (read-only) -->
				{#if setupMobile}
					<div>
						<span class={labelClass}>Mobile</span>
						<div class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2.5 text-sm font-semibold text-[var(--dash-text)]">
							{setupMobile}
							<span class="ml-2 text-xs font-normal text-[var(--dash-text-muted)]">(from login)</span>
						</div>
					</div>
				{/if}
			</div>

			{#if setupError}
				<div class="mt-4 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-sm font-medium text-[var(--dash-contrast-text)]">
					{setupError}
				</div>
			{/if}

			<div class="mt-6">
				<button
					type="button"
					onclick={handleCreate}
					disabled={!canCreate}
					title={canCreate ? '' : 'Fill the required fields marked *'}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-all hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{creating ? 'Creating…' : 'Create my profile'}
				</button>
			</div>
		</div>
	{:else if profile}
		<!-- ═══ (a) Existing profile — edit ═══ -->
		<div class="space-y-6">
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm md:p-6"
			>
				<h2 class="mb-5 text-sm font-semibold text-[var(--dash-text)]">Profile Information</h2>

				<div class="space-y-5">
					<!-- Name -->
					<div>
						<label for="rm-name" class={labelClass}>Name</label>
						<input id="rm-name" type="text" bind:value={editName} placeholder="Your full name" class={inputClass} />
						{#if editName.length > 0 && !nameValid}
							<p class="mt-1 text-xs text-[var(--dash-contrast-text)]">Name must be at least 2 characters</p>
						{/if}
					</div>

					<!-- Working City -->
					<div>
						<label for="rm-city" class={labelClass}>Working City</label>
						<select id="rm-city" bind:value={editWorkingCity} class={inputClass}>
							<option value="">Select a city</option>
							{#each CITIES as city}
								<option value={city}>{city}</option>
							{/each}
						</select>
					</div>

					<!-- Designation -->
					<div>
						<label for="rm-designation" class={labelClass}>Designation</label>
						<select id="rm-designation" bind:value={editDesignation} class={inputClass}>
							<option value="">Select designation</option>
							{#each DESIGNATIONS as d}
								<option value={d.value}>{d.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mt-6 flex items-center gap-3">
					<button
						type="button"
						onclick={handleSave}
						disabled={!canSave}
						class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-all hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if saving}
							<span class="inline-flex items-center gap-2">
								<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
									<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75" />
								</svg>
								Saving...
							</span>
						{:else}
							Save Changes
						{/if}
					</button>
					{#if hasChanges}
						<button
							type="button"
							onclick={handleReset}
							class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
						>
							Reset
						</button>
					{/if}
				</div>

				{#if saveMessage}
					<div
						class="mt-3 rounded-lg px-3 py-2 text-sm font-medium {saveError
							? 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
							: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'}"
					>
						{saveMessage}
					</div>
				{/if}
			</div>

			<!-- Read-only account details -->
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm md:p-6"
			>
				<h2 class="mb-5 text-sm font-semibold text-[var(--dash-text)]">Account Details</h2>
				<p class="mb-4 text-xs text-[var(--dash-text-muted)]">
					These fields cannot be edited. Contact support if you need changes.
				</p>

				<div class="space-y-4">
					<div
						class="flex items-center justify-between rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-3"
					>
						<div>
							<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Mobile Number</p>
							<p class="mt-0.5 text-sm font-semibold text-[var(--dash-text)]">{formattedMobile}</p>
						</div>
					</div>

					{#if profile.rmOfficialEmail || profile.email}
						<div
							class="flex items-center justify-between rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-3"
						>
							<div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Official Email</p>
								<p class="mt-0.5 text-sm font-semibold text-[var(--dash-text)]">
									{profile.rmOfficialEmail || profile.email}
								</p>
							</div>
						</div>
					{/if}

					{#if profile.bankName}
						<div
							class="flex items-center justify-between rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-3"
						>
							<div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Bank / NBFC</p>
								<p class="mt-0.5 text-sm font-semibold text-[var(--dash-text)]">{profile.bankName}</p>
								<p class="mt-0.5 text-[13px] text-[var(--dash-text-muted)]">Contact support to change</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Member since -->
			{#if formattedMemberSince}
				<div
					class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm md:p-6"
				>
					<div class="flex items-center gap-3">
						<div>
							<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Member Since</p>
							<p class="text-sm font-semibold text-[var(--dash-text)]">{formattedMemberSince}</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Fallback: no user / unexpected — treat as retryable error -->
		<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center">
			<h3 class="text-lg font-semibold text-[var(--dash-text)]">We couldn't load your profile right now.</h3>
			<p class="mt-2 text-sm text-[var(--dash-text-secondary)]">Please try again.</p>
			<button
				type="button"
				onclick={handleRetry}
				disabled={retrying}
				class="mt-5 rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-all hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{retrying ? 'Retrying…' : 'Retry'}
			</button>
		</div>
	{/if}

	<!-- E.1 — DPDP §11 self-export. Only shown to onboarded RMs (skip for
	     setup-needed + error states — they have nothing meaningful to export
	     yet). RM scope is minimal in v1 (profile only); full coverage of
	     policy versions + submissions is a follow-up tracked in the
	     E.1 assembler module's RM note. -->
	{#if !profileError && !canSetup && profile}
		<div class="mt-8">
			<DataExportSection />
		</div>

		<!-- E.3 — Active devices. Same gating as E.1 above. -->
		<div class="mt-6">
			<ActiveSessionsSection />
		</div>
	{/if}
</div>
