<script>
	let {
		contents = {},
		children
	} = $props();


;
</script>

<div class="grid px-[0.5rem] lg:px-0 gap-4 py-[2rem] lg:pt-[4rem] lg:pb-[8rem] lg:grid-cols-5 text-[var(--form-text)]">
  {#if contents.heading}
    <h2
      class="typography-h2-md text-[var(--form-text)] md:col-span-2"
    >
      {contents.heading}
    </h2>
  {/if}

  <div class="md:col-span-3 typography-body-md text-[var(--form-text-secondary)]">
    {@render children?.()}
  </div>
</div>
