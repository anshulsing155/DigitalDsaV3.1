<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';
	import type { LenderResult, LenderResultsData } from '$lib/types/lenderResults';
	import type {
		LenderSelectionState,
		LenderChangeDelta,
		LenderSelection
	} from '$lib/types/lenderResultsSnapshot';
	import ResultsSummaryBar from '$lib/components/dashboard/results/ResultsSummaryBar.svelte';
	import ResultsSortFilterBar from '$lib/components/dashboard/results/ResultsSortFilterBar.svelte';
	import LenderResultCard from '$lib/components/dashboard/results/LenderResultCard.svelte';
	import CrossSellBanner from '$lib/components/dashboard/results/CrossSellBanner.svelte';
	import AffordabilityOverview from '$lib/components/dashboard/results/AffordabilityOverview.svelte';
	import VersionTimelineStrip from '$lib/components/dashboard/results/VersionTimelineStrip.svelte';
	import CheckForUpdatesButton from '$lib/components/dashboard/results/CheckForUpdatesButton.svelte';
	import { ArrowRight } from '$lib/utils/iconRegistry';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { dialogState } from '$lib/state/dialog.svelte';

	// ── Page data ──────────────────────────────────────────────
	// 2026-06-03: the heavy server-side load moved to
	// /api/cases/[case_id]/results-data so the SvelteKit __data.json fetch
	// for this page returns instantly and the slow work doesn't 504 on
	// Vercel Hobby's 10s function ceiling. The page now fetches its
	// results data CLIENT-SIDE on mount and shows a loading state until
	// it arrives. If the API itself 504s, the page is already rendered
	// and the user gets a retry button instead of a Vercel 504 page.
	let { data } = $props();
	const caseId = $derived(data.caseId);

	// Client-fetched results data — initialized to the "no results yet"
	// shape so the existing template's $derived bindings keep working
	// before the fetch returns.
	let resultsData = $state({
		lenderResults: null as LenderResultsData | null,
		hasResults: false,
		currentVersion: 0,
		totalVersions: 0,
		changeDeltas: [] as LenderChangeDelta[],
		versionHistory: [] as Array<{
			version: number;
			trigger: string;
			created_at: string;
			change_summary?: string;
		}>,
		formSnapshotVersion: 0,
		sourceFormSnapshotVersion: 0,
		previouslyRejectedLenders: [] as string[],
		assessmentStatus: '',
		rejectionReasons: [] as string[]
	});

	// Loading + error state for the client fetch. Defaults to loading=true
	// so the empty-state template branch renders "loading offers" instead
	// of "no offers yet" during the initial fetch.
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Rotating insight messages shown during the loading state. Tuned for
	// the DSA persona — practical workflow tips and lender-comparison
	// nuggets rather than generic "did you know" filler. Index advances
	// every ~3.5s so even a 10-15s API wait surfaces 3-4 tips.
	const LOADING_INSIGHTS = [
		'Tap any offer card to see required documents and EMI breakdown.',
		"Lower ROI doesn't always mean lower total interest — check the tenure too.",
		'Multiple offers help your client negotiate better terms with their preferred lender.',
		'Your CIBIL score influences ROI more than the loan amount.',
		'Banks typically offer better ROI than NBFCs for prime borrowers.',
		'Offers are ranked by approval probability AND lowest effective cost.',
		'DigitalDSA refreshes lender policies daily — offers reflect today’s eligibility.'
	];
	let currentInsightIndex = $state(0);
	let insightInterval: ReturnType<typeof setInterval> | null = null;

	// Case summary fields for the loading header — read from parent layout
	// data. These display while the API fetch is in flight so the DSA sees
	// case context the moment they land on the page.
	const caseLabel = $derived(($page.data as any)?.caseData?.label as string | undefined);
	const caseLoanType = $derived(($page.data as any)?.caseData?.loan?.type as string | undefined);
	const caseAmountRequired = $derived(
		($page.data as any)?.caseData?.loan?.amount_required as number | undefined
	);
	const caseTenureYears = $derived(
		($page.data as any)?.caseData?.loan?.tenure_years as number | undefined
	);

	function formatAmount(n: number | undefined): string {
		if (!n || n <= 0) return '';
		if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
		if (n >= 100_000) return `₹${(n / 100_000).toFixed(0)}L`;
		return `₹${n.toLocaleString('en-IN')}`;
	}

	async function fetchResultsData() {
		isLoading = true;
		loadError = null;
		try {
			const versionParam = $page.url.searchParams.get('version');
			const url = versionParam
				? `/api/cases/${encodeURIComponent(data.caseId)}/results-data?version=${encodeURIComponent(versionParam)}`
				: `/api/cases/${encodeURIComponent(data.caseId)}/results-data`;
			const res = await fetch(url);
			if (!res.ok) {
				loadError =
					res.status === 504
						? 'Server is busy — please tap Retry. The second attempt usually completes instantly.'
						: `Failed to load offers (HTTP ${res.status}). Please tap Retry.`;
				isLoading = false;
				return;
			}
			const body = await res.json();
			if (body?.success && body?.data) {
				// Object.assign keeps the $state proxy reactive; replacing
				// the whole binding would break the $derived chain below.
				Object.assign(resultsData, body.data);
				selections = (body.data.selections as LenderSelection[]) ?? [];
			} else {
				loadError = body?.error || 'Unexpected response shape from results API';
			}
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Network error';
		}
		isLoading = false;
	}

	function handleRetryLoad() {
		void fetchResultsData();
	}

	onMount(() => {
		void fetchResultsData();

		// Rotate the loading insight every ~3.5s. Cleared on unmount and on
		// transition out of the loading state (the {#key} block re-renders
		// when currentInsightIndex changes so each insight gets a soft
		// fade-in via the bound CSS animation).
		insightInterval = setInterval(() => {
			currentInsightIndex = (currentInsightIndex + 1) % LOADING_INSIGHTS.length;
		}, 3500);
		return () => {
			if (insightInterval) clearInterval(insightInterval);
		};
	});

	const lenderResults = $derived(resultsData.lenderResults);
	const hasResults = $derived(resultsData.hasResults);
	const currentVersion = $derived(resultsData.currentVersion);
	const totalVersions = $derived(resultsData.totalVersions);
	const changeDeltas = $derived(resultsData.changeDeltas);
	const versionHistory = $derived(resultsData.versionHistory);
	const formSnapshotVersion = $derived(resultsData.formSnapshotVersion ?? 0);
	const sourceFormSnapshotVersion = $derived(resultsData.sourceFormSnapshotVersion ?? 0);
	const isFormStale = $derived(
		formSnapshotVersion > 0 &&
			sourceFormSnapshotVersion > 0 &&
			formSnapshotVersion > sourceFormSnapshotVersion
	);

	// ── Previously-rejected lender data (from form assessment step) ──
	const previouslyRejectedLenders = $derived(resultsData.previouslyRejectedLenders ?? []);
	const assessmentStatus = $derived(resultsData.assessmentStatus ?? '');

	// Set of rejected lender names for fast lookup
	const rejectedLenderSet = $derived(new Set(previouslyRejectedLenders));

	// ── Edit form URL from layout ────────────────────────────
	const editFormURL = $derived(($page.data as any)?.caseData?.editFormURL);
	// ── Quota state (Item 1 layout) — drives editFormDisabled at exhaustion ──
	const quotaState = $derived(($page.data as any)?.quotaState);
	const editDisabled = $derived(quotaState?.editFormDisabled === true);

	// ── Back-to-form nav guard ────────────────────────────────
	// Any navigation from this offer page to a /form/* route (browser-back,
	// sidebar link, or the in-page "Edit Application" / "Re-evaluate Now" /
	// "Edit Applicant Order" links) is intercepted with a ConfirmModal so the
	// DSA is reminded that re-submitting consumes another case from their
	// monthly plan. Adjustments that DON'T require a re-submit (loan tenure
	// slider, down-payment slider) live on this same offer page and bypass the
	// guard. `bypassFormNavGuard` lets the confirm handler re-fire the
	// navigation without re-prompting.
	let bypassFormNavGuard = $state(false);

	beforeNavigate((nav) => {
		if (bypassFormNavGuard) {
			bypassFormNavGuard = false;
			return;
		}
		// Only guard navigations heading INTO the form. Sidebar nav,
		// dashboard nav, logout, etc. are unaffected.
		if (!nav.to || !nav.to.url.pathname.startsWith('/form/')) return;

		// "New Case" navigation (sidebar Plus button) carries `?new=1` to mark
		// intent — DSA wants a brand-new application, not an edit of THIS case.
		// Let it through silently; the how-can-we-help page handles the rest
		// (auto-clears stored form state, skips the "Welcome back!" resume modal).
		if (nav.to.url.searchParams.has('new')) return;

		// Block the navigation, capture target, open the confirm modal.
		nav.cancel();
		const targetUrl = nav.to.url.pathname + nav.to.url.search;

		dialogState.openConfirmModal(
			'Edit this application?',
			'Going back to the form lets you change any detail, but re-submitting will count as one more submission under your monthly plan. If you only need to adjust loan tenure or down payment, do that here on the offer page without using another submission.',
			() => {
				// Confirm: re-fire the navigation, this time letting it through.
				bypassFormNavGuard = true;
				goto(targetUrl);
			},
			{
				confirmLabel: 'Edit and resubmit',
				cancelLabel: 'Stay on offers'
			}
		);
	});

	// ── Mutable selection state (updated via API) ─────────────
	// Initialized empty; populated from resultsData by fetchResultsData()
	// after the client-side API fetch returns. Existing selection-update
	// handlers still mutate this directly.
	let selections = $state<LenderSelection[]>([]);

	// ── Sort & filter state ────────────────────────────────────
	type SortOption = 'amount_desc' | 'roi_asc' | 'emi_asc';
	type FilterOption = 'all' | 'green' | 'amber' | 'red';

	let sortBy: SortOption = $state('amount_desc');
	let filterBy: FilterOption = $state('all');

	// ── Change delta lookup map ───────────────────────────────
	const deltaMap = $derived.by(() => {
		const map = new Map<string, LenderChangeDelta>();
		if (changeDeltas) {
			for (const d of changeDeltas) {
				map.set(d.lender_application_id, d);
			}
		}
		return map;
	});

	// ── Selection state lookup ────────────────────────────────
	const selectionMap = $derived.by(() => {
		const map = new Map<string, LenderSelectionState>();
		for (const s of selections) {
			map.set(s.lender_application_id, s.state);
		}
		return map;
	});

	// ── Selection counts ─────────────────────────────────────
	const selectedCount = $derived(selections.filter((s) => s.state === 'selected').length);
	const shortlistedCount = $derived(selections.filter((s) => s.state === 'shortlisted').length);
	const totalSelected = $derived(selectedCount + shortlistedCount);

	// ── Filtered results ───────────────────────────────────────
	const filteredResults = $derived.by(() => {
		if (!lenderResults) return [];
		if (filterBy === 'all') return lenderResults.results;
		return lenderResults.results.filter((r) => r.traffic_light === filterBy);
	});

	// ── Sorted results (previously-rejected lenders sorted to bottom) ────
	const sortedResults = $derived.by(() => {
		const arr = [...filteredResults];
		const hasRejected = rejectedLenderSet.size > 0;

		// Sort comparator that deprioritizes previously-rejected lenders
		function withRejectionSort(primarySort: (a: LenderResult, b: LenderResult) => number) {
			return (a: LenderResult, b: LenderResult) => {
				if (hasRejected) {
					const aRejected = rejectedLenderSet.has(a.lender_name);
					const bRejected = rejectedLenderSet.has(b.lender_name);
					if (aRejected && !bRejected) return 1;
					if (!aRejected && bRejected) return -1;
				}
				return primarySort(a, b);
			};
		}

		switch (sortBy) {
			case 'amount_desc':
				return arr.sort(withRejectionSort((a, b) => b.offered_amount - a.offered_amount));
			case 'roi_asc':
				return arr.sort(
					withRejectionSort((a, b) => {
						if (a.roi === 0 && b.roi === 0) return 0;
						if (a.roi === 0) return 1;
						if (b.roi === 0) return -1;
						return a.roi - b.roi;
					})
				);
			case 'emi_asc':
				return arr.sort(
					withRejectionSort((a, b) => {
						if (a.emi === 0 && b.emi === 0) return 0;
						if (a.emi === 0) return 1;
						if (b.emi === 0) return -1;
						return a.emi - b.emi;
					})
				);
			default:
				return arr;
		}
	});

	// ── Split into eligible and ineligible ─────────────────────
	const eligibleResults = $derived(sortedResults.filter((r) => r.traffic_light !== 'red'));
	const ineligibleResults = $derived(sortedResults.filter((r) => r.traffic_light === 'red'));

	// ── Best flags for badge display ───────────────────────────
	function getBestFlags(result: LenderResult) {
		if (!lenderResults) return { bestAmount: false, bestRoi: false, bestEmi: false };
		return {
			bestAmount: result.lender_name === lenderResults.summary.best_amount.lender,
			bestRoi: result.lender_name === lenderResults.summary.best_roi.lender,
			bestEmi: result.lender_name === lenderResults.summary.best_emi.lender
		};
	}

	// ── Get original rank (before filter) ──────────────────────
	function getOriginalRank(result: LenderResult): number {
		if (!lenderResults) return 0;
		const allSorted = [...lenderResults.results].sort(
			(a, b) => b.offered_amount - a.offered_amount
		);
		return allSorted.findIndex((r) => r.lender_application_id === result.lender_application_id) + 1;
	}

	// ── Filter counts ──────────────────────────────────────────
	const filterCounts = $derived({
		green: lenderResults?.results.filter((r) => r.traffic_light === 'green').length ?? 0,
		amber: lenderResults?.results.filter((r) => r.traffic_light === 'amber').length ?? 0,
		red: lenderResults?.results.filter((r) => r.traffic_light === 'red').length ?? 0,
		total: lenderResults?.results.length ?? 0
	});

	// ── Selection change handler ──────────────────────────────
	async function handleSelectionChange(lenderId: string, state: LenderSelectionState) {
		const prev = [...selections];
		const idx = selections.findIndex((s) => s.lender_application_id === lenderId);
		const entry = { lender_application_id: lenderId, state, updated_at: new Date() };
		if (idx !== -1) {
			selections[idx] = entry;
		} else {
			selections = [...selections, entry];
		}

		try {
			const res = await secureFetch(`/api/cases/${caseId}/selections`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					selections: [{ lender_application_id: lenderId, state }]
				})
			});
			if (!res.ok) {
				selections = prev;
			}
		} catch {
			selections = prev;
		}
	}

	// ── Version switching ─────────────────────────────────────
	// After the S220 CSR rewrite (be732a80), the heavy data fetch lives in
	// onMount → fetchResultsData(), not in +page.server.ts. goto() updates
	// the URL but the component doesn't re-mount, so onMount never refires
	// and the version swap looked dead. Call fetchResultsData() explicitly
	// after the URL update — it reads the version off $page.url.searchParams
	// at call time, so the new version's data lands.
	async function handleVersionSelect(version: number) {
		if (version === currentVersion) return;
		const url = new URL($page.url);
		url.searchParams.set('version', String(version));
		await goto(url, { invalidateAll: true, noScroll: true, keepFocus: true });
		await fetchResultsData();
	}

	// ── Staleness detection ───────────────────────────────────
	function handleStaleDetected(_staleLenders: Array<{ lender_name: string }>) {
		// Stale detection handled by CheckForUpdatesButton UI
	}

	// ── Selected lender names for sticky bar ──────────────────
	const selectedNames = $derived.by(() => {
		if (!lenderResults) return [];
		return selections
			.filter((s) => s.state === 'selected' || s.state === 'shortlisted')
			.map((s) => {
				const r = lenderResults.results.find(
					(r) => r.lender_application_id === s.lender_application_id
				);
				return r?.lender_name ?? '';
			})
			.filter(Boolean);
	});
