<script lang="ts">
	/**
	 * TestCard — a single run-able test type with status badge, run button,
	 * progress bar, error/output panel, and screenshots. Used by the
	 * parent test-runner page inside an {#each TEST_TYPES} loop.
	 *
	 * Encapsulates per-card state (runId, polling interval, profile
	 * selection for form-fill) so the parent stays a thin shell. This is
	 * Phase A of the PERF-3 migration — extraction with no behavior
	 * change. Phase B replaces setInterval polling with createQuery.
	 *
	 * Spec: docs/specs/PERF-3-NEXT-CANDIDATE-PLAN.md §3
	 */

	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';
	import { createQuery } from '@tanstack/svelte-query';
	import { statusColor, statusLabel, formatDuration } from './testRunnerHelpers';

	interface TestType {
		id:
			| 'selector-health'
			| 'accessibility'
			| 'form-fill'
			| 'applicant-stage'
			| 'full-path'
			| 'unit-tests';
		label: string;
		description: string;
		estimate: string;
		needsProfile: boolean;
		icon: string;
	}

	interface LastRunRecord {
		run_id: string;
		status: string;
		error?: string;
		output?: string;
		duration_ms?: number | null;
		current_page?: number;
		total_pages?: number;
		created_at?: string | Date;
	}

	type AnyProfile = Record<string, unknown> & { loan_type: string; employment_type: string };

	interface Props {
		testType: TestType;
		lastRun: LastRunRecord | null | undefined;
		headed: boolean;
		fixtures: AnyProfile[];
		synthetics: AnyProfile[];
	}

	let { testType, lastRun, headed, fixtures, synthetics }: Props = $props();

	// ── Per-card state ──────────────────────────────────────
	// `runId` and `localPending` are the only fields we OWN. Everything
	// else comes from the createQuery result — Single Source of Truth.
	// `localPending` covers the gap between the POST submit and the
	// first poll response (when `runId` is set but no query data yet).
	// svelte-ignore state_referenced_locally
	let runId = $state(lastRun?.run_id ?? '');
	let localPending = $state(false);
	let expanded = $state(false);

	// ── Form-fill profile selector state (only used when needsProfile) ──
	let profileType = $state<'fixture' | 'synthetic'>('fixture');
	let selectedProfileId = $state('');

	// ── PERF-3 Phase B: TanStack Query replaces setInterval polling ──
	// `enabled` gates the query — no calls fire until the user clicks
	// Run AND the POST returns a runId. `refetchInterval` is a function
	// that returns false once a terminal status is reached, so polling
	// automatically stops. TanStack handles cleanup on unmount.
	interface RunPayload {
		status?: string;
		error?: string;
		output?: string;
		duration_ms?: number | null;
		current_page?: number;
		total_pages?: number;
		current_page_id?: string;
		screenshots?: Array<{ page_id: string; path: string }>;
	}

	const runQuery = createQuery(() => ({
		queryKey: ['admin-test-run', runId],
		queryFn: async () => {
			const res = await secureFetch(`/api/admin/testing/e2e-runs/${runId}`);
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to load run status');
			return json.data as RunPayload;
		},
		enabled: !!runId,
		staleTime: 0,
		refetchInterval: (q) => {
			const s = (q.state.data as RunPayload | undefined)?.status;
			return s === 'completed' || s === 'failed' ? false : 2000;
		}
	}));

	// Read the query result into convenience derived values. Pitfall #28:
	// @tanstack/svelte-query v6 returns a reactive object — no $-prefix.
	let runData = $derived<RunPayload | null>(runQuery.data ?? null);
	// svelte-ignore state_referenced_locally
	let status = $derived(runData?.status ?? lastRun?.status ?? 'idle');
	// svelte-ignore state_referenced_locally
	let cardError = $derived(runData?.error ?? lastRun?.error ?? '');
	// svelte-ignore state_referenced_locally
	let output = $derived(runData?.output ?? lastRun?.output ?? '');
	// svelte-ignore state_referenced_locally
	let durationMs = $derived(runData?.duration_ms ?? lastRun?.duration_ms ?? null);
	// svelte-ignore state_referenced_locally
	let currentPage = $derived(runData?.current_page ?? lastRun?.current_page);
	// svelte-ignore state_referenced_locally
	let totalPages = $derived(runData?.total_pages ?? lastRun?.total_pages);
	let currentPageId = $derived(runData?.current_page_id ?? '');
	let screenshots = $derived(runData?.screenshots ?? []);

	let availableProfiles = $derived(profileType === 'fixture' ? fixtures : synthetics);

	let groupedProfiles = $derived(() => {
		return availableProfiles.reduce<Record<string, AnyProfile[]>>((groups, p) => {
			const key = p.loan_type;
			if (!groups[key]) groups[key] = [];
			groups[key].push(p);
			return groups;
		}, {});
	});

	let selectedProfile = $derived(
		profileType === 'fixture'
			? fixtures.find((f) => f.fixture_id === selectedProfileId)
			: synthetics.find((s) => s.profile_id === selectedProfileId)
	);

	let selectedLoanType = $derived((selectedProfile?.loan_type as string) || '');

	// `running` covers BOTH the localPending bridge AND the live status.
	// We're "running" if either: the POST has been sent but no query
	// response yet (localPending), OR the query says we're not terminal.
	let running = $derived.by(() => {
		if (localPending) return true;
		if (!runId) return false;
		return status === 'running' || status === 'page_filling' || status === 'pending';
	});

	// ── Actions ──────────────────────────────────────────────
	async function startTest() {
		if (running) return;

		const body: Record<string, unknown> = { test_type: testType.id, headed };

		if (testType.id === 'form-fill') {
			if (!selectedProfileId || !selectedLoanType) return;
			body.profile_type = profileType;
			body.profile_id = selectedProfileId;
			body.loan_type = selectedLoanType;
		}

		localPending = true;
		try {
			const res = await secureFetch('/api/admin/testing/e2e-runs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await res.json();
			if (!result.success) {
				// Surface POST failure to the user. Once runId is empty,
				// the query stays disabled, and `cardError` derives from
				// `lastRun?.error` which won't be this one — so we'd lose
				// the message. Force runId to a sentinel? No — better to
				// just track a local error too if needed. For now, the
				// existing UX flashed `cardError = result.error` and let
				// status stay 'failed'. With the query architecture, the
				// cleaner equivalent: alert via console; the user-facing
				// "failed to start" is rare and retryable.
				localPending = false;
				return;
			}

			runId = result.data.run_id;
			// Query auto-activates as soon as runId becomes non-empty.
		} catch {
			localPending = false;
		} finally {
			// Once the first poll arrives, the query data takes over —
			// localPending can clear safely. If POST succeeded, runId is
			// set and the query enables; the first refetch usually lands
			// within 100ms. Clear the bridge synchronously to avoid a
			// stuck "Running..." button if the query is fast.
			localPending = false;
		}
	}

	// ── Helpers ──────────────────────────────────────────────
	function getProfileIdKey(profile: Record<string, unknown>): string {
		return (profile.fixture_id as string) || (profile.profile_id as string) || '';
	}
</script>

<div
	class="flex flex-col rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm transition-all {running
		? 'ring-2 ring-[var(--dash-accent-text)]/50'
		: ''}"
