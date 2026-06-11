<script lang="ts">
  import { onMount } from "svelte";
  import Button from "./Button.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { applicationData } from "$lib/stores/stores";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/topUpPlot.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare Bank offers") {
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare Bank offers") {
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

  const exploreWithClicks = $derived({
    ...content.consider.explore,
    cardData: content.consider.explore.cardData.map((card: any) => {
      if (card.btnLink === "/get-started/how-can-we-help" || card.btnName === "View loan offers") {
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
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={navListWithClicks} {activeSection} />

        <div id="requirement" data-section="requirement">
          <ThreeColumWithLeftHeading contents={content.requirement} />
        </div>
        <div class="lg:px-[4rem] border-b border-borderColor" id="benefits" data-section="benefits">
          <ThingsYouShould thinkKnow={content.benefits} disc="list-disc" />
        </div>

        <AboveTitleWithBlackCard contents={content.calculators} />

        <div id="eligibility" data-section="eligibility">
          <ThreeColumWithLeftHeading contents={content.eligibility} />
        </div>

        <div class="border-b border-borderColor lg:px-[4rem]" id="process" data-section="process">
          <TwoColumn
            cardImage={content.process.cardImage}
            cardAltName={content.process.cardAltName}
            cardHeading={content.process.cardHeading}
            imageHeight={content.process.imageHeight}
            reverse
          >
            <div slot="list" class="flex flex-col gap-4">
              <ul class="space-y-4 typography-body-md text-text-light">
                {#each content.process.list as step}
                  <li class="flex items-start gap-1">
                    <img src="/icons/circle-check.svg" alt="circle icon" class="h-4 mt-1" />
                    <span class="font-semibold">{step.bold}</span> {step.text}
                  </li>
                {/each}
              </ul>
            </div>
          </TwoColumn>
        </div>

        <div id="consider" data-section="consider">
          <div class="border-b border-borderColor lg:px-[4rem]">
            <ThingsYouShould thinkKnow={content.consider.things} disc="list-disc" />
          </div>

          <ThreeColumWithLeftHeading contents={exploreWithClicks} />
        </div>
      </div>

      <div class="lg:hidden block">
        {#each content.mobileNavbarTitle as list, index (list)}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b' : ''}"
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
              <div class="bg-white text-black">
                <ThreeColumWithLeftHeading contents={content.requirement} />
              </div>
            {:else if index == 1}
              <div class="bg-white text-black">
                <ThingsYouShould thinkKnow={content.benefits} disc="list-disc" />
                <AboveTitleWithBlackCard contents={content.calculators} />
              </div>
            {:else if index == 2}
              <div class="bg-white text-black">
                <ThreeColumWithLeftHeading contents={content.eligibility} />
              </div>
            {:else if index == 3}
              <div class="bg-white text-black">
                <TwoColumn
                  cardImage={content.process.cardImage}
                  cardAltName={content.process.cardAltName}
                  cardHeading={content.process.cardHeading}
                  reverse
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <ul class="space-y-4 typography-body-md text-text-light">
                      {#each content.process.list as step}
                        <li class="flex items-start gap-1">
                          <img src="/icons/circle-check.svg" alt="circle icon" class="h-4 mt-1" />
                          <span class="font-semibold">{step.bold}</span> {step.text}
                        </li>
                      {/each}
                    </ul>
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 4}
              <div class="bg-white text-black">
                <ThingsYouShould thinkKnow={content.consider.things} disc="list-disc" />
                <ThreeColumWithLeftHeading contents={exploreWithClicks} />
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <div class="px-[0.5rem] lg:px-[4rem]">
        <TwoColumn
          cardImage={content.messageUs.cardImage}
          cardAltName={content.messageUs.cardAltName}
          cardHeading={content.messageUs.cardHeading}
        >
          <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
            <li>{content.messageUs.text}</li>
            <div class="w-auto">
              <Button
                link={content.messageUs.button.link}
                btnBorder={content.messageUs.button.btnBorder}
                btnName={content.messageUs.button.btnName}
              />
            </div>
          </ul>
        </TwoColumn>
      </div>
    </div>
    <div slot="secondary" class="p-[0.5rem] lg:p-0">
      <WeAreHereHelp help={content.common_components.helpList.contents.cards} heading={content.common_components.helpList.contents.heading} />
      <ThingsYouShould thinkKnow={content.common_components.thinkYouShouldKnow} disc="list-decimal" />
    </div>
  </NewPageLayout>
</section>
