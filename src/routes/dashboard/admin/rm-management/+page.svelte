<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';
	import { browser } from '$app/environment';
	import { Search, Users, Building2, MapPin, LogIn, CheckCircle, Clock, AlertCircle } from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let filterState = $state('');
	let filterCity = $state('');
	let filterLender = $state('');
	let filterOnboarded = $state<'all' | 'yes' | 'no'>('all');

	let enteringRmId = $state<string | null>(null);
	let enterError = $state('');

	const filteredRms = $derived(
		data.rms.filter((rm) => {
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const matchesName = rm.name.toLowerCase().includes(q);
				const matchesEmail = rm.email.toLowerCase().includes(q);
				const matchesMobile = rm.mobileNumber.includes(q);
				if (!matchesName && !matchesEmail && !matchesMobile) return false;
			}
			if (filterState && rm.state !== filterState) return false;
			if (filterCity && rm.city !== filterCity) return false;
			if (filterLender && !rm.lenderAssignments.some((a) => a.lenderId === filterLender)) return false;
			if (filterOnboarded === 'yes' && !rm.onboardingCompleted) return false;
			if (filterOnboarded === 'no' && rm.onboardingCompleted) return false;
			return true;
		})
	);

	async function enterAsRm(rmId: string, rmName: string) {
		enteringRmId = rmId;
		enterError = '';
		try {
			const res = await secureFetch('/api/admin/impersonate/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rmId })
			});
			const json = await res.json();
			if (!res.ok) {
				enterError = json.message || 'Failed to start impersonation';
				return;
			}
			// Navigate to RM dashboard as this RM
			if (browser) window.location.href = '/dashboard/rm/policies';
		} catch {
			enterError = 'Network error. Please try again.';
		} finally {
			enteringRmId = null;
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>RM Management — Admin | DigitalDSA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-gray-900">RM Management</h1>
			<p class="mt-0.5 text-sm text-gray-500">
				{data.rms.length} registered RMs · Enter any RM profile to test PMS flows
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-4 rounded-xl border border-gray-200 bg-white p-4">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
			<!-- Search -->
			<div class="relative lg:col-span-2">
				<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
				<input
					type="text"
					placeholder="Search by name, email, mobile…"
					bind:value={searchQuery}
					class="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-8 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
				/>
			</div>

			<!-- State filter -->
			<select
				bind:value={filterState}
				class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
			>
				<option value="">All states</option>
				{#each data.states as state}
					<option value={state}>{state}</option>
				{/each}
			</select>

			<!-- Lender filter -->
			<select
				bind:value={filterLender}
				class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
			>
				<option value="">All lenders</option>
				{#each data.lenders as lender}
					<option value={lender.lenderId}>{lender.lenderName}</option>
				{/each}
			</select>

			<!-- Onboarding filter -->
			<select
				bind:value={filterOnboarded}
				class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
			>
				<option value="all">All RMs</option>
				<option value="yes">Onboarded only</option>
				<option value="no">Not onboarded</option>
			</select>
		</div>
	</div>

	{#if enterError}
		<div class="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<AlertCircle size={14} />
			{enterError}
		</div>
	{/if}

	<!-- RM Table -->
	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
		{#if filteredRms.length === 0}
			<div class="py-16 text-center">
				<Users size={28} class="mx-auto mb-2 text-gray-300" />
				<p class="text-sm font-medium text-gray-500">No RMs match your filters</p>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						<th class="px-4 py-3">RM</th>
						<th class="px-4 py-3">Location</th>
						<th class="px-4 py-3">Lenders</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Last active</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-50">
					{#each filteredRms as rm (rm.id)}
						<tr class="hover:bg-gray-50/50">
							<!-- RM identity -->
							<td class="px-4 py-3">
								<p class="font-medium text-gray-900">{rm.name}</p>
								<p class="text-xs text-gray-400">{rm.email}</p>
								{#if rm.mobileNumber}
									<p class="text-xs text-gray-400">{rm.mobileNumber}</p>
								{/if}
							</td>

							<!-- Location -->
							<td class="px-4 py-3">
								{#if rm.city || rm.state}
									<div class="flex items-center gap-1 text-gray-600">
										<MapPin size={11} class="text-gray-400" />
										<span>{[rm.city, rm.state].filter(Boolean).join(', ')}</span>
									</div>
								{:else}
									<span class="text-gray-300">—</span>
								{/if}
							</td>

							<!-- Lender assignments -->
							<td class="px-4 py-3">
								{#if rm.lenderAssignments.length === 0}
									<span class="text-gray-300">—</span>
								{:else}
									<div class="flex flex-wrap gap-1">
										{#each rm.lenderAssignments.slice(0, 3) as assignment}
											<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium
												{assignment.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}">
												<Building2 size={9} />
												{assignment.lenderName}
											</span>
										{/each}
										{#if rm.lenderAssignments.length > 3}
											<span class="text-xs text-gray-400">+{rm.lenderAssignments.length - 3} more</span>
										{/if}
									</div>
								{/if}
							</td>

							<!-- Onboarding status -->
							<td class="px-4 py-3">
								{#if rm.onboardingCompleted}
									<span class="inline-flex items-center gap-1 text-xs text-green-600">
										<CheckCircle size={12} />
										Onboarded
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-xs text-amber-600">
										<Clock size={12} />
										Pending
									</span>
								{/if}
							</td>

							<!-- Last active -->
							<td class="px-4 py-3 text-xs text-gray-500">
								{formatDate(rm.lastActiveAt)}
							</td>

							<!-- Enter button -->
							<td class="px-4 py-3 text-right">
								<button
									onclick={() => enterAsRm(rm.id, rm.name)}
									disabled={enteringRmId === rm.id}
									class="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
								>
									<LogIn size={12} />
									{enteringRmId === rm.id ? 'Entering…' : 'Enter as RM'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
				Showing {filteredRms.length} of {data.rms.length} RMs
			</div>
		{/if}
	</div>
</div>
