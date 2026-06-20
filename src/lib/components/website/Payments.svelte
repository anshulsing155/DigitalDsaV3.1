<script>
	let {
		supportHeading = '',
		supportpara = '',
		colSpan = 1,
		colSpanText = 2,
		isBorder = false
	} = $props();
</script>

<section
	class="grid items-start gap-[2rem] pt-[4rem] pb-4 lg:pb-[8rem] lg:grid-cols-3 {isBorder
		? 'border-[var(--form-border)] border-b'
		: ''}"
>
	<div class="lg:col-span-{colSpan} grid gap-4">
		{#if supportHeading}
			<p class="typography-h2-md text-[var(--form-text)] md:text-start">
				{supportHeading}
			</p>
		{/if}
		<!-- svelte-ignore slot_element_deprecated -->
		<slot name="para" />
	</div>

	<div
		class="lg:col-span-{colSpanText} typography-body-md grid justify-self-end text-[var(--form-text-secondary)] md:gap-[2rem]"
	>
		<!-- svelte-ignore slot_element_deprecated -->
		<slot />
	</div>
</section>
