<script lang="ts">
  import FdWithSavingGoal from '$lib/components/features/calculators/FdWithSavingGoal.svelte';
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import SelectNavigator from '$lib/components/sections/SelectNavigator.svelte';
  import { moneyMapList } from "$lib/data/moneyMapList";
  import CalculatorPath from '$lib/components/layout/CalculatorPath.svelte';
  import Seo from '$lib/components/Seo.svelte';

  let pathId = $state(3);
  let selectedCal = $state("How Long Will it Take to Save?");

  let topOffset = $state(120);
  let smScreen = $state(60);

  let mobOriginalOffsetTop = $state(0);
  let isFixed = $state(false);

  const topHandleScroll = () => {
    const scrollPosition = window.scrollY;

    if (scrollPosition >= mobOriginalOffsetTop) {
      isFixed = true;
    } else {
      isFixed = false;
    }
  };

  onMount(() => {
    if (!browser) return;

    const mobNav = document.getElementById("testNav");
    if (mobNav) {
      const mobNavbarRect = mobNav.getBoundingClientRect();
      mobOriginalOffsetTop = mobNavbarRect.top + window.scrollY;

      window.addEventListener("scroll", topHandleScroll);
    }
    return () => {
      window.removeEventListener("scroll", topHandleScroll);
    };
  });

  onMount(() => {
    if (!browser) return;

    const handleScroll = () => {
      if (window.innerWidth < 768) {
        smScreen = window.scrollY > 0 ? 0 : 60;
      } else {
        topOffset = window.scrollY > 0 ? 0 : 120;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });
</script>

<Seo
  type="WebPage"
  title="How Long Will it Take to Save — Target Goal Calculator | DigitalDSA"
  description="Calculate the time required to accumulate your target savings goal based on initial investments, returns & compound interest rates."
  keywords="savings timeline, target savings calculator, compound interest, time to save"
/>

<section class="relative mx-auto w-full px-1 lg:px-0">
  <div id="testNav">
    <div
      class="md:hidden bg-[var(--landing-bg)] flex flex-col left-0 w-full z-30 pt-5 px-2 {isFixed
        ? 'fixed top-0 pb-4'
        : ''}"
    >
      <SelectNavigator
        bind:selectedValue={selectedCal}
        options={moneyMapList}
        iconBg="bg-black"
        icon="/icons/badge.svg"
      />
    </div>
  </div>

  <div
    id="pageDesign"
    class="relative flex flex-col justify-center w-full bg-[var(--landing-bg)] items-center md:gap-[1rem] mx-auto md:pt-[2rem]"
  >
    <CalculatorPath
      calculators={moneyMapList}
      bind:activeId={pathId}
      mdGridCols="md:grid-cols-3"
      closeNavPosition="thingsKnow"
      moneyMapBool={true}
    />
    <div
      class={`${
        isFixed
          ? "py-[2.5rem] mx-auto text-center font-FourthHead text-subParaFont border-b border-borderColor"
          : ""
      } md:hidden`}
    ></div>

    <div class="space-y-[2rem] w-full px-0 md:px-6 lg:px-12 pt-4">
      <div class="px-2">
        <h1
          class="hidden md:flex mb-4 xs:mb-[2rem] font-ThirdHead text-minHeadFont xs:text-headFont w-full"
        >
          How Long Will it Take to Save?
        </h1>
        <h2 class="font-Paragraph text-minParaFont lg:text-paraFont">
          Enter your savings target and find out how many years or months it will take to reach your target goal based on your initial deposit, interest compounding, and periodic contribution patterns.
        </h2>
      </div>
      <div>
        <FdWithSavingGoal />
      </div>
    </div>
  </div>
</section>

<style>
  @media (min-width: 1401px) and (max-width: 2560px) {
    #pageDesign {
      width: 1360px;
    }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #pageDesign {
      width: 2000px;
    }
  }
  @media (min-width: 3861px) {
    #pageDesign {
      width: 3000px;
    }
  }

  @media (min-width: 1024px) and (max-width: 1400px) {
    #pageDesign {
      width: 95%;
    }
  }
</style>
