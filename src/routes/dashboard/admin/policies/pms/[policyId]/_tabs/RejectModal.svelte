<script lang="ts">
	import { XCircle, ArrowLeft, AlertTriangle } from 'lucide-svelte';

	let {
		isOpen = $bindable<boolean>(false),
		clauseCommentCount,
		onReject
	}: {
		isOpen: boolean;
		clauseCommentCount: number;
		onReject: (note: string) => Promise<{ ok: boolean; error?: string }>;
	} = $props();

	let note = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	function close() {
		isOpen = false;
		errorMessage = '';
	}

	async function confirm() {
		if (!note.trim()) {
			errorMessage = 'A rejection note is required so the RM knows what to fix.';
			return;
		}
		isSubmitting = true;
		errorMessage = '';
		const result = await onReject(note.trim());
		isSubmitting = false;
		if (!result.ok) {
			errorMessage = result.error ?? 'Rejection failed.';
			return;
		}
		close();
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
		<div role="dialog" aria-modal="true" aria-label="Reject policy" class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
					<XCircle size={20} class="text-red-600" />
				</div>
				<div>
					<h3 class="text-base font-semibold text-gray-900">Reject & send back to RM</h3>
					<p class="text-xs text-gray-500">Policy returns to draft status. RM can edit and resubmit.</p>
				</div>
			</div>

			{#if clauseCommentCount > 0}
				<div class="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
					<AlertTriangle size={12} class="mt-0.5 shrink-0" />
					<span>
						You've added {clauseCommentCount} clause comment{clauseCommentCount === 1 ? '' : 's'}.
						These are sent to the RM along with the rejection note below.
					</span>
				</div>
			{/if}

			<label class="block">
				<span class="text-xs font-medium text-gray-600">Rejection note (visible to RM)</span>
				<textarea
					bind:value={note}
					rows={4}
					placeholder="e.g. FOIR cap for self-employed looks wrong — policy says 55%, encoded as 50%. Please re-verify and resubmit."
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
				></textarea>
			</label>

			{#if errorMessage}
				<div class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--color-error)]">{errorMessage}</div>
			{/if}

			<div class="mt-4 flex justify-end gap-2">
				<button type="button" onclick={close} class="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
					<ArrowLeft size={14} /> Cancel
				</button>
				<button
					type="button"
					onclick={confirm}
					disabled={isSubmitting || !note.trim()}
					class="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
				>
					{#if isSubmitting}
						<span class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Rejecting…
					{:else}
						Confirm rejection
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
