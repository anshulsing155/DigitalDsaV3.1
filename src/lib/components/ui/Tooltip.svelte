<script>
  export let linkName = "";
  export let hoverLink = ""; // This will be copied but not displayed
  let isHovered = false;
  let copied = false;
  // export let linkNameStyle;
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

<div
  class="relative w-full flex"
  on:mouseover={() => (isHovered = true)}
  on:mouseleave={() => (isHovered = false)}
>
  <div class="text-center text-xs ">
    {#if linkName.includes("undefined")}
      <p class="text-black invisible">Source: Freepik</p>
      {:else}
      <p class="invisible">{@html linkName}</p>
    {/if}
   

  </div>

  {#if isHovered}
    <div
      class="absolute z-50 top-4 right-0 transform bg-black text-white text-sm px-3 py-1 rounded-md whitespace-nowrap cursor-pointer"
      on:click={copyToClipboard}
    >
      {copied ? "Copied!" : "Copy"}
    </div>
  {/if}
</div>
