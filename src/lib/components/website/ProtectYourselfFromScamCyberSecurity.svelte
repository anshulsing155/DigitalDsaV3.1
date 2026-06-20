<script>
  let {
    data
  } = $props();

  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import Payments from "./Payments.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/protectFromScams.json";

  const { seo, pageData, stickyNavBar, navBarMedium, commonScams, steps, protectingYourself, moreInfo, messageUs, help, thingsYouShould } = content;

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
        <AboveTitleWithTopIconCard contents={commonScams} />
        
        <div class="px-[4rem] border-b border-[var(--form-border)]">
          <Payments supportHeading="Remember 3 simple steps: Stop. Check. Reject.">
            <div class="grid gap-[2rem]">
              {#each steps as step}
                <div class="grid grid-cols-6 md:grid-cols-10 items-start gap-4">
                  <div class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white typography-label col-span-1">
                    {step.id}
                  </div>
                  <div class="flex flex-col gap-4 col-span-5 md:col-span-9">
                    <h2 class="typography-h3 text-[var(--form-text)]">{step.title}</h2>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">{step.desc}</p>
                  </div>
                </div>
              {/each}
            </div>
          </Payments>
        </div>
      </div>

      <div id="protecting" data-section="protecting">
        <AboveTitleWithoutIconCard contents={protectingYourself} />
      </div>
      
      <div class="px-[4rem] border-b border-[var(--form-border)]" id="information" data-section="information">
        <ThingsYouShould thinkKnow={moreInfo} />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each navBarMedium as list, index}
        <details class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}" >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-[var(--form-text)]">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
              <AboveTitleWithTopIconCard contents={commonScams} />
              <div class="border-b border-[var(--form-border)]">
                <Payments supportHeading="Remember 3 simple steps: Stop. Check. Reject.">
                  <div class="grid gap-[2rem]">
                    {#each steps as step}
                      <div class="grid grid-cols-6 md:grid-cols-10 items-start gap-4">
                        <div class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white typography-label col-span-1">
                          {step.id}
                        </div>
                        <div class="flex flex-col gap-4 col-span-5 md:col-span-9">
                          <h2 class="typography-h3 text-[var(--form-text)]">
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
              <ThingsYouShould thinkKnow={moreInfo} />
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

    <div slot="secondary">
      <HelpList contents={help} />
      <ThingsYouShould thinkKnow={thingsYouShould} disc="list-decimal" />
    </div>
  </NewPageLayout>
</section>
