<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { ArrowLeft, CheckCircle, Lock } from 'lucide-svelte';
	import Step0Setup from './_steps/Step0Setup.svelte';
	import Step1Clauses from './_steps/Step1Clauses.svelte';
	import Step2Encoding from './_steps/Step2Encoding.svelte';
	import Step3Missed from './_steps/Step3Missed.svelte';
	import Step4Reconcile from './_steps/Step4Reconcile.svelte';
	import Step5Submit from './_steps/Step5Submit.svelte';
	import type {
		Pass2Clause,
		Pass3Encoding,
		Pass4Result,
		Pass6Result,
		ConditionalOverride,
		BankCardNote
	} from '$lib/config/pms/policyTypes.js';

	let { data }: { data: PageData } = $props();

	// ── Shared wizard state ───────────────────────────────────────────────────────
	// Wizard state seeded once from the server-loaded policy doc, then updated
	// locally by each pipeline step. The component is re-mounted on navigation
	// so prop changes don't need to flow through.
	// svelte-ignore state_referenced_locally
	let policyId = $state<string | null>(data.policy?.id ?? null);
	// svelte-ignore state_referenced_locally
	let lockVersion = $state<number>(data.policy?.lockVersion ?? 0);
	// svelte-ignore state_referenced_locally
	let pipelineStep = $state<number>(data.policy?.pipelineState?.currentStep ?? 0);

	// wizardStep maps pipeline progress to the visible wizard step
	// pipelineStep 5 = pass6 done → show reconciliation (4) until signed off, then submit (5)
	// svelte-ignore state_referenced_locally
	const reconciliationComplete = data.policy?.reconciliation?.status === 'complete';
	// svelte-ignore state_referenced_locally
	let wizardStep = $state<number>(
		pipelineStep >= 5 ? (reconciliationComplete ? 5 : 4) : pipelineStep
	);

	let isLoading = $state(false);
	let loadingMessage = $state('');
	let errorMessage = $state('');

	// ── Per-step AI output (local — refreshed from API responses) ────────────────
	// svelte-ignore state_referenced_locally
	let pass2Clauses = $state<Pass2Clause[]>(
		(data.policy?.pipelineState?.pass2Clauses as Pass2Clause[]) ?? []
	);
	// svelte-ignore state_referenced_locally
	let rmStep1Decisions = $state<Record<string, string>>(
		(data.policy?.pipelineState?.rmStep1Decisions as Record<string, string>) ?? {}
	);
	// svelte-ignore state_referenced_locally
	let rmEncodings = $state<Partial<ConditionalOverride>[]>(
		(data.policy?.pipelineState?.rmStep2Encodings as Partial<ConditionalOverride>[]) ?? []
	);
	let pass4Result = $state<Pass4Result | null>(null);
	// Restored from DB on resume (pipelineStep >= 5 means pass6 was already run)
	// svelte-ignore state_referenced_locally
	let pass6Result = $state<Pass6Result | null>(
		(data.policy?.pipelineState?.pass6Result as Pass6Result) ?? null
	);
	// svelte-ignore state_referenced_locally
	let bankCardNotes = $state<BankCardNote[]>(
		(data.policy?.bankCardNotes as BankCardNote[]) ?? []
	);
	// svelte-ignore state_referenced_locally
	let conditionalOverrides = $state<ConditionalOverride[]>(
		(data.policy?.conditionalOverrides as ConditionalOverride[]) ?? []
	);
	// svelte-ignore state_referenced_locally
	let finalScore = $state<number | null>(data.policy?.aiPipelineRun?.finalScore ?? null);

	// OTP flow (Step 5)
	let pmsOtpToken = $state('');

	// ── Step definitions ──────────────────────────────────────────────────────────
	const steps = [
		{ number: 0, label: 'Document Setup' },
		{ number: 1, label: 'Clause Review' },
		{ number: 2, label: 'Encoding Review' },
		{ number: 3, label: 'Missed Items' },
		{ number: 4, label: 'Reconciliation' },
		{ number: 5, label: 'Submit' }
	];

	// ── Fetch helper — refreshes lockVersion after any pipeline or patch call ─────
	async function refreshLockVersion(): Promise<void> {
		if (!policyId) return;
		const res = await secureFetch(`/api/pms/policies/${policyId}`);
		if (res.ok) {
			const json = await res.json();
			lockVersion = json.data?.lockVersion ?? lockVersion;
		}
	}

	// ── Step 0: create draft + run pass 1+2 ──────────────────────────────────────
	async function startParsing(sourceText: string, fileName: string, documentDate: string): Promise<void> {
		isLoading = true;
		errorMessage = '';
		loadingMessage = 'Creating policy draft…';

		try {
			// Create policy draft if one doesn't exist yet
			if (!policyId) {
				const createRes = await secureFetch('/api/pms/policies', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						lenderId: data.lenderId,
						loanProduct: data.loanProduct,
						sourceText,
						sourceFileName: fileName,
						documentDate
					})
				});
				const createJson = await createRes.json();
				if (!createRes.ok) {
					errorMessage = createJson.error ?? 'Failed to create policy draft.';
					return;
				}
				policyId = createJson.data.policyId;
				lockVersion = createJson.data.lockVersion;
			}

			// Run pass 1 + 2 (normalize + atomize)
			loadingMessage = 'Normalizing terminology… Classifying clauses… Atomizing conditions…';
			const pipelineRes = await secureFetch('/api/pms/pipeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'pass1_2', policyId, lockVersion })
			});
			const pipelineJson = await pipelineRes.json();

			if (!pipelineRes.ok) {
				errorMessage = pipelineJson.error ?? 'AI pipeline failed. Please try again.';
				return;
			}

			pass2Clauses = pipelineJson.data.pass2Clauses ?? [];
			await refreshLockVersion();
			pipelineStep = 1;
			wizardStep = 1;
		} catch {
			errorMessage = 'Network error. Please check your connection and try again.';
		} finally {
			isLoading = false;
			loadingMessage = '';
		}
	}

	// ── Step 1: save decisions + run pass 3 ──────────────────────────────────────
	async function proceedToEncoding(decisions: Record<string, string>): Promise<void> {
		isLoading = true;
		errorMessage = '';
		loadingMessage = 'Encoding clauses…';
		rmStep1Decisions = decisions;

		try {
			// Only send in-scope clauses for encoding
			const confirmedClauses = pass2Clauses.filter(
				(c) => decisions[c.id] === 'in_scope' || decisions[c.id] === undefined
			);

			const res = await secureFetch('/api/pms/pipeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'pass3',
					policyId,
					lockVersion,
					confirmedClauses,
					// BUG 5 (S88) — persist clause-level decisions so refresh
					// between step 1 and step 2 doesn't reset them
					rmStep1Decisions: decisions
				})
			});
			const json = await res.json();

			if (!res.ok) {
				errorMessage = json.error ?? 'Pass 3 encoding failed. Please try again.';
				return;
			}

			rmEncodings = json.data.encodings ?? [];
			await refreshLockVersion();
			pipelineStep = 2;
			wizardStep = 2;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
			loadingMessage = '';
		}
	}

	// ── Step 2: verify encodings via pass 4+5 ────────────────────────────────────
	async function verifyEncodings(updatedEncodings: Partial<ConditionalOverride>[]): Promise<void> {
		isLoading = true;
		errorMessage = '';
		loadingMessage = 'Verifying encodings…';
		rmEncodings = updatedEncodings;

		try {
			const inScopeClauses = pass2Clauses.filter(
				(c) => rmStep1Decisions[c.id] !== 'out_of_scope'
			);

			const res = await secureFetch('/api/pms/pipeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'pass4_5',
					policyId,
					lockVersion,
					clauses: inScopeClauses,
					encodings: rmEncodings
				})
			});
			const json = await res.json();

			if (!res.ok) {
				errorMessage = json.error ?? 'Encoding verification failed. Please try again.';
				return;
			}

			rmEncodings = json.data.finalEncodings ?? rmEncodings;
			pass4Result = json.data.pass4Result ?? null;
			finalScore = json.data.pass4Result?.overallScore ?? null;
			await refreshLockVersion();
			pipelineStep = 3;
			wizardStep = 3;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
			loadingMessage = '';
		}
	}

	// ── Step 3: trigger pass 6 (reconstruction) + advance to reconciliation ───────
	async function continueToReconciliation(): Promise<void> {
		isLoading = true;
		errorMessage = '';
		loadingMessage = 'Reconstructing policy text…';

		try {
			// Build the final overrides list from rmEncodings for pass6
			const finalOverrides = conditionalOverrides.length > 0
				? conditionalOverrides
				: (rmEncodings as ConditionalOverride[]);

			const res = await secureFetch('/api/pms/pipeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'pass6',
					policyId,
					lockVersion,
					finalOverrides
				})
			});
			const json = await res.json();

			if (!res.ok) {
				errorMessage = json.error ?? 'Reconstruction failed. Please try again.';
				return;
			}

			pass6Result = json.data.pass6Result ?? null;
			await refreshLockVersion();
			pipelineStep = 5;
			wizardStep = 4;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
			loadingMessage = '';
		}
	}

	// ── Step 4: sign off reconciliation ──────────────────────────────────────────
	async function signOffReconciliation(): Promise<void> {
		isLoading = true;
		errorMessage = '';

		try {
			// PATCH reconciliation status to 'complete' to mark sign-off
			const res = await secureFetch(`/api/pms/policies/${policyId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lockVersion,
					reconciliation: {
						status: 'complete',
						completedAt: new Date().toISOString(),
						completedBy: null // server resolves userId from session
					}
				})
			});
			const json = await res.json();

			if (!res.ok) {
				errorMessage = json.error ?? 'Sign-off failed. Please try again.';
				return;
			}

			lockVersion = json.data.lockVersion ?? lockVersion;
			wizardStep = 5;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// ── Step 5: OTP send + verify + final submit ──────────────────────────────────
	async function sendOtp(): Promise<{ ok: boolean; error?: string }> {
		try {
			const draftHash = await computeDraftHash();
			const res = await secureFetch('/api/pms/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail: data.officialBankEmail,
					context: { purpose: 'policy_change', lenderId: data.lenderId, policyId, draftHash }
				})
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	async function verifyOtpAndGetToken(
		otp: string
	): Promise<{ ok: boolean; token?: string; error?: string }> {
		try {
			const draftHash = await computeDraftHash();
			const res = await secureFetch('/api/pms/otp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail: data.officialBankEmail,
					otp,
					context: { purpose: 'policy_change', lenderId: data.lenderId, policyId, draftHash }
				})
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			return { ok: true, token: json.data.pmsOtpToken };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	async function submitPolicy(token: string): Promise<{ ok: boolean; error?: string }> {
		try {
			const res = await secureFetch(`/api/pms/policies/${policyId}/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-pms-otp-token': token
				},
				body: JSON.stringify({ lockVersion })
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	// Mirrors server computeDraftHash: SHA-256 of {sections, overrides} from live policy.
	// Must match submit/+server.ts exactly so the pmsOtpToken binds to correct content.
	async function computeDraftHash(): Promise<string> {
		if (!policyId) throw new Error('No policy ID');
		const res = await secureFetch(`/api/pms/policies/${policyId}`);
		if (!res.ok) throw new Error('Failed to fetch policy for hash computation');
		const json = await res.json();
		const { sections, conditionalOverrides } = json.data;
		const payload = JSON.stringify({ sections, overrides: conditionalOverrides });
		const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
		return Array.from(new Uint8Array(buf))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	// ── Backward navigation (clears reconciliation sign-off per spec) ─────────────
	// BUG 7 (S88) — when navigating back from step 5 (post sign-off) to step <= 4,
	// PATCH the server to reset reconciliation.status to 'in_progress'. The OTP
	// gate is the real security check (BUG 7 description), so a fire-and-forget
	// PATCH is safe — UI navigation isn't blocked even if the reset fails.
	async function goToStep(targetStep: number): Promise<void> {
		if (targetStep >= wizardStep) return; // no skip-forward

		// If we were past sign-off and going back to/before reconciliation,
		// reset the server-side reconciliation state to keep the audit trail clean.
		if (wizardStep === 5 && targetStep <= 4) {
			try {
				const res = await secureFetch(`/api/pms/policies/${policyId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						lockVersion,
						reconciliation: {
							status: 'in_progress',
							completedAt: null,
							completedBy: null
						}
					})
				});
				if (res.ok) {
					const json = await res.json();
					lockVersion = json.data?.lockVersion ?? lockVersion;
				}
				// On failure: continue with UI navigation. OTP gate prevents
				// stale sign-off from advancing past Step 5 anyway.
			} catch {
				// best-effort; never block backward navigation
			}
		}

		wizardStep = targetStep;
	}

	onMount(() => {
		// If there was a pipeline error from a previous session, surface it
		const savedError = data.policy?.pipelineState?.errorState;
		if (savedError) {
			errorMessage = `Previous session error at step ${savedError.step}: ${savedError.message}. You can retry below.`;
		}
	});
</script>

<svelte:head>
	<title>Encode Policy — {data.lenderName} {data.loanProduct} — DigitalDSA RM</title>
</svelte:head>

<div class="flex min-h-screen bg-gray-50">
	<!-- ── Left sidebar: step list ───────────────────────────────────────────── -->
	<aside class="w-56 shrink-0 border-r border-gray-200 bg-white p-5">
		<a
			href="/dashboard/rm/policies/{data.lenderId}/{encodeURIComponent(data.loanProduct)}"
			class="mb-6 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
		>
			<ArrowLeft size={13} />
			Back to policy
		</a>

		<p class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
			Encode Wizard
		</p>
		<p class="mb-5 truncate text-xs font-medium text-gray-600">{data.lenderName}</p>

		<nav class="space-y-1">
			{#each steps as step (step.number)}
				{@const isComplete = wizardStep > step.number}
				{@const isCurrent = wizardStep === step.number}
				{@const isLocked = wizardStep < step.number}
				<button
					type="button"
					disabled={isLocked}
					onclick={() => goToStep(step.number)}
					class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors
					{isCurrent
						? 'bg-amber-50 font-semibold text-amber-700'
						: isComplete
							? 'text-gray-600 hover:bg-gray-50'
							: 'cursor-not-allowed text-gray-300'}"
				>
					<span
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
						{isCurrent
							? 'bg-amber-600 text-white'
							: isComplete
								? 'bg-green-500 text-white'
								: 'bg-gray-100 text-gray-300'}"
					>
						{#if isComplete}
							<CheckCircle size={11} />
						{:else if isLocked}
							<Lock size={9} />
						{:else}
							{step.number + 1}
						{/if}
					</span>
					{step.label}
				</button>
			{/each}
		</nav>

		<!-- Policy ID (debug reference) -->
		{#if policyId}
			<p class="mt-6 text-[10px] text-gray-300 break-all">{policyId.slice(-8)}</p>
		{/if}
	</aside>

	<!-- ── Main content ──────────────────────────────────────────────────────── -->
	<main class="flex-1 overflow-y-auto p-8">
		<!-- Global error banner -->
		{#if errorMessage}
			<div
				class="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]"
			>
				<span class="flex-1">{errorMessage}</span>
				<button
					type="button"
					onclick={() => (errorMessage = '')}
					class="shrink-0 text-red-400 hover:text-red-600"
				>
					×
				</button>
			</div>
		{/if}

		<!-- Loading overlay message -->
		{#if isLoading && loadingMessage}
			<div
				class="mb-5 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
			>
				<span
					class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"
				></span>
				{loadingMessage}
			</div>
		{/if}

		<!-- ── Step panels ─────────────────────────────────────────────────── -->
		{#if wizardStep === 0}
			<Step0Setup
				lenderName={data.lenderName}
				loanProduct={data.loanProduct}
				existingFileName={data.policy?.sourceFileName ?? ''}
				{isLoading}
				onStartParsing={startParsing}
			/>
		{:else if wizardStep === 1}
			<Step1Clauses
				clauses={pass2Clauses}
				decisions={rmStep1Decisions}
				{isLoading}
				onDecisionsChange={(d) => (rmStep1Decisions = d)}
				onProceed={proceedToEncoding}
			/>
		{:else if wizardStep === 2}
			<Step2Encoding
				clauses={pass2Clauses}
				encodings={rmEncodings}
				decisions={rmStep1Decisions}
				{isLoading}
				onEncodingsChange={(e) => (rmEncodings = e)}
				onVerify={verifyEncodings}
			/>
		{:else if wizardStep === 3}
			<Step3Missed
				bankCardCount={bankCardNotes.length}
				encodedCount={conditionalOverrides.length || rmEncodings.length}
				{isLoading}
				onContinue={continueToReconciliation}
			/>
		{:else if wizardStep === 4}
			<Step4Reconcile
				clauses={pass2Clauses}
				{pass6Result}
				{isLoading}
				onSignOff={signOffReconciliation}
			/>
		{:else if wizardStep === 5}
			<Step5Submit
				{finalScore}
				bankEmail={data.officialBankEmail}
				{isLoading}
				{pmsOtpToken}
				onSendOtp={sendOtp}
				onVerifyOtp={verifyOtpAndGetToken}
				onSubmit={submitPolicy}
				onTokenReceived={(t) => (pmsOtpToken = t)}
			/>
		{/if}
	</main>
</div>
