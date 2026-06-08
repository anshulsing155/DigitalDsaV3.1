<script lang="ts">
	/**
	 * Public Balance Transfer Calculator Page
	 *
	 * Publicly accessible version -- no authentication required.
	 * Designed for SEO and lead generation.
	 */
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import BalanceTransferCalculator from '$lib/components/tools/calculators/BalanceTransferCalculator.svelte';
</script>

<svelte:head>
	<title>Balance Transfer Calculator — Compare & Save on Your Loan | DigitalDSA</title>
	<meta
		name="description"
		content="Compare your current loan with new bank offers. See monthly EMI savings, total interest savings, and whether a balance transfer is worth it."
	/>
</svelte:head>

<ToolPageShell
	title="Balance Transfer Calculator"
	description="Compare your current loan with new bank offers to see how much you can save. Enter your current loan details and the new offer to get a complete savings analysis."
	activeToolId="balance-transfer-calculator"
	toolType="calculator"
	variant="public"
>
	<BalanceTransferCalculator variant="public" />
</ToolPageShell>
