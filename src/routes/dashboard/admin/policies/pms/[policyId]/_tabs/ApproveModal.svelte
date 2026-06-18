<script lang="ts">
	import { CheckCircle, Calendar, Rocket, ArrowLeft } from 'lucide-svelte';

	let {
		isOpen = $bindable<boolean>(false),
		onApprove
	}: {
		isOpen: boolean;
		onApprove: (scheduledPublishAt: string | null) => Promise<{ ok: boolean; error?: string }>;
	} = $props();

	let mode = $state<'now' | 'scheduled'>('now');
	let scheduleDate = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Default schedule date: tomorrow 10 AM
	$effect(() => {
		if (isOpen && !scheduleDate) {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			d.setHours(10, 0, 0, 0);
			scheduleDate = d.toISOString().slice(0, 16);
		}
	});

	function close() {
		isOpen = false;
		errorMessage = '';
	}

	async function confirm() {
		isSubmitting = true;
		errorMessage = '';
		const scheduled = mode === 'scheduled' ? new Date(scheduleDate).toISOString() : null;
		const result = await onApprove(scheduled);
		isSubmitting = false;
		if (!result.ok) {
			errorMessage = result.error ?? 'Approval failed.';
			return;
		}
		close();
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
		<div role="dialog" aria-modal="true" aria-label="Approve policy" class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
					<CheckCircle size={20} class="text-green-600" />
				</div>
				<div>
					<h3 class="text-base font-semibold text-gray-900">Approve policy</h3>
					<p class="text-xs text-gray-500">Choose publish timing.</p>
				</div>
			</div>

			<!-- Mode toggle -->
			<div class="mb-4 space-y-2">
				<label class="flex cursor-pointer items-start gap-3 rounded-lg border {mode === 'now' ? 'border-green-300 bg-green-50' : 'border-gray-200'} p-3">
					<input type="radio" bind:group={mode} value="now" class="mt-1" />
					<div class="flex-1">
						<div class="flex items-center gap-1.5 text-sm font-medium text-gray-800">
							<Rocket size={13} /> Approve & publish now
						</div>
						<p class="mt-0.5 text-xs text-gray-500">Policy goes live immediately. DSAs see the new values on their next evaluation.</p>
					</div>
				</label>
				<label class="flex cursor-pointer items-start gap-3 rounded-lg border {mode === 'scheduled' ? 'border-amber-300 bg-amber-50' : 'border-gray-200'} p-3">
					<input type="radio" bind:group={mode} value="scheduled" class="mt-1" />
					<div class="flex-1">
						<div class="flex items-center gap-1.5 text-sm font-medium text-gray-800">
							<Calendar size={13} /> Approve & schedule
						</div>
						<p class="mt-0.5 text-xs text-gray-500">Policy stays in approved_scheduled until the publish date. Cron publishes automatically.</p>
						{#if mode === 'scheduled'}
							<input
								type="datetime-local"
								bind:value={scheduleDate}
								class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
							/>
						{/if}
					</div>
				</label>
			</div>

			{#if errorMessage}
				<div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--color-error)]">{errorMessage}</div>
			{/if}

			<div class="flex justify-end gap-2">
				<button type="button" onclick={close} class="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
					<ArrowLeft size={14} /> Cancel
				</button>
				<button
					type="button"
					onclick={confirm}
					disabled={isSubmitting || (mode === 'scheduled' && !scheduleDate)}
					class="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
				>
					{#if isSubmitting}
						<span class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Approving…
					{:else}
						Confirm approval
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
