<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import PolicyFieldReview from '$lib/components/policy/PolicyFieldReview.svelte';
	import type { FieldValidation } from '$lib/components/policy/PolicyFieldReview.svelte';
	import { POLICY_FIELD_LABELS } from '$lib/types/policyEngine.js';
	import type { PolicyFieldKey } from '$lib/types/policyEngine.js';

	let { data } = $props();

	let action = $state<'approve' | 'request_corrections' | null>(null);
	let comment = $state('');
	let notes = $state('');
	let isSubmitting = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	// Field validation state from the review component
	let fieldValidations = $state<Record<string, FieldValidation>>({});
	let reviewComponent = $state<PolicyFieldReview>();

	function onValidationChange(v: Record<string, FieldValidation>) {
		fieldValidations = v;
	}

	// Derived counts
	const totalFields = $derived(Object.keys(fieldValidations).length);
	const verifiedCount = $derived(
		Object.values(fieldValidations).filter((v) => v.status !== 'pending').length
	);
	const allCorrect = $derived(
		totalFields > 0 && Object.values(fieldValidations).every((v) => v.status === 'correct')
	);
	const hasWrongFields = $derived(
		Object.values(fieldValidations).some((v) => v.status === 'wrong')
	);
	const hasPendingFields = $derived(
		Object.values(fieldValidations).some((v) => v.status === 'pending')
	);

	// Build correction summary from wrong fields
	const wrongFieldSummary = $derived(() => {
		const wrongEntries = Object.entries(fieldValidations).filter(([, v]) => v.status === 'wrong');
		if (wrongEntries.length === 0) return '';
		return wrongEntries
			.map(([key, v]) => {
				const label = POLICY_FIELD_LABELS[key as PolicyFieldKey] || key;
				return v.note ? `- ${label}: ${v.note}` : `- ${label}: Marked as incorrect`;
			})
			.join('\n');
	});

	async function handleSubmit() {
		if (!action) {
			errorMsg = 'Please select an action';
			return;
		}

		// Validation rules
		if (action === 'approve') {
			if (hasPendingFields) {
				errorMsg = `Please review all fields before approving. ${totalFields - verifiedCount} field(s) still pending.`;
				return;
			}
			if (hasWrongFields) {
				errorMsg =
					'Cannot approve — some fields are marked as wrong. Use "Request Corrections" instead.';
				return;
			}
		}

		if (action === 'request_corrections') {
			if (!hasWrongFields && comment.trim().length < 5) {
				errorMsg =
					'Mark at least one field as wrong, or provide a correction comment (min 5 characters).';
				return;
			}
			// If wrong fields exist but no notes, that's OK — the summary will be auto-generated
		}

		isSubmitting = true;
		errorMsg = '';

		// Build the field_validations payload (only non-pending)
		const validationPayload: Record<string, { status: 'correct' | 'wrong'; note?: string }> = {};
		for (const [key, v] of Object.entries(fieldValidations)) {
			if (v.status === 'pending') continue;
			validationPayload[key] = {
				status: v.status as 'correct' | 'wrong',
				note: v.note || undefined
			};
		}

		// For corrections, auto-build comment from wrong fields if user didn't write one
		let finalComment = comment.trim();
		if (action === 'request_corrections' && !finalComment && hasWrongFields) {
			finalComment = `Fields marked for correction:\n${wrongFieldSummary()}`;
		}

		try {
			const res = await secureFetch(`/api/rm/review/${data.version._id}/respond`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					comment: action === 'request_corrections' ? finalComment : undefined,
					notes: action === 'approve' ? notes.trim() || undefined : undefined,
					field_validations: validationPayload
				})
			});
			const result = await res.json();
			if (!result.success) {
				errorMsg = result.error || 'Failed to submit response';
				return;
			}
			successMsg =
				action === 'approve'
					? 'Policy approved and sent for final admin review.'
					: 'Corrections requested. Admin will review your feedback.';
		} catch {
			errorMsg = 'Network error — please try again';
		} finally {
			isSubmitting = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Auto-select action based on field validations
	$effect(() => {
		if (hasWrongFields && action === 'approve') {
			action = 'request_corrections';
		}
	});
</script>

<svelte:head>
	<title>RM: Policy Review | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/dashboard/rm"
			class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--ddsa-accent-500)]"
		>
			&larr; Back to Dashboard
		</a>
		<h1 class="mt-2 text-2xl font-bold text-[var(--dash-text-primary)]">Review Policy</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Verify each field, then approve or request corrections.
		</p>
	</div>

	{#if successMsg}
		<div
			class="rounded-xl border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] p-5"
		>
			<div class="flex items-center gap-3">
				<svg
					class="h-5 w-5 text-[var(--dash-accent-text)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
				</svg>
				<p class="text-sm font-medium text-[var(--dash-accent-text)]">{successMsg}</p>
			</div>
			<button
				onclick={() => goto('/dashboard/rm')}
				class="mt-3 text-sm font-medium text-[var(--dash-accent-text)] underline hover:no-underline"
			>
				Return to Dashboard
			</button>
		</div>
	{:else}
		<!-- Interactive Policy Field Review -->
		<PolicyFieldReview
			bind:this={reviewComponent}
			policyFields={data.version.policy_fields}
			lenderName={data.lender_name}
			productLabel={data.product_label}
			variationLabel={data.variation_label}
			geoLabel={data.geo_label}
			versionNumber={data.version.version_number}
			effectiveFrom={data.version.created_at}
			sourceType={data.version.provenance?.source_type}
			onvalidationchange={onValidationChange}
		/>

		<!-- Previous Comments -->
		{#if data.comments.length > 0}
			<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5">
				<h2 class="text-sm font-semibold text-[var(--dash-text-primary)]">Previous Comments</h2>
				<div class="mt-3 space-y-2">
					{#each data.comments as c}
						<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-[var(--dash-text-primary)]">
									{c.author_name}
									<span class="font-normal text-[var(--dash-text-muted)]">({c.author_role})</span>
								</span>
								<span class="text-xs text-[var(--dash-text-muted)]">{formatDate(c.created_at)}</span
								>
							</div>
							<p class="mt-1 text-sm whitespace-pre-wrap text-[var(--dash-text-secondary)]">
								{c.text}
							</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Error Message -->
		{#if errorMsg}
			<div
				class="rounded-xl border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
			>
				{errorMsg}
			</div>
		{/if}

		<!-- Action Panel -->
		<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5">
			<h2 class="text-sm font-semibold text-[var(--dash-text-primary)]">Your Response</h2>

			<!-- Verification summary -->
			{#if totalFields > 0}
				<div
					class="mt-3 flex items-center gap-4 rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2.5 text-xs"
				>
					<span class="text-[var(--dash-text-muted)]">
						{verifiedCount}/{totalFields} fields reviewed
					</span>
					{#if allCorrect}
						<span class="font-medium text-[var(--dash-accent-text)]"
							>All fields correct — ready to approve</span
						>
					{:else if hasWrongFields}
						<span class="font-medium text-[var(--dash-contrast-text)]">
							{Object.values(fieldValidations).filter((v) => v.status === 'wrong').length} field(s) marked
							wrong
						</span>
					{:else if hasPendingFields}
						<span class="text-[var(--dash-text-muted)]">Review all fields to proceed</span>
					{/if}
				</div>
			{/if}

			<div class="mt-4 flex gap-3">
				<button
					onclick={() => (action = 'approve')}
					disabled={hasWrongFields}
					class="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40
						{action === 'approve'
						? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] ring-2 ring-[var(--dash-btn-ghost-border)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Approve Policy
				</button>
				<button
					onclick={() => (action = 'request_corrections')}
					class="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors
						{action === 'request_corrections'
						? 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] ring-2 ring-[var(--dash-contrast-ghost-border)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Request Corrections
				</button>
			</div>

			{#if action === 'approve'}
				<div class="mt-4">
					<label for="notes" class="block text-sm font-medium text-[var(--dash-text-secondary)]">
						Notes (optional)
					</label>
					<textarea
						id="notes"
						bind:value={notes}
						rows="3"
						placeholder="Any additional notes or confirmation details..."
						class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] outline-none focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20"
					></textarea>
				</div>
			{/if}

			{#if action === 'request_corrections'}
				<div class="mt-4">
					<label for="comment" class="block text-sm font-medium text-[var(--dash-text-secondary)]">
						Additional comments
						{#if !hasWrongFields}
							<span class="text-[var(--dash-contrast-text)]">*</span>
						{/if}
					</label>
					{#if hasWrongFields}
						<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
							A correction summary will be auto-generated from the fields you marked as wrong. Add
							extra context below if needed.
						</p>
					{/if}
					<textarea
						id="comment"
						bind:value={comment}
						rows="4"
						placeholder={hasWrongFields
							? 'Optional: add extra context beyond the field-level notes...'
							: "Describe what's incorrect or missing. Be specific about rates, conditions, or other details..."}
						class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] outline-none focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20"
					></textarea>
					{#if !hasWrongFields}
						<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
							{comment.length} characters (min 5)
						</p>
					{/if}
				</div>
			{/if}

			{#if action}
				<div class="mt-4 border-t border-[var(--dash-border)] pt-4">
					<button
						onclick={handleSubmit}
						disabled={isSubmitting}
						class="rounded-lg px-6 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors disabled:opacity-50
							{action === 'approve'
							? 'bg-[var(--dash-btn-bg)] hover:brightness-105'
							: 'bg-[var(--dash-btn-bg)] hover:brightness-105'}"
					>
						{isSubmitting
							? 'Submitting...'
							: action === 'approve'
								? 'Confirm Approval'
								: 'Submit Correction Request'}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
