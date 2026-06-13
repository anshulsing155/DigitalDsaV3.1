<script>
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/termsConditions.json";

  let pageData = content.pageData;
  let subList = content.subList;
  let navBarMedium = content.navBarMedium;
  let explore = content.explore;
  let responsibilities = content.responsibilities;
  let eligibility = content.eligibility;
  let dataResponsibilities = content.dataResponsibilities;
  let submission = content.submission;
  let limitation = content.limitation;
  let online = content.online;
  let compliance = content.compliance;
  let communication = content.communication;
  let posting = content.posting;
  let externalLink = content.externalLink;
  let changes = content.changes;
  let intellectual = content.intellectual;
  let continued = content.continued;
  let standard = content.standard;
  let indemnification = content.indemnification;

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
      <div class="px-[2rem] lg:px-[4rem]">
        <div id="explore" data-section="explore">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={explore} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={responsibilities} disc="list-disc" />
          </div>
        </div>
        <div id="restriction" data-section="restriction">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={eligibility} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould
              thinkKnow={dataResponsibilities}
              disc="list-disc"
            />
          </div>
        </div>
        <div id="submission" data-section="submission">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={submission} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={limitation} disc="list-disc" />
          </div>
        </div>
        <div id="online" data-section="online">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={online} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={compliance} disc="list-disc" />
          </div>
        </div>
        <div id="communication" data-section="communication">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={communication} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={posting} disc="list-disc" />
          </div>
        </div>
        <div id="externalLink" data-section="externalLink">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={externalLink} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={changes} disc="list-disc" />
          </div>
        </div>
        <div id="intellectual" data-section="intellectual">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={intellectual} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={continued} disc="list-disc" />
          </div>
        </div>
        <div id="standard" data-section="standard">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={standard} disc="list-disc" />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={indemnification} disc="list-disc" />
          </div>
        </div>
      </div>
    </div>
    <div class="block lg:hidden">
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
          <div id="explore" data-section="explore" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={explore} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={responsibilities} disc="list-disc" />
            </div>
          </div>
          {:else if index == 1}
          <div id="restriction" data-section="restriction" class="bg-white text-black" >
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={eligibility} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould
                thinkKnow={dataResponsibilities}
                disc="list-disc"
              />
            </div>
          </div>
          {:else if index == 2}
          <div id="submission" data-section="submission" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={submission} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={limitation} disc="list-disc" />
            </div>
          </div>
          {:else if index == 3}
          <div id="online" data-section="online" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={online} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={compliance} disc="list-disc" />
            </div>
          </div>
          {:else if index == 4}
          <div id="communication" data-section="communication" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={communication} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={posting} disc="list-disc" />
            </div>
          </div>
          {:else if index == 5}
          <div id="externalLink" data-section="externalLink" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={externalLink} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={changes} disc="list-disc" />
            </div>
          </div>
          {:else if index == 6}
          <div id="intellectual" data-section="intellectual" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={intellectual} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={continued} disc="list-disc" />
            </div>
          </div>
          {:else if index==7}
          <div id="standard" data-section="standard" class="bg-white text-black">
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={standard} disc="list-disc" />
            </div>
            <div class="border-b border-[var(--form-border)]">
              <ThingsYouShould thinkKnow={indemnification} disc="list-disc" />
            </div>
          </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>
