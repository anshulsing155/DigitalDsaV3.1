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
  import Anchor from "./Anchor.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/cyberSecurityScams.json";

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
      if (rect.top <= 100 && rect.bottom >= 200) {
        currentSection = section.id;
      }
    });

    if (currentSection) {
      activeSection = currentSection;
    }
  };

  function confirmRedirect(event, url) {
    // Prevent the default anchor link behavior
    event.preventDefault();

    // Show the confirmation prompt
    if (
      confirm(
        "You are about to leave this site and open an external page. Do you want to continue?"
      )
    ) {
      // Redirect to the external site if confirmed
      window.location.href = url;
    }
  }

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
        dispatch("pageData", content.pageData);
      }, 100); // Small delay to ensure DOM updates
    });
  });
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="content">
  <NewPageLayout pageData={content.pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.stickyNavBar}
        {activeSection}
      ></StickyNavbar>

      <div
        id="howProtect"
        data-section="howProtect"
        class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] lg:px-[4rem] gap-[2rem] pt-[4rem] pb-[8rem] border-b"
      >
        <div>
          <h2
            class="md:text-start typography-h2 text-text-main"
          >
            Protect yourself from scams
          </h2>
          <p class="typography-body-md text-[var(--form-text-secondary)] py-[1rem]">
            Remember three simple steps: <br><span class="font-semibold">
               Stop.   Check.  Reject.
            </span>
          </p>
        </div>
        <div class="col-span-2 space-y-4">
          {#each content.stopCheckReject as item, index}
            <div class="grid grid-cols-12">
              <p
                class="w-[1.5rem] h-[1.5rem] sm:w-[2rem] sm:h-[2rem] border rounded-full flex justify-center items-center bg-black text-white"
              >
                {index + 1}
              </p>
              <div class="col-span-11">
                <p>
                  <span class="font-semibold">
                    {item.title}-
                  </span>
                  {item.para}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div id="protectbusiness" data-section="protectbusiness">
        <div>
          <TwoColumnWithImage
            contents={content.messageUs}
          >
            <p class="font-semibold typography-body-md">
              Stay one step ahead of scams
            </p>
            <p>
              Cybercriminals may try and scam your business through email, text
              messages, phone calls and social media. They will often pretend to
              be a person or organisation you trust. We will never ask you to
              transfer funds, share your screen or reveal your passwords.
            </p>
            <Button
              btnName="Scams that target businesses"
              link="/cyber-security-against-scams/scam-target-business"
            />
          </TwoColumnWithImage>
        </div>
        <div
          class="pt-[4rem] pb-[8rem] border-b px-[0.5rem] lg:px-[4rem] space-y-6"
        >
          <h2
            class="md:text-start typography-h2 text-text-main"
          >
            4 ways to safeguard your business
          </h2>
          <div class="grid md:grid-cols-2 gap-[1rem]">
            {#each content.safeguardWays as item, index}
              <a href={item.link}>
                <div
                  class="border flex p-8 shadow-md hover:shadow-xl gap-[2rem]"
                >
                  <img src={item.icons} alt={item.altIcons} class="h-10" />
                  <h3>{item.title}</h3>
                </div></a
              >
            {/each}
          </div>
        </div>
      </div>

      <div
        id="resources"
        data-section="resources"
        class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] lg:px-[4rem] pt-[4rem] pb-[6rem] border-b gap-[2rem]"
      >
        <h2
          class="md:text-start typography-h2 text-text-main"
        >
          More resources for your business
        </h2>
        <div class="col-span-2">
          {#each content.moreResources as itemObj, index}
            <div
              class="flex flex-col md:flex-row gap-[2rem] {content.moreResources.length > index + 1 ? 'border-b' : ''} py-[2rem]"
            >
              <img src={itemObj.image} alt={itemObj.alt} class="h-[8rem]" />
              <div class="flex flex-col gap-[2rem]">
                <h2 class="font-semibold typography-h3">
                  {itemObj.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {itemObj.para}
                </p>
                <Anchor
                  link={itemObj.link}
                  linkName={itemObj.linkName}
                  onClick={(event) => confirmRedirect(event, itemObj.link)}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each content.navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="howProtect" class="bg-white text-black">
              <div
                class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] gap-[2rem] py-[4rem] border-b"
              >
                <div class="space-y-[2rem]">
                  <h2
                    class="md:text-start typography-h2 text-text-main"
                  >
                    Protect your business from scams
                  </h2>
                  <p class="typography-body-sm text-[var(--form-text-secondary)]">
                    Remember three simple <span class="font-semibold">
                      steps: Stop. Check. Reject.
                    </span>
                  </p>
                </div>
                <div class="col-span-2 space-y-4">
                  <h2 class="typography-h3 font-semibold">Stop. Check. Reject.</h2>

                  {#each content.stopCheckReject as item, index}
                    <div class="grid grid-cols-12">
                      <p
                        class="w-[1.5rem] h-[1.5rem] sm:w-[2rem] sm:h-[2rem] border rounded-full flex justify-center items-center bg-black text-white"
                      >
                        {index + 1}
                      </p>
                      <div class="col-span-11">
                        <p>
                          <span class="font-semibold">
                            {item.title}-
                          </span>
                          {item.para}
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="protectbusiness" class="bg-white text-black">
              <div>
                <TwoColumnWithImage
                  contents={content.messageUs}
                >
                  <p class="font-semibold typography-body-md">
                    Stay one step ahead of scams
                  </p>
                  <p>
                    Cybercriminals may try and scam your business through email,
                    text messages, phone calls and social media. They will often
                    pretend to be a person or organisation you trust. We will
                    never ask you to transfer funds, share your screen or reveal
                    your passwords.
                  </p>
                  <Button
                    btnName="Scams that target businesses"
                    link="/cyber-security-against-scams/scam-target-business"
                  />
                </TwoColumnWithImage>
              </div>
              <div
                class="py-[4rem] px-[0.5rem] space-y-6"
              >
                <h2
                  class="md:text-start typography-h2 text-text-main"
                >
                  4 ways to safeguard your business
                </h2>
                <div class="grid md:grid-cols-2 gap-[1rem]">
                  {#each content.safeguardWays as item, index}
                    <a href={item.link}>
                      <div
                        class="border flex p-8 shadow-md hover:shadow-xl gap-[2rem]"
                      >
                        <img
                          src={item.icons}
                          alt={item.altIcons}
                          class="h-10"
                        />
                        <h3>{item.title}</h3>
                      </div></a
                    >
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 2}
            <div id="resources" class="bg-white text-black">
              <div
                class="flex flex-col px-[0.5rem] py-[4rem] gap-[2rem]"
              >
                <h2
                  class="md:text-start typography-h2 text-text-main"
                >
                  More resources for your business
                </h2>
                <div class="col-span-2">
                  {#each content.moreResources as itemObj, index}
                    <div
                      class="flex flex-col md:flex-row gap-[2rem] {content.moreResources.length > index + 1 ? 'border-b' : ''} py-[2rem]"
                    >
                      <img
                        src={itemObj.image}
                        alt={itemObj.alt}
                        class="h-[8rem]"
                      />
                      <div class="flex flex-col gap-[2rem]">
                        <h2 class="font-semibold typography-h3">
                          {itemObj.heading}
                        </h2>
                        <p class="typography-body-sm text-[var(--form-text-secondary)]">
                          {itemObj.para}
                        </p>
                        <Anchor
                          link={itemObj.link}
                          linkName={itemObj.linkName}
                          onClick={(event) =>
                            confirmRedirect(event, itemObj.link)}
                        />
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage
      contents={content.messageUs}
    >
      <p>
        {content.messageUs.para}
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
      <HelpList
        contents={content.help}
      />
      <ThingsYouShould
        thinkKnow={content.thingsYouShould}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>

<div class="w-2/3">
  <div class="flex flex-col gap-6"></div>
</div>
