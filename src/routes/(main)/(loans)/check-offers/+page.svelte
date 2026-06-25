<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Modal from "$lib/components/website/Modal.svelte";
  import { applicationData } from "$lib/stores/applicationData";
  import Seo from "$lib/components/website/Seo.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import AboveTitleWithBlackCard from "$lib/components/website/AboveTitleWithBlackCard.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import LoanView from "$lib/components/website/LoanView.svelte";
  import content from "$lib/data/website/checkOffers.json";

  let showModal = $state(false);
  let dialogBox = $state<HTMLDialogElement | null>(null);

  function handlerClose() {
    showModal = !showModal;
  }

  const toggleDropdown = (event: MouseEvent, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;

    if (!detailsElement) return;

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

  function valuefill() {
    $applicationData.LoanName = "Home Loan";
    $applicationData.typeOfROI = "(HL/Construction/Plot+Construction/Plot)";
    $applicationData.LoanType = "New Loan";
    $applicationData.propertyIdentified = "No";
    $applicationData.pathLink = "/get-started/how-can-we-help#approval";
  }
</script>

<Seo
  type="WebPage"
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="content">
  <NewPageLayout pageData={content.pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={content.navList}
        {activeSection}
      />

      <div class="lg:px-16">
        <div id="types" data-section="types" class="section">
          <LoanView contents={content.loanTypes} paddingClass="lg:px-0" isBorder />

          <TwoColumnWithLeftHeading contents={content.howItWorks} paddingClass="lg:px-0" isBorder>
            <div>
              <Button
                btnName="Compare Loans Now"
                link="/get-started"
                btnClass="btn-primary"
              />
            </div>
          </TwoColumnWithLeftHeading>

          <ButtonBanner contents={content.buttonBanner} isBorder />
        </div>
        <div id="works" data-section="works" class="section"></div>
        <div id="existing" data-section="existing" class="section">
          <AboveTitleWithoutIconCard contents={content.changeExistingLoan} paddingClass="lg:px-0" isBorder />
        </div>
        <div id="tools" data-section="tools" class="section">
          <AboveTitleWithTopIconCard contents={content.smartSavingsCalculators} paddingClass="lg:px-0" isBorder />
          <AboveTitleWithBlackCard contents={content.homeLoanCalculator} paddingClass="lg:px-0" />
        </div>
      </div>
    </div>
    <div class="lg:hidden block">
      {#each ["Types of loan", "How it works ?", "Your existing loan", "Tools & calculators"] as list, index}
        <details
          class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < 3 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="bg-ddsa-gradient-primary col-span-3 list-none px-[1rem] py-[1.5rem] cursor-pointer text-white"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="typography-label">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="types" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <LoanView contents={content.loanTypes} />
            </div>
          {:else if index == 1}
            <div id="works" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <TwoColumnWithLeftHeading contents={content.howItWorks}>
                <div>
                  <Button
                    btnName="Compare Loans Now"
                    link="/get-started"
                    btnClass="btn-primary"
                  />
                </div>
              </TwoColumnWithLeftHeading>

              <ButtonBanner contents={content.buttonBanner} />
            </div>
          {:else if index == 2}
            <div id="existing" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <AboveTitleWithoutIconCard contents={content.changeExistingLoan} />
            </div>
          {:else if index == 3}
            <div id="tools" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
              <AboveTitleWithTopIconCard contents={content.smartSavingsCalculators} />
              <AboveTitleWithBlackCard contents={content.homeLoanCalculator} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    {#snippet secondary()}
      <HelpList contents={content.helpSupport} isBorder />
      <ThingsYouShould
        thinkKnow={content.thingsYouShouldKnow}
        disc="list-decimal"
        containerClass="px-0"
      ></ThingsYouShould>
    {/snippet}

    <Modal bind:showModal bind:dialog={dialogBox}>
      <div class="grid md:grid-cols-2 relative">
        <div
          class="col-span-1 flex flex-col gap-4 justify-center md:border-r md:border-[var(--form-border)] p-[1rem] md:p-[5rem]"
        >
          <p
            class="font-ThirdHead text-minSubHead md:text-miniHeadFont xl:text-minHeadFont text-[var(--form-text)]"
          >
            Already a customer with us?
          </p>
          <p class="font-Paragraph text-subParaFont md:text-paraFont text-[var(--form-text-secondary)]">
            Save time by using your Digital DSA details
          </p>
          <div>
            <Button
              btnName="Apply Online"
              btnClass="btn-primary"
              link="/get-started/how-can-we-help"
            />
          </div>
        </div>
        <div
          class="h-10 w-10 bg-black text-paraFont font-Paragraph p-2 rounded-full text-center absolute text-white top-[45%] left-[48.3%] hidden md:block"
        >
          Or
        </div>
        <div
          class="col-span-1 flex flex-col gap-4 justify-center p-[1rem] md:p-[5rem]"
        >
          <p
            class="font-ThirdHead text-minSubHead md:text-miniHeadFont xl:text-minHeadFont text-[var(--form-text)]"
          >
            Not one of our customers?
          </p>
          <p class="font-Paragraph text-subParaFont md:text-paraFont text-[var(--form-text-secondary)]">
            Start your application now?
          </p>
          <div>
            <Button
              btnName="Get Started"
              btnClass="btn-primary"
              link="/get-started/how-can-we-help"
            />
          </div>
        </div>
      </div>
    </Modal>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
