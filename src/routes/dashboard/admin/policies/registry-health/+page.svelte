<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, Key, Clock, BookOpen } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// ── Re-run on demand ──────────────────────────────────────────────────────
	let rerunning = $state(false);
	let rerunError = $state('');

	async function rerun() {
		rerunning = true;
		rerunError = '';
		try {
			// invalidateAll() re-runs +page.server.ts load(), which itself calls
			// runRegistryHealthCheck() — one round-trip is enough. Earlier code
			// also fetched /api/pms/registry/health and discarded the response,
			// running the check twice per click.
			await invalidateAll();
		} catch {
			rerunError = 'Network error';
		} finally {
			rerunning = false;
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const report = $derived(data.report);
	const isClean = $derived(report.stalePolicies.length === 0 && report.unknownKeyPaths.length === 0);

	// Tab state
	let activeTab = $state<'health' | 'registry' | 'changelog'>('health');
</script>

<svelte:head>
	<title>Registry Health — DigitalDSA Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="border-b border-gray-200 bg-white px-6 py-4">
		<a
			href="/dashboard/admin/policies/pms"
			class="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
		>
			<ArrowLeft size={13} /> Policy management
		</a>

		<div class="flex items-start justify-between">
			<div class="flex items-center gap-3">
				<Key size={18} class="text-amber-600" />
				<div>
					<h1 class="text-base font-bold text-gray-900">Registry Health</h1>
					<p class="text-xs text-gray-500">
						{report.registrySummary.activeKeys} active keys ·
						{report.registrySummary.deprecatedKeys} deprecated ·
						scanned {report.totalPoliciesScanned} published PMS policies
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<span class="text-[11px] text-gray-400">Last run: {formatDate(report.ranAt)}</span>
				<button
					type="button"
					onclick={rerun}
					disabled={rerunning}
					class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
				>
					<RefreshCw size={12} class={rerunning ? 'animate-spin' : ''} />
					{rerunning ? 'Running…' : 'Re-run check'}
				</button>
			</div>
		</div>

		{#if rerunError}
			<p class="mt-2 text-xs text-red-600">{rerunError}</p>
		{/if}
	</div>

	<div class="mx-auto max-w-5xl px-6 py-6">

		<!-- ── Status banner ───────────────────────────────────────────────── -->
		{#if isClean}
			<div class="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
				<CheckCircle size={18} class="shrink-0 text-green-600" />
				<div>
					<p class="text-sm font-semibold text-green-800">All clear</p>
					<p class="text-xs text-green-700">
						{report.healthyPolicies}/{report.totalPoliciesScanned} policies clean.
						No deprecated or unknown key paths found.
					</p>
				</div>
			</div>
		{:else}
			<div class="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
				<AlertTriangle size={18} class="shrink-0 text-red-600" />
				<div>
					<p class="text-sm font-semibold text-red-800">
						{report.stalePolicies.length} stale policies · {report.unknownKeyPaths.length} unknown paths
					</p>
					<p class="text-xs text-red-700">
						These policies reference deprecated or unrecognised key paths and need re-encoding.
					</p>
				</div>
			</div>
		{/if}

		<!-- ── Future queue ready banner ───────────────────────────────────── -->
		{#if report.futureQueueReady.length > 0}
			<div class="mb-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
				<CheckCircle size={18} class="shrink-0 text-blue-600" />
				<div>
					<p class="text-sm font-semibold text-blue-800">
						{report.futureQueueReady.length} future-queue key{report.futureQueueReady.length !== 1 ? 's' : ''} now ready
					</p>
					<ul class="mt-1 space-y-0.5">
						{#each report.futureQueueReady as item (item.keyPath)}
							<li class="text-xs text-blue-700">
								<span class="font-mono">{item.keyPath}</span>
								— {item.queuedClauseCount} queued clause{item.queuedClauseCount !== 1 ? 's' : ''} can now be encoded
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		<!-- ── Tabs ────────────────────────────────────────────────────────── -->
		<div class="mb-5 flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
			{#each [
				{ key: 'health', label: 'Policy Health', icon: AlertTriangle },
				{ key: 'registry', label: 'Registry Browser', icon: Key },
				{ key: 'changelog', label: 'Changelog', icon: BookOpen }
			] as tab (tab.key)}
				<button
					type="button"
					onclick={() => activeTab = tab.key as typeof activeTab}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
					{activeTab === tab.key ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
				>
					<tab.icon size={13} />
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- ── Policy Health tab ───────────────────────────────────────────── -->
		{#if activeTab === 'health'}
			{#if report.stalePolicies.length === 0 && report.unknownKeyPaths.length === 0}
				<div class="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
					<CheckCircle size={32} class="mx-auto mb-3 text-green-400" />
					<p class="text-sm font-medium text-gray-500">All published policies are clean</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each report.stalePolicies as policy (policy.policyId)}
						<div class="rounded-xl border border-amber-200 bg-white p-4">
							<div class="mb-3 flex items-center justify-between">
								<div>
									<p class="text-sm font-semibold text-gray-800">{policy.lenderId}</p>
									<p class="text-xs text-gray-500">{policy.loanProduct}</p>
								</div>
								<a
									href="/dashboard/admin/policies/pms/{policy.policyId}"
									class="text-xs font-medium text-amber-600 hover:text-amber-800"
								>
									Open policy →
								</a>
							</div>

							<div class="space-y-1">
								{#each policy.staleKeys as stale (stale.overrideId + stale.keyPath)}
									<div class="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs">
										<AlertTriangle size={12} class="mt-0.5 shrink-0 text-amber-600" />
										<div>
											<span class="font-mono font-semibold text-amber-800">{stale.keyPath}</span>
											<span class="text-amber-700"> — deprecated {stale.deprecatedAt}</span>
											{#if stale.replacedBy}
												<span class="text-amber-600"> → use <span class="font-mono">{stale.replacedBy}</span></span>
											{/if}
											<p class="mt-0.5 text-amber-600">{stale.overrideLabel}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}

					{#if report.unknownKeyPaths.length > 0}
						<div class="rounded-xl border border-red-200 bg-white p-4">
							<p class="mb-2 text-sm font-semibold text-red-800">Unknown key paths</p>
							<p class="mb-3 text-xs text-gray-500">
								These paths appear in ConditionalOverride conditions but are not in the registry.
								Add them to keyRegistry.ts + registryChangelog.ts.
							</p>
							<div class="space-y-1">
								{#each report.unknownKeyPaths as item (`${item.policyId}-${item.keyPath}`)}
									<div class="flex items-center gap-2 text-xs">
										<span class="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"></span>
										<span class="font-mono text-red-700">{item.keyPath}</span>
										<span class="text-gray-400">in policy {item.policyId.slice(-8)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

		<!-- ── Registry Browser tab ────────────────────────────────────────── -->
		{:else if activeTab === 'registry'}
			<div class="space-y-4">
				<!-- Active keys -->
				<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
					<div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Active keys ({data.activeKeys.length})
						</p>
					</div>
					<div class="divide-y divide-gray-50">
						{#each data.activeKeys as key (key.path)}
							<div class="flex items-start gap-3 px-4 py-3 text-xs">
								<span class="font-mono font-semibold text-gray-800 min-w-48">{key.path}</span>
								<span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600">{key.type}</span>
								<span class="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{key.source}</span>
								<span class="text-gray-400 truncate">
									{key.products === 'all' ? 'all products' : (key.products as string[]).join(', ')}
								</span>
								{#if key.bindsTo}
									<span class="ml-auto font-mono text-gray-400">→ {key.bindsTo}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Deprecated keys -->
				{#if data.deprecatedKeys.length > 0}
					<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
						<div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
								Deprecated keys ({data.deprecatedKeys.length})
							</p>
						</div>
						<div class="divide-y divide-gray-50">
							{#each data.deprecatedKeys as key (key.path)}
								<div class="flex items-start gap-3 px-4 py-3 text-xs text-gray-400">
									<span class="font-mono line-through">{key.path}</span>
									<span>{key.deprecatedAt}</span>
									{#if key.replacedBy}
										<span>→ <span class="font-mono text-gray-600">{key.replacedBy}</span></span>
									{/if}
									{#if key.deprecationReason}
										<span class="ml-auto text-gray-300 italic">{key.deprecationReason}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

		<!-- ── Changelog tab ───────────────────────────────────────────────── -->
		{:else if activeTab === 'changelog'}
			<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
				<div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
						Recent changes (newest first)
					</p>
				</div>
				<div class="divide-y divide-gray-50">
					{#each data.recentChangelog as entry (`${entry.key}-${entry.at}`)}
						<div class="px-4 py-3 text-xs">
							<div class="flex items-center gap-2">
								<span class="font-mono font-semibold text-gray-800">{entry.key}</span>
								<span class="rounded-full px-1.5 py-px text-[10px] font-semibold
									{entry.action === 'added' ? 'bg-green-100 text-green-700'
									: entry.action === 'deprecated' ? 'bg-red-100 text-red-700'
									: entry.action === 'renamed' ? 'bg-blue-100 text-blue-700'
									: 'bg-amber-100 text-amber-700'}">
									{entry.action}
								</span>
								<span class="text-gray-400">{entry.at}</span>
								<span class="text-gray-400">by {entry.by}</span>
							</div>
							<p class="mt-1 text-gray-600">{entry.note}</p>
							{#if entry.replacedBy}
								<p class="mt-0.5 text-gray-400">→ replaced by <span class="font-mono">{entry.replacedBy}</span></p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

	</div>
</div>
