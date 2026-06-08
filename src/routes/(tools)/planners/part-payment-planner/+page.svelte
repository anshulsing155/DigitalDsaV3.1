<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<svelte:head>
	<title>Part-Payment Planner — Save Lakhs in Interest | DigitalDSA</title>
	<meta
		name="description"
		content="Plan part-payments on your loan to reduce tenure or EMI. See exactly how much interest you can save."
	/>
</svelte:head>

<ToolPageShell
	title="Part-Payment Planner"
	description="Plan part-payments to reduce your loan tenure or EMI."
	activeToolId="part-payment-planner"
	toolType="planner"
	variant="public"
>
	<LoanPlanner config={PUBLIC_CONFIG} plannerMode="part-payment" />
</ToolPageShell>
