<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';
	import { browser } from '$app/environment';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	async function handleSignUp() {
		// Clear demo auth and redirect to login for real sign-up
		await secureFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
		if (browser) {
			document.cookie = 'accessToken=; path=/; max-age=0';
			document.cookie = 'refreshToken=; path=/; max-age=0';
			document.cookie = 'activeRole=; path=/; max-age=0';
			window.location.href = '/login';
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
	>
		<div class="w-full max-w-sm rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
			<!-- Lock Icon -->
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40"
			>
				<svg
					class="h-7 w-7 text-amber-600 dark:text-amber-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
					/>
				</svg>
			</div>

			<h3 class="mb-2 text-center text-lg font-bold text-[var(--dash-text)]">Sign Up Required</h3>

			<p class="mb-5 text-center text-sm text-[var(--dash-text-secondary)]">
				Only registered users can create or edit case files. Sign up to unlock full access.
			</p>

			<div class="flex gap-3">
				<button
					onclick={onclose}
					class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Continue Demo
				</button>
				<button
					onclick={handleSignUp}
					class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
				>
					Sign Up
				</button>
			</div>
		</div>
	</div>
{/if}
