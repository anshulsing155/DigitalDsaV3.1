<script lang="ts">
	import { onMount } from 'svelte';
	import ErrorBoundary from '$lib/components/landing/ErrorBoundary.svelte';
	import KickedToast from '$lib/components/auth/KickedToast.svelte';
	import {
		startTokenRefreshScheduler,
		stopTokenRefreshScheduler
	} from '$lib/utils/csrf';
	import { createSessionStatusPoller } from '$lib/utils/sessionStatusPoller.svelte';

	let { children } = $props();

	// SEC-10 Commit C — kicked-side poll. Polls /api/auth/session-status
	// every ~8s while this tab is visible. When the server flips this
	// session's revoked_at (because another device confirmed a session-
	// conflict modal), the poll returns 401 and the toast + redirect
	// fires. Pure client-side; legacy sessions (no row recorded) stay
	// active until normal token expiry. Spec §6.
	const sessionPoller = createSessionStatusPoller();

	// Pitfall #54: proactive JWT refresh keeps long form-fill sessions alive.
	// Access tokens expire after 15 min — without a proactive refresh, the
	// next page navigation after expiry hits a hard 401 and the DSA loses
	// their place in a long form (user-reported 2026-05-26, BL form testing
	// session 401 on /form/how-can-we-help). Scheduler fires ~2 min before
	// expiry; reactive secureFetch refresh is still the fallback for API
	// calls that race the scheduler.
	onMount(() => {
		startTokenRefreshScheduler();
		sessionPoller.start();
		return () => {
			stopTokenRefreshScheduler();
			sessionPoller.stop();
		};
	});
</script>

<div class="min-h-screen">
	<ErrorBoundary>
		{@render children?.()}
	</ErrorBoundary>
	{#if sessionPoller.state.kicked}
		<KickedToast
			reason={sessionPoller.state.kicked.reason}
			at={sessionPoller.state.kicked.at}
		/>
	{/if}
</div>
