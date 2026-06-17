<script>
  // import { onMount } from "svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import Anchor from "$lib/components/website/Anchor.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import PaymentTable from "./PaymentTable.svelte";

  let currentDate = "";

  onMount(() => {});

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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  let activeSection = ""; // Initially no section is active

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

    // //console.log(activeSection, 'active');
  };

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    const today = new Date();
    currentDate = today.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  let taxPayers = {
    heading: `🧩 Types of Income Taxpayers`,
    secPara: `👉 <a
      href="https://financialservices.gov.in/beta/en"
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 underline"
      >Ministry of Finance, Government of India</a
    >`,
    listItems: [
      {
        heading: `Individuals:`,
        desc: `Salaried employees, freelancers, and self-employed
      professionals.`,
      },
      {
        heading: `Hindu Undivided Families (HUFs):`,
        desc: `Joint families with shared
      income.`,
      },
      {
        heading: `Partnership Firms and LLPs:`,
        desc: `Business entities with multiple
      owners.`,
      },
      {
        heading: `Companies:`,
        desc: `Private and public companies operating in India.`,
      },
      {
        heading: `Associations of Persons (AOP) and Body of Individuals (BOI):`,
        desc: `Groups earning collective income.`,
      },
    ],
  };

  let income = {
    heading: `💡 Types of Income Under Income Tax`,
    listItems: [
      {
        heading: `Income from Salary:`,
        desc: `Earnings from employment, including salary,
      bonuses, and allowances.`,
      },
      {
        heading: `Income from House Property:`,
        desc: `Rental income from owned properties.`,
      },
      {
        heading: `Income from Business or Profession:`,
        desc: `Profits from businesses
      or self-employment.`,
      },
      {
        heading: `Income from Capital Gains:`,
        desc: `Profits from the sale of property,
      stocks, or assets.`,
      },
      {
        heading: `Income from Other Sources:`,
        desc: `Interest, dividends, lottery winnings,
      and gifts.`,
      },
    ],
  };

  let tableData = [
    {
      columnName: ["<div>Income Range (₹)</div>", "<div>Tax Rate</div>"],
      rowData: [
        {
          "<span class='font-semibold'>Up to ₹4,00,000</span>": [
            "<span class='font-semibold'>No Tax</span>",
          ],
        },
        {
          "<span class='font-semibold'>₹4,00,001 - ₹8,00,000</span>": [
            "<span class='font-semibold'>5%</span>",
          ],
        },
        {
          "<span class='font-semibold'>₹8,00,001 - ₹12,00,000</span>": [
            "<span class='font-semibold'>10%</span>",
          ],
        },
        {
          "<span class='font-semibold'>₹12,00,001 - ₹16,00,000</span>": [
            "<span class='font-semibold'>15%</span>",
          ],
        },
        {
          "<span class='font-semibold'>₹16,00,001 - ₹20,00,000</span>": [
            "<span class='font-semibold'>20%</span>",
          ],
        },
        {
          "<span class='font-semibold'>₹20,00,001 - ₹24,00,000</span>": [
            "<span class='font-semibold'>25%</span>",
          ],
        },
        {
          "<span class='font-semibold'>Above ₹24,00,000</span>": [
            "<span class='font-semibold'>30%</span>",
          ],
        },
      ],
    },
  ];

  let deduction = {
    heading: `🪙 Income Tax Deductions and Exemptions for 2025`,
    listItems: [
      {
        heading: `Section 80C:`,
        desc: `Deduction of up to ₹1.5 lakh for investments
      in PPF, NSC, ELSS, and life insurance premiums.`,
      },
      {
        heading: `Section 80D:`,
        desc: `Deduction for health insurance premiums (₹25,000
      for individuals and ₹50,000 for senior citizens).`,
      },
      {
        heading: `Section 80G:`,
        desc: `Deduction for donations to charities and relief
      funds.`,
      },
      {
        heading: `Section 24(b):`,
        desc: `Deduction of up to ₹2 lakh on home loan interest
      payments.`,
      },
      {
        heading: `Standard Deduction:`,
        desc: `₹75,000 for salaried individuals and pensioners.`,
      },
    ],
  };

  let itr = {
    heading: `📅 How to File Income Tax Online (ITR) in India`,
    listItems: [
      {
        num: "1.",
        desc: `Visit the official portal: <a
        href="https://www.incometax.gov.in"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 underline">www.incometax.gov.in</a
      >`,
      },
      { num: "2.", desc: `Register/Login using your PAN as the user ID.` },
      { num: "3.", desc: `Select the ITR Form based on your income source.` },
      {
        num: "4.",
        desc: `Fill in the details: Enter your income, deductions, and tax payments.`,
      },
      {
        num: "5.",
        desc: `Verify your ITR using Aadhaar OTP, net banking, or digital signature.`,
      },
      {
        num: "6.",
        desc: `Submit and download the ITR-V acknowledgment for your records.`,
      },
    ],
  };

  let deadline = {
    heading: `⏰ Income Tax Deadlines for 2025`,
    listItems: [
      {
        date: `July 31, 2025:`,
        desc: `Last date to file ITR for individuals and HUFs.`,
      },
      {
        date: `October 31, 2025:`,
        desc: `Last date to file ITR for companies and
      audit-required entities.`,
      },
      {
        date: `December 31, 2025:`,
        desc: `Deadline for belated or revised ITR filing.`,
      },
    ],
  };

  let penalties = {
    heading: ` ⚠️ Income Tax Penalties for Late Filing`,
    listItems: [
      {
        desc: `₹5,000 if filed after July 31 but before December 31.`,
      },
      {
        desc: `₹10,000 if filed after December 31.`,
      },
      {
        desc: `₹1,000 for individuals with income below ₹5 lakh.`,
      },
    ],
  };

  let conclusion = {
    heading: `📢 Conclusion`,
    para: `Understanding the new <strong>income tax slabs in India 2025</strong> and
    available deductions can help you reduce your tax liability. With zero tax
    for income up to
    <strong>₹12 lakh</strong> and simplified online filing, taxpayers can save
    more while complying with the law. Ensure you file your ITR before
    <strong>July 31, 2025</strong>, to avoid penalties and maximize tax
    benefits.
    <br><br>
Stay updated with the latest tax regulations by visiting the
    <a
      href="https://www.incometaxindia.gov.in"
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 underline">official Income Tax Department website</a
    >.
    `,
  };

  let navBarMedium = [
    "Understand Income Tax",
    "Income Tax Slab",
    "Deductions and Exemptions",
    "Deadline and Penalties",
    "Conclusion",
  ];
