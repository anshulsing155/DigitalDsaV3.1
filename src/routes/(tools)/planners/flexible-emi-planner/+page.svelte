<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<svelte:head>
	<title>Flexible EMI Planner — Step-Up, Step-Down & More | DigitalDSA</title>
	<meta
		name="description"
		content="Plan EMI changes over time. Simulate salary-linked step-ups, temporary relief, and multi-phase repayment strategies."
	/>
</svelte:head>

<ToolPageShell
	title="Flexible EMI Planner"
	description="Plan EMI step-ups, step-downs, and multi-phase strategies."
	activeToolId="flexible-emi-planner"
	toolType="planner"
	variant="public"
>
	<LoanPlanner config={PUBLIC_CONFIG} plannerMode="emi" />
</ToolPageShell>
