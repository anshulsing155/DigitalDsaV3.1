<script lang="ts">
	import PolicyCaptureWizard from '$lib/components/policy-capture/PolicyCaptureWizard.svelte';

	let { data } = $props();
	const capture = $derived(data.capture);

	const SECURED_PRODUCT_PREFIXES = ['HL_', 'LAP_', 'PLOT_', 'BL_SECURED'];
	const isSecured = $derived(
		SECURED_PRODUCT_PREFIXES.some((prefix) => capture.product_type.startsWith(prefix))
	);

	const CHANNEL_LABELS: Record<string, string> = {
		whatsapp: 'WhatsApp',
		email: 'Email',
		fax: 'Fax',
		phone: 'Phone call',
		in_person: 'In-person'
	};

	const bannerText = $derived(
		`Capturing on behalf of: ${capture.rm_name} · ${capture.lender_name}` +
			(capture.arrival_channel
				? ` · source: ${CHANNEL_LABELS[capture.arrival_channel] || capture.arrival_channel}`
				: '')
	);
</script>

<svelte:head>
	<title>Admin: Proxy Policy Capture | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6">
		<a href="/dashboard/admin/policies" class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]">
			Back to Policies
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
		apiBase="/api/admin/policies/proxy-capture"
		{bannerText}
		submitLabel="Submit on behalf of RM"
	/>
</div>
