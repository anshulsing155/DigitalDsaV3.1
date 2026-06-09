<script>
	let {
		isOpen = false,
		content = {},
		onClose = () => {},
		children
	} = $props();



  //
  //// Custom action to close the modal
</script>

{#if isOpen}
  <div class="modal-overlay"></div>
  <div class="modal-container">
    <div
      class="modal-content relative lg:px-[3rem] py-[3rem] flex flex-col justify-center items-center w-full min-w-[90svw] lg:min-w-[25rem] gap-[3rem]"
    >
      <!-- Icon Section -->
      <!-- <div
          class="absolute -top-[3rem] left-1/2 transform -translate-y-1/2 w-[5rem] h-[5rem] rounded-full p-4 bg-spanColor z-20"
         >
          <img src={content.icon} alt={content.altName} />
        </div> -->
      <button type="button" onclick={() => (isOpen = false)} class="absolute top-4 right-4" aria-label="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Dynamic Text Section -->
      <div class="flex flex-col gap-4 text-center">
        <!-- <h2 class="font-FifthHead text-mobSubHead">{@html content.title}</h2>
          <p class="font-Paragraph text-minParaFont">{@html content.subTitle}</p> -->
        <div>
          {@render children?.()}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Overlay to cover the background */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  /* Centering the modal container */
  .modal-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
  }

  /* Modal content */
  .modal-content {
    background: white;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
</style>
