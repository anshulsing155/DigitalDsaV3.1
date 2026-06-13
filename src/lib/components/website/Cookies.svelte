<script>
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Payments from "./Payments.svelte";
  import { onMount } from "svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/cookies.json";

  let pageData = content.pageData;
  let subList = content.subList;
  let navBarMedium = content.navBarMedium;
  let cookies = content.cookies;
  let firstPartyCookies = content.firstPartyCookies;
  let thirdPartyCookies = content.thirdPartyCookies;
  let deleteCookies = content.deleteCookies;
  let help = content.help;

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
        <div
          id="cookies"
          class="border-b border-dividerColor"
          data-section="cookies"
        >
          <ThingsYouShould thinkKnow={cookies} />
        </div>

        <div
          data-section="firstPartyCookies"
          id="firstPartyCookies"
          class="py-[2rem] border-b border-[var(--form-border)]"
        >
          <Payments supportHeading="Different types of cookies">
            <div class="grid grid-cols-2 gap-[2rem]">
              {#each firstPartyCookies.types as type}
                <div class="flex flex-col col-span-1 gap-[2rem]">
                  <h2 class="typography-h3 font-semibold text-text-main">
                    {type.title}
                  </h2>
                  <p>
                    {type.desc}
                  </p>
                </div>
              {/each}
            </div>
          </Payments>
        </div>

        <div
          data-section="thirdPartyCookies"
          id="thirdPartyCookies"
          class="border-b border-dividerColor"
        >
          <ThingsYouShould thinkKnow={thirdPartyCookies} disc="list-disc">
            <ul slot="list" class="list-disc ml-5">
              {#each thirdPartyCookies.links as link}
                <a class="underline underline-offset-4 hover:no-underline" href={link.url}><li>{link.name}</li></a>
              {/each}
            </ul>
          </ThingsYouShould>
        </div>

        <div id="deleteCookies" data-section="deleteCookies" class="py-[2rem]">
          <Payments supportHeading={deleteCookies.heading}>
            <div class="flex flex-col gap-[2rem]">
              {#each deleteCookies.subPara.slice(0, 3) as paragraph}
                <p>{paragraph}</p>
              {/each}
              <p>{deleteCookies.subPara[3]}</p>
              {#each deleteCookies.browserInstructions as browser}
                <div class="flex flex-col gap-4">
                  <h2 class="typography-h3 font-semibold text-text-main">{browser.heading}</h2>
                  <div class="flex flex-col gap-4">
                    <p>{@html browser.para}</p>
                    <p>
                      For more instructions visit <span
                        class="underline underline-offset-4 hover:no-underline"
                        ><a href={browser.link.url}>{browser.link.text}</a></span
                      >.
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </Payments>
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
            <div id="cookies" class="text-black bg-white">
              <ThingsYouShould thinkKnow={cookies} />
            </div>
          {:else if index == 1}
            <div
              id="firstPartyCookies"
              class="text-black bg-white px-[0.5rem]"
            >
              <Payments supportHeading="Different types of cookies">
                <div class="grid md:grid-cols-2 gap-[2rem]">
                  {#each firstPartyCookies.types as type}
                    <div class="flex flex-col col-span-1 gap-[2rem]">
                      <h2 class="typography-h3 font-semibold text-text-main">
                        {type.title}
                      </h2>
                      <p>
                        {type.desc}
                      </p>
                    </div>
                  {/each}
                </div>
              </Payments>
            </div>
          {:else if index == 2}
            <div id="thirdPartyCookies" class="text-black bg-white">
              <ThingsYouShould thinkKnow={thirdPartyCookies} disc="list-disc">
                <ul slot="list" class="list-disc ml-5">
                  {#each thirdPartyCookies.links as link}
                    <a class="underline underline-offset-4 hover:no-underline" href={link.url}><li>{link.name}</li></a>
                  {/each}
                </ul>
              </ThingsYouShould>
            </div>
          {:else if index == 3}
            <div
              id="deleteCookies"
              class="text-black bg-white px-[0.5rem]"
            >
              <Payments supportHeading={deleteCookies.heading}>
                <div class="flex flex-col gap-[2rem]">
                  {#each deleteCookies.subPara.slice(0, 3) as paragraph}
                    <p>{paragraph}</p>
                  {/each}
                  <p>{deleteCookies.subPara[3]}</p>
                  {#each deleteCookies.browserInstructions as browser}
                    <div class="flex flex-col gap-2">
                      <h2 class="typography-h3 font-semibold text-text-main">
                        {browser.heading}
                      </h2>
                      <div class="flex flex-col py-[1rem] gap-4">
                        <p>{@html browser.para}</p>
                        <p>
                          For more instructions visit <span
                            class="underline underline-offset-4 hover:no-underline"
                            ><a href={browser.link.url}>{browser.link.text}</a></span
                          >.
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </Payments>
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>
