<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import StampDutyCalculator from '$lib/components/tools/calculators/StampDutyCalculator.svelte';
</script>

<ToolPageShell
	title="Stamp Duty Calculator"
	description="Calculate stamp duty and registration charges to help your clients budget for property purchase."
	activeToolId="stamp-duty-calculator"
	toolType="calculator"
	variant="dashboard"
>
	<StampDutyCalculator variant="dashboard" />
</ToolPageShell>
