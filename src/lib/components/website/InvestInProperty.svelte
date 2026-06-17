<script lang="ts">
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import BlogCard from "./BlogCard.svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/investInProperty.json";

  let {
    data,
    pageData = content.pageData
  }: { data?: any; pageData?: any } = $props();

  const navListWithClicks = $derived(
    content.navList.map((item: any) => {
      if (item.actionBtn) {
        return {
          ...item,
          actionBtn: item.actionBtn.map((btn: any) => {
            if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Apply online" || btn.link === "/apply") {
              return {
                ...btn,
                btnClick: () => {
                  applicationData.update((storeData) => {
                    storeData.LoanName = "Home Loan";
                    return storeData;
                  });
                }
              };
            }
            return btn;
          })
        };
      }
      return item;
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
        <StickyNavbar navList={content.subList} {activeSection}>
          <div class="flex gap-4 pr-4">
            {#each navListWithClicks as lastItem}
              {#if lastItem.actionBtn}
                {#each lastItem.actionBtn as action}
                  <div>
                    <Button
                      btnName={action.firstBtn}
                      btnColor={action.btnColor}
                      link={action.link}
                      btnClick={action.btnClick}
                    />
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </StickyNavbar>

        <div class="px-[2rem] lg:px-[4rem]">
          <div id="started" data-section="started" class="section">
            <div class="grid gap-[2rem] border-b border-[var(--form-border)] py-[4rem]">
              <div class="grid gap-6">
                <h2 class="typography-h2 text-text-main">
                  Getting started
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Unlike a home, buying the right investment property is a
                  financial decision. So, it’s important to understand the goals
                  and strategies behind a successful property investment.
                </p>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2 grid lg:grid-cols-2 gap-4">
                  {#each content.started as item}
                    <BlogCard
                      icon={item.icon}
                      altName={item.altName}
                      title={item.title}
                      paragraph={item.paragraph}
                      link={item.link}
                      btnName={item.btnName}
                      cardBorder="#E3E3E3"
                    />
                  {/each}
                </div>
                <div class="col-span-1 flex flex-col gap-6">
                  {#each content.sideBarMore as side}
                    <a href={side.link}>
                      <div class="grid grid-cols-5 gap-[1rem] border shadow-[0px_0px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)]">
                        <div class="col-span-2">
                          <img
                            src={side.icon}
                            alt={side.altName}
                            class="aspect-square h-[6rem] object-cover"
                          />
                        </div>
                        <div class="col-span-3 content-center">
                          <h2>{side.paragraph}</h2>
                        </div>
                      </div>
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <div id="plan" data-section="plan" class="border-b border-[var(--form-border)] section">
            <WhyChoose facilities={content.facilities} gridCol={4} />
          </div>

          <div id="guide" data-section="guide" class="section">
            <TwoColumn
              cardImage={content.propertyGuide.cardImage}
              cardAltName={content.propertyGuide.cardAltName}
              cardHeading={content.propertyGuide.cardHeading}
            >
              <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                <li>
                  {content.propertyGuide.text}
                </li>
                <a
                  href={content.propertyGuide.linkUrl}
                  class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-[var(--form-text-secondary)]"
                >
                  {content.propertyGuide.linkText}
                </a>
              </ul>
            </TwoColumn>
          </div>

          <div id="reports" data-section="reports" class="section">
            <TwoColumn
              cardImage={content.suburbReports.cardImage}
              cardAltName={content.suburbReports.cardAltName}
              cardHeading={content.suburbReports.cardHeading}
              reverse
            >
              <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                <li>
                  {content.suburbReports.text}
                </li>
                <a
                  href={content.suburbReports.linkUrl}
                  class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-[var(--form-text-secondary)]"
                >
                  {content.suburbReports.linkText}
                </a>
              </ul>
            </TwoColumn>
          </div>

          <div id="tools" data-section="tools" class="section">
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
        {#each content.navBarMedium as list, index}
          <details class="dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}">
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
              <div id="started" class="bg-white text-black px-[2rem]">
                <div class="grid gap-[2rem] border-b border-[var(--form-border)] py-[4rem]">
                  <div class="grid gap-6">
                    <h2 class="typography-h2 text-text-main">
                      Getting started
                    </h2>
                    <p class="typography-body-sm text-[var(--form-text-secondary)]">
                      Unlike a home, buying the right investment property is a
                      financial decision. So, it’s important to understand the goals
                      and strategies behind a successful property investment.
                    </p>
                  </div>
                  <div class="grid gap-4">
                    <div class="grid md:grid-cols-2 gap-4">
                      {#each content.started as item}
                        <BlogCard
                          icon={item.icon}
                          altName={item.altName}
                          title={item.title}
                          paragraph={item.paragraph}
                          link={item.link}
                          btnName={item.btnName}
                          cardBorder="#E3E3E3"
                        />
                      {/each}
                    </div>
                    <div class="grid sm:grid-cols-2 gap-6">
                      {#each content.sideBarMore as side}
                        <a href={side.link}>
                          <div class="flex gap-[1rem] border shadow-[0px_0px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)]">
                            <div>
                              <img
                                src={side.icon}
                                alt={side.altName}
                                class="aspect-square h-[6rem] object-cover"
                              />
                            </div>
                            <div class="content-center">
                              <h2>{side.paragraph}</h2>
                            </div>
                          </div>
                        </a>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            {:else if index == 1}
              <div id="plan" class="bg-white text-black px-[2rem]">
                <WhyChoose facilities={content.facilities} gridCol={4} />
              </div>
            {:else if index == 2}
              <div id="guide" class="bg-white text-black px-[2rem]">
                <TwoColumn
                  cardImage={content.propertyGuide.cardImage}
                  cardAltName={content.propertyGuide.cardAltName}
                  cardHeading={content.propertyGuide.cardHeading}
                >
                  <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                    <li>
                      {content.propertyGuide.text}
                    </li>
                    <a
                      href={content.propertyGuide.linkUrl}
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-[var(--form-text-secondary)]"
                    >
                      {content.propertyGuide.linkText}
                    </a>
                  </ul>
                </TwoColumn>
              </div>
            {:else if index == 3}
              <div id="reports" class="bg-white text-black px-[2rem]">
                <TwoColumn
                  cardImage={content.suburbReports.cardImage}
                  cardAltName={content.suburbReports.cardAltName}
                  cardHeading={content.suburbReports.cardHeading}
                  reverse
                >
                  <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                    <li>
                      {content.suburbReports.text}
                    </li>
                    <a
                      href={content.suburbReports.linkUrl}
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-[var(--form-text-secondary)]"
                    >
                      {content.suburbReports.linkText}
                    </a>
                  </ul>
                </TwoColumn>
              </div>
            {:else if index == 4}
              <div id="tools" class="bg-white text-black px-[2rem]">
                <div class="border-b grid gap-4 py-[3rem]">
                  <h2 class="typography-h2 text-text-main">
                    Tools & calculators
                  </h2>
                  <div>
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
          <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
            <li>
              {content.messageUs.text}
            </li>
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
      <WeAreHereHelp help={content.help} heading="We're here to help" />
      <ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
