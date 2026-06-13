<script lang="ts">
  import { onMount } from "svelte";
  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
  import IconCard from "./IconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import ThreeCard from "./ThreeCard.svelte";
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/homeBTwithTopup.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const navListWithClicks = $derived({
    items: content.subList,
    actionBtns: content.navList[0].actionBtn.map((btn: any) => {
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
            <div id="ready" data-section="ready" class="section">
              {#each content.getStart as steps}
                <div class="col-span-2">
                  <NewHome {steps} />
                </div>
              {/each}
            </div>

            {#if cardDataListWithClicks.length > 0}
              <div class="pt-[4rem]">
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
            <TwoColumn
              cardImage={content.borrow.cardImage}
              cardAltName={content.borrow.cardAltName}
              cardHeading={content.borrow.cardHeading}
              reverse
            >
              <div slot="list" class="flex flex-col gap-4">
                <p class="typography-body-sm text-text-light">
                  {content.borrow.text}
                </p>
                <a
                  href={content.borrow.link}
                  class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                >
                  {content.borrow.linkText}
                </a>
              </div>
            </TwoColumn>
          </div>

          <div data-section="find" id="find" class="py-[4rem] flex flex-col gap-2 section">
            {#if content.forHome.length > 0}
              <h2 class="md:text-start typography-h2 text-text-main">
                Looking for a home
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                {#each content.forHome as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            {/if}
          </div>

          <div>
            <div data-section="next" id="next" class="section">
              <TwoColumn
                cardImage={content.guaranteeScheme.cardImage}
                cardAltName={content.guaranteeScheme.cardAltName}
                cardHeading={content.guaranteeScheme.cardHeading}
              >
                <div slot="list" class="flex flex-col gap-4">
                  <p class="typography-body-sm text-text-light">
                    {content.guaranteeScheme.text}
                  </p>
                  <a
                    href={content.guaranteeScheme.link}
                    class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                  >
                    {content.guaranteeScheme.linkText}
                  </a>
                </div>
              </TwoColumn>
            </div>

            <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
              {#if content.whatNext.length > 0}
                <h2 class="md:text-start typography-h2 text-text-main">
                  What's next?
                </h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                  {#each content.whatNext as cardData (cardData.heading)}
                    <ThreeCard {cardData} />
                  {/each}
                </div>
              {/if}
            </div>

            <HomeIntrest
              homeInterest={content.homeInterest.homeInterest}
              btnName={content.homeInterest.btnName}
              btnBorder={content.homeInterest.btnBorder}
              btnLink={content.homeInterest.btnLink}
            />
          </div>

          <div data-section="calculators" id="calculators" class="section">
            <div class="border-b grid gap-4 md:grid-cols-3">
              <h2 class="col-span-1 py-[3rem] typography-h2 text-text-main">
                Tools & calculators
              </h2>
              <div class="col-span-2">
                <Support contents={content.contents} gridCol={2} />
              </div>
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
              <div id="ready" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each content.getStart as steps}
                  <div class="">
                    <NewHome {steps} />
                  </div>
                {/each}

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
                <TwoColumn
                  cardImage={content.borrow.cardImage}
                  cardAltName={content.borrow.cardAltName}
                  cardHeading={content.borrow.cardHeading}
                  reverse
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="typography-body-sm text-text-light">
                      {content.borrow.text}
                    </p>
                    <a
                      href={content.borrow.link}
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                    >
                      {content.borrow.linkText}
                    </a>
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 1}
              <div id="find" class="py-[4rem] flex flex-col bg-white text-black px-[2rem]">
                {#if content.forHome.length > 0}
                  <h2 class="md:text-start typography-h2 text-text-main">
                    Looking for a home
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                    {#each content.forHome as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                {/if}
              </div>
            {:else if index == 2}
              <div id="next" class="bg-white text-black px-[2rem] py-[1rem]">
                <TwoColumn
                  cardImage={content.guaranteeScheme.cardImage}
                  cardAltName={content.guaranteeScheme.cardAltName}
                  cardHeading={content.guaranteeScheme.cardHeading}
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="typography-body-sm text-text-light">
                      {content.guaranteeScheme.text}
                    </p>
                    <a
                      href={content.guaranteeScheme.link}
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                    >
                      {content.guaranteeScheme.linkText}
                    </a>
                  </div>
                </TwoColumn>

                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  {#if content.whatNext.length > 0}
                    <h2 class="md:text-start typography-h2 text-text-main">
                      What's next?
                    </h2>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]">
                      {#each content.whatNext as cardData (cardData.heading)}
                        <ThreeCard {cardData} />
                      {/each}
                    </div>
                  {/if}
                </div>

                <HomeIntrest
                  homeInterest={content.homeInterest.homeInterest}
                  btnName={content.homeInterest.btnName}
                  btnBorder={content.homeInterest.btnBorder}
                />
              </div>
            {:else if index == 3}
              <div id="calculators" class="bg-white text-black px-[2rem] py-[1rem]">
                <div class="grid lg:grid-cols-3">
                  <h2 class="lg:col-span-1 pt-[3rem] lg:pb-[3rem] pb-0 typography-h2 text-text-main">
                    Tools & calculators
                  </h2>
                  <div class="col-span-2">
                    <Support contents={content.contents} gridCol={2} />
                  </div>
                </div>
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
