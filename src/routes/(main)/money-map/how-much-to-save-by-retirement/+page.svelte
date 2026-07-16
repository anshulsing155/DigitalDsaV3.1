<script lang="ts">
  import ReverseCalculationsOfMoneyLast from "$lib/components/website/ReverseCalculationsOfMoneyLast.svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import SelectNavigator from "$lib/components/website/SelectNavigator.svelte";
  import { moneyMapList } from "$lib/data/moneyMapList";
  import CalculatorPath from "$lib/components/website/CalculatorPath.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let pathId = $state(2);
  let selectedCal = $state("How Much to Save by Retirement?");

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
  title="Retirement Corpus Calculator — How Much to Save | DigitalDSA"
  description="Determine how much retirement corpus you need to save to enjoy a comfortable post-retirement life. Calculate systematic savings & interest options."
  keywords="retirement savings corpus, retirement calculator, post-retirement lifestyle, financial independence"
/>

<section class="relative mx-auto w-full px-1 lg:px-0">
  <div id="testNav">
    <div
      class="md:hidden bg-white flex flex-col left-0 w-full z-30 pt-5 px-2 {isFixed
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
    class="relative flex flex-col justify-center w-full bg-white items-center md:gap-[1rem] mx-auto md:pt-[2rem]"
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
          How Much to Save by Retirement?
        </h1>
        <h2 class="font-Paragraph text-minParaFont lg:text-paraFont">
          Figure out the target corpus you need to accumulate by the time you retire to generate the monthly income you desire, factoring in inflation adjustments and compounding returns.
        </h2>
      </div>
      <div>
        <ReverseCalculationsOfMoneyLast />
      </div>
    </div>
  </div>
</section>

<!-- Things You Should Know -->
<div
  id="thingsKnow"
  class="text-white w-full mx-auto px-1 lg:px-0 xl:w-full bg-darkColor"
>
  <div class="w-full xl:w-full 2xl:w-[87%] mx-auto">
    <div
      class="grid grid-cols-12 gap-[2rem] border-t border-iconColor px-4 py-[4rem]"
    >
      <div class="col-span-12 md:col-span-4">
        <h2
          class="font-ThirdHead text-minSubHead md:text-miniHeadFont text-start"
        >
          Things You Should Know
        </h2>
      </div>
      <div class="col-span-12 md:col-span-8">
        <ul
          class="list-disc px-5 md:px-0 font-Paragraph text-minParaFont lg:text-paraFont space-y-4"
        >
          <li>
            <span class="font-FourthHead text-btnBg"
              >Target Retirement Planning –</span
            > This tool helps you plan the exact saving goal needed to support your target withdrawals during retirement.
          </li>
          <li>
            <span class="font-FourthHead text-btnBg"
              >Inflation Adjustments –</span
            > Increments in withdrawal simulate the real impact of inflation on your buying power. Planning for yearly indexation protects your corpus from depreciating.
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

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
