<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/state/auth.svelte';
	import { ROUTES } from '$lib/config/routes.js';

	// Derived values (Svelte 5 runes)
	const isAuthenticated = $derived(authState.isAuthenticated);

	type Item = {
		href: string;
		label: string;
		icon: 'home' | 'tag' | 'file' | 'user' | 'apps' | 'settings';
		restricted?: boolean;
	};

	const items: Item[] = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/loan-offers', label: 'Loans', icon: 'tag' },
		{ href: ROUTES.FORM.HOW_CAN_WE_HELP, label: 'Apply', icon: 'file' },
		{ href: '/dashboard', label: 'Profile', icon: 'user', restricted: true }
		// Optionally expose Applications & Settings mapping to dashboard for now
		// { href: '/dashboard', label: 'Applications', icon: 'apps', restricted: true },
		// { href: '/dashboard', label: 'Settings', icon: 'settings', restricted: true }
	];

	function handleClick(item: Item, e: MouseEvent) {
		e.preventDefault();
		if (item.restricted && !isAuthenticated) {
			const encoded = encodeURIComponent(item.href);
			goto(`/login?redirect=${encoded}`);
			return;
		}
		goto(item.href);
	}
</script>

<nav aria-label="Bottom navigation" class="safe-bottom fixed right-0 bottom-0 left-0 z-40">
	<div class="mx-auto max-w-md">
		<div
			class="relative border-t border-[var(--dash-border)] bg-[var(--dash-bg-card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--dash-bg-card)]/70"
			style="padding-bottom: env(safe-area-inset-bottom);"
		>
			<ul class="grid grid-cols-4">
				{#each items as item}
					<li>
						<a
							href={item.href}
							onclick={(e) => handleClick(item, e)}
							class="group flex flex-col items-center justify-center py-2"
							aria-current={$page.url.pathname === item.href ? 'true' : undefined}
						>
							{#if item.icon === 'home'}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									aria-hidden="true"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M3 9l9-7 9 7" /><path d="M9 22V12h6v10" /></svg
								>
							{:else if item.icon === 'tag'}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M20 12V7a2 2 0 0 0-2-2h-5" /><path
										d="m3 7 9 9 7-7-9-9H7a4 4 0 0 0-4 4Z"
									/></svg
								>
							{:else if item.icon === 'file'}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path
										d="M14 2v6h6"
									/></svg
								>
							{:else if item.icon === 'user'}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
										cx="12"
										cy="7"
										r="4"
									/></svg
								>
							{:else if item.icon === 'apps'}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><rect x="3" y="3" width="7" height="7" /><rect
										x="14"
										y="3"
										width="7"
										height="7"
									/><rect x="14" y="14" width="7" height="7" /><rect
										x="3"
										y="14"
										width="7"
										height="7"
									/></svg
								>
							{:else}
								<svg
									class="h-6 w-6 text-[var(--dash-text-muted)] group-[aria-current=true]:text-indigo-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path
										d="M9 18h6M10 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"
									/></svg
								>
							{/if}
							<span
								class="mt-1 text-xs font-medium text-[var(--dash-text)] group-[aria-current=true]:text-indigo-700"
								>{item.label}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</nav>

<style>
	nav {
		pointer-events: auto;
	}
</style>
