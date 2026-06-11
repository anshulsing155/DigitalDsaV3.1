<script lang="ts">
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import { applicationData } from "$lib/stores/stores";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/lapBT.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare LAP Offers") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "LAP Balance Transfer";
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare LAP Offers") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "LAP Balance Transfer";
              return data;
            });
          }
        };
      }
      return btn;
    })
  });

  const buttonBannerWithClicks = $derived({
    ...content.buttonBanner,
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

      <div id="whyBalanceTransfer" data-section="whyBalanceTransfer">
        <ThreeColumWithLeftHeading contents={content.whyBT} />
        <ButtonBanner contents={buttonBannerWithClicks} />
      </div>

      <div id="howDSAHelp" data-section="howDSAHelp">
        <TwoColumnWithImage contents={content.howWeHelp.contents}>
          <div class="typography-body-sm text-text-light">
            <ul class="list-disc space-y-4 typography-body-md text-text-light">
              {#each content.howWeHelp.list as item}
                <li class="flex items-start gap-2">
                  <img src="/icons/circle-check.svg" alt="Check icon" class="h-5 mt-1" />
                  <p>
                    <span class="font-semibold">{item.bold}</span>
                    {@html item.text}
                  </p>
                </li>
              {/each}
            </ul>
          </div>
        </TwoColumnWithImage>
        <div class="border-b border-borderColor px-[1rem] lg:px-[4rem]">
          <ThingsYouShould thinkKnow={content.documents} disc="list-disc" />
        </div>
        <ButtonBanner contents={content.buttonBannerITR} />
      </div>

      <div id="thingConsider" data-section="thingConsider">
        <ThreeColumWithLeftHeading contents={content.things} />
      </div>

      <div id="calculators" data-section="calculators">
        <ThreeColumWithLeftHeading contents={content.tools} />
      </div>
    </div>

    <!-- mobile view -->
    <div class="lg:hidden">
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
              <ThreeColumWithLeftHeading contents={content.whyBT} />
              <ButtonBanner contents={buttonBannerWithClicks} />
            </div>
          {:else if index == 1}
            <div class="bg-white text-black">
              <TwoColumnWithImage contents={content.howWeHelp.contents}>
                <div class="typography-body-sm text-text-light">
                  <ul class="list-disc space-y-4 typography-body-md text-text-light">
                    {#each content.howWeHelp.list as item}
                      <li class="flex items-start gap-2">
                        <img src="/icons/circle-check.svg" alt="Check icon" class="h-5 mt-1" />
                        <p>
                          <span class="font-semibold">{item.bold}</span>
                          {@html item.text}
                        </p>
                      </li>
                    {/each}
                  </ul>
                </div>
              </TwoColumnWithImage>
              <ThingsYouShould thinkKnow={content.documents} disc="list-disc" />
              <ButtonBanner contents={content.buttonBannerITR} />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.things} />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.tools} />
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
