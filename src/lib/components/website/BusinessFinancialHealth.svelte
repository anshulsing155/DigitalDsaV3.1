<script lang="ts">
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import Button from "./Button.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/businessFinancialHealth.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare offers") {
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare offers") {
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

<section class="py-12">
  <NewPageLayout pageData={pageDataWithClicks}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="metrics" data-section="metrics">
        <ThreeColumWithLeftHeading contents={content.metrics} />
      </div>

      <div class="px-[4rem] border-b border-borderColor" id="evaluation" data-section="evaluation">
        <ThingsYouShould thinkKnow={content.evaluation} disc="list-disc" />
      </div>

      <div id="action" data-section="action">
        <AboveTitleWithTopIconCard contents={content.action} />
      </div>
    </div>

    <!-- mobile view -->
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
            <div id="ready" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.metrics} />
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-white text-black">
              <ThingsYouShould thinkKnow={content.evaluation} disc="list-disc" />
            </div>
          {:else if index == 2}
            <div id="help" class="bg-white text-black">
              <AboveTitleWithTopIconCard contents={content.action} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage contents={content.messageUs}>
      <p>{content.messageUs.text}</p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div class="flex flex-col py-[2rem] lg:py-[4rem] px-[1rem] lg:px-[4rem] gap-[1rem]">
      <h2 class="typography-h2 text-text-main">{content.conclusion.heading}</h2>
      <p class="typography-body-sm text-text-light">{content.conclusion.text}</p>
    </div>

    <div slot="secondary">
      <HelpList contents={content.common_components.helpList.contents} />
      <ThingsYouShould
        thinkKnow={content.common_components.thinkYouShouldKnow}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
