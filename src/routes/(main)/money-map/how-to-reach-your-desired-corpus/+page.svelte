<script lang="ts">
  import FindDeposit from "$lib/components/website/FindDeposit.svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import SelectNavigator from "$lib/components/website/SelectNavigator.svelte";
  import { moneyMapList } from "$lib/data/moneyMapList";
  import CalculatorPath from "$lib/components/website/CalculatorPath.svelte";
  import Seo from "$lib/components/website/Seo.svelte";

  let pathId = $state(5);
  let selectedCal = $state("How to reach your desired corpus?");

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
  title="Reach Your Desired Savings Corpus Planner | DigitalDSA"
  description="Calculate the necessary monthly or periodic deposit value needed to accumulate a specific target savings corpus over a set tenure."
  keywords="desired corpus, savings goals, monthly deposit, target savings planner"
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
          How to reach your desired corpus?
        </h1>
        <h2 class="font-Paragraph text-minParaFont lg:text-paraFont">
          Determine the exact amount you need to save each month to secure a specific, target financial corpus over a target tenure, taking into account investment growth rate.
        </h2>
      </div>
      <div>
        <FindDeposit />
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
