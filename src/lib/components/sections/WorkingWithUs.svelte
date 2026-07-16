<script>
  import NewPageLayout from '../layout/NewPageLayout.svelte';
  import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
  import ThingsYouShould from './ThingsYouShould.svelte';
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import { onMount } from "svelte";
  import Seo from '../layout/Seo.svelte';
  import content from "$lib/data/website/workingWithUs.json";
  	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';

  const { seo, pageData, stickyNavBar, navBarMedium, purpose, coreValues, philosophy, peoplePromise, codeOfTrust, leadership } = content;


  
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
        <ThingsYouShould thinkKnow={purpose} containerClass="px-0" />
      </div>
      <div id="core" data-section="core">
        <AboveTitleWithTopIconCard contents={coreValues} isBorder />
      </div>
      <div id="philosophy" data-section="philosophy">
        <AboveTitleWithTopIconCard contents={philosophy} isBorder />
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
          <ThingsYouShould thinkKnow={codeOfTrust} containerClass="px-0"  />
        </div>
      </div>
      <div id="leadership" data-section="leadership">
        <AboveTitleWithTopIconCard contents={leadership} isBorder />
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
              <ThingsYouShould thinkKnow={purpose} containerClass="px-0" />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithTopIconCard contents={coreValues} paddingClass="px-0" />
            </div>
          {:else if index == 2}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] ">
              <AboveTitleWithTopIconCard contents={philosophy} paddingClass="px-0" />
            </div>
          {:else if index == 3}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)] px-[0.5rem] ">
              <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]  w-full border-b border-[var(--form-border)]">
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
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)">
              <ThingsYouShould thinkKnow={codeOfTrust} />
            </div>
          {:else if index === 5}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithTopIconCard contents={leadership}  isBorder/>
            </div>
          {/if}
        </details>
      {/each}
    </div>


    <div class="px-[0.5rem] py-[2rem] lg:px-[4rem] typography-body-md lg:py-[4rem] space-y-2 lg:text-center text-[var(--form-text-secondary)]">
      <h3 class="">
        We’re not just offering a job—we’re inviting you to be part of a
        <span class="font-semibold">fintech revolution</span>.
        <br /> Are you ready to shape the future of
        <span class="font-semibold"> finance with us? </span> 🚀
      </h3>
    </div>
  </NewPageLayout>
</section>
