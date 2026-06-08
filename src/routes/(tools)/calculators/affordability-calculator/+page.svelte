<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import SmartCalculator from '$lib/components/tools/calculators/SmartCalculator.svelte';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<svelte:head>
	<title>Property Affordability Calculator — What Can You Afford? | DigitalDSA</title>
	<meta
		name="description"
		content="Find the maximum property you can afford. Visual comfort zone shows your range — from studios to villas. Includes personal loan bridge option."
	/>
</svelte:head>

<ToolPageShell
	title="Affordability Calculator"
	description="See what property you can afford — your financial comfort zone, visualized."
	activeToolId="affordability-calculator"
	toolType="calculator"
	variant="public"
>
	<SmartCalculator config={PUBLIC_CONFIG} />
</ToolPageShell>
