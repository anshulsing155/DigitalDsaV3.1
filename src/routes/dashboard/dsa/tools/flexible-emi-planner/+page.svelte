<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import LoanPlanner from '$lib/components/tools/planners/LoanPlanner.svelte';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<ToolPageShell
	title="Flexible EMI Planner"
	description="Show your clients flexible EMI strategies with real impact numbers."
	activeToolId="flexible-emi-planner"
	toolType="planner"
	variant="dashboard"
>
	<LoanPlanner config={DASHBOARD_CONFIG} plannerMode="emi" />
</ToolPageShell>
