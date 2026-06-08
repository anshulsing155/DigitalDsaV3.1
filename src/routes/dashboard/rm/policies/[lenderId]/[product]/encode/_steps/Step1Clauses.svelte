<script lang="ts">
	import { CheckCircle, XCircle, CreditCard, Edit3, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import type { Pass2Clause } from '$lib/config/pms/policyTypes.js';

	let {
		clauses,
		decisions,
		isLoading,
		onDecisionsChange,
		onProceed
	}: {
		clauses: Pass2Clause[];
		decisions: Record<string, string>;
		isLoading: boolean;
		onDecisionsChange: (d: Record<string, string>) => void;
		onProceed: (decisions: Record<string, string>) => Promise<void>;
	} = $props();

	// svelte-ignore state_referenced_locally
	let localDecisions = $state<Record<string, string>>({ ...decisions });
	let editingId = $state<string | null>(null);
	let editText = $state('');

	// Counts for header stats
	const resolvedCount = $derived(Object.keys(localDecisions).length);
	const ambiguousUnresolved = $derived(
		clauses.filter(
			(c) =>
				c.ambiguityFlags?.length > 0 &&
				localDecisions[c.id] === undefined
		).length
	);
	// in_scope + ambiguous is also blocked: server rejects pass3 with 422 if any ambiguous clause
	// is accepted without manual resolution (RM must edit text or mark out_of_scope/bank_card)
	const inScopeAmbiguousCount = $derived(
		clauses.filter(
			(c) => localDecisions[c.id] === 'in_scope' && c.ambiguityFlags?.length > 0
		).length
	);
	const canProceed = $derived(
		resolvedCount === clauses.length &&
		ambiguousUnresolved === 0 &&
		inScopeAmbiguousCount === 0 &&
		!isLoading
	);

	function setDecision(clauseId: string, decision: string) {
		localDecisions = { ...localDecisions, [clauseId]: decision };
		onDecisionsChange(localDecisions);
	}

	function startEdit(clause: Pass2Clause) {
		editingId = clause.id;
		editText = clause.normalizedText;
	}

	function saveEdit(clauseId: string) {
		// Mark as in_scope with edited text stored in decision key
		setDecision(clauseId, 'in_scope');
		editingId = null;
	}

	function confidenceBadge(confidence: number) {
		if (confidence >= 0.8) return 'bg-green-100 text-green-700';
		if (confidence >= 0.6) return 'bg-amber-100 text-amber-700';
		return 'bg-red-100 text-red-700';
	}

	function getDecisionLabel(decision: string | undefined) {
		if (!decision) return null;
		const labels: Record<string, string> = {
			in_scope: 'Accepted',
			out_of_scope: 'Out of scope',
			bank_card: 'Bank card'
		};
		return labels[decision] ?? decision;
	}
</script>

<div class="mx-auto max-w-3xl space-y-5">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-xl font-bold text-gray-900">Clause Review</h1>
			<p class="mt-1 text-sm text-gray-500">
				Review each extracted clause. Accept, mark out of scope, or route to bank card.
				All ambiguous clauses must be resolved before encoding.
			</p>
		</div>
		<div class="shrink-0 text-right">
			<span class="text-2xl font-bold text-gray-800">{resolvedCount}</span>
			<span class="text-sm text-gray-400"> / {clauses.length}</span>
			<p class="text-xs text-gray-400">reviewed</p>
		</div>
	</div>

	{#if ambiguousUnresolved > 0}
		<div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
			<AlertTriangle size={15} class="shrink-0" />
			{ambiguousUnresolved} ambiguous clause{ambiguousUnresolved !== 1 ? 's' : ''} must be resolved — edit text, mark out of scope, or route to bank card.
		</div>
	{:else if inScopeAmbiguousCount > 0}
		<div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
			<AlertTriangle size={15} class="shrink-0" />
			{inScopeAmbiguousCount} accepted clause{inScopeAmbiguousCount !== 1 ? 's are' : ' is'} still marked ambiguous — edit the text to resolve before proceeding.
		</div>
	{/if}

	<!-- Clause cards -->
	<div class="space-y-4">
		{#each clauses as clause (clause.id)}
			{@const decision = localDecisions[clause.id]}
			{@const isAmbiguous = clause.ambiguityFlags?.length > 0}
			{@const hasAtoms = clause.atoms?.length > 0}

			<div
				class="rounded-xl border bg-white p-5 shadow-sm
				{isAmbiguous && !decision ? 'border-amber-300' : decision ? 'border-gray-100' : 'border-gray-200'}"
			>
				<!-- Card header: relevance + confidence + ambiguous flag -->
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
						{clause.tag === 'eligibility' ? 'bg-purple-100 text-purple-700'
						: clause.tag === 'income' ? 'bg-blue-100 text-blue-700'
						: clause.tag === 'roi' ? 'bg-emerald-100 text-emerald-700'
						: clause.tag === 'ltv' ? 'bg-cyan-100 text-cyan-700'
						: 'bg-gray-100 text-gray-600'}"
					>
						{clause.tag ?? 'other'}
					</span>

					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold {confidenceBadge(
							clause.ambiguityFlags?.length > 0 ? 0.5 : 0.85
						)}"
					>
						{isAmbiguous ? 'Ambiguous' : 'In-scope'}
					</span>

					{#if decision}
						<span class="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
							{getDecisionLabel(decision)}
						</span>
					{/if}
				</div>

				<!-- Original text -->
				<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
					Original
				</div>
				<p class="mb-3 text-sm text-gray-700">{clause.originalText}</p>

				<!-- Normalized text -->
				<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
					Normalized
				</div>
				{#if editingId === clause.id}
					<textarea
						bind:value={editText}
						rows={2}
						class="mb-2 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm
						text-gray-700 outline-none focus:ring-2 focus:ring-amber-100"
					></textarea>
					<button
						type="button"
						onclick={() => saveEdit(clause.id)}
						class="mb-3 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
					>
						Save edit
					</button>
				{:else}
					<p class="mb-3 text-sm italic text-gray-600">{clause.normalizedText}</p>
				{/if}

				<!-- Atoms -->
				{#if hasAtoms}
					<div class="mb-3 rounded-lg bg-gray-50 px-3 py-2">
						<p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
							Atoms
						</p>
						{#each clause.atoms as atom, i (i)}
							<p class="text-xs text-gray-600">
								{#if atom.conditionText}
									<span class="font-medium text-blue-600">IF</span> {atom.conditionText}
								{:else if atom.candidateKeyPath}
									<span class="font-mono text-xs text-gray-500">{atom.candidateKeyPath}</span>
									{atom.operator ?? ''}
									<span class="font-medium">{String(atom.value ?? '')}</span>
								{/if}
							</p>
						{/each}
					</div>
				{/if}

				<!-- Ambiguity flags -->
				{#if isAmbiguous}
					<div class="mb-3 space-y-1">
						{#each clause.ambiguityFlags as flag, i (i)}
							<div class="flex items-start gap-1.5 text-xs text-amber-700">
								<AlertTriangle size={12} class="mt-0.5 shrink-0" />
								{flag.description}
							</div>
						{/each}
					</div>
				{/if}

				<!-- Action buttons -->
				<div class="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
					<button
						type="button"
						onclick={() => setDecision(clause.id, 'in_scope')}
						class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium
						transition-colors
						{decision === 'in_scope'
							? 'border-green-300 bg-green-50 text-green-700'
							: 'border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'}"
					>
						<CheckCircle size={13} /> Accept
					</button>

					<button
						type="button"
						onclick={() => startEdit(clause)}
						class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5
						text-xs font-medium text-gray-500 hover:border-amber-300 hover:text-amber-600
						transition-colors"
					>
						<Edit3 size={13} /> Edit
					</button>

					<button
						type="button"
						onclick={() => setDecision(clause.id, 'out_of_scope')}
						class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium
						transition-colors
						{decision === 'out_of_scope'
							? 'border-red-300 bg-red-50 text-red-600'
							: 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'}"
					>
						<XCircle size={13} /> Out of scope
					</button>

					<button
						type="button"
						onclick={() => setDecision(clause.id, 'bank_card')}
						class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium
						transition-colors
						{decision === 'bank_card'
							? 'border-blue-300 bg-blue-50 text-blue-600'
							: 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500'}"
					>
						<CreditCard size={13} /> Bank card
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Proceed button -->
	<div class="flex justify-end">
		<button
			type="button"
			onclick={() => onProceed(localDecisions)}
			disabled={!canProceed}
			class="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold
			text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
		>
			{#if isLoading}
				<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
				Encoding…
			{:else}
				Proceed to Encoding <ChevronRight size={15} />
			{/if}
		</button>
	</div>
</div>