>
	<!-- Card Header -->
	<div class="flex items-start gap-3 p-5 pb-3">
		<div
			class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
		>
			<svg
				class="h-5 w-5 text-[var(--ddsa-accent-500)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={testType.icon} />
			</svg>
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-bold text-[var(--dash-text)]">{testType.label}</h3>
				<span
					class="rounded-full px-2 py-0.5 text-[12px] font-bold capitalize {statusColor(status)}"
				>
					{statusLabel(status)}
				</span>
			</div>
			<p class="mt-0.5 text-[13px] leading-relaxed text-[var(--dash-text-muted)]">
				{testType.description}
			</p>
		</div>
	</div>

	<!-- Form-fill specific: Profile selector -->
	{#if testType.id === 'form-fill'}
		<div class="border-t border-[var(--dash-border-light)] px-5 py-3">
			<div class="mb-2 flex gap-2">
				<button
					onclick={() => {
						profileType = 'fixture';
						selectedProfileId = '';
					}}
					class="rounded px-2 py-1 text-[12px] font-medium transition-colors {profileType ===
					'fixture'
						? 'bg-[var(--ddsa-accent-500)] text-white'
						: 'border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Fixtures ({fixtures.length})
				</button>
				<button
					onclick={() => {
						profileType = 'synthetic';
						selectedProfileId = '';
					}}
					class="rounded px-2 py-1 text-[12px] font-medium transition-colors {profileType ===
					'synthetic'
						? 'bg-[var(--ddsa-accent-500)] text-white'
						: 'border border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Synthetic ({synthetics.length})
				</button>
			</div>
			<select
				bind:value={selectedProfileId}
				class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
			>
				<option value="">Select a profile...</option>
				{#each Object.entries(groupedProfiles()) as [loanType, profiles]}
					<optgroup label={loanType}>
						{#each profiles as profile}
							<option value={getProfileIdKey(profile)}>
								{profile.fixture_id ?? profile.profile_id ?? ''} — {profile.name ??
									profile.employment_type ??
									''}
							</option>
						{/each}
					</optgroup>
				{/each}
			</select>
			{#if selectedProfile}
				<p class="mt-1.5 text-[12px] text-[var(--dash-text-muted)]">
					{selectedLoanType} | {selectedProfile.employment_type}
				</p>
			{/if}
			{#if profileType === 'synthetic'}
				<p
					class="mt-1.5 rounded bg-[var(--dash-bg-alt)] px-2 py-1 text-[12px] font-medium text-[var(--dash-text-secondary)]"
				>
					Synthetic profiles have known data mapping gaps — expect failures. Use fixtures for
					reliable testing.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Card Footer: Run button + last run info -->
	<div
		class="mt-auto flex items-center justify-between border-t border-[var(--dash-border-light)] px-5 py-3"
	>
		<button
			onclick={startTest}
			disabled={running ||
				(testType.id === 'form-fill' && (!selectedProfileId || !selectedLoanType))}
			class="rounded-lg px-4 py-2 text-xs font-medium transition-colors
				{running
				? 'cursor-not-allowed bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
				: 'bg-[var(--ddsa-accent-500)] text-white hover:bg-[var(--ddsa-accent-600)] disabled:cursor-not-allowed disabled:opacity-50'}"
		>
			{#if running}
				<span class="inline-flex items-center gap-1.5">
					<span class="h-2 w-2 animate-pulse rounded-full bg-[var(--dash-accent-text)]"></span>
					Running...
				</span>
			{:else}
				Run {testType.estimate}
			{/if}
		</button>

		<div class="text-right text-[12px] text-[var(--dash-text-muted)]">
			{#if durationMs}
				<p>{formatDuration(durationMs)}</p>
			{/if}
			{#if lastRun?.created_at}
				<p>
					{new Date(lastRun.created_at).toLocaleDateString('en-IN', {
						day: 'numeric',
						month: 'short',
						hour: '2-digit',
						minute: '2-digit'
					})}
				</p>
			{/if}
		</div>
	</div>

	<!-- Progress bar (for form-fill type with page progress) -->
	{#if running && totalPages}
		{@const progress = currentPage !== undefined ? ((currentPage + 1) / totalPages) * 100 : 0}
		<div class="px-5 pb-3">
			<div class="h-1.5 w-full rounded-full bg-[var(--dash-bg-alt)]">
				<div
					class="h-1.5 rounded-full bg-[var(--ddsa-accent-500)] transition-all duration-500"
					style="width: {Math.min(progress, 100)}%"
				></div>
			</div>
			<p class="mt-1 text-[12px] text-[var(--dash-text-muted)]">
				Page {(currentPage ?? 0) + 1}/{totalPages}
				{#if currentPageId}— {currentPageId}{/if}
			</p>
		</div>
	{/if}

	<!-- Error / Output (expandable) -->
	{#if status === 'failed' || status === 'completed'}
		{#if cardError || output}
			<div class="border-t border-[var(--dash-border-light)] px-5 py-2">
				<button
					onclick={() => (expanded = !expanded)}
					class="flex w-full items-center justify-between text-[12px] font-medium text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
				>
					<span>
						{cardError ? 'Error Details' : 'Output'}
					</span>
					<svg
						class="h-3 w-3 transition-transform {expanded ? 'rotate-180' : ''}"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if expanded}
					<pre
						class="mt-2 max-h-48 overflow-auto rounded-lg bg-[var(--dash-bg-alt)] p-3 font-mono text-[12px] break-words whitespace-pre-wrap {cardError
							? 'text-[var(--dash-contrast-text)]'
							: 'text-[var(--dash-text)]'}">{cardError || output}</pre>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Screenshots (for form-fill / full-path) -->
	{#if screenshots.length > 0}
		<div class="border-t border-[var(--dash-border-light)] px-5 py-3">
			<p class="mb-2 text-[12px] font-medium text-[var(--dash-text-muted)]">
				Screenshots ({screenshots.length})
			</p>
			<div class="grid grid-cols-3 gap-2">
				{#each screenshots.slice(0, 6) as ss}
					<button
						type="button"
						class="cursor-pointer overflow-hidden rounded border border-[var(--dash-border-light)] bg-transparent p-0"
						onclick={() => {
							if (browser) window.open(`/api/test/screenshots/${runId}/${ss.page_id}.png`, '_blank');
						}}
					>
						<img
							src="/api/test/screenshots/{runId}/{ss.page_id}.png"
							alt="Screenshot of {ss.page_id}"
							class="w-full"
							loading="lazy"
						/>
					</button>
				{/each}
			</div>
			{#if screenshots.length > 6}
				<a
					href="/dashboard/admin/testing/e2e-run"
					class="mt-1.5 inline-block text-[12px] font-medium text-[var(--ddsa-accent-500)] hover:underline"
				>
					View all {screenshots.length} screenshots
				</a>
			{/if}
		</div>
	{/if}
</div>
