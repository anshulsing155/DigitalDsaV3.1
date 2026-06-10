<script lang="ts">
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";

  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Payments from "$lib/components/website/Payments.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let cardImg1 = "/images/man-laptop-with-smartphone-coffee.jpg";
  let cardAlt1 = "CardCover";
  let cardHead1 = "You at DigitalDSA ";

  let cardImg2 = "/images/young-employee-working-at-DigitalDSA-office.jpg";
  let cardAlt2 = "CardCover";
  let cardHead2 = "Rewards & benefits";

  let cardImg3 = "/images/woman-with-tablet.jpg";
  let cardAlt3 = "CardCover";
  let cardHead3 = `Commitment to Creating Self-Dependent Financial Advisors <br>  <span class = "typography-body-md text-[var(--form-text-secondary)] italic font-semibold">(For those who are interested)</span> `;

  let cardImg4 = "/images/young-woman-working-as-part-timer.jpg";
  let cardAlt4 = "photo of an intern working from home at DigitalDSA";
  let cardHead4 = "Graduates, Interns & Analysts";

  let navBarMedium = [
    "Our work areas",
    "Rewards & benefits",
    "Diversity & inclusion",
    "Graduates, Interns & Analysts",
    "Application information",
  ];

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

  let activeSection = $state(''); // Initially no section is active

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

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  //ends here...
</script>

<Seo
  type="WebPage"
  image="/images/DigitalDSA-office-colleagues.jpg"
  title="Careers at DigitalDSA | Grow in Fintech & Financial Advisory"
  description="Join DigitalDSA for top fintech careers! Explore roles in loans, insurance, investment & more. Enjoy growth, rewards & work-life balance."
  keywords="careers at DigitalDSA, fintech jobs, financial advisor jobs, loan services careers, insurance jobs, investment advisory careers, risk management jobs, sales and business development careers, fintech internships, financial analyst jobs, fintech growth opportunities, work in finance, fintech career opportunities, best fintech jobs, work-life balance in finance"
/>

