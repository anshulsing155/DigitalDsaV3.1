<script>
	let { contents = {}, children } = $props();
</script>

<div
	class="grid gap-4 px-[0.5rem] py-[2rem] text-[var(--form-text)] lg:grid-cols-5 lg:px-0 lg:pt-[4rem] lg:pb-[8rem]"
>
	{#if contents.heading}
		<h2 class="typography-h2-md text-[var(--form-text)] md:col-span-2">
			{contents.heading}
		</h2>
	{/if}

	<div class="typography-body-md text-[var(--form-text-secondary)] md:col-span-3">
		{@render children?.()}
	</div>
</div>
