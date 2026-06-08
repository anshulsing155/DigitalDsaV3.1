<script>
	let {
		contents = {}
	} = $props();


;
</script>

<div class="grid px-[0.5rem] lg:px-0 gap-4 py-[2rem] lg:pt-[4rem] lg:pb-[8rem] lg:grid-cols-5">
  {#if contents.heading}
    <h2
      class="font-ThirdHead text-mobSubHead md:col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
    >
      {contents.heading}
    </h2>
  {/if}

  <div class="md:col-span-3 font-Paragraph text-subParaFont">
    <slot />
  </div>
</div>
