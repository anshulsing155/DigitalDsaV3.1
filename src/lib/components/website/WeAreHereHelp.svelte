<script>
	let {
		heading = "",
		help = [],
		divideX = 2,
		divideY = 2,
		gridCol = 4
	} = $props();







</script>

<div class="flex flex-col py-[4rem] px-[0.5rem] lg:px-0 w-full  ">
  <h2
    class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
  >
    {heading}
  </h2>
  <div
    class=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-{gridCol} gap-2 md:gap-5 divide-x-0 divide-y-{divideY} sm:divide-x-{divideX} sm:divide-y-0"
  >
    {#each help as item}
      <a href={item.link} class="text-black">
        <div
          class="relative flex items-start justify-start gap-2 md:gap-5 py-[1.5rem] lg:py-[3rem]"
        >
          <img
            src={item.icon}
            alt={item.altTitle}
            class="relative z-10 -top-2 h-8"
          />
          <div class="flex flex-col gap-4">
            {#if item.Heading}
              {#if item.link}
                <h2 class="font-ThirdHead text-minSubHead">
                  {@html item.Heading}
                </h2>
              {:else}
                <h2 class="font-ThirdHead text-minSubHead">{item.Heading}</h2>
              {/if}
            {/if}
            {#if item.paragraph}
              <p class="font-Paragraph text-minParaFont">{item.paragraph}</p>
            {/if}
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
