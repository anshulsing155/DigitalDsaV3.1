<script>
	let {
		heading = "",
		help = [],
		divideX = 2,
		divideY = 2,
		gridCol = 4
	} = $props();







</script>

<div class="flex flex-col py-[4rem] px-[0.5rem] lg:px-0 w-full text-black dark:text-white">
  <h2
    class="typography-h2 text-black dark:text-white"
  >
    {heading}
  </h2>
  <div
    class=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-{gridCol} gap-2 md:gap-5 divide-x-0 divide-y-{divideY} sm:divide-x-{divideX} sm:divide-y-0"
  >
    {#each help as item}
      <a href={item.link} class="text-black dark:text-white">
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
                <h2 class="typography-body-lg !font-semibold text-black dark:text-white">
                  {@html item.Heading}
                </h2>
              {:else}
                <h2 class="typography-body-lg !font-semibold text-black dark:text-white">{item.Heading}</h2>
              {/if}
            {/if}
            {#if item.paragraph}
              <p class="typography-body-md text-[var(--form-text-secondary)]">{item.paragraph}</p>
            {/if}
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
