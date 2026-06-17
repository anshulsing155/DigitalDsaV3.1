<script>
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import SecondPageLayout from "./SecondPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import content from "$lib/data/website/financialCover.json";

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

      <div data-section="hardship" id="hardship" class="">
        <TwoColumnWithLeftHeading
          contents={content.hardship}
        />
        <TwoColumnWithImage
          contents={content.hardshipImageCard}
        >
          <ul class="flex flex-col gap-4 typography-body-sm typography-body-md">
            <li>
              {@html content.hardshipImageCard.para}
            </li>

            <div class="w-full md:w-auto">
              <Button
                btnName="Financial Support"
                btnBorder="#706d6e"
                link="/finance-support/financial-hardship"
              />
            </div>
          </ul>
        </TwoColumnWithImage>
      </div>

      <div data-section="changes" id="changes" class="">
        <ThreeColumWithLeftHeading
          contents={content.changes}
        />
      </div>

      <div data-section="planFuture" id="planFuture" class="">
        <TwoColumnWithImage
          contents={content.planFuture}
        >
          <p>
            {content.planFuture.para}
          </p>
        </TwoColumnWithImage>
      </div>

      <div data-section="banking" id="banking" class="">
        <TwoColumnWithImage
          contents={content.banking}
        >
          <ul class="space-y-4 typography-body-md text-[var(--form-text-secondary)]">
            {#each content.banking.bullets as bullet}
              <li class="flex flex-col gap-2">
                <span class="typography-h3 font-semibold text-text-main">{@html bullet.title}</span>
                <p>
                  {@html bullet.desc}
                </p>
              </li>
            {/each}
          </ul>
        </TwoColumnWithImage>
      </div>

      <div data-section="support" id="support" class="">
        <TwoColumnWithImage
          contents={content.support}
        >
          <p>
            {content.support.para}
          </p>
          <div class="w-full lg:w-auto">
            <Button
              link="/contact"
              btnBorder="#4F4C4D"
              btnName="Contact us"
            />
          </div>
        </TwoColumnWithImage>
      </div>
    </div>

    <!-- accordion for mobile  -->
    <div class="lg:hidden lg:mt-0">
      {#each content.navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont leading-5">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="hardship" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={content.hardship}
              />
              <TwoColumnWithImage
                contents={content.hardshipImageCard}
              >
                <ul class="flex flex-col gap-4 typography-body-sm typography-body-md">
                  <li>
                    {@html content.hardshipImageCard.para}
                  </li>

                  <div class="w-full md:w-auto">
                    <Button
                      btnName="Financial Support"
                      btnBorder="#706d6e"
                      link="/finance-support/financial-hardship"
                    />
                  </div>
                </ul>
              </TwoColumnWithImage>
            </div>
          {:else if index == 1}
            <div id="changes" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: content.changes.heading,
                  cardData: content.changes.cardDataMobile
                }}
              />
            </div>
          {:else if index == 2}
            <div id="planFuture" class="bg-white text-black">
              <TwoColumnWithImage
                contents={content.planFuture}
              >
                <p>
                  {content.planFuture.para}
                </p>
              </TwoColumnWithImage>
            </div>
          {:else if index == 3}
            <div id="banking" class="bg-white text-black">
              <TwoColumnWithImage
                contents={content.banking}
              >
                <ul class="space-y-4 typography-body-md text-[var(--form-text-secondary)]">
                  {#each content.banking.bulletsMobile as bullet}
                    <li class="flex flex-col gap-2">
                      <span class="typography-h3 font-semibold text-text-main">{@html bullet.title}</span>
                      <p>
                        {@html bullet.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </TwoColumnWithImage>
            </div>
          {:else if index == 4}
            <div id="support" class="bg-white text-black">
              <TwoColumnWithImage
                contents={content.support}
              >
                <p>
                  {content.support.para}
                </p>
                <div class="w-full lg:w-auto">
                  <Button
                    link="mailto:support@digitaldsa.com"
                    btnBorder="#4F4C4D"
                    btnName="Contact us"
                  />
                </div>
              </TwoColumnWithImage>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <!-- help  -->
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
