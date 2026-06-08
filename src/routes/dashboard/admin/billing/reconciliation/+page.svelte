<script lang="ts">
	/**
	 * Admin reconciliation view (D.1 S7).
	 * Lists daily ReconciliationRuns; row-expand shows per-discrepancy
	 * detail (provider_payment_id, amount, dsa_id, age) so the operator
	 * can drill into Razorpay dashboard or our MongoDB without leaving
	 * the page.
	 */
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AlertTriangle, CheckCircle, RefreshCw, ChevronRight, ChevronDown } from 'lucide-svelte';

	const data = $derived($page.data);

	let expandedRunId = $state<string | null>(null);
	// Intentional snapshot of the initial URL-driven filter: the checkbox
	// drives a goto() which re-renders the whole page with a fresh URL
	// param, so we don't need the rune to track changes to data.filters.
	// (Pitfall #10 — silencing the warning since the read-once is correct.)
	// svelte-ignore state_referenced_locally
	let driftOnly = $state<boolean>(data.filters?.driftOnly ?? false);

	function toggleExpand(id: string) {
		expandedRunId = expandedRunId === id ? null : id;
	}

	function changeDriftFilter() {
		const url = new URL($page.url);
		if (driftOnly) url.searchParams.set('drift_only', '1');
		else url.searchParams.delete('drift_only');
		url.searchParams.delete('page'); // reset paging
		goto(url.toString(), { keepFocus: true });
	}

	function gotoPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url.toString(), { keepFocus: true });
	}

	function formatRupees(paise: number): string {
		return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
	}

	function formatDateTime(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function statusLabel(status: string): string {
		if (status === 'clean') return 'Clean';
		if (status === 'drift') return 'Drift';
		if (status === 'critical_drift') return 'CRITICAL';
		return status;
	}
</script>

<svelte:head>
	<title>Reconciliation — Admin — DigitalDSA</title>
</svelte:head>

<div class="recon-page">
	<header class="recon-header">
		<div>
			<h1 class="recon-title">Reconciliation</h1>
			<p class="recon-subtitle">
				Daily settlement vs. our billing transactions. Runs at 04:00 IST.
			</p>
		</div>
		<label class="recon-filter">
			<input type="checkbox" bind:checked={driftOnly} onchange={changeDriftFilter} />
			Show only days with drift
		</label>
	</header>

	{#if data.runs.length === 0}
		<div class="recon-empty">
			<RefreshCw size={24} />
			<p>
				{#if data.filters?.driftOnly}
					No drift detected in any past reconciliation run. Uncheck the filter to see clean runs.
				{:else}
					No reconciliation runs yet. The cron runs daily at 04:00 IST.
				{/if}
			</p>
		</div>
	{:else}
		<div class="recon-table">
			<div class="recon-row recon-row-header">
				<span style="width: 1.5rem"></span>
				<span class="col-date">Date</span>
				<span class="col-status">Status</span>
				<span class="col-counts">Matched / Drift</span>
				<span class="col-provider">Provider</span>
				<span class="col-email">Email</span>
				<span class="col-when">Run at</span>
			</div>

			{#each data.runs as run (run._id)}
				{@const isExpanded = expandedRunId === run._id}
				{@const driftCount = run.discrepancies.length}
				<div class="recon-row" class:recon-row-critical={run.status === 'critical_drift'}>
					<button
						class="recon-expand-btn"
						aria-label={isExpanded ? 'Collapse' : 'Expand'}
						aria-expanded={isExpanded}
						onclick={() => toggleExpand(run._id)}
					>
						{#if isExpanded}
							<ChevronDown size={14} />
						{:else}
							<ChevronRight size={14} />
						{/if}
					</button>
					<span class="col-date">{run.run_date}</span>
					<span class="col-status">
						<span class="recon-badge recon-badge-{run.status}">
							{#if run.status === 'clean'}
								<CheckCircle size={12} />
							{:else}
								<AlertTriangle size={12} />
							{/if}
							{statusLabel(run.status)}
						</span>
					</span>
					<span class="col-counts">
						{run.matched} matched
						{#if driftCount > 0}
							·
							<span class="recon-drift">{driftCount} drift</span>
						{/if}
					</span>
					<span class="col-provider">{run.provider}</span>
					<span class="col-email">
						{#if run.status !== 'clean'}
							{run.drift_email_sent ? '✓ sent' : '✗ failed'}
						{:else}
							—
						{/if}
					</span>
					<span class="col-when">{formatDateTime(run.run_at)}</span>
				</div>

				{#if isExpanded}
					<div class="recon-drilldown">
						<div class="recon-drilldown-summary">
							<div><strong>Window:</strong> {formatDateTime(run.window_from)} → {formatDateTime(run.window_to)}</div>
							<div>
								<strong>Provider entries:</strong> {run.provider_entries} ·
								<strong>Our transactions:</strong> {run.our_transactions} ·
								<strong>Matched:</strong> {run.matched}
							</div>
							<div class="recon-counts-grid">
								<span>Missing-our-side: <strong class="recon-critical-text">{run.counts.missing_our_side}</strong></span>
								<span>Missing-provider-side: <strong>{run.counts.missing_provider_side}</strong></span>
								<span>Amount mismatch: <strong>{run.counts.amount_mismatch}</strong></span>
								<span>Unmatched ₹1 auth: <strong>{run.counts.unmatched_test_auth}</strong></span>
							</div>
						</div>

						{#if run.discrepancies.length === 0}
							<p class="recon-clean-msg">Clean run — every settlement matched our records.</p>
						{:else}
							<table class="recon-disc-table">
								<thead>
									<tr>
										<th>Kind</th>
										<th>Payment ID</th>
										<th>Amount</th>
										<th>Type / Age</th>
										<th>When</th>
										<th>DSA</th>
									</tr>
								</thead>
								<tbody>
									{#each run.discrepancies as d}
										<tr class:recon-disc-critical={d.kind === 'missing-our-side'}>
											<td class="recon-disc-kind">{d.kind}</td>
											<td><code>{d.provider_payment_id}</code></td>
											<td>
												{#if d.kind === 'missing-our-side'}
													{formatRupees(d.settled_amount_paise)}
												{:else if d.kind === 'amount-mismatch'}
													settled {formatRupees(d.settled_amount_paise)} / ours {formatRupees(d.our_amount_paise)}
												{:else}
													{formatRupees(d.our_amount_paise)}
												{/if}
											</td>
											<td>
												{#if d.kind === 'missing-our-side'}
													{d.type}
												{:else if d.kind === 'unmatched-test-auth'}
													{d.age_hours.toFixed(1)}h old
												{:else}
													—
												{/if}
											</td>
											<td>
												{#if d.kind === 'missing-our-side'}
													{formatDateTime(d.settled_at)}
												{:else if d.kind === 'missing-provider-side' || d.kind === 'unmatched-test-auth'}
													{formatDateTime(d.our_recorded_at)}
												{:else}
													—
												{/if}
											</td>
											<td>
												{#if d.kind !== 'missing-our-side'}
													<code class="recon-dsa-id">{d.dsa_id}</code>
												{:else}
													—
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				{/if}
			{/each}
		</div>

		<div class="recon-pager">
			<button
				class="recon-btn"
				disabled={data.pagination.page === 1}
				onclick={() => gotoPage(data.pagination.page - 1)}
			>
				Previous
			</button>
			<span class="recon-pager-info">
				Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.totalCount} runs total
			</span>
			<button
				class="recon-btn"
				disabled={data.pagination.page >= data.pagination.totalPages}
				onclick={() => gotoPage(data.pagination.page + 1)}
			>
				Next
			</button>
		</div>
	{/if}
</div>

<style>
	.recon-page {
		max-width: 80rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}

	.recon-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.recon-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--dash-text);
		margin: 0;
	}

	.recon-subtitle {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin: 0.25rem 0 0;
	}

	.recon-filter {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
	}

	.recon-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--dash-text-secondary);
		font-size: 0.875rem;
	}

	.recon-empty p {
		margin: 0;
		text-align: center;
		max-width: 32rem;
	}

	.recon-table {
		border: 1px solid var(--dash-border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.recon-row {
		display: grid;
		grid-template-columns: 1.5rem 6rem 7rem 1fr 6rem 5rem 9rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		color: var(--dash-text);
		border-bottom: 1px solid var(--dash-border-light, #e5e7eb);
	}

	.recon-row-header {
		background: var(--dash-bg-alt);
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	.recon-row:last-child {
		border-bottom: none;
	}

	.recon-row-critical {
		background: var(--ddsa-error-bg, #fef2f2);
	}

	.recon-expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		color: var(--dash-text-secondary);
		padding: 0;
	}

	.recon-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.recon-badge-clean {
		background: #d1fae5;
		color: #065f46;
	}

	.recon-badge-drift {
		background: #fef3c7;
		color: #92400e;
	}

	.recon-badge-critical_drift {
		background: #fee2e2;
		color: #991b1b;
	}

	.recon-drift {
		color: #b91c1c;
		font-weight: 600;
	}

	.recon-drilldown {
		padding: 1rem 1.25rem;
		background: var(--dash-bg-alt);
		border-bottom: 1px solid var(--dash-border-light, #e5e7eb);
		font-size: 0.8125rem;
	}

	.recon-drilldown-summary {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
		color: var(--dash-text-secondary);
	}

	.recon-counts-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.875rem;
	}

	.recon-critical-text {
		color: #b91c1c;
	}

	.recon-clean-msg {
		text-align: center;
		color: var(--dash-text-secondary);
		font-style: italic;
		margin: 0.5rem 0;
	}

	.recon-disc-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border-light, #e5e7eb);
		border-radius: 0.375rem;
		overflow: hidden;
	}

	.recon-disc-table th {
		background: var(--dash-bg-alt);
		padding: 0.5rem 0.625rem;
		text-align: left;
		font-weight: 600;
		color: var(--dash-text-secondary);
		border-bottom: 1px solid var(--dash-border-light, #e5e7eb);
	}

	.recon-disc-table td {
		padding: 0.5rem 0.625rem;
		border-bottom: 1px solid var(--dash-border-light, #e5e7eb);
		color: var(--dash-text);
	}

	.recon-disc-table tr:last-child td {
		border-bottom: none;
	}

	.recon-disc-critical {
		background: var(--ddsa-error-bg, #fef2f2);
	}

	.recon-disc-kind {
		font-weight: 600;
		font-family: monospace;
	}

	.recon-dsa-id {
		font-size: 0.6875rem;
		color: var(--dash-text-secondary);
	}

	.recon-pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		margin-top: 1.25rem;
	}

	.recon-pager-info {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
	}

	.recon-btn {
		padding: 0.5rem 0.875rem;
		border-radius: 0.375rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-card);
		color: var(--dash-text);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
	}

	.recon-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.recon-btn:hover:not(:disabled) {
		background: var(--dash-bg-hover, #f3f4f6);
	}

	/* Dark mode */
	:global(.dark) .recon-badge-clean {
		background: #064e3b;
		color: #a7f3d0;
	}

	:global(.dark) .recon-badge-drift {
		background: #78350f;
		color: #fde68a;
	}

	:global(.dark) .recon-badge-critical_drift {
		background: #7f1d1d;
		color: #fecaca;
	}

	@media (max-width: 900px) {
		.recon-row {
			grid-template-columns: 1.5rem 1fr 1fr 1fr;
			row-gap: 0.25rem;
		}

		.recon-row > .col-provider,
		.recon-row > .col-email,
		.recon-row > .col-when {
			grid-column: 2 / span 3;
			font-size: 0.75rem;
			color: var(--dash-text-secondary);
		}
	}
</style>