</script>

<svelte:head>
	<title>Loan Results | DigitalDSA</title>
</svelte:head>

<div class="results-page">
	<!-- ════════════════════════════════════════════════════════════ -->
	<!-- NO RESULTS EMPTY STATE                                      -->
	<!-- ════════════════════════════════════════════════════════════ -->
	{#if isLoading}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- LOADING STATE — skeleton stack + rotating DSA-focused tips    -->
		<!-- Replaces the simple "Loading…" text from be732a80 with a      -->
		<!-- richer placeholder so the wait (which now happens client-side -->
		<!-- after the CSR split) feels productive rather than blank.      -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="results-loading">
			<!-- Case context header so the DSA immediately recognises which
			     case they're looking at, even before offers render. -->
			<div class="loading-header">
				<h2 class="loading-title">
					Preparing your offers
					<span class="loading-dots" aria-hidden="true"
						><span></span><span></span><span></span></span
					>
				</h2>
				{#if caseLabel || (caseLoanType && (caseAmountRequired || caseTenureYears))}
					<p class="loading-subtitle">
						{#if caseLabel}{caseLabel}{:else}{caseLoanType}{/if}
						{#if caseAmountRequired}<span class="loading-divider">·</span>{formatAmount(
								caseAmountRequired
							)}{/if}
						{#if caseTenureYears}<span class="loading-divider">·</span>{caseTenureYears} yrs{/if}
					</p>
				{:else}
					<p class="loading-subtitle">Pulling your evaluated lender results…</p>
				{/if}
			</div>

			<!-- Skeleton lender cards. Five rows with staggered fade-in so
			     the loading state feels alive, not frozen. Each card mimics
			     the shape of a real LenderResultCard (logo + name + amount/
			     ROI/tenure trio + CTA button). -->
			<div class="loading-skeletons" aria-hidden="true">
				{#each Array(5) as _, i}
					<div class="skeleton-card" style="animation-delay: {i * 90}ms">
						<div class="skeleton-card-head">
							<div class="skeleton-circle"></div>
							<div class="skeleton-line skeleton-line-name"></div>
							<div class="skeleton-pill"></div>
						</div>
						<div class="skeleton-card-row">
							<div class="skeleton-stat">
								<div class="skeleton-line skeleton-line-label"></div>
								<div class="skeleton-line skeleton-line-value"></div>
							</div>
							<div class="skeleton-stat">
								<div class="skeleton-line skeleton-line-label"></div>
								<div class="skeleton-line skeleton-line-value"></div>
							</div>
							<div class="skeleton-stat">
								<div class="skeleton-line skeleton-line-label"></div>
								<div class="skeleton-line skeleton-line-value"></div>
							</div>
						</div>
						<div class="skeleton-line skeleton-line-cta"></div>
					</div>
				{/each}
			</div>

			<!-- Rotating tip below the skeleton stack. Soft fade-in on each
			     swap via the {#key} block + .insight-bubble animation. -->
			<div class="loading-insight" aria-live="polite">
				{#key currentInsightIndex}
					<div class="insight-bubble">
						<svg
							class="insight-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 2v2" />
							<path d="M12 20v2" />
							<path d="M4.93 4.93l1.41 1.41" />
							<path d="M17.66 17.66l1.41 1.41" />
							<path d="M2 12h2" />
							<path d="M20 12h2" />
							<path d="M4.93 19.07l1.41-1.41" />
							<path d="M17.66 6.34l1.41-1.41" />
							<circle cx="12" cy="12" r="4" />
						</svg>
						<span>{LOADING_INSIGHTS[currentInsightIndex]}</span>
					</div>
				{/key}
			</div>
		</div>
	{:else if loadError}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- LOAD ERROR STATE — show retry instead of Vercel 504 splash   -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="empty-state">
			<div class="empty-icon">
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
					/>
				</svg>
			</div>
			<h3 class="text-base font-semibold text-[var(--dash-text-secondary)]">
				Couldn't load offers
			</h3>
			<p class="mt-1 max-w-sm text-sm text-[var(--dash-text-secondary)]">
				{loadError}
			</p>
			<button
				type="button"
				onclick={handleRetryLoad}
				class="mt-4 rounded-md bg-[var(--ddsa-primary-600,#2563eb)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ddsa-primary-700,#1d4ed8)]"
			>
				Retry
			</button>
		</div>
	{:else if !hasResults || !lenderResults}
		<div class="empty-state">
			<div class="empty-icon">
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
					/>
				</svg>
			</div>
			<h3 class="text-base font-semibold text-[var(--dash-text-secondary)]">
				No Evaluation Results Yet
			</h3>
			<p class="mt-1 max-w-sm text-sm text-[var(--dash-text-secondary)]">
				Submit the loan application form to evaluate lender eligibility.
			</p>
		</div>
	{:else if !lenderResults.results?.length}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- CF-6: ZERO LENDER RESULTS GUARD                             -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="empty-state">
			<div class="empty-icon">
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
					/>
				</svg>
			</div>
			<h3 class="text-base font-semibold text-[var(--dash-text-secondary)]">No Matching Lenders</h3>
			<p class="mt-1 max-w-sm text-sm text-[var(--dash-text-secondary)]">
				No lenders matched the loan criteria. Try adjusting the loan amount, tenure, or applicant
				details, then re-evaluate.
			</p>
			{#if editFormURL}
				<a
					href={editFormURL}
					class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--dash-btn-text)] transition-colors hover:opacity-90"
				>
					Edit Application
				</a>
			{/if}
		</div>
	{:else}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- PAGE HEADER                                                 -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="page-header">
			<div>
				<h2 class="page-title">Lender Results</h2>
				<p class="page-subtitle">
					{lenderResults.summary.loan_type} &middot; {lenderResults.summary.total_lenders} lenders evaluated
					{#if totalVersions > 1}
						&middot; v{currentVersion}
					{/if}
				</p>
			</div>
			<div class="page-header__actions">
				{#if editFormURL}
					<!-- Item 3 — promoted Edit-form button. Used to be buried inside
					     the empty-state and staleness-banner; now top-level so the
					     DSA always has a one-click path to fix wrong inputs. The
					     existing /form/* navigation guard (`back-to-form` block above)
					     still intercepts this click and routes through ConfirmModal,
					     so the warning UX is preserved. -->
					<a
						href={editDisabled ? undefined : editFormURL}
						aria-disabled={editDisabled}
						tabindex={editDisabled ? -1 : 0}
						title={editDisabled
							? 'Monthly limit reached — re-evaluating burns compute your plan does not cover. Upgrade to keep editing.'
							: 'Edit application — re-evaluates lenders after you save'}
						class="page-header__edit {editDisabled ? 'page-header__edit--disabled' : ''}"
						onclick={(e) => editDisabled && e.preventDefault()}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
						</svg>
						Edit application
					</a>
				{/if}
				<CheckForUpdatesButton {caseId} onStaleDetected={handleStaleDetected} />
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- FORM STALENESS BANNER                                       -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if isFormStale}
			<div class="mb-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-4">
				<div class="flex items-start gap-3">
					<svg
						class="h-5 w-5 shrink-0 text-[var(--dash-text-secondary)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
						/>
					</svg>
					<div class="flex-1">
						<h4 class="text-sm font-semibold text-[var(--dash-text)]">Form Has Been Updated</h4>
						<p class="mt-1 text-xs text-[var(--dash-text-secondary)]">
							The application form (v{formSnapshotVersion}) has been edited since these results were
							generated. Re-evaluate to get updated lender offers.
						</p>
						{#if editFormURL}
							<a
								href={editFormURL}
								class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-btn-text)] transition-colors hover:opacity-90"
							>
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
									/>
								</svg>
								Re-evaluate Now
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- VERSION TIMELINE (only if multiple versions)                -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if versionHistory.length > 1}
			<div class="mb-4">
				<VersionTimelineStrip
					versions={versionHistory}
					{currentVersion}
					onVersionSelect={handleVersionSelect}
				/>
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SUMMARY BAR (single compact line)                           -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="mb-4">
			<ResultsSummaryBar
				summary={lenderResults.summary}
				version={currentVersion}
				computedAt={lenderResults.computed_at}
			/>
		</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- AFFORDABILITY OVERVIEW (secured loans, no property yet)     -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<AffordabilityOverview
			lenderResults={lenderResults.results}
			loanName={lenderResults?.summary.loan_type ?? 'Home Loan'}
		/>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- APPLICANT REORDER SUGGESTION (advisory)                      -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if lenderResults.applicant_suggestion}
			{@const suggestion = lenderResults.applicant_suggestion}
			<div class="mb-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-4">
				<div class="flex items-start gap-3">
					<svg
						class="h-5 w-5 shrink-0 text-[#2563eb]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
						/>
					</svg>
					<div class="flex-1">
						<h4 class="text-sm font-semibold text-[var(--dash-text)]">
							Consider Reordering Applicants
						</h4>
						<p class="mt-1 text-xs text-[var(--dash-text-secondary)]">
							<strong>{suggestion.suggestedName}</strong> may produce better results as primary
							applicant — {suggestion.reason}. The current primary is {suggestion.currentName}.
						</p>
						{#if editFormURL}
							<a
								href={editFormURL}
								class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-accent-text)] transition-colors hover:opacity-90"
							>
								Edit Applicant Order
								<ArrowRight size={13} />
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- FILTER TABS                                                 -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="mb-4">
			<ResultsSortFilterBar
				{sortBy}
				{filterBy}
				onSort={(s) => (sortBy = s)}
				onFilter={(f) => (filterBy = f)}
				counts={filterCounts}
			/>
		</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- ACTION PROMPT                                               -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if eligibleResults.length > 0 && totalSelected === 0}
			<p class="action-prompt">Select lenders you want to proceed with</p>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- ELIGIBLE CARDS (all full width, same design)                -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if eligibleResults.length > 0}
			<div class="card-list">
				{#each eligibleResults as result (result.lender_application_id)}
					<LenderResultCard
						{result}
						rank={getOriginalRank(result)}
						bestFlags={getBestFlags(result)}
						{caseId}
						loanProduct={lenderResults?.summary.loan_type ?? ''}
						changeDelta={deltaMap.get(result.lender_application_id)}
						selectionState={selectionMap.get(result.lender_application_id) ?? 'neutral'}
						onSelectionChange={handleSelectionChange}
						previouslyRejected={rejectedLenderSet.has(result.lender_name)}
					/>
				{/each}
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- INELIGIBLE CARDS (collapsed)                                -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if ineligibleResults.length > 0}
			<div class="ineligible-section">
				<p class="ineligible-label">Not Eligible</p>
				<div class="ineligible-grid">
					{#each ineligibleResults as result (result.lender_application_id)}
						<LenderResultCard
							{result}
							rank={getOriginalRank(result)}
							bestFlags={getBestFlags(result)}
							{caseId}
							loanProduct={lenderResults?.summary.loan_type ?? ''}
							changeDelta={deltaMap.get(result.lender_application_id)}
							previouslyRejected={rejectedLenderSet.has(result.lender_name)}
						/>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- CROSS-SELL BANNER                                           -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if lenderResults.cross_sell.length > 0}
			<div class="mt-4 space-y-3">
				{#each lenderResults.cross_sell as opp (opp.parent_lender)}
					<CrossSellBanner opportunity={opp} />
				{/each}
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- FILTER EMPTY STATE                                          -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if sortedResults.length === 0 && filterBy !== 'all'}
			<div class="empty-filter">
				<p>No lenders match this filter.</p>
				<button type="button" onclick={() => (filterBy = 'all')} class="empty-filter-reset">
					Show all lenders
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- ════════════════════════════════════════════════════════════ -->
<!-- STICKY BOTTOM BAR (shows when lenders are selected)         -->
<!-- ════════════════════════════════════════════════════════════ -->
{#if totalSelected > 0}
	<div class="sticky-bar">
		<div class="sticky-inner">
			<div class="sticky-info">
				<span class="sticky-count">{totalSelected}</span>
				<span class="sticky-label">
					lender{totalSelected > 1 ? 's' : ''}
					{#if selectedCount > 0 && shortlistedCount > 0}
						({selectedCount} selected, {shortlistedCount} shortlisted)
					{:else if selectedCount > 0}
						selected
					{:else}
						shortlisted
					{/if}
				</span>
				{#if selectedNames.length <= 3}
					<span class="sticky-names">{selectedNames.join(', ')}</span>
				{/if}
			</div>
			<a href="/dashboard/dsa/cases/{caseId}/file-builder" class="sticky-cta">
				Proceed
				<ArrowRight size={14} />
			</a>
		</div>
	</div>
{/if}

<style>
	/* ── Page Shell ────────────────────────────────────────────── */

	.results-page {
		max-width: 72rem;
		padding: 0 0.25rem;
		padding-bottom: 5rem; /* Space for sticky bar */
	}

	/* ── Page Header ──────────────────────────────────────────── */

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	/* Item 3 — actions cluster on the right side of the page header.
	   Holds the promoted Edit-application button + the existing
	   Check-for-Updates button. */
	.page-header__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.page-header__edit {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 0.5rem;
		background: var(--dash-btn-bg);
		color: var(--dash-btn-text);
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: filter 120ms ease;
	}
	.page-header__edit:hover {
		filter: brightness(1.05);
	}
	.page-header__edit--disabled {
		cursor: not-allowed;
		opacity: 0.55;
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
	}
	.page-header__edit--disabled:hover {
		filter: none;
	}

	.page-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--dash-text);
	}

	.page-subtitle {
		margin-top: 0.125rem;
		font-size: 0.75rem;
		color: var(--dash-text-muted);
	}

	/* ── Action Prompt ────────────────────────────────────────── */

	.action-prompt {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		margin-bottom: 0.75rem;
		padding-left: 0.125rem;
	}

	/* ── Card List (full width, single column) ───────────────── */

	.card-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	/* ── Ineligible Section ───────────────────────────────────── */

	.ineligible-section {
		margin-top: 1.5rem;
	}

	.ineligible-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dash-text-muted);
		margin-bottom: 0.5rem;
	}

	.ineligible-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Empty State ──────────────────────────────────────────── */

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 5rem 1rem;
		text-align: center;
	}

	.empty-icon {
		margin-bottom: 1rem;
		display: flex;
		height: 3.5rem;
		width: 3.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--dash-bg-alt);
	}

	.empty-filter {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3rem 0;
		text-align: center;
		font-size: 0.8125rem;
		color: var(--dash-text-muted);
	}

	.empty-filter-reset {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	/* ── Sticky Bottom Bar ────────────────────────────────────── */

	.sticky-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 40;
		background: var(--ddsa-secondary-900, #0f172a);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding: 0.625rem 1rem;
		animation: slideUp 0.2s ease-out;
	}

	.sticky-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 72rem;
		margin: 0 auto;
		gap: 1rem;
	}

	.sticky-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
	}

	.sticky-count {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: #10b981;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.sticky-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
	}

	.sticky-names {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.45);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sticky-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1.25rem;
		border-radius: 0.5rem;
		/* Theme token — `background: white` + `color: var(--dash-text)` is a
		   dark-mode trap: dash-text flips to light in dark mode, making text
		   invisible on the still-white button (CLAUDE.md Pitfall #10). */
		background: var(--dash-bg-card);
		color: var(--dash-text);
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
		flex-shrink: 0;
		transition: all 0.12s ease;
	}

	.sticky-cta:hover {
		background: var(--dash-bg-alt);
		transform: translateY(-1px);
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.sticky-names {
			display: none;
		}
	}

	/* ── Loading state — skeleton cards + rotating insights ───────── */

	.results-loading {
		max-width: 920px;
		margin: 0 auto;
		padding: 32px 16px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.loading-header {
		text-align: center;
	}

	.loading-title {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--dash-text-primary, #0f172a);
	}

	.loading-dots {
		display: inline-flex;
		gap: 3px;
		margin-left: 6px;
	}

	.loading-dots span {
		width: 5px;
		height: 5px;
		background: var(--ddsa-primary-500, #2563eb);
		border-radius: 50%;
		display: inline-block;
		animation: loading-dot 1.4s ease-in-out infinite;
	}

	.loading-dots span:nth-child(2) {
		animation-delay: 0.16s;
	}

	.loading-dots span:nth-child(3) {
		animation-delay: 0.32s;
	}

	@keyframes loading-dot {
		0%, 80%, 100% {
			opacity: 0.25;
			transform: scale(0.85);
		}
		40% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.loading-subtitle {
		margin-top: 6px;
		font-size: 0.875rem;
		color: var(--dash-text-secondary, #475569);
	}

	.loading-divider {
		margin: 0 8px;
		color: var(--dash-text-muted, #94a3b8);
	}

	/* Skeleton card stack */
	.loading-skeletons {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.skeleton-card {
		background: var(--dash-card-bg, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--dash-border, rgba(148, 163, 184, 0.18));
		border-radius: 14px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		opacity: 0;
		animation: skeleton-card-in 480ms ease-out forwards;
	}

	@keyframes skeleton-card-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.skeleton-card-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.skeleton-card-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		padding: 8px 0;
	}

	.skeleton-stat {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.skeleton-circle,
	.skeleton-line,
	.skeleton-pill {
		background: linear-gradient(
			90deg,
			var(--shimmer-bg, rgba(148, 163, 184, 0.12)) 0%,
			var(--shimmer-highlight, rgba(148, 163, 184, 0.22)) 50%,
			var(--shimmer-bg, rgba(148, 163, 184, 0.12)) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.6s linear infinite;
	}

	.skeleton-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.skeleton-pill {
		margin-left: auto;
		width: 64px;
		height: 22px;
		border-radius: 999px;
	}

	.skeleton-line {
		height: 10px;
		border-radius: 6px;
	}

	.skeleton-line-name {
		flex: 1;
		max-width: 200px;
		height: 14px;
	}

	.skeleton-line-label {
		width: 56px;
		height: 9px;
		opacity: 0.7;
	}

	.skeleton-line-value {
		width: 80px;
		height: 14px;
	}

	.skeleton-line-cta {
		height: 32px;
		border-radius: 8px;
		margin-top: 4px;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Rotating insight bubble */
	.loading-insight {
		display: flex;
		justify-content: center;
		padding-top: 8px;
		min-height: 44px;
	}

	.insight-bubble {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		background: var(--ddsa-accent-50, rgba(212, 160, 23, 0.08));
		color: var(--ddsa-secondary-900, #0f172a);
		border: 1px solid var(--ddsa-accent-200, rgba(212, 160, 23, 0.25));
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 500;
		max-width: 560px;
		text-align: center;
		animation: insight-fade 320ms ease-out;
	}

	.insight-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--ddsa-accent-500, #d4a017);
		animation: insight-icon-spin 4s linear infinite;
	}

	@keyframes insight-icon-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes insight-fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.skeleton-card-row {
			grid-template-columns: 1fr 1fr;
		}
		.insight-bubble {
			font-size: 0.75rem;
			padding: 8px 12px;
		}
	}
</style>
