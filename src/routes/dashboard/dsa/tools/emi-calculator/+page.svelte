<script lang="ts">
	/**
	 * Dashboard EMI Calculator Page
	 *
	 * This is the authenticated version inside the DSA dashboard.
	 * Has additional features like "Create Case" button.
	 */
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import EmiCalculator from '$lib/components/tools/calculators/EmiCalculator.svelte';
</script>

<ToolPageShell
	title="EMI Calculator"
	description="Calculate EMI for any loan — use the results to guide your client conversations."
	activeToolId="emi-calculator"
	toolType="calculator"
	variant="dashboard"
>
	<EmiCalculator variant="dashboard" />
</ToolPageShell>
