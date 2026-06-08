<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: any;
		title: string;
		count: number;
		description?: string;
		onclick?: () => void;
		children?: Snippet;
	}

	let { icon: Icon, title, count, description, onclick = () => {}, children }: Props = $props();
</script>

<button
	type="button"
	class="group flex w-full items-center gap-4 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 text-left shadow-sm transition-all hover:border-[var(--ddsa-primary-300)] hover:shadow-md active:scale-[0.98] md:p-5"
	{onclick}
	aria-label="{title}: {count} items"
>
	<!-- Icon in rounded container -->
	{#if Icon}
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
		>
				{#if typeof Icon === 'string'}
					<span class="text-xl">{Icon}</span>
				{:else}
					<Icon size={22} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
				{/if}
		</div>
	{/if}

	<!-- Content -->
	<div class="min-w-0 flex-1">
		<p class="text-xs font-medium text-[var(--dash-text-secondary)]">{title}</p>
		<p class="mt-0.5 text-2xl font-bold text-[var(--dash-text)]">{count}</p>
		{#if description}
			<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">{description}</p>
		{/if}
	</div>

	<!-- Arrow -->
	<ChevronRight
		size={18}
		strokeWidth={1.5}
		class="shrink-0 text-[var(--dash-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--dash-accent-text)]"
	/>

	{#if children}
		<div class="mt-2 border-t border-[var(--dash-border-light)] pt-2">
			{@render children()}
		</div>
	{/if}
</button>
