<script>
	let {
		supportHeading = "",
		supportpara = "",
		colSpan = 1,
		colSpanText = 2
	} = $props();



  //s


</script>

<section class="grid lg:grid-cols-3 gap-[2rem] items-start pt-[4rem] pb-[8rem]">
  <div class="lg:col-span-{colSpan} grid gap-4">
    {#if supportHeading}
      <p
        class="typography-h3 font-semibold md:text-start md:typography-h2-md lg:typography-h2"
      >
        {supportHeading}
      </p>
    {/if}
    <!-- svelte-ignore slot_element_deprecated -->
    <slot name="para" />
  </div>

  <div
    class="lg:col-span-{colSpanText} grid md:gap-[2rem] typography-body-md text-text-light justify-self-end"
  >
    <!-- svelte-ignore slot_element_deprecated -->
    <slot />
  </div>
</section>
