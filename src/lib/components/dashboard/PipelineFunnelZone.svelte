<script lang="ts">
	/**
	 * PipelineFunnelZone — horizontal-bar funnel of the RM's pipeline.
	 * Audit fix (RM dashboard audit 2026-05-30): the pipeline data
	 * (stage → label → count → color) was computed in the server load but
	 * never rendered. This component surfaces it without adding any new
	 * server query. Empty stages render with a muted track so the funnel
	 * shape stays visible.
	 *
	 * Bar widths are normalized against the largest count in the set so
	 * the busiest stage hits 100%. Counts are shown to the right of each
	 * label for absolute context.
	 */

	interface PipelineStage {
		stage: string;
		label: string;
		count: number;
		color: string;
	}

	interface Props {
		pipeline: PipelineStage[];
		/** Hide stages whose label starts with "Quota" (internal-only). */
		hideQuotaBlocked?: boolean;
	}

	let { pipeline, hideQuotaBlocked = true }: Props = $props();

	const visible = $derived(
		hideQuotaBlocked
			? pipeline.filter((s) => !s.label.toLowerCase().startsWith('quota'))
			: pipeline
	);

	const maxCount = $derived(Math.max(1, ...visible.map((s) => s.count)));
	const totalCount = $derived(visible.reduce((sum, s) => sum + s.count, 0));
</script>

{#if totalCount > 0}
	<section class="funnel-zone">
		<div class="zone-header">
			<h2 class="zone-title">Case Pipeline</h2>
			<span class="zone-meta">{totalCount} case{totalCount === 1 ? '' : 's'} total</span>
		</div>

		<div class="funnel-list card-glass">
			{#each visible as stage (stage.stage)}
				{@const pct = (stage.count / maxCount) * 100}
				<div class="funnel-row">
					<div class="funnel-label">{stage.label}</div>
					<div class="funnel-track" aria-hidden="true">
						<div
							class="funnel-bar"
							style:width="{pct}%"
							style:background={stage.count > 0 ? stage.color : 'var(--dash-border-light)'}
						></div>
					</div>
					<div class="funnel-count" class:funnel-count-zero={stage.count === 0}>
						{stage.count}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.funnel-zone {
		margin-bottom: 2rem;
	}

	.zone-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.zone-title {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dash-text-secondary);
	}

	.zone-meta {
		font-size: 0.75rem;
		color: var(--dash-text-muted);
	}

	.funnel-list {
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.funnel-row {
		display: grid;
		grid-template-columns: 7rem 1fr 2.5rem;
		align-items: center;
		gap: 0.75rem;
	}

	.funnel-label {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.funnel-track {
		height: 0.625rem;
		background: var(--dash-bg-alt);
		border-radius: 9999px;
		overflow: hidden;
	}

	.funnel-bar {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.3s ease-out;
		min-width: 0.125rem;
	}

	.funnel-count {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-text-primary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.funnel-count-zero {
		color: var(--dash-text-muted);
		font-weight: 400;
	}

	@media (max-width: 640px) {
		.funnel-row {
			grid-template-columns: 5.5rem 1fr 2rem;
			gap: 0.5rem;
		}
		.funnel-label {
			font-size: 0.75rem;
		}
	}
</style>
