<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="bg-trial-accent mt-[1rem] rounded p-4 font-titleMedium text-white">
	{#if children}
		{@render children()}
	{/if}
</div>
