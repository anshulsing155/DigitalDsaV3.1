<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";

  let { children } = $props();

  let showModal = $state(false);
  let dialogBox: HTMLDialogElement | undefined = $state();

  function gotoHomePage() {
    window.location.href = "/";
  }

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    showModal = false;
    enableScroll();
  }

  function enableScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
</script>

<section class="bg-[var(--form-bg)] text-[var(--form-text)] min-h-screen transition-colors duration-200">
  <div class="container mx-auto relative min-h-screen flex flex-col">
    <div class="absolute top-0 z-50 w-full">
      <!-- Header for all screen sizes -->
      <header class="flex items-center justify-between h-16 px-4">
        <!-- Logo Section -->
        <a
          aria-label="Home"
          href="/"
          class="no-underline hover:text-link-hover"
        >
          <div
            class="hidden sm:flex flex-col items-center lg:mt-14 md:mt-4 cursor-pointer border-none bg-transparent"
          >
            <img
              src="/logo/logoBlack.svg"
              alt="digital-dsa-logo"
              class="h-[2rem] md:h-[2.5rem] lg:h-[3rem] logo-img"
            />
            <div class="hidden sm:block text-[var(--form-text)]">
              <p class="text-center font-FifthHead text-subParaFont">
                Digital DSA
              </p>
              <p class="font-SubPara text-[var(--form-text-muted)] text-minParaFont hidden lg:flex">
                powered by EYantrik
              </p>
            </div>
          </div>
          <img
            src="/logo/newLogo.svg"
            alt="digital-dsa-logo"
            class="h-[3rem] sm:hidden logo-img"
          />
        </a>

        <!-- Go Back Button -->
        <button
          class="px-6 py-2 text-sm font-FifthHead border-2 rounded-lg border-[var(--ddsa-primary-500)] text-[var(--form-text)] transition-all duration-150 hover:bg-[var(--ddsa-primary-50)] active:bg-[var(--ddsa-primary-100)] disabled:pointer-events-none disabled:border-secondary disabled:text-disabled cursor-pointer bg-transparent"
          onclick={() => (showModal = true)}
        >
          Go back
        </button>
      </header>
    </div>

    <div class="flex-grow flex flex-col justify-center pt-20">
      {@render children()}
    </div>

    {#if showModal}
      <Modal bind:showModal bind:dialog={dialogBox}>
        <div class="flex flex-col gap-6 w-full text-[var(--form-text)]">
          <!-- Modal Header -->
          <h2 class="text-minSubHead font-FourthHead text-[var(--form-text)]">
            Are you sure you want to leave?
          </h2>

          <!-- Modal Body -->
          <p class="font-Paragraph text-subParaFont text-[var(--form-text-secondary)]">
            If you go back to the homepage, all your form data will be lost.
            This action cannot be undone.
          </p>

          <!-- Modal Actions -->
          <div class="flex justify-end items-center gap-4 mt-4">
            <button
              type="button"
              class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-[var(--ddsa-primary-500)] border-[var(--ddsa-primary-500)] text-white cursor-pointer"
              onclick={handleClick}>Stay</button
            >

            <button
              type="button"
              class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)] cursor-pointer"
              onclick={gotoHomePage}>Leave</button
            >
          </div>
        </div>
      </Modal>
    {/if}
  </div>
</section>

<style>
  :global(.dark) .logo-img {
    filter: invert(1) brightness(2);
  }
</style>

