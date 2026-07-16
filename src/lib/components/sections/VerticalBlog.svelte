<script>
	let {
		blogLists = []
	} = $props();



  import Tooltip from '../ui/Tooltip.svelte';


</script>

{#each blogLists as blog}
  <a
    href={blog.url}
    class="relative group overflow-hidden hover:shadow-md cursor-pointer"
  >
    <div
      class="flex items-center justify-center w-full border border-[var(--form-border)] h-[6rem] md:h-[8rem]"
    >
      <div class="w-[10rem] md:w-[12rem] h-full relative">
        {#if blog.icon}
          <img
            src={blog.icon}
            alt={blog.altName}
            class="w-full h-full object-cover aspect-square"
          />
        {:else}
          <img
            src="images/family.jpg"
            alt="family-icon"
            class="w-full h-[5rem] object-cover aspect-square"
          />
        {/if}
        <div
          class="absolute top-0 right-0 bg-opacity-50 text-white text-center"
        >
          <Tooltip
            linkName={`<span class="underline underline-offset-4">${blog.sourceName}</span>`}
            hoverLink={blog.originalSource}
          />
        </div>
      </div>
      <div class="w-full h-full px-2 flex items-center text-start">
        <h3 class="!font-semibold typography-body-md text-[var(--form-text-secondary)]">
          {@html blog.heading}
        </h3>
      </div>
    </div>
  </a>
{/each}
