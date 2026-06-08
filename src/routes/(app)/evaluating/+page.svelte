<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { onMount } from 'svelte';
	import EvaluationStep from '$lib/components/evaluation/EvaluationStep.svelte';
	import EvaluationProgressBar from '$lib/components/evaluation/EvaluationProgressBar.svelte';
	import InsightCard from '$lib/components/evaluation/InsightCard.svelte';
	import { t } from '$lib/i18n';
	// QBC UX inversion (2026-05-30) — /evaluating now owns the API call.
	// Reads the stashed SubmitOptions from sessionStorage, fires
	// callEvaluateAndPersist, and branches into one of four views below.
	import {
		callEvaluateAndPersist,
		PENDING_SUBMISSION_KEY,
		type SubmitOptions,
		type SubmitResult,
		type BufferState,
		type UpgradePrompt
	} from '$lib/utils/formSubmitHandler';
	import { safeSessionStorage } from '$lib/utils/safeStorage';
	import { secureFetch } from '$lib/utils/csrf';

	// ── Loan-type display config ─────────────────────────────────
	const LENDER_COUNTS: Record<string, number> = {
		'Home Loan': 32,
		'Loan Against Property': 24,
		'Plot and Construction Loan': 18,
		'Personal Loan': 28,
		'Business Loan - Unsecured': 20
	};

	const INSIGHTS = [
		t('app.evaluating.insight1'),
		t('app.evaluating.insight2'),
		t('app.evaluating.insight3'),
		t('app.evaluating.insight4'),
		t('app.evaluating.insight5')
	];

	// ── Step definitions ────────────────────────────────────────
	type StepStatus = 'pending' | 'active' | 'complete';

	interface EvalStep {
		label: string;
		status: StepStatus;
	}

	// ── State ────────────────────────────────────────────────────
	let steps = $state<EvalStep[]>([
		{ label: 'Profiling income sources', status: 'pending' },
		{ label: 'Checking lender policies', status: 'pending' },
		{ label: 'Calculating best offers', status: 'pending' },
		{ label: 'Comparing interest rates', status: 'pending' },
		{ label: 'Preparing your results', status: 'pending' }
	]);

	let progress = $state(0);
	let loanDisplayName = $state('');
	let amountDisplay = $state('');
	let tenureDisplay = $state('');
	let currentInsightIndex = $state(0);
	let errorMessage = $state('');
	let showRetry = $state(false);
	let completionText = $state('');
	let showParticles = $state(false);
	let isComplete = $state(false);

	// QBC UX inversion — view state. 'animation' is the default (success
	// path); 'save-prompt' / 'upgrade-required' surface the 402 codes
	// inline as dedicated views instead of modals stacked on the form.
	type ViewState =
		| 'loading'
		| 'animation'
		| 'save-prompt'
		| 'upgrade-required'
		| 'saved-to-buffer';
	let currentView = $state<ViewState>('loading');

	// QBC — buffer + upgrade context surfaced on the save-prompt and
	// upgrade-required views. Populated from the SubmitResult.
	let bufferState = $state<BufferState | null>(null);
	let upgradePrompt = $state<UpgradePrompt | null>(null);
	let nextCycleAt = $state<string | null | undefined>(undefined);
	let savePromptInFlight = $state(false);
	// Stashed pending submission — kept around so the save-prompt's
	// "Save this case" button can re-fire the API with saveToBuffer=true.
	let pendingSubmission = $state<SubmitOptions | null>(null);

	// ── Helpers ──────────────────────────────────────────────────
	function sleep(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	function setStepStatus(index: number, status: StepStatus) {
		steps[index] = { ...steps[index], status };
	}

	function formatAmount(n?: number): string {
		if (!n) return '';
		if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
		if (n >= 100_000) return `₹${(n / 100_000).toFixed(0)}L`;
		return `₹${n.toLocaleString('en-IN')}`;
	}

	// ── Evaluation request (minimal — server already did the work) ──
	interface EvaluationRequest {
		caseId: string;
		offerCount: number;
		loanType: string;
		loanDisplayName: string;
		amountRequested?: number;
		tenureYears?: number;
	}

	// ── Animation orchestration (split into lead-up + finale) ────────────
	//
	// The animation is split into two phases so the lead-up (steps 1-4, ~2600ms
	// of pure visual progress) can run CONCURRENTLY with the API call rather
	// than after it. Pre-2026-06-05 the user saw API-time (5s cold) + animation
	// (~3000ms) sequentially → ~8s perceived. Now the user waits ~max(api, 2.6s)
	// for the lead-up + ~1.6s for the finale. On a cold 5s API: ~6.6s instead of
	// 8s. On a warm 2s API: ~4.2s instead of 5s. Zero server-side change — pure
	// visual padding removed from the user's critical path.
	//
	// The split also lets handleFreshSubmission gate the FINAL step ("Preparing
	// your results") on real API success — if the API errors mid-lead-up, the
	// user sees the in-progress animation paused with the error banner instead
	// of completing through to a navigation that would have nowhere to go.

	/**
	 * Steps 1-4: profiling → policies → offers → rates. Pure visual progress
	 * with no dependency on the API response. Safe to run concurrently with
	 * callEvaluateAndPersist via Promise.all.
	 *
	 * Caller is responsible for setting the step-2 label (lender count derives
	 * from loanType, which the caller already has from sessionStorage).
	 */
	async function runEvaluationLeadUp() {
		// ── Step 1: Profiling income sources ──
		setStepStatus(0, 'active');
		progress = 5;
		await sleep(600);
		setStepStatus(0, 'complete');
		progress = 20;

		// ── Step 2: Checking lender policies ──
		setStepStatus(1, 'active');
		progress = 25;
		await sleep(800);
		setStepStatus(1, 'complete');
		progress = 40;

		// ── Step 3: Calculating best offers ──
		setStepStatus(2, 'active');
		progress = 45;
		await sleep(700);
		setStepStatus(2, 'complete');
		progress = 65;

		// ── Step 4: Comparing interest rates ──
		setStepStatus(3, 'active');
		progress = 75;
		await sleep(500);
		setStepStatus(3, 'complete');
		progress = 88;
	}

	/**
	 * Step 5 + celebration + navigation. Runs ONLY after the API has returned
	 * successfully — `offerCount` is from the API response and `caseId` must
	 * exist before nav. Picks the proper offer-count i18n string.
	 */
	async function runEvaluationFinale(offerCount: number, caseId: string) {
		// ── Step 5: Preparing your results ──
		setStepStatus(4, 'active');
		progress = 92;
		await sleep(400);
		setStepStatus(4, 'complete');
		progress = 100;

		// ── Completion celebration ──────────────────────────────
		await sleep(400);

		completionText = t('app.evaluating.offersReady', {
			count: offerCount,
			plural: offerCount !== 1 ? 's' : ''
		});
		showParticles = true;
		isComplete = true;

		await sleep(800);

		// Quota just incremented (case is in 'intake' stage). Invalidate
		// the layout's quotaState slice so the topbar "Cases Consumed N/M"
		// chip + sidebar plan badge render the fresh count on the next page.
		// Tagged in dashboard/dsa/+layout.server.ts via depends('app:quotaState').
		await invalidate('app:quotaState');

		// ── Navigate to results ─────────────────────────────────
		// replaceState removes /evaluating from history so browser-back
		// from results skips the animation replay and goes straight to
		// the form. (Animation re-runs were never a billing event — the
		// /api/evaluate-and-persist call happens before this page mounts
		// — but replaying the bar for 3s on every back-press was UX noise.)
		await goto(`/dashboard/dsa/cases/${caseId}/results`, {
			replaceState: true
		});
	}

	/**
	 * Legacy single-shot animation runner (path B in onMount — preserved for
	 * direct-nav / legacy reload). Wraps lead-up + finale. The new submit
	 * flow (path A) doesn't call this — it composes them itself so the
	 * lead-up can race the API.
	 */
	async function runEvaluation(request: EvaluationRequest) {
		// Update step 2 label with lender count
		const lenderCount = LENDER_COUNTS[request.loanType] ?? 25;
		steps[1] = { ...steps[1], label: `Checking ${lenderCount} lender policies` };

		try {
			await runEvaluationLeadUp();
			await runEvaluationFinale(request.offerCount ?? 0, request.caseId);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : t('app.evaluating.error');
			showRetry = true;
		}
	}

	async function handleRetry() {
		// Reset visual state regardless of which retry path we take.
		errorMessage = '';
		showRetry = false;
		progress = 0;
		steps = [
			{ label: 'Profiling income sources', status: 'pending' },
			{ label: 'Checking lender policies', status: 'pending' },
			{ label: 'Calculating best offers', status: 'pending' },
			{ label: 'Comparing interest rates', status: 'pending' },
			{ label: 'Preparing your results', status: 'pending' }
		];
		completionText = '';
		showParticles = false;
		isComplete = false;

		// QBC UX inversion path — if the fresh-submission API call failed
		// (504 cold-start, network error, server error), re-fire the API call
		// from /evaluating itself instead of bouncing the DSA back to the form.
		// `pendingSubmission` is held in state from the initial mount; we kept
		// the reference around specifically so retry stays self-contained here.
		// Pre-2026-06-02 the retry just bounced to the form via history.back(),
		// which surfaced the cold-start 504 problem as a confusing
		// "form-then-evaluating-then-form" loop.
		if (pendingSubmission) {
			currentView = 'loading';
			await handleFreshSubmission(pendingSubmission);
			return;
		}

		// Legacy animation-retry path — evaluationPayload set by a prior
		// successful API call (the call already succeeded; we just need to
		// replay the visual). Kept for direct-nav and back-compat.
		const raw = safeSessionStorage.getItem('evaluationPayload');
		if (raw) {
			try {
				currentView = 'animation';
				runEvaluation(JSON.parse(raw));
			} catch {
				history.back();
			}
		} else {
			// No submission to retry and no animation payload — escape to form.
			history.back();
		}
	}

	function handleGoBack() {
		history.back();
	}

	// ── QBC view helpers ────────────────────────────────────────

	function formatNextCycleDate(iso: string | null | undefined): string {
		if (!iso) return 'on your next billing date';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return 'on your next billing date';
		return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	async function handleSavePromptYes() {
		if (!pendingSubmission || savePromptInFlight) return;
		savePromptInFlight = true;
		const retryResult = await callEvaluateAndPersist({
			...pendingSubmission,
			saveToBuffer: true
		});
		if (retryResult.success && retryResult.quotaBlocked) {
			currentView = 'saved-to-buffer';
			// Brief acknowledgement, then nav to dashboard cases where the
			// blocked case shows with the "Awaiting Processing" badge.
			await sleep(1200);
			// QBC buffer-save consumed a save-buffer slot (blockedCount went
			// up). Invalidate the quota slice so the sidebar/topbar reflect
			// the new buffer state on landing.
			await invalidate('app:quotaState');
			await goto(
				retryResult.caseId
					? `/dashboard/dsa/cases?saved_to_buffer=${encodeURIComponent(retryResult.caseId)}`
					: '/dashboard/dsa/cases'
			);
			return;
		}
		// Save failed — likely quota_fully_exhausted because another
		// concurrent submit ate the last slot. Surface upgrade-required.
		savePromptInFlight = false;
		if (
			retryResult.code === 'quota_fully_exhausted' &&
			retryResult.upgradePrompt &&
			retryResult.bufferState
		) {
			bufferState = retryResult.bufferState;
			upgradePrompt = retryResult.upgradePrompt;
			currentView = 'upgrade-required';
			return;
		}
		// Unexpected error — fall through to retry/back affordance.
		errorMessage = retryResult.error || 'Save failed. Please try again.';
		showRetry = true;
	}

	function handleSavePromptNo() {
		// Form data stays in localStorage (formState's auto-persist) — DSA can
		// navigate back to /form/<loanType> and pick up where they left off.
		// We send them back to the form via history; if no history (deep nav),
		// fall through to the picker.
		if (history.length > 1) {
			history.back();
		} else {
			void goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		}
	}

	function handleUpgradeRequiredConfirm() {
		if (!upgradePrompt) return;
		void goto(
			`/dashboard/dsa/billing?recommend=${encodeURIComponent(upgradePrompt.recommended_plan)}`
		);
	}

	function handleUpgradeRequiredCancel() {
		void goto('/dashboard/dsa/cases');
	}

	// ── Mount ───────────────────────────────────────────────────
	// QBC UX inversion: /evaluating is now the orchestrator. On mount:
	//   1. Read pendingSubmission from sessionStorage (set by
	//      submitFormForEvaluation in the new flow).
	//   2. Fire callEvaluateAndPersist and branch on the response.
	//   3. Backwards-compat: if only evaluationPayload is set (legacy
	//      path or external nav), run the animation directly.
	//   4. If both missing: redirect to the form picker.
	onMount(() => {
		// Start insight rotation regardless of which view we land on —
		// it's only visible during animation, but starting it here keeps
		// the cleanup return value uniform.
		const insightInterval = setInterval(() => {
			currentInsightIndex = (currentInsightIndex + 1) % INSIGHTS.length;
		}, 3500);
		const cleanup = () => clearInterval(insightInterval);

		// Path A: new UX inversion path — pendingSubmission set by
		// submitFormForEvaluation. Fire API + branch.
		const pendingRaw = safeSessionStorage.getItem(PENDING_SUBMISSION_KEY);
		if (pendingRaw) {
			let submission: SubmitOptions;
			try {
				submission = JSON.parse(pendingRaw);
			} catch {
				safeSessionStorage.removeItem(PENDING_SUBMISSION_KEY);
				void goto(ROUTES.FORM.HOW_CAN_WE_HELP);
				return cleanup;
			}
			safeSessionStorage.removeItem(PENDING_SUBMISSION_KEY);
			pendingSubmission = submission;
			loanDisplayName = submission.loanDisplayName || submission.loanType;
			void handleFreshSubmission(submission);
			return cleanup;
		}

		// Path B: legacy / direct-nav — evaluationPayload only. Run animation.
		const legacyRaw = safeSessionStorage.getItem('evaluationPayload');
		if (legacyRaw) {
			let request: EvaluationRequest;
			try {
				request = JSON.parse(legacyRaw);
			} catch {
				void goto(ROUTES.FORM.HOW_CAN_WE_HELP);
				return cleanup;
			}
			if (!request.caseId || !request.loanType) {
				void goto(ROUTES.FORM.HOW_CAN_WE_HELP);
				return cleanup;
			}
			loanDisplayName = request.loanDisplayName || request.loanType;
			amountDisplay = formatAmount(request.amountRequested);
			tenureDisplay = request.tenureYears ? `${request.tenureYears} yrs` : '';
			currentView = 'animation';
			void runEvaluation(request);
			return cleanup;
		}

		// Nothing to do — redirect to picker.
		void goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		return cleanup;
	});

	/**
	 * Handle a fresh submission: fire the API, then branch on the SubmitResult
	 * into one of: animation (success), save-prompt (quota_buffer_available),
	 * upgrade-required (quota_fully_exhausted), or error (everything else).
	 */
	/**
	 * Detect a Vercel cold-start 504 from a SubmitResult. Used to drive
	 * a silent single-shot auto-retry inside handleFreshSubmission. The
	 * 'warming up' message check covers the case where ERROR_MESSAGES[504]
	 * was used and the explicit code path was lost in serialization.
	 */
	function is504(result: SubmitResult): boolean {
		return (
			!result.success &&
			(result.code === 'HTTP_504' ||
				(typeof result.error === 'string' && /warming up/i.test(result.error)))
		);
	}

	async function handleFreshSubmission(submission: SubmitOptions): Promise<void> {
		// ── Race the API call against the lead-up animation ─────────────────
		// Pre-2026-06-05 the API call was awaited FIRST, THEN the animation
		// ran sequentially → user perceived 5s API + 3s animation = 8s wait.
		// Now both run concurrently via Promise.all: lead-up animation steps
		// 1-4 (~2600ms of pure visual progress) overlap the API call. The
		// finale (step 5 + nav) waits for both. Server-side budgets are
		// untouched — this is purely visual padding moved off the critical
		// path. The 504 silent auto-retry is preserved by wrapping the API
		// promise in an inline retry-on-504 chain so the Promise.all still
		// sees a single SubmitResult once the retry settles.
		//
		// Switch to animation view + label step 2 IMMEDIATELY — neither
		// depends on the API response (lender count derives from loanType,
		// which we already have from sessionStorage).
		const lenderCount = LENDER_COUNTS[submission.loanType] ?? 25;
		steps[1] = { ...steps[1], label: `Checking ${lenderCount} lender policies` };
		currentView = 'animation';

		// Silent cold-start auto-retry inline. /api/evaluate-and-persist's
		// cold-path on Vercel Hobby (10s ceiling) is consistently 7-10s after
		// the QBC subscription-gate + dual-quota-count additions, so the
		// first cold call after function-pool idle frequently 504s. Wait 2s
		// + retry once; the first call warmed the pool and the second call
		// typically completes in 2-3s. DSA sees one continuous animation
		// instead of an error after 10s. No countdown UI to keep the change
		// low-friction.
		//
		// Duplicate-case risk: if the first call's function actually
		// completed (case inserted) but the gateway returned 504 before the
		// response landed, the retry creates a duplicate. Vercel typically
		// kills the function at exactly maxDuration so the window where
		// this can happen is small (<<1%). Idempotency key (Pitfall #61
		// pattern, formSubmitHandler.ts) covers this server-side.
		const apiPromise: Promise<SubmitResult> = (async () => {
			const first = await callEvaluateAndPersist(submission);
			if (!is504(first)) return first;
			await sleep(2000);
			return callEvaluateAndPersist(submission);
		})();

		// Start the lead-up animation but DON'T await it yet. We need to be
		// able to "abandon" it on a non-success API path: e.g. if the API
		// returns a 402 quota_buffer_available after 1s, we want the save-
		// prompt view to render IMMEDIATELY (not after another 1.6s of
		// animation that the user has already paid for visually). Setting
		// currentView to 'save-prompt' replaces the animation in the DOM;
		// the lead-up promise ticks out invisibly in the background, harmlessly
		// mutating `steps`/`progress` state that nothing is rendering.
		const leadUpPromise = runEvaluationLeadUp();

		// Wait for the API. Lead-up may still be running.
		const result = await apiPromise;

		// Success — wait for the lead-up to ALSO complete so the finale starts
		// from "step 4 done, step 5 next." Fast API (<2.6s): brief wait for
		// the rest of the lead-up. Slow API (>2.6s): no wait. Net perceived:
		// max(api_time, 2.6s) + 1.6s finale, instead of api_time + 4.2s.
		if (result.success && !result.quotaBlocked) {
			amountDisplay = formatAmount(result.amountRequested);
			tenureDisplay = result.tenureYears ? `${result.tenureYears} yrs` : '';
			safeSessionStorage.setItem(
				'evaluationPayload',
				JSON.stringify({
					caseId: result.caseId,
					offerCount: result.offerCount ?? 0,
					loanType: submission.loanType,
					loanDisplayName: submission.loanDisplayName,
					amountRequested: result.amountRequested,
					tenureYears: result.tenureYears
				})
			);
			await leadUpPromise;
			await runEvaluationFinale(result.offerCount ?? 0, result.caseId ?? '');
			return;
		}

		// Non-success branches below switch currentView immediately. The
		// background lead-up promise is NOT awaited — it ticks to completion
		// invisibly, mutating state nothing is rendering. Net effect: API
		// errors / quota prompts surface as soon as the API replies, with no
		// animation overrun.

		// QBC: blocked case — server persisted at stage='quota_blocked',
		// no offers computed. Show brief acknowledgement + nav to dashboard.
		if (result.success && result.quotaBlocked) {
			currentView = 'saved-to-buffer';
			await sleep(1500);
			await goto(
				result.caseId
					? `/dashboard/dsa/cases?saved_to_buffer=${encodeURIComponent(result.caseId)}`
					: '/dashboard/dsa/cases'
			);
			return;
		}

		// 402 quota_buffer_available — render save-prompt view.
		if (
			result.code === 'quota_buffer_available' &&
			result.upgradePrompt &&
			result.bufferState
		) {
			bufferState = result.bufferState;
			upgradePrompt = result.upgradePrompt;
			nextCycleAt = result.nextCycleAt;
			currentView = 'save-prompt';
			return;
		}

		// 402 quota_fully_exhausted — render upgrade-required view.
		if (
			result.code === 'quota_fully_exhausted' &&
			result.upgradePrompt &&
			result.bufferState
		) {
			bufferState = result.bufferState;
			upgradePrompt = result.upgradePrompt;
			currentView = 'upgrade-required';
			return;
		}

		// Any other error — surface the existing retry/back affordance.
		currentView = 'animation'; // re-use animation shell for the error UI
		errorMessage = result.error || 'Evaluation failed. Please try again.';
		showRetry = true;
	}
</script>

<svelte:head>
	<title>Evaluating — DigitalDSA</title>
</svelte:head>

<div class="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--form-bg-card)] px-6">
	<div class="w-full max-w-md">
		<!-- Logo -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ddsa-accent-400,#d4a017)] to-[var(--ddsa-primary-500,#2563eb)]"
			>
				<svg
					class="h-6 w-6 text-white"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
					/>
				</svg>
			</div>
		</div>

		{#if currentView === 'loading'}
			<!-- ── Loading: API call in flight, before we know which view to show ── -->
			<div class="text-center">
				<h1 class="text-lg font-bold text-[var(--ddsa-secondary-900,#0f172a)]">
					{t('app.evaluating.title')}
				</h1>
				{#if loanDisplayName}
					<p class="mt-1 text-sm text-[var(--form-text-secondary)]">{loanDisplayName}</p>
				{/if}
				<div class="mt-6">
					<EvaluationProgressBar progress={5} />
				</div>
			</div>
		{:else if currentView === 'animation'}
			<!-- ── Animation: success path. Steps + progress + insights. ── -->
			<div class="max-w-sm mx-auto">
				<div class="mb-8 text-center">
					{#if isComplete}
						<h1 class="animate-scale-up text-xl font-bold text-[var(--ddsa-secondary-900,#0f172a)]">
							{completionText}
						</h1>
					{:else}
						<h1 class="text-lg font-bold text-[var(--ddsa-secondary-900,#0f172a)]">
							{t('app.evaluating.title')}
						</h1>
					{/if}

					{#if loanDisplayName}
						<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
							{loanDisplayName}{#if amountDisplay}
								&middot; {amountDisplay}{/if}{#if tenureDisplay}
								&middot; {tenureDisplay}{/if}
						</p>
					{/if}
				</div>

				<!-- Steps -->
				<div class="mb-6 space-y-0.5">
					{#each steps as step}
						<EvaluationStep label={step.label} status={step.status} />
					{/each}
				</div>

				<!-- Progress bar -->
				<div class="mb-8">
					<EvaluationProgressBar {progress} />
				</div>

				<!-- Error state -->
				{#if errorMessage}
					<div
						class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40"
					>
						<p class="text-xs text-red-700 dark:text-red-400">{errorMessage}</p>
						<div class="mt-3 flex gap-2">
							<button
								onclick={handleRetry}
								class="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
							>
								{t('app.evaluating.tryAgain')}
							</button>
							<button
								onclick={handleGoBack}
								class="rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)]"
							>
								{t('app.evaluating.goBack')}
							</button>
						</div>
					</div>
				{/if}

				<!-- Insight card (only show while processing, not on error or complete) -->
				{#if !errorMessage && !isComplete}
					{#key currentInsightIndex}
						<InsightCard text={INSIGHTS[currentInsightIndex]} />
					{/key}
				{/if}

				<!-- Particles on completion -->
				{#if showParticles}
					<div class="pointer-events-none fixed inset-0 overflow-hidden">
						{#each Array(6) as _, i}
							<span class="particle" style="left: {30 + i * 8}%; animation-delay: {i * 80}ms;"
							></span>
						{/each}
					</div>
				{/if}
			</div>
		{:else if currentView === 'save-prompt' && bufferState && upgradePrompt}
			<!-- ── QBC save-prompt view: DSA at monthly limit, buffer has space ── -->
			<div
				class="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-800 dark:bg-amber-950/30"
			>
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
					>
						<svg
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
							/>
						</svg>
					</div>
					<h1 class="text-base font-bold text-[var(--ddsa-secondary-900,#0f172a)]">
						You're at your monthly limit
					</h1>
				</div>

				<p class="mb-2 text-sm leading-relaxed text-[var(--form-text-secondary)]">
					Save this case for automatic processing? It'll run on
					<strong class="text-[var(--ddsa-secondary-900,#0f172a)]"
						>{formatNextCycleDate(nextCycleAt)}</strong
					>
					(when your next cycle starts) — or immediately if you upgrade to
					<strong class="text-[var(--ddsa-secondary-900,#0f172a)]"
						>{upgradePrompt.recommended_plan_name}</strong
					>.
				</p>
				<p class="mb-5 text-xs text-[var(--form-text-muted)]">
					{bufferState.remaining} of {bufferState.capacity} save slot{bufferState.capacity === 1
						? ''
						: 's'} remaining. Saved cases count against next cycle's quota when they auto-process.
				</p>

				<div class="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onclick={handleSavePromptYes}
						disabled={savePromptInFlight}
						class="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{savePromptInFlight ? 'Saving…' : 'Save this case'}
					</button>
					<button
						type="button"
						onclick={handleSavePromptNo}
						disabled={savePromptInFlight}
						class="flex-1 rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-2 text-sm font-semibold text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						No, I'll handle it
					</button>
				</div>
			</div>
		{:else if currentView === 'upgrade-required' && bufferState && upgradePrompt}
			<!-- ── QBC upgrade-required view: at monthly limit AND save buffer full ── -->
			<div
				class="rounded-2xl border border-red-200 bg-red-50/60 p-6 dark:border-red-800 dark:bg-red-950/30"
			>
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
					>
						<svg
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
							/>
						</svg>
					</div>
					<h1 class="text-base font-bold text-[var(--ddsa-secondary-900,#0f172a)]">
						Limit reached — save buffer full
					</h1>
				</div>

				<p class="mb-2 text-sm leading-relaxed text-[var(--form-text-secondary)]">
					You have <strong class="text-[var(--ddsa-secondary-900,#0f172a)]"
						>{upgradePrompt.current_count} active cases</strong
					>
					AND your save buffer is full ({bufferState.used} of {bufferState.capacity} saved).
				</p>
				<p class="mb-5 text-sm leading-relaxed text-[var(--form-text-secondary)]">
					Upgrade to
					<strong class="text-[var(--ddsa-secondary-900,#0f172a)]"
						>{upgradePrompt.recommended_plan_name}</strong
					>
					({upgradePrompt.recommended_plan_limit === null
						? 'Unlimited cases'
						: `${upgradePrompt.recommended_plan_limit} cases`}) to continue. Your saved cases will
					process automatically.
				</p>

				<div class="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onclick={handleUpgradeRequiredConfirm}
						class="flex-1 rounded-md bg-[var(--ddsa-primary-600,#2563eb)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ddsa-primary-700,#1d4ed8)]"
					>
						Upgrade to {upgradePrompt.recommended_plan_name} →
					</button>
					<button
						type="button"
						onclick={handleUpgradeRequiredCancel}
						class="flex-1 rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-2 text-sm font-semibold text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)]"
					>
						Maybe later
					</button>
				</div>
			</div>
		{:else if currentView === 'saved-to-buffer'}
			<!-- ── QBC brief acknowledgement before navigating to dashboard ── -->
			<div class="text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
				>
					<svg
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2.5"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75 10.5 18.75 19.5 5.25" />
					</svg>
				</div>
				<h1 class="text-lg font-bold text-[var(--ddsa-secondary-900,#0f172a)]">Case saved</h1>
				<p class="mt-2 text-sm text-[var(--form-text-secondary)]">
					Taking you to your dashboard. The case will process automatically.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.animate-scale-up {
		animation: scale-up 400ms ease-out;
	}

	@keyframes scale-up {
		0% {
			transform: scale(0.9);
			opacity: 0;
		}
		60% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.particle {
		position: absolute;
		top: 40%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ddsa-accent-500, #d4a017);
		animation: burst 800ms ease-out forwards;
		opacity: 0;
	}

	@keyframes burst {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-60px) scale(0);
			opacity: 0;
		}
	}
</style>
