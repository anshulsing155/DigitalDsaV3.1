<script>
	let {
		icon = "",
		altName = "",
		title = "",
		paragraph = "",
		linkColor = "#1175BC",
		underline = true,
		linkName = "",
		link = "",
		hyper = false,
		btnColor = "",
		btnBorder = "",
		btnName = "",
		cardBorder = "",
		sourceName = "undefined",
		originalSource = "",
		url = "",
		onClick = () => {},
		children = undefined
	} = $props();


  import Tooltip from "./Tooltip.svelte";










// Default background color
// Default border color





;
</script>

<div
  class="flex flex-col group relative overflow-hidden gap-2 {cardBorder ? 'border border-[var(--form-border)] rounded-xl' : ''}"
>
  <div class="relative w-full">
    {#if icon}
      <img
        src={icon}
        alt={altName}
        class="w-full h-[15rem] max-h-[25rem] object-top object-cover aspect-square"
      />
    {:else}
      <img
        src="images/family.jpg"
        alt={altName}
        class="w-full h-[15rem] max-h-[25rem] object-top object-cover aspect-square"
      />
    {/if}

    <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
      <Tooltip
        linkName={`<span class="underline">${sourceName}</span>`}
        hoverLink={originalSource}
      />
    </div>
  </div>
  <div
    class="flex h-full flex-col items-start justify-between gap-4 {cardBorder ? 'p-4' : ''}"
  >
    <div class="flex flex-col gap-4">
      <h3 class="typography-h3 text-black dark:text-white">{title}</h3>
      <p class="typography-body-md text-[var(--form-text-secondary)]">{paragraph}</p>
    </div>
    <!-- typography-body-sm text-text-light md:typography-body-md -->
    {#if linkName}
      <div class="flex w-full h-full items-end justify-start text-start">
        <a
          href={url}
          onclick={onClick}
          class={`block w-full rounded-full typography-body-md hover:no-underline hover:opacity-90 md:w-auto`}
          class:text-linkColor={url !== ""}
          class:text-dangerColor={url == ""}
          class:underline
          class:underline-hover={!underline}
          aria-label={linkName}
        >
          {linkName}
        </a>
      </div>
    {/if}
    {#if btnName}
      <div class="w-full">
        {#if btnColor}
          <button
            type="button"
            class="w-full typography-button btn text-black md:w-auto"
            style={`background: ${btnColor}; border: 1px solid ${btnBorder || 'transparent'};`}
          >
            <a href={link} class="block w-full">{btnName}</a>
          </button>
        {:else}
          <button
            type="button"
            class="w-full typography-button btn btn-secondary md:w-auto"
          >
            <a href={link} class="block w-full">{btnName}</a>
          </button>
        {/if}
      </div>
    {/if}
    {#if !btnName}
      <div>
        {@render children?.()}
      </div>
    {/if}
  </div>
</div>

<style>
  .underline-hover:hover {
    text-decoration: underline;
  }
</style>
