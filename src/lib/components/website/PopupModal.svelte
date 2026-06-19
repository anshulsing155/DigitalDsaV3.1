<script>
	let {
		isOpen = false,
		content = {
    title: "Default Title",
    subTitle: "Default Subtitle",
    icon: "/pngs/fun.png",
    altName: "default-icon",
  },
		onClose = () => {},
		children = undefined
	} = $props();





</script>

{#if isOpen}
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div
      class="modal-overlay absolute inset-0 bg-black bg-opacity-50"
      role="button"
      aria-label="Close modal"
      tabindex="0"
      onclick={onClose}
      onkeydown={(e) => e.key === "Escape" && onClose()}
    ></div>

    <div class="relative bg-white w-[90%] max-w-md shadow-md rounded-md z-50">
      <div
        class="relative px-[3rem] pt-[3rem] pb-4 flex flex-col justify-center items-center gap-[2rem] md:gap-[3rem] z-50"
      >
        <!-- Icon Section -->
        <div
          class="absolute -top-[3rem] left-1/2 transform -translate-x-1/2 w-[5rem] h-[5rem] rounded-full p-2 md:p-4 bg-spanColor z-20"
        >
          <img src={content.icon} alt={content.altName} />
        </div>

        <!-- Dynamic Text Section -->
        <div class="flex flex-col gap-4 text-center">
          <h2 class="typography-h3 text-black">{@html content.title}</h2>
          <p class="typography-body-md text-[var(--form-text-secondary)]">
            {@html content.subTitle}
          </p>
          <div>
            {@render children?.()}
          </div>
        </div>

        <!-- Button Section -->
        {#if onClose}
          <div class="w-full">
            <button
              onclick={onClose}
              type="button"
              class="w-full py-2 typography-button bg-primary text-black rounded-lg"
            >
              OK
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
  }
</style>
