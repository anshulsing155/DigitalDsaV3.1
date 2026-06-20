<script>
  let { data } = $props();

  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";

  import HelpList from "./HelpList.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/financialHardship.json";

  const {
    seo,
    pageData,
    stickyNavBar,
    navBarMedium,
    getHelp,
    hardshipArrangement,
    callUs,
    canHelp,
    businessSupport,
    helpList,
    youKnowlists
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
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section>
  <NewPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={stickyNavBar}
        {activeSection}
      ></StickyNavbar>

      <div id="getHelp" data-section="getHelp" class="section">
        <AboveTitleWithoutIconCard contents={getHelp} />
      </div>

      <div
        id="arrangement"
        data-section="arrangement"
        class="flex flex-col gap-[3rem] section"
      >
        <ThreeColumWithLeftHeading contents={hardshipArrangement} />
      </div>

      <div id="callUs" data-section="callUs" class="section">
        <TwoColumnWithImage {...callUs}>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            You can easily request help at Digital DSA by visiting our website
            to raise an online request. We’ll ask a few questions to understand
            your situation and connect you with the right support.
            Alternatively, you can call us directly for personalized assistance.
            Our team is here to help you find the best solution for your needs,
            so don’t hesitate to reach out whenever you need support.
          </p>
          <div class="flex gap-2 items-center">
            <p class="font-semibold typography-body-md">Email:</p>
            <Anchor
              link="mailto:support@digitaldsa.com"
              linkName="support@digitaldsa.com"
            />
          </div>
          <div class="flex gap-2 items-center">
            <p class="font-semibold typography-body-md">Call us:</p>
            <Anchor link="tel:+918587033787" linkName="+91 8587033787" />
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="canHelp" data-section="canHelp" class="section">
        <ThreeColumWithLeftHeading contents={canHelp} />
      </div>

      <div id="businessSupport" data-section="businessSupport" class="section">
        <TwoColumnWithImage {...businessSupport}>
          <div class="grid gap-[2rem]">
            <ul class="flex flex-col gap-2 list-disc list-inside">
              <p>
                If you're a business owner facing financial difficulties, we can
                assist with:
              </p>
              <li>Loan restructuring or refinancing (balance transfer)</li>
              <li>Debt consolidation options</li>
            </ul>
            <p>
              <Anchor link="/appointment" linkName="Book an appointment" /> with
              our business support team for tailored solutions to support your operations
              during tough times.
            </p>
          </div>
        </TwoColumnWithImage>
      </div>
    </div>
    
    <div class="lg:hidden block">
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
            <div id="getHelp" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithoutIconCard contents={getHelp} />
            </div>
          {:else if index == 1}
            <div id="arrangement" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <ThreeColumWithLeftHeading contents={hardshipArrangement} />
            </div>
          {:else if index == 2}
            <div id="callUs" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <TwoColumnWithImage {...callUs}>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  You can easily request help at Digital DSA by visiting our
                  website to raise an online request. We’ll ask a few questions
                  to understand your situation and connect you with the right
                  support. Alternatively, you can call us directly for
                  personalized assistance. Our team is here to help you find the
                  best solution for your needs, so don’t hesitate to reach out
                  whenever you need support.
                </p>
                <div class="flex gap-2 items-center">
                  <p class="font-semibold typography-body-md">Email:</p>
                  <Anchor
                    link="mailto:support@digitaldsa.com"
                    linkName="support@digitaldsa.com"
                  />
                </div>
                <div class="flex gap-2 items-center">
                  <p class="font-semibold typography-body-md">Call us:</p>
                  <Anchor link="tel:+918587033787" linkName="+91 8587033787" />
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 3}
            <div id="canHelp" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <ThreeColumWithLeftHeading contents={canHelp} />
            </div>
          {:else if index == 4}
            <div id="businessSupport" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <TwoColumnWithImage {...businessSupport}>
                <div class="grid gap-[2rem]">
                  <ul class="flex flex-col gap-2 list-disc list-inside">
                    <p>
                      If you're a business owner facing financial difficulties,
                      we can assist with:
                    </p>
                    <li>
                      Loan restructuring or refinancing (balance transfer)
                    </li>
                    <li>Debt consolidation options</li>
                  </ul>
                  <p>
                    <Anchor
                      link="/appointment"
                      linkName="Book an appointment"
                    /> with our business support team for tailored solutions to support
                    your operations during tough times.
                  </p>
                </div>
              </TwoColumnWithImage>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <div slot="secondary">
      <HelpList contents={helpList} />
      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal flex flex-col gap-4">
          {#each youKnowlists as youKnow}
            <li>
              <h3 class="font-semibold typography-body-md">
                {@html youKnow.heading}
              </h3>
              <p class="typography-body-sm text-[var(--form-text-secondary)]">
                {@html youKnow.para}
              </p>
            </li>
          {/each}
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>