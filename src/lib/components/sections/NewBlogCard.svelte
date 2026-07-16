<script>
	let {
		blogLists = []
	} = $props();


  import Anchor from '../ui/Anchor.svelte';
  import Button from '../ui/Button.svelte';
  import Tooltip from '../ui/Tooltip.svelte';


</script>

{#each blogLists as blog}
  <div class="flex flex-col border border-[var(--form-border)] group relative overflow-hidden">
    <div class="relative">
      <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
        <Tooltip
          linkName={`image source: <span class="underline underline-offset-4">${blog.sourceName}</span>`}
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
        <h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">{@html blog.heading}</h3>
        <p class="typography-body-md text-[var(--form-text-secondary)]">{@html blog.para}</p>
      </div>

      {#if blog.linkName}
        <Anchor link={blog.url} linkName={blog.linkName} />
      {/if}

      {#if blog.btnName}
        <Button
          btnName={blog.btnName}
          btnClass={blog.btnClass}
          link={blog.btnLink}
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
