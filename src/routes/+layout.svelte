<script lang="ts">
	import '../app.css';
	// import "cropperjs/dist/cropper.css";
	import { showEmailOtpModal } from '$lib/stores/modal';
	import ToastContainer from '$lib/components/auth/ToastContainer.svelte';
	import NavigationLoader from '$lib/components/NavigationLoader.svelte';
	import { onMount } from 'svelte';
	import { initMobileDetection } from '$lib/stores/stores.js';
	import { authState } from '$lib/state/auth.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { themeState } from '$lib/stores/theme.svelte';
	import { deviceFingerprinter } from '$lib/utils/deviceFingerprint';
	import { secureFetch } from '$lib/utils/csrf';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createAppQueryClient } from '$lib/utils/queryClient';
	import DunningBanner from '$lib/components/DunningBanner.svelte';

	// PERF-3: shared TanStack Query client. ONE per app instance — all
	// components share the same cache. Defaults in $lib/utils/queryClient.ts.
	// Off-the-shelf: any descendant component can `createQuery` / `createMutation`.
	const queryClient = createAppQueryClient();

	let { children, data } = $props();

	// Seed auth state from server data immediately — no async delay.
	// This ensures CTAs see correct auth state even before authState.init() finishes.
	$effect(() => {
		if (data?.user && !authState.isAuthenticated) {
			authState.seedFromServer(data.user);
		}
	});

	/** One-time migration: clean orphaned localStorage keys from old form-data + tabLock era */
	function migrateLocalStorage() {
		if (localStorage.getItem('ddsa-storage-migrated-v1')) return;
		const keysToRemove = [
			'home-loan-data',
			'home-application-data',
			'home-back-history',
			'home-applicant-step-touched',
			'home-page-index-object',
			'home-loan-page-index',
			'lap-page-index',
			'plot-loan-page-index',
			'business-loan-page-index',
			'personal-loan-page-index',
			'professional-loan-page-index',
			'home-applicant-index-number',
			'home-applicants-store',
			'home-applicants-store-payload',
			'income-profiles',
			'applicant-recovery',
			'denied-applicant-recovery-prefixes',
			'home-user-relationships',
			'home-user-reciprocal-relationships',
			'applicant-data-store',
			'ddsa_tab_lock',
			'formData'
		];
		for (const key of keysToRemove) {
			localStorage.removeItem(key);
		}
		localStorage.setItem('ddsa-storage-migrated-v1', '1');
	}

	/** Fire-and-forget: register device fingerprint with server */
	async function registerDevice() {
		try {
			const info = await deviceFingerprinter.getDeviceInfo();
			// secureFetch adds the CSRF token header — raw fetch gets 403 from
			// the server-side CSRF guard in hooks.server.ts (validateCSRF).
			await secureFetch('/api/auth/register-device', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fingerprint: info.fingerprint,
					deviceInfo: { type: info.type, os: info.os, browser: info.browser }
				})
			});
		} catch {
			// Silent — device registration is non-critical
		}
	}

	onMount(() => {
		migrateLocalStorage();
		themeState.init();
		setTimeout(async () => {
			initMobileDetection();
			await authState.init();
			await formState.init();

			// Register device fingerprint after auth is established (skip demo users)
			if (authState.isAuthenticated && authState.user?.id !== 'demo-guest') {
				registerDevice();
			}
		}, 100);
	});

	// async function verifyOtp(code: string) {

	// 	// Call your verify API here
	// 	// await verifyEmailOtpAPI(code);
	// }
</script>

<svelte:head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link rel="icon" href="/favicon.ico" type="image/x-icon" />
	<meta name="robots" content="index, follow" />
</svelte:head>

<NavigationLoader />

<QueryClientProvider client={queryClient}>
	<div class="app">
		<a href="#main-content" class="skip-link">Skip to main content</a>
		{#if data?.dunningBanner}
			<DunningBanner
				bannerState={data.dunningBanner.state}
				dunningStartedAtIso={data.dunningBanner.dunningStartedAtIso}
			/>
		{/if}
		<main id="main-content" class="main-content w-full">
			{@render children?.()}
		</main>

		<ToastContainer />
	</div>
</QueryClientProvider>

<style>
	.app {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.skip-link {
		position: absolute;
		top: -100%;
		left: 1rem;
		z-index: 9999;
		padding: 0.5rem 1rem;
		background: var(--ddsa-accent-500, #2563eb);
		color: white;
		border-radius: 0 0 0.5rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: top 0.15s ease;
	}

	.skip-link:focus {
		top: 0;
	}
</style>
