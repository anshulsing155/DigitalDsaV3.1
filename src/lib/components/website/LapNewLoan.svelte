<script lang="ts">
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import AccordionWithLeftHeading from "./AccordionWithLeftHeading.svelte";
  import { applicationData } from "$lib/stores/stores";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/lapNewLoan.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare loan offers") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Loan Against Property";
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
    actionBtns: content.navList.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare loan offers") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Loan Against Property";
              return data;
            });
          }
        };
      }
      return btn;
    })
  });

  const featuresWithClicks = $derived({
    ...content.features,
    cardData: content.features.cardData.map((card: any) => {
      if (card.btnLink === "/get-started/how-can-we-help" || card.btnName === "Compare LAP Offers") {
        return {
          ...card,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Loan Against Property";
              return data;
            });
          }
        };
      }
      return card;
    })
  });

  const buttonBannerWithClicks = $derived({
    ...content.eligibility.buttonBanner,
    btnClick: () => {
      applicationData.update((data) => {
        data.LoanName = "Loan Against Property";
        return data;
      });
    }
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

<section>
  <NewPageLayout pageData={pageDataWithClicks}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="what" data-section="what">
        <ThreeColumWithLeftHeading contents={featuresWithClicks} />
      </div>

      <div id="benefits" data-section="benefits">
        <TwoColumnWithLeftHeading contents={content.benefits} />
      </div>

      <div id="whoCanApply" data-section="whoCanApply">
        <ThreeColumWithLeftHeading contents={content.eligibility.contents} />

        <TwoColumnWithImage contents={content.eligibility.whatWeProvide.contents}>
          <div class="typography-body-md text-[var(--form-text-secondary)]">
            <ul class="list-disc pl-2 space-y-4">
              {#each content.eligibility.whatWeProvide.list as item}
                <li class="flex items-start gap-1">
                  <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                  <span>
                    <strong>{item.bold}</strong> {item.text}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        </TwoColumnWithImage>

        <ButtonBanner contents={buttonBannerWithClicks} />
      </div>

      <div id="things" data-section="things">
        <ThreeColumWithLeftHeading contents={content.things} />
      </div>

      <div id="calculators" data-section="calculators">
        <ThreeColumWithLeftHeading contents={content.tools.moneyMap} />

        <div class="px-[0.5rem] lg:px-[4rem]">
          <AccordionWithLeftHeading contents={content.tools.faq} />
        </div>
      </div>
    </div>

    <!-- mobile view -->
    <div class="lg:hidden">
      {#each content.mobileNavbarTitle as list, index (list)}
        <details
          class="dropdown border-bgBtn col-span-3 bg-darkColor text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span>
                  <i class="fa-solid fa-angle-down faq-icon text-white transition-transform duration-300"></i>
                </span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="ready" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={featuresWithClicks} />
            </div>
          {:else if index == 1}
            <div id="find" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.benefits} />
            </div>
          {:else if index == 2}
            <div id="next" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.eligibility.contents} />

              <TwoColumnWithImage contents={content.eligibility.whatWeProvide.contents}>
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  <ul class="list-disc pl-2 space-y-4">
                    {#each content.eligibility.whatWeProvide.list as item}
                      <li class="flex items-start gap-1">
                        <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                        <span>
                          <strong>{item.bold}</strong> {item.text}
                        </span>
                      </li>
                    {/each}
                  </ul>
                </div>
              </TwoColumnWithImage>
              <ButtonBanner contents={buttonBannerWithClicks} />
            </div>
          {:else if index == 3}
            <div id="things" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.things} />
            </div>
          {:else if index == 4}
            <div id="calculators" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.tools.moneyMap} />
              <div class="px-[0.5rem] lg:px-[4rem]">
                <AccordionWithLeftHeading contents={content.tools.faq} />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

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
