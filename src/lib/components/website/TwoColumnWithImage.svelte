<script lang="ts">
	import Tooltip from './Tooltip.svelte';

	type Props = {
		contents?: {
			cardImage?: string;
			cardAltName?: string;
			cardHeading?: string;
			sourceName?: string;
			originalSource?: string;
			reverse?: boolean;
		};
		isBorder?: boolean;
		paddingClass?: string;
		children?: import('svelte').Snippet;
	};

	const {
		contents = {
			cardImage: '',
			cardAltName: '',
			cardHeading: '',
			sourceName: '',
			originalSource: '',
			reverse: false
		},
		isBorder = false,
		paddingClass = 'lg:px-16',
		children
	}: Props = $props();
</script>

<div
	class="relative grid items-start gap-8 space-x-20 {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''} px-2 py-16 md:gap-12 lg:grid-cols-2 {paddingClass} lg:py-0 lg:pt-16 lg:pb-32"
>
	<!-- Image -->
	<div
		class={`top-0 w-full transform lg:relative ${
			contents.reverse
				? 'lg:order-last lg:translate-x-[8rem]'
				: 'lg:order-first lg:-translate-x-[8rem]'
		}`}
	>
		<div class="relative">
			<div class="bg-opacity-50 absolute top-0 right-0 text-center text-white">
				<Tooltip
					linkName={`image source: <span class="underline underline-offset-4">${contents.sourceName}</span>`}
					hoverLink={contents.originalSource}
				/>
			</div>

			<img
				src={contents.cardImage}
				alt={contents.cardAltName}
				class="aspect-[5/3] h-60 w-full object-cover object-top lg:h-full"
			/>
		</div>
	</div>

	<!-- Content -->
	<div class="flex flex-col gap-2 justify-self-start" class:lg\:order-first={contents.reverse}>
		{#if contents.cardHeading}
			<h3 class="typography-h2-md mb-8 text-[var(--form-text)]">
				{@html contents.cardHeading}
			</h3>
		{/if}

		<div class="typography-body-md flex flex-col gap-4 text-[var(--form-text-secondary)]">
			{@render children?.()}
		</div>
	</div>
</div>
