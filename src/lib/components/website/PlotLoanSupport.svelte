<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Button from "$lib/components/website/Button.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithBlackCard from "$lib/components/website/AboveTitleWithBlackCard.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import FeedbackCheck from "$lib/components/website/FeedbackCheck.svelte";
  import { applicationData } from "$lib/stores/stores";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/plotLoanSupport.json";

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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare rates" || btn.btnName === "Check lowest rates") {
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare rates" || btn.btnName === "Check lowest rates") {
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

  const supportWithClicks = $derived({
    ...content.support.contents,
    cards: content.support.contents.cards.map((card) => {
      if (card.url === "/get-started/how-can-we-help") {
        return {
          ...card,
          onClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Plot Loan";
              return data;
            });
          }
        };
      }
      return card;
    })
  });

  let activeSection = $state("");

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

<section class="mx-auto w-full bg-mainBg xl:container">
  <NewPageLayout pageData={pageDataWithClicks}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="type" data-section="type" class="section">
        <!-- check loan type -->
        <TwoColumnWithLeftHeading contents={content.type.loanTypes} />

        <!-- we help -->
        <TwoColumnWithImage contents={content.type.howWeHelp}>
          <div class="typography-body-sm text-text-light">
            <ul class="list-disc space-y-4">
              {#each content.type.howWeHelp.items as item}
                <li class="flex items-start gap-1">
                  <img src="/icons/circle-check.svg" alt="circle-check" class="h-4 mt-1" />
                  <span><strong>{item.bold}</strong>{item.text}</span>
                </li>
              {/each}
            </ul>
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="challenges" data-section="challenges" class="section">
        <TwoColumnWithLeftHeading contents={content.challenges.contents} />
      </div>

      <div id="steps" data-section="steps" class="section">
        <AboveTitleWithTopIconCard contents={content.steps.awareness} />

        <!-- apply -->
        <TwoColumnWithLeftHeading
          contents={{
            ...content.steps.cta,
            btnClick: () => {
              applicationData.update((data) => {
                data.LoanName = "Plot Loan";
                return data;
              });
            },
          }}
        />
      </div>

      <div id="support" data-section="support" class="section">
        <!-- financial support -->
        <AboveTitleWithoutIconCard contents={supportWithClicks} />
      </div>

      <div id="tools" data-section="tools" class="section">
        <!-- money map -->
        <AboveTitleWithTopIconCard contents={content.tools.moneyMap} />

        <!-- plot loan calc -->
        <AboveTitleWithBlackCard contents={content.tools.calculators} />

        <!-- ways to pay off -->
        <ButtonBanner contents={content.tools.buttonBanner} />
      </div>
    </div>

    <!-- mobile view -->
    <div class="block lg:hidden">
      {#each content.mobileNavbarTitle as list, index (list)}
        <details
          class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-black dark:text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="list-none cursor-pointer px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="flex items-center justify-between font-semibold typography-body-md">
              <h2 class="text-black dark:text-white">{list}</h2>
              <span>
                <i class="fa-solid fa-angle-down faq-icon text-black transition-transform duration-300 dark:text-white"></i>
              </span>
            </div>
          </summary>

          {#if index == 0}
            <div id="type" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
              <TwoColumnWithLeftHeading contents={content.type.loanTypes} />

              <!-- we help -->
              <TwoColumnWithImage contents={content.type.howWeHelp}>
                <div class="typography-body-sm text-text-light">
                  <ul class="list-disc space-y-4">
                    {#each content.type.howWeHelp.items as item}
                      <li class="flex items-start gap-1">
                        <img src="/icons/circle-check.svg" alt="circle-check" class="h-4 mt-1" />
                        <span><strong>{item.bold}</strong>{item.text}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
              <TwoColumnWithLeftHeading contents={content.challenges.contents} />
            </div>
          {:else if index == 2}
            <div id="steps" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
              <AboveTitleWithTopIconCard contents={content.steps.awareness} />

              <!-- apply -->
              <TwoColumnWithLeftHeading
                contents={{
                  ...content.steps.cta,
                  btnClick: () => {
                    applicationData.update((data) => {
                      data.LoanName = "Plot Loan";
                      return data;
                    });
                  },
                }}
              />
            </div>
          {:else if index == 3}
            <div id="support" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
              <AboveTitleWithoutIconCard contents={supportWithClicks} />
            </div>
          {:else if index == 4}
            <div id="tools" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
              <AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
              <AboveTitleWithBlackCard contents={content.tools.calculators} />
              <ButtonBanner contents={content.tools.buttonBanner} />
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

    <FeedbackCheck />

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
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
