<script>
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Seo from "./Seo.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import content from "$lib/data/website/privacyPolicy.json";

  let pageData = content.pageData;
  let subList = content.subList;
  let navBarMedium = content.navBarMedium;
  let aboutPrivacy = content.aboutPrivacy;
  let accumulationInformation = content.accumulationInformation;
  let dataProcessing = content.dataProcessing;
  let usageInformation = content.usageInformation;
  let disclosure = content.disclosure;
  let privacyRight = content.privacyRight;
  let navigatingBeyond = content.navigatingBeyond;
  let amendments = content.amendments;

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

  // logic for second nav bar which is not working yet
  let activeSection = ""; // Initially no section is active

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
  type="WebPage"
  title={content.seo.title}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section>
  <PageFullTextDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection} />
      <div class="lg:px-[4rem]">
        <div
          class="border-b border-dividerColor"
          id="aboutPrivacy"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={aboutPrivacy} />
        </div>
        <div id="dataProcessing" data-section="aboutPrivacy">
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={dataProcessing} disc="list-disc" />
          </div>
          <div class="border-b border-dividerColor">
            <ThingsYouShould
              thinkKnow={accumulationInformation}
              disc="list-disc"
            />
          </div>
        </div>
        <div
          class="border-b border-dividerColor"
          id="usage"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={usageInformation} disc="list-disc" />
        </div>
        <div
          class="border-b border-dividerColor"
          id="disclosure"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={disclosure} disc="list-disc" />
        </div>
        <div
          class="border-b border-dividerColor"
          id="right"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={privacyRight} disc="list-disc" />
        </div>
        <div id="navigation" data-section="aboutPrivacy">
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={navigatingBeyond} disc="list-disc" />
          </div>
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={amendments} disc="list-disc" />
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div class="bg-white text-black" id="aboutPrivacy">
              <ThingsYouShould thinkKnow={aboutPrivacy} />
            </div>
          {:else if index == 1}
            <div id="dataProcessing" class="bg-white text-black">
              <div class="border-b border-dividerColor">
                <ThingsYouShould thinkKnow={dataProcessing} disc="list-disc" />
              </div>
              <div class="">
                <ThingsYouShould
                  thinkKnow={accumulationInformation}
                  disc="list-disc"
                />
              </div>
            </div>
          {:else if index == 2}
            <div class="bg-white text-black" id="usage">
              <ThingsYouShould thinkKnow={usageInformation} disc="list-disc" />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black" id="disclosure">
              <ThingsYouShould thinkKnow={disclosure} disc="list-disc" />
            </div>
          {:else if index == 4}
            <div class="bg-white text-black" id="right">
              <ThingsYouShould thinkKnow={privacyRight} disc="list-disc" />
            </div>
          {:else if index == 5}
            <div id="navigation" class="bg-white text-black">
              <div class="border-b border-dividerColor">
                <ThingsYouShould
                  thinkKnow={navigatingBeyond}
                  disc="list-disc"
                />
              </div>
              <div class="">
                <ThingsYouShould thinkKnow={amendments} disc="list-disc" />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>
