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
  <a class="w-full md:w-auto" href={`${link}`}>
    <button
      type="button"
      onclick={onClick}
      class="w-full rounded-full border px-[2rem] {btnClassStyle} typography-button hover:opacity-90 md:w-[auto] {btnAnimation
        ? 'animate-scaleLoop'
        : ''}"
      style={`background-color: ${btnColor || 'transparent'}; border-color: ${btnBorder};${btnColor ? ' color: #0f172a !important;' : ' color: inherit;'}`}
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
    class="w-full rounded-full border px-[2rem] {btnClassStyle} typography-button hover:opacity-90 md:w-auto {btnAnimation
      ? 'animate-scaleLoop'
      : ''}"
    style={`background-color: ${btnColor || 'transparent'}; border-color: ${btnBorder};${btnColor ? ' color: #0f172a !important;' : ' color: inherit;'}`}
  >
    {btnName}
    {#if icon}
      <span><i class={icon}></i></span>
    {:else if img}
      <span><img src={img} alt={imgAltName} class="h-2 {imageClass}" /></span>
    {/if}
  </button>
{/if}
