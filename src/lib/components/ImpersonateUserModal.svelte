<script lang="ts">
	import { ShieldAlert } from '$lib/utils/iconRegistry';
	import { t } from '$lib/i18n';

	interface Props {
		/** Display name of the user to impersonate. Goes into the title copy. */
		targetName: string;
		/** Role label shown alongside the name ("DSA" / "RM"). */
		targetRole: 'dsa' | 'rm';
		/** Disable the Start button while the network call is in flight. */
		submitting?: boolean;
		/** Optional server error string to surface inline below the textarea. */
		errorMessage?: string;
		onConfirm: (reason: string) => void;
		onCancel: () => void;
	}

	let {
		targetName,
		targetRole,
		submitting = false,
		errorMessage = '',
		onConfirm,
		onCancel
	}: Props = $props();

	let reason = $state('');

	const roleLabel = $derived(targetRole === 'dsa' ? 'DSA' : 'RM');
	const canStart = $derived(reason.trim().length > 0 && !submitting);

	function handleSubmit() {
		const trimmed = reason.trim();
		if (!trimmed || submitting) return;
		onConfirm(trimmed);
	}

	function handleKeydown(event: KeyboardEvent) {
		// Pitfall #39: every dismissal path must invoke onCancel. Escape closes.
		if (event.key === 'Escape' && !submitting) {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-[100] flex items-center justify-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="impersonate-modal-title"
>
	<button
		type="button"
		class="absolute inset-0 cursor-default border-none bg-black/50"
		onclick={() => !submitting && onCancel()}
		aria-label="Cancel impersonation"
	></button>

	<div
		class="relative z-10 w-[92%] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-2xl"
	>
		<div class="mb-3 flex items-center gap-2">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
			>
				<ShieldAlert size={18} />
			</div>
			<h2 id="impersonate-modal-title" class="text-sectionHeadingText font-titleBold">
				{t('admin.impersonate_title', { name: `${targetName} (${roleLabel})` })}
			</h2>
		</div>

		<p class="inputText mt-3 text-[var(--form-text-secondary)]">
			{t('admin.impersonate_body')}
		</p>

		<label class="mt-4 block">
			<span class="inputText mb-1 block font-titleMedium text-[var(--form-text)]">
				{t('admin.impersonate_reason_label')}
			</span>
			<textarea
				bind:value={reason}
				placeholder={t('admin.impersonate_reason_placeholder')}
				rows="3"
				required
				disabled={submitting}
				class="inputText w-full rounded-lg border border-[var(--form-border)] bg-[var(--form-bg)] px-3 py-2 text-[var(--form-text)] focus:border-[var(--form-border-focus)] focus:outline-none disabled:opacity-60"
			></textarea>
		</label>

		{#if errorMessage}
			<p class="inputText mt-2 text-red-600 dark:text-red-400">
				{errorMessage}
			</p>
		{/if}

		<div class="mt-6 flex flex-col gap-2">
			<button
				onclick={handleSubmit}
				type="button"
				disabled={!canStart}
				class="gold-gradient buttonText flex w-full items-center justify-center rounded-lg px-5 py-3 font-titleMedium text-white shadow transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{submitting ? '…' : t('admin.impersonate_start_btn')}
			</button>
			<button
				onclick={onCancel}
				type="button"
				disabled={submitting}
				class="buttonText flex w-full items-center justify-center rounded-lg border border-[var(--form-border)] px-5 py-3 font-titleMedium text-[var(--form-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-60"
			>
				{t('common.cancel')}
			</button>
		</div>
	</div>
</div>
