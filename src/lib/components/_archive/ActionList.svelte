<script lang="ts">
	import { t } from '$lib/i18n';
	import { CircleCheck, CircleHelp, CircleAlert, Sparkles, ChevronRight } from 'lucide-svelte';

	export interface ActionItem {
		id: string;
		priority: 'ready' | 'help' | 'urgent';
		title: string;
		subtitle?: string;
		actionText: string;
		icon?: string;
		onclick?: () => void;
	}

	interface Props {
		actions: ActionItem[];
		maxItems?: number;
		onViewAll?: () => void;
	}

	let { actions, maxItems = 5, onViewAll = () => {} }: Props = $props();

	const visibleActions = $derived(actions.slice(0, maxItems));
	const hasMore = $derived(actions.length > maxItems);

	const priorityIconMap = {
		ready: CircleCheck,
		help: CircleHelp,
		urgent: CircleAlert
	};
</script>

<div
	class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
>
	<h3 class="mb-4 text-sm font-semibold text-[var(--dash-text)]">
		{t('action.whatToDoToday')}
	</h3>

	{#if visibleActions.length === 0}
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<div
				class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
			>
				<Sparkles size={24} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<p class="text-sm font-medium text-[var(--dash-text)]">Nothing urgent right now!</p>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">Keep an eye on your applications.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each visibleActions as action, index (action.id)}
				{@const PriorityIcon = priorityIconMap[action.priority]}
				<button
					type="button"
					class="group flex w-full items-center gap-3 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-3 text-left transition-all hover:border-[var(--ddsa-primary-300)] hover:bg-[var(--dash-btn-ghost-bg)] active:scale-[0.99]"
					onclick={() => action.onclick?.()}
					aria-label="Action: {action.title}"
				>
					<!-- Number badge -->
					<div
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-sm font-semibold text-[var(--dash-accent-text)]"
					>
						{index + 1}
					</div>

					<!-- Content -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<h4 class="truncate text-sm font-medium text-[var(--dash-text)]">
								{action.title}
							</h4>
							<PriorityIcon
								size={14}
								strokeWidth={2}
								class="shrink-0 text-[var(--dash-accent-text)]"
							/>
						</div>

						{#if action.subtitle}
							<p class="mt-0.5 truncate text-xs text-[var(--dash-text-secondary)]">
								{action.subtitle}
							</p>
						{/if}
					</div>

					<!-- Action CTA -->
					<div
						class="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--dash-accent-text)]"
					>
						<span class="hidden sm:inline">{action.actionText}</span>
						<ChevronRight
							size={14}
							strokeWidth={2}
							class="text-[var(--dash-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--dash-accent-text)]"
						/>
					</div>
				</button>
			{/each}
		</div>

		{#if hasMore}
			<button
				type="button"
				class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--dash-border-light)] py-2.5 text-sm font-medium text-[var(--dash-text)] transition-all hover:border-[var(--ddsa-primary-300)] hover:bg-[var(--dash-btn-ghost-bg)]"
				onclick={onViewAll}
				aria-label="View all actions"
			>
				<span>{t('action.viewAll')}</span>
				<span
					class="rounded-full bg-[var(--dash-btn-bg)] px-2 py-0.5 text-xs font-bold text-[var(--dash-btn-text)]"
				>
					+{actions.length - maxItems}
				</span>
			</button>
		{/if}
	{/if}
</div>
