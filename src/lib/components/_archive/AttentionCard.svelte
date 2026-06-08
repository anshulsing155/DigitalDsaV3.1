<script lang="ts">
	import {
		MessageCircleQuestion,
		FileWarning,
		PauseCircle,
		CircleCheck,
		ChevronRight
	} from 'lucide-svelte';

	interface AttentionItem {
		type: 'open_query' | 'expiring_document' | 'stuck_stage';
		case_id: string;
		label: string;
		description: string;
		severity: 'warning' | 'critical';
		days: number;
		stage?: string;
		stage_label?: string;
	}

	interface Props {
		items: AttentionItem[];
		maxItems?: number;
		basePath?: string;
	}

	let { items, maxItems = 4, basePath = '/dashboard/dsa/cases' }: Props = $props();

	const displayed = $derived(items.slice(0, maxItems));
	const remaining = $derived(Math.max(0, items.length - maxItems));

	const typeIconMap: Record<string, any> = {
		open_query: MessageCircleQuestion,
		expiring_document: FileWarning,
		stuck_stage: PauseCircle
	};

	const typeLabels: Record<string, string> = {
		open_query: 'Open Query',
		expiring_document: 'Expiring Doc',
		stuck_stage: 'Stuck'
	};

	const severityStyles: Record<string, { card: string; iconBg: string; iconText: string }> = {
		critical: {
			card: 'bg-[var(--dash-btn-ghost-bg)] border-[var(--ddsa-primary-200)] dark:bg-[var(--ddsa-primary-900)]/10 dark:border-[var(--ddsa-primary-800)]/30',
			iconBg: 'bg-[var(--ddsa-primary-500)]/15 dark:bg-[var(--dash-btn-ghost-bg)]',
			iconText: 'text-[var(--dash-accent-text)] dark:text-[var(--ddsa-primary-300)]'
		},
		warning: {
			card: 'bg-[var(--dash-bg-alt)] border-[var(--dash-border)] dark:bg-[var(--dash-bg-alt)] dark:border-[var(--dash-border)]',
			iconBg: 'bg-[var(--ddsa-secondary-200)]/40 dark:bg-[var(--ddsa-secondary-500)]/10',
			iconText: 'text-[var(--dash-text-secondary)] dark:text-[var(--ddsa-secondary-400)]'
		}
	};

	function getStageClasses(stage?: string): string {
		if (!stage) return '';
		if (['sanctioned', 'disbursed'].includes(stage)) {
			return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)] dark:bg-[var(--ddsa-secondary-700)]/20 dark:text-[var(--ddsa-secondary-300)]';
		}
		if (['rejected', 'dropped', 'closed'].includes(stage)) {
			return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
		}
		if (stage === 'query') {
			return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--ddsa-primary-800)] dark:bg-[var(--ddsa-primary-800)]/20 dark:text-[var(--ddsa-primary-200)]';
		}
		// Default: active stages
		return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] dark:bg-[var(--ddsa-primary-900)]/20 dark:text-[var(--ddsa-primary-300)]';
	}
</script>

<div
	class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[var(--dash-text)]">Needs Attention</h3>
		{#if items.length > 0}
			<span
				class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] px-1.5 text-[13px] font-bold text-[var(--dash-accent-text)] dark:bg-[var(--ddsa-primary-800)]/20 dark:text-[var(--ddsa-primary-300)]"
			>
				{items.length}
			</span>
		{/if}
	</div>

	{#if items.length === 0}
		<div class="flex flex-col items-center justify-center py-6 text-center">
			<div
				class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-bg-alt)] dark:bg-[var(--ddsa-secondary-700)]/20"
			>
				<CircleCheck
					size={20}
					strokeWidth={1.5}
					class="text-[var(--dash-text-secondary)] dark:text-[var(--ddsa-secondary-400)]"
				/>
			</div>
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">All clear!</p>
			<p class="text-xs text-[var(--dash-text-muted)]">No cases need your attention right now</p>
		</div>
	{:else}
		<div class="space-y-2.5">
			{#each displayed as item}
				{@const styles = severityStyles[item.severity]}
				{@const TypeIcon = typeIconMap[item.type]}
				<a
					href="{basePath}/{item.case_id}"
					class="flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm {styles.card}"
				>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {styles.iconBg}">
						{#if TypeIcon}
							<TypeIcon size={16} strokeWidth={1.5} class={styles.iconText} />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="truncate text-xs font-semibold text-[var(--dash-text)]"
								>{item.label}</span
							>
							<span
								class="shrink-0 rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[13px] font-medium text-[var(--dash-text-secondary)]"
								>{typeLabels[item.type]}</span
							>
							{#if item.stage && item.stage_label}
								<span
									class="shrink-0 rounded-full px-1.5 py-0.5 text-[13px] font-medium {getStageClasses(
										item.stage
									)}"
								>
									{item.stage_label}
								</span>
							{/if}
						</div>
						<p class="mt-0.5 text-xs leading-relaxed text-[var(--dash-text-secondary)]">
							{item.description}
						</p>
					</div>
					<ChevronRight
						size={16}
						strokeWidth={1.5}
						class="mt-1 shrink-0 text-[var(--dash-text-muted)]"
					/>
				</a>
			{/each}
		</div>

		{#if remaining > 0}
			<a
				href="{basePath}?attention=true"
				class="mt-3 block text-center text-xs font-medium text-[var(--dash-accent-text)] hover:underline"
			>
				+{remaining} more item{remaining === 1 ? '' : 's'} needing attention
			</a>
		{/if}
	{/if}
</div>
