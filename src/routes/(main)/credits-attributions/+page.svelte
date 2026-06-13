<script lang="ts">
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import Seo from "$lib/components/Seo.svelte";
  import content from "$lib/data/website/creditsAttributions.json";

  let activeSection = $state('');
  let activeIndex = $state<number | null>(null);
  const slideDuration = 400;

  const toggleDropdown = (event: any, index: any) => {
    event.preventDefault();
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;
    const contentElement = detailsElement.querySelector(".dropdown-content");

    // Calculate duration based on height (default min 300ms, max 800ms)
    let contentHeight = contentElement ? contentElement.scrollHeight : 0;
    let slideDuration = Math.min(800, Math.max(300, contentHeight * 2));

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

      // Update activeIndex for animation
      setTimeout(() => {
        activeIndex = null;
      }, slideDuration);
    } else {
      detailsElement.setAttribute("open", "true");
      icon.classList.remove("fa-angle-down");
      icon.classList.add("fa-angle-up");

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      // Update activeIndex for animation
      activeIndex = index;
    }
  };

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

<section>
  <SecondPageLayout
    pageData={content.pageData}
  >
    <!-- desktop view  -->

    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      />

      <div class="grid px-16">
        <div
          data-section="attribution"
          id="attribution"
          class="flex flex-col gap-8 border-b border-[var(--form-border)] py-12 text-[var(--form-text)]"
        >
          <p
            class="mt-4 typography-h3 text-[var(--form-text)]"
          >
            {content.attributionText.heading}
          </p>
          <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]">
            <p>
              {@html content.attributionText.para}
            </p>
          </div>
        </div>

        <div data-section="resources" id="resources">
          <TwoColumn
            cardImage={content.resources.cardImage}
            cardAltName={content.resources.cardAltName}
            cardHeading={content.resources.cardHeading}
            sourceName={content.resources.sourceName}
            originalSource={content.resources.originalSource}
            reverse={true}
          >
            <ul
              class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
              slot="list"
            >
              <div class="grid gap-5">
                <li>
                  {content.resources.para}
                </li>
                <li class="p-4 my-7 bg-grayColor border-l-4 border-btnBg">
                  <p>
                    <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                      >Attribution :
                    </span>
                    <span class="pt-2">
                      {@html content.resources.attributionAlert}
                    </span>
                  </p>
                </li>
                <li>
                  <div>
                    <ul class="list-disc list-inside">
                      <p class="pb-4">
                        {content.resources.intro}
                      </p>
                      {#each content.resources.platforms as platform}
                        <li class="pb-2">
                          {platform.name}
                          {#each platform.links as link, i}
                            <a
                              class="underline underline-offset-4 hover:no-underline"
                              href={link.url}
                            >
                              {link.text}</a
                            >{#if i < platform.links.length - 1} & {/if}
                          {/each}
                          details
                        </li>
                      {/each}
                      <p class="pt-8">
                        {@html content.resources.footer}
                      </p>
                    </ul>
                  </div>
                </li>
              </div>
            </ul>
          </TwoColumn>
        </div>
      </div>
      <div data-section="logo" id="logo">
        <TwoColumnWithLeftHeading
          contents={content.logo}
        />
      </div>

      <div data-section="compliance" id="compliance">
        <TwoColumnWithLeftHeading
          contents={content.compliance}
        />
      </div>
    </div>

    <!-- mobile view  -->

    <div class="block lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-[var(--form-bg)] text-[var(--form-text)] {index < content.navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="">{list}</h2>
              <div class="icon-container justify-self-end text-lg text-[var(--form-text-secondary)]">
                <span><i class="fa-solid fa-angle-down faq-icon transition-transform duration-300"></i></span>
              </div>
            </div>
          </summary>

          {#if activeIndex === index}
            <div
              transition:slide={{ duration: slideDuration, delay: 200}}
              class="dropdown-content"
            >
              {#if index == 0}
                <div
                  id="attribution"
                  class="flex flex-col gap-8 border-b border-[var(--form-border)] bg-[var(--landing-bg)] text-[var(--form-text)] px-4 py-12"
                >
                  <p
                    class="mt-4 typography-h3 text-[var(--form-text)]"
                  >
                    {content.attributionText.heading}
                  </p>
                  <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]">
                    <p>
                      {@html content.attributionText.para}
                    </p>
                  </div>
                </div>
              {:else if index == 1}
                <div id="resources" class="bg-[var(--landing-bg)] text-[var(--form-text)] px-[0.5rem]">
                  <TwoColumn
                    cardImage={content.resources.cardImage}
                    cardAltName={content.resources.cardAltName}
                    cardHeading={content.resources.cardHeading}
                    sourceName=""
                    originalSource="www.digitaldsa.com"
                    reverse={true}
                  >
                    <ul
                      class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
                      slot="list"
                    >
                      <div class="grid gap-5">
                        <li>
                          {content.resources.para}
                        </li>
                        <li
                          class="p-4 my-7 bg-grayColor border-l-4 border-btnBg"
                        >
                          <p>
                            <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                              >Attribution :
                            </span>
                            <span class="">
                              {@html content.resources.attributionAlert}
                            </span>
                          </p>
                        </li>
                        <li>
                          <div>
                            <p class="pb-4">
                              {content.resources.intro}
                            </p>
                            <ul class="list-disc pl-4">
                              {#each content.resources.platforms as platform}
                                <li class="pb-2">
                                  {platform.name}
                                  {#each platform.links as link, i}
                                    <a
                                      class="underline underline-offset-4 hover:no-underline"
                                      href={link.url}
                                    >
                                      {link.text}</a
                                    >{#if i < platform.links.length - 1} & {/if}
                                  {/each}
                                  details
                                </li>
                              {/each}
                            </ul>
                            <p class="pt-8">
                              {@html content.resources.footer}
                            </p>
                          </div>
                        </li>
                      </div>
                    </ul>
                  </TwoColumn>
                </div>
              {:else if index == 2}
                <div id="logo" class="bg-[var(--landing-bg)] text-[var(--form-text)] px-[0.5rem]">
                  <TwoColumnWithLeftHeading
                    contents={content.logo}
                  />
                </div>
              {:else if index == 3}
                <div id="compliance" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
                  <TwoColumnWithLeftHeading
                    contents={content.compliance}
                  />
                </div>
              {/if}
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage
      contents={content.messageUs}
    >
      <p>
        {content.messageUs.para}
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary" class="">
      <HelpList
        contents={content.help}
      />
    </div>
  </SecondPageLayout>
</section>

<style>
  .dropdown-content {
    overflow: hidden;
    transition: height 0.4s ease-in-out;
  }
</style>
