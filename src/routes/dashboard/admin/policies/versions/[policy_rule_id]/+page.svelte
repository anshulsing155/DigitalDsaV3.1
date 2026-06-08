<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	let { data } = $props();

	let actionLoading = $state('');
	let actionError = $state('');
	let actionSuccess = $state('');

	// Version comparison state
	let compareA = $state<number | null>(null);
	let compareB = $state<number | null>(null);
	let showComparison = $state(false);

	// Audit log collapse state
	let auditExpanded = $state(false);

	const versionStatusColors: Record<string, string> = {
		draft: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		pending_rm_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		rm_corrections_requested: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		pending_admin_final: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		approved: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		superseded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	// Build a map of version_number -> version for quick lookup
	let versionMap = $derived(new Map(data.versions.map((v) => [v.version_number, v])));

	// Compute diff between two selected versions
	let comparisonDiff = $derived.by(() => {
		if (compareA == null || compareB == null) return [];
		const vA = versionMap.get(compareA);
		const vB = versionMap.get(compareB);
		if (!vA || !vB) return [];

		const fieldsA = new Map(vA.policy_fields.map((f) => [f.key, f]));
		const fieldsB = new Map(vB.policy_fields.map((f) => [f.key, f]));
		const allKeys = [...new Set([...fieldsA.keys(), ...fieldsB.keys()])];

		return allKeys
			.map((key) => {
				const a = fieldsA.get(key);
				const b = fieldsB.get(key);
				const label = a?.label || b?.label || key;
				const valueA = a?.value ?? null;
				const valueB = b?.value ?? null;

				let changeType: 'added' | 'removed' | 'changed' | 'unchanged';
				if (valueA == null && valueB != null) changeType = 'added';
				else if (valueA != null && valueB == null) changeType = 'removed';
				else if (valueA !== valueB) changeType = 'changed';
				else changeType = 'unchanged';

				return { key, label, valueA, valueB, changeType };
			})
			.sort((a, b) => {
				// Sort: changed/added/removed first, then unchanged
				const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
				return order[a.changeType] - order[b.changeType];
			});
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function timeAgo(dateStr: string | null): string {
		if (!dateStr) return '-';
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function formatStatus(status: string): string {
		return status.replace(/_/g, ' ');
	}

	function formatAuditAction(action: string): string {
		return action.replace(/_/g, ' ');
	}

	async function changeVersionStatus(versionId: string, newStatus: string) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `status:${versionId}`;
		try {
			const res = await secureFetch(`/api/admin/policy-engine/versions/${versionId}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			const result = await res.json();
			if (result.success) {
				actionSuccess = `Version status changed to "${formatStatus(newStatus)}"`;
				await invalidateAll();
			} else {
				actionError = result.error || 'Status change failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	async function approveVersion(versionId: string) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `approve:${versionId}`;
		try {
			const res = await secureFetch(`/api/admin/policy-engine/versions/${versionId}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const result = await res.json();
			if (result.success) {
				actionSuccess = 'Version approved successfully';
				await invalidateAll();
			} else {
				actionError = result.error || 'Approval failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	async function activateVersion(versionId: string) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `activate:${versionId}`;
		try {
			const res = await secureFetch(`/api/admin/policy-engine/versions/${versionId}/activate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const result = await res.json();
			if (result.success) {
				actionSuccess = 'Version activated successfully';
				await invalidateAll();
			} else {
				actionError = result.error || 'Activation failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	async function rollbackToVersion(versionNumber: number) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `rollback:${versionNumber}`;
		try {
			const res = await secureFetch(
				`/api/admin/policy-engine/rules/${data.rule.policy_rule_id}/rollback`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source_version_number: versionNumber })
				}
			);
			const result = await res.json();
			if (result.success) {
				actionSuccess = `Rollback to v${versionNumber} completed. A new draft version was created.`;
				await invalidateAll();
			} else {
				actionError = result.error || 'Rollback failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}
</script>

<svelte:head>
	<title>Admin: Policy Versions | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a
			href="/dashboard/admin/policies"
			class="inline-flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Policies
		</a>
		<h1 class="mt-3 text-2xl font-bold text-[var(--dash-text)]">Version History</h1>
		<div
			class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--dash-text-muted)]"
		>
			<span class="font-medium text-[var(--dash-text)]">{data.context.lender_name}</span>
			<span class="text-[var(--dash-text-muted)]">/</span>
			<span>{data.context.product_label}</span>
			<span class="text-[var(--dash-text-muted)]">/</span>
			<span>{data.context.variation_label}</span>
			<span class="text-[var(--dash-text-muted)]">/</span>
			<span
				class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-xs text-[var(--dash-text-secondary)]"
				>{data.context.geo_scope_label}</span
			>
		</div>
	</div>

	<!-- Feedback messages -->
	{#if actionError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			{actionError}
		</div>
	{/if}
	{#if actionSuccess}
		<div
			class="rounded-lg bg-[var(--dash-btn-ghost-bg)] p-4 text-sm text-[var(--dash-accent-text)]"
		>
			{actionSuccess}
		</div>
	{/if}

	<!-- Summary stat cards -->
	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="card-surface rounded-xl p-4">
			<p class="text-xs font-medium text-[var(--dash-text-muted)]">Total Versions</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">{data.counts.total_versions}</p>
		</div>
		<div class="card-surface rounded-xl p-4">
			<p class="text-xs font-medium text-[var(--dash-text-muted)]">Active</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-accent-text)]">{data.counts.active}</p>
		</div>
		<div class="card-surface rounded-xl p-4">
			<p class="text-xs font-medium text-[var(--dash-text-muted)]">Pending</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text-secondary)]">{data.counts.pending}</p>
		</div>
		<div class="card-surface rounded-xl p-4">
			<p class="text-xs font-medium text-[var(--dash-text-muted)]">Draft</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text-muted)]">{data.counts.draft}</p>
		</div>
	</div>

	<!-- Version Comparison -->
	<div class="card-surface rounded-xl p-5">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">Compare Versions</h2>
			{#if showComparison}
				<button
					onclick={() => {
						showComparison = false;
						compareA = null;
						compareB = null;
					}}
					class="text-xs text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
				>
					Close comparison
				</button>
			{/if}
		</div>

		<div class="mt-3 flex flex-wrap items-end gap-3">
			<div>
				<label for="compare-a" class="block text-xs font-medium text-[var(--dash-text-muted)]"
					>Version A (older)</label
				>
				<select
					id="compare-a"
					onchange={(e) => {
						compareA = e.currentTarget.value ? Number(e.currentTarget.value) : null;
					}}
					class="mt-1 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				>
					<option value="">Select...</option>
					{#each data.versions as v}
						<option value={v.version_number} selected={compareA === v.version_number}>
							v{v.version_number} ({formatStatus(v.status)})
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="compare-b" class="block text-xs font-medium text-[var(--dash-text-muted)]"
					>Version B (newer)</label
				>
				<select
					id="compare-b"
					onchange={(e) => {
						compareB = e.currentTarget.value ? Number(e.currentTarget.value) : null;
					}}
					class="mt-1 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				>
					<option value="">Select...</option>
					{#each data.versions as v}
						<option value={v.version_number} selected={compareB === v.version_number}>
							v{v.version_number} ({formatStatus(v.status)})
						</option>
					{/each}
				</select>
			</div>
			<button
				onclick={() => {
					showComparison = compareA != null && compareB != null;
				}}
				disabled={compareA == null || compareB == null}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-1.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-40"
			>
				Compare
			</button>
		</div>

		{#if showComparison && comparisonDiff.length > 0}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[var(--dash-border-light)]">
							<th class="py-2 pr-4 text-left text-xs font-medium text-[var(--dash-text-muted)]"
								>Field</th
							>
							<th class="py-2 pr-4 text-left text-xs font-medium text-[var(--dash-text-muted)]"
								>v{compareA}</th
							>
							<th class="py-2 pr-4 text-left text-xs font-medium text-[var(--dash-text-muted)]"
								>v{compareB}</th
							>
							<th class="py-2 text-left text-xs font-medium text-[var(--dash-text-muted)]"
								>Change</th
							>
						</tr>
					</thead>
					<tbody>
						{#each comparisonDiff as row}
							<tr
								class="border-b border-[var(--dash-border-light)]
								{row.changeType === 'added' ? 'bg-[var(--dash-btn-ghost-bg)]' : ''}
								{row.changeType === 'removed' ? 'bg-[var(--dash-contrast-ghost-bg)]' : ''}
								{row.changeType === 'changed' ? 'bg-[var(--dash-bg-alt)]' : ''}"
							>
								<td class="py-2 pr-4 font-medium text-[var(--dash-text)]">{row.label}</td>
								<td
									class="py-2 pr-4 text-[var(--dash-text-secondary)] {row.changeType === 'removed'
										? 'text-[var(--dash-contrast-text)] line-through'
										: ''}"
								>
									{row.valueA ?? '-'}
								</td>
								<td
									class="py-2 pr-4 text-[var(--dash-text-secondary)] {row.changeType === 'added'
										? 'font-medium text-[var(--dash-accent-text)]'
										: ''}"
								>
									{row.valueB ?? '-'}
								</td>
								<td class="py-2">
									{#if row.changeType === 'added'}
										<span
											class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
											>Added</span
										>
									{:else if row.changeType === 'removed'}
										<span
											class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
											>Removed</span
										>
									{:else if row.changeType === 'changed'}
										<span
											class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
											>Changed</span
										>
									{:else}
										<span class="text-xs text-[var(--dash-text-muted)]">No change</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if showComparison && comparisonDiff.length === 0}
			<p class="mt-4 text-sm text-[var(--dash-text-muted)]">
				No fields to compare. Both versions may have empty policy fields.
			</p>
		{/if}
	</div>

	<!-- Version Timeline -->
	<div class="space-y-3">
		<h2 class="text-sm font-semibold text-[var(--dash-text)]">Timeline</h2>

		{#if data.versions.length === 0}
			<div class="card-surface rounded-xl p-10 text-center">
				<p class="text-[var(--dash-text-muted)]">No versions for this policy rule</p>
			</div>
		{:else}
			{#each data.versions as version}
				<div
					class="card-surface rounded-xl p-5
					{version.status === 'active' ? 'ring-[var(--dash-btn-ghost-border)]' : ''}"
				>
					<!-- Version header -->
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-2">
							<span
								class="inline-flex items-center rounded-lg bg-[var(--dash-text)] px-2.5 py-1 text-xs font-bold text-[var(--dash-bg-card)]"
							>
								v{version.version_number}
							</span>
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {versionStatusColors[
									version.status
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
							>
								{formatStatus(version.status)}
							</span>
							{#if version.version_number === data.rule.active_version_number}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)] ring-1 ring-[var(--dash-btn-ghost-border)]"
								>
									<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
									Current
								</span>
							{/if}
						</div>
						<span class="text-xs text-[var(--dash-text-muted)]" title={version.created_at || ''}>
							{timeAgo(version.created_at)}
						</span>
					</div>

					<!-- Details row -->
					<div
						class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dash-text-muted)]"
					>
						<span>{version.field_count} field{version.field_count !== 1 ? 's' : ''}</span>
						{#if version.overlay_count > 0}
							<span>{version.overlay_count} overlay{version.overlay_count !== 1 ? 's' : ''}</span>
						{/if}
						<span>Source: {version.provenance.source_type.replace(/_/g, ' ')}</span>
						{#if version.provenance.source_rm_name}
							<span>RM: {version.provenance.source_rm_name}</span>
						{/if}
						{#if version.provenance.confirmation_method}
							<span
								class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[var(--dash-accent-text)]"
							>
								{version.provenance.confirmation_method}
							</span>
						{/if}
						{#if version.comment_count > 0}
							<span
								class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[var(--dash-accent-text)]"
							>
								{version.comment_count} comment{version.comment_count !== 1 ? 's' : ''}
							</span>
						{/if}
					</div>

					<!-- Effective dates -->
					{#if version.effective_from || version.effective_until}
						<div
							class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dash-text-muted)]"
						>
							{#if version.effective_from}
								<span>Effective from: {formatDate(version.effective_from)}</span>
							{/if}
							{#if version.effective_until}
								<span>Until: {formatDate(version.effective_until)}</span>
							{/if}
						</div>
					{/if}

					<!-- Changelog entries -->
					{#if version.changelog.length > 0}
						<div class="mt-3 rounded-lg bg-[var(--dash-bg-alt)] p-3">
							<p class="mb-1.5 text-xs font-medium text-[var(--dash-text-secondary)]">
								Changes from previous version:
							</p>
							<ul class="space-y-1">
								{#each version.changelog as change}
									<li class="flex items-start gap-2 text-xs">
										<span
											class="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--dash-text-muted)]"
										></span>
										<span class="text-[var(--dash-text-secondary)]">
											<span class="font-medium text-[var(--dash-text)]">{change.field_label}</span>
											{#if change.old_value != null && change.new_value != null}
												: {change.old_value}
												<span class="mx-1 text-[var(--dash-text-muted)]">-></span>
												{change.new_value}
											{:else if change.new_value != null}
												: set to {change.new_value}
											{:else if change.old_value != null}
												: removed (was {change.old_value})
											{/if}
											{#if change.description}
												<span class="text-[var(--dash-text-muted)]">-- {change.description}</span>
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Created by -->
					<div class="mt-3 text-xs text-[var(--dash-text-muted)]">
						Created by {version.created_by}
						{#if version.created_at}
							on {formatDate(version.created_at)}
						{/if}
					</div>

					<!-- Action buttons -->
					<div class="mt-4 flex flex-wrap gap-2 border-t border-[var(--dash-border-light)] pt-3">
						{#if version.status === 'approved'}
							<button
								onclick={() => activateVersion(version._id)}
								disabled={!!actionLoading}
								class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
							>
								{actionLoading === `activate:${version._id}` ? 'Activating...' : 'Activate'}
							</button>
						{/if}

						{#if version.status === 'pending_admin_final'}
							<button
								onclick={() => approveVersion(version._id)}
								disabled={!!actionLoading}
								class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
							>
								{actionLoading === `approve:${version._id}` ? 'Approving...' : 'Approve'}
							</button>
							<button
								onclick={() => changeVersionStatus(version._id, 'rejected')}
								disabled={!!actionLoading}
								class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-contrast-text)] transition-colors hover:brightness-110 disabled:opacity-50"
							>
								{actionLoading === `status:${version._id}` ? 'Rejecting...' : 'Reject'}
							</button>
						{/if}

						{#if version.status === 'superseded' || version.status === 'rejected'}
							<button
								onclick={() => rollbackToVersion(version.version_number)}
								disabled={!!actionLoading}
								class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
							>
								{actionLoading === `rollback:${version.version_number}`
									? 'Rolling back...'
									: 'Rollback to this'}
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Audit Activity Section -->
	{#if data.auditEntries.length > 0}
		<div class="card-surface rounded-xl">
			<button
				onclick={() => (auditExpanded = !auditExpanded)}
				class="flex w-full items-center justify-between px-5 py-4 text-left"
			>
				<h2 class="text-sm font-semibold text-[var(--dash-text)]">
					Audit Activity
					<span class="ml-1.5 text-xs font-normal text-[var(--dash-text-muted)]"
						>({data.auditEntries.length} entries)</span
					>
				</h2>
				<svg
					class="h-5 w-5 text-[var(--dash-text-muted)] transition-transform {auditExpanded
						? 'rotate-180'
						: ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if auditExpanded}
				<div class="border-t border-[var(--dash-border-light)] px-5 pb-4">
					<div class="divide-y divide-[var(--dash-border-light)]">
						{#each data.auditEntries as entry}
							<div class="flex items-start gap-3 py-3">
								<div
									class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
								>
									<span class="text-xs font-medium text-[var(--dash-text-muted)]">
										{entry.actor_role === 'admin' ? 'A' : entry.actor_role === 'rm' ? 'R' : 'S'}
									</span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm text-[var(--dash-text)]">
										<span class="font-medium">{entry.actor_name}</span>
										<span class="text-[var(--dash-text-muted)]"
											>{formatAuditAction(entry.action)}</span
										>
									</p>
									{#if entry.details && Object.keys(entry.details).length > 0}
										<div class="mt-1 flex flex-wrap gap-2">
											{#each Object.entries(entry.details) as [key, value]}
												<span
													class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-xs text-[var(--dash-text-muted)]"
												>
													{key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
												</span>
											{/each}
										</div>
									{/if}
								</div>
								<span
									class="flex-shrink-0 text-xs text-[var(--dash-text-muted)]"
									title={entry.created_at || ''}
								>
									{timeAgo(entry.created_at)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
