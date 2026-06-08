<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Clock, CheckCircle, Calendar, Rocket, ChevronRight, FileText, Inbox, Key } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Mirrors data.initialStatus from the URL. $derived keeps it in sync when the
	// page re-loads with a different ?status= query (otherwise it would freeze
	// at the initial value Svelte 5 captures on mount).
	let statusFilter = $derived(data.initialStatus);

	function applyFilter(value: string) {
		goto(`/dashboard/admin/policies/pms?status=${value}`, { replaceState: true });
	}

	function statusBadge(status: string) {
		switch (status) {
			case 'submitted': return { cls: 'bg-blue-100 text-blue-700', Icon: Clock, label: 'Awaiting review' };
			case 'approved': return { cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle, label: 'Approved' };
			case 'approved_scheduled': return { cls: 'bg-amber-100 text-amber-700', Icon: Calendar, label: 'Scheduled' };
			case 'published': return { cls: 'bg-green-100 text-green-700', Icon: Rocket, label: 'Live' };
			default: return { cls: 'bg-gray-100 text-gray-600', Icon: FileText, label: status };
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	const filters = [
		{ value: 'submitted', label: 'Review queue' },
		{ value: 'approved,approved_scheduled', label: 'Approved' },
		{ value: 'published', label: 'Live' },
		{ value: 'all', label: 'All' }
	];
</script>

<svelte:head>
	<title>PMS Policy Review — DigitalDSA Admin</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-6">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">PMS Policy Review</h1>
			<p class="mt-1 text-sm text-gray-500">
				RM-submitted policies awaiting admin approval. Open a policy to see the full
				reconciliation log, field-level changes, and approve / reject / schedule actions.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/dashboard/admin/policies/registry-health"
				class="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
			>
				<Key size={13} />
				Registry Health
			</a>
			<a
				href="/dashboard/admin/policies/dev-queue"
				class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
			>
				<Inbox size={13} />
				Dev Queue
			</a>
		</div>
	</div>

	<!-- Filter tabs -->
	<div class="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
		{#each filters as filter (filter.value)}
			<button
				type="button"
				onclick={() => applyFilter(filter.value)}
				class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
				{statusFilter === filter.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
			>
				{filter.label}
			</button>
		{/each}
	</div>

	<!-- Policy list -->
	{#if data.policies.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
			<p class="text-sm font-medium text-gray-700">No policies match this filter.</p>
			<p class="mt-1 text-xs text-gray-400">Change the filter above to see other statuses.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.policies as policy (policy.id)}
				{@const badge = statusBadge(policy.status)}
				<a
					href="/dashboard/admin/policies/pms/{policy.id}"
					class="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/30"
				>
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="truncate text-base font-semibold text-gray-900">{policy.lenderName}</h3>
								<span class="text-xs text-gray-400">·</span>
								<span class="text-sm text-gray-600">{policy.loanProduct}</span>
								{#if policy.version > 0}
									<span class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">v{policy.version}</span>
								{:else}
									<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">NEW</span>
								{/if}
							</div>

							<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
								<span>Submitted {formatDate(policy.submittedAt)}</span>
								{#if policy.pipelineMode === 'automated'}
									<span>🤖 AI pipeline · score {policy.finalScore ?? '—'}%</span>
								{:else if policy.pendingChangeCount > 0}
									<span>✏️ {policy.pendingChangeCount} field change{policy.pendingChangeCount === 1 ? '' : 's'}</span>
								{/if}
								{#if policy.overrideCount > 0}
									<span>{policy.overrideCount} override{policy.overrideCount === 1 ? '' : 's'}</span>
								{/if}
								{#if policy.bankCardNoteCount > 0}
									<span>{policy.bankCardNoteCount} bank card note{policy.bankCardNoteCount === 1 ? '' : 's'}</span>
								{/if}
							</div>
						</div>

						<div class="flex items-center gap-2">
							<span class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold {badge.cls}">
								<badge.Icon size={11} />
								{badge.label}
							</span>
							<ChevronRight size={16} class="text-gray-300" />
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
