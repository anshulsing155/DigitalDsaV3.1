<script lang="ts">
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import Seo from "./Seo.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { applicationData } from "$lib/stores/stores";
  import { onMount } from "svelte";
  import content from "$lib/data/website/dataConsolidation.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const pageDataWithClicks = $derived({
    ...pageData,
    actionBtns: pageData.actionBtns.map((btn: any) => {
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Check Offers") {
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
      if (btn.btnLink === "/get-started/how-can-we-help" || btn.btnName === "Apply Online") {
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

  const getStartedButtonWithClicks = $derived({
    ...content.getStarted.button,
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
    <div class="hidden lg:block">
      <StickyNavbar navList={navListWithClicks} {activeSection} />

      <div id="debtConsolidation" data-section="debtConsolidation">
        <TwoColumnWithLeftHeading contents={content.what} />
        <AboveTitleWithoutIconCard contents={content.popularOptions} />
      </div>

      <div id="benefitConsolidation" data-section="benefitConsolidation">
        <TwoColumnWithLeftHeading contents={content.benefits} />
      </div>

      <div id="drawbacks" data-section="drawbacks">
        <TwoColumnWithLeftHeading contents={content.drawbacks} />
      </div>

      <div id="isRight" data-section="isRight">
        <TwoColumnWithLeftHeading contents={content.isRight} />

        <TwoColumnWithImage contents={content.getStarted.contents}>
          <div class="typography-body-md text-[var(--form-text-secondary)]">
            {@html content.getStarted.text}
            <Button
              link={getStartedButtonWithClicks.link}
              btnBorder={getStartedButtonWithClicks.btnBorder}
              btnColor={getStartedButtonWithClicks.btnColor}
              btnName={getStartedButtonWithClicks.btnName}
              btnClick={getStartedButtonWithClicks.btnClick}
            />
          </div>
        </TwoColumnWithImage>

        <TwoColumnWithLeftHeading contents={content.conclusion} />
      </div>
    </div>

    <div class="lg:hidden">
      {#each content.mobileNavbarTitle as navBar, index (navBar)}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{navBar}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span>
                  <i class="fa-solid fa-angle-down faq-icon text-white transition-transform duration-300"></i>
                </span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="debtConsolidation" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.what} />
              <AboveTitleWithoutIconCard contents={content.popularOptions} />
            </div>
          {:else if index == 1}
            <div id="benefitConsolidation" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.benefits} />
            </div>
          {:else if index == 2}
            <div id="drawbacks" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.drawbacks} />
            </div>
          {:else if index == 3}
            <div id="isRight" class="bg-white text-black">
              <TwoColumnWithLeftHeading contents={content.isRight} />

              <TwoColumnWithImage contents={content.getStarted.contents}>
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  {@html content.getStarted.text}
                  <Button
                    link={getStartedButtonWithClicks.link}
                    btnBorder={getStartedButtonWithClicks.btnBorder}
                    btnColor={getStartedButtonWithClicks.btnColor}
                    btnName={getStartedButtonWithClicks.btnName}
                    btnClick={getStartedButtonWithClicks.btnClick}
                  />
                </div>
              </TwoColumnWithImage>

              <TwoColumnWithLeftHeading contents={content.conclusion} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage contents={content.messageUs}>
      <p class="typography-body-sm text-[var(--form-text-secondary)]">{content.messageUs.text}</p>
      <Button
        link={content.messageUs.button.link}
        btnBorder={content.messageUs.button.btnBorder}
        btnName={content.messageUs.button.btnName}
      />
    </TwoColumnWithImage>

    <div slot="secondary">
      <HelpList contents={content.common_components.helpList.contents} />
    </div>
  </NewPageLayout>
</section>
