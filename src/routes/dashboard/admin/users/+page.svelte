<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';
	import { t } from '$lib/i18n';
	import ImpersonateUserModal from '$lib/components/ImpersonateUserModal.svelte';

	interface UserRow {
		_id: string;
		name: string;
		mobileNumber: string;
		email: string;
		lastActiveAt: string | null;
		onboardingCompleted: boolean;
		is_suspended: boolean;
		createdAt: string | null;
		role: string;
	}

	let { data } = $props();

	let activeTab = $state<'dsa' | 'rm'>('dsa');
	// svelte-ignore state_referenced_locally
	let searchQuery = $state(data.search || '');
	let suspending = $state<string | null>(null);
	let suspendError = $state<string>('');

	// C.4 — impersonation modal state
	let impersonateTarget = $state<UserRow | null>(null);
	let impersonateError = $state<string>('');
	let impersonating = $state(false);

	const currentUsers = $derived(activeTab === 'dsa' ? data.dsaUsers : data.rmUsers);
	const currentCount = $derived(activeTab === 'dsa' ? data.dsaCount : data.rmCount);
	const totalPages = $derived(Math.ceil(currentCount / data.limit));

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		goto(`/dashboard/admin/users?${params.toString()}`);
	}

	function openImpersonate(user: UserRow) {
		impersonateError = '';
		impersonateTarget = user;
	}

	function closeImpersonate() {
		if (impersonating) return;
		impersonateTarget = null;
		impersonateError = '';
	}

	async function startImpersonate(reason: string) {
		if (!impersonateTarget) return;
		impersonating = true;
		impersonateError = '';
		try {
			const res = await secureFetch('/api/admin/impersonate/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: impersonateTarget._id,
					role: impersonateTarget.role,
					reason
				})
			});
			const result = await res.json();
			if (result.success && result.data?.redirectPath) {
				// Hard navigation so hooks.server.ts picks up the new impersonation
				// cookie and rewrites locals.user before the next page load.
				if (browser) window.location.href = result.data.redirectPath;
				return;
			}
			impersonateError = result.error || 'Failed to start impersonation';
		} catch {
			impersonateError = 'Network error — please try again';
		} finally {
			impersonating = false;
		}
	}

	async function toggleSuspend(user: UserRow) {
		suspending = user._id;
		suspendError = '';
		try {
			const endpoint = user.role === 'dsa' ? '/api/admin/users/dsa' : '/api/admin/users/rm';
			const res = await secureFetch(endpoint, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: user._id, is_suspended: !user.is_suspended })
			});
			const result = await res.json();
			if (result.success) {
				user.is_suspended = !user.is_suspended;
			} else {
				suspendError = result.error || 'Failed to update suspension status';
			}
		} catch {
			suspendError = 'Network error — please try again';
		} finally {
			suspending = null;
		}
	}
</script>

<svelte:head>
	<title>Admin: Users | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">User Management</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				View and manage DSA and RM accounts
			</p>
		</div>
	</div>

	{#if suspendError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-3 text-sm text-[var(--dash-contrast-text)]"
		>
			{suspendError}
		</div>
	{/if}

	<!-- Search -->
	<div class="flex gap-3">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search by name or phone..."
			class="flex-1 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
			onkeydown={(e) => {
				if (e.key === 'Enter') handleSearch();
			}}
		/>
		<button
			onclick={handleSearch}
			class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110"
		>
			Search
		</button>
	</div>

	<!-- Tabs -->
	<div class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]">
		<div class="flex border-b border-[var(--dash-border-light)]">
			<button
				onclick={() => (activeTab = 'dsa')}
				class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'dsa'
					? 'border-b-2 border-[var(--dash-btn-ghost-border)] text-[var(--dash-accent-text)]'
					: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
			>
				DSA Agents ({data.dsaCount})
			</button>
			<button
				onclick={() => (activeTab = 'rm')}
				class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'rm'
					? 'border-b-2 border-[var(--dash-btn-ghost-border)] text-[var(--dash-accent-text)]'
					: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
			>
				RM Partners ({data.rmCount})
			</button>
		</div>

		<div class="overflow-x-auto">
			{#if currentUsers.length === 0}
				<div class="px-6 py-10 text-center text-[var(--dash-text-muted)]">No users found</div>
			{:else}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
							<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]">Name</th
							>
							<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
								>Phone</th
							>
							<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
								>Last Active</th
							>
							<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
								>Status</th
							>
							<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each currentUsers as user (user._id)}
							<tr class="border-b border-[var(--dash-border-light)] hover:bg-[var(--dash-hover)]">
								<td class="px-6 py-3">
									<a
										href="/dashboard/admin/users/{user._id}"
										class="font-medium text-[var(--dash-accent-text)] hover:underline"
									>
										{user.name || 'Unnamed'}
									</a>
									{#if user.email}
										<p class="text-xs text-[var(--dash-text-muted)]">{user.email}</p>
									{/if}
								</td>
								<td class="px-6 py-3 text-[var(--dash-text-secondary)]">{user.mobileNumber}</td>
								<td class="px-6 py-3 text-[var(--dash-text-secondary)]"
									>{formatDate(user.lastActiveAt)}</td
								>
								<td class="px-6 py-3 text-center">
									{#if user.is_suspended}
										<span
											class="inline-flex rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
											>Suspended</span
										>
									{:else if user.onboardingCompleted}
										<span
											class="inline-flex rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
											>Active</span
										>
									{:else}
										<span
											class="inline-flex rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
											>Pending</span
										>
									{/if}
								</td>
								<td class="px-6 py-3 text-center">
									<div class="flex items-center justify-center gap-2">
										{#if user._id === data.currentAdminId}
											<!-- Self — no impersonate button on own row (spec: "Self → no Impersonate on own row") -->
										{:else}
											<button
												onclick={() => openImpersonate(user)}
												disabled={user.is_suspended || impersonating}
												title={user.is_suspended
													? t('admin.impersonate_blocked_suspended')
													: t('admin.impersonate_btn')}
												class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:cursor-not-allowed disabled:opacity-50"
											>
												{t('admin.impersonate_btn')}
											</button>
										{/if}
										<button
											onclick={() => toggleSuspend(user)}
											disabled={suspending === user._id}
											class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
												{user.is_suspended
												? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] hover:brightness-110'
												: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] hover:brightness-110'}
												disabled:opacity-50"
										>
											{#if suspending === user._id}
												...
											{:else}
												{user.is_suspended ? 'Unsuspend' : 'Suspend'}
											{/if}
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div
				class="flex items-center justify-between border-t border-[var(--dash-border-light)] px-6 py-3"
			>
				<p class="text-sm text-[var(--dash-text-secondary)]">
					Page {data.page} of {totalPages} ({currentCount} total)
				</p>
				<div class="flex gap-2">
					{#if data.page > 1}
						<a
							href="/dashboard/admin/users?page={data.page - 1}{data.search
								? `&q=${data.search}`
								: ''}"
							class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
						>
							Previous
						</a>
					{/if}
					{#if data.page < totalPages}
						<a
							href="/dashboard/admin/users?page={data.page + 1}{data.search
								? `&q=${data.search}`
								: ''}"
							class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
						>
							Next
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if impersonateTarget}
	<ImpersonateUserModal
		targetName={impersonateTarget.name || 'Unnamed user'}
		targetRole={impersonateTarget.role as 'dsa' | 'rm'}
		submitting={impersonating}
		errorMessage={impersonateError}
		onConfirm={startImpersonate}
		onCancel={closeImpersonate}
	/>
{/if}