<section class="mx-auto w-full content">
  <PageDesign
    pageData={{
      coverImage: "/images/DigitalDSA-office-colleagues.jpg",
      coverAlt: "photo of office colleagues at DigitalDSA",
      sourceName:"Freepik",
      originalSource:"www.freepik.com",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
      heroHeading: "Careers with DigitalDSA ",
      heroParagraph: `Join us in transforming the financial ecosystem!`,
      // actionBtn: [
      //   {
      //     firstBtn: "Search & apply now",
      //     link: "",
      //     btnColor: "#ffcc00",
      //   },
      // ],
    }}
  >
    <!-- <div class="">
      <Ways
        ways={{
          para: `At DigitalDSA, we empower professionals to grow and innovate in loans, insurance, and investments. Whether experienced or new, seize opportunities to excel, make an impact, and shape the future of financial services.`,
          btnName: `Apply now`,
          btnColor: `#ffcc00`,
          btnBorder: `#ffcc00`,
          btnLink: "/finance-support",
        }}
      />
    </div> -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Our business areas",
              targetId: "businessArea",
            },
            {
              name: "Rewards & benefits",
              targetId: "rewards",
            },
            {
              name: "Diversity & inclusion",
              targetId: "diversity",
            },
            {
              name: "Graduates, Interns & Analysts",
              targetId: "graduates",
            },
            {
              name: "Application information",
              targetId: "appInfo",
            },
          ],
        }}
        {activeSection}
      />
    </div>

    <div class="px-4 lg:px-16">
      <div class="hidden lg:block">
        <div id="businessArea" data-section="businessArea" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={cardImg1}
              cardAltName={cardAlt1}
              cardHeading={cardHead1}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <li class="grid gap-4">
                  <p>
                    At DigitalDSA, you are the driving force behind our success.
                    We believe in:
                  </p>

                  <div class="flex gap-2 items-start justify-start">
                    <img
                      src="/icons/circle-check.svg"
                      alt="circle-check"
                      class="h-[1.2rem] mt-2"
                    />

                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Entrepreneurial Growth –
                      </span> Take charge of your career in a performance-driven
                      culture.
                    </p>
                  </div>

                  <div class="flex gap-2 items-start justify-start">
                    <img
                      src="/icons/circle-check.svg"
                      alt="circle-check"
                      class="h-[1.2rem] mt-2"
                    />

                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Continuous Learning -
                      </span> Stay ahead with hands-on experience and skill development.
                    </p>
                  </div>

                  <div class="flex gap-2 items-start justify-start">
                    <img
                      src="/icons/circle-check.svg"
                      alt="circle-check"
                      class="h-[1.2rem] mt-2"
                    />

                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Flexibility & Autonomy –</span
                      > Work with freedom while making a real impact.
                    </p>
                  </div>

                  <div class="flex gap-2 items-start justify-start">
                    <img
                      src="/icons/circle-check.svg"
                      alt="circle-check"
                      class="h-[1.2rem] mt-2"
                    />

                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Innovation in Finance –
                      </span> Be part of a fintech revolution simplifying loans &
                      investments.
                    </p>
                  </div>
                </li>
              </ul>
            </TwoColumn>
          </div>

          <div
            class="py-[4rem] border-b border-dividerColor grid grid-cols-12 gap-[4rem] justify-between items-start"
          >
            <div class="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <h2
                class="typography-h2 text-black dark:text-white"
              >
                Our Work Areas
              </h2>
              <p class="typography-body-md text-[var(--form-text-secondary)]">
                We specialize in a wide range of technologies and services and offering
                roles in:
              </p>
            </div>
            <div
              class="grid grid-cols-2 gap-4 lg:gap-[2rem] col-span-12 lg:col-span-8"
            >
             <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">Software Development</p>
              </div>
              <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">Loan Services</p>
              </div>

             
              <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">
                  Investment Advisory
                </p>
              </div>
              <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">
                  Operations & Administartion
                </p>
              </div>
              <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">
                  Sales & Business Development
                </p>
              </div>
              <div
                class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <p class="typography-h4 text-black dark:text-white">
                  Digital Marketing
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="rewards" data-section="rewards" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={cardImg2}
              cardAltName={cardAlt2}
              cardHeading={cardHead2}
            >
              <ul
                class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-4"
                slot="list"
              >
                <p>We recognize talent and reward excellence with:</p>
                <div class="flex flex-col space-y-10">
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Performance-based incentives –
                    </span>The harder you work, the more you earn!
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Training & Development –
                    </span>Get trained by experts and stay ahead in the finance
                    sector.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Growth Opportunities -
                    </span>Clear career progression for top performers.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Recognition Programs –
                    </span>Be celebrated for your contributions.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Work-Life Balance –
                    </span>Flexible work policies for personal & professional
                    growth.
                  </p>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="diversity" data-section="diversity" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={cardImg3}
              cardAltName={cardAlt3}
              cardHeading={cardHead3}
              reverse={true}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <p>We empower our team with:</p>
                <div class="flex flex-col space-y-10">
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Complete Business Support –
                    </span>Marketing, technology & operational assistance.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Exclusive Training Programs –
                    </span>Upskill with real-world financial expertise.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Zero Investment, High Returns –
                    </span>Earn commissions without any upfront costs.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white">Be Your Own Boss – </span>Work
                    at your pace & build your financial advisory business.
                  </p>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="graduates" data-section="graduates" class="pb-[2rem]">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage={cardImg4}
              cardAltName={cardAlt4}
              cardHeading={cardHead4}
            >
              <ul
                class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <p>Kickstart your career in fintech with us!</p>
                <div class="flex flex-col space-y-10">
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white">Internships – </span>Gain
                    hands-on experience in finance, sales, and operations.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white">Analyst Programs – </span>Work
                    on real-world data-driven financial solutions.
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white"
                      >Graduate Opportunities –
                    </span>Get mentored by industry leaders & build expertise.
                  </p>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div id="appInfo" data-section="appInfo" class="pb-[2rem]">
          <div class="">
            <Payments supportHeading="Awards and recognition">
              <div slot="para">Our commitment to excellence has earned us:</div>
              <div class="col-span-2 grid space-y-10">
                <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                  <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                    >Fintech Innovator of the Year
                  </span>(Recognized for simplifying financial solutions)
                </p>
                <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                  <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                    >Best Loan Assistance Platform
                  </span>(Helping thousands secure hassle-free loans)
                </p>
                <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                  <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                    >Top Workplace for Sales Professionals
                  </span>(Creating high-rewarding careers)
                </p>
              </div>
            </Payments>
          </div>
        </div>

        <!-- <div>
          <ButtonBanner
            contents={{
              heading: `Join DigitalDSA Today!`,
              para: `Ready to build a successful career in finance? Explore opportunities with us and become a part of a fast-growing fintech revolution! `,
              btnName: `Apply now`,
              btnColor: "#ffcc00",
            }}
          />
        </div> -->
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-[var(--form-bg)] text-black dark:text-white {index < list.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="typography-h3 text-black dark:text-white">{list}</h2>
              <div class="icon-container justify-self-end text-[var(--form-text-secondary)] text-lg">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="businessArea"
              class="pb-[2rem] bg-[var(--landing-bg)] text-black dark:text-white px-[.5rem]"
            >
              <div class="border-b border-dividerColor">
                <TwoColumn
                  cardImage={cardImg1}
                  cardAltName={cardAlt1}
                  cardHeading={cardHead1}
                >
                  <ul
                    class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <li class="grid gap-4">
                      <p>
                        At DigitalDSA, you are the driving force behind our
                        success. We believe in:
                      </p>

                      <div class="flex gap-2 items-start justify-start">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle-check"
                          class="h-[1.2rem] mt-2"
                        />

                        <p class="typography-body-md text-[var(--form-text-secondary)]">
                          <span class="typography-body-lg !font-semibold text-black dark:text-white"
                            >Entrepreneurial Growth –
                          </span> Take charge of your career in a performance-driven
                          culture.
                        </p>
                      </div>

                      <div class="flex gap-2 items-start justify-start">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle-check"
                          class="h-[1.2rem] mt-2"
                        />

                        <p class="typography-body-md text-[var(--form-text-secondary)]">
                          <span class="typography-body-lg !font-semibold text-black dark:text-white"
                            >Continuous Learning -
                          </span> Stay ahead with hands-on experience and skill development.
                        </p>
                      </div>

                      <div class="flex gap-2 items-start justify-start">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle-check"
                          class="h-[1.2rem] mt-2"
                        />

                        <p class="typography-body-md text-[var(--form-text-secondary)]">
                          <span class="typography-body-lg !font-semibold text-black dark:text-white"
                            >Flexibility & Autonomy –</span
                          > Work with freedom while making a real impact.
                        </p>
                      </div>

                      <div class="flex gap-2 items-start justify-start">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle-check"
                          class="h-[1.2rem] mt-2"
                        />

                        <p class="typography-body-md text-[var(--form-text-secondary)]">
                          <span class="typography-body-lg !font-semibold text-black dark:text-white"
                            >Innovation in Finance –
                          </span> Be part of a fintech revolution simplifying loans
                          & investments.
                        </p>
                      </div>
                    </li>
                  </ul>
                </TwoColumn>
              </div>
              <div
                class="pt-[4rem] border-b border-dividerColor grid lg:grid-cols-12 gap-[2rem] lg:gap-[4rem] justify-between items-start"
              >
                <div class="lg:col-span-4 flex flex-col gap-4">
                  <h2
                    class="typography-h2 text-black dark:text-white"
                  >
                    Our Business Areas
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    We specialize in a wide range of financial services,
                    offering roles in:
                  </p>
                </div>
                <div
                  class="grid grid-cols-2 gap-4 lg:gap-[2rem] lg:col-span-8"
                >
                  <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">
                      Loan Services
                    </p>
                  </div>

                  <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">Insurance</p>
                  </div>
                  <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">
                      Investment Advisory
                    </p>
                  </div>
                  <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">
                      Operations & Risk Management
                    </p>
                  </div>
                  <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">
                      Sales & Business Development
                    </p>
                  </div>
                   <div
                    class="border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-4 py-[3rem] shadow-fourthShadow flex items-start text-start cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p class="typography-h4 text-black dark:text-white">
                      Digital Marketing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="rewards" class="pb-[2rem] bg-[var(--landing-bg)] text-black dark:text-white px-[.5rem]">
              <TwoColumn
                cardImage={cardImg2}
                cardAltName={cardAlt2}
                cardHeading={cardHead2}
              >
                <ul
                  class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-4"
                  slot="list"
                >
                  <p>We recognize talent and reward excellence with:</p>
                  <div class="flex flex-col">
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Performance-based incentives –
                      </span>The harder you work, the more you earn!
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Training & Development –
                      </span>Get trained by experts and stay ahead in the
                      finance sector.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Growth Opportunities -
                      </span>Clear career progression for top performers.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Recognition Programs –
                      </span>Be celebrated for your contributions.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Work-Life Balance –
                      </span>Flexible work policies for personal & professional
                      growth.
                    </p>
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 2}
            <div
              id="diversity"
              class="pb-[2rem] bg-[var(--landing-bg)] text-black dark:text-white px-[.5rem]"
            >
              <TwoColumn
                cardImage={cardImg3}
                cardAltName={cardAlt3}
                cardHeading={cardHead3}
                reverse={true}
              >
                <ul
                  class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                  slot="list"
                >
                  <p>We empower financial advisors with:</p>
                  <div class="flex flex-col">
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Complete Business Support –
                      </span>Marketing, technology & operational assistance.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Exclusive Training Programs –
                      </span>Upskill with real-world financial expertise.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Zero Investment, High Returns –
                      </span>Earn commissions without any upfront costs.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Be Your Own Boss –
                      </span>Work at your pace & build your financial advisory
                      business.
                    </p>
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 3}
            <div
              class="pb-[2rem] bg-[var(--landing-bg)] text-black dark:text-white px-[.5rem]"
              id="graduates"
            >
              <TwoColumn
                cardImage={cardImg4}
                cardAltName={cardAlt4}
                cardHeading={cardHead4}
              >
                <ul
                  class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]"
                  slot="list"
                >
                  <p>Kickstart your career in fintech with us!</p>
                  <div class="flex flex-col">
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white">Internships – </span>Gain
                      hands-on experience in finance, sales, and operations.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Analyst Programs –
                      </span>Work on real-world data-driven financial solutions.
                    </p>
                    <p class="typography-body-md text-[var(--form-text-secondary)]">
                      <span class="typography-body-lg !font-semibold text-black dark:text-white"
                        >Graduate Opportunities –
                      </span>Get mentored by industry leaders & build expertise.
                    </p>
                  </div>
                </ul>
              </TwoColumn>
            </div>
          {:else if index == 4}
            <div class="bg-[var(--landing-bg)] text-black dark:text-white px-[.5rem]" id="appInfo">
              <Payments supportHeading="Awards and recognition">
                <div slot="para">
                  Our commitment to excellence has earned us:
                </div>
                <div class="grid">
                  <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                      >Fintech Innovator of the Year
                    </span>(Recognized for simplifying financial solutions)
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                      >Best Loan Assistance Platform
                    </span>(Helping thousands secure hassle-free loans)
                  </p>
                  <p class="typography-body-md text-[var(--form-text-secondary)] italic">
                    <span class="typography-body-lg !font-semibold text-black dark:text-white not-italic"
                      >Top Workplace for Sales Professionals
                    </span>(Creating high-rewarding careers)
                  </p>
                </div>
              </Payments>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary" >
      <HelpList
        contents={{
          heading: `We can help`,
          xlGridCol: 3,
          cards: [
            // {
            //   heading: "Search & apply",

            //   icon: "/icons/search.svg",
            //   altTitle: "icons",
            //   url: "",
            // },
            {
              heading: "Your questions answered",
              icon: "/icons/msg.svg",
              altTitle: "icons",
              url: "/career/career-FAQ",
            },

            {
              heading: "How to apply",
              icon: "/icons/apply-pen.svg",
              altTitle: "icons",
              url: "/career/application-process",
            },

            {
              heading: "Contact us",

              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            
          ],
        }}
      />
    </div>
  </PageDesign>
</section>

<style>
</style>
