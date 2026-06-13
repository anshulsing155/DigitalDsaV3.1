<script lang="ts">
  import Guides from "$lib/components/website/Guides.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import PageFullTextDesign from "$lib/components/website/PageFullTextDesign.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import { onMount } from "svelte";
  import content from "$lib/data/website/importantInfo.json";

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
      activeSection = currentSection; 
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
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section>
  <PageFullTextDesign pageData={content.pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={{ items: content.navBarLarge }} {activeSection} />
    </div>

    <div class="hidden lg:block lg:px-[4rem]">
      <div data-section="FinancialServicesGuides" id="FinancialServicesGuides">
        <Guides guide={content.serviceGuide} />
      </div>
      <div
        data-section="ProductDisclosureStatements"
        id="ProductDisclosureStatements"
      >
        <Guides guide={content.disclosure} />
      </div>
      <div
        data-section="Productcategories"
        id="Productcategories"
        class="grid gap-[2rem] py-[4rem] pb-[8rem] lg:grid-cols-3"
      >
        <p class="text-nowrap typography-h2 text-[var(--form-text)]">
          Product Categories
        </p>
        <div class="col-span-2">
          <Support contents={content.contents} gridCol={2} />
        </div>
      </div>
    </div>

    <div class="lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="Financial Services Guides"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] px-[0.5rem]"
            >
              <Guides guide={content.serviceGuide} />
            </div>
          {:else if index == 1}
            <div
              id="Product Disclosure Statements"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] px-[0.5rem]"
            >
              <Guides guide={content.disclosure} />
            </div>
          {:else if index == 2}
            <div
              id="Product categories"
              class="grid gap-[2rem] px-[0.5rem] py-[2rem] lg:grid-cols-3 lg:px-0 bg-[var(--landing-bg)] text-[var(--form-text)]"
            >
              <p class="typography-h2 text-[var(--form-text)]">Product Categories</p>
              <div class="col-span-2">
                <Support contents={content.contents} gridCol={2} />
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
    </div>
  </PageFullTextDesign>
</section>
