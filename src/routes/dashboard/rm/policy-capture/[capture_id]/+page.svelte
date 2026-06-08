<script lang="ts">
	import { ROUTES } from '$lib/config/routes.js';
	import PolicyCaptureWizard from '$lib/components/policy-capture/PolicyCaptureWizard.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	const capture = $derived(data.capture);

	// Determine if this is a secured loan (property rules applicable)
	const SECURED_PRODUCT_PREFIXES = ['HL_', 'LAP_', 'PLOT_', 'BL_SECURED'];
	const isSecured = $derived(
		SECURED_PRODUCT_PREFIXES.some((prefix) => capture.product_type.startsWith(prefix))
	);

	// ── A.2 Slice 3 — proxy confirmation ──────────────────────────────
	const CHANNEL_LABELS: Record<string, string> = {
		whatsapp: 'WhatsApp',
		email: 'Email',
		fax: 'Fax',
		phone: 'a phone call',
		in_person: 'in person'
	};

	const isUnconfirmedProxy = $derived(
		capture.provenance?.source_type === 'admin_manual_proxy'
	);
	const isConfirmedProxy = $derived(capture.provenance?.source_type === 'rm_confirmed');

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	let confirming = $state(false);
	let confirmError = $state('');

	async function confirmProxy() {
		if (confirming) return;
		confirming = true;
		confirmError = '';
		try {
			const res = await secureFetch(
				`/api/rm/policy-captures/${capture.capture_id}/confirm-proxy`,
				{ method: 'POST' }
			);
			const result = await res.json();
			if (result.success) {
				await invalidateAll();
			} else {
				confirmError = result.error || 'Failed to confirm';
			}
		} catch {
			confirmError = 'Network error — please try again';
		} finally {
			confirming = false;
		}
	}
</script>

<svelte:head>
	<title>RM: Policy Capture Detail | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6">
		<a href={ROUTES.DASHBOARD.RM.POLICY_CAPTURE} class="text-sm text-gray-500 hover:text-gray-700">
			Back to Policy Capture
		</a>
	</div>

	{#if isUnconfirmedProxy}
		<!-- A.2 Slice 3 — admin captured this on the RM's behalf; offer confirmation. -->
		<div
			class="mb-6 rounded-xl border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] p-5"
		>
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">Entered by an admin on your behalf</h2>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				A DigitalDSA admin keyed in this {capture.lender_name} policy{capture.provenance
					?.arrival_channel
					? ` from ${CHANNEL_LABELS[capture.provenance.arrival_channel] || capture.provenance.arrival_channel}`
					: ''}{capture.provenance?.captured_at
					? ` on ${formatDate(capture.provenance.captured_at)}`
					: ''}. Please review the details below and confirm they're correct.
			</p>
			{#if capture.provenance?.reference_note}
				<p class="mt-2 text-xs text-[var(--dash-text-muted)] italic">
					Reference: {capture.provenance.reference_note}
				</p>
			{/if}
			{#if confirmError}
				<p class="mt-2 text-xs text-[var(--dash-contrast-text)]">{confirmError}</p>
			{/if}
			<button
				onclick={confirmProxy}
				disabled={confirming}
				class="mt-4 rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105 disabled:opacity-50"
			>
				{confirming ? 'Confirming…' : 'Confirm these details'}
			</button>
		</div>
	{:else if isConfirmedProxy}
		<div
			class="mb-6 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-4 text-sm text-[var(--dash-text-secondary)]"
		>
			✓ You confirmed this admin-entered policy{capture.provenance?.confirmed_at
				? ` on ${formatDate(capture.provenance.confirmed_at)}`
				: ''}.
		</div>
	{/if}

	<PolicyCaptureWizard
		captureId={capture.capture_id}
		productType={capture.product_type}
		lenderName={capture.lender_name}
		productTypeLabel={capture.product_type_label}
		status={capture.status}
		initialStep={capture.current_step}
		completedSteps={capture.completed_steps}
		data={capture.data}
		unknownFields={capture.unknown_fields}
		{isSecured}
	/>
</div>
