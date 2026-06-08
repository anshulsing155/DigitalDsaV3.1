<script lang="ts">
	import { walkthroughState } from '$lib/state/walkthrough.svelte';
	import type { PageTourId, TourMode } from '$lib/config/walkthrough/types';

	interface Props {
		pageId: PageTourId;
	}

	let { pageId }: Props = $props();

	// svelte-ignore state_referenced_locally
	const tourMode: TourMode = `page:${pageId}`;
	const isCompleted = $derived(walkthroughState.isPageTourCompleted(pageId));

	function launch() {
		walkthroughState.requestTour(tourMode);
	}
</script>

<button
	onclick={launch}
	data-walkthrough={`page-tour-${pageId}`}
	title={isCompleted ? 'Replay page guide' : 'Take page guide'}
	class="inline-flex items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-2 text-[var(--dash-text-muted)] transition-all hover:border-[var(--ddsa-accent-500)]/50 hover:text-[var(--ddsa-accent-500)] hover:shadow-sm"
>
	<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
		/>
	</svg>
	{#if isCompleted}
		<svg class="ml-0.5 h-2.5 w-2.5 text-emerald-500" fill="currentColor" viewBox="0 0 8 8">
			<circle cx="4" cy="4" r="3" />
		</svg>
	{/if}
</button>
