<script>
  let {
    showModal = $bindable(),
    dialog = $bindable(),
    closeModal: closeModalProp = undefined,
    children = undefined
  } = $props();

  $effect(() => {
    if (dialog && showModal) {
      dialog.showModal();
      disableScroll();
    } else if (dialog) {
      dialog.close();
      enableScroll();
    }
  });

  export function closeModal() {
    showModal = false;
    enableScroll();
    if (closeModalProp) closeModalProp();
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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="animate-zoom bg-[var(--landing-bg-card)] text-[var(--form-text)] p-6 shadow-md relative"
    onclick={(e) => e.stopPropagation()}
  >
    <button
      class="absolute z-20 top-1 right-2 p-2"
      aria-label="Close"
      onclick={closeModal}
    >
      <i class="fa-solid fa-xmark typography-body-md lg:typography-h2"></i>
    </button>
    {@render children?.()}
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
</style>
