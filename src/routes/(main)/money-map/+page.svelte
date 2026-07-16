<script lang="ts">
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import SelectNavigator from "$lib/components/website/SelectNavigator.svelte";
  import { moneyMapList } from "$lib/data/moneyMapList";
  import Seo from "$lib/components/website/Seo.svelte";

  let showCalculator = $state(false);
  let selectedCal = $state("");

  function checkScreenWidth() {
    showCalculator = window.innerWidth >= 1024;
  }

  $effect(() => {
    if (!selectedCal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  });

  onMount(() => {
    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  });

  $effect(() => {
    showCalculator = selectedCal !== "";
  });
</script>

<Seo
  type="WebPage"
  title="Money Map — Savings & Retirement Calculators | DigitalDSA"
  description="Navigate your savings, retirement planning, and corpus building goals with our interactive money map tools."
  keywords="money map, retirement calculator, savings planner, corpus builder"
/>

<section class="bg-white h-screen">
  <div>
    {#if !selectedCal}
      <div
        id="calCover"
        transition:slide={{ duration: 400 }}
        class="md:hidden bg-white flex flex-col pt-[8rem] h-full fixed top-[3.5rem] left-0 w-full z-30"
      >
        <SelectNavigator
          innerPlaceHolder="Select your question"
          bind:selectedValue={selectedCal}
          options={moneyMapList}
          icon="/icons/badge.svg"
          iconBg="bg-black"
        />
      </div>
    {/if}
  </div>
  <div>
    {#if selectedCal}
      <div class="md:hidden bg-white flex flex-col left-0 w-full z-30 pt-1">
        <SelectNavigator
          innerPlaceHolder="Select your question"
          bind:selectedValue={selectedCal}
          options={moneyMapList}
          icon="/icons/badge.svg"
          iconBg="bg-black"
        />
      </div>
    {/if}
  </div>
</section>
