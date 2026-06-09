<script>
	let {
		linkName = "",
		hoverLink = "",
		linkNameStyle = ""
	} = $props();

  let isHovered = $state(false);
  let copied = $state(false);
  //
  const copyToClipboard = async () => {
    if (!hoverLink) return; // Ensure there's a valid link
    try {
await navigator.clipboard.writeText(hoverLink);
copied = true;
setTimeout(() => (copied = false), 2000); // Reset after 2s
    } catch (err) {
console.error("Failed to copy:", err);
    }
  };

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
  class="relative w-full flex"
  onmouseover={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <div class="text-center text-xs ">
    {#if linkName.includes("undefined")}
      <p class="text-black invisible">Source: Freepik</p>
      {:else}
      <p class="invisible">{@html linkName}</p>
    {/if}
   

  </div>

  {#if isHovered}
    <button
      type="button"
      class="absolute z-50 top-4 right-0 transform bg-black text-white text-sm px-3 py-1 rounded-md whitespace-nowrap cursor-pointer border-0"
      onclick={copyToClipboard}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  {/if}
</div>
