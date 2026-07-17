<script>
  export let btnColor = "";
  export let btnBorder = "#4F4C4D";
  export let btnName = "";
  export let link = "";
  export let icon = "";
  export let imgAltName = "";
  export let img = "";
  export let imageClass = "";
  export let btnClassStyle = "py-3";
  export let onClick = () => {};
  export let btnAnimation = false;
</script>

{#if link}
  <a class="text-[var(--landing-accent-text)]" href={`${link}`}>
    <button
      type="button"
      on:click={onClick}
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
    on:click={onClick}
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
