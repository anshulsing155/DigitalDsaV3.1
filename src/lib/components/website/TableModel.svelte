<script>
	let {
		showModal = $bindable(),
		dialog
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
  onclose={handleClose}
  aria-modal="true"
  class="overflow-auto max-h-[70svh] shadow-lg backdrop:bg-black/30 lg:max-w-5xl mx-auto"
>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="" on:click|stopPropagation>
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
</style>
