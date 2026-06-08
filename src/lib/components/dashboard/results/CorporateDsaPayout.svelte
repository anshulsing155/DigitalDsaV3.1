<script lang="ts">
	import { Handshake } from '$lib/utils/iconRegistry';

	// ── Props ────────────────────────────────────────────────────
	interface Recommendation {
		name: string;
		payout_percent: number;
		comparison: 'best' | 'better' | 'same';
		benefits?: string[];
	}

	interface Props {
		recommendations: Recommendation[];
	}

	let { recommendations }: Props = $props();

	// ── Limit to max 3 rows ─────────────────────────────────────
	const displayRows = $derived(recommendations.slice(0, 3));
</script>

<div class="py-3">
	{#if recommendations.length === 0}
		<p class="text-center text-xs text-[var(--dash-text-muted)]">
			No corporate DSA data available for this lender
		</p>
	{:else}
		<!-- Section header -->
		<div class="mb-2 flex items-center gap-1.5">
			<Handshake class="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
			<span
				class="text-[13px] font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
			>
				Corporate DSA Options
			</span>
		</div>

		<!-- Recommendation rows -->
		<div>
			{#each displayRows as rec (rec.name)}
				<div
					class="flex items-center justify-between border-b border-[var(--dash-border)] py-2.5 last:border-0"
				>
					<!-- Left: Name + benefits -->
					<div class="min-w-0 flex-1">
						<span class="text-xs font-semibold text-[var(--dash-text)]">{rec.name}</span>
						{#if rec.benefits && rec.benefits.length > 0}
							<p class="mt-0.5 text-[12px] text-[var(--dash-text-muted)]">
								{rec.benefits.join(', ')}
							</p>
						{/if}
					</div>

					<!-- Right: Payout % + BEST badge -->
					<div class="ml-3 flex shrink-0 items-center gap-1.5">
						<span class="text-sm font-bold text-[var(--dash-text)]">
							{rec.payout_percent}%
						</span>
						{#if rec.comparison === 'best'}
							<span
								class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
							>
								BEST
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
