<!-- <script>
	let {
		showModal = $bindable(),
		dialog
	} = $props();


// boolean
// HTMLDialogElement

  // Prevent or allow background scrolling
  $effect(() => {
    if (dialog && showModal) {
dialog.showModal();
disableScroll();
    } else if (dialog) {
dialog.close();
    }
  });

  export function closeModal() {
    showModal = false;
    dialog.close(); // Ensure the dialog is closed
  }

  function handleOutsideClick(event) {
    if (dialog && event.target === dialog) {
closeModal();
    }
  }

  function disableScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function enableScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  // Ensure scrolling is enabled when modal is closed
  function handleClose() {
    enableScroll();
  }
</script>


<dialog
  bind:this={dialog}
  class="overflow-hidden p-0 shadow-lg backdrop:bg-black/30"
  onclick={handleOutsideClick}
  onclose={handleClose}
>
  
  <div
    class="animate-zoom bg-white p-6 shadow-md relative md:h-[20rem]"
    on:click|stopPropagation
  >
    {#if dialog}
      <button
        class="absolute z-20 top-1 right-2 p-2"
        aria-label="Close"
        onclick={closeModal}
      >
        <i class="fa-solid fa-xmark text-minHeadFont"></i>
      </button>
    {/if}
    <slot />
  </div>
</dialog>

<style>
  @keyframes zoom {
    from {
      transform: scale(0.95);
    }
    to {
      transform: scale(1);
    }
  }
</style> -->

<script>
  export let showModal;
  export let dialog;

  $: {
    if (dialog && showModal) {
      dialog.showModal();
      disableScroll();
    } else if (dialog) {
      dialog.close();
      enableScroll();
    }
  }

  export function closeModal() {
    showModal = false;
    enableScroll();
  }

  function handleOutsideClick(event) {
    if (dialog && event.target === dialog) {
      closeModal();
    }
  }

  function disableScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function enableScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function handleClose() {
    enableScroll();
  }
</script>

<dialog
  bind:this={dialog}
  class="overflow-hidden p-0 shadow-lg backdrop:bg-black/30"
  onclick={handleOutsideClick}
  onclose={handleClose}
  aria-modal="true"
>
  <div
    class="animate-zoom bg-white p-6 shadow-md relative"
    onclick={(e) => e.stopPropagation()}
  >
    <button
      class="absolute z-20 top-1 right-2 p-2"
      aria-label="Close"
      onclick={closeModal}
    >
      <i class="fa-solid fa-xmark text-subParaFont lg:text-minHeadFont"></i>
    </button>
    <slot />
  </div>
</dialog>
