<script lang="ts">
	import { FileText, ArrowRight, GitCompare, CheckCircle, AlertCircle } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf.js';
	import type { PolicyDocument, PendingChange, LegacyDiscrepancy } from '$lib/config/pms/policyTypes.js';

	let {
		policyId,
		pendingChanges,
		currentSections,
		publishedSnapshot,
		pipelineMode,
		finalScore,
		legacyComparison
	}: {
		policyId: string;
		pendingChanges: (Omit<PendingChange, 'changedAt' | 'rmAcknowledgedAt'> & {
			changedAt: string;
			rmAcknowledgedAt: string | null;
		})[];
		currentSections: PolicyDocument['sections'];
		publishedSnapshot:
			| { version: number; sections: PolicyDocument['sections']; publishedAt: string | null }
			| null;
		pipelineMode: 'automated' | 'manual_entry' | null;
		finalScore: number | null;
		legacyComparison: {
			comparedAt: string;
			discrepancies: LegacyDiscrepancy[];
			resolvedAt: string | null;
			resolvedBy: string | null;
		} | null;
	} = $props();

	// ── Pending-changes view ────────────────────────────────────────────────────

	const isRevision = $derived(publishedSnapshot !== null && pendingChanges.length > 0);

	const byGroup = $derived.by(() => {
		const groups = new Map<string, typeof pendingChanges>();
		for (const pc of pendingChanges) {
			const parts = pc.field.split('.');
			const groupKey = parts[1] ?? 'other';
			if (!groups.has(groupKey)) groups.set(groupKey, []);
			groups.get(groupKey)!.push(pc);
		}
		return groups;
	});

	// ── Legacy comparison view ──────────────────────────────────────────────────

	// Each discrepancy has its own local radio state
	type LocalDecision = 'pms_wins' | 'legacy_wins' | 'ask_rm';
	let localDecisions = $state<Record<string, LocalDecision>>({});

	// Pre-fill from already-resolved discrepancies on mount
	$effect(() => {
		if (!legacyComparison) return;
		const prefill: Record<string, LocalDecision> = {};
		for (const d of legacyComparison.discrepancies) {
			if (d.resolution === 'pms_wins') prefill[d.field] = 'pms_wins';
			else if (d.resolution === 'legacy_wins_pending_rm') prefill[d.field] = 'legacy_wins';
		}
		localDecisions = prefill;
	});

	const pendingDiscrepancies = $derived(
		legacyComparison?.discrepancies.filter((d) => d.resolution === 'pending') ?? []
	);
	const allDecided = $derived(
		pendingDiscrepancies.length > 0 &&
			pendingDiscrepancies.every((d) => localDecisions[d.field] !== undefined)
	);

	let resolveLoading = $state(false);
	let resolveError = $state('');
	let resolveSuccess = $state('');

	async function submitResolutions(): Promise<void> {
		if (!legacyComparison || pendingDiscrepancies.length === 0) return;
		resolveLoading = true;
		resolveError = '';
		resolveSuccess = '';

		const decisions = pendingDiscrepancies
			.filter((d) => localDecisions[d.field] !== undefined)
			.map((d) => ({ field: d.field, resolution: localDecisions[d.field] }));

		try {
			const res = await secureFetch(`/api/pms/policies/${policyId}/legacy-resolve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ decisions })
			});
			const json = await res.json();
			if (!res.ok) {
				resolveError = json.error ?? 'Resolution failed.';
			} else {
				resolveSuccess = json.data?.message ?? 'Resolutions saved.';
				// Re-run server load so fresh legacyComparison state appears.
				await invalidateAll();
			}
		} catch {
			resolveError = 'Network error — please try again.';
		} finally {
			resolveLoading = false;
		}
	}

	// ── Shared formatters ───────────────────────────────────────────────────────

	function formatValue(v: unknown): string {
		if (v === null || v === undefined) return '—';
		if (typeof v === 'boolean') return v ? 'Yes' : 'No';
		if (Array.isArray(v)) return v.length === 0 ? '(empty)' : v.join(', ');
		if (typeof v === 'object') return JSON.stringify(v);
		return String(v);
	}

	function leafName(field: string): string {
		return field.split('.').slice(2).join('.') || field;
	}

	function humanField(field: string): string {
		const map: Record<string, string> = {
			'eligibility.cibil_floor': 'CIBIL Floor',
			'foir.salaried': 'FOIR — Salaried',
			'foir.selfEmployed': 'FOIR — Self-Employed',
			'roi.offerRate': 'ROI Offer Rate',
			'tenure.maxMonths': 'Max Tenure (months)',
			'tenure.maxAgeAtMaturity': 'Max Age at Maturity',
			'fees.processingFeePercent': 'Processing Fee %',
			'ltv.tierMaxValues': 'LTV Tier Values'
		};
		if (field in map) return map[field];
		// income.haircut.salaried_regular → "Haircut: salaried_regular"
		if (field.startsWith('income.haircut.')) {
			return `Haircut: ${field.replace('income.haircut.', '').replace(/_/g, ' ')}`;
		}
		return field;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<div class="space-y-6">

	<!-- ── Legacy Comparison Panel ─────────────────────────────────────────── -->
	{#if legacyComparison}
		<div class="overflow-hidden rounded-xl border border-amber-200 bg-white">
			<div class="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-3">
				<div class="flex items-center gap-2">
					<GitCompare size={15} class="text-amber-600" />
					<h3 class="text-sm font-semibold text-amber-800">Legacy Policy Comparison</h3>
				</div>
				<div class="flex items-center gap-3 text-xs text-amber-700">
					<span>Compared {formatDate(legacyComparison.comparedAt)}</span>
					{#if legacyComparison.resolvedAt}
						<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
							<CheckCircle size={10} /> Resolved {formatDate(legacyComparison.resolvedAt)}
						</span>
					{:else if legacyComparison.discrepancies.length > 0}
						<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
							<AlertCircle size={10} /> {pendingDiscrepancies.length} pending
						</span>
					{/if}
				</div>
			</div>

			{#if legacyComparison.discrepancies.length === 0}
				<div class="px-4 py-6 text-center text-sm text-gray-500">
					No discrepancies — PMS and legacy are in sync.
				</div>
			{:else}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
							<th class="px-4 py-2 w-1/4">Field</th>
							<th class="px-4 py-2 w-1/5">Legacy value</th>
							<th class="px-4 py-2 w-1/5">PMS value</th>
							<th class="px-4 py-2 w-2/5">Resolution</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each legacyComparison.discrepancies as d (d.field)}
							{@const isPending = d.resolution === 'pending'}
							<tr class="align-middle {isPending ? 'bg-white' : 'bg-gray-50 opacity-80'}">
								<td class="px-4 py-2.5 font-medium text-gray-700 text-xs">{humanField(d.field)}</td>
								<td class="px-4 py-2.5 font-mono text-xs text-amber-700">{formatValue(d.legacyValue)}</td>
								<td class="px-4 py-2.5 font-mono text-xs text-blue-700">{formatValue(d.pmsValue)}</td>
								<td class="px-4 py-2.5">
									{#if !isPending}
										<!-- Already resolved -->
										<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
											{d.resolution === 'pms_wins' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}">
											{d.resolution === 'pms_wins' ? 'PMS wins' : 'Legacy wins — RM notified'}
										</span>
									{:else}
										<!-- Pending — 3-way radio -->
										<fieldset class="flex gap-3">
											{#each ['pms_wins', 'legacy_wins', 'ask_rm'] as opt (opt)}
												<label class="flex cursor-pointer items-center gap-1 text-[11px]">
													<input
														type="radio"
														name="resolve-{d.field}"
														value={opt}
														bind:group={localDecisions[d.field]}
														class="accent-amber-600"
													/>
													<span class="select-none">
														{opt === 'pms_wins' ? 'PMS wins' : opt === 'legacy_wins' ? 'Legacy wins' : 'Ask RM'}
													</span>
												</label>
											{/each}
										</fieldset>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- Resolve button — only visible when there are pending discrepancies -->
				{#if pendingDiscrepancies.length > 0}
					<div class="flex items-center justify-between border-t border-amber-100 bg-amber-50 px-4 py-3">
						{#if resolveError}
							<span class="text-xs text-red-600">{resolveError}</span>
						{:else if resolveSuccess}
							<span class="text-xs text-green-700">{resolveSuccess}</span>
						{:else}
							<span class="text-xs text-amber-700">
								Decide each field above, then submit all resolutions.
								<br />
								<strong>Legacy wins</strong> creates a PendingChange for the RM to review.
								<strong>Ask RM</strong> flags the field without a suggested value.
							</span>
						{/if}
						<button
							type="button"
							onclick={submitResolutions}
							disabled={!allDecided || resolveLoading}
							class="ml-4 shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{resolveLoading ? 'Saving…' : 'Resolve all'}
						</button>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- ── Pending Changes / AI Summary ────────────────────────────────────── -->
	{#if isRevision}
		<div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
			This is a <strong>revision</strong> of live v{publishedSnapshot?.version}.
			{pendingChanges.length} field{pendingChanges.length === 1 ? ' has' : 's have'} been edited.
		</div>

		{#each [...byGroup.entries()] as [group, changes] (group)}
			<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
				<div class="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
						{group} · {changes.length} change{changes.length === 1 ? '' : 's'}
					</h3>
				</div>
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
							<th class="px-4 py-2 w-1/4">Field</th>
							<th class="px-4 py-2 w-1/3">Was</th>
							<th class="px-4 py-2 w-1/3">Now</th>
							<th class="px-4 py-2 w-1/6">Changed</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each changes as pc (pc.field)}
							<tr class="align-top">
								<td class="px-4 py-2.5 font-mono text-xs text-gray-600">{leafName(pc.field)}</td>
								<td class="px-4 py-2.5 text-gray-500 line-through decoration-red-300">{formatValue(pc.oldValue)}</td>
								<td class="px-4 py-2.5 font-semibold text-gray-900">
									<span class="inline-flex items-center gap-1">
										<ArrowRight size={11} class="text-amber-500" />
										{formatValue(pc.newValue)}
									</span>
								</td>
								<td class="px-4 py-2.5 text-[11px] text-gray-400">{formatDate(pc.changedAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	{:else if pipelineMode === 'automated'}
		<div class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="mb-3 flex items-center gap-2">
				<FileText size={16} class="text-gray-500" />
				<h3 class="text-sm font-semibold text-gray-800">AI Pipeline Summary</h3>
			</div>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
				<div class="flex justify-between">
					<dt class="text-gray-500">Encoding mode</dt>
					<dd class="font-medium text-gray-700">Automated (6-pass)</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Final score</dt>
					<dd class="font-semibold {finalScore && finalScore >= 80 ? 'text-green-700' : finalScore && finalScore >= 60 ? 'text-amber-700' : 'text-[var(--color-error)]'}">
						{finalScore ?? '—'}%
					</dd>
				</div>
			</dl>
			<p class="mt-4 text-xs text-gray-400">
				Fresh encoding — no prior published version to diff against. See the
				Reconciliation Log tab for the clause-by-clause breakdown.
			</p>
		</div>
	{:else if !legacyComparison}
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
			No changes recorded.
		</div>
	{/if}
</div>
