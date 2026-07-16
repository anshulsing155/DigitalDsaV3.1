<!-- src/lib/components/website/CompaniesBanner.svelte -->
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { banks } from "$lib/data/banks";

  interface Bank {
    name: string;
    icon: string;
  }

  let duplicatedBanks = $derived($banks && Array.isArray($banks) ? [...$banks, ...$banks] : [] as Bank[]);

  onMount(async () => {
    await tick();

    // Restart animation by forcing a reflow
    const logosSlide = document.querySelector(".logos-slide") as HTMLElement;
    if (logosSlide) {
      logosSlide.style.animation = "none";
      void logosSlide.offsetWidth; // Force reflow
      logosSlide.style.animation = ""; // Restart animation
    }
  });
</script>

<section class="py-[2rem] overflow-hidden">
  <div class="logos-container mx-auto relative">
    <div class="logos-slide flex whitespace-nowrap animate-scroll">
      {#each duplicatedBanks as bank}
        <div class="logo-item flex-shrink-0 mx-12">
          <img
            title={bank.name}
            src={bank.icon}
            alt="companyImg"
            class="h-[2rem] grayscale"
          />
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  @keyframes scroll {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  .logos-slide {
    display: flex;
    width: max-content;
  }

  .animate-scroll {
    animation: scroll 100s linear infinite;
  }
</style>
