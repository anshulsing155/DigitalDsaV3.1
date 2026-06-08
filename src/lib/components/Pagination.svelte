<script lang="ts">
	import { ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';

	interface Props {
		page: number;
		totalPages: number;
		totalCount?: number;
		onPageChange: (page: number) => void;
	}

	let { page, totalPages, totalCount, onPageChange }: Props = $props();

	let hasPrev = $derived(page > 1);
	let hasNext = $derived(page < totalPages);
</script>

{#if totalPages > 1}
	<div class="pagination">
		<button
			class="page-btn"
			class:page-btn-disabled={!hasPrev}
			disabled={!hasPrev}
			onclick={() => onPageChange(page - 1)}
			aria-label="Previous page"
		>
			<ChevronLeft size={16} />
			Previous
		</button>

		<span class="page-info">
			Page <strong>{page}</strong> of <strong>{totalPages}</strong>
			{#if totalCount != null}
				<span class="page-total">
					({totalCount.toLocaleString('en-IN')} entries)
				</span>
			{/if}
		</span>

		<button
			class="page-btn"
			class:page-btn-disabled={!hasNext}
			disabled={!hasNext}
			onclick={() => onPageChange(page + 1)}
			aria-label="Next page"
		>
			Next
			<ChevronRight size={16} />
		</button>
	</div>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 1.25rem;
		background: var(--dash-bg-card, #fff);
		border: 1px solid var(--dash-border, #e5e7eb);
		border-radius: 0.75rem;
	}

	.page-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 0.5rem;
		background: transparent;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.8125rem;
		color: var(--dash-text, #374151);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.page-btn:hover:not(:disabled) {
		background: var(--dash-bg-alt, #f3f4f6);
	}

	.page-btn-disabled {
		color: var(--dash-text-muted, #d1d5db);
		cursor: not-allowed;
	}

	.page-info {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.8125rem;
		color: var(--dash-text-secondary, #6b7280);
	}

	.page-info strong {
		color: var(--dash-text, #374151);
	}

	.page-total {
		display: none;
	}

	@media (min-width: 640px) {
		.page-total {
			display: inline;
			margin-left: 0.25rem;
			color: var(--dash-text-muted, #9ca3af);
		}
	}
</style>
