<script lang="ts">
	import { MessageSquare, CheckCircle, XCircle, CreditCard } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf.js';
	import type { Pass2Clause, ConditionalOverride } from '$lib/config/pms/policyTypes.js';

	let {
		policyId,
		clauses,
		decisions,
		encodings,
		adminClauseComments,
		readOnly = false
	}: {
		policyId: string;
		clauses: Pass2Clause[] | null;
		decisions: Record<string, string>;
		encodings: Partial<ConditionalOverride>[];
		adminClauseComments: { clauseId: string; comment: string }[];
		readOnly?: boolean;
	} = $props();

	// Comment-edit state keyed by clauseId
	let editingClauseId = $state<string | null>(null);
	let commentDraft = $state('');
	let saveError = $state('');

	const commentMap = $derived.by(() => {
		const m = new Map<string, string>();
		for (const c of adminClauseComments) m.set(c.clauseId, c.comment);
		return m;
	});

	const encodingMap = $derived.by(() => {
		const m = new Map<string, Partial<ConditionalOverride>>();
		for (const e of encodings) if (e.sourceClauseId) m.set(e.sourceClauseId, e);
		return m;
	});

	function startEdit(clauseId: string) {
		editingClauseId = clauseId;
		commentDraft = commentMap.get(clauseId) ?? '';
		saveError = '';
	}

	function cancelEdit() {
		editingClauseId = null;
		commentDraft = '';
		saveError = '';
	}

	async function saveComment() {
		if (!editingClauseId) return;
		saveError = '';
		try {
			const res = await secureFetch(`/api/pms/policies/${policyId}/clause-comment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clauseId: editingClauseId, comment: commentDraft })
			});
			const json = await res.json();
			if (!res.ok) {
				saveError = json.error ?? 'Failed to save comment.';
				return;
			}
			editingClauseId = null;
			commentDraft = '';
			await invalidateAll();
		} catch {
			saveError = 'Network error.';
		}
	}

	function decisionIcon(d: string | undefined) {
		if (d === 'in_scope') return { Icon: CheckCircle, color: 'text-green-600', label: 'Accepted' };
		if (d === 'out_of_scope') return { Icon: XCircle, color: 'text-red-500', label: 'Out of scope' };
		if (d === 'bank_card') return { Icon: CreditCard, color: 'text-blue-500', label: 'Bank card' };
		return { Icon: CheckCircle, color: 'text-gray-300', label: 'Unreviewed' };
	}
</script>

<div class="space-y-3">
	{#if !clauses || clauses.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
			No reconciliation log available. This policy was not encoded via the AI pipeline
			(may be a direct-edit revision — see the Changes tab).
		</div>
	{:else}
		<p class="text-xs text-gray-400">
			{clauses.length} clause{clauses.length === 1 ? '' : 's'} · add a comment to flag an issue for the RM
		</p>

		{#each clauses as clause (clause.id)}
			{@const decision = decisions[clause.id]}
			{@const icon = decisionIcon(decision)}
			{@const encoding = encodingMap.get(clause.id)}
			{@const comment = commentMap.get(clause.id)}
			{@const editing = editingClauseId === clause.id}

			<div class="rounded-xl border {comment ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'} p-4">
				<!-- Header -->
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-2">
						<icon.Icon size={14} class={icon.color} />
						<span class="text-xs font-semibold uppercase tracking-wide text-gray-500">
							{icon.label}
						</span>
						{#if clause.tag}
							<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
								{clause.tag}
							</span>
						{/if}
					</div>
					{#if !readOnly}
						<button
							type="button"
							onclick={() => (editing ? cancelEdit() : startEdit(clause.id))}
							class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700"
						>
							<MessageSquare size={11} />
							{comment ? 'Edit comment' : 'Add comment'}
						</button>
					{/if}
				</div>

				<!-- Original text -->
				<p class="mt-2 text-sm text-gray-700">{clause.originalText}</p>

				{#if clause.normalizedText && clause.normalizedText !== clause.originalText}
					<p class="mt-1 text-xs italic text-gray-400">Normalized: {clause.normalizedText}</p>
				{/if}

				<!-- Encoding summary -->
				{#if encoding && decision === 'in_scope'}
					<div class="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
						<span class="font-medium text-gray-700">Encoded via:</span>
						{encoding.authoringMode === 'template' ? `Template (${encoding.templateId ?? 'n/a'})` : 'Custom JSON'}
						{#if encoding.condition}
							<pre class="mt-1 whitespace-pre-wrap font-mono text-[10px] text-gray-500">{JSON.stringify(encoding.condition, null, 2)}</pre>
						{/if}
					</div>
				{:else if decision === 'bank_card' && encoding?.notes}
					<div class="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
						<span class="font-medium">Bank card note:</span> {encoding.notes}
					</div>
				{/if}

				<!-- Existing admin comment -->
				{#if comment && !editing}
					<div class="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
						<MessageSquare size={11} class="mt-0.5 shrink-0" />
						<span><span class="font-semibold">Admin note:</span> {comment}</span>
					</div>
				{/if}

				<!-- Comment editor -->
				{#if editing}
					<div class="mt-3 space-y-2">
						<textarea
							bind:value={commentDraft}
							rows={2}
							placeholder="Add a note for the RM (will be visible on rejection)…"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
						></textarea>
						{#if saveError}
							<p class="text-xs text-red-600">{saveError}</p>
						{/if}
						<div class="flex gap-2">
							<button
								type="button"
								onclick={saveComment}
								class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelEdit}
								class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
							>
								Cancel
							</button>
							{#if comment}
								<button
									type="button"
									onclick={() => { commentDraft = ''; saveComment(); }}
									class="ml-auto text-xs text-red-500 hover:text-red-600"
								>
									Remove comment
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
