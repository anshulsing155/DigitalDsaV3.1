<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import SmartCalculator from '$lib/components/tools/calculators/SmartCalculator.svelte';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
</script>

<svelte:head>
	<title>Loan Eligibility Calculator — Check How Much Loan You Can Get | DigitalDSA</title>
	<meta
		name="description"
		content="Check your home loan eligibility instantly. See what property you can afford and get actionable insights to improve your loan capacity."
	/>
</svelte:head>

<ToolPageShell
	title="Eligibility Calculator"
	description="Find out how much loan you're eligible for — see your comfort zone instantly."
	activeToolId="eligibility-calculator"
	toolType="calculator"
	variant="public"
>
	<SmartCalculator config={PUBLIC_CONFIG} />
</ToolPageShell>
