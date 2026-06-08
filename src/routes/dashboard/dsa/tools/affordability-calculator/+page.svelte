<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import SmartCalculator from '$lib/components/tools/calculators/SmartCalculator.svelte';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<ToolPageShell
	title="Eligibility & Affordability"
	description="Toggle between eligibility and affordability — with what-if insights for your clients."
	activeToolId="affordability-calculator"
	toolType="calculator"
	variant="dashboard"
>
	<SmartCalculator config={DASHBOARD_CONFIG} />
</ToolPageShell>
