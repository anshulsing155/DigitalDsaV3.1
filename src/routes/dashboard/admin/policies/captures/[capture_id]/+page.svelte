<script lang="ts">
	import PolicyCaptureWizard from '$lib/components/policy-capture/PolicyCaptureWizard.svelte';

	let { data } = $props();
	const capture = $derived(data.capture);

	const SECURED_PRODUCT_PREFIXES = ['HL_', 'LAP_', 'PLOT_', 'BL_SECURED'];
	const isSecured = $derived(
		SECURED_PRODUCT_PREFIXES.some((prefix) => capture.product_type.startsWith(prefix))
	);

	const PROVENANCE_LABELS: Record<string, string> = {
		rm_self: 'RM self-capture',
		admin_manual_proxy: 'Admin proxy · awaiting RM confirmation',
		rm_confirmed: 'RM-confirmed'
	};

	const bannerText = $derived(
		`Reviewing: ${capture.rm_name} · ${capture.lender_name} · ${PROVENANCE_LABELS[capture.provenance_source] || capture.provenance_source}`
	);
</script>

<svelte:head>
	<title>Admin: Review Policy Capture | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6">
		<a
			href="/dashboard/admin/policies/approvals"
			class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
		>
			Back to Approval Queue
		</a>
	</div>

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
		{bannerText}
	/>
</div>
