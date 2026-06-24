<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Seo from "$lib/components/Seo.svelte";
  import content from "$lib/data/website/workingWithUs.json";

  const { seo, pageData, stickyNavBar, navBarMedium, purpose, coreValues, philosophy, peoplePromise, codeOfTrust, leadership } = content;

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
</script>

<Seo
  type={seo.type}
  image={seo.image}
  title={seo.title}
  description={seo.description}
/>

<section>
  <NewPageLayout pageData={pageData}>
    <div class="hidden lg:block">
      <div>
        <StickyNavbar navList={stickyNavBar} {activeSection} />
      </div>
      <div
        id="purpose"
        data-section="purpose"
        class="border-b border-[var(--form-border)] lg:px-[4rem]"
      >
        <ThingsYouShould thinkKnow={purpose} />
      </div>
      <div id="core" data-section="core">
        <AboveTitleWithTopIconCard contents={coreValues} />
      </div>
      <div id="philosophy" data-section="philosophy">
        <AboveTitleWithTopIconCard contents={philosophy} />
      </div>
      <div id="people" data-section="people">
        <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[1rem] mb-[1rem]">
            <h2 class="typography-h2 text-[var(--form-text)]">{peoplePromise.heading}</h2>
            <p class="typography-body-sm text-[var(--form-text-secondary)]">
              {peoplePromise.para}
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full border border-[var(--form-border)] rounded-lg shadow-lg text-left font-semibold typography-body-sm text-[var(--landing-text)]">
              <thead>
                <tr class="bg-[var(--landing-bg-deep)] grid grid-cols-2 text-center">
                  <th class="py-3 px-4 border-r border-[var(--form-border)]">{peoplePromise.tableHeader.left}</th>
                  <th class="py-3 px-4">{peoplePromise.tableHeader.right}</th>
                </tr>
              </thead>
              <tbody>
                {#each peoplePromise.tableData as item, i}
                  <tr class="border-b border-[var(--form-border)] grid grid-cols-2 divide-x divide-[var(--form-border)] {i % 2 === 0 ? 'bg-[var(--landing-bg-deep)]' : 'bg-[var(--landing-bg-card)]'}" >
                    {#each item as val}
                      <td class="py-4 px-4 border-[var(--form-border)]">{val}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="code" data-section="code">
        <div class="border-b border-[var(--form-border)] lg:px-[4rem]">
          <ThingsYouShould thinkKnow={codeOfTrust} />
        </div>
      </div>
      <div id="leadership" data-section="leadership">
        <AboveTitleWithTopIconCard contents={leadership} />
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
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <ThingsYouShould thinkKnow={purpose} />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)] px-2">
              <AboveTitleWithTopIconCard contents={coreValues} />
            </div>
          {:else if index == 2}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]" px-2">
              <AboveTitleWithTopIconCard contents={philosophy} />
            </div>
          {:else if index == 3}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]" px-2">
              <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[1rem] mb-[1rem]">
                  <h2 class="typography-h2 text-[var(--form-text)]">{peoplePromise.heading}</h2>
                  <p class="typography-body-sm text-[var(--form-text-secondary)]">
                    {peoplePromise.para}
                  </p>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full border border-[var(--form-border)] rounded-lg shadow-lg text-left font-semibold typography-body-sm text-[var(--landing-text)]">
                    <thead>
                      <tr class="bg-[var(--landing-bg-deep)] grid grid-cols-2 text-center">
                        <th class="py-3 px-4 border-r border-[var(--form-border)]">{peoplePromise.tableHeader.left}</th>
                        <th class="py-3 px-4">{peoplePromise.tableHeader.right}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each peoplePromise.tableData as item, i}
                        <tr class="border-b border-[var(--form-border)] grid grid-cols-2 divide-x divide-[var(--form-border)] {i % 2 === 0 ? 'bg-[var(--landing-bg-deep)]' : 'bg-[var(--landing-bg-card)]'}">
                          {#each item as val}
                            <td class="py-4 px-4 border-[var(--form-border)]">{val}</td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          {:else if index === 4}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]" px-2">
              <ThingsYouShould thinkKnow={codeOfTrust} />
            </div>
          {:else if index === 5}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]" px-2">
              <AboveTitleWithTopIconCard contents={leadership} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div class="px-[0.5rem] py-[2rem] lg:px-[4rem] typography-body-md lg:py-[4rem] space-y-2 lg:text-center">
      <h3 class="">
        We’re not just offering a job—we’re inviting you to be part of a
        <span class="font-semibold">fintech revolution</span>.
        <br /> Are you ready to shape the future of
        <span class="font-semibold"> finance with us? </span> 🚀
      </h3>
    </div>
  </NewPageLayout>
</section>
