<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<svelte:head>
	<title>Combined Loan Planner — All Strategies in One Place | DigitalDSA</title>
	<meta
		name="description"
		content="The most powerful loan planner. Combine part-payments, EMI step-ups, moratoriums, and rate changes in a single simulation."
	/>
</svelte:head>

<ToolPageShell
	title="Loan Repayment Planner"
	description="Combine all strategies — part-payments, EMI changes, moratoriums, rate changes — in one simulation."
	activeToolId="both"
	toolType="planner"
	variant="public"
>
	<LoanPlanner config={PUBLIC_CONFIG} />
</ToolPageShell>
