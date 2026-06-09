<script>
	let {
		blogLists = []
	} = $props();


  import Anchor from "./Anchor.svelte";
  import Button from "./Button.svelte";
  import Tooltip from "./Tooltip.svelte";


</script>

{#each blogLists as blog}
  <div class="flex flex-col border group relative overflow-hidden">
    <div class="relative">
      <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
        <Tooltip
          linkName={`image source: <span class="underline">${blog.sourceName}</span>`}
          hoverLink={blog.originalSource}
        />
      </div>
      {#if blog.icon}
        <img
          src={blog.icon}
          alt={blog.altName}
          class="w-full h-[15rem] max-h-[25rem] object-top object-cover aspect-square transition-transform duration-300 ease-in-out"
        />
      {:else}
        <img
          src="images/family.jpg"
          alt="family-icon"
          class="w-full h-[15rem] max-h-[25rem] object-cover aspect-square transition-transform duration-300 ease-in-out"
        />
      {/if}
    </div>
    <div class="flex flex-col justify-between h-full gap-4 p-4">
      <div class="flex flex-col gap-4">
        <h3 class="font-FourthHead text-cardHeading">{@html blog.heading}</h3>
        <p class="font-SubPara text-subPara">{@html blog.para}</p>
      </div>

      {#if blog.linkName}
        <Anchor link={blog.url} linkName={blog.linkName} />
      {/if}

      {#if blog.btnName}
        <Button
          btnName={blog.btnName}
          btnColor={blog.btnColor}
          link={blog.btnLink}
          btnBorder={blog.btnBorder}
        />
      {/if}

      {#if !blog.btnName && !blog.linkName}
        <div>
          <!-- svelte-ignore slot_element_deprecated -->
          <slot />
        </div>
      {/if}
    </div>
  </div>
{/each}
