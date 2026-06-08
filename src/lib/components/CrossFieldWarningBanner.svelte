<script lang="ts">
	import { AlertTriangle } from '$lib/utils/iconRegistry';
	import type { Contradiction } from '$lib/utils/crossStepValidator';

	// ── Category → tab navigation mapping ───────────────────────────
	// tabId must match the id used by each parent's tab system.
	// label is shown on the "→ Go to" button.
	const CATEGORY_NAV: Record<string, { label: string; tabId: string }> = {
		// Company modal tabs
		credit_obligation_mismatch: { label: 'CIBIL', tabId: 'credit_score' },
		turnover_mismatch: { label: 'Income', tabId: 'income' },
		premises_team_mismatch: { label: 'Character', tabId: 'character' },
		premises_category_mismatch: { label: 'Character', tabId: 'character' },
		company_no_directors: { label: 'Identity', tabId: 'identity' },
		// Individual modal tabs
		income_profile_incompatible: { label: 'Income', tabId: 'income_details' },
		no_income_obligations: { label: 'Obligations', tabId: 'obligations_details' },
		obligations_exceed_income: { label: 'Obligations', tabId: 'obligations_details' },
		emi_spouse_no_spouse: { label: 'Obligations', tabId: 'obligations_details' },
		borrower_zero_income: { label: 'Income', tabId: 'income_details' },
		no_primary_borrower: { label: 'Obligations', tabId: 'obligations_details' },
		nri_income_conflict: { label: 'Income', tabId: 'income_details' },
		education_profession_mismatch: { label: 'Income', tabId: 'income_details' }
	};

	interface Props {
		warnings: Contradiction[];
		/**
		 * Optional: parent supplies a tab-switch function so "→ [Tab]" works.
		 * Called with the tabId string (e.g. 'credit_score', 'income', …).
		 */
		onNavigate?: (tabId: string) => void;
		/** Optional: handle fixable contradictions (e.g., detach orphaned director) */
		onFixContradiction?: (contradiction: Contradiction) => void;
	}

	let { warnings, onNavigate, onFixContradiction }: Props = $props();

	// Group by applicant name
	const grouped = $derived.by(() => {
		const map = new Map<string, Contradiction[]>();
		for (const w of warnings) {
			const key = w.applicantName;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(w);
		}
		return map;
	});
</script>

{#if warnings.length > 0}
	<div class="warning-banner">
		<div class="warning-header">
			<AlertTriangle class="h-4 w-4 shrink-0 text-amber-500" />
			<span class="text-sm font-medium text-amber-700 dark:text-amber-300">
				{warnings.length} data inconsistenc{warnings.length === 1 ? 'y' : 'ies'} detected — fix to enable
				Submit
			</span>
		</div>

		{#each [...grouped] as [applicantName, items]}
			<div class="warning-group">
				<!-- Always show applicant name so user knows WHO has the issue -->
				<p
					class="mb-1 text-[10px] font-semibold tracking-wider text-amber-600/70 uppercase dark:text-amber-400/70"
				>
					{applicantName}
				</p>
				{#each items as item (item.id)}
					{@const nav = CATEGORY_NAV[item.category]}
					<div class="warning-item">
						<p class="flex-1 text-xs text-amber-800 dark:text-amber-200">{item.message}</p>
						{#if item.fixAction === 'detach' && onFixContradiction}
							<button type="button" class="resolve-btn" onclick={() => onFixContradiction(item)}>
								Detach from company
							</button>
						{:else if nav && onNavigate}
							<button type="button" class="resolve-btn" onclick={() => onNavigate(nav.tabId)}>
								→ {nav.label}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style>
	.warning-banner {
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-left: 3px solid #f59e0b;
		border-radius: 0.5rem;
		background: rgba(245, 158, 11, 0.06);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	:global(.dark) .warning-banner {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.25);
	}
	.warning-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	.warning-group {
		padding-top: 0.25rem;
	}
	.warning-group + .warning-group {
		border-top: 1px solid rgba(245, 158, 11, 0.15);
		margin-top: 0.5rem;
		padding-top: 0.5rem;
	}
	.warning-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}
	.warning-item + .warning-item {
		border-top: 1px dashed rgba(245, 158, 11, 0.12);
	}
	.resolve-btn {
		border-radius: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: #92400e;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.3);
		transition: background 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.resolve-btn:hover {
		background: rgba(245, 158, 11, 0.28);
	}
	:global(.dark) .resolve-btn {
		color: #fbbf24;
		background: rgba(245, 158, 11, 0.12);
	}
	:global(.dark) .resolve-btn:hover {
		background: rgba(245, 158, 11, 0.22);
	}
</style>
