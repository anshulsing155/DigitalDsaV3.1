<script lang="ts">
	/**
	 * Public Tools Layout — Minimal wrapper for calculator and planner pages.
	 *
	 * This layout is used for the public-facing versions of tools
	 * (no authentication required). It inherits the root layout's
	 * global styles and simply renders the child content.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- Public tools pages get a clean, full-width layout -->
<div class="min-h-screen bg-[var(--ddsa-secondary-50)]">
	{@render children()}
</div>
