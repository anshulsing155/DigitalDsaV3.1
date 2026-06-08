<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<ToolPageShell
	title="Part-Payment Planner"
	description="Help your clients plan part-payments — show the interest savings impact."
	activeToolId="part-payment-planner"
	toolType="planner"
	variant="dashboard"
>
	<LoanPlanner config={DASHBOARD_CONFIG} plannerMode="part-payment" />
</ToolPageShell>
