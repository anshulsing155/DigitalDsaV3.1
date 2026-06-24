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
  import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';


 

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
      />

      <div
        id="howProtect"
        data-section="howProtect"
        class="flex flex-col lg:grid lg:grid-cols-3  gap-[2rem] py-[4rem] px-[0.5rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]  border-b border-[var(--form-border)]"
      >
        <div>
          <h2
            class="typography-h2-md text-[var(--form-text)]"
          >
            Protect yourself from scams
          </h2>
          <p class="typography-body-md text-[var(--form-text-secondary)] pt-[1rem]">
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
                <p class="typography-body-md text-[var(--form-text-secondary)]">
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
            isBorder
          >
          
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              Cybercriminals may try and scam your business through email, text
              messages, phone calls and social media. They will often pretend to
              be a person or organisation you trust. We will never ask you to
              transfer funds, share your screen or reveal your passwords.
            </p>
            <Button
              btnName="Scams that target businesses"
              link="/cyber-security-against-scams/scam-target-business"
              btnClass= "btn-primary w-full"
            />
          </TwoColumnWithImage>
        </div>
        <div
          class="pt-[4rem] pb-[8rem] border-b border-[var(--form-border)] px-[0.5rem] lg:px-[4rem] space-y-6"
        >
          <h2
            class="md:text-start typography-h2-md text-[var(--form-text)]"
          >
            4 ways to safeguard your business
          </h2>
          <div class="grid md:grid-cols-2 gap-[1rem]">
            {#each content.safeguardWays as item, index}
              <a href={item.link}>
                <div
                  class="border border-[var(--form-border)] typography-body-md text-[var(--form-text-secondary)] flex p-8  gap-[2rem]"
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
        class="flex flex-col lg:grid lg:grid-cols-3  gap-[2rem] py-[4rem] px-[0.5rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]  border-b border-[var(--form-border)]"
      >
        <h2
          class="md:text-start typography-h2-md text-[var(--form-text)] "
        >
          More resources for your business
        </h2>
        <div class="col-span-2">
          {#each content.moreResources as itemObj, index}
            <div
              class="flex flex-col md:flex-row gap-[2rem] {content.moreResources.length > index + 1 ? 'border-b border-[var(--form-border)]' : ''} {index === 0 ? 'pt-0 pb-[2rem]' : 'py-[2rem]'} "
            >
              <img src={itemObj.image} alt={itemObj.alt} class="h-[8rem]" />
              <div class="flex flex-col gap-[2rem]">
                <h2 class="font-semibold typography-h3 text-[var(--form-text)]">
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
          class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < content.navBarMedium.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
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
            <div id="howProtect" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <div
                class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] gap-[2rem] py-[4rem]"
              >
                <div class="space-y-[2rem]">
                  <h2
                    class="md:text-start typography-h2-md text-[var(--form-text)]"
                  >
                    Protect your business from scams
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    Remember three simple <span class="font-semibold">
                      steps: Stop. Check. Reject.
                    </span>
                  </p>
                </div>
                <div class="col-span-2 space-y-4">
                  <h2 class="typography-body-lg !font-semibold">Stop. Check. Reject.</h2>

                  {#each content.stopCheckReject as item, index}
                    <div class="grid grid-cols-12">
                      <p
                        class="w-[1.5rem] h-[1.5rem] sm:w-[2rem] sm:h-[2rem] border rounded-full flex justify-center items-center bg-black text-white"
                      >
                        {index + 1}
                      </p>
                      <div class="col-span-11">
                        <p class="typography-body-md text-[var(--form-text-secondary)]">
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
            <div id="protectbusiness" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <div>
                <TwoColumnWithImage
                  contents={content.messageUs}
                  isBorder
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
                    link="/cyber-security-against-scams/scam-target-business",
                    btnClass="btn-primary w-full"
                  />
                </TwoColumnWithImage>
              </div>
              <div
                class="py-[4rem] px-[0.5rem] space-y-6"
              >
                <h2
                  class="md:text-start typography-h2-md"
                >
                  4 ways to safeguard your business
                </h2>
                <div class="grid md:grid-cols-2 gap-[1rem]">
                  {#each content.safeguardWays as item, index}
                    <a href={item.link}>
                      <div
                        class="border border-[var(--form-border)] flex p-8 shadow-md hover:shadow-xl gap-[2rem]"
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
            <div id="resources" class="bg-[var(--landing-bg)] text-[var(--landing-text)] border-b border-[var(--form-border)]">
              <div
                class="flex flex-col px-[0.5rem] py-[4rem] gap-[2rem]"
              >
                <h2
                  class="md:text-start typography-h2-md text-[var(--form-text)]"
                >
                  More resources for your business
                </h2>
                <div class="col-span-2">
                  {#each content.moreResources as itemObj, index}
                    <div
                      class="flex flex-col md:flex-row gap-[2rem] {content.moreResources.length > index + 1 ? 'border-b border-[var(--form-border)]' : ''} py-[2rem]"
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
        <Button link="/contact"   btnClass= "btn-secondary w-full" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

   {#snippet secondary()}
      <HelpList
        contents={content.help}
        isBorder
      />
      <ThingsYouShould
        thinkKnow={content.thingsYouShould}
        disc="list-decimal"
       containerClass="px-0"
      ></ThingsYouShould>
   {/snippet}
  </NewPageLayout>
</section>

<div class="w-2/3">
  <div class="flex flex-col gap-6"></div>
</div>
