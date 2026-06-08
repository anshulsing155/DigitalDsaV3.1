<script lang="ts">
	/**
	 * Public EMI Calculator Page
	 *
	 * This is the publicly accessible version of the EMI Calculator.
	 * No authentication required — designed for SEO and lead generation.
	 */
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import EmiCalculator from '$lib/components/tools/calculators/EmiCalculator.svelte';
</script>

<svelte:head>
	<title>EMI Calculator — Calculate Loan EMI Instantly | DigitalDSA</title>
	<meta
		name="description"
		content="Use our EMI Calculator to estimate your loan EMI. Enter loan amount, interest rate & tenure to get accurate monthly payments instantly."
	/>
</svelte:head>

<ToolPageShell
	title="EMI Calculator"
	description="Calculate your monthly EMI for any loan amount, interest rate, and tenure. See the full amortization schedule with principal and interest breakdown."
	activeToolId="emi-calculator"
	toolType="calculator"
	variant="public"
>
	<EmiCalculator variant="public" />
</ToolPageShell>
