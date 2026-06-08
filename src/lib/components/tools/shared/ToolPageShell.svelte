<script lang="ts">
	/**
	 * ToolPageShell — Layout wrapper for all calculator and planner pages.
	 *
	 * Provides consistent layout with:
	 * - Title and description header
	 * - Tool navigator tabs (switch between calculators or planners)
	 * - Responsive container (full-width mobile, constrained desktop)
	 * - Variant support (public vs dashboard contexts)
	 *
	 * Usage:
	 *   <ToolPageShell title="EMI Calculator" description="..." activeToolId="emi-calculator" toolType="calculator">
	 *     <YourCalculatorComponent />
	 *   </ToolPageShell>
	 */
	import { CALCULATOR_LIST, PLANNER_LIST } from '$lib/tools/constants.js';
	import type { ToolInfo } from '$lib/tools/types.js';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';

	// --- Component Props ---
	interface Props {
		/** Page title displayed at the top */
		title: string;

		/** Short description below the title */
		description?: string;

		/** Which tool is currently active (for highlighting the active tab) */
		activeToolId: string;

		/** Are we showing calculators or planners? (determines which tabs to show) */
		toolType: 'calculator' | 'planner';

		/** Public page or dashboard page — affects layout and available actions */
		variant?: 'public' | 'dashboard';

		/** The main content of the page (passed as a Svelte 5 snippet) */
		children: Snippet;
	}

	let {
		title,
		description = '',
		activeToolId,
		toolType,
		variant = 'public',
		children
	}: Props = $props();

	// --- Determine which tool list to show as navigation tabs ---
	let toolList = $derived<ToolInfo[]>(toolType === 'calculator' ? CALCULATOR_LIST : PLANNER_LIST);

	// --- Navigate to a different tool when a tab is clicked ---
	function navigateToTool(tool: ToolInfo) {
		const targetRoute = variant === 'dashboard' ? tool.dashboardRoute : tool.publicRoute;
		goto(targetRoute);
	}
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
	<!-- === Header Section === -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-[var(--ddsa-secondary)] sm:text-3xl">
			{title}
		</h1>
		{#if description}
			<p class="mt-2 text-sm text-[var(--ddsa-secondary-500)] sm:text-base">
				{description}
			</p>
		{/if}
	</div>

	<!-- === Tool Navigation Tabs === -->
	<!-- Horizontal scrollable tabs showing all tools of the same type -->
	<div class="mb-6 overflow-x-auto">
		<div class="flex min-w-max gap-1 rounded-xl bg-[var(--ddsa-secondary-50)] p-1">
			{#each toolList as tool (tool.id)}
				<button
					type="button"
					onclick={() => navigateToTool(tool)}
					class="rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200
						{activeToolId === tool.id
						? 'bg-[var(--ddsa-secondary)] text-white shadow-sm'
						: 'text-[var(--ddsa-secondary-600)] hover:bg-[var(--ddsa-secondary-100)] hover:text-[var(--ddsa-secondary-800)]'}"
				>
					{tool.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- === Main Content Area === -->
	<!-- The calculator or planner component is rendered here via the children snippet -->
	<div class="card-surface p-4 sm:p-6 lg:p-8">
		{@render children()}
	</div>
</div>
