<script lang="ts">
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import Button from "./Button.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Seo from "./Seo.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/lapBTWithTopUp.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare best rates") {
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Compare best rates") {
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

  const whenToOptBannerWithClicks = $derived({
    ...content.whenToOpt.buttonBanner,
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

<section class="content">
  <NewPageLayout pageData={pageDataWithClicks}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="what-why" data-section="what-why">
        <TwoColumnWithLeftHeading contents={content.what} />
        <ThreeColumWithLeftHeading contents={content.why} />
        <ThreeColumWithLeftHeading contents={content.keyBenefits} />
      </div>

      <div id="eligibility" data-section="eligibility">
        <ThreeColumWithLeftHeading contents={content.eligibility} />
        <ThreeColumWithLeftHeading contents={content.documents} />
      </div>

      <div id="process" data-section="process">
        <TwoColumnWithLeftHeading contents={content.process} />
      </div>

      <div id="when-to-opt" data-section="when-to-opt">
        <ThreeColumWithLeftHeading contents={content.whenToOpt} />
        <ButtonBanner contents={whenToOptBannerWithClicks} />
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
            <div id="what-why" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.what} />
              <ThreeColumWithLeftHeading contents={content.why} />
              <ThreeColumWithLeftHeading contents={content.keyBenefits} />
            </div>
          {:else if index == 1}
            <div id="eligibility" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.eligibility} />
              <ThreeColumWithLeftHeading contents={content.documents} />
            </div>
          {:else if index == 2}
            <div id="process" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.process} />
            </div>
          {:else if index == 3}
            <div id="when-to-opt" class="bg-white text-black">
              <ThreeColumWithLeftHeading contents={content.whenToOpt} />
              <ButtonBanner contents={whenToOptBannerWithClicks} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage contents={content.messageUs}>
      <p>{content.messageUs.text}</p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
      <WeAreHereHelp
        help={content.common_components.helpList.contents.cards}
        heading={content.common_components.helpList.contents.heading}
      />
      <ThingsYouShould
        thinkKnow={content.common_components.thinkYouShouldKnow}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
