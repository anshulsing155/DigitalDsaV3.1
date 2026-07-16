<script lang="ts">
  import MoneyLast from '$lib/components/features/calculators/MoneyLast.svelte';
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import SelectNavigator from '$lib/components/sections/SelectNavigator.svelte';
  import { moneyMapList } from "$lib/data/moneyMapList";
  import CalculatorPath from '$lib/components/layout/CalculatorPath.svelte';
  import Seo from '$lib/components/Seo.svelte';

  let pathId = $state(1);
  let selectedCal = $state("How Long Will Your Savings Support You?");

  let topOffset = $state(120);
  let smScreen = $state(60);

  let mobOriginalOffsetTop = $state(0);
  let isFixed = $state(false);

  const topHandleScroll = () => {
    const scrollPosition = window.scrollY; // Get the current scroll position

    if (scrollPosition >= mobOriginalOffsetTop) {
      isFixed = true; // Fix the navbar when it touches the top
    } else {
      isFixed = false; // Restore the navbar to its original position
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
  title="Sustain Your Retirement Lifestyle with Strategic Savings"
  description="Calculate how long your retirement savings will last with systematic planning. Estimate withdrawals, returns & inflation impact with our tool."
  keywords="Retirement Savings Calculator, How Long Will My Savings Last, Retirement Income Planning, Withdrawal Strategy Calculator, Investment Return Estimator, SIP for Retirement, Financial Planning for Retirement, Retirement Corpus Estimation, Inflation Impact on Savings, Retirement Withdrawal Frequency, Compounding Interest Calculator, Risk Appetite in Retirement, Tax Efficient Retirement Planning, Retirement Goal Calculator, Pension or Retirement Fund Planning"
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
          How Long Will Your Savings Support You?
        </h1>
        <h2 class="font-Paragraph text-minParaFont lg:text-paraFont">
          Find out how long your retirement savings can support your lifestyle
          based on withdrawals, investment returns, and inflation. By managing
          spending, investing wisely, and planning ahead, you can make your
          money last longer and enjoy a secure, stress-free retirement.
        </h2>
      </div>
      <div>
        <MoneyLast />
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
              >This Calculator is for Planning & Estimation –</span
            > The results provided are general estimates to help you understand potential
            withdrawals based on your invested amount, expected returns, and payout
            frequency. Actual income may vary due to bank offers, market fluctuations,
            and taxation.
          </li>

          <li>
            <span class="font-FourthHead text-btnBg"
              >AER vs. Nominal Interest Rate –</span
            > The Nominal Rate is the stated annual interest (e.g., 7% per annum),
            while the Annual Equivalent Rate (AER) accounts for compounding, leading
            to higher actual returns over time. This calculator considers compounding
            where applicable.
          </li>

          <li>
            <span class="font-FourthHead text-btnBg"
              >Investment Risks & Market Factors –
            </span>Fixed-income options like FDs, SCSS, and RBI Bonds offer
            stable returns, while Mutual Funds, Dividend Stocks, and REITs are
            market-linked and may fluctuate. Consider your risk tolerance before
            investing.
          </li>

          <li>
            <span class="font-FourthHead text-btnBg"
              >Tax & Withdrawal Considerations –</span
            > Interest earned from FDs and Bonds may be taxable beyond certain limits.
            Mutual Fund withdrawals are subject to capital gains tax. This calculator
            does not account for taxes—consult a financial expert for tax-efficient
            planning.
          </li>

          <li>
            <span class="font-FourthHead text-btnBg"
              >Customizing Your Retirement Income –
            </span> Use this calculator to explore different investment types, payout
            frequencies, and tenure to find the right balance between liquidity and
            returns.
          </li>

          <li>
            <span class="font-FourthHead text-btnBg"
              >Consult a Financial Advisor –</span
            > This tool is designed for estimation purposes only and does not replace
            professional financial advice. Always compare options and seek expert
            guidance before making investment decisions.
          </li>
        </ul>

        <div class="pl-2 pr-5 mt-5">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">
            For a detailed understanding of retirement income strategies, read
            our full guide.
          </p>
          <a
            href="/secure-retirement"
            class="text-linkColor underline font-FourthHead text-minParaFont lg:text-paraFont"
            >Read more</a
          >
        </div>
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
