<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import content from "$lib/data/website/incomeTax.json";

  const {
    seo,
    pageData,
    stickyNavBar,
    navBarMedium,
    taxPayers,
    income,
    tableData,
    deduction,
    itr,
    deadline,
    penalties,
    conclusion,
    helpList,
    thingsYouShouldKnow
  } = content;

  let currentDate = $state("");

  const toggleDropdown = (event: MouseEvent, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon") as HTMLElement;
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

    // Close all dropdowns except the clicked one
    document.querySelectorAll(".dropdown").forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector(".faq-icon") as HTMLElement;

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

  let activeSection = $state(""); // Svelte 5 state rune

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
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="mx-auto w-full">
  <SecondPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={stickyNavBar}
        {activeSection}
      />
      <!-- overview -->
      <div data-section="incomeTax" id="incomeTax" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            ✅ What is Income Tax?
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            Income tax is a direct tax levied on an individual’s or entity’s
            earnings during a financial year. It is governed by the <strong>Income Tax Act, 1961</strong>, and applies to
            income from salary, business, investments, and other sources.
            The financial year in India runs from
            <strong>April 1 to March 31</strong>, with the tax return due by
            <strong>July 31</strong> of the following year.
          </p>
        </div>
        <!-- income taxpayers -->
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            📊 Income Tax Slabs in India 2025 (New Regime)
          </h2>
          <div class="">
            {#each tableData as tbl}
              <PaymentTable tableData={tbl} />
            {/each}
          </div>
        </div>
      </div>
      <!-- income tax deductions -->
      <div data-section="deduction" id="deduction" class="">
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <div class="flex flex-col gap-[2rem]">
            <h2 class="typography-h2 text-text-main">
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
        <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
          <h2 class="typography-h2 text-text-main">
            {conclusion.heading}
          </h2>
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            {@html conclusion.para}
          </p>
        </div>
      </div>
    </div>

    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
        <details class="border-spanColor dropdown col-span-3 mx-1 bg-darkColor text-white {index < navBarMedium.length - 1 ? 'border-b' : ''}">
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem] cursor-pointer"
            onclick={(e) => { e.preventDefault(); toggleDropdown(e, index); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="incomeTax" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
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
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
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
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
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
              </div>
            </div>
          {:else if index == 1}
            <div id="slab" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
                  📊 Income Tax Slabs in India 2025 (New Regime)
                </h2>
                <div class="">
                  {#each tableData as tbl}
                    <PaymentTable tableData={tbl} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 2}
            <div id="deduction" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
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
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
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
            <div id="deadline" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
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
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <div class="flex flex-col gap-[2rem]">
                  <h2 class="typography-h2 text-text-main">
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
          {:else if index == 4}
            <div id="conclusion" class="bg-white text-black">
              <div class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]">
                <h2 class="typography-h2 text-text-main">
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
      <HelpList contents={helpList} />
      <ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal" containerClass="px-0" />
    </div>
  </SecondPageLayout>
</section>
