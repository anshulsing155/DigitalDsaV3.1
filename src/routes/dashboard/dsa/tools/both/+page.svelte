<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<ToolPageShell
	title="Loan Repayment Planner"
	description="The ultimate planning tool — combine all strategies and show your clients the best path to loan freedom."
	activeToolId="both"
	toolType="planner"
	variant="dashboard"
>
	<LoanPlanner config={DASHBOARD_CONFIG} />
</ToolPageShell>
