<script lang="ts">
	/**
	 * Same-Company prompt — rendered at the form/+layout level so it gets its
	 * own browser top-layer slot ABOVE the per-applicant profile modal.
	 *
	 * Previous attempt (S104, commit 5eb3b798) rendered this dialog INSIDE
	 * IncomePageNew, nested within the profile modal's <dialog>. Even with
	 * `.showModal()` correctly entering top layer, some browser stacking
	 * edge cases left the inner dialog behind the parent, so users saw
	 * "Update Entry doing nothing" until they closed the profile modal.
	 *
	 * Promoting to layout-level keeps the dialog's DOM ancestor chain free
	 * of any other modal, so its top-layer entry is unambiguous.
	 */
	import { dialogState } from '$lib/state/dialog.svelte';
	import { focusTrap } from '$lib/utils/focusTrap';
	import { afterNavigate } from '$app/navigation';

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (dialogEl && dialogState.sameCompanyPrompt && !dialogEl.open) {
			dialogEl.showModal();
		} else if (dialogEl && !dialogState.sameCompanyPrompt && dialogEl.open) {
			dialogEl.close();
		}
	});

	// Route change = clear the prompt. Same architectural concern as
	// ConfirmModal (Pitfall #39): `dialogState.sameCompanyPrompt` is a
	// module-level singleton that persists across navigations unless we
	// explicitly clear it. We null the slot directly rather than calling
	// `handleDeny` because the parent IncomePageNew that owns the rich
	// prompt payload (pendingEntry / sourceApplicantIndex / sourceEntryId
	// / sourceSpecifics) may itself be unmounting during the same nav,
	// making its onDeny callback reference stale state. A nulled slot is
	// the safe state — the next time the user reaches the same flow they
	// get a fresh prompt.
	afterNavigate(() => {
		if (dialogState.sameCompanyPrompt) {
			dialogState.sameCompanyPrompt = null;
		}
	});

	function handleConfirm() {
		const prompt = dialogState.sameCompanyPrompt;
		if (!prompt) return;
		prompt.onConfirm();
		dialogState.sameCompanyPrompt = null;
	}

	function handleDeny() {
		const prompt = dialogState.sameCompanyPrompt;
		if (!prompt) return;
		prompt.onDeny();
		dialogState.sameCompanyPrompt = null;
	}

	function handleDialogClick(e: MouseEvent) {
		// Treat backdrop click (target === dialog itself) as deny — same
		// semantics as clicking "No, Different Company".
		if (e.target === dialogEl) handleDeny();
	}
</script>

{#if dialogState.sameCompanyPrompt}
	<dialog
		bind:this={dialogEl}
		class="same-company-dialog"
		aria-labelledby="same-company-prompt-title"
		onclick={handleDialogClick}
		oncancel={(e) => {
			e.preventDefault();
			handleDeny();
		}}
		use:focusTrap
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-6 shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3
				id="same-company-prompt-title"
				class="mb-2 font-titleBold text-base text-[var(--form-text)]"
			>
				Same Company?
			</h3>
			<p class="mb-3 font-paragraph text-sm leading-relaxed text-[var(--form-text-muted)]">
				<strong>{dialogState.sameCompanyPrompt.sourceApplicantName}</strong> already declared income
				from
				<strong>&quot;{dialogState.sameCompanyPrompt.entityName}&quot;</strong>. Is this the same
				company?
			</p>
			<p
				class="mb-4 rounded-lg bg-[var(--form-bg-alt)] p-3 font-paragraph text-xs text-[var(--form-text-muted)]"
			>
				If yes, company-level details (type, profitability, financials) will be synced
				automatically. Personal details (designation, salary, shareholding) remain independent for
				each person.
			</p>
			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={handleDeny}
					class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)]
						   px-4 py-2 font-titleMedium text-sm text-[var(--form-text)]
						   transition-colors hover:bg-[var(--form-hover)]"
				>
					No, Different Company
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="rounded-lg bg-[var(--trial-accent)] px-4 py-2 font-titleMedium
						   text-sm text-white transition-colors hover:opacity-90"
				>
					Yes, Same Company
				</button>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.same-company-dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: 100vw;
		max-height: 100vh;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.same-company-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
	}
	.same-company-dialog[open] {
		animation: same-company-fadeIn 0.18s ease-out;
	}
	@keyframes same-company-fadeIn {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
