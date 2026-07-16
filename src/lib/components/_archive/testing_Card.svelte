<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-md {className}">
	{@render children?.()}
</div>
