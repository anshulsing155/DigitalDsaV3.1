<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import StampDutyCalculator from '$lib/components/tools/calculators/StampDutyCalculator.svelte';
</script>

<svelte:head>
	<title>Stamp Duty Calculator — Calculate Property Registration Charges | DigitalDSA</title>
	<meta
		name="description"
		content="Calculate stamp duty and registration charges for property purchase in any Indian state. Gender-based concessions included."
	/>
</svelte:head>

<ToolPageShell
	title="Stamp Duty Calculator"
	description="Calculate stamp duty and registration charges for any property in India based on state, property value, and buyer profile."
	activeToolId="stamp-duty-calculator"
	toolType="calculator"
	variant="public"
>
	<StampDutyCalculator variant="public" />
</ToolPageShell>
