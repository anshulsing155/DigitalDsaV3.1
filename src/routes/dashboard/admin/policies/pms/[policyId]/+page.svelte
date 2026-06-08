<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, GitBranch, Inbox, GitCompare, Trash2, BarChart2, FileJson } from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf.js';
	import { invalidateAll, goto } from '$app/navigation';
	import ChangesTab from './_tabs/ChangesTab.svelte';
	import ReconciliationTab from './_tabs/ReconciliationTab.svelte';
	import DevQueueTab from './_tabs/DevQueueTab.svelte';
	import ImpactTab from './_tabs/ImpactTab.svelte';
	import ApproveModal from './_tabs/ApproveModal.svelte';
	import RejectModal from './_tabs/RejectModal.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'changes' | 'reconciliation' | 'dev_queue' | 'impact'>('changes');
	let approveModalOpen = $state(false);
	let rejectModalOpen = $state(false);

	// Legacy comparison state
	let compareLoading = $state(false);
	let compareError = $state('');
	let compareSuccess = $state('');

	const policy = $derived(data.policy);
	const isPublished = $derived(policy.status === 'published');
	const isSubmitted = $derived(policy.status === 'submitted');

	const legacyComparison = $derived(policy.legacyComparison ?? null);

	// "Run comparison" is disabled while an unresolved comparison exists
	const compareBlocked = $derived(
		legacyComparison !== null &&
			legacyComparison.resolvedAt === null &&
			legacyComparison.discrepancies.length > 0
	);

	// "Mark legacy for removal" placeholder — enabled only when fully resolved
	const canMarkForRemoval = $derived(
		legacyComparison !== null && legacyComparison.resolvedAt !== null
	);

	const tabs = [
		{ id: 'changes' as const, label: 'Changes', Icon: GitBranch },
		{ id: 'reconciliation' as const, label: 'Reconciliation Log', Icon: FileText },
		{ id: 'dev_queue' as const, label: 'Dev Queue', Icon: Inbox },
		{ id: 'impact' as const, label: 'Impact Report', Icon: BarChart2 }
	];

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	async function approve(scheduledPublishAt: string | null): Promise<{ ok: boolean; error?: string }> {
		try {
			const res = await secureFetch(`/api/pms/policies/${policy.id}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(scheduledPublishAt ? { scheduledPublishAt } : {})
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			await goto('/dashboard/admin/policies/pms');
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	async function reject(note: string): Promise<{ ok: boolean; error?: string }> {
		try {
			const res = await secureFetch(`/api/pms/policies/${policy.id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rejectionNote: note })
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			await goto('/dashboard/admin/policies/pms');
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	async function runLegacyCompare(): Promise<void> {
		compareLoading = true;
		compareError = '';
		compareSuccess = '';
		try {
			const res = await secureFetch(`/api/pms/policies/${policy.id}/legacy-compare`, {
				method: 'POST'
			});
			const json = await res.json();
			if (!res.ok) {
				compareError = json.error ?? 'Comparison failed.';
			} else {
				compareSuccess = json.data?.message ?? 'Comparison complete.';
				// Navigate to Changes tab so admin sees results immediately
				activeTab = 'changes';
				await invalidateAll();
			}
		} catch {
			compareError = 'Network error.';
		} finally {
			compareLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Review — {data.lenderName} {policy.loanProduct} — DigitalDSA Admin</title>
</svelte:head>

<div class="flex min-h-screen bg-gray-50">
	<!-- ── Sidebar: metadata + actions ──────────────────────────────────────── -->
	<aside class="w-72 shrink-0 border-r border-gray-200 bg-white p-5">
		<a href="/dashboard/admin/policies/pms" class="mb-5 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
			<ArrowLeft size={13} /> Review queue
		</a>

		<h1 class="text-base font-bold text-gray-900 leading-tight">{data.lenderName}</h1>
		<p class="mt-0.5 text-xs text-gray-500">{policy.loanProduct}</p>

		<div class="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1.5">
			<div class="flex justify-between">
				<span class="text-gray-400">Version</span>
				<span class="font-mono font-semibold">
					{policy.version > 0 ? `v${policy.version}` : 'new'}
					{#if data.publishedSnapshot}
						<span class="text-gray-400"> (live: v{data.publishedSnapshot.version})</span>
					{/if}
				</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-400">Submitted by</span>
				<span class="truncate font-medium">{policy.submittedBy ?? '—'}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-400">Submitted at</span>
				<span class="font-medium">{formatDate(policy.submittedAt)}</span>
			</div>
		</div>

		<div class="mt-4 rounded-lg border border-gray-200 p-3 text-xs text-gray-600 space-y-1.5">
			{#if policy.aiPipelineRun}
				<div class="flex items-center gap-1.5 text-gray-700">
					<span class="font-semibold">🤖 AI pipeline</span>
					<span class="text-gray-400">({policy.aiPipelineRun.mode === 'automated' ? '6-pass' : 'manual'})</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-400">Final score</span>
					<span class="font-semibold {policy.aiPipelineRun.finalScore && policy.aiPipelineRun.finalScore >= 80 ? 'text-green-700' : policy.aiPipelineRun.finalScore && policy.aiPipelineRun.finalScore >= 60 ? 'text-amber-700' : 'text-red-700'}">
						{policy.aiPipelineRun.finalScore ?? '—'}/100
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-400">Passes executed</span>
					<span>{policy.aiPipelineRun.passesExecuted}</span>
				</div>
			{:else}
				<p class="text-gray-500">Direct edit (no AI pipeline)</p>
			{/if}
		</div>

		<div class="mt-4 rounded-lg border border-gray-200 p-3 text-xs text-gray-600 space-y-1.5">
			<div class="flex justify-between">
				<span class="text-gray-400">Clauses</span>
				<span class="font-semibold">{policy.pipelineState?.pass2Clauses?.length ?? 0}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-400">Overrides</span>
				<span class="font-semibold">{policy.conditionalOverrides.length}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-400">Bank card notes</span>
				<span class="font-semibold">{policy.bankCardNotes.length}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-400">Field edits</span>
				<span class="font-semibold">{policy.pendingChanges.length}</span>
			</div>
		</div>

		<!-- Action buttons (only for submitted policies) -->
		{#if isSubmitted}
			<div class="mt-5 space-y-2">
				<button
					type="button"
					onclick={() => (approveModalOpen = true)}
					class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
				>
					<CheckCircle size={14} /> Approve
				</button>
				<button
					type="button"
					onclick={() => (rejectModalOpen = true)}
					class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
				>
					<XCircle size={14} /> Reject with notes
				</button>
			</div>
		{:else}
			<div class="mt-5 flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
				<Clock size={12} />
				<span>Already {policy.status.replace('_', ' ')} — no further action.</span>
			</div>
		{/if}

		<!-- JSON Editor — admin escape valve, only for published policies -->
		{#if isPublished}
			<div class="mt-5 border-t border-gray-100 pt-4">
				<p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Direct Edit</p>
				<a
					href="/dashboard/admin/policies/pms/{policy.id}/json-editor"
					class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
				>
					<FileJson size={12} /> JSON Editor →
				</a>
			</div>
		{/if}

		<!-- Legacy comparison section — only for published policies -->
		{#if isPublished}
			<div class="mt-5 border-t border-gray-100 pt-4 space-y-2">
				<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Legacy Audit</p>

				{#if legacyComparison}
					<div class="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600 space-y-1">
						<div class="flex justify-between">
							<span class="text-gray-400">Last compared</span>
							<span>{formatDate(legacyComparison.comparedAt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Discrepancies</span>
							<span class="font-semibold {legacyComparison.discrepancies.length > 0 ? 'text-amber-700' : 'text-green-700'}">
								{legacyComparison.discrepancies.length}
							</span>
						</div>
						{#if legacyComparison.resolvedAt}
							<div class="flex justify-between">
								<span class="text-gray-400">Resolved</span>
								<span class="text-green-700">{formatDate(legacyComparison.resolvedAt)}</span>
							</div>
						{/if}
					</div>
				{/if}

				{#if compareError}
					<p class="text-[11px] text-red-600">{compareError}</p>
				{:else if compareSuccess}
					<p class="text-[11px] text-green-700">{compareSuccess}</p>
				{/if}

				<button
					type="button"
					onclick={runLegacyCompare}
					disabled={compareBlocked || compareLoading}
					title={compareBlocked ? 'Resolve existing discrepancies before re-running' : 'Compare PMS policy against legacy TS rule doc'}
					class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<GitCompare size={12} />
					{compareLoading ? 'Running…' : legacyComparison ? 'Re-run comparison →' : 'Run legacy comparison →'}
				</button>

				<!-- Deletion gate placeholder — enabled only after full resolution -->
				<button
					type="button"
					disabled={!canMarkForRemoval}
					title={canMarkForRemoval
						? 'Mark legacy TS entry for future removal (ops-only, no deletion now)'
						: 'Resolve legacy comparison first'}
					class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Trash2 size={12} /> Mark legacy entry for removal
				</button>
			</div>
		{/if}

		{#if policy.adminRejectionNote}
			<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
				<p class="mb-1 font-semibold">Previous rejection note:</p>
				<p>{policy.adminRejectionNote}</p>
				{#if policy.adminRejectedAt}
					<p class="mt-1 text-[10px] text-red-500">{formatDate(policy.adminRejectedAt)}</p>
				{/if}
			</div>
		{/if}
	</aside>

	<!-- ── Main area ────────────────────────────────────────────────────────── -->
	<main class="flex-1 overflow-y-auto">
		<!-- Tab bar -->
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-8">
			<nav class="flex gap-1">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors
						{activeTab === tab.id ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<tab.Icon size={13} />
						{tab.label}
						{#if tab.id === 'changes' && legacyComparison && legacyComparison.resolvedAt === null && legacyComparison.discrepancies.length > 0}
							<span class="ml-0.5 rounded-full bg-amber-500 px-1.5 py-px text-[9px] font-bold text-white">
								{legacyComparison.discrepancies.filter(d => d.resolution === 'pending').length}
							</span>
						{/if}
					</button>
				{/each}
			</nav>
		</div>

		<!-- Tab content -->
		<div class="p-8">
			<div class="mx-auto max-w-4xl">
				{#if activeTab === 'changes'}
					<ChangesTab
						policyId={policy.id}
						pendingChanges={policy.pendingChanges}
						currentSections={policy.sections}
						publishedSnapshot={data.publishedSnapshot}
						pipelineMode={policy.aiPipelineRun?.mode ?? null}
						finalScore={policy.aiPipelineRun?.finalScore ?? null}
						legacyComparison={policy.legacyComparison ?? null}
					/>
				{:else if activeTab === 'reconciliation'}
					<ReconciliationTab
						policyId={policy.id}
						clauses={policy.pipelineState?.pass2Clauses ?? null}
						decisions={policy.pipelineState?.rmStep1Decisions ?? {}}
						encodings={policy.pipelineState?.rmStep2Encodings ?? []}
						adminClauseComments={policy.adminClauseComments}
						readOnly={!isSubmitted}
					/>
				{:else if activeTab === 'dev_queue'}
					<DevQueueTab bankCardNotes={policy.bankCardNotes} />
				{:else if activeTab === 'impact'}
					<ImpactTab policyId={policy.id} initialQaRun={policy.qaRun ?? null} />
				{/if}
			</div>
		</div>
	</main>
</div>

<ApproveModal bind:isOpen={approveModalOpen} onApprove={approve} />
<RejectModal
	bind:isOpen={rejectModalOpen}
	clauseCommentCount={policy.adminClauseComments.length}
	onReject={reject}
/>
