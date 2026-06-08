<script lang="ts">
	import { walkthroughState } from '$lib/state/walkthrough.svelte';
	import type { TourMode } from '$lib/config/walkthrough/types';

	interface Props {
		variant: 'sidebar' | 'dashboard';
	}

	let { variant }: Props = $props();
	let isOpen = $state(false);

	function launchTour(mode: TourMode) {
		isOpen = false;
		walkthroughState.requestTour(mode);
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-tour-launcher]')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

{#if variant === 'sidebar'}
	<!-- Sidebar variant: matches nav item styling -->
	<div class="relative" data-walkthrough="tour-launcher-sidebar" data-tour-launcher>
		<button
			onclick={() => (isOpen = !isOpen)}
			class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--ddsa-accent-500)]"
		>
			<svg
				class="h-[18px] w-[18px]"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.8"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
				/>
			</svg>
			Guide
		</button>

		{#if isOpen}
			<div
				class="absolute bottom-full left-0 z-50 mb-2 w-52 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-1.5 shadow-lg"
			>
				<button
					onclick={() => launchTour('intro')}
					class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--ddsa-primary-50)]"
				>
					<svg
						class="h-4 w-4 shrink-0 text-[var(--ddsa-accent-500)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
						/>
					</svg>
					<span>Quick Tour</span>
					<span class="ml-auto text-[10px] text-[var(--dash-text-muted)]">~30s</span>
				</button>
				{#if walkthroughState.hasExplanatoryTour}
					<button
						onclick={() => launchTour('explanatory')}
						class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--ddsa-primary-50)]"
					>
						<svg
							class="h-4 w-4 shrink-0 text-[var(--ddsa-accent-500)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
							/>
						</svg>
						<span>Full Guide</span>
						<span class="ml-auto text-[10px] text-[var(--dash-text-muted)]">~2min</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- Dashboard variant: compact inline button -->
	<div class="relative inline-block" data-walkthrough="tour-launcher-dashboard" data-tour-launcher>
		<button
			onclick={() => (isOpen = !isOpen)}
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-all hover:border-[var(--ddsa-accent-500)]/50 hover:text-[var(--ddsa-accent-500)]"
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
					d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
				/>
			</svg>
			Guide
		</button>

		{#if isOpen}
			<div
				class="absolute top-full right-0 z-50 mt-1 w-52 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-1.5 shadow-lg"
			>
				<button
					onclick={() => launchTour('intro')}
					class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--ddsa-primary-50)]"
				>
					<svg
						class="h-4 w-4 shrink-0 text-[var(--ddsa-accent-500)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
						/>
					</svg>
					<span>Quick Tour</span>
					<span class="ml-auto text-[10px] text-[var(--dash-text-muted)]">~30s</span>
				</button>
				{#if walkthroughState.hasExplanatoryTour}
					<button
						onclick={() => launchTour('explanatory')}
						class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--ddsa-primary-50)]"
					>
						<svg
							class="h-4 w-4 shrink-0 text-[var(--ddsa-accent-500)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
							/>
						</svg>
						<span>Full Guide</span>
						<span class="ml-auto text-[10px] text-[var(--dash-text-muted)]">~2min</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
