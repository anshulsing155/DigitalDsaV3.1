<script>
  import NewPageLayout from '../layout/NewPageLayout.svelte';
  import ThingsYouShould from './ThingsYouShould.svelte';
  import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import { onMount } from "svelte";
  import Seo from '../layout/Seo.svelte';
  import content from "$lib/data/website/careerFAQ.json";
  import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';


  const { seo, pageData, stickyNavBar, navBarMedium, thinkYouShouldKnow, hiring, opening, process, checks, faq } = content;

 
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
        <AboveTitleWithoutIconCard contents={hiring} isBorder />
      </div>
      
      <div id="opening" data-section="opening">
        <AboveTitleWithoutIconCard contents={opening} isBorder />
      </div>
      
      <div id="process" data-section="process">
        <AboveTitleWithoutIconCard contents={process} isBorder />
      </div>
      
      <div id="checks" data-section="checks">
        <AboveTitleWithoutIconCard contents={checks} isBorder />
      </div>
      
      <div id="faq" data-section="faq">
        <AboveTitleWithoutIconCard contents={faq} isBorder/>
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}" >

          	<summary
						class="bg-ddsa-gradient-primary col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem] text-white"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label">{list}</h2>
							<div class="justify-self-end">
								<ChevronDown class="faq-icon transition-transform duration-300" />
							</div>
						</div>
					</summary>

          {#if index == 0}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithoutIconCard contents={hiring} />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithoutIconCard contents={opening} />
            </div>
          {:else if index == 2}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithoutIconCard contents={process} />
            </div>
          {:else if index == 3}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithoutIconCard contents={checks} />
            </div>
          {:else if index === 4}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithoutIconCard contents={faq} isBorder />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    
 <div class="px-[0.5rem] py-[2rem] lg:px-[4rem] typography-body-md lg:py-[4rem] space-y-2 lg:text-center text-[var(--form-text-secondary)]">
      <h4>
        If you have more questions, reach out to us at <span class="font-semibold">careers@digitaldsa.com</span>.
      </h4>
      <h4>
        We’re excited to have you join <span class="font-semibold">DigitalDSA – A Fintech Revolution! 🚀</span>
      </h4>
    </div>
  </NewPageLayout>
</section>
