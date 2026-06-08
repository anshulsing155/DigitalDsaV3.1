<script lang="ts">
	/**
	 * Admin E2E Form Fill — /dashboard/admin/testing/e2e-run
	 * ═══════════════════════════════════════════════════════════════
	 * Select a fixture/synthetic profile, trigger E2E form filling,
	 * watch live progress with screenshots.
	 * ═══════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';
	import { createQuery } from '@tanstack/svelte-query';

	let { data }: { data: PageData } = $props();

	// ── State ──────────────────────────────────────────────────
	let profileType = $state<'fixture' | 'synthetic'>('fixture');
	let selectedProfileId = $state('');
	let starting = $state(false); // true between Run-click and the first poll response
	let headed = $state(true);
	let activeRunId = $state('');
	let errorMessage = $state('');

	// ── Run status polling (PERF-3 — TanStack Query) ────────────────
	// Previously: hand-rolled `setInterval(pollStatus, 2000)` + `pollInterval`
	// state + `stopPolling()` cleanup. That worked but every consumer of the
	// run had to reach into the same state to know "is this terminal yet?".
	//
	// Now: createQuery owns the polling loop. The query is `enabled` only when
	// an `activeRunId` is set (no calls before the user clicks Run). The
	// `refetchInterval` is a function — TanStack decides per-tick whether to
	// poll based on the current status. Polling automatically stops when
	// status flips to `completed` or `failed`, AND auto-cleans up on unmount.
	const runQuery = createQuery(() => ({
		queryKey: ['admin-e2e-run', activeRunId],
		queryFn: async () => {
			const res = await secureFetch(`/api/admin/testing/e2e-runs/${activeRunId}`);
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to load run status');
			return json.data as Record<string, unknown>;
		},
		enabled: !!activeRunId,
		refetchInterval: (q) => {
			const status = (q.state.data as { status?: string } | undefined)?.status;
			return status === 'completed' || status === 'failed' ? false : 2000;
		}
	}));

	// @tanstack/svelte-query v6 returns a reactive object — access fields
	// directly, no `$`-prefix (CLAUDE.md Pitfall #28).
	let runStatus = $derived(runQuery.data ?? null);
	let running = $derived.by(() => {
		// "Running" means: the user clicked Run AND we haven't seen a terminal
		// status yet. Covers the gap between POST submit and first poll.
		if (starting) return true;
		if (!activeRunId) return false;
		const status = (runStatus as { status?: string } | null)?.status;
		return status !== 'completed' && status !== 'failed';
	});

	// ── Derived ────────────────────────────────────────────────
	let availableProfiles = $derived(profileType === 'fixture' ? data.fixtures : data.synthetics);

	let selectedProfile = $derived(
		profileType === 'fixture'
			? data.fixtures.find((f) => f.fixture_id === selectedProfileId)
			: data.synthetics.find((s) => s.profile_id === selectedProfileId)
	);

	let selectedLoanType = $derived(selectedProfile?.loan_type || '');

	// ── Profile grouped by loan type ──────────────────────────
	let fixturesByLoanType = $derived(
		data.fixtures.reduce<Record<string, typeof data.fixtures>>((groups, f) => {
			const key = f.loan_type;
			if (!groups[key]) groups[key] = [];
			groups[key].push(f);
			return groups;
		}, {})
	);

	let syntheticsByLoanType = $derived(
		data.synthetics.reduce<Record<string, typeof data.synthetics>>((groups, s) => {
			const key = s.loan_type;
			if (!groups[key]) groups[key] = [];
			groups[key].push(s);
			return groups;
		}, {})
	);

	let groupedProfiles = $derived(
		profileType === 'fixture' ? fixturesByLoanType : syntheticsByLoanType
	);

	// ── Actions ────────────────────────────────────────────────
	async function startRun() {
		if (!selectedProfileId || !selectedLoanType) return;

		starting = true;
		errorMessage = '';

		try {
			const res = await secureFetch('/api/admin/testing/e2e-runs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					profile_type: profileType,
					profile_id: selectedProfileId,
					loan_type: selectedLoanType,
					headed
				})
			});

			const result = await res.json();
			if (!result.success) {
				errorMessage = result.error || 'Failed to start run';
				starting = false;
				return;
			}

			// Setting activeRunId enables the createQuery polling loop above.
			// No manual setInterval / cleanup needed — TanStack handles it.
			activeRunId = result.data.run_id;
		} catch {
			errorMessage = 'Network error';
		} finally {
			// `starting` only covers the POST window; once we have an
			// activeRunId the createQuery `enabled` gate takes over driving
			// the `running` derivation.
			starting = false;
		}
	}

	function getProfileIdKey(profile: Record<string, unknown>): string {
		return (profile.fixture_id as string) || (profile.profile_id as string) || '';
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'text-[var(--dash-accent-text)] bg-[var(--dash-btn-ghost-bg)]';
			case 'failed':
				return 'text-[var(--dash-contrast-text)] bg-[var(--dash-contrast-ghost-bg)]';
			case 'running':
			case 'page_filling':
				return 'text-[var(--dash-text)] bg-[var(--dash-bg-alt)]';
			default:
				return 'text-[var(--dash-text-muted)] bg-[var(--dash-bg-alt)]';
		}
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}
</script>

<svelte:head>
	<title>Admin: E2E Run | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-[var(--dash-text)]">E2E Form Fill</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Select a profile, trigger form filling, watch live progress
			</p>
		</div>
		<a
			href="/dashboard/admin/testing"
			class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
		>
			Back to Testing
		</a>
	</div>

	<!-- Section A: Profile Selector -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
			Select Profile
		</h2>

		<!-- Type Toggle -->
		<div class="mb-4 flex gap-2">
			<button
				onclick={() => {
					profileType = 'fixture';
					selectedProfileId = '';
				}}
				class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {profileType ===
				'fixture'
					? 'bg-[var(--ddsa-accent-500)] text-white'
					: 'border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
			>
				Fixtures ({data.fixtures.length})
			</button>
			<button
				onclick={() => {
					profileType = 'synthetic';
					selectedProfileId = '';
				}}
				class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {profileType ===
				'synthetic'
					? 'bg-[var(--ddsa-accent-500)] text-white'
					: 'border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
			>
				Synthetic ({data.synthetics.length})
			</button>
		</div>

		<!-- Profile Dropdown (grouped by loan type) -->
		{#if Object.keys(groupedProfiles).length > 0}
			<select
				bind:value={selectedProfileId}
				class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
			>
				<option value="">Select a profile...</option>
				{#each Object.entries(groupedProfiles) as [loanType, profiles]}
					<optgroup label={loanType}>
						{#each profiles as profile}
							<option value={getProfileIdKey(profile)}>
								{profile.fixture_id || profile.profile_id} - {profile.name ||
									profile.employment_type}
							</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		{:else}
			<p class="text-sm text-[var(--dash-text-muted)]">
				No {profileType} profiles available.
				{#if profileType === 'fixture'}
					Seed them from the Testing Dashboard.
				{/if}
			</p>
		{/if}

		<!-- Selected Profile Preview -->
		{#if selectedProfile}
			<div class="mt-4 rounded-lg bg-[var(--dash-bg-alt)] p-3">
				<div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
					<div>
						<p class="text-[var(--dash-text-muted)]">Loan Type</p>
						<p class="font-semibold text-[var(--dash-text)]">{selectedProfile.loan_type}</p>
					</div>
					<div>
						<p class="text-[var(--dash-text-muted)]">Employment</p>
						<p class="font-semibold text-[var(--dash-text)]">{selectedProfile.employment_type}</p>
					</div>
					{#if 'description' in selectedProfile && selectedProfile.description}
						<div class="col-span-2">
							<p class="text-[var(--dash-text-muted)]">Description</p>
							<p class="text-[var(--dash-text-secondary)]">{selectedProfile.description}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Section B: Run Trigger -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<div class="flex flex-wrap items-center gap-4">
			<button
				onclick={startRun}
				disabled={!selectedProfileId || running}
				class="rounded-lg bg-[var(--ddsa-accent-500)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{running ? 'Running...' : 'Start E2E Fill'}
			</button>

			<!-- Headed mode toggle -->
			<label
				class="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--dash-border-light)] px-3 py-2 transition-colors hover:bg-[var(--dash-hover)]"
			>
				<input
					type="checkbox"
					bind:checked={headed}
					disabled={running}
					class="h-4 w-4 rounded border-[var(--dash-border-light)] text-[var(--ddsa-accent-500)] accent-[var(--ddsa-accent-500)]"
				/>
				<span class="text-xs font-medium text-[var(--dash-text-secondary)]"> Show browser </span>
				<span class="text-[12px] text-[var(--dash-text-muted)]">
					{headed ? '(visible window)' : '(headless)'}
				</span>
			</label>

			{#if activeRunId}
				<span class="font-mono text-xs text-[var(--dash-text-muted)]">{activeRunId}</span>
			{/if}
		</div>

		{#if errorMessage}
			<p class="mt-3 text-sm font-medium text-[var(--dash-contrast-text)]">{errorMessage}</p>
		{/if}
	</div>

	<!-- Section C: Live Status Panel -->
	{#if runStatus}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
				Run Status
			</h2>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<!-- Status Badge -->
				<div class="rounded-lg p-3 text-center {statusColor(runStatus.status as string)}">
					<p class="text-sm font-bold capitalize">{runStatus.status}</p>
					<p class="text-[12px]">Status</p>
				</div>

				<!-- Progress -->
				<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
					<p class="text-lg font-bold text-[var(--dash-text)]">
						{runStatus.current_page !== undefined ? (runStatus.current_page as number) + 1 : 0}
						/ {runStatus.total_pages ?? '?'}
					</p>
					<p class="text-[12px] text-[var(--dash-text-muted)]">Pages</p>
				</div>

				<!-- Current Page -->
				<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
					<p class="truncate text-sm font-medium text-[var(--dash-text)]">
						{runStatus.current_page_id || '-'}
					</p>
					<p class="text-[12px] text-[var(--dash-text-muted)]">Current Page</p>
				</div>

				<!-- Screenshots -->
				<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
					<p class="text-lg font-bold text-[var(--dash-text)]">
						{(runStatus.screenshots as Array<unknown>)?.length ?? 0}
					</p>
					<p class="text-[12px] text-[var(--dash-text-muted)]">Screenshots</p>
				</div>
			</div>

			<!-- Progress Bar -->
			{#if runStatus.total_pages}
				{@const progress =
					runStatus.current_page !== undefined
						? (((runStatus.current_page as number) + 1) / (runStatus.total_pages as number)) * 100
						: 0}
				<div class="mt-4 h-2 w-full rounded-full bg-[var(--dash-bg-alt)]">
					<div
						class="h-2 rounded-full bg-[var(--ddsa-accent-500)] transition-all duration-500"
						style="width: {Math.min(progress, 100)}%"
					></div>
				</div>
			{/if}

			<!-- Error -->
			{#if runStatus.error}
				<div class="mt-4 rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-3">
					<p class="mb-1 text-xs font-bold text-[var(--dash-contrast-text)]">Error Details</p>
					<pre
						class="max-h-60 overflow-auto rounded bg-[var(--dash-bg-alt)] p-3 font-mono text-[13px] break-words whitespace-pre-wrap text-[var(--dash-contrast-text)]">{runStatus.error}</pre>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Section D: Screenshot Gallery -->
	{#if runStatus && Array.isArray(runStatus.screenshots) && runStatus.screenshots.length > 0}
		{@const screenshots = runStatus.screenshots as Array<{ page_id: string; path: string }>}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
				Screenshots
			</h2>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each screenshots as ss}
					<div class="overflow-hidden rounded-lg border border-[var(--dash-border-light)]">
						<div class="bg-[var(--dash-bg-alt)] px-3 py-1.5">
							<p class="truncate text-xs font-medium text-[var(--dash-text)]">{ss.page_id}</p>
						</div>
						<button
							type="button"
							class="w-full cursor-pointer border-0 bg-transparent p-0"
							onclick={() => {
								if (browser) window.open(`/api/test/screenshots/${activeRunId}/${ss.page_id}.png`, '_blank');
							}}
						>
							<img
								src="/api/test/screenshots/{activeRunId}/{ss.page_id}.png"
								alt="Screenshot of {ss.page_id}"
								class="w-full"
								loading="lazy"
							/>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Section E: Run History -->
	{#if data.recentRuns.length > 0}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
				Run History
			</h2>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr
							class="border-b border-[var(--dash-border-light)] text-left text-xs font-medium tracking-wider text-[var(--dash-text-muted)] uppercase"
						>
							<th class="px-3 py-2">Date</th>
							<th class="px-3 py-2">Profile</th>
							<th class="px-3 py-2">Loan Type</th>
							<th class="px-3 py-2">Status</th>
							<th class="px-3 py-2">Duration</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--dash-border-light)]">
						{#each data.recentRuns as run}
							<tr class="transition-colors hover:bg-[var(--dash-hover)]">
								<td class="px-3 py-2 text-xs text-[var(--dash-text-muted)]">
									{new Date(run.created_at).toLocaleDateString('en-IN', {
										day: 'numeric',
										month: 'short',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</td>
								<td class="px-3 py-2 font-mono text-xs text-[var(--dash-text)]">
									{run.profile_id}
								</td>
								<td class="px-3 py-2 text-xs text-[var(--dash-text-secondary)]">
									{run.loan_type}
								</td>
								<td class="px-3 py-2">
									<span
										class="inline-block rounded-full px-2 py-0.5 text-[12px] font-bold capitalize {statusColor(
											run.status
										)}"
									>
										{run.status}
									</span>
								</td>
								<td class="px-3 py-2 text-xs text-[var(--dash-text-muted)]">
									{formatDuration(run.duration_ms)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
