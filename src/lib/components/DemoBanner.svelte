<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';
	import { browser } from '$app/environment';

	let dismissed = $state(false);

	async function exitDemo() {
		// Clear auth cookies by calling a simple fetch that will be handled by the login redirect
		await secureFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
		if (browser) {
			// Clear cookies client-side as fallback
			document.cookie = 'accessToken=; path=/; max-age=0';
			document.cookie = 'refreshToken=; path=/; max-age=0';
			document.cookie = 'activeRole=; path=/; max-age=0';
			window.location.href = '/login';
		}
	}
</script>

{#if !dismissed}
	<div
		class="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5 sm:px-6 dark:border-stone-800 dark:bg-stone-950/40"
	>
		<div class="flex min-w-0 items-center gap-2">
			<span class="flex-shrink-0 text-base">🎯</span>
			<p class="truncate text-sm text-stone-800 dark:text-stone-400">
				<span class="font-semibold">Demo Mode</span>
				<span class="hidden sm:inline"> — You're exploring with sample data.</span>
			</p>
		</div>
		<div class="flex flex-shrink-0 items-center gap-2">
			<button
				onclick={exitDemo}
				class="rounded-lg bg-stone-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
			>
				Sign Up
			</button>
			<button
				onclick={() => (dismissed = true)}
				class="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-900/40 dark:hover:text-stone-400"
				aria-label="Dismiss banner"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
{/if}
