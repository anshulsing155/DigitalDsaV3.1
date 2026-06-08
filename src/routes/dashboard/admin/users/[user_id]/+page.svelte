<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';

	let { data } = $props();

	let suspending = $state(false);

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const stageColors: Record<string, string> = {
		intake: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		profiling: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		dropped: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	async function toggleSuspend() {
		suspending = true;
		try {
			const endpoint = data.user.role === 'dsa' ? '/api/admin/users/dsa' : '/api/admin/users/rm';
			const res = await secureFetch(endpoint, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: data.user._id, is_suspended: !data.user.is_suspended })
			});
			const result = await res.json();
			if (result.success) {
				data.user.is_suspended = !data.user.is_suspended;
			}
		} catch {
			// silent fail
		} finally {
			suspending = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: User Detail | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Back link -->
	<a
		href="/dashboard/admin/users"
		class="inline-flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		Back to Users
	</a>

	<!-- User Profile Card -->
	<div class="card-surface rounded-xl p-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-btn-bg)] text-xl font-bold text-[var(--dash-btn-text)]"
				>
					{(data.user.name || '?')[0].toUpperCase()}
				</div>
				<div>
					<h1 class="text-xl font-bold text-[var(--dash-text)]">{data.user.name || 'Unnamed'}</h1>
					<div class="mt-1 flex items-center gap-3">
						<span
							class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium
							{data.user.role === 'dsa'
								? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
								: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
						>
							{data.user.role === 'dsa' ? 'DSA Agent' : 'RM Partner'}
						</span>
						{#if data.user.is_suspended}
							<span
								class="inline-flex rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
								>Suspended</span
							>
						{/if}
					</div>
				</div>
			</div>
			<button
				onclick={toggleSuspend}
				disabled={suspending}
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
					{data.user.is_suspended
					? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)] hover:brightness-110'
					: 'border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] hover:brightness-110'}
					disabled:opacity-50"
			>
				{suspending ? '...' : data.user.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
			</button>
		</div>

		<div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Phone</p>
				<p class="mt-1 text-sm text-[var(--dash-text)]">{data.user.mobileNumber}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Email</p>
				<p class="mt-1 text-sm text-[var(--dash-text)]">{data.user.email || 'Not provided'}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Last Active</p>
				<p class="mt-1 text-sm text-[var(--dash-text)]">{formatDate(data.user.lastActiveAt)}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Registered</p>
				<p class="mt-1 text-sm text-[var(--dash-text)]">{formatDate(data.user.createdAt)}</p>
			</div>
			{#if data.user.bankName}
				<div>
					<p class="text-xs font-medium text-[var(--dash-text-muted)]">Bank</p>
					<p class="mt-1 text-sm text-[var(--dash-text)]">{data.user.bankName}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Cases (DSA only) -->
	{#if data.user.role === 'dsa'}
		<div class="card-surface rounded-xl">
			<div class="border-b border-[var(--dash-border-light)] px-6 py-4">
				<h2 class="font-semibold text-[var(--dash-text)]">Cases ({data.caseCount})</h2>
			</div>
			{#if data.recentCases.length === 0}
				<div class="px-6 py-10 text-center text-[var(--dash-text-muted)]">No cases found</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-muted)]"
									>Case ID</th
								>
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-muted)]"
									>Loan Type</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-muted)]"
									>Stage</th
								>
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-muted)]"
									>Updated</th
								>
							</tr>
						</thead>
						<tbody>
							{#each data.recentCases as c}
								<tr
									class="border-b border-[var(--dash-border-light)] hover:bg-[var(--dash-bg-alt)]"
								>
									<td class="px-6 py-3 font-medium text-[var(--dash-text)]">{c.case_id}</td>
									<td class="px-6 py-3 text-[var(--dash-text-secondary)]">{c.loan_type || '-'}</td>
									<td class="px-6 py-3 text-center">
										<span
											class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {stageColors[
												c.stage
											] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
										>
											{c.stage}
										</span>
									</td>
									<td class="px-6 py-3 text-[var(--dash-text-muted)]">{formatDate(c.updated_at)}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
