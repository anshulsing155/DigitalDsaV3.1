<script>
	let {
		btnColor = "",
		btnBorder = "#4F4C4D",
		btnName = "",
		link = "",
		icon = "",
		imgAltName = "",
		img = "",
		imageClass = "",
		btnClassStyle = "py-3",
		onClick = () => {},
		btnAnimation = false
	} = $props();













</script>

{#if link}
  <a class="text-black" href={`${link}`}>
    <button
      type="button"
      onclick={onClick}
      class="w-full rounded-full border px-[2rem] {btnClassStyle} font-Paragraph text-subPara hover:opacity-90 md:w-[auto] {btnAnimation
        ? 'animate-scaleLoop'
        : ''}"
      style={`background-color: ${btnColor}; border-color: ${btnBorder};`}
    >
      {btnName}
      {#if icon}
        <span><i class={icon}></i></span>
      {:else if img}
        <span><img src={img} alt={imgAltName} class="h-2 {imageClass}" /></span>
      {/if}
    </button>
  </a>
{:else}
  <button
    type="button"
    onclick={onClick}
    class="w-full rounded-full border px-[2rem] {btnClassStyle} font-Paragraph text-minParaFont md:text-subParaFont hover:opacity-90 md:w-auto {btnAnimation
      ? 'animate-scaleLoop'
      : ''}"
    style={`background-color: ${btnColor}; border-color: ${btnBorder};`}
  >
    {btnName}
    {#if icon}
      <span><i class={icon}></i></span>
    {:else if img}
      <span><img src={img} alt={imgAltName} class="h-2 {imageClass}" /></span>
    {/if}
  </button>
{/if}
