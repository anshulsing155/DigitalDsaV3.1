<script lang="ts">
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import ThingsYouShould from './ThingsYouShould.svelte';
  import PageDesign from '../layout/PageDesign.svelte';
  import { onMount } from "svelte";
  import TwoColumn from './TwoColumn.svelte';
  import Button from '../ui/Button.svelte';
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/greenLoanHL.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();

  const navListWithClicks = $derived(
    content.navList.map((item: any) => {
      if (item.actionBtn) {
        return {
          ...item,
          actionBtn: item.actionBtn.map((btn: any) => {
            if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Apply for new loan" || btn.link === "/apply") {
              return {
                ...btn,
                btnClick: () => {
                  applicationData.update((data) => {
                    data.LoanName = "Home Loan";
                    return data;
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
    <div class="px-[2rem] lg:hidden">
      <ThingsYouShould thinkKnow={content.head}>
        <div
          class="flex flex-col md:flex-row pb-[2rem] gap-[1rem] border-b border-[var(--form-border)]"
          slot="list"
        >
          <div class="flex items-center gap-1">
            <h4 class="text-[6rem] typography-h3 font-semibold">3.99</h4>
            <div class="flex flex-col items-center justify-center font-semibold">
              <span class="text-[3rem] leading-[3rem]">%</span>
              <span class="text-[2rem] leading-[2.15rem]">PA</span>
            </div>
          </div>
          <div class="flex flex-col gap-1 justify-center typography-body-md text-[var(--form-text-secondary)]">
            <p class="font-semibold">10 Year fixed rate and Comparison rate^</p>
            <p>Minimum loan size $5,000. Maximum loan size</p>
            <p>
              $30,000. 
              <span class="underline text-linkColor cursor-pointer">^Comparison rate warning.</span>
            </p>
          </div>
        </div>
      </ThingsYouShould>
      
      <div class="grid lg:grid-cols-5">
        <div class="col-span-2"></div>
        <div class="col-span-full lg:col-span-3">
          <ThingsYouShould
            thinkKnow={content.greenLoan}
            disc="list-disc"
            colSpan={5}
          />
        </div>
      </div>
    </div>
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
      <div class="px-[2rem] lg:px-[4rem] hidden lg:block">
        <div id="glance" data-section="glance">
          <div>
            <ThingsYouShould thinkKnow={content.head}>
              <div class="flex pb-[2rem] gap-2 border-b border-[var(--form-border)]"
                slot="list"
              >
                <div class="flex items-center gap-1">
                  <h4 class="text-[6rem] typography-h3 font-semibold">3.99</h4>
                  <div class="flex flex-col items-center justify-center font-semibold">
                    <span class="text-[3rem] leading-[3rem]">%</span>
                    <span class="text-[2rem] leading-[2.15rem]">PA</span>
                  </div>
                </div>
                <div class="flex flex-col gap-1 justify-center typography-body-md text-[var(--form-text-secondary)]">
                  <p class="font-semibold">10 Year fixed rate and Comparison rate^</p>
                  <p>Minimum loan size $5,000. Maximum loan size</p>
                  <p> $30,000. <span class="underline text-linkColor cursor-pointer">^Comparison rate warning.</span> </p>
                </div>
              </div>
            </ThingsYouShould>
          </div>
          <div class="grid lg:grid-cols-5 border-b">
            <div class="col-span-2"></div>
            <div class="col-span-full lg:col-span-3">
              <ThingsYouShould
                thinkKnow={content.greenLoan}
                disc="list-disc"
                colSpan={5}
              />
            </div>
          </div>
          <div class="grid lg:grid-cols-5 py-[2rem] border-b">
            <h2 class="col-span-full lg:col-span-2 typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
              At glance
            </h2>

            <div class="col-span-full lg:col-span-3">
              <div class="border-b">
                <ThingsYouShould
                  thinkKnow={content.glance}
                  disc="list-disc"
                  colSpan={5}
                />
              </div>
              <div class="border-b">
                <ThingsYouShould
                  thinkKnow={content.consider}
                  disc="list-disc"
                  colSpan={5}
                />
              </div>
              <div>
                <ThingsYouShould
                  thinkKnow={content.eligibleEnergy}
                  disc="list-disc"
                  colSpan={5}
                />
              </div>
            </div>
          </div>

          <TwoColumn
            cardImage={content.cardImg1}
            cardAltName={content.cardAlt1}
            cardHeading={content.cardHead1}
          >
            <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]" slot="list">
              <li>
                Check out our range of resources to help you on your journey
                towards a more sustainable life.
              </li>
              <li>
                <a
                  class="text-linkColor underline underline-offset-4"
                  href="/home-loan/green-loan">Visit sustainability hub</a
                >
              </li>
            </div>
          </TwoColumn>
        </div>

        <div id="eligibility" data-section="eligibility" class="py-[2rem] border-b border-[var(--form-border)]">
          <ThingsYouShould thinkKnow={content.areYouEligible} disc="list-disc" />
        </div>

        <div id="apply" data-section="apply" class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5">
          <h3 class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
            How to apply
          </h3>
          <div class="grid gap-5 overflow-hidden typography-body-md text-[var(--form-text-secondary)] md:col-span-3">
            {#each content.switchList as list}
              <ul class="flex flex-col gap-4">
                <li>
                  <div class="grid md:grid-cols-9 grid-cols-10 gap-2 lg:gap-0">
                    <span class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]">
                      {list.num}
                    </span>
                    <p class="md:col-span-8 col-span-5 typography-body-md text-[var(--form-text-secondary)]">
                      {@html list.text}
                    </p>
                  </div>
                </li>
              </ul>
            {/each}
          </div>
        </div>

        <div id="faq" data-section="faq" class="grid lg:grid-cols-5 py-[2rem] border-b">
          <div class="lg:col-span-2">
            <h2 class="typography-h2 text-[var(--form-text)]">
              FAQs
            </h2>
          </div>

          <div class="lg:col-span-3 border-b">
            {#each content.faq as question}
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould
                  thinkKnow={question}
                  disc="list-disc"
                  colSpan={5}
                />
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each content.navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-6 py-4"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div class="bg-white text-black px-[2rem]" id="glance">
              <div>
                <div class="grid lg:grid-cols-5 py-[2rem] border-b">
                  <h2 class="col-span-full lg:col-span-2 typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2">
                    At glance
                  </h2>
      
                  <div class="col-span-full lg:col-span-3">
                    <div class="border-b">
                      <ThingsYouShould
                        thinkKnow={content.glance}
                        disc="list-disc"
                        colSpan={5}
                      />
                    </div>
                    <div class="border-b">
                      <ThingsYouShould
                        thinkKnow={content.consider}
                        disc="list-disc"
                        colSpan={5}
                      />
                    </div>
                    <div>
                      <ThingsYouShould
                        thinkKnow={content.eligibleEnergy}
                        disc="list-disc"
                        colSpan={5}
                      />
                    </div>
                  </div>
                </div>
      
                <TwoColumn
                  cardImage={content.cardImg1}
                  cardAltName={content.cardAlt1}
                  cardHeading={content.cardHead1}
                >
                  <div class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]" slot="list">
                    <li>
                      Check out our range of resources to help you on your journey
                      towards a more sustainable life.
                    </li>
                    <li>
                      <a
                        class="text-linkColor underline underline-offset-4"
                        href="/home-loan/green-loan">Visit sustainability hub</a
                      >
                    </li>
                  </div>
                </TwoColumn>
              </div>
            </div>
          {:else if index == 1}
            <div id="eligibility" class="bg-white text-black px-[2rem]">
              <ThingsYouShould thinkKnow={content.areYouEligible} disc="list-disc" />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black px-[2rem] py-[1rem] flex flex-col gap-[1rem]" id="apply">
              <h3 class="typography-h2 text-[var(--form-text)]">
                How to apply
              </h3>
              <div class="grid gap-5 overflow-hidden typography-body-md text-[var(--form-text-secondary)]">
                {#each content.switchList as list}
                  <ul class="flex flex-col gap-4">
                    <li>
                      <div class="grid md:grid-cols-9 grid-cols-6 gap-2 lg:gap-0">
                        <span class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]">
                          {list.num}
                        </span>
                        <p class="md:col-span-8 col-span-5 typography-body-md text-[var(--form-text-secondary)]">
                          {@html list.text}
                        </p>
                      </div>
                    </li>
                  </ul>
                {/each}
              </div>
            </div>
          {:else if index == 3}
            <div class="bg-white text-black px-[2rem]" id="disclosure">
              <div class="lg:col-span-2">
                <h2 class="typography-h2 text-[var(--form-text)]">
                  FAQs
                </h2>
              </div>
      
              <div class="lg:col-span-3 border-b">
                {#each content.faq as question}
                  <div class="border-b border-[var(--form-border)]">
                    <ThingsYouShould
                      thinkKnow={question}
                      disc="list-disc"
                      colSpan={5}
                    />
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <ThingsYouShould thinkKnow={content.thinkKnow} />
    </div>
  </PageDesign>
</section>
