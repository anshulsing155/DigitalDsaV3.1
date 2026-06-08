<script lang="ts">
	import { Inbox } from 'lucide-svelte';
	import type { BankCardNote } from '$lib/config/pms/policyTypes.js';

	let { bankCardNotes }: { bankCardNotes: (Omit<BankCardNote, 'addedAt'> & { addedAt: string })[] } = $props();
</script>

<div class="space-y-4">
	{#if bankCardNotes.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
			<Inbox size={24} class="mx-auto mb-2 text-gray-300" />
			<p class="text-sm font-medium text-gray-600">Dev queue is empty</p>
			<p class="mt-1 text-xs text-gray-400">
				No unencoded clauses or pending dev items. Bank-card notes (shown below when present)
				collect clauses the RM routed to plain-language display instead of a policy rule.
			</p>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-200 bg-white">
			<div class="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
				<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
					Bank card notes · {bankCardNotes.length}
				</h3>
				<p class="mt-0.5 text-[11px] text-gray-400">
					Plain-language clauses routed to the DSA bank card (not encoded as rules).
				</p>
			</div>
			<ul class="divide-y divide-gray-50">
				{#each bankCardNotes as note (note.id)}
					<li class="px-4 py-3 text-sm text-gray-700">{note.text}</li>
				{/each}
			</ul>
		</div>

		<p class="text-xs text-gray-400">
			Full dev queue management (threshold-met items across lenders) is part of Phase 7.
			For now this tab shows only this policy's bank-card notes.
		</p>
	{/if}
</div>
