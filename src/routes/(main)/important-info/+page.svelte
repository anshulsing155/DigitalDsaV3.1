<script lang="ts">
  import Guides from "$lib/components/website/Guides.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import PageFullTextDesign from "$lib/components/website/PageFullTextDesign.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import { onMount } from "svelte";

  let pageData = {
    heroHeading: "Important Information",
    heroParagraph: `Find essential guides and disclosures about our loan services, eligibility criteria, and partnerships with over 50 banks to help you make informed financial decisions.`,
  };

  let navBarLarge = [
    {
      name: "Financial Services Information",
      targetId: "FinancialServicesGuides",
    },
    {
      name: "Loan Features & Benefits",
      targetId: "ProductDisclosureStatements",
    },
    {
      name: "Loan Categories",
      targetId: "Productcategories",
    },
  ];

  let navBarMedium = [
    "Financial Services Information",
    "Loan Features & Benefits",
    "Loan Categories",
  ];

  let serviceGuide = {
    heading: "Financial Services Information",
    para: `Before applying for any loan or financial product, we recommend reviewing our financial services guide, which outlines the products we compare and services we offer. This will provide clarity before making important financial decisions.`,
  };

  let disclosure = {
    heading: "Loan Features & Benefits",
    list: [
      `Our Loan Disclosure Statements provide comprehensive information about loan products, including features, benefits, interest rates, fees, and potential risks.`,
      `Digital DSA partners with leading banks to offer electronic access to product information and terms for your convenience.`,
    ],
  };

  let contents = [
    {
      id: 1,
      title: "Secured Loans",
      links: [
        { id: 1, name: "Home Loans", url: "/home-loan" },
        { id: 2, name: "Mortgage Loans", url: "/lap" },
        { id: 3, name: "Plot Loans", url: "/plot-loan" },
      ],
    },
    {
      id: 2,
      title: "Unsecured Loans",
      links: [
        { id: 1, name: "Business Loans", url: "/business-loan" },
        { id: 2, name: "Personal Loans", url: "/personal-loan" },
        { id: 3, name: "Professional Loans", url: "/professional-loan" },
      ],
    },
  ];

 
  let activeSection = $state(''); // Initially no section is active

  
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
      activeSection = currentSection; 
    }

    // //console.log(activeSection, 'active');
  };

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  //ends here...

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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };
</script>

<Seo
  type="WebPage"
  title="Essential Loan Guides & Disclosures | Compare Loan Options"
  description="Find key loan disclosures, benefits, and eligibility details. Compare secured & unsecured loans from 50+ banks for informed financial decisions."
  keywords="loan services, secured loans, unsecured loans, home loans, mortgage loans, plot loans, business loans, personal loans, financial disclosure, loan eligibility, bank partnerships, loan benefits, interest rates, loan comparison"
/>

<section>
  <PageFullTextDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={{ items: navBarLarge }} {activeSection} />
    </div>

    <div class="hidden lg:block lg:px-[4rem]">
      <div data-section="FinancialServicesGuides" id="FinancialServicesGuides">
        <Guides guide={serviceGuide} />
      </div>
      <div
        data-section="ProductDisclosureStatements"
        id="ProductDisclosureStatements"
      >
        <Guides guide={disclosure} />
      </div>
      <div
        data-section="Productcategories"
        id="Productcategories"
        class="grid gap-[2rem] py-[4rem] pb-[8rem] lg:grid-cols-3"
      >
        <p class="text-nowrap typography-h2 text-black dark:text-white">
          Product Categories
        </p>
        <div class="col-span-2">
          <Support {contents} gridCol={2} />
        </div>
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="Financial Services Guides"
              class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem]"
            >
              <Guides guide={serviceGuide} />
            </div>
          {:else if index == 1}
            <div
              id="Product Disclosure Statements"
              class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem]"
            >
              <Guides guide={disclosure} />
            </div>
          {:else if index == 2}
            <div
              id="Product categories"
              class="grid gap-[2rem] px-[0.5rem] py-[2rem] lg:grid-cols-3 lg:px-0 bg-[var(--landing-bg)] text-black dark:text-white"
            >
              <p class="typography-h2 text-black dark:text-white">Product Categories</p>
              <div class="col-span-2">
                <Support {contents} gridCol={2} />
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

          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
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
    </div>
  </PageFullTextDesign>
</section>


