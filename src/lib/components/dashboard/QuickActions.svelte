<script lang="ts">
	interface Action {
		label: string;
		icon: any;
		href: string;
		primary?: boolean;
	}

	interface Props {
		actions: Action[];
	}

	let { actions }: Props = $props();
</script>

<div
	class="quick-actions-wrap rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
>
	<h3 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Quick Actions</h3>
	<div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
		{#each actions as action}
			{@const Icon = action.icon}
			<a
				href={action.href}
				class="quick-action-btn flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center transition-all hover:shadow-sm
					{action.primary
					? 'border-[var(--ddsa-primary-300)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] hover:border-[var(--ddsa-primary-400)] hover:bg-[var(--dash-btn-ghost-bg)]'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--ddsa-primary-300)] hover:bg-[var(--dash-btn-ghost-bg)]'}"
			>
				<div
					class="flex h-9 w-9 items-center justify-center rounded-lg {action.primary
						? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)]'
						: 'bg-[var(--dash-btn-ghost-bg)]'}"
				>
					{#if typeof Icon === 'string'}
						<span class="text-lg">{Icon}</span>
					{:else}
						<Icon
							size={18}
							strokeWidth={1.5}
							class={action.primary ? 'text-white' : 'text-[var(--dash-accent-text)]'}
						/>
					{/if}
				</div>
				<span class="text-xs font-medium">{action.label}</span>
			</a>
		{/each}
	</div>
</div>

<style>
	@media (max-width: 768px) {
		.quick-actions-wrap {
			padding: 0.75rem;
		}

		.quick-action-btn {
			padding-top: 0.75rem;
			padding-bottom: 0.75rem;
			min-height: 2.75rem;
		}
	}
</style>
