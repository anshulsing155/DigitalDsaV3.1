<script lang="ts">
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThreeCard from "$lib/components/website/ThreeCard.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Ways from "./Ways.svelte";
  import BlogCard from "./BlogCard.svelte";
  import IconCard from "./IconCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import AnchorCounter from "./AnchorCounter.svelte";
  import { onMount } from "svelte";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/propertyInsight.json";

  let {
    data,
    pageData = content.pageData
  }: { data?: any; pageData?: any } = $props();

  const navListWithClicks = $derived(
    content.navList.map((item: any) => {
      if (item.actionBtn) {
        return {
          ...item,
          actionBtn: item.actionBtn.map((btn: any) => {
            if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Book appointment" || btn.link === "/apply") {
              return {
                ...btn,
                btnClick: () => {
                  applicationData.update((storeData) => {
                    storeData.LoanName = "Home Loan";
                    return storeData;
                  });
                }
              };
            }
            return btn;
          })
        };
      }
      return item;
    })
  );

  const cardDataListWithClicks = $derived(
    content.cardDataList.map((card: any) => {
      if (card.link === "/get-started/how-can-we-help" || card.btnName === "Apply for a home loan") {
        return {
          ...card,
          btnClick: () => {
            applicationData.update((storeData) => {
              storeData.LoanName = "Home Loan";
              return storeData;
            });
          }
        };
      }
      return card;
    })
  );

  const blogsWithClicks = $derived(
    content.blogs.map((blog: any) => {
      if (blog.link === "/get-started/how-can-we-help" || blog.btnName === "Check now") {
        return {
          ...blog,
          btnClick: () => {
            applicationData.update((storeData) => {
              storeData.LoanName = "Home Loan";
              return storeData;
            });
          }
        };
      }
      return blog;
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
      <div class="hidden lg:block">
        <StickyNavbar navList={content.subList} {activeSection}>
          <div class="flex gap-4 pr-4">
            {#each navListWithClicks as lastItem}
              {#if lastItem.actionBtn}
                {#each lastItem.actionBtn as action}
                  <div>
                    <Button
                      btnName={action.firstBtn}
                      btnColor={action.btnColor}
                      link={action.link}
                      btnClick={action.btnClick}
                    />
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </StickyNavbar>
        <AnchorCounter />
        <div class="px-[2rem] lg:px-[4rem]">
          <div id="knowProperty" data-section="knowProperty" class="border-b border-[var(--form-border)] py-[2rem]">
            <ThingsYouShould thinkKnow={content.knowMarket} />
          </div>
          <div id="toolsSupport" data-section="toolsSupport" class="py-[2rem]">
            <h2 class="typography-h2 text-[var(--form-text)]">
              Tools & support
            </h2>
            <div class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[2rem]">
              {#each blogsWithClicks as blog (blog.title)}
                <BlogCard
                  btnColor={blog.btnColor}
                  icon={blog.icon}
                  altName={blog.altName}
                  title={blog.title}
                  paragraph={blog.paragraph}
                  btnName={blog.btnName}
                  linkName={blog.linkName}
                  btnBorder={blog.btnBorder}
                  link={blog.link}
                  url={blog.url}
                  btnClick={blog.btnClick}
                  cardBorder="#E3E3E3"
                />
              {/each}
            </div>
          </div>
          <div id="propertySearch" data-section="propertySearch">
            <Ways ways={content.propertySearch} />
          </div>
          <div id="benefit" data-section="benefits" class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section">
            {#if content.benefits.length > 0}
              <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
                Features & benefits
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each content.benefits as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            {/if}
            <Ways ways={content.propertyPurchase} />
            <div class="pt-[4rem]">
              <h3 class="md:text-start typography-h3 text-[var(--form-text)]">
                {content.IconCardHeading}
              </h3>
              <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                {#each cardDataListWithClicks as cardData (cardData.heading)}
                  <IconCard {cardData} />
                {/each}
              </div>
            </div>
            <TwoColumn
              cardImage={content.messageUs.cardImage}
              cardAltName={content.messageUs.cardAltName}
              cardHeading={content.messageUs.cardHeading}
            >
              <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                <li>
                  {content.messageUs.text}
                </li>
                <div class="w-auto">
                  <Button
                    link="/contact"
                      btnClass= "btn-secondary w-full"
                    btnName="Message us"
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
                <div class="icon-container justify-self-end text-[var(--form-text)]">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="knowProperty" data-section="knowProperty" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={content.knowMarket} />
              </div>
            {:else if index == 1}
              <div id="toolsSupport" class="py-[1rem] bg-white text-black px-[2rem]">
                <h2 class="typography-h2 text-[var(--form-text)]">
                  Tools & support
                </h2>
                <div class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[2rem]">
                  {#each blogsWithClicks as blog (blog.title)}
                    <BlogCard
                      btnColor={blog.btnColor}
                      icon={blog.icon}
                      altName={blog.altName}
                      title={blog.title}
                      paragraph={blog.paragraph}
                      btnName={blog.btnName}
                      linkName={blog.linkName}
                      btnBorder={blog.btnBorder}
                      link={blog.link}
                      url={blog.url}
                      btnClick={blog.btnClick}
                      cardBorder="#E3E3E3"
                    />
                  {/each}
                </div>
              </div>
            {:else if index == 2}
              <div id="propertySearch" class="bg-white text-black px-[2rem]">
                <Ways ways={content.propertySearch} />
              </div>
            {:else if index == 3}
              <div id="benefit" data-section="benefits" class="bg-white text-black px-[2rem] py-[1rem]">
                {#if content.benefits.length > 0}
                  <h2 class="md:text-start typography-h2 text-[var(--form-text)]">
                    Features & benefits
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each content.benefits as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                {/if}
                <Ways ways={content.propertyPurchase} />
                <div class="pt-[4rem]">
                  <h3 class="md:text-start typography-h3 text-[var(--form-text)]">
                    {content.IconCardHeading}
                  </h3>
                  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {#each cardDataListWithClicks as cardData (cardData.heading)}
                      <IconCard {cardData} />
                    {/each}
                  </div>
                </div>
                <TwoColumn
                  cardImage={content.messageUs.cardImage}
                  cardAltName={content.messageUs.cardAltName}
                  cardHeading={content.messageUs.cardHeading}
                >
                  <ul class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]" slot="list">
                    <li>
                      {content.messageUs.text}
                    </li>
                    <div class="w-auto">
                      <Button
                        link="/contact"
                          btnClass= "btn-secondary w-full"
                        btnName="Message us"
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
      <WeAreHereHelp help={content.help} heading="We're here to help" />
      <ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
