<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import content from "$lib/data/website/integralBusiness.json";

  const {
    seo,
    pageData,
    stickyNavBar,
    navBarMedium,
    onlineBusiness,
    reality,
    realLife,
    threats,
    sme,
    essential,
    example,
    conclusion,
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
      <!-- online business -->
      <div data-section="sme" id="sme" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {onlineBusiness.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html onlineBusiness.para}
          </p>
        </div>
        <!-- reality -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
              {reality.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each reality.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-h3 font-semibold text-text-main">{list.heading}</h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <!-- common threats -->
      <div data-section="threats" id="threats" class="">
        <!-- real life -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {realLife.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html realLife.para}
          </p>
        </div>
        <!-- common threats -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {threats.heading}
          </h2>
          <ul class="space-y-6">
            {#each threats.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-h3 font-semibold text-text-main">{list.heading}</h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <!-- essential practices -->
      <div data-section="prac" id="prac" class="">
        <!-- sme -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {sme.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html sme.para}
          </p>
        </div>
        <!-- essential -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {essential.heading}
          </h2>
          <ul class="space-y-6">
            {#each essential.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-h3 font-semibold text-text-main">{list.heading}</h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
        <!-- example -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {example.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html example.para}
          </p>
        </div>
      </div>

      <!-- conclusion -->
      <div data-section="conclusion" id="conclusion" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {conclusion.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html conclusion.para}
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
            <div id="sme" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {onlineBusiness.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html onlineBusiness.para}
                </p>
              </div>
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
                    {reality.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each reality.listItems as list}
                    <li class="space-y-2">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {list.heading}
                      </h3>
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 1}
            <div id="threats" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {realLife.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html realLife.para}
                </p>
              </div>
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {threats.heading}
                </h2>
                <ul class="space-y-6">
                  {#each threats.listItems as list}
                    <li class="space-y-2">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {list.heading}
                      </h3>
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 2}
            <div id="prac" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {sme.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html sme.para}
                </p>
              </div>
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {essential.heading}
                </h2>
                <ul class="space-y-6">
                  {#each essential.listItems as list}
                    <li class="space-y-2">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {list.heading}
                      </h3>
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {example.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html example.para}
                </p>
              </div>
            </div>
          {:else if index == 3}
            <div id="conclusion" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  {conclusion.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html conclusion.para}
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
