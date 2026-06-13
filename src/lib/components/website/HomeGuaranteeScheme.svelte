<script lang="ts">
  import { onMount } from "svelte";
  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import IconCard from "./IconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import ThreeCard from "./ThreeCard.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "./WhyChoose.svelte";
  import Support from "./Support.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/homeGuaranteeScheme.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const navListWithClicks = $derived({
    items: content.subList,
    actionBtns: [content.navList].map((btn: any) => {
      if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Apply online") {
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

  const cardDataListWithClicks = $derived(
    content.cardDataList.map((card: any) => {
      if (card.link === "/get-started/how-can-we-help") {
        return {
          ...card,
          btnClick: () => {
            applicationData.update((data) => {
              data.LoanName = "Home Loan";
              return data;
            });
          }
        };
      }
      return card;
    })
  );

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
          <div>
            <div id="guarantee" data-section="guarantee">
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.firstHomeSooner} />
              </div>
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.firstHomeGuarantee} />
              </div>
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.familyHomeGuarantee} />
              </div>
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.firstHomeBuyerGuarantee} />
              </div>
            </div>
            <div id="eligibility" data-section="eligibility" class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={content.eligible} disc="list-disc" />
            </div>

            <div id="apply" data-section="apply">
              <div class="border-b border-[var(--form-border)]">
                <WhyChoose facilities={content.apply} gridCol={3} />
              </div>
              {#if cardDataListWithClicks.length > 0}
                <div class="pt-[4rem]">
                  <h3 class="md:text-start typography-h2 text-text-main">
                    {content.IconCardHeading}
                  </h3>
                  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {#each cardDataListWithClicks as cardData (cardData.heading)}
                      <IconCard {cardData} />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <div id="concessions" data-section="concessions">
              <div class="grid grid-cols-3 border-b border-[var(--form-border)] gap-[2rem]">
                <h2 class="typography-h2 text-text-main col-span-1 pt-[8rem]">
                  Other assistance grants & concessions
                </h2>
                <div class="col-span-2">
                  <WhyChoose facilities={content.assistanceGrant} gridCol={2} />
                </div>
              </div>

              <ThingsYouShould thinkKnow={content.weHelp} />

              <div id="support" class="section" data-section="support">
                <div class="border-b border-[var(--form-border)]">
                  <div class="grid lg:grid-cols-3 gap-4 py-[1rem] md:py-[4rem]">
                    {#each content.contents as item}
                      {#each item.thirdBox as details}
                        <div class="border-2 border-[var(--form-border)] min-h-[50svh] h-full p-[1rem] md:p-[2rem] flex flex-col justify-between">
                          <div class="flex flex-col gap-4">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {details.title}
                            </h3>
                            <div class="flex flex-col gap-2">
                              {#each details.links as link}
                                <ul class="list-disc marker:text-black pl-4">
                                  <li class="underline text-linkColor hover:no-underline">
                                    <a href={link.url}>{link.name}</a>
                                  </li>
                                </ul>
                              {/each}
                            </div>
                          </div>
                          <a
                            href="/home-loan/home-loan-tools-calculator"
                            class="hover:underline text-linkColor typography-body-md text-text-light"
                          >
                            Show me more home loan tools and calculators
                          </a>
                        </div>
                      {/each}
                      {#each item.firstBox as details}
                        <a
                          href={details.url}
                          class="border-2 border-[var(--form-border)] min-h-[50svh] h-full p-[1rem] md:p-[2rem] flex justify-center items-center bg-darkColor text-white"
                        >
                          <div class="flex flex-col justify-center items-center">
                            <img src={details.icon} alt="icon" />
                            <p class="text-center typography-body-md text-text-light">
                              {details.linkName}
                            </p>
                          </div>
                        </a>
                      {/each}
                      {#each item.secBox as details}
                        <div class="border-2 border-[var(--form-border)] min-h-[50svh] h-full">
                          <div>
                            <img src={details.src} alt={details.alt} />
                          </div>
                          <div class="p-[1rem] md:p-[2rem] flex flex-col gap-4">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {details.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {details.para}
                            </p>
                            <a href={details.url} class="text-linkColor hover:underline typography-body-md text-text-light">
                              {details.link}
                            </a>
                          </div>
                        </div>
                      {/each}
                    {/each}
                  </div>
                </div>
              </div>

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
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="guarantee" class="bg-white text-black px-[2rem] py-[1rem]">
                <div class="border-b border-[var(--form-border)]">
                  <ThingsYouShould thinkKnow={content.firstHomeSooner} />
                </div>
                <div class="border-b border-[var(--form-border)]">
                  <ThingsYouShould thinkKnow={content.firstHomeGuarantee} />
                </div>
                <div class="border-b border-[var(--form-border)]">
                  <ThingsYouShould thinkKnow={content.familyHomeGuarantee} />
                </div>
                <div class="border-b border-[var(--form-border)]">
                  <ThingsYouShould thinkKnow={content.firstHomeBuyerGuarantee} />
                </div>
              </div>
            {:else if index == 1}
              <div id="eligibility" class="bg-white text-black px-[2rem] py-[1rem]">
                <ThingsYouShould thinkKnow={content.eligible} disc="list-disc" />
              </div>
            {:else if index == 2}
              <div id="apply" class="bg-white text-black px-[2rem] py-[1rem]">
                <WhyChoose facilities={content.apply} gridCol={3} />
                {#if cardDataListWithClicks.length > 0}
                  <div class="pt-[2rem]">
                    <h3 class="md:text-start typography-h2 text-text-main">
                      {content.IconCardHeading}
                    </h3>
                    <div class="grid md:grid-cols-2 lg:grid-cols-4">
                      {#each cardDataListWithClicks as cardData (cardData.heading)}
                        <IconCard {cardData} />
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {:else if index == 3}
              <div id="concessions" class="bg-white text-black px-[2rem] py-[1rem]">
                <WhyChoose facilities={content.assistanceGrant} gridCol={2} />
                <ThingsYouShould thinkKnow={content.weHelp} />
              </div>
            {/if}
          </details>
        {/each}
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp help={content.common_components.helpList.contents.cards} heading={content.common_components.helpList.contents.heading} />
      <ThingsYouShould thinkKnow={content.common_components.thinkYouShouldKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem;
  }
</style>
