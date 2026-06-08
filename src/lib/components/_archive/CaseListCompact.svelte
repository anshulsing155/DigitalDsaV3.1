<script lang="ts">
	import { ROUTES } from '$lib/config/routes.js';
	import { FileText, Plus } from 'lucide-svelte';

	interface CompactCase {
		case_id: string;
		label: string;
		loan_type: string;
		stage: string;
		stage_label: string;
		lenders: string[];
		updated_at: string;
		is_sample: boolean;
	}

	interface Props {
		cases: CompactCase[];
		maxItems?: number;
		showViewAll?: boolean;
		viewAllHref?: string;
		caseBasePath?: string;
	}

	let {
		cases,
		maxItems = 5,
		showViewAll = true,
		viewAllHref = '/dashboard/dsa/cases',
		caseBasePath = '/dashboard/dsa/cases'
	}: Props = $props();

	const displayed = $derived(cases.slice(0, maxItems));

	function getStageClasses(stage: string): string {
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

	function formatTimeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
		return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	}
</script>

<div class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm">
	<div
		class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-4 py-3"
	>
		<h3 class="text-sm font-semibold text-[var(--dash-text)]">Recent Cases</h3>
		<span
			class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]"
			>{cases.length}</span
		>
	</div>

	{#if cases.length === 0}
		<div class="flex flex-col items-center justify-center px-4 py-10 text-center">
			<div
				class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
			>
				<FileText size={24} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No cases yet</p>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				Create your first case to get started
			</p>
			<a
				href={ROUTES.FORM.HOW_CAN_WE_HELP}
				class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-medium text-[var(--dash-btn-text)] transition-all hover:brightness-105"
			>
				<Plus size={14} strokeWidth={2} />
				New Case
			</a>
		</div>
	{:else}
		<div class="divide-y divide-[var(--dash-border)]">
			{#each displayed as caseItem}
				<a
					href="{caseBasePath}/{caseItem.case_id}"
					class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--dash-hover)]"
				>
					<!-- Stage dot indicator -->
					<div
						class="h-2 w-2 shrink-0 rounded-full {['sanctioned', 'disbursed'].includes(
							caseItem.stage
						)
							? 'bg-[var(--ddsa-secondary-400)]'
							: ['rejected', 'dropped', 'closed'].includes(caseItem.stage)
								? 'bg-gray-300 dark:bg-gray-600'
								: caseItem.stage === 'query'
									? 'bg-[var(--ddsa-primary-600)]'
									: 'bg-[var(--ddsa-primary-400)]'}"
					></div>

					<!-- Case info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-sm font-medium text-[var(--dash-text)]">
								{caseItem.label}
							</span>
							{#if caseItem.is_sample}
								<span
									class="shrink-0 rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[13px] font-medium text-[var(--dash-accent-text)] dark:bg-[var(--ddsa-primary-900)]/20 dark:text-[var(--ddsa-primary-300)]"
								>
									Sample
								</span>
							{/if}
						</div>
						<div
							class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--dash-text-secondary)]"
						>
							<span>{caseItem.loan_type}</span>
							{#if caseItem.lenders.length > 0}
								<span class="text-[var(--dash-text-muted)]">|</span>
								<span class="truncate"
									>{caseItem.lenders.slice(0, 2).join(', ')}{caseItem.lenders.length > 2
										? ` +${caseItem.lenders.length - 2}`
										: ''}</span
								>
							{/if}
						</div>
					</div>

					<!-- Stage badge + time -->
					<div class="flex shrink-0 flex-col items-end gap-1">
						<span
							class="rounded-full px-2 py-0.5 text-[13px] font-medium {getStageClasses(
								caseItem.stage
							)}"
						>
							{caseItem.stage_label}
						</span>
						<span class="text-[13px] text-[var(--dash-text-muted)]"
							>{formatTimeAgo(caseItem.updated_at)}</span
						>
					</div>
				</a>
			{/each}
		</div>

		{#if showViewAll && cases.length > maxItems}
			<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
				<a
					href={viewAllHref}
					class="block text-center text-xs font-medium text-[var(--dash-accent-text)] hover:underline"
				>
					View All {cases.length} Cases
				</a>
			</div>
		{:else if showViewAll}
			<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
				<a
					href={viewAllHref}
					class="block text-center text-xs font-medium text-[var(--dash-accent-text)] hover:underline"
				>
					View All Cases
				</a>
			</div>
		{/if}
	{/if}
</div>
