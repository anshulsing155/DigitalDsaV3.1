<script>
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import FeedbackForm from "./FeedbackForm.svelte";
  import { onMount } from "svelte";
  import { feedbackYes } from "$lib/stores/stores";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import content from "$lib/data/website/complaintCompliments.json";

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

  let activeSection = $state(''); // Initially no section is active
  let showFeedback = false;

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

  function scrollToFeedback(id) {
    setTimeout(() => {
      const section = document.getElementById(id);

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200); // Give a short delay to ensure rendering
  }

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

<section class="">
  <NewPageLayout
    pageData={content.pageData}
  >
    <div class="w-full hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      />

      <div class="px-4 pt-5 lg:px-16">
        <div class="pb-8" id="makeComplaint" data-section="makeComplaint">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.makeComplaint.cardImage}
              cardAltName={content.makeComplaint.cardAltName}
              cardHeading={content.makeComplaint.cardHeading}
              reverse
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <li>
                  {content.makeComplaint.para}
                </li>

                <div class="w-auto">
                  <button
                    type="button"
                    onclick={() => {
                      $feedbackYes = 2;
                      scrollToFeedback("feedForm");}}
                    class="btn btn-primary typography-button text-black w-full md:w-auto"
                  >
                    {content.makeComplaint.btnText}
                  </button>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div class="pb-8" id="giveComplaint" data-section="giveComplaint">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={content.giveComplaint.cardImage}
              cardAltName={content.giveComplaint.cardAltName}
              cardHeading={content.giveComplaint.cardHeading}
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <li>
                  {content.giveComplaint.para}
                </li>

                <div class="w-auto">
                  <button
                    type="button"
                    onclick={() => {
                      $feedbackYes = 5;
                      scrollToFeedback("feedForm");}}
                    class="btn btn-primary typography-button text-black w-full md:w-auto"
                  >
                    {content.giveComplaint.btnText}
                  </button>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each content.mobileNavbarTitle as list, index}
        <details
          class="dropdown bg-darkColor col-span-3 text-[var(--form-text)] {index < content.mobileNavbarTitle.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
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
              class="pb-8 px-4 bg-white text-black"
              id="makeComplaint"
            >
              <div class="border-b border-dividerColor">
                <TwoColumn
                  cardImage={content.makeComplaint.cardImage}
                  cardAltName={content.makeComplaint.cardAltName}
                  cardHeading={content.makeComplaint.cardHeading}
                >
                  <ul
                    class="grid gap-4 md:gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <li>
                      {content.makeComplaint.para}
                    </li>

                    <div class="w-auto">
                      <button
                        type="button"
                        onclick={() => {
                          $feedbackYes = 2;
                          scrollToFeedback("feedback");}}
                        class="btn btn-primary typography-button text-black w-full md:w-auto"
                      >
                        {content.makeComplaint.btnText}
                      </button>
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            </div>
          {:else}
            <div
              class="pb-8 bg-white text-black px-4"
              id="giveComplaint"
            >
              <div>
                <TwoColumn
                  cardImage={content.giveComplaint.cardImage}
                  cardAltName={content.giveComplaint.cardAltName}
                  cardHeading={content.giveComplaint.cardHeading}
                >
                  <ul
                    class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <li>
                      {content.giveComplaint.para}
                    </li>

                    <div class="w-auto">
                      <div class="w-auto">
                        <button
                          type="button"
                          onclick={() => {
                            $feedbackYes = 5;
                            scrollToFeedback("feedback");}}
                          class="btn btn-primary typography-button text-black w-full md:w-auto"
                        >
                          {content.giveComplaint.btnText}
                        </button>
                      </div>
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div id="feedback" data-section="feedback" class="bg-white text-black px-4">
      <div
        class="flex flex-col gap-[3rem] bg-white pt-[4rem] pb-[8rem]"
        id="loans"
      >
        <div id="feedForm" class="text-center space-y-3 feedForm">
          <FeedbackForm />
        </div>
      </div>
    </div>
    <div slot="secondary" class="">
      <HelpList
        contents={content.help}
      />

      <ThingsYouShould
        thinkKnow={content.thingsYouShould}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
