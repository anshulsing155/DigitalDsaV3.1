<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";
  import { appointmentData } from "$lib/stores/stores";

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

  export const snapshot = {
    capture: () => $appointmentData,
    restore: (value: any) => appointmentData.set(value),
  };
</script>

<section class="bg-white">
  <div class="container mx-auto relative">
    <div class="absolute top-0 z-50 w-full">
      <!-- Header for all screen sizes -->
      <header class="flex items-center justify-between h-16 px-4">
        <!-- Logo Section -->
        <a
          aria-label="Home"
          href="/"
          class="no-underline hover:text-link-hover"
        >
          <button
            type="button"
            class="hidden sm:flex flex-col items-center lg:mt-14 md:mt-4 cursor-pointer"
          >
            <img
              src="/logo/logoBlack.svg"
              alt="digital-dsa-logo"
              class="h-[2rem] md:h-[2.5rem] lg:h-[3rem]"
            />
            <div class="hidden sm:block text-black">
              <p class="text-center font-FifthHead text-subParaFont">
                Digital DSA
              </p>
              <p class="font-SubPara text-minParaFont hidden lg:flex">
                powered by EYantrik
              </p>
            </div>
          </button>
          <img
            src="/logo/newLogo.svg"
            alt="digital-dsa-logo"
            class="h-[3rem] sm:hidden"
          />
        </a>

        <!-- Go Back Button -->
        <button
          class="px-6 py-2 text-sm font-FifthHead border-2 rounded-lg border-btnBg transition-all duration-150 hover:bg-brand active:bg-brand-pressed disabled:pointer-events-none disabled:border-secondary disabled:text-disabled cursor-pointer"
          onclick={() => (showModal = true)}
        >
          Go back
        </button>
      </header>
    </div>

    {@render children()}

    {#if showModal}
      <Modal bind:showModal bind:dialog={dialogBox}>
        <div class="flex flex-col gap-6 w-full">
          <!-- Modal Header -->
          <h2 class="text-minSubHead font-FourthHead text-gray-800">
            Are you sure you want to leave?
          </h2>

          <!-- Modal Body -->
          <p class="font-Paragraph text-subParaFont text-gray-600">
            If you go back to the homepage, all your form data will be lost.
            This action cannot be undone.
          </p>

          <!-- Modal Actions -->
          <div class="flex justify-end items-center gap-4 mt-4">
            <button
              type="button"
              class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-btnBg text-black cursor-pointer"
              onclick={handleClick}>Stay</button
            >

            <button
              type="button"
              class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto border-iconColor text-black cursor-pointer"
              onclick={gotoHomePage}>Leave</button
            >
          </div>
        </div>
      </Modal>
    {/if}
  </div>
</section>
