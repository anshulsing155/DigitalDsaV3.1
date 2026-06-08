<script lang="ts">
	import type { Activity } from '$lib/data/sampleDashboardData';

	interface Props {
		activities: Activity[];
		maxItems?: number;
		showViewAll?: boolean;
	}

	let { activities, maxItems = 5, showViewAll = true }: Props = $props();

	const displayed = $derived(activities.slice(0, maxItems));

	const dotColor: Record<Activity['type'], string> = {
		success: 'bg-[var(--ddsa-primary-400)]',
		info: 'bg-[var(--ddsa-primary-400)]',
		warning: 'bg-[var(--ddsa-primary-600)]',
		error: 'bg-[var(--ddsa-primary-600)]',
		neutral: 'bg-gray-400'
	};
</script>

<div
	class="activity-feed rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
>
	<h3 class="mb-4 text-sm font-semibold text-[var(--dash-text)]">Recent Activity</h3>
	<div class="space-y-0">
		{#each displayed as activity, i}
			<div class="flex gap-3 {i < displayed.length - 1 ? 'pb-4' : ''}">
				<div class="flex flex-col items-center">
					<div class="mt-1 h-2.5 w-2.5 rounded-full {dotColor[activity.type]}"></div>
					{#if i < displayed.length - 1}
						<div class="w-px flex-1 bg-[var(--dash-border)]"></div>
					{/if}
				</div>
				<div class="flex-1 pb-1">
					<p class="text-sm font-medium text-[var(--dash-text)]">{activity.title}</p>
					<p class="text-xs text-[var(--dash-text-secondary)]">{activity.description}</p>
					<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">{activity.time}</p>
				</div>
			</div>
		{/each}
	</div>
	{#if showViewAll && activities.length > maxItems}
		<button
			class="mt-3 w-full text-center text-xs font-medium text-[var(--dash-accent-text)] hover:underline"
		>
			View All Activity
		</button>
	{/if}
</div>

<style>
	@media (max-width: 768px) {
		.activity-feed {
			padding: 0.75rem;
		}
	}
</style>
