<script>
  let {
    data
  } = $props();

  import Button from '../ui/Button.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import NewPageLayout from '../layout/NewPageLayout.svelte';
  import TwoColumnWithImage from './TwoColumnWithImage.svelte';
  import HelpList from './HelpList.svelte';
  import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
  import Payments from '../features/calculators/Payments.svelte';
  import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
  import Seo from '../layout/Seo.svelte';
  import content from "$lib/data/website/protectFromScams.json";
  	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';


  const { seo, pageData, stickyNavBar, navBarMedium, commonScams, steps, protectingYourself, moreInfo, messageUs, help, thingsYouShould } = content;


  let activeSection = $state("");

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

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

  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  //send data child to parent
  const dispatch = createEventDispatcher();

  $effect(() => {
    onMount(() => {
      setTimeout(() => {
        const text = document.querySelector(".content")?.innerText || "";
        dispatch("textExtracted", text);
        dispatch("pageData", pageData);
      }, 100); // Small delay to ensure DOM updates
    });
  });
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={stickyNavBar}
        {activeSection}
      ></StickyNavbar>
      
      <div id="scamType" data-section="scamType" class="">
        <AboveTitleWithTopIconCard contents={commonScams} isBorder />
        
        <div class="px-[4rem] border-b border-[var(--form-border)]">
          <Payments supportHeading="Remember 3 simple steps: Stop. Check. Reject.">
            <div class="grid gap-[2rem]">
              {#each steps as step}
                <div class="grid grid-cols-6 md:grid-cols-10 items-start gap-4">
                  <div class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white typography-label col-span-1">
                    {step.id}
                  </div>
                  <div class="flex flex-col gap-4 col-span-5 md:col-span-9">
                    <h2 class="typography-body-md text-[var(--form-text)]">{step.title}</h2>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">{step.desc}</p>
                  </div>
                </div>
              {/each}
            </div>
          </Payments>
        </div>
      </div>

      <div id="protecting" data-section="protecting">
        <AboveTitleWithoutIconCard contents={protectingYourself} isBorder />
      </div>
      
      <div class=" border-b border-[var(--form-border)]" id="information" data-section="information">
        <ThingsYouShould thinkKnow={moreInfo} />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each navBarMedium as list, index}
        <details class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < list.length - 1 ? 'border-b border-[var(--form-border)]' : ''}" >
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
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithTopIconCard contents={commonScams} isBorder/>
              <div class="px-[0.5rem]">
                <Payments supportHeading="Remember 3 simple steps: Stop. Check. Reject.">
                  <div class="grid gap-[2rem]">
                    {#each steps as step}
                      <div class="grid grid-cols-6 md:grid-cols-10 items-start gap-4">
                        <div class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white typography-label col-span-1">
                          {step.id}
                        </div>
                        <div class="flex flex-col gap-4 col-span-5 md:col-span-9">
                          <h2 class="typography-body-md text-[var(--form-text)]">
                            {step.title}
                          </h2>
                          <p class="typography-body-md text-[var(--form-text-secondary)]">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    {/each}
                  </div>
                </Payments>
              </div>
            </div>
          {:else if index == 1}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithoutIconCard contents={protectingYourself} />
            </div>
          {:else if index == 2}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]" id="password">
              <ThingsYouShould thinkKnow={moreInfo}  />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage contents={messageUs}>
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    {#snippet secondary()}
       <HelpList contents={help} isBorder/>
      <ThingsYouShould thinkKnow={thingsYouShould} disc="list-decimal" containerClass="px-0" />
    {/snippet}
     
  </NewPageLayout>
</section>
