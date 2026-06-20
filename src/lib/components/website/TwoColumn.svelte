<script>
	import Tooltip from './Tooltip.svelte';

	let {
		columnsData = {},
		cardImage = '',
		cardAltName = '',
		cardHeading = '',
		sourceName = '',
		originalSource = '',
		reverse = false,
		imageHeight = 4,
		isBorder = false
	} = $props();
</script>

<div class="relative grid items-start gap-[3rem] pt-[4rem] pb-[4rem] lg:pb-[8rem] lg:grid-cols-2 lg:gap-0 {isBorder ? 'border-b border-[var(--form-border)]' : ''}">
	<!-- Left div (Image) -->
	<div
		class="top-0 w-full transform lg:relative"
		class:lg:order-last={reverse}
		class:lg:translate-x-[8rem]={reverse}
		class:lg:-translate-x-[8rem]={!reverse}
	>
		<div class="relative">
			<div class="bg-opacity-50 absolute top-0 right-0 text-center text-white">
				<Tooltip
					linkName={`image source: <span class="underline underline-offset-4">${sourceName}</span>`}
					hoverLink={originalSource}
				/>
			</div>
			<img
				src={cardImage}
				alt={cardAltName}
				class=" h-[35svh] w-full object-cover object-top lg:h-full"
				style="aspect-ratio: 5 / {imageHeight};"
			/>
		</div>
	</div>
	<!-- Right div (Content) -->
	<div class="flex flex-col gap-[2.5rem] justify-self-start" class:lg:order-first={reverse}>
		{#if cardHeading}
			<h3 class="typography-h2-md text-[var(--form-text)] md:text-start">
				{@html cardHeading}
			</h3>
		{/if}
		<!-- svelte-ignore slot_element_deprecated -->
		<slot name="list" />
		<!-- svelte-ignore slot_element_deprecated -->
		<slot></slot>
	</div>
</div>
