<!-- src/lib/components/website/LoanCard.svelte -->
<script lang="ts">
  import { goto } from "$app/navigation";
  import CounterBanner from './CounterBanner.svelte';
  import { PhoneCall, Compass } from "lucide-svelte";
</script>

<div class="flex flex-col justify-start w-full gap-[2rem] text-[var(--landing-text)]">
  <div class="flex flex-col gap-2 justify-start items-start">
    <h1 class="typography-h1">Not Just a Lead Portal</h1>
    <div class="typography-h1">
      Your <span class="bg-btnBg px-2 text-[var(--landing-accent-accessible)]">Complete DSA Toolkit</span> for Growth.
    </div>
  </div>
  
  <div>
    <div class="space-y-1">
      <div class="font-thin flex gap-1 items-center">
        <span class="italic font-semibold custom-pulse">Stop Losing Deals</span> to incomplete data.
        <img src="/icons/banned.svg" alt="banned-icon" class="h-6 ml-2" />
      </div>
      <div class="font-thin flex gap-2 items-center">
        Always present <span class="italic font-semibold custom-pulse">the right lender match</span>
        <img src="/icons/lightbulb.svg" alt="lightbulb-icon" class="h-6" />
      </div>
    </div>
  </div>

  <p class="typography-body-md text-[var(--landing-text-secondary)] text-left">
    From client assessment to bank login, DigitalDSA Pro equips you with the tools to close faster.
  </p>
  
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
    <button
      type="button"
      onclick={() => goto("/get-started/how-can-we-help")}
      class="bg-btnBg hover:bg-btnBg/90 text-[var(--landing-accent-accessible)] py-3 px-4 rounded-xl transition-all duration-300 transform hover:shadow-xl inline-flex items-center gap-3 typography-button text-center justify-center cursor-pointer font-semibold border-0"
    >
      <Compass size="20" /> Explore DSA Tools
    </button>
    <button
      type="button"
      onclick={() => goto("/appointment")}
      class="bg-[var(--landing-section-dark-bg)] hover:opacity-90 text-[var(--landing-bg)] py-3 px-4 rounded-xl transition-all duration-300 transform hover:shadow-xl inline-flex items-center gap-3 typography-button text-center justify-center cursor-pointer font-semibold border-0"
    >
      <PhoneCall size="20" /> Request a Demo
    </button>
  </div>

  <div class="w-full h-[1px] bg-[var(--landing-border)]"></div>
  
  <div class="flex flex-col gap-[2rem] bg-[var(--landing-bg-alt)] border border-[var(--landing-glass-border)] py-8 px-4 rounded-xl">
    <div class="flex flex-col gap-2 items-start">
      <p class="typography-h3 underline decoration-2 underline-offset-[4px] decoration-btnBg">
        Platform Statistics
      </p>
      <div class="flex flex-col md:flex-row gap-4 items-start">
        <div class="typography-body-sm text-[var(--landing-text-secondary)]">
          <p>ISO 9001-2018 Certified.</p>
        </div>
        <div class="flex flex-col md:flex-row gap-2">
          <div>
            <i class="fa-solid text-[var(--landing-accent)] fa-star"></i>
            <i class="fa-solid text-[var(--landing-accent)] fa-star"></i>
            <i class="fa-solid text-[var(--landing-accent)] fa-star"></i>
            <i class="fa-solid text-[var(--landing-accent)] fa-star"></i>
            <i class="fa-solid text-[var(--landing-accent)] fa-star-half-stroke"></i>
          </div>
          <p class="typography-body-sm font-semibold text-[var(--landing-text)]">
            4.9 <span class="typography-body-sm text-[var(--landing-text-muted)]">(18,767 agents)</span>
          </p>
        </div>
      </div>
    </div>
    <CounterBanner />
  </div>
</div>

<style>
  .custom-pulse {
    animation: pulseColor 7s infinite;
  }

  @keyframes pulseColor {
    0% {
      color: var(--landing-text);
    }
    50% {
      color: #ffcc00;
    }
    100% {
      color: var(--landing-text);
    }
  }
</style>
