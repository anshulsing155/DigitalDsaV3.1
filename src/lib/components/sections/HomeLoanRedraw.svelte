<script lang="ts">
  import { onMount } from "svelte";
  import PageDesign from '$lib/components/layout/PageDesign.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HomeIntrest from '$lib/components/sections/HomeIntrest.svelte';
  import TwoColumn from '$lib/components/sections/TwoColumn.svelte';
  import ThreeCard from '$lib/components/sections/ThreeCard.svelte';
  import WeAreHereHelp from '$lib/components/sections/WeAreHereHelp.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/homeLoanRedraw.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const navListWithClicks = $derived({
    items: content.subList,
    actionBtns: content.navList[0].actionBtn.map((btn: any) => {
      if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Apply for new loan" || btn.link === "/apply") {
        return {
          ...btn,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Home Loan";
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

<section>
  <PageDesign {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={navListWithClicks} {activeSection}>
          <div class="flex gap-4 pr-4">
            {#each navListWithClicks.actionBtns as action}
              <div>
                <Button
                  btnName={action.firstBtn}
                  btnColor={action.btnColor}
                  link={action.link}
                  btnClick={action.btnClick}
                />
              </div>
            {/each}
          </div>
        </StickyNavbar>
        <div class="px-[2rem] lg:px-[4rem]">
          <div id="redraw" data-section="redraw" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={content.redraw} />
            </div>
          </div>

          <div id="benefits" data-section="benefits" class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section">
            <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
              Benefits of redraw
            </h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
              {#each content.benefits as cardData (cardData.heading)}
                <ThreeCard {cardData} />
              {/each}
            </div>
          </div>

          <div id="access" data-section="access" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={content.access} />
            </div>
          </div>

          <div id="works" data-section="works" class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section">
            <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
              How redraw works
            </h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
              {#each content.works as cardData (cardData.heading)}
                <ThreeCard {cardData} />
              {/each}
            </div>
          </div>

          <div id="offset" data-section="offset" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={content.offset} />
            </div>
          </div>

          <div id="know" data-section="know" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={content.know} disc="list-disc" />
            </div>
          </div>
        </div>
      </div>

      <div class="lg:hidden block">
        {#each content.mobileNavbarTitle as list, index (list)}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b' : ''}"
          >
            <summary
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div class="mx-auto flex w-full items-center justify-between gap-4">
                <h2 class="text-navFont leading-6">{list}</h2>
                <div class="icon-container justify-self-end typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="redraw" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={content.redraw} />
              </div>
            {:else if index == 1}
              <div id="benefits" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
                    Benefits of redraw
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                    {#each content.benefits as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 2}
              <div id="access" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={content.access} />
              </div>
            {:else if index == 3}
              <div id="works" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
                    How redraw works
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                    {#each content.works as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 4}
              <div id="offset" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={content.offset} />
              </div>
            {:else if index == 5}
              <div id="know" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={content.know} disc="list-disc" />
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <div class="px-[2rem] lg:px-[4rem]">
        <TwoColumn
          cardImage={content.messageUs.cardImage}
          cardAltName={content.messageUs.cardAltName}
          cardHeading={content.messageUs.cardHeading}
        >
          <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
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
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp help={content.common_components.helpList.contents.cards} heading={content.common_components.helpList.contents.heading} />
      <ThingsYouShould thinkKnow={content.common_components.thinkYouShouldKnow} />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem;
  }
</style>
