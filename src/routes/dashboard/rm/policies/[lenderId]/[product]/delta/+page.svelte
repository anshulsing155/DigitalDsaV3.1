<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import type { PolicyDelta, DeltaResult } from '$lib/config/pms/policyTypes.js';
	import Step0Upload from './_steps/Step0Upload.svelte';
	import Step1Review from './_steps/Step1Review.svelte';
	import Step2Submit from './_steps/Step2Submit.svelte';

	const { data }: { data: PageData } = $props();

	// Wizard steps: 0 = Upload, 1 = Review deltas, 2 = OTP submit
	let wizardStep = $state<0 | 1 | 2>(0);

	// Result from /api/pms/pipeline/delta — populated after AI parse
	let deltaResult = $state<DeltaResult | null>(null);

	// Set after /api/pms/policies/[id]/apply-delta succeeds
	let draftId = $state('');
	let draftLockVersion = $state(0);
	let pendingChangeCount = $state(0);
	let acceptedDeltas = $state<PolicyDelta[]>([]);

	// Step 1 → Step 2 state
	let isSaving = $state(false);
	let saveError = $state('');

	// svelte-ignore state_referenced_locally
	const detailUrl = `/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}`;

	const stepLabels = ['Upload addendum', 'Review changes', 'Submit'];

	function onDeltaResult(result: DeltaResult) {
		deltaResult = result;
		wizardStep = 1;
	}

	async function onSaveDeltas(accepted: PolicyDelta[]) {
		// If RM rejected everything, there's nothing to save — just go back
		if (accepted.length === 0) {
			await goto(detailUrl);
			return;
		}

		isSaving = true;
		saveError = '';
		acceptedDeltas = accepted;

		try {
			const payload = accepted.map((d) => ({
				sectionKey: d.sectionKey,
				fieldKey: d.fieldKey,
				newValue: d.newValue,
				rmDecision: d.rmDecision as 'accepted' | 'edited',
				editedValue: d.editedValue
			}));

			const res = await secureFetch(`/api/pms/policies/${data.policy.id}/apply-delta`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ acceptedDeltas: payload })
			});
			const json = await res.json();

			if (!res.ok) {
				saveError = json.error ?? 'Failed to save changes. Please try again.';
				return;
			}

			draftId = json.data.draftId;
			draftLockVersion = json.data.lockVersion;
			pendingChangeCount = json.data.pendingChangeCount;
			wizardStep = 2;
		} catch {
			saveError = 'Network error. Please check your connection and try again.';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Upload Addendum — {data.lenderName} {data.loanProduct} — DigitalDSA RM</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<!-- Back link -->
	<a
		href={detailUrl}
		class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
	>
		<ArrowLeft size={15} />
		{data.lenderName} — {data.loanProduct}
	</a>

	<!-- Header -->
	<div>
		<h1 class="text-xl font-bold text-gray-900">Upload change circular</h1>
		<p class="mt-0.5 text-sm text-gray-500">
			Policy v{data.policy.version} · {data.policy.sourceFileName}
		</p>
	</div>

	<!-- Step indicator -->
	<div class="flex items-center gap-0">
		{#each stepLabels as label, i}
			<div class="flex items-center {i < stepLabels.length - 1 ? 'flex-1' : ''}">
				<div class="flex items-center gap-2">
					<div
						class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold
						{wizardStep === i
							? 'bg-amber-600 text-white'
							: wizardStep > i
								? 'bg-green-600 text-white'
								: 'bg-gray-100 text-gray-500'}"
					>
						{i + 1}
					</div>
					<span class="text-xs font-medium {wizardStep === i ? 'text-amber-700' : wizardStep > i ? 'text-green-700' : 'text-gray-400'}">
						{label}
					</span>
				</div>
				{#if i < stepLabels.length - 1}
					<div class="mx-3 h-px flex-1 {wizardStep > i ? 'bg-green-400' : 'bg-gray-200'}"></div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Step content -->
	<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
		{#if wizardStep === 0}
			<Step0Upload
				policyId={data.policy.id}
				loanProduct={data.loanProduct}
				{onDeltaResult}
			/>
		{:else if wizardStep === 1 && deltaResult}
			<Step1Review
				{deltaResult}
				onSave={onSaveDeltas}
				{isSaving}
				{saveError}
			/>
		{:else if wizardStep === 2}
			<Step2Submit
				{draftId}
				lockVersion={draftLockVersion}
				lenderId={data.lenderId}
				loanProduct={data.loanProduct}
				bankEmail={data.officialBankEmail}
				{pendingChangeCount}
				{acceptedDeltas}
			/>
		{/if}
	</div>
</div>
