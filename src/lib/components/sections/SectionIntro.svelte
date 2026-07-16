<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = {
		heading?: string;
		subHeading?: string;
		para?: string;
		isBorder?: boolean;
		containerClass?: string;
		children?: Snippet;
	};

	let {
		heading,
		subHeading,
		para,
		isBorder = false,
		containerClass = 'lg:px-16',
		children
	}: Props = $props();
</script>

<div
	class={`flex w-full flex-col gap-8 ${isBorder ? 'border-b border-[var(--form-border)]' : ''} px-[0.5rem] py-[4rem] text-[var(--form-text)]  lg:pt-[4rem] lg:pb-[8rem] ${containerClass}`}
>
	<p class="typography-h2-md text-[var(--form-text)]">
		{@html heading}
	</p>

	<div class="typography-body-md grid gap-4 text-[var(--form-text-secondary)]">
		<p class="!font-semibold">
			{@html subHeading}
		</p>

		<p>
			{@html para}
		</p>

		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
