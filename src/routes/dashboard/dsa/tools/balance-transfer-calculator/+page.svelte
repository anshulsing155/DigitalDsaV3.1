<script lang="ts">
	/**
	 * Dashboard Balance Transfer Calculator Page
	 *
	 * Authenticated version inside the DSA dashboard.
	 * Has additional features like "Create Case" button.
	 */
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import BalanceTransferCalculator from '$lib/components/tools/calculators/BalanceTransferCalculator.svelte';
</script>

<ToolPageShell
	title="Balance Transfer Calculator"
	description="Show your clients the savings from a balance transfer — a powerful tool for BT lead conversion."
	activeToolId="balance-transfer-calculator"
	toolType="calculator"
	variant="dashboard"
>
	<BalanceTransferCalculator variant="dashboard" />
</ToolPageShell>
