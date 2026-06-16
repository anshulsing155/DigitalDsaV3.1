<script lang="ts">
  import { onMount } from "svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import StickyNavbar from "./StickyNavbar.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/plotLoanOnlyChallenges.json";

  interface ButtonProps {
    btnName: string;
    btnLink: string;
    btnColor?: string;
    animation?: boolean;
  }

  interface PageDataProps {
    coverImage: string;
    coverAlt: string;
    classStyle?: string;
    heading: string;
    para: string;
    actionBtns: ButtonProps[];
  }

  let {
    pageData = content.pageData
  }: { pageData?: PageDataProps } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare rates") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Plot Loan";
              return data;
            });
          }
        };
      }
      return btn;
    })
  });

  const navListWithClicks = $derived({
    ...content.navList,
    actionBtns: content.navList.actionBtns.map((btn) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare rates") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Plot Loan";
              return data;
            });
          }
        };
      }
      return btn;
    })
  });

  const journeyWithClicks = $derived({
    ...content.journey,
    btnClick: () => {
      applicationData.update((data) => {
        data.LoanName = "Plot Loan";
        data.LoanType = "Plot Loan Only";
        return data;
      });
    }
  });

  let activeSection = $state("");
  let firstTableData = content.firstTableData;
  let challenges = content.challenges;

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

  const handleScroll = () => {
    const sections = document.querySelectorAll("[data-section]");
    let currentSection = "";

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 200 && rect.bottom >= 200) {
        currentSection = section.id;
      }
    });

    if (currentSection) {
      activeSection = currentSection;
    }
  };

  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  const toggleDropdown = (event: Event, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

    // Close all dropdowns except the clicked one
    document.querySelectorAll(".dropdown").forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector(".faq-icon");

      if (idx !== index) {
        otherDetails.removeAttribute("open");
        if (otherIcon) {
          otherIcon.classList.remove("fa-angle-up");
          otherIcon.classList.add("fa-angle-down");
        }
      }
    });

    // Toggle current dropdown open/close state
    const isOpen = detailsElement.hasAttribute("open");
    if (isOpen) {
      detailsElement.removeAttribute("open");
      if (icon) {
        icon.classList.remove("fa-angle-up");
        icon.classList.add("fa-angle-down");
      }
    } else {
      detailsElement.setAttribute("open", "true");
      if (icon) {
        icon.classList.remove("fa-angle-down");
        icon.classList.add("fa-angle-up");
      }
    }
    setTimeout(() => {
      if (detailsElement) {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="">
  <NewPageLayout pageData={pageDataWithClicks}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="search" data-section="search" class="section">
        <TwoColumnWithLeftHeading contents={content.search} />
      </div>

      <div id="challenges" data-section="challenges" class="section">
        <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem] lg:gap-[4rem]">
            <h2 class="typography-h2 text-text-main">
              {@html challenges.heading}
            </h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-[4rem]">
              {#each challenges.list as listItem}
                <div class="grid grid-rows-8 gap-4 rounded shadow-[10px_10px_10px_rgba(0,0,0,0.15)]">
                  <h2 class="row-span-2 typography-h3 font-semibold text-text-main p-4">
                    {@html listItem.heading}
                  </h2>
                  <p class="row-span-3 typography-body-md text-text-light p-4">
                    {@html listItem.topPara}
                  </p>
                  <p class="row-span-3 typography-body-md text-text-light bg-black text-white p-4 rounded-b-lg">
                    {@html listItem.para}
                  </p>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div id="chances" data-section="chances" class="section">
        <TwoColumnWithLeftHeading contents={content.chances} />
      </div>

      <div id="alternate" data-section="alternate" class="section">
        <AboveTitleWithTopIconCard contents={content.alternate.contents} />

        <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="">
            <h2 class="grid mb-[4rem] typography-h2 text-text-main text-center">
              Comparison of Alternative Financing Options for Buying a Plot
            </h2>
          </div>
          <div class="">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>

        <ButtonBanner contents={content.tools.buttonBanner} />
        <AboveTitleWithoutIconCard contents={content.risks.contents} />
        <TwoColumnWithLeftHeading contents={journeyWithClicks} />
      </div>

      <div id="tools" data-section="tools" class="section">
        <AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
        <AboveTitleWithBlackCard contents={content.tools.calculators} />
      </div>
    </div>

    <!-- mobile view -->
    <div class="block lg:hidden">
      {#each content.mobileNavbarTitle as list, index (list)}
        <details
          class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < content.mobileNavbarTitle.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="list-none cursor-pointer px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="typography-label text-[var(--form-text)]">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span>
                  <i class="fa-solid fa-angle-down faq-icon text-[var(--form-text)] transition-transform duration-300"></i>
                </span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="search" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
              <TwoColumnWithLeftHeading contents={content.search} />
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
              <div class="py-[4rem] px-[0.5rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
                    {@html challenges.heading}
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-[4rem]">
                    {#each challenges.list as listItem}
                      <div class="grid grid-rows-8 gap-4 rounded shadow-[10px_10px_10px_rgba(0,0,0,0.15)]">
                        <h2 class="row-span-2 typography-h3 font-semibold text-text-main p-4">
                          {@html listItem.heading}
                        </h2>
                        <p class="row-span-3 typography-body-md text-text-light p-4">
                          {@html listItem.topPara}
                        </p>
                        <p class="row-span-3 typography-body-md text-text-light bg-black text-white p-4 rounded-b-lg">
                          {@html listItem.para}
                        </p>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          {:else if index == 2}
            <div id="chances" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
              <TwoColumnWithLeftHeading contents={content.chances} />
            </div>
          {:else if index == 3}
            <div id="alternate" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
              <AboveTitleWithTopIconCard contents={content.alternate.contents} />

              <div class="py-[4rem] px-[0.5rem] w-full border-b border-[var(--form-border)]">
                <div class="">
                  <h2 class="grid mb-[4rem] typography-h2 text-text-main text-center">
                    Comparison of Alternative Financing Options for Buying a Plot
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <ButtonBanner contents={content.tools.buttonBanner} />
              <AboveTitleWithoutIconCard contents={content.risks.contents} />
              <TwoColumnWithLeftHeading contents={journeyWithClicks} />
            </div>
          {:else if index == 4}
            <div id="tools" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
              <AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
              <AboveTitleWithBlackCard contents={content.tools.calculators} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <!-- message us -->
    <TwoColumnWithImage contents={content.messageUs.contents}>
      <p>{content.messageUs.para}</p>
      <div class="w-auto">
        <Button
          link={content.messageUs.button.link}
          btnBorder={content.messageUs.button.btnBorder}
          btnName={content.messageUs.button.btnName}
        />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
      <HelpList contents={content.common_components.helpList.contents} />
      <ThingsYouShould
        thinkKnow={content.common_components.thinkYouShouldKnow}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem;
  }
</style>
