<script lang="ts">
	import { Lightbulb, TrendingUp, TrendingDown } from '$lib/utils/iconRegistry';

	// ── Props ────────────────────────────────────────────────────
	interface Suggestion {
		id: string;
		title: string;
		description: string;
		potential_impact?: {
			metric: 'amount' | 'roi' | 'tenure';
			direction: 'increase' | 'decrease';
			estimated_value?: string;
		};
		effort: 'easy' | 'moderate' | 'significant';
	}

	interface Props {
		suggestions: Suggestion[];
	}

	let { suggestions }: Props = $props();

	// ── Effort badge config ─────────────────────────────────────
	const EFFORT_CONFIG: Record<Suggestion['effort'], { classes: string; label: string }> = {
		easy: {
			classes: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
			label: 'Easy'
		},
		moderate: {
			classes: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
			label: 'Moderate'
		},
		significant: {
			classes: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
			label: 'Significant'
		}
	};

	// ── Impact metric labels ────────────────────────────────────
	const METRIC_LABELS: Record<string, string> = {
		amount: 'Loan amount',
		roi: 'Interest rate',
		tenure: 'Tenure'
	};
</script>

<div class="space-y-2.5 py-3">
	{#each suggestions as suggestion (suggestion.id)}
		{@const effortConfig = EFFORT_CONFIG[suggestion.effort]}
		<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
			<!-- Header: icon + title + effort badge -->
			<div class="flex items-start gap-2">
				<Lightbulb class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dash-text-muted)]" />

				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-xs font-semibold text-[var(--dash-text)]">
							{suggestion.title}
						</span>
						<span class="rounded-full px-2 py-0.5 text-[12px] font-semibold {effortConfig.classes}">
							{effortConfig.label}
						</span>
					</div>

					<!-- Description -->
					<p class="mt-1 text-[13px] leading-relaxed text-[var(--dash-text-muted)]">
						{suggestion.description}
					</p>

					<!-- Potential impact -->
					{#if suggestion.potential_impact}
						{@const impact = suggestion.potential_impact}
						<div
							class="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--dash-accent-text)]"
						>
							{#if impact.direction === 'increase'}
								<TrendingUp class="h-3 w-3 shrink-0" />
							{:else}
								<TrendingDown class="h-3 w-3 shrink-0" />
							{/if}
							<span>
								Could {impact.direction}
								{METRIC_LABELS[impact.metric] ?? impact.metric}{#if impact.estimated_value}
									&nbsp;by {impact.estimated_value}{/if}
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/each}

	{#if suggestions.length === 0}
		<p class="text-center text-xs text-[var(--dash-text-muted)]">
			No improvement suggestions available.
		</p>
	{/if}
</div>
