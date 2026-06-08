<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import OnboardingV2Wizard from '$lib/components/onboarding/v2/OnboardingV2Wizard.svelte';
	import type { DsaOnboardingV2Data } from '$lib/types/dsaOnboardingV2';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';
	import DataExportSection from '$lib/components/account/DataExportSection.svelte';
	import ActiveSessionsSection from '$lib/components/account/ActiveSessionsSection.svelte';
	import { secureFetch } from '$lib/utils/csrf';

	const data = $derived(
		$page.data as {
			v2Data: DsaOnboardingV2Data;
			painPointOptions: string[];
			availableModules: Array<{ id: string; name: string; description: string }>;
		}
	);

	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	async function handleSave(saveData: DsaOnboardingV2Data) {
		try {
			const res = await secureFetch('/api/onboarding/dsa-onboarding-v2', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(saveData)
			});
			const result = await res.json();
			if (result.success) {
				showToast('Progress saved');
			} else {
				showToast(result.error || 'Failed to save', 'error');
			}
		} catch {
			showToast('Network error. Please try again.', 'error');
		}
	}

	async function handleComplete(completeData: DsaOnboardingV2Data) {
		try {
			const res = await secureFetch('/api/onboarding/dsa-onboarding-v2', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(completeData)
			});
			const result = await res.json();
			if (result.success) {
				showToast('Business profile completed!');
				setTimeout(() => goto('/dashboard/dsa'), 1000);
			} else {
				showToast(result.error || 'Failed to complete', 'error');
			}
		} catch {
			showToast('Network error. Please try again.', 'error');
		}
	}
</script>

<svelte:head>
	<title>Profile | DigitalDSA</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">Business Profile</h1>
				<PageTourButton pageId="profile" />
			</div>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Set up your business profile to unlock personalized recommendations
			</p>
		</div>
		{#if data.v2Data.onboarding_v2_completed}
			<span
				data-walkthrough="profile-complete-badge"
				class="inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-accent-text)]"
			>
				<svg
					class="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Completed
			</span>
		{/if}
	</div>

	<!-- Wizard -->
	<div data-walkthrough="profile-stepper">
		<OnboardingV2Wizard
			initialData={data.v2Data}
			onSave={handleSave}
			onComplete={handleComplete}
			painPointOptions={data.painPointOptions}
			availableModules={data.availableModules}
		/>
	</div>

	<!-- E.1 — DPDP §11 self-export. Sits below the wizard so business-profile
	     setup remains the primary action; data-export is a secondary privacy
	     control accessed from the same page. Self-contained component; the
	     endpoint resolves user identity from the session. -->
	<div class="mt-8">
		<DataExportSection />
	</div>

	<!-- E.3 — Active devices. Same placement rationale as the export
	     section above. Self-contained; the endpoint handles role gating. -->
	<div class="mt-6">
		<ActiveSessionsSection />
	</div>
</div>

<!-- Toast notification -->
{#if toastMessage}
	<div class="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
		<div
			class="rounded-xl px-4 py-3 text-sm font-medium shadow-lg
			{toastType === 'success'
				? 'bg-[var(--ddsa-accent-500)] text-white'
				: 'bg-[var(--dash-contrast-text)] text-white'}"
		>
			{toastMessage}
		</div>
	</div>
{/if}
