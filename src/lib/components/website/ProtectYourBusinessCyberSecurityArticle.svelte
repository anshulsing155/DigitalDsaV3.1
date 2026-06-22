<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import content from "$lib/data/website/protectYourBusiness.json";

  const {
    seo,
    pageData,
    stickyNavBar,
    navBarMedium,
    threatReal,
    common,
    plan,
    final,
    helpList,
    thingsYouShouldKnow
  } = content;

  const toggleDropdown = (event: MouseEvent, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon") as HTMLElement;
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

    // Close all dropdowns except the clicked one
    document.querySelectorAll(".dropdown").forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector(".faq-icon") as HTMLElement;

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

  let activeSection = $state(""); // Svelte 5 state rune

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
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="mx-auto w-full">
  <SecondPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={stickyNavBar}
        {activeSection}
      />
      <div data-section="real" id="real" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            Imagine waking up to find that your business bank account is wiped
            clean, or that your customers' personal data is leaked online.
            Unfortunately, this is the reality for thousands of Indian
            businesses every year. Cyber-crime is no longer just a technology
            problem—it affects everyone, from small business owners using
            digital payments to large enterprises handling vast amounts of
            customer data.
          </p>
        </div>
        <!-- cyber threat is real -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {threatReal.heading}
          </h2>
          <h3 class="font-semibold typography-body-md">{threatReal.subHead}</h3>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html threatReal.para}
          </p>
        </div>
      </div>
      <!-- common threat -->
      <div data-section="common" id="common" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
              {common.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each common.listItems as list}
              <li class="space-y-4">
                <h3 class="font-semibold typography-body-md">{list.heading}</h3>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">{@html list.desc}</p>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html list.story}
                </p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- protect business -->
      <div data-section="protect" id="protect" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {plan.heading}
          </h2>
          {#each plan.listItems as list}
            <h3 class="font-semibold typography-body-md">{list.subHead}</h3>
            <ul class="space-y-2 pl-5">
              {#each list.lists as item}
                <li class="list-disc typography-body-sm text-[var(--form-text-secondary)] space-y-2">
                  {item}
                </li>
              {/each}
            </ul>
          {/each}
        </div>
      </div>
      <!-- final thoughts -->
      <div data-section="final" id="final" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {final.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html final.para}
          </p>
        </div>
      </div>
    </div>
    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
        <details class="border-spanColor dropdown col-span-3 mx-1 bg-darkColor text-white {index < navBarMedium.length - 1 ? 'border-b' : ''}">
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem] cursor-pointer"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="real" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Imagine waking up to find that your business bank account is
                  wiped clean, or that your customers' personal data is leaked
                  online. Unfortunately, this is the reality for thousands of
                  Indian businesses every year. Cyber-crime is no longer just a
                  technology problem—it affects everyone, from small business
                  owners using digital payments to large enterprises handling
                  vast amounts of customer data.
                </p>
              </div>
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {threatReal.heading}
                </h2>
                <h3 class="font-semibold typography-body-md">
                  {threatReal.subHead}
                </h3>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html threatReal.para}
                </p>
              </div>
            </div>
          {:else if index == 1}
            <div id="common" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
                    {common.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each common.listItems as list}
                    <li class="space-y-4">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-[var(--form-text-secondary)]">
                        {@html list.desc}
                      </p>
                      <p class="typography-body-sm text-[var(--form-text-secondary)]">
                        {@html list.story}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 2}
            <div id="protect" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {plan.heading}
                </h2>
                {#each plan.listItems as list}
                  <h3 class="font-semibold typography-body-md">{list.subHead}</h3>
                  <ul class="space-y-2 pl-5">
                    {#each list.lists as item}
                      <li class="list-disc typography-body-sm text-[var(--form-text-secondary)] space-y-2">
                        {item}
                      </li>
                    {/each}
                  </ul>
                {/each}
              </div>
            </div>
          {:else if index == 3}
            <div id="final" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {final.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html final.para}
                </p>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <HelpList contents={helpList} />
      <ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal" containerClass="px-0" />
    </div>
  </SecondPageLayout>
</section>
