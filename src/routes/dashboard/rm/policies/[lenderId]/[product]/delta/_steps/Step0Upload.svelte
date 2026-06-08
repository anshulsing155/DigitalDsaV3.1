<script lang="ts">
	import { AlertTriangle, FileText, Loader } from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import type { PolicyDelta, DeltaResult } from '$lib/config/pms/policyTypes.js';

	interface Props {
		policyId: string;
		loanProduct: string;
		onDeltaResult: (result: DeltaResult) => void;
	}

	const { policyId, loanProduct, onDeltaResult }: Props = $props();

	let addendumText = $state('');
	let isParsing = $state(false);
	let parseError = $state('');
	// Shown when AI suspects this is a full re-upload, not a change circular
	let sizeWarning = $state<{ message: string; addendumLength: number; policyLength: number } | null>(null);

	async function runDeltaParse(confirmedFullPolicy = false) {
		if (addendumText.trim().length < 10) {
			parseError = 'Please paste the addendum text (at least 10 characters).';
			return;
		}

		isParsing = true;
		parseError = '';
		sizeWarning = null;

		try {
			const res = await secureFetch('/api/pms/pipeline/delta', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ policyId, addendumText, confirmedFullPolicy })
			});
			const json = await res.json();

			if (!res.ok) {
				parseError = json.error ?? 'Delta parse failed. Please try again.';
				return;
			}

			// 60% size warning — server asks RM to confirm before spending tokens
			if (json.data?.warning === 'full_policy_detected') {
				sizeWarning = {
					message: json.data.message,
					addendumLength: json.data.addendumLength,
					policyLength: json.data.policyLength
				};
				return;
			}

			onDeltaResult(json.data.deltaResult as DeltaResult);
		} catch {
			parseError = 'Network error. Please check your connection and try again.';
		} finally {
			isParsing = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-base font-semibold text-gray-900">Upload change circular</h2>
		<p class="mt-1 text-sm text-gray-500">
			Paste the bank's addendum or change circular text below. The AI will compare it against the
			current <strong>{loanProduct}</strong> policy and surface only the differences.
		</p>
	</div>

	<!-- Text area -->
	<div>
		<label for="addendum-text" class="mb-1.5 block text-xs font-medium text-gray-700">
			Addendum text
		</label>
		<textarea
			id="addendum-text"
			bind:value={addendumText}
			rows={14}
			placeholder="Paste the bank's circular or addendum text here…"
			class="w-full resize-y rounded-lg border border-gray-300 p-3 font-mono text-sm text-gray-800 placeholder-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
		></textarea>
		<p class="mt-1 text-right text-xs text-gray-400">{addendumText.length.toLocaleString()} chars</p>
	</div>

	<!-- 60% size warning -->
	{#if sizeWarning}
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
			<div class="flex items-start gap-3">
				<AlertTriangle size={18} class="mt-0.5 shrink-0 text-amber-600" />
				<div class="flex-1">
					<p class="text-sm font-semibold text-amber-800">Looks like a full policy upload</p>
					<p class="mt-1 text-sm text-amber-700">{sizeWarning.message}</p>
					<p class="mt-2 text-xs text-amber-600">
						Addendum: {sizeWarning.addendumLength.toLocaleString()} chars ·
						Current policy: {sizeWarning.policyLength.toLocaleString()} chars
					</p>
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							onclick={() => runDeltaParse(true)}
							disabled={isParsing}
							class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
						>
							{isParsing ? 'Parsing…' : 'Proceed anyway'}
						</button>
						<button
							type="button"
							onclick={() => (sizeWarning = null)}
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error -->
	{#if parseError}
		<p class="flex items-center gap-2 text-sm text-red-600">
			<AlertTriangle size={15} class="shrink-0" />
			{parseError}
		</p>
	{/if}

	<!-- Run parse -->
	{#if !sizeWarning}
		<button
			type="button"
			onclick={() => runDeltaParse(false)}
			disabled={isParsing || addendumText.trim().length < 10}
			class="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
		>
			{#if isParsing}
				<Loader size={16} class="animate-spin" />
				Analysing changes…
			{:else}
				<FileText size={16} />
				Run delta parse →
			{/if}
		</button>
	{/if}
</div>
