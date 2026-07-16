<!-- src/lib/components/website/MobileBanksCarousel.svelte -->
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { banks } from "$lib/data/banks";

  let duplicatedBanks = $state<{ name: string; icon: string }[]>([]);

  onMount(async () => {
    await tick();
    duplicatedBanks = [];
    await tick();
    duplicatedBanks = [...$banks, ...$banks];

    const logosSlide = document.querySelector(".mobile-logos-slide") as HTMLElement;
    if (logosSlide) {
      logosSlide.style.animation = "none";
      void logosSlide.offsetWidth;
      logosSlide.style.animation = "";
    }
  });
</script>

<section class="pt-4 overflow-hidden">
  <div class="logos-container bg-black py-2 mx-auto relative">
    <div class="mobile-logos-slide flex whitespace-nowrap animate-scroll-mobile">
      {#each duplicatedBanks as bank}
        <div class="logo-item flex-shrink-0 mx-12 h-[3rem] grid place-items-center">
          <img
            title={bank.name}
            src={bank.icon}
            alt="companyImg"
            class="h-[2rem] grayscale invert"
          />
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  @keyframes scroll-mobile {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  .mobile-logos-slide {
    display: flex;
    width: max-content;
  }

  .animate-scroll-mobile {
    animation: scroll-mobile 120s linear infinite;
  }
</style>
