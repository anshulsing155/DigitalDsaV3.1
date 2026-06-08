<script lang="ts">
	import { CheckCircle, XCircle, Edit3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-svelte';
	import type { PolicyDelta, DeltaResult } from '$lib/config/pms/policyTypes.js';

	interface Props {
		deltaResult: DeltaResult;
		onSave: (acceptedDeltas: PolicyDelta[]) => void;
		isSaving: boolean;
		saveError: string;
	}

	const { deltaResult, onSave, isSaving, saveError }: Props = $props();

	// RM decisions for each delta — keyed by `${sectionKey}.${fieldKey}`
	let decisions = $state<Record<string, PolicyDelta['rmDecision']>>({});
	// Edited values — only populated when RM chooses 'edited'
	let editedValues = $state<Record<string, string>>({});
	// Which deltas are expanded to show details
	let expanded = $state<Record<string, boolean>>({});

	function deltaKey(d: PolicyDelta) {
		return `${d.sectionKey}.${d.fieldKey}`;
	}

	function decide(delta: PolicyDelta, decision: PolicyDelta['rmDecision']) {
		const key = deltaKey(delta);
		decisions[key] = decision;
	}

	function toggleExpand(delta: PolicyDelta) {
		const key = deltaKey(delta);
		expanded[key] = !expanded[key];
	}

	const allDecided = $derived(
		deltaResult.deltas.length > 0 &&
			deltaResult.deltas.every((d) => decisions[deltaKey(d)] !== undefined && decisions[deltaKey(d)] !== null)
	);

	const acceptedCount = $derived(
		Object.values(decisions).filter((d) => d === 'accepted' || d === 'edited').length
	);

	function formatValue(v: unknown): string {
		if (v === null || v === undefined) return '—';
		if (typeof v === 'object') return JSON.stringify(v);
		return String(v);
	}

	function handleSave() {
		const accepted: PolicyDelta[] = deltaResult.deltas
			.filter((d) => {
				const dec = decisions[deltaKey(d)];
				return dec === 'accepted' || dec === 'edited';
			})
			.map((d) => {
				const key = deltaKey(d);
				const dec = decisions[key]!;
				let editedValue: unknown = undefined;
				if (dec === 'edited') {
					// Try to parse as JSON, fall back to raw string
					try {
						editedValue = JSON.parse(editedValues[key] ?? '');
					} catch {
						editedValue = editedValues[key] ?? d.newValue;
					}
				}
				return { ...d, rmDecision: dec, editedValue };
			});

		onSave(accepted);
	}

	const confidenceColor = (c: number) =>
		c >= 0.85 ? 'text-green-600' : c >= 0.65 ? 'text-amber-600' : 'text-red-600';
</script>

<div class="space-y-6">
	<!-- Summary header -->
	<div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-sm font-semibold text-gray-800">
					{deltaResult.deltas.length} change{deltaResult.deltas.length === 1 ? '' : 's'} detected
				</p>
				<p class="mt-0.5 text-sm text-gray-500">{deltaResult.summary}</p>
			</div>
			<div class="shrink-0 text-right text-xs text-gray-400">
				<span class={confidenceColor(deltaResult.overallConfidence)}>
					{Math.round(deltaResult.overallConfidence * 100)}% confidence
				</span>
			</div>
		</div>
	</div>

	{#if deltaResult.deltas.length === 0}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
			<CheckCircle size={32} class="mb-3 text-green-400" />
			<p class="text-sm font-medium text-gray-700">No changes detected</p>
			<p class="mt-1 text-xs text-gray-400">
				The AI found no differences between the addendum and the current policy.
			</p>
		</div>
	{:else}
		<!-- Delta list -->
		<div class="space-y-3">
			{#each deltaResult.deltas as delta (deltaKey(delta))}
				{@const key = deltaKey(delta)}
				{@const decision = decisions[key]}
				{@const isOpen = expanded[key]}

				<div class="rounded-xl border {decision === 'rejected' ? 'border-red-200 bg-red-50' : decision === 'accepted' || decision === 'edited' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'} p-4 transition-colors">
					<!-- Header row -->
					<div class="flex items-start gap-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
									{delta.sectionKey}.{delta.fieldKey}
								</span>
								<span class="text-xs {confidenceColor(delta.confidence)}">
									{Math.round(delta.confidence * 100)}%
								</span>
							</div>

							<!-- Old → New -->
							<div class="mt-2 flex items-center gap-3 text-sm">
								<span class="rounded bg-red-100 px-2 py-0.5 font-mono text-xs text-red-700 line-through">
									{formatValue(delta.oldValue)}
								</span>
								<span class="text-gray-400">→</span>
								<span class="rounded bg-green-100 px-2 py-0.5 font-mono text-xs text-green-700">
									{formatValue(delta.newValue)}
								</span>
							</div>

							<!-- Edit field -->
							{#if decision === 'edited'}
								<div class="mt-2">
									<label for="delta-edit-{key}" class="mb-1 block text-xs text-gray-600">Your corrected value (JSON)</label>
									<input
										id="delta-edit-{key}"
										type="text"
										bind:value={editedValues[key]}
										placeholder={JSON.stringify(delta.newValue)}
										class="w-full rounded border border-amber-300 px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
									/>
								</div>
							{/if}
						</div>

						<!-- Decision buttons -->
						<div class="flex shrink-0 items-center gap-1.5">
							<button
								type="button"
								onclick={() => decide(delta, 'accepted')}
								title="Accept"
								class="rounded-lg p-1.5 transition-colors {decision === 'accepted' ? 'bg-green-600 text-white' : 'bg-white text-gray-400 hover:text-green-600 border border-gray-200'}"
							>
								<CheckCircle size={16} />
							</button>
							<button
								type="button"
								onclick={() => decide(delta, 'edited')}
								title="Accept with edit"
								class="rounded-lg p-1.5 transition-colors {decision === 'edited' ? 'bg-amber-500 text-white' : 'bg-white text-gray-400 hover:text-amber-500 border border-gray-200'}"
							>
								<Edit3 size={16} />
							</button>
							<button
								type="button"
								onclick={() => decide(delta, 'rejected')}
								title="Reject"
								class="rounded-lg p-1.5 transition-colors {decision === 'rejected' ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500 border border-gray-200'}"
							>
								<XCircle size={16} />
							</button>
							<button
								type="button"
								onclick={() => toggleExpand(delta)}
								class="ml-1 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-gray-600"
								title={isOpen ? 'Hide evidence' : 'Show evidence'}
							>
								{#if isOpen}
									<ChevronUp size={16} />
								{:else}
									<ChevronDown size={16} />
								{/if}
							</button>
						</div>
					</div>

					<!-- Evidence quote (collapsible) -->
					{#if isOpen}
						<div class="mt-3 rounded-lg border-l-4 border-amber-300 bg-amber-50 px-3 py-2">
							<p class="mb-0.5 text-xs font-medium text-amber-700">Evidence from addendum</p>
							<p class="text-xs text-amber-800 italic">"{delta.evidenceQuote}"</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Save bar -->
		<div class="sticky bottom-4 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
			<div class="flex items-center justify-between gap-4">
				<div class="text-sm text-gray-600">
					{#if allDecided}
						<span class="font-medium text-gray-800">{acceptedCount} change{acceptedCount === 1 ? '' : 's'} to apply</span>
						{#if acceptedCount === 0}
							<span class="ml-1 text-gray-500">(all rejected — no draft will be created)</span>
						{/if}
					{:else}
						<span class="text-amber-700">Review all changes to continue</span>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if saveError}
						<p class="flex items-center gap-1 text-xs text-red-600">
							<AlertTriangle size={13} />
							{saveError}
						</p>
					{/if}
					<button
						type="button"
						onclick={handleSave}
						disabled={!allDecided || isSaving}
						class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
					>
						{isSaving ? 'Saving…' : acceptedCount === 0 ? 'No changes to save' : 'Save changes →'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
