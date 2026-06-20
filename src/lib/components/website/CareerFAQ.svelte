<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Seo from "$lib/components/Seo.svelte";
  import content from "$lib/data/website/careerFAQ.json";

  const { seo, pageData, stickyNavBar, navBarMedium, thinkYouShouldKnow, hiring, opening, process, checks, faq } = content;

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
  
  let activeSection = $state(""); // Initially no section is active

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
      if (rect.top <= 100 && rect.bottom >= 100) {
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
</script>

<Seo
  type={seo.type}
  image={seo.image}
  title={seo.title}
  description={seo.description}
  keywords={seo.keywords}
/>

<section>
  <NewPageLayout pageData={pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={stickyNavBar} {activeSection} />
      
      <div id="hiring" data-section="hiring">
        <AboveTitleWithoutIconCard contents={hiring} />
      </div>
      
      <div id="opening" data-section="opening">
        <AboveTitleWithoutIconCard contents={opening} />
      </div>
      
      <div id="process" data-section="process">
        <AboveTitleWithoutIconCard contents={process} />
      </div>
      
      <div id="checks" data-section="checks">
        <AboveTitleWithoutIconCard contents={checks} />
      </div>
      
      <div id="faq" data-section="faq">
        <AboveTitleWithoutIconCard contents={faq} />
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < navBarMedium.length - 1 ? 'border-b' : ''}" >
          <summary
            class="list-none px-2 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i> </span>
            </div>
          </summary>

          {#if index == 0}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithoutIconCard contents={hiring} />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)] px-2">
              <AboveTitleWithoutIconCard contents={opening} />
            </div>
          {:else if index == 2}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] px-2">
              <AboveTitleWithoutIconCard contents={process} />
            </div>
          {:else if index == 3}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] px-2">
              <AboveTitleWithoutIconCard contents={checks} />
            </div>
          {:else if index === 4}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] px-2">
              <AboveTitleWithoutIconCard contents={faq} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    
    <div class="px-[0.5rem] py-[2rem] lg:px-[4rem] typography-body-md lg:py-[4rem] space-y-2 lg:text-center">
      <h4>
        If you have more questions, reach out to us at <span class="font-semibold">careers@digitaldsa.com</span>.
      </h4>
      <h4>
        We’re excited to have you join <span class="font-semibold">DigitalDSA – A Fintech Revolution! 🚀</span>
      </h4>
    </div>
  </NewPageLayout>
</section>
