<script>
	let {
		contents = {
    cardImage: "",
    cardAltName: "",    
    cardHeading: "",
    sourceName:"",
    originalSource:"",
    reverse: false,
    // imageHeight: 4,
  }
	} = $props();


  import Tooltip from "./Tooltip.svelte";

;
</script>

<div
  class="relative grid items-start gap-[2rem] md:gap-[3rem] lg:grid-cols-2 lg:gap-0 py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)] text-black dark:text-white"
>
  <!-- Left div (Image) -->
  <div
    class="top-0 w-full transform lg:relative"
    class:lg:order-last={contents.reverse}
    class:lg:translate-x-[8rem]={contents.reverse}
    class:lg:-translate-x-[8rem]={!contents.reverse}
  >
    <div class="relative">
      <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
        <Tooltip
          linkName={`image source: <span class="underline">${contents.sourceName}</span>`}
          hoverLink={contents.originalSource}
        />
      </div>
      <img
        src={contents.cardImage}
        alt={contents.cardAltName}
        class="aspect-[5/3] w-full object-cover object-top h-[15rem] lg:h-full"
      />
    </div>
  </div>
  <!-- Right div (Content) -->
  <div
    class="flex flex-col gap-[2.5rem] justify-self-start"
    class:lg:order-first={contents.reverse}
  >
    {#if contents.cardHeading}
      <h3
        class="md:text-start typography-h2 text-black dark:text-white"
      >
        {@html contents.cardHeading}
      </h3>
    {/if}

    <div class="flex flex-col gap-4 typography-body-md text-[var(--form-text-secondary)]">
      <slot />
    </div>
  </div>
</div>
