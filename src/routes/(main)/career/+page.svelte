<script lang="ts">
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Payments from "$lib/components/website/Payments.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import content from "$lib/data/website/career.json";

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

<section class="mx-auto w-full content">
  <PageDesign
    pageData={{
      coverImage: "/images/DigitalDSA-office-colleagues.jpg",
      coverAlt: "photo of office colleagues at DigitalDSA",
      sourceName:"Freepik",
      originalSource:"www.freepik.com",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
      heroHeading: "Careers with DigitalDSA ",
      heroParagraph: `Join us in transforming the financial ecosystem!`,
      // actionBtn: [
      //   {
      //     firstBtn: "Search & apply now",
      //     link: "",
      //     btnColor: "#ffcc00",
      //   },
      // ],
    }}
  >
    <!-- <div class="">
      <Ways
        ways={{
          para: `At DigitalDSA, we empower professionals to grow and innovate in loans, insurance, and investments. Whether experienced or new, seize opportunities to excel, make an impact, and shape the future of financial services.`,
          btnName: `Apply now`,
          btnColor: `#ffcc00`,
          btnBorder: `#ffcc00`,
          btnLink: "/finance-support",
        }}
      />
    </div> -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      />
    </div>

    <div class="px-[0.5rem] lg:px-16">
      <div class="hidden lg:block">
        <div id="businessArea" data-section="businessArea" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.youAtDigitalDsa.cardImage}
              cardAltName={content.youAtDigitalDsa.cardAltName}
              cardHeading={content.youAtDigitalDsa.cardHeading}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <li class="grid gap-4">
                  <p>
                    {content.youAtDigitalDsa.para}
                  </p>

                  {#each content.youAtDigitalDsa.bullets as bullet}
                    <div class="flex gap-2 items-start justify-start">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-[1.2rem] mt-2"
                      />

                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                          >{bullet.title}
                        </span> {bullet.desc}
                      </p>
                    </div>
                  {/each}
                </li>
              </ul>
            </TwoColumn>
          </div>

          <div
            class="py-[4rem] border-b border-dividerColor grid grid-cols-12 gap-[4rem] justify-between items-start"
          >
            <div class="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <h2
                class="typography-h2 text-[var(--form-text)]"
              >
                {content.workAreas.heading}
              </h2>
              <p class="typography-body-md text-[var(--form-text-secondary)]">
                {content.workAreas.para}
              </p>
            </div>
            <div
              class="grid grid-cols-2 gap-4 lg:gap-[2rem] col-span-12 lg:col-span-8"
            >
              {#each content.workAreas.roles as role}
                <div
                  class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p class="typography-h4 text-[var(--form-text)]">{role}</p>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div id="rewards" data-section="rewards" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.rewardsAndBenefits.cardImage}
              cardAltName={content.rewardsAndBenefits.cardAltName}
              cardHeading={content.rewardsAndBenefits.cardHeading}
            >
              <ul
                class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-4"
                slot="list"
              >
                <p>{content.rewardsAndBenefits.para}</p>
                <div class="flex flex-col space-y-10">
                  {#each content.rewardsAndBenefits.bullets as bullet}
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                        >{bullet.title}
                      </span>{bullet.desc}
                    </p>
                  {/each}
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="diversity" data-section="diversity" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.diversityAndInclusion.cardImage}
              cardAltName={content.diversityAndInclusion.cardAltName}
              cardHeading={content.diversityAndInclusion.cardHeading}
              reverse={true}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <p>{content.diversityAndInclusion.para}</p>
                <div class="flex flex-col space-y-10">
                  {#each content.diversityAndInclusion.bullets as bullet}
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                        >{bullet.title}
                      </span>{bullet.desc}
                    </p>
                  {/each}
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="graduates" data-section="graduates" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.graduates.cardImage}
              cardAltName={content.graduates.cardAltName}
              cardHeading={content.graduates.cardHeading}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <p>{content.graduates.para}</p>
                <div class="flex flex-col space-y-10">
                  {#each content.graduates.bullets as bullet}
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-[var(--form-text)]">{bullet.title}</span>{bullet.desc}
                    </p>
                  {/each}
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="appInfo" data-section="appInfo" class="pb-[2rem]">
          <div class="">
            <Payments supportHeading={content.awardsAndRecognition.supportHeading}>
              <div slot="para">{content.awardsAndRecognition.para}</div>
              <div class="col-span-2 grid space-y-10">
                {#each content.awardsAndRecognition.bullets as bullet}
                  <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                    <span class="typography-body-lg !font-semibold text-[var(--form-text)] not-italic"
                      >{bullet.title}
                    </span>{bullet.desc}
                  </p>
                {/each}
              </div>
            </Payments>
          </div>
        </div>
      </div>
    </div>

    <div class="lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-[var(--form-bg)] text-[var(--form-text)] {index < content.navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="typography-h3 text-[var(--form-text)]">{list}</h2>
              <div class="icon-container justify-self-end text-[var(--form-text-secondary)] text-lg">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="businessArea"
              class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--form-text)] px-[.5rem]"
            >
              <div class="border-b border-dividerColor">
                <TwoColumn
                  cardImage={content.youAtDigitalDsa.cardImage}
                  cardAltName={content.youAtDigitalDsa.cardAltName}
                  cardHeading={content.youAtDigitalDsa.cardHeading}
                >
                  <ul
                    class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <li class="grid gap-4">
                      <p>
                        {content.youAtDigitalDsa.para}
                      </p>

                      {#each content.youAtDigitalDsa.bullets as bullet}
                        <div class="flex gap-2 items-start justify-start">
                          <img
                            src="/icons/circle-check.svg"
                            alt="circle-check"
                            class="h-[1.2rem] mt-2"
                          />

                          <p class="typography-body-md text-[var(--form-text-secondary)]">
                            <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                              >{bullet.title}
                            </span> {bullet.desc}
                          </p>
                        </div>
                      {/each}
                    </li>
                  </ul>
                </TwoColumn>
              </div>
              <div
                class="pt-[4rem] border-b border-dividerColor grid lg:grid-cols-12 gap-[2rem] lg:gap-[4rem] justify-between items-start"
              >
                <div class="lg:col-span-4 flex flex-col gap-4">
                  <h2
                    class="typography-h2 text-[var(--form-text)]"
                  >
                    Our Business Areas
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    {content.workAreas.paraMobile}
                  </p>
                </div>
                <div
                  class="grid grid-cols-2 gap-4 lg:gap-[2rem] lg:col-span-8"
                >
                  {#each content.workAreas.rolesMobile as role}
                    <div
                      class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <p class="typography-h4 text-[var(--form-text)]">
                        {role}
                      </p>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="rewards" class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--form-text)] px-[.5rem]">
              <TwoColumn
                cardImage={content.rewardsAndBenefits.cardImage}
                cardAltName={content.rewardsAndBenefits.cardAltName}
                cardHeading={content.rewardsAndBenefits.cardHeading}
              >
                <ul
                  class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-4"
                  slot="list"
                >
                  <p>{content.rewardsAndBenefits.para}</p>
                  <div class="flex flex-col">
                    {#each content.rewardsAndBenefits.bullets as bullet}
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                          >{bullet.title}
                        </span>{bullet.desc}
                      </p>
                    {/each}
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 2}
            <div
              id="diversity"
              class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--form-text)] px-[.5rem]"
            >
              <TwoColumn
                cardImage={content.diversityAndInclusion.cardImage}
                cardAltName={content.diversityAndInclusion.cardAltName}
                cardHeading={content.diversityAndInclusion.cardHeading}
                reverse={true}
              >
                <ul
                  class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                  slot="list"
                >
                  <p>{content.diversityAndInclusion.paraMobile}</p>
                  <div class="flex flex-col">
                    {#each content.diversityAndInclusion.bullets as bullet}
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        <span class="typography-body-lg !font-semibold text-[var(--form-text)]"
                          >{bullet.title}
                        </span>{bullet.desc}
                      </p>
                    {/each}
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 3}
            <div
              class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--form-text)] px-[.5rem]"
              id="graduates"
            >
              <TwoColumn
                cardImage={content.graduates.cardImage}
                cardAltName={content.graduates.cardAltName}
                cardHeading={content.graduates.cardHeading}
              >
                <ul
                  class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                  slot="list"
                >
                  <p>{content.graduates.para}</p>
                  <div class="flex flex-col">
                    {#each content.graduates.bullets as bullet}
                      <p class="typography-body-md text-[var(--form-text-secondary)]">
                        <span class="typography-body-lg !font-semibold text-[var(--form-text)]">{bullet.title} </span>{bullet.desc}
                      </p>
                    {/each}
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 4}
            <div class="bg-[var(--landing-bg)] text-[var(--form-text)] px-[.5rem]" id="appInfo">
              <Payments supportHeading={content.awardsAndRecognition.supportHeading}>
                <div slot="para">
                  {content.awardsAndRecognition.para}
                </div>
                <div class="grid">
                  {#each content.awardsAndRecognition.bullets as bullet}
                    <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                      <span class="typography-body-lg !font-semibold text-[var(--form-text)] not-italic"
                        >{bullet.title}
                      </span>{bullet.desc}
                    </p>
                  {/each}
                </div>
              </Payments>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary" >
      <HelpList
        contents={content.help}
      />
    </div>
  </PageDesign>
</section>

<style>
</style>
