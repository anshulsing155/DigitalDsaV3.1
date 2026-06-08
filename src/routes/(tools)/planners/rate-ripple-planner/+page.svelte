<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import RateRipplePlanner from '$lib/components/tools/planners/RateRipplePlanner.svelte';
</script>

<svelte:head>
	<title>Rate Ripple Planner — Interest Rate Change Impact | DigitalDSA</title>
	<meta
		name="description"
		content="Simulate interest rate changes, prepayments & EMI adjustments on your existing loan. Essential for Balance Transfer feasibility analysis."
	/>
</svelte:head>

<ToolPageShell
	title="Rate Ripple Planner"
	description="Simulate interest rate changes, prepayments & EMI adjustments on your existing loan."
	activeToolId="rate-ripple-planner"
	toolType="planner"
	variant="public"
>
	<RateRipplePlanner variant="public" />
</ToolPageShell>
