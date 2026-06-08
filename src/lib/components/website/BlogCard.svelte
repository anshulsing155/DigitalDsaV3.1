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
		onClick = () => {}
	} = $props();


  import Tooltip from "./Tooltip.svelte";










// Default background color
// Default border color





;
</script>

<div
  class="flex flex-col border group relative overflow-hidden gap-2 "
  style={`border: ${cardBorder ? `1px solid ${cardBorder}` : "none"};`}
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
    class="flex h-full flex-col items-start justify-between gap-4 {cardBorder
      ? 'p-[1rem]'
      : ''}"
  >
    <div class="flex flex-col gap-4">
      <h3 class="font-FourthHead text-miniSubHead">{title}</h3>
      <p class="font-SubPara text-minParaFont md:text-subParaFont">{paragraph}</p>
    </div>
    <!-- font-Paragraph text-minParaFont md:text-subParaFont -->
    {#if linkName}
      <div class="flex w-full h-full items-end justify-start text-start">
        <a
          href={url}
          onclick={onClick}
          class={`block w-full rounded-full font-Paragraph text-minParaFont md:text-subParaFont hover:no-underline hover:opacity-90 md:w-auto`}
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
        <button
          type="button"
          class="w-full rounded-full border px-[3rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto"
          style={`background-color: ${btnColor}; border-color: ${btnBorder};`}
        >
          <a href={link} class="text-black">{btnName}</a>
        </button>
      </div>
    {/if}
    {#if !btnName}
      <div>
        <slot />
      </div>
    {/if}
  </div>
</div>

<style>
  .underline-hover:hover {
    text-decoration: underline;
  }
</style>
