<script lang="ts">
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import NewBlogCard from "$lib/components/website/NewBlogCard.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import { onMount } from "svelte";
  import content from "$lib/data/website/aboutUs.json";

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
  image={content.seo.image}
  title={content.seo.title}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>
<section>
  <SecondPageLayout pageData={content.heroData}>
    <div class="block lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="dropdown bg-darkColor col-span-3 text-black dark:text-white {index < content.navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon text-darkColor-contrast transition-transform duration-300"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="began"
              class="flex flex-col gap-8 border-b border-[var(--form-border)] py-12 bg-[var(--landing-bg)] text-black dark:text-white px-4"
            >
              <p
                class="mt-4 typography-h3 text-black dark:text-white"
              >
                {content.history.heading}
              </p>
              <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]">
                {#each content.history.paragraphs as para}
                  <p>{para}</p>
                {/each}
              </div>
            </div>
          {:else if index == 1}
            <div class="pt-8 bg-[var(--landing-bg)] text-black dark:text-white px-4" id="team">
              <h2 class="typography-h2 text-center text-black dark:text-white">
                {content.leaders.heading}
              </h2>
              {#each content.leaders.team as member}
                <TwoColumn
                  cardImage={member.cardImage}
                  cardAltName={member.cardAltName}
                  cardHeading={member.cardHeading}
                  sourceName={member.sourceName}
                  originalSource={member.originalSource}
                  reverse={member.reverse}
                >
                  <ul
                    class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <div class="grid gap-4">
                      <li class="typography-h3 font-semibold text-text-main">
                        {member.roleShort}
                      </li>
                      <li>
                        {member.para}
                      </li>
                    </div>
                  </ul>
                </TwoColumn>
              {/each}
            </div>
          {:else if index == 2}
            <div
              id="sustainability"
              class="pt-8 flex flex-col gap-8 bg-[var(--landing-bg)] text-black dark:text-white px-4"
            >
              <h3
                class="typography-h3 text-black dark:text-white"
              >
                {content.coreValues.heading}
              </h3>
              <div
                class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
              >
                <NewBlogCard
                  blogLists={content.coreValues.blogLists}
                />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      />

      <div class="grid px-16">
        <div
          data-section="where"
          id="where"
          class="flex flex-col gap-8 border-b border-[var(--form-border)] py-12 text-black dark:text-white"
        >
          <p
            class="mt-4 typography-h3 text-black dark:text-white"
          >
            {content.history.heading}
          </p>
          <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]">
            {#each content.history.paragraphs as para}
              <p>{para}</p>
            {/each}
          </div>
        </div>

        <div data-section="ourteam" id="ourteam" class="mt-8">
          <h2 class="typography-h2 text-center text-black dark:text-white">
            {content.leaders.heading}
          </h2>
          {#each content.leaders.team as member}
            <TwoColumn
              cardImage={member.cardImage}
              cardAltName={member.cardAltName}
              cardHeading={member.cardHeading}
              sourceName={member.sourceName}
              originalSource={member.originalSource}
              reverse={member.reverse}
            >
              <ul
                class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <div class="grid gap-4">
                  <li class="typography-h3 font-semibold text-text-main">{member.role}</li>
                  <li>
                    {member.para}
                  </li>
                </div>
              </ul>
            </TwoColumn>
          {/each}
        </div>

        <div
          data-section="sustain"
          id="sustain"
          class="grid gap-8 py-8 border-y border-[var(--form-border)] text-black dark:text-white"
        >
          <h3
            class="typography-h3 text-black dark:text-white"
          >
            {content.coreValues.heading}
          </h3>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <NewBlogCard
              blogLists={content.coreValues.blogLists}
            />
          </div>
        </div>
      </div>
    </div>
    <TwoColumnWithImage contents={content.messageUsCard}>
      <p class="typography-body-md text-[var(--form-text-secondary)]">
        {content.messageUsCard.para}
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>
    <div slot="secondary">
      <HelpList contents={content.help} />
    </div>
  </SecondPageLayout>
</section>
