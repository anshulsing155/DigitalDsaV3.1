<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import {
		FileText,
		CheckCircle,
		Clock,
		AlertTriangle,
		ChevronRight,
		ArrowLeft,
		Cpu,
		Send,
		Zap
	} from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf.js';

	let { data }: { data: PageData } = $props();

	const policy = $derived(data.policy);

	const statusLabel: Record<string, string> = {
		draft: 'Draft',
		submitted: 'Under Review',
		approved_scheduled: 'Approved — Scheduled',
		approved: 'Approved',
		published: 'Live',
		archived: 'Archived'
	};

	const statusColor: Record<string, string> = {
		draft: 'bg-gray-100 text-gray-600',
		submitted: 'bg-blue-100 text-blue-700',
		approved_scheduled: 'bg-purple-100 text-purple-700',
		approved: 'bg-green-100 text-green-700',
		published: 'bg-emerald-100 text-emerald-700',
		archived: 'bg-gray-100 text-gray-400'
	};

	const pipelineStepLabel = [
		'Not started',
		'Pass 1–2 done (Normalize + Atomize)',
		'Pass 3 done (Encode)',
		'Pass 4–5 done (Verify + Correct)',
		'Pass 6 done (Reconstruct)',
		'Complete'
	];

	const pipelineStepPercent = [0, 20, 40, 65, 85, 100];

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateTime(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const currentStep = $derived(policy?.pipelineState?.currentStep ?? 0);
	const progressPercent = $derived(pipelineStepPercent[currentStep]);
	const canResume = $derived(policy && policy.status === 'draft' && currentStep > 0);
	const canStart = $derived(policy && policy.status === 'draft' && currentStep === 0);
	const encodeWizardUrl = $derived(
		`/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}/encode`
	);
	const editPageUrl = $derived(
		`/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}/edit`
	);
	const deltaPageUrl = $derived(
		`/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}/delta`
	);
	const suggestionsUrl = $derived(
		`/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}/suggestions`
	);

	let revising = $state(false);
	let reviseError = $state('');

	async function startRevision() {
		if (!policy) return;
		revising = true;
		reviseError = '';
		try {
			const res = await secureFetch(`/api/pms/policies/${policy.id}/revise`, { method: 'POST' });
			const json = await res.json();
			if (!res.ok) {
				reviseError = json.error ?? 'Failed to start revision.';
				return;
			}
			// New draft created — redirect RM into edit mode
			await goto(editPageUrl);
		} catch {
			reviseError = 'Network error. Please try again.';
		} finally {
			revising = false;
		}
	}
</script>

<svelte:head>
	<title>{data.lenderName} — {data.loanProduct} Policy — DigitalDSA RM</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<!-- Back link -->
	<a
		href="/dashboard/rm/policies"
		class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
	>
		<ArrowLeft size={15} />
		Policy Library
	</a>

	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{data.lenderName}</h1>
			<p class="mt-0.5 text-sm text-gray-500">{data.loanProduct}</p>
		</div>
		{#if policy}
			<span class="mt-1 rounded-full px-3 py-1 text-xs font-semibold {statusColor[policy.status]}">
				{statusLabel[policy.status] ?? policy.status}
			</span>
		{/if}
	</div>

	<!-- No policy yet -->
	{#if !policy}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
			<FileText size={40} class="mb-4 text-gray-300" />
			<h3 class="text-base font-semibold text-gray-700">No policy document yet</h3>
			<p class="mt-1 max-w-xs text-sm text-gray-400">
				Upload the lender's policy PDF from the Policy Library to begin encoding.
			</p>
			<a
				href="/dashboard/rm/policies"
				class="mt-5 flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
			>
				Go to Policy Library
			</a>
		</div>
	{:else}
		<!-- Admin rejection note -->
		{#if policy.adminRejectionNote}
			<div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
				<AlertTriangle size={18} class="mt-0.5 shrink-0 text-red-500" />
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-red-800">Returned for revision</p>
					<p class="mt-1 text-sm text-[var(--color-error)]">{policy.adminRejectionNote}</p>
					{#if policy.adminRejectedAt}
						<p class="mt-1 text-xs text-red-400">{formatDateTime(policy.adminRejectedAt)}</p>
					{/if}
					{#if policy.adminClauseCommentCount > 0}
						<p class="mt-2 text-xs font-medium text-red-600">
							{policy.adminClauseCommentCount} clause comment{policy.adminClauseCommentCount === 1 ? '' : 's'} — open the encode wizard to review.
						</p>
					{/if}
				</div>
				<a
					href={encodeWizardUrl}
					class="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
				>
					Review &amp; fix →
				</a>
			</div>
		{/if}

		<!-- Pipeline progress card -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Cpu size={18} class="text-amber-500" />
					<h2 class="text-sm font-semibold text-gray-800">AI Pipeline Progress</h2>
				</div>
				<span class="text-xs font-medium text-gray-400">
					Step {currentStep} of 5 — {pipelineStepLabel[currentStep]}
				</span>
			</div>

			<!-- Progress bar -->
			<div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
				<div
					class="h-2 rounded-full bg-amber-500 transition-all duration-500"
					style="width: {progressPercent}%"
				></div>
			</div>

			{#if policy.pipelineState?.errorState}
				<p class="mt-2 text-xs text-red-500">
					Last error at step {policy.pipelineState.errorState.step}: {policy.pipelineState.errorState.message}
				</p>
			{/if}

			{#if policy.pipelineState?.lastSavedAt}
				<p class="mt-2 text-xs text-gray-400">
					Last saved {formatDateTime(policy.pipelineState.lastSavedAt)}
				</p>
			{/if}

			{#if policy.aiPipelineRun}
				<div class="mt-3 flex gap-4 text-xs text-gray-500">
					<span>Score: <strong class="text-gray-700">{policy.aiPipelineRun.finalScore ?? '—'}</strong></span>
					<span>Tokens: <strong class="text-gray-700">{policy.aiPipelineRun.totalTokensUsed.toLocaleString()}</strong></span>
					<span>Passes: <strong class="text-gray-700">{policy.aiPipelineRun.passesExecuted}</strong></span>
				</div>
			{/if}

			<!-- Actions -->
			<div class="mt-4 flex gap-3">
				{#if canResume}
					<a
						href={encodeWizardUrl}
						class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
					>
						<Zap size={15} />
						Resume encoding →
					</a>
				{:else if canStart}
					<a
						href={encodeWizardUrl}
						class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
					>
						<Cpu size={15} />
						Start AI pipeline →
					</a>
				{:else if policy.status === 'submitted'}
					<div class="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
						<Clock size={15} />
						Awaiting admin review
					</div>
				{:else if policy.status === 'approved' || policy.status === 'approved_scheduled' || policy.status === 'published'}
					<div class="flex flex-col items-end gap-2">
						<div class="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
							<CheckCircle size={15} />
							{statusLabel[policy.status]}
						</div>
						{#if policy.status === 'published'}
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={startRevision}
									disabled={revising}
									class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-40"
								>
									{#if revising}
										<span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></span>
										Starting revision…
									{:else}
										Edit policy →
									{/if}
								</button>
								<a
									href={deltaPageUrl}
									class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
								>
									Upload addendum →
								</a>
								<a
									href={suggestionsUrl}
									class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
								>
									DSA suggestions →
								</a>
							</div>
							{#if reviseError}
								<p class="text-xs text-red-600">{reviseError}</p>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Policy metadata -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-800">Policy Details</h2>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<div>
					<dt class="text-xs text-gray-400">Source file</dt>
					<dd class="mt-0.5 truncate font-medium text-gray-700">{policy.sourceFileName}</dd>
				</div>
				<div>
					<dt class="text-xs text-gray-400">Uploaded</dt>
					<dd class="mt-0.5 font-medium text-gray-700">{formatDate(policy.uploadedAt)}</dd>
				</div>
				<div>
					<dt class="text-xs text-gray-400">Version</dt>
					<dd class="mt-0.5 font-medium text-gray-700">
						{policy.version > 0 ? `v${policy.version}` : 'Draft'}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-gray-400">Overrides</dt>
					<dd class="mt-0.5 font-medium text-gray-700">
						{policy.overrideCount} conditional · {policy.bankCardNoteCount} card note{policy.bankCardNoteCount === 1 ? '' : 's'}
					</dd>
				</div>
				{#if policy.submittedAt}
					<div>
						<dt class="text-xs text-gray-400">Submitted</dt>
						<dd class="mt-0.5 font-medium text-gray-700">{formatDateTime(policy.submittedAt)}</dd>
					</div>
				{/if}
				{#if policy.approvedAt}
					<div>
						<dt class="text-xs text-gray-400">Approved</dt>
						<dd class="mt-0.5 font-medium text-gray-700">{formatDateTime(policy.approvedAt)}</dd>
					</div>
				{/if}
				{#if policy.scheduledPublishAt}
					<div>
						<dt class="text-xs text-gray-400">Scheduled publish</dt>
						<dd class="mt-0.5 font-medium text-purple-700">{formatDate(policy.scheduledPublishAt)}</dd>
					</div>
				{/if}
				{#if policy.publishedAt}
					<div>
						<dt class="text-xs text-gray-400">Published</dt>
						<dd class="mt-0.5 font-medium text-emerald-700">{formatDateTime(policy.publishedAt)}</dd>
					</div>
				{/if}
				<div>
					<dt class="text-xs text-gray-400">Last updated</dt>
					<dd class="mt-0.5 font-medium text-gray-700">{formatDateTime(policy.updatedAt)}</dd>
				</div>
			</dl>
		</div>

		<!-- Open wizard link (always visible for draft/submitted) -->
		{#if policy.status === 'draft' || policy.status === 'submitted'}
			<a
				href={encodeWizardUrl}
				class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-amber-300 hover:bg-amber-50 transition-colors"
			>
				<div class="flex items-center gap-3">
					<Send size={18} class="text-amber-500" />
					<div>
						<p class="text-sm font-semibold text-gray-800">Open Encode Wizard</p>
						<p class="text-xs text-gray-400">Review AI output, resolve ambiguities, and submit</p>
					</div>
				</div>
				<ChevronRight size={18} class="text-gray-400" />
			</a>
		{/if}
	{/if}
</div>
