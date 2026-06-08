<script lang="ts">
	import ToolPageShell from '$lib/components/tools/shared/ToolPageShell.svelte';
	import RateRipplePlanner from '$lib/components/tools/planners/RateRipplePlanner.svelte';
</script>

<ToolPageShell
	title="Rate Ripple Planner"
	description="Show your clients the exact impact of rate changes, prepayments & EMI adjustments."
	activeToolId="rate-ripple-planner"
	toolType="planner"
	variant="dashboard"
>
	<RateRipplePlanner variant="dashboard" />
</ToolPageShell>
