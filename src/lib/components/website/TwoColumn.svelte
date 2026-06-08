<script>
	let {
		columnsData = {},
		cardImage,
		cardAltName,
		cardHeading,
		sourceName,
		originalSource,
		reverse = false,
		imageHeight = 4
	} = $props();


  import Tooltip from "./Tooltip.svelte";

  //;

// Default: left div is on the left

</script>

<div
  class="relative grid items-start gap-[3rem] lg:grid-cols-2 lg:gap-0 py-[4rem]"
>
  <!-- Left div (Image) -->
  <div
    class="top-0 w-full transform lg:relative"
    class:lg:order-last={reverse}
    class:lg:translate-x-[8rem]={reverse}
    class:lg:-translate-x-[8rem]={!reverse}
  >
    <div class="relative">
      <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
        <Tooltip
          linkName={`image source: <span class="underline">${sourceName}</span>`}
          hoverLink={originalSource}
        />
      </div>
      <img
        src={cardImage}
        alt={cardAltName}
        class=" w-full object-cover object-top h-[35svh] lg:h-full"
        style="aspect-ratio: 5 / {imageHeight};"
      />
    </div>
  </div>
  <!-- Right div (Content) -->
  <div
    class="flex flex-col gap-[2.5rem] justify-self-start"
    class:lg:order-first={reverse}
  >
    {#if cardHeading}
      <h3
        class="md:text-start typography-h2-md text-black dark:text-white"
      >
        {@html cardHeading}
      </h3>
    {/if}
    <slot name="list" />
    <slot></slot>
  </div>
</div>
