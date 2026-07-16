<script lang="ts">
  import HomeExpenses from '$lib/components/sections/HomeExpenses.svelte';
  import IncomeComponent from '$lib/components/sections/IncomeComponent.svelte';
  import LifeStyleExpenses from '$lib/components/sections/LifeStyleExpenses.svelte';
  import Summary from '$lib/components/features/calculators/SummaryResult.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import { onMount } from "svelte";
  import PlannerPath from '$lib/components/layout/PlannerPath.svelte';
  import SelectNavigator from '$lib/components/sections/SelectNavigator.svelte';
  import Seo from '../Seo.svelte';

  let plannerNumber = $state(4);
  let selectedCal = $state("Budget Planner");
  let isFixed = $state(false);
  let mobOriginalOffsetTop = $state(0);

  const topHandleScroll = () => {
    const scrollPosition = window.scrollY;
    if (scrollPosition >= mobOriginalOffsetTop) {
      isFixed = true;
    } else {
      isFixed = false;
    }
  };

  onMount(() => {
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

  let selectedTab = $state("incomeTab");
  let nextButton = $state(1);
  let selectedIncomeOption = $state("no");

  $effect(() => {
    if (nextButton === 1) {
      selectedTab = "incomeTab";
    } else if (nextButton === 2) {
      selectedTab = "householdTab";
    } else if (nextButton === 3) {
      selectedTab = "lifestyleTab";
    } else if (nextButton === 4) {
      selectedTab = "summaryTab";
    }
  });

  function printPage() {
    window.print();
  }

  function scrollToSection() {
    const disclaimerElement = document.getElementById("disclaimer");
    if (disclaimerElement) {
      disclaimerElement.scrollIntoView({ behavior: "smooth" });
    }
  }

  const Calculators = [
    {
      id: 1,
      label: "Part-Payment Planner",
      link: "/planners/part-payment-planner",
    },
    {
      id: 2,
      label: "Flexible EMI Planner",
      link: "/planners/flexible-emi-planner",
    },
    {
      id: 3,
      label: "Both (Part-Payments & EMI Planners)",
      link: "/planners/both",
    },
    {
      id: 4,
      label: "Budget Planner",
      link: "/planners/budget-planner",
    },
  ];

  const goToPreviousTab = () => {
    if (nextButton > 1) {
      nextButton--;
    }
  };

  const goToNextTab = () => {
    if (nextButton < 4) {
      nextButton++;
    }
  };
</script>

<Seo
  type="WebPage"
  title="Budget Planner – Organize Income & Expenses Smartly"
  description="Use our Budget Planner to track income & expenses. Plan savings, manage taxes & achieve financial goals with ease. Start now!"
  keywords="Budget planner, Income and expense tracker, Personal finance management, Savings planner, Monthly budget calculator, Track income and expenses, Financial goals planner, Net income calculator, Household budget planning, Smart financial planning"
/>

<section class="relative">
  <div id="testNav" class="">
    <div
      class="md:hidden bg-white flex flex-col left-0 w-full z-30 pt-5 px-2 {isFixed
        ? 'fixed top-0 pb-4'
        : ''}"
    >
      <SelectNavigator
        bind:selectedValue={selectedCal}
        options={Calculators}
        icon="/icons/badge.svg"
        iconBg="bg-black"
      />
    </div>
  </div>

  <div class="w-full">
    <div
      id="pageDesign"
      class="relative mx-auto flex flex-col justify-center bg-white w-full"
    >
      <div class="hidden md:block bg-white z-30 shadow-md pt-[2rem]">
        <PlannerPath bind:activeId={plannerNumber} />
      </div>
      <div
        class={`${
          isFixed
            ? "py-10 mx-auto text-center font-FourthHead text-subParaFont border-b border-borderColor"
            : ""
        } md:hidden`}
      ></div>
      <div class="px-[0.5rem] md:px-[1.5rem] lg:px-[3rem]">
        <div class="w-full py-[3rem]">
          <div class="text-center flex flex-wrap justify-center gap-1 font-FifthHead text-subParaFont">
            Read the
            <button
              onclick={scrollToSection}
              class="text-blue-400 underline cursor-pointer"
            >
              disclaimer
            </button>
            for budget planner.
          </div>
        </div>

        <div class="w-full">
          <div class="pb-4 px-2 w-full flex justify-between font-FourthHead text-paraFont">
            <span class="flex gap-2">
              <span class="text-dangerColor">*</span> = Required field
            </span>
            <button
              onclick={printPage}
              class="flex items-center gap-2 text-paraFont cursor-pointer"
            >
              <i class="fa-solid fa-print"></i> Print
            </button>
          </div>
          <div class="bg-black text-white">
            <div class="lg:flex grid grid-cols-2 font-FifthHead text-minParaFont">
              <button
                onclick={() => {
                  selectedTab = "incomeTab";
                  nextButton = 1;
                }}
                class="w-full px-4 py-3 border border-white font-FourthHead text-minParaFont md:text-paraFont cursor-pointer {selectedTab == 'incomeTab' ? 'bg-btnBg text-black px-2 py-1 border-btnBg' : ''}"
              >
                Income
              </button>
              <button
                onclick={() => {
                  selectedTab = "householdTab";
                  nextButton = 2;
                }}
                class="w-full px-4 py-3 border border-white font-FourthHead text-minParaFont md:text-paraFont cursor-pointer {selectedTab == 'householdTab' ? 'bg-btnBg text-black px-2 py-1 border-btnBg' : ''}"
              >
                Household Expenses
              </button>
              <button
                onclick={() => {
                  selectedTab = "lifestyleTab";
                  nextButton = 3;
                }}
                class="w-full px-4 py-3 border border-white font-FourthHead text-minParaFont md:text-paraFont cursor-pointer {selectedTab == 'lifestyleTab' ? 'bg-btnBg text-black px-2 py-1 border-btnBg' : ''}"
              >
                Lifestyle Expenses
              </button>
              <button
                onclick={() => {
                  selectedTab = "summaryTab";
                  nextButton = 4;
                }}
                class="w-full px-4 py-3 border border-white font-FourthHead text-minParaFont md:text-paraFont cursor-pointer {selectedTab == 'summaryTab' ? 'bg-btnBg text-black px-2 py-1 border-btnBg' : ''}"
              >
                Summary
              </button>
            </div>
          </div>

          <div class="mb-[4rem]">
            <div class="border border-gray-200 bg-[#f4f4f4] shadow-md font-Paragraph mx-auto">
              {#if selectedTab == "incomeTab"}
                <IncomeComponent bind:selectedOption={selectedIncomeOption} />
              {:else if selectedTab == "householdTab"}
                <HomeExpenses />
              {:else if selectedTab == "lifestyleTab"}
                <LifeStyleExpenses />
              {:else if selectedTab == "summaryTab"}
                <Summary />
              {/if}

              <div class="mx-3 my-2">
                <div class="flex justify-between gap-4">
                  {#if selectedTab != "incomeTab"}
                    <button
                      onclick={() => {
                        nextButton = nextButton - 1;
                      }}
                      class="rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont md:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
                    >
                      Back
                    </button>
                  {:else}
                    <div class="font-Paragraph rounded-xl px-8 text-minParaFont py-1"></div>
                  {/if}
                  {#if selectedTab != "summaryTab"}
                    <button
                      onclick={() => {
                        nextButton = nextButton + 1;
                      }}
                      class="rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont md:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
                    >
                      Next
                    </button>
                  {:else}
                    <div class="font-FifthHead rounded-xl px-8 text-sm py-1"></div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- pagination -->
            <div class="flex items-center justify-center gap-4 mt-4 font-FourthHead text-subParaFont">
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span
                onclick={goToPreviousTab}
                class="cursor-pointer"
                class:opacity-50={nextButton === 1}
              >
                <i class="fa-solid fa-chevron-left text-black"></i>
              </span>

              <div class="flex items-center">
                <span>{nextButton}</span>
                <span>
                  <i class="fa-solid fa-slash fa-rotate-90 text-black"></i>
                </span>
                <span>4</span>
              </div>

              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span
                onclick={goToNextTab}
                class="cursor-pointer"
                class:opacity-50={nextButton === 4}
              >
                <i class="fa-solid fa-chevron-right text-black"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="disclaimer" class="bg-darkColor text-white pt-4 md:pt-5 px-1 md:px-20">
      <div class="mx-auto lg:w-11/12 xl:w-10/12 2xl:w-10/12">
        <div class="flex md:flex-row flex-col md:gap-10 justify-between items-start w-full mx-auto">
          <ThingsYouShould
            thinkKnow={{
              heading: "Things You Should Know",
              paraGraph: [
                `<span class="font-semibold text-btnBg">Organize your budget :</span> It’s easy finding out how much more you can put away regularly to meet
        your goals sooner. Simply enter your current income and expenses in the
        table below, picking from our suggested fields or adding your own to
        configure it just the way you want. You can then try varying the amount
        you spend to see how it affects your budget.`,
                `<span class="font-semibold text-btnBg">Note :</span> You will need to enter your gross
        salary or wages (ie the amount you earn before tax has been taken out). The
        budget planner summary will then work out your net income, after the appropriate
        income tax and Medicare levy amounts have been deducted.`,
              ],
            }}
            disc="list-disc"
          />
        </div>
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
