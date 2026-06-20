<script>
  let { data } = $props();

  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import LoanSupport from "$lib/components/website/LoanSupport.svelte";
  import NewHome from "$lib/components/website/NewHome.svelte";
 
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import WhyChoose from "./WhyChoose.svelte";
  
  import Seo from "./Seo.svelte";
  import HelpList from "./HelpList.svelte";
  import content from "$lib/data/website/costOfLiving.json";

  const {
    seo,
    pageData,
    stickyNavBar,
    navBarMedium,
    costOfLiving,
    keyfactors,
    repayments,
    offersAndDeals,
    messageUs,
    support,
    helpList,
    thinkKnow
  } = content;

  const toggleDropdown = (event, index) => {
    event.preventDefault();
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;

    // Close all dropdowns except the clicked one
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

    // Toggle current dropdown open/close state
    const isOpen = detailsElement.hasAttribute("open");
    if (isOpen) {
      detailsElement.removeAttribute("open");
      icon.classList.remove("fa-angle-up");
      icon.classList.add("fa-angle-down");
    } else {
      detailsElement.setAttribute("open", "true");
      icon.classList.remove("fa-angle-down");
      icon.classList.add("fa-angle-up");
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  let activeSection = $state('');

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
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="mx-auto w-full">
  <PageDesign {pageData}>
    <div class="relative w-full hidden lg:block">
      <StickyNavbar
        navList={stickyNavBar}
        {activeSection}
      ></StickyNavbar>

      <div class="px-[2rem] lg:px-[4rem]">
        <div
          class="border-b border-[var(--form-border)] section"
          id="costOfLiving"
          data-section="costOfLiving"
        >
          <ThingsYouShould thinkKnow={costOfLiving} />
        </div>
        <div
          class="border-b border-[var(--form-border)] section"
          id="affectingFactors"
          data-section="affectingFactors"
        >
          <WhyChoose facilities={keyfactors} gridCol="3" />
        </div>
        <div
          id="financialSupport"
          data-section="financialSupport"
          class="border-b border-[var(--form-border)] sections"
        >
          <NewHome steps={repayments} />
        </div>

        <div
          class="pb-[2rem] border-b border-[var(--form-border)] section"
          id="offerDeals"
          data-section="offerDeals"
        >
          <TwoColumn
            cardImage={offersAndDeals.cardImg1}
            cardAltName={offersAndDeals.cardAlt1}
            cardHeading={offersAndDeals.cardHead1}
            sourceName={offersAndDeals.sourceName}
            originalSource={offersAndDeals.originalSource}
            imageHeight={5}
          >
            <div slot="list">
              <div class="flex flex-col gap-5 pb-[2rem]">
                <h2
                  class="font-semibold typography-h3 flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem]"
                >
                  <img src="/icons/no-fee.svg" alt="no-fee-icon" class="h-16" />
                  With Maximum Benefits!
                </h2>

                <ul class="typography-body-md text-[var(--form-text-secondary)]">
                  <li class="flex items-center gap-2">
                    <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                    Compare loans, find the best deals, and secure them – all for FREE.
                  </li>
                  <li class="flex items-center gap-2">
                    <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                    Check loan offers anytime, anywhere – no need to visit banks.
                  </li>
                  <li class="flex items-center gap-2">
                    <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                    Find the best deals in minutes – your data stays secure, no hidden surprises.
                  </li>
                  <li class="flex items-center gap-2">
                    <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                    With Digital DSA, effortlessly check loan offers and secure the best deals.
                  </li>
                </ul>
                <p class="flex gap-2 items-end">
                  👉
                  <a
                    href="/get-started/how-can-we-help"
                    class="typography-body-md text-[var(--form-text-secondary)] text-linkColor underline"
                  >
                    Get Started</a
                  >
                </p>
              </div>

              <div class="flex flex-col gap-5 pt-[2rem]">
                <h2
                  class="font-semibold typography-h3 flex gap-6 items-end border-b border-[var(--form-border)] pb-[.3rem]"
                >
                  <img src="/icons/referral.svg" alt="" class="h-16" /> Spread the Word
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Earn Rewards by Referring! Your friends win, and so do you!
                </p>
                <ul class="typography-body-sm text-[var(--form-text-secondary)]">
                  {#each offersAndDeals.spreadWord as item}
                    <li class="flex items-center gap-2">
                      <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                      {item}
                    </li>
                  {/each}
                </ul>
                <p class="flex gap-2 items-end">
                  👉
                  <a
                    href="/refer-&-earn"
                    class="typography-body-md text-[var(--form-text-secondary)] text-linkColor underline"
                  >
                    Refer Now & Start Earning</a
                  >
                </p>
              </div>
            </div>
          </TwoColumn>
        </div>

        <div class="pb-[2rem]" id="otherResource" data-section="otherResource">
          <div class="pb-[2rem] border-b border-[var(--form-border)]">
            <TwoColumn
              cardImage={messageUs.cardImg2}
              cardAltName={messageUs.cardAlt2}
              cardHeading={messageUs.cardHead2}
              reverse
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Feel free to message us anytime for expert assistance with
                  your loan needs. Our team is here to provide professional
                  advice, guide you through the loan process, and help you find
                  the best options. No matter the time, we’ve got you covered!
                  Message us anytime, and we’ll respond promptly.
                </p>

                <div class="w-auto">
                  <Button
                    link="/contact"
                    btnClass="btn-secondary w-full"
                    btnName="Message us"
                  />
                </div>
              </ul>
            </TwoColumn>
          </div>
          <LoanSupport {support} />
        </div>
      </div>
    </div>
    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
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
            <div id="costOfLiving" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <ThingsYouShould thinkKnow={costOfLiving} />
            </div>
          {:else if index == 1}
            <div id="affectingFactors" class="px-[0.5rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <WhyChoose facilities={keyfactors} />
            </div>
          {:else if index == 2}
            <div id="financialSupport" class="px-[0.5rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <NewHome steps={repayments} />
            </div>
          {:else if index == 3}
            <div id="offerDeals" class="px-[0.5rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <TwoColumn
                cardImage={offersAndDeals.cardImg1}
                cardAltName={offersAndDeals.cardAlt1}
                cardHeading={offersAndDeals.cardHead1}
                imageHeight={5}
              >
                <div slot="list">
                  <div class="flex flex-col gap-5 pb-[2rem]">
                    <h2
                      class="font-semibold typography-h3 flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem]"
                    >
                      <img src="/icons/no-fee.svg" alt="" class="h-10" /> With Maximum
                      Benefits!
                    </h2>
                    <ul class="typography-body-md text-[var(--form-text-secondary)]">
                      <li class="flex items-center gap-2">
                        <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                        Compare loans, find the best deals, and secure them – all for FREE.
                      </li>
                      <li class="flex items-center gap-2">
                        <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                        Check loan offers anytime, anywhere – no need to visit banks.
                      </li>
                      <li class="flex items-center gap-2">
                        <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                        Find the best deals in minutes – your data stays secure, no hidden surprises.
                      </li>
                      <li class="flex items-center gap-2">
                        <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                        With Digital DSA, effortlessly check loan offers and secure the best deals.
                      </li>
                    </ul>
                    <p class="flex gap-2 items-end">
                      👉
                      <a
                        href="/get-started/how-can-we-help"
                        class="typography-body-md text-[var(--form-text-secondary)] text-linkColor underline"
                      >
                        Get Started</a
                      >
                    </p>
                  </div>

                  <div class="flex flex-col gap-5 pt-[2rem]">
                    <h2
                      class="font-semibold typography-h3 flex gap-6 items-end border-b border-[var(--form-border)] pb-[.3rem]"
                    >
                      <img src="/icons/referral.svg" alt="" class="h-10" /> Spread the Word
                    </h2>
                    <p class="typography-body-sm text-[var(--form-text-secondary)]">
                      Earn Rewards by Referring! Your friends win, and so do you!
                    </p>
                    <ul class="typography-body-sm text-[var(--form-text-secondary)]">
                      {#each offersAndDeals.spreadWord as item}
                        <li class="flex items-center gap-2">
                          <span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
                          {item}
                        </li>
                      {/each}
                    </ul>
                    <p class="flex gap-2 items-end">
                      👉
                      <a
                        href="/refer-&-earn"
                        class="typography-body-md text-[var(--form-text-secondary)] text-linkColor underline"
                      >
                        Refer Now & Start Earning</a
                      >
                    </p>
                  </div>
                </div>
              </TwoColumn>
            </div>
          {:else if index == 4}
            <div id="otherResources" class="px-[0.5rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <div class="pb-[2rem]">
                <TwoColumn
                  cardImage={messageUs.cardImg2}
                  cardAltName={messageUs.cardAlt2}
                  cardHeading={messageUs.cardHead2}
                >
                  <ul
                    class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <p class="typography-body-sm text-[var(--form-text-secondary)]">
                      Feel free to message us anytime for expert assistance with
                      your loan needs. Our team is here to provide professional
                      advice, guide you through the loan process, and help you
                      find the best options. No matter the time, we’ve got you
                      covered! Message us anytime, and we’ll respond promptly.
                    </p>

                    <div class="w-auto">
                      <Button
                        link="/contact"
                        btnClass="btn-secondary w-full"
                        btnName="Message us"
                      />
                    </div>
                  </ul>
                </TwoColumn>
              </div>

              <LoanSupport {support} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <HelpList contents={helpList} />
      <ThingsYouShould thinkKnow={thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
