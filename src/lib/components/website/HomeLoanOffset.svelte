<script lang="ts">
  import { onMount } from "svelte";
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThreeCard from "$lib/components/website/ThreeCard.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/homeLoanOffset.json";

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

  const offsetAccountWithClicks = $derived(
    content.offsetAccount.map((card: any) => {
      if (card.btnLink === "/get-started/how-can-we-help" || card.btnName === "Apply online") {
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
            <div id="redraw" data-section="redraw" class="section">
              <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
                <ThingsYouShould thinkKnow={content.offset} />
              </div>
            </div>

            <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
              <ThingsYouShould thinkKnow={content.redraw} disc="list-disc" />
            </div>

            <HomeIntrest
              homeInterest="Compare home loans"
              btnName="Compare now"
              btnBorder="#4F4C4D"
              btnLink="/home-loan"
            />
          </div>

          <div id="switch" data-section="switch" class="section">
            <div class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5">
              <h2 class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
                How to switch an account to Everyday Offset
              </h2>
              <div class="grid gap-5 overflow-hidden typography-body-md text-[var(--form-text-secondary)] md:col-span-3">
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  You can switch an eligible transaction account to an Everyday Offset online with your eligible Standard Variable Rate home loan
                </p>
                {#each content.switchList as switchItems}
                  {#each switchItems.lists as list}
                    <ul class="flex flex-col gap-4">
                      <h3 class="mb-4 typography-h3 font-semibold text-text-main">
                        {list.heading}
                      </h3>
                      {#each list.listItems as item}
                        <li>
                          <div class="grid md:grid-cols-8 grid-cols-6 gap-2 lg:gap-0">
                            <span class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]">
                              {item.num}
                            </span>
                            <p class="md:col-span-7 col-span-5 typography-body-md text-[var(--form-text-secondary)]">
                              {@html item.text}
                            </p>
                          </div>
                        </li>
                      {/each}
                    </ul>
                  {/each}
                {/each}
                <a href="/" class="text-linkColor hover:no-underline underline typography-body-md text-[var(--form-text-secondary)]">
                  Download the Everyday Offset fact sheet (PDF)
                </a>
              </div>
            </div>
          </div>

          <div id="benefits" data-section="benefits" class="section">
            <div class="pt-[2rem] lg:pt-[4rem] border-b border-[var(--form-border)]">
              <h2 class="md:text-start typography-h2 text-text-main">
                Looking for a home
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                {#each content.benefits as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            </div>
          </div>

          <div id="offset" data-section="offset" class="section">
            <div class="pt-[2rem] lg:pt-[4rem] border-b border-[var(--form-border)]">
              <h2 class="md:text-start typography-h2 text-text-main">
                Home loans with an offset account
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                {#each offsetAccountWithClicks as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            </div>
          </div>

          <div id="support" data-section="support" class="section">
            <div class="border-b border-[var(--form-border)]">
              <div class="grid grid-cols-3 gap-4 py-[4rem]">
                {#each content.contents as item, index}
                  {#if index == 0 || index == 2}
                    <div class="border-2 border-[var(--form-border)] min-h-[25svh] p-[2rem] flex flex-col gap-[3rem]">
                      <div class="flex flex-col gap-4">
                        <h3 class="typography-h3 font-semibold text-text-main">
                          {item.title}
                        </h3>

                        <div class="flex flex-col gap-2">
                          {#each item.links as link, idx}
                            <ul class="list-disc marker:text-black pl-4">
                              {#if idx < item.links.length - 1}
                                <li class="underline text-linkColor hover:no-underline">
                                  <a href={link.url}>{link.name}</a>
                                </li>
                              {/if}
                            </ul>
                          {/each}
                        </div>
                      </div>

                      <ul class="pl-4">
                        {#each item.links as link, idx}
                          {#if idx >= item.links.length - 1}
                            <li class="text-linkColor hover:underline">
                              <a href={link.url}>{link.name}</a>
                            </li>
                          {/if}
                        {/each}
                      </ul>
                    </div>
                  {:else}
                    {#each item.links as link, idx}
                      {#if idx >= item.links.length - 1}
                        <a
                          href={link.url}
                          class="border-2 border-[var(--form-border)] min-h-[25svh] p-[2rem] flex flex-col gap-[3rem] bg-darkColor text-white justify-center items-center h-full"
                        >
                          <div class="flex flex-col items-center">
                            <img src="/icons/comparison2.svg" alt="icon" />
                            <p>{link.name}</p>
                          </div>
                        </a>
                      {/if}
                    {/each}
                  {/if}
                {/each}
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
              <div id="redraw" class="bg-white text-black px-[2rem]">
                <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
                  <ThingsYouShould thinkKnow={content.offset} />
                </div>

                <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
                  <ThingsYouShould thinkKnow={content.redraw} disc="list-disc" />
                </div>

                <HomeIntrest
                  homeInterest="Compare home loans"
                  btnName="Compare now"
                  btnBorder="#4F4C4D"
                  btnLink="/home-loan"
                />
              </div>
            {:else if index == 1}
              <div id="switch" class="bg-white text-black px-[2rem]">
                <div class="grid gap-4 py-[4rem] lg:grid-cols-5">
                  <h2 class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
                    How to switch an account to Everyday Offset
                  </h2>
                  <div class="grid gap-5 overflow-hidden typography-body-md text-[var(--form-text-secondary)] md:col-span-3">
                    <p class="typography-body-sm text-[var(--form-text-secondary)]">
                      You can switch an eligible transaction account to an Everyday Offset online with your eligible Digital DSA Standard Variable Rate home loan
                    </p>
                    {#each content.switchList as switchItems}
                      {#each switchItems.lists as list}
                        <ul class="flex flex-col gap-4">
                          <h3 class="mb-4 typography-h3 font-semibold text-text-main">
                            {list.heading}
                          </h3>
                          {#each list.listItems as item}
                            <li>
                              <div class="grid md:grid-cols-8 grid-cols-6 gap-2 lg:gap-0">
                                <span class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]">
                                  {item.num}
                                </span>
                                <p class="md:col-span-7 col-span-5 typography-body-md text-[var(--form-text-secondary)]">
                                  {@html item.text}
                                </p>
                              </div>
                            </li>
                          {/each}
                        </ul>
                      {/each}
                    {/each}
                    <a href="/" class="text-linkColor hover:no-underline underline typography-body-md text-[var(--form-text-secondary)]">
                      Download the Everyday Offset fact sheet (PDF)
                    </a>
                  </div>
                </div>
              </div>
            {:else if index == 2}
              <div id="benefits" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem]">
                  <h2 class="md:text-start typography-h2 text-text-main">
                    Looking for a home
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                    {#each content.benefits as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 3}
              <div id="offset" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem]">
                  <h2 class="md:text-start typography-h2 text-text-main">
                    Home loans with an offset account
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                    {#each offsetAccountWithClicks as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 4}
              <div id="support" class="bg-white text-black px-[2rem]">
                <div class="grid md:grid-cols-2 gap-4 py-[4rem]">
                  {#each content.contents as item, idx}
                    {#if idx == 0 || idx == 2}
                      <div class="border-2 border-[var(--form-border)] min-h-[25svh] p-[2rem] flex flex-col gap-[3rem]">
                        <div class="flex flex-col gap-4">
                          <h3 class="typography-h3 font-semibold text-text-main">
                            {item.title}
                          </h3>

                          <div class="flex flex-col gap-2">
                            {#each item.links as link, i}
                              <ul class="list-disc marker:text-black pl-4">
                                {#if i < item.links.length - 1}
                                  <li class="underline text-linkColor hover:no-underline">
                                    <a href={link.url}>{link.name}</a>
                                  </li>
                                {/if}
                              </ul>
                            {/each}
                          </div>
                        </div>

                        <ul class="pl-4">
                          {#each item.links as link, i}
                            {#if i >= item.links.length - 1}
                              <li class="text-linkColor hover:underline">
                                <a href={link.url}>{link.name}</a>
                              </li>
                            {/if}
                          {/each}
                        </ul>
                      </div>
                    {:else}
                      {#each item.links as link, i}
                        {#if i >= item.links.length - 1}
                          <a
                            href={link.url}
                            class="border-2 border-[var(--form-border)] min-h-[50svh] h-full p-[2rem] flex flex-col gap-[3rem] bg-darkColor text-white justify-center items-center"
                          >
                            <div class="flex flex-col items-center">
                              <img src="/icons/comparison2.svg" alt="icon" />
                              <p>{link.name}</p>
                            </div>
                          </a>
                        {/if}
                      {/each}
                    {/if}
                  {/each}
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
      <ThingsYouShould thinkKnow={content.common_components.thinkYouShouldKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem;
  }
</style>