</script>

<Seo
  type="WebPage"
  title="Income Tax India 2025: New Slabs, Deductions & ITR Guide"
  image="/images/income-tax-cover.jpg"
  description="Check 2025 income tax slabs, deductions & online filing process. Learn how to save tax & file ITR for FY 2025-26 before deadline."
  keywords="Income tax slabs India 2025, New tax regime 2025, Income tax deductions 2025, File ITR online 2025, ITR filing FY 2025-26, Standard deduction 2025, Income tax rates 2025-26, Tax exemptions India 2025, Income tax deadline July 2025, Income tax return AY 2026-27, Tax saving options 2025, Section 80C 80D 24b deductions, How to file income tax in India 2025"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading:
        "Income Tax in India 2025: New Tax Slabs, Deductions, and Filing Process",
      coverImage: "/images/income-tax-cover.jpg",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "Understand Income Tax", targetId: "incomeTax" },
            { name: "Income Tax Slab", targetId: "slab" },
            { name: "Deductions and Exemptions", targetId: "deduction" },
            { name: "Deadline and Penalties", targetId: "deadline" },
            { name: "Conclusion", targetId: "conclusion" },
          ],
        }}
        {activeSection}
      />
      <!-- overview -->
      <div data-section="incomeTax" id="incomeTax" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <span class="typography-body-sm text-[var(--form-text-secondary)] text-gray-600">
            Posted on: {currentDate}
          </span>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            Income tax is a crucial financial obligation for every individual
            and business in India. With the Union Budget 2025 introducing new
            <strong>income tax slabs in India 2025</strong> and enhanced
            deductions, understanding the latest regulations can help you save
            taxes and stay compliant. This comprehensive guide covers income tax
            slabs, deductions, exemptions, and the online filing process for the
            financial year
            <strong>2025-26 (AY 2026-27)</strong>.
            <br /> <br />
            👉<a
              href="https://www.incometaxindia.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 underline">Income Tax Department of India</a
            >
          </p>
        </div>
        <!-- what is income tax -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            ✅ What is Income Tax?
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            Income tax is a direct tax levied on an individual’s or entity’s
            earnings during a financial year. It is governed by the <strong
              >Income Tax Act, 1961</strong
            >, and applies to income from salary, business, investments, and
            other sources. The financial year in India runs from
            <strong>April 1 to March 31</strong>, with the tax return due by
            <strong>July 31</strong> of the following year.
          </p>
        </div>
        <!-- income taxpayers -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {taxPayers.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each taxPayers.listItems as list}
              <li class="space-y-2">
                <h3 class="font-semibold typography-body-md">{list.heading}</h3>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
              </li>
            {/each}
          </ul>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html taxPayers.secPara}
          </p>
        </div>
        <!-- income under income tax -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {income.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each income.listItems as list}
              <li class="space-y-2">
                <h3 class="font-semibold typography-body-md">{list.heading}</h3>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- income tax slab table -->
      <div data-section="slab" id="slab" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            📊 Income Tax Slabs in India 2025 (New Regime)
          </h2>
          <div class="">
            {#each tableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>
      </div>
      <!-- income tax deductions -->
      <div data-section="deduction" id="deduction" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {deduction.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each deduction.listItems as list}
              <li class="space-y-2">
                <h3 class="font-semibold typography-body-md">{list.heading}</h3>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
        <!-- fill itr -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {itr.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each itr.listItems as list}
              <li class="space-y-2 typography-body-sm text-[var(--form-text-secondary)]">
                <span class="font-semibold">{list.num}</span>
                {@html list.desc}
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- deadlines -->
      <div data-section="deadline" id="deadline" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {deadline.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each deadline.listItems as list}
              <li class="space-y-2 typography-body-sm text-[var(--form-text-secondary)]">
                <span class="font-semibold">{list.date}</span>
                {@html list.desc}
              </li>
            {/each}
          </ul>
        </div>
        <!-- penalties -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {penalties.heading}
            </h2>
          </div>
          <ul class="space-y-6 pl-4">
            {#each penalties.listItems as list}
              <li class="list-disc space-y-2 typography-body-sm text-[var(--form-text-secondary)]">
                {@html list.desc}
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- conclusion -->
      <div data-section="conclusion" id="conclusion" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            {conclusion.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html conclusion.para}
          </p>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 mx-1 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <!-- overview -->
            <div id="incomeTax" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <span class="typography-body-sm text-[var(--form-text-secondary)] text-gray-600">
                  Posted on: {currentDate}
                </span>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Income tax is a crucial financial obligation for every
                  individual and business in India. With the Union Budget 2025
                  introducing new
                  <strong>income tax slabs in India 2025</strong> and enhanced
                  deductions, understanding the latest regulations can help you
                  save taxes and stay compliant. This comprehensive guide covers
                  income tax slabs, deductions, exemptions, and the online
                  filing process for the financial year
                  <strong>2025-26 (AY 2026-27)</strong>.
                  <br /> <br />
                  👉<a
                    href="https://www.incometaxindia.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 underline"
                    >Income Tax Department of India</a
                  >
                </p>
              </div>
              <!-- what is income tax -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  ✅ What is Income Tax?
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  Income tax is a direct tax levied on an individual’s or
                  entity’s earnings during a financial year. It is governed by
                  the <strong>Income Tax Act, 1961</strong>, and applies to
                  income from salary, business, investments, and other sources.
                  The financial year in India runs from
                  <strong>April 1 to March 31</strong>, with the tax return due
                  by
                  <strong>July 31</strong> of the following year.
                </p>
              </div>
              <!-- income taxpayers -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {taxPayers.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each taxPayers.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html taxPayers.secPara}
                </p>
              </div>
              <!-- income under income tax -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {income.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each income.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 1}
            <!-- income tax slab table -->
            <div id="slab" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  📊 Income Tax Slabs in India 2025 (New Regime)
                </h2>
                <div class="">
                  {#each tableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 2}
            <!-- income tax deductions -->
            <div id="deduction" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {deduction.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each deduction.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-[var(--form-text-secondary)]">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
              </div>
              <!-- fill itr -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {itr.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each itr.listItems as list}
                    <li class="space-y-2 typography-body-sm text-[var(--form-text-secondary)]">
                      <span class="font-semibold">{list.num}</span>
                      {@html list.desc}
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 3}
            <!-- deadlines -->
            <div id="deadline" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {deadline.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each deadline.listItems as list}
                    <li class="space-y-2 typography-body-sm text-[var(--form-text-secondary)]">
                      <span class="font-semibold">{list.date}</span>
                      {@html list.desc}
                    </li>
                  {/each}
                </ul>
              </div>
              <!-- penalties -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {penalties.heading}
                  </h2>
                </div>
                <ul class="space-y-6 pl-4">
                  {#each penalties.listItems as list}
                    <li
                      class="list-disc space-y-2 typography-body-sm text-[var(--form-text-secondary)]"
                    >
                      {@html list.desc}
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 4}
            <!-- conclusion -->
            <div id="conclusion" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  {conclusion.heading}
                </h2>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html conclusion.para}
                </p>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              altName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              altName: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the Digital DSA.",
              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />
      <ThingsYouShould
        thinkKnow={{
          heading: `Things you should know`,
          paraGraph: [
            `<span class="font-semibold">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-semibold">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
            `<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </SecondPageLayout>
</section>
