<script>
	let {
		supportHeading = "",
		supportpara = "",
		colSpan = 1,
		colSpanText = 2
	} = $props();



  //s


</script>

<section class="grid lg:grid-cols-3 gap-[2rem] items-start pt-[4rem] pb-[8rem] ">
  <div class="lg:col-span-{colSpan} grid gap-4">
    {#if supportHeading}
      <p
        class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
      >
        {supportHeading}
      </p>
    {/if}
    <!-- svelte-ignore slot_element_deprecated -->
    <slot name="para" />
  </div>

  <div
    class="lg:col-span-{colSpanText} grid md:gap-[2rem] font-Paragraph text-subParaFont justify-self-end "
  >
    <!-- svelte-ignore slot_element_deprecated -->
    <slot />
  </div>
</section>
