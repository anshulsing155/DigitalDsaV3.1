<script lang="ts">
	import { RefreshCw } from '$lib/utils/iconRegistry';

	interface Props {
		caseId: string;
		onStaleDetected: (staleLenders: Array<{ lender_name: string }>) => void;
	}

	let { caseId, onStaleDetected }: Props = $props();

	let checking = $state(false);
	let lastResult = $state<'current' | 'stale' | null>(null);
	let staleCount = $state(0);
	let error = $state<string | null>(null);

	async function checkStaleness() {
		checking = true;
		error = null;

		try {
			const res = await fetch(`/api/cases/${caseId}/results/staleness`);
			const json = await res.json();

			if (!res.ok || !json.success) {
				error = json.error || 'Failed to check';
				return;
			}

			const { stale_lenders, has_stale } = json.data;

			if (has_stale) {
				lastResult = 'stale';
				staleCount = stale_lenders.length;
				onStaleDetected(stale_lenders);
			} else {
				lastResult = 'current';
				staleCount = 0;
			}
		} catch {
			error = 'Network error';
		} finally {
			checking = false;
		}
	}
</script>

<div class="check-updates">
	<button
		type="button"
		class="check-btn {lastResult === 'stale'
			? 'check-btn-stale'
			: lastResult === 'current'
				? 'check-btn-current'
				: ''}"
		onclick={checkStaleness}
		disabled={checking}
	>
		<RefreshCw size={14} class={checking ? 'animate-spin' : ''} />
		{#if checking}
			Checking...
		{:else if lastResult === 'stale'}
			{staleCount} lender{staleCount > 1 ? 's' : ''} updated
		{:else if lastResult === 'current'}
			All current
		{:else}
			Check for Updates
		{/if}
	</button>

	{#if error}
		<p class="check-error">{error}</p>
	{/if}
</div>

<style>
	.check-updates {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.check-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-card);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.check-btn:hover:not(:disabled) {
		border-color: var(--dash-btn-ghost-border);
		color: var(--dash-accent-text);
		background: var(--dash-btn-ghost-bg);
	}

	.check-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.check-btn-stale {
		border-color: var(--dash-contrast-ghost-border);
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
	}

	.check-btn-stale:hover:not(:disabled) {
		border-color: var(--dash-contrast-ghost-border);
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
		opacity: 0.9;
	}

	.check-btn-current {
		border-color: var(--dash-btn-ghost-border);
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.check-btn-current:hover:not(:disabled) {
		border-color: var(--dash-btn-ghost-border);
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		opacity: 0.9;
	}

	.check-error {
		margin-top: 0.25rem;
		font-size: 0.625rem;
		color: var(--dash-contrast-text);
	}
</style>
