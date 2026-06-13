<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import Anchor from "$lib/components/website/Anchor.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import content from "$lib/data/website/arrangeDownPayment.json";

  const toggleDropdown = (event: any, index: any) => {
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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  let activeSection = $state(''); // Initially no section is active

  // This function sets the first section as active on initial load
  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

  // Handle scroll event to dynamically update the active section
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
      activeSection = currentSection; // Update the active section dynamically
    }
  };

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={content.pageData}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      />

      <!-- your savings -->
      <div data-section="first" id="first" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)] text-[var(--form-text)]"
        >
          <h2
            class="typography-h2 text-[var(--form-text)]"
          >
            {content.yourSavings.heading}
          </h2>
          <p class="typography-body-md text-[var(--form-text-secondary)]">
            {@html content.yourSavings.para}
          </p>
        </div>
        <!-- planning -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)] text-[var(--form-text)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-[var(--form-text)]"
            >
              {content.planning.heading}
            </h2>
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {@html content.planning.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each content.planning.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">{list.heading}</h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <!-- money map -->
      <div data-section="smart" id="smart" class="">
        <AboveTitleWithTopIconCard
          contents={content.smartSavings}
        />
      </div>
      <!-- withdraw and pay -->
      <div data-section="pay" id="pay" class="">
        <AboveTitleWithoutIconCard
          contents={content.withdrawAndPay}
        />
      </div>

      <!-- invest and save -->
      <div data-section="invest" id="invest" class="">
        <AboveTitleWithTopIconCard
          contents={content.smartInvesting}
          listGridAboveLg="2"
        />
      </div>
      <!-- take loan -->
      <div data-section="loan" id="loan" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)] text-[var(--form-text)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-[var(--form-text)]"
            >
              {content.loan.heading}
            </h2>
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {@html content.loan.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each content.loan.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                  {@html list.heading}
                </h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
          <Anchor link={content.loan.listUrl.url} linkName={content.loan.listUrl.linkName} />
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="dropdown bg-darkColor col-span-3 text-[var(--form-text)] {index < content.navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="first" class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)]"
              >
                <h2
                  class="typography-h2 text-[var(--form-text)]"
                >
                  {content.yourSavings.heading}
                </h2>
                <p class="typography-body-md text-[var(--form-text-secondary)]">
                  {@html content.yourSavings.para}
                </p>
              </div>
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-[var(--form-text)]"
                  >
                    {content.planning.heading}
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    {@html content.planning.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each content.planning.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 1}
            <div id="smart" class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]">
              <AboveTitleWithTopIconCard
                contents={content.smartSavings}
              />
            </div>
          {:else if index == 2}
            <div id="pay" class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]">
              <AboveTitleWithoutIconCard
                contents={content.withdrawAndPay}
              />
            </div>
          {:else if index == 3}
            <div id="invest" class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]">
              <AboveTitleWithTopIconCard
                contents={content.smartInvesting}
                listGridAboveLg="2"
              />
            </div>
          {:else if index == 4}
            <div id="loan" class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-4 lg:px-16 w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-[var(--form-text)]"
                  >
                    {content.loan.heading}
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    {@html content.loan.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each content.loan.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-semibold typography-body-md">
                        {@html list.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
                <Anchor
                  link={content.loan.listUrl.url}
                  linkName={content.loan.listUrl.linkName}
                />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <HelpList
        contents={content.help}
      />
      <ThingsYouShould
        thinkKnow={content.thingsYouShould}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </SecondPageLayout>
</section>

