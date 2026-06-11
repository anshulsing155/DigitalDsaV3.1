<script lang="ts">
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import BlogCard from "./BlogCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import AnchorCounter from "$lib/components/website/AnchorCounter.svelte";
  import { onMount } from "svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/partnershipOffers.json";

  let {
    data,
    pageData = content.pageData
  }: { data?: any; pageData?: any } = $props();

  const helpWithClicks = $derived(
    content.help.map((item: any) => {
      if (item.link === "/get-started/how-can-we-help" || item.link === "/apply") {
        return {
          ...item,
          btnClick: () => {
            applicationData.update((storeData) => {
              storeData.LoanName = "Home Loan";
              return storeData;
            });
          }
        };
      }
      return item;
    })
  );

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

  const toggleDropdown = (event: Event, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

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

    const isOpen = detailsElement.hasAttribute("open");
    if (isOpen) {
      detailsElement.removeAttribute("open");
      if (icon) {
        icon.classList.remove("fa-angle-up");
        icon.classList.add("fa-angle-down");
      }
    } else {
      detailsElement.setAttribute("open", "true");
      if (icon) {
        icon.classList.remove("fa-angle-down");
        icon.classList.add("fa-angle-up");
      }
    }
    setTimeout(() => {
      if (detailsElement) {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
</script>

<section>
  <PageDesign {pageData}>
    <div>
      <HomeIntrest
        homeInterest={content.customerStatus.homeInterest}
        btnName={content.customerStatus.btnName}
        btnColor={content.customerStatus.btnColor}
        btnLink={content.customerStatus.btnLink}
      />

      <div class="hidden lg:block">
        <StickyNavbar navList={content.subList} {activeSection}></StickyNavbar>
        <AnchorCounter />

        <div class="px-[2rem] lg:px-[4rem]">
          <div id="offers" data-section="offers" class="section">
            <div class="grid lg:grid-cols-5 gap-4 border-b border-borderColor py-[4rem]">
              <h2 class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
                Current offers
              </h2>
              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each content.offers as item}
                  <BlogCard
                    icon={item.icon}
                    altName={item.altName}
                    title={item.title}
                    paragraph={item.paragraph}
                    url={item.url}
                    linkName={item.linkName}
                    cardBorder="#E3E3E3"
                  />
                {/each}
              </div>
            </div>
          </div>

          <div id="shop" data-section="shop" class="section">
            <div class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5">
              <div class="md:col-span-2 space-y-4">
                <h2 class="typography-h2 text-text-main">
                  Shop till you drop
                </h2>
                <p class="typography-body-sm text-text-light">
                  We want to make sure you get the best deals when you shop.
                  That’s why we’ve partnered with Australia’s biggest brands to
                  give you personalised cashback rewards, helping you save when
                  you spend. Discover shopping offers just for you when you
                  check the undefined app before you start shopping. Make sure
                  you have the latest version of the app installed.
                </p>
              </div>

              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each content.shop as items}
                  <div class="border border-[#E3E3E3]">
                    <div>
                      <img src={items.icon} alt={items.altName} />
                    </div>
                    <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                      <h3 class="font-semibold text-miniSubHead">
                        {items.title}
                      </h3>
                      <ul class="space-y-4">
                        {#each items.lists as list}
                          <li class="flex items-start gap-2">
                            <svg
                              class="w-5 h-5 text-black flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>{list}</span>
                          </li>
                        {/each}
                      </ul>
                      <div class="mt-[2rem]">
                        <Button
                          btnName="Klarna"
                          link=""
                          btnColor="#ffcc00"
                        />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="likeHome" data-section="likeHome" class="section">
            <div class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5">
              <div class="md:col-span-2 space-y-4">
                <h2 class="typography-h2 text-text-main">
                  There’s no place like home
                </h2>
                <p class="typography-body-sm text-text-light">
                  Looking for a new home? Moving into a new home? Or just
                  looking for a better NBN and electricity deal? We’ve got you
                  covered.
                </p>
              </div>

              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each content.likeHome as items}
                  <div class="border border-[#E3E3E3]">
                    <div>
                      <img src={items.icon} alt={items.altName} />
                    </div>
                    <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                      <h3 class="font-semibold text-miniSubHead">
                        {items.title}
                      </h3>
                      <ul class="space-y-4">
                        {#each items.lists as list}
                          <li class="flex items-start gap-2">
                            <svg
                              class="w-5 h-5 text-black flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>{list}</span>
                          </li>
                        {/each}
                      </ul>
                      <div class="mt-[2rem]">
                        <Button
                          btnName={items.btnName}
                          link={items.link}
                          btnColor={items.btnColor}
                        />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="control" data-section="control" class="section">
            <div class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5">
              <div class="md:col-span-2 space-y-4">
                <h2 class="typography-h2 text-text-main">
                  Control what matters to you
                </h2>
                <p class="typography-body-sm text-text-light">
                  We can help you feel in control of your money and more protected when it comes to your credit score. Take a look at our current partners supporting you in the finance space.
                </p>
              </div>

              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each content.control as items}
                  <div class="border border-[#E3E3E3]">
                    <div>
                      <img src={items.icon} alt={items.altName} />
                    </div>
                    <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                      <h3 class="font-semibold text-miniSubHead">
                        {items.title}
                      </h3>
                      <ul class="space-y-4">
                        {#each items.lists as list}
                          <li class="flex items-start gap-2">
                            <svg
                              class="w-5 h-5 text-black flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>{list}</span>
                          </li>
                        {/each}
                      </ul>
                      <div class="mt-[2rem]">
                        <Button
                          btnName={items.btnName}
                          link={items.link}
                          btnColor={items.btnColor}
                        />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="business" data-section="business" class="section">
            <TwoColumn
              cardImage={content.businessPartnerships.cardImage}
              cardAltName={content.businessPartnerships.cardAltName}
              cardHeading={content.businessPartnerships.cardHeading}
            >
              <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                <li>
                  {content.businessPartnerships.text}
                </li>

                <div class="w-auto">
                  <Button
                    link={content.businessPartnerships.link}
                    btnBorder={content.businessPartnerships.btnBorder}
                    btnName={content.businessPartnerships.btnName}
                  />
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>
      </div>

      <div class="lg:hidden block">
        {#each content.navBarMedium as list, index}
          <details class="dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}">
            <summary
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
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
              <div id="offers" class="bg-white text-black px-[2rem]">
                <div class="grid gap-4 border-b border-borderColor py-[4rem]">
                  <h2 class="typography-h2 text-text-main">
                    Current offers
                  </h2>
                  <div class="grid md:grid-cols-2 gap-4">
                    {#each content.offers as item}
                      <BlogCard
                        icon={item.icon}
                        altName={item.altName}
                        title={item.title}
                        paragraph={item.paragraph}
                        url={item.url}
                        linkName={item.linkName}
                        cardBorder="#E3E3E3"
                      />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 1}
              <div id="shop" class="bg-white text-black px-[2rem]">
                <div class="border-b border-dividerColor grid gap-4 py-[4rem]">
                  <div class="space-y-4">
                    <h2 class="typography-h2 text-text-main">
                      Shop till you drop
                    </h2>
                    <p class="typography-body-sm text-text-light">
                      We want to make sure you get the best deals when you shop.
                      That’s why we’ve partnered with Australia’s biggest brands to
                      give you personalised cashback rewards, helping you save when
                      you spend. Discover shopping offers just for you when you
                      check the undefined app before you start shopping. Make sure
                      you have the latest version of the app installed.
                    </p>
                  </div>
    
                  <div class="grid md:grid-cols-2 gap-4">
                    {#each content.shop as items}
                      <div class="border border-[#E3E3E3]">
                        <div>
                          <img src={items.icon} alt={items.altName} />
                        </div>
                        <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                          <h3 class="font-semibold text-miniSubHead">
                            {items.title}
                          </h3>
                          <ul class="space-y-4">
                            {#each items.lists as list}
                              <li class="flex items-start gap-2">
                                <svg
                                  class="w-5 h-5 text-black flex-shrink-0"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span>{list}</span>
                              </li>
                            {/each}
                          </ul>
                          <div class="mt-[2rem]">
                            <Button
                              btnName="Klarna"
                              link=""
                              btnColor="#ffcc00"
                            />
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 2}
              <div id="likeHome" class="bg-white text-black px-[2rem]">
                <div class="border-b border-dividerColor grid gap-4 py-[4rem]">
                  <div class="space-y-4">
                    <h2 class="typography-h2 text-text-main">
                      There’s no place like home
                    </h2>
                    <p class="typography-body-sm text-text-light">
                      Looking for a new home? Moving into a new home? Or just
                      looking for a better NBN and electricity deal? We’ve got you
                      covered.
                    </p>
                  </div>
    
                  <div class="grid md:grid-cols-2 gap-4">
                    {#each content.likeHome as items}
                      <div class="border border-[#E3E3E3]">
                        <div>
                          <img src={items.icon} alt={items.altName} />
                        </div>
                        <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                          <h3 class="font-semibold text-miniSubHead">
                            {items.title}
                          </h3>
                          <ul class="space-y-4">
                            {#each items.lists as list}
                              <li class="flex items-start gap-2">
                                <svg
                                  class="w-5 h-5 text-black flex-shrink-0"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span>{list}</span>
                              </li>
                            {/each}
                          </ul>
                          <div class="mt-[2rem]">
                            <Button
                              btnName={items.btnName}
                              link={items.link}
                              btnColor={items.btnColor}
                            />
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 3}
              <div id="control" class="bg-white text-black px-[2rem]">
                <div class="border-b border-dividerColor grid gap-4 py-[4rem]">
                  <div class="space-y-4">
                    <h2 class="typography-h2 text-text-main">
                      Control what matters to you
                    </h2>
                    <p class="typography-body-sm text-text-light">
                      We can help you feel in control of your money and more protected when it comes to your credit score. Take a look at our current partners supporting you in the finance space.
                    </p>
                  </div>
      
                  <div class="grid md:grid-cols-2 gap-4">
                    {#each content.control as items}
                      <div class="border border-[#E3E3E3]">
                        <div>
                          <img src={items.icon} alt={items.altName} />
                        </div>
                        <div class="typography-body-md text-text-light flex flex-col gap-3 p-4">
                          <h3 class="font-semibold text-miniSubHead">
                            {items.title}
                          </h3>
                          <ul class="space-y-4">
                            {#each items.lists as list}
                              <li class="flex items-start gap-2">
                                <svg
                                  class="w-5 h-5 text-black flex-shrink-0"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span>{list}</span>
                              </li>
                            {/each}
                          </ul>
                          <div class="mt-[2rem]">
                            <Button
                              btnName={items.btnName}
                              link={items.link}
                              btnColor={items.btnColor}
                            />
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 4}
              <div id="business" class="bg-white text-black px-[2rem]">
                <TwoColumn
                  cardImage={content.businessPartnerships.cardImage}
                  cardAltName={content.businessPartnerships.cardAltName}
                  cardHeading={content.businessPartnerships.cardHeading}
                >
                  <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                    <li>
                      {content.businessPartnerships.text}
                    </li>
  
                    <div class="w-auto">
                      <Button
                        link={content.businessPartnerships.link}
                        btnBorder={content.businessPartnerships.btnBorder}
                        btnName={content.businessPartnerships.btnName}
                      />
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            {/if}
          </details>
        {/each}
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp help={helpWithClicks} heading="We're here to help" />
      <ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
