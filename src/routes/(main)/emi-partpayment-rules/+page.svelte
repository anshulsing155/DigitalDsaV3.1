<script lang="ts">
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import PaymentTable from "$lib/components/website/PaymentTable.svelte";
  import Seo from "$lib/components/website/Seo.svelte";
  import content from "$lib/data/website/emiPartpaymentRules.json";

  const toggleDropdown = (event: any, index: any) => {
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

  const stickyNavBarItems = [
    { name: "About EMI", targetId: "emi" },
    { name: "About part-payment", targetId: "partPayment" },
    { name: "Rules table", targetId: "table" },
    { name: "Loan tips", targetId: "tips" }
  ];
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="mx-auto w-full">
  <NewPageLayout pageData={content.pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={stickyNavBarItems}
        {activeSection}
      ></StickyNavbar>

      <div class="px-[2rem] lg:px-[4rem]">
        <div id="emi" data-section="emi">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={content.emiIncrement} disc={"list-disc"} />
          </div>

          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={content.whenToIncreaseEmi} disc={"list-disc"} />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <WhyChoose facilities={content.benefitsOfEmiIncrement} />
          </div>
        </div>

        <div id="partPayment" data-section="partPayment">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={content.partPayment} disc={"list-disc"} />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={content.partPaymentRules} disc={"list-disc"} />
          </div>
        </div>
        <div id="table" data-section="table">
          <div
            class="flex flex-col xl:grid grid-cols-5 gap-[3rem] pt-[4rem] pb-[8rem] border-b border-[var(--form-border)] text-[var(--form-text)]"
          >
            <div class="col-span-2">
              <h2
                class="grid mb-[1.5rem] typography-h2 text-[var(--form-text)]"
              >
                Maximum Part-Payment Limits in Indian Banks
              </h2>
            </div>
            <div class="col-span-3">
              {#each content.partPaymentLimitTable as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>

          <div
            class="flex flex-col xl:grid grid-cols-5 gap-[3rem] pt-[4rem] pb-[8rem] border-b border-[var(--form-border)] text-[var(--form-text)]"
          >
            <div class="col-span-2">
              <h2
                class="grid mb-[1.5rem] typography-h2 text-[var(--form-text)]"
              >
                Bank-Wise EMI Increment & Part-Payment Rules
              </h2>
            </div>
            <div class="col-span-3">
              {#each content.bankWiseEMITable as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>
        </div>

        <div id="tips" data-section="tips">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={content.smartBorrowerTips} disc={"list-disc"} />
          </div>
          <ThingsYouShould thinkKnow={content.finalThought} disc={"list-disc"} />
        </div>
      </div>
    </div>
    <div class="lg:hidden block">
      {#each content.navBarMedium as list, index}
        <details
          class="border-bgBtn dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="emi"
              data-section="emi"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.emiIncrement} disc={"list-disc"} />
              </div>

              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould
                  thinkKnow={content.whenToIncreaseEmi}
                  disc={"list-disc"}
                />
              </div>
              <div class="px-[0.5rem]">
                <WhyChoose facilities={content.benefitsOfEmiIncrement} />
              </div>
            </div>
          {:else if index == 1}
            <div
              id="partPayment"
              data-section="partPayment"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={content.partPayment} disc={"list-disc"} />
              </div>

              <ThingsYouShould
                thinkKnow={content.partPaymentRules}
                disc={"list-disc"}
              />
            </div>
          {:else if index == 2}
            <div
              id="table"
              data-section="table"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]"
            >
              <div
                class="flex flex-col xl:grid grid-cols-5 gap-[1rem] py-[4rem] px-[0.5rem] border-b border-[var(--form-border)]"
              >
                <div class="col-span-2">
                  <h2
                    class="grid typography-h2 text-[var(--form-text)]"
                  >
                    Maximum Part-Payment Limits in Indian Banks
                  </h2>
                </div>
                <div class="col-span-3">
                  {#each content.partPaymentLimitTable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <div
                class="flex flex-col xl:grid grid-cols-5 gap-[1rem] py-[4rem] px-[0.5rem]"
              >
                <div class="col-span-2">
                  <h2
                    class="grid typography-h2 text-[var(--form-text)]"
                  >
                    Bank-Wise EMI Increment & Part-Payment Rules
                  </h2>
                </div>
                <div class="col-span-3">
                  {#each content.bankWiseEMITable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 3}
            <div
              id="tips"
              data-section="tips"
              class="bg-[var(--landing-bg)] text-[var(--form-text)] border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould
                  thinkKnow={content.smartBorrowerTips}
                  disc={"list-disc"}
                />
              </div>
              <ThingsYouShould thinkKnow={content.finalThought} disc={"list-disc"} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <WeAreHereHelp help={content.help} heading="We're here to help" />
    </div>
  </NewPageLayout>
</section>
