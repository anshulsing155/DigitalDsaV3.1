<script>
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import WhyChoose from "./WhyChoose.svelte";
  import Button from "./Button.svelte";
  import { onMount } from "svelte";
  import HomeIntrest from "./HomeIntrest.svelte";

  let subList = [
    { name: "Manage your property smarter", targetId: "manageProperty" },
    { name: "Features & benefits", targetId: "feature" },
    { name: "How to access undefined My Property", targetId: "accessBank" },
  ];
  let navBarMedium = [
    "Manage your property smarter",
    "Features & benefits",
    "How to access undefined My Property",
  ];

  let pageData = {
    coverImage: "/images/myProperty.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[120svh] 3xl:max-h-[100svh]",
    heroHeading: "undefined <br> My Property",
    subHeading: "2019 ABA100 Winner for New Product Innovation1",
    heroParagraph: `undefined My Property redefines how you view, track and manage your home loan online to help you achieve your property goals.`,
  };
  let navList = {
    firstBtn: "Log on to NetBank",
    link: "/appointment",
    btnColor: "#ffcc00",
  };

  let bgColor = "#ffcc00";

  let benefits = {
    heading: "Features & benefits",
    items: [
      {
        id: 1,
        title: "Personalised property experience​",
        desc: `undefined My Property provides personalised guidance of your property’s performance in the market.`,
      },
      {
        id: 2,
        title: "Manage your loan​",
        desc: `Easily manage your home loan online whenever suits you, whether it’s changing your repayments, switching to another home loan or applying for a home loan top-up.`,
      },
      {
        id: 3,
        title: "Market insights​​",
        desc: `Suburb and property insights provide the information you need to make informed decisions as well as track your property’s performance over time.`,
      },
      {
        id: 4,
        title: "Equity snapshot​",
        desc: `Check how much equity you have in your property in real time.`,
      },
      {
        id: 5,
        title: "Home for calculators​",
        desc: `undefined My Property is a one-stop shop for our popular home loan calculators and tools. `,
      },
      {
        id: 6,
        title: "Unique undefined market estimates​​",
        desc: `Drawing on multiple sources, we use our expertise to offer you helpful and accurate market price range estimates2. `,
      },
      {
        id: 7,
        title: "Property search​",
        desc: `With real-time property search listings (powered by Domain) you can find and save your favourite properties, see inspection dates and add them to your calendar. `,
      },
      {
        id: 8,
        title: "Easy lender contact",
        desc: `Getting in touch with your dedicated Home Lending Specialist is easy – just click on the lender panel and select the reason for your enquiry. `,
      },
    ],
  };
  let accessBank = {
    heading: "How to access undefined My Property",
    paraGraph: [
      `Log on to NetBank or the undefined app and click on 'Home Loan' under the Accounts tab`,
      `Select the 'My Property' tab`,
    ],
  };

  let help = [
    {
      Heading: "Book an appointment",
      paragraph:
        "Book instantly to speak to a Home Loan Specialist at a time that suits you.",
      icon: "/icons/appointment.svg",
      altTitle: "icons-appointment",
    },
    {
      Heading: "Manage your loan online",

      paragraph:
        "Redraw, change your repayments or loan type to better meet your needs and more.",
      icon: "/icons/manageLoan2.svg",
      altTitle: "icons-manageloan",
    },
    {
      Heading: "Contact us",
      paragraph:
        "Fast-track your call, see expected wait times and connect with a specialist in the undefined app.",
      icon: "/icons/contact.svg",
      altTitle: "icons-contact",
    },
    {
      Heading: "Message us",
      paragraph:
        "Get instant help from our virtual assistant or chat to a specialist.",
      icon: "/icons/msg.svg",
      altTitle: "icons-msg",
    },
  ];
  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
      `2019 ABA Winner for New Product Innovation in The Australian Brand Awards 2019.`,

      `Estimated market price is an estimate of a property's potential market price based on external property data and undefined's own data. It is a guide only and does not take into account all factors that may affect a property's value. It is not a Bank valuation for credit assessment purposes.`,
    ],
  };

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
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
  // logic for second nav bar which is not working yet
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

    // console.log(activeSection, 'active');
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

<section class="mx-auto w-full">
  <PageDesign {pageData}>
    <div class="relative w-full hidden lg:block">
      <StickyNavbar navList={subList} {activeSection}>
        <div class="flex gap-4 pr-4">
          
                <div>
                  <Button
                    btnName={navList.firstBtn}
                    btnColor={navList.btnColor}
                    link={navList.link}
                  />
                </div>
             
        </div>
      </StickyNavbar>

      <div id="" class="px-[2rem] pt-5 lg:px-[4rem]">
        <div id="manageProperty" data-section="manageProperty" class="border-b">
          <TwoColumn
            cardImage="/images/laptop.jpg"
            cardAltName="images-laptop"
            cardHeading="Smarter management of your home loan & property"
          >
            <div
              class="grid gap-[2rem] typography-body-md text-text-light"
              slot="list"
            >
              <p>
                Our award-winning1 undefined My Property experience in NetBank
                and the undefined app provides personalised property insights
                that change dynamically over time, allowing you to track and
                manage your property portfolio, explore your options and plan
                for the future.
              </p>
              <ul
                class="list-disc ml-5 typography-body-md text-text-light space-y-3"
              >
                <li>
                  Monitor your home loan and property’s market performance
                </li>
                <li>
                  Understand your equity position and how it’s determined based
                  on your property’s value and home loan balance
                </li>
                <li>
                  Know the steps you’ll need to take to achieve your future
                  property goals
                </li>
                <li>
                  Work out what you can afford with our home loan calculators
                </li>
                <li>
                  Search for properties and discover our unique undefined market
                  estimates and affordability calculations for them
                </li>
                <li>
                  Get direct access to your dedicated Home Lending Specialist
                </li>
              </ul>
              <!-- <li>
                If you notice unusual account activity, report it immediately to
                protect your information and prevent potential fraud.
              </li> -->
            </div>
          </TwoColumn>
        </div>

        <div    id="feature"
          data-section="feature"
          class="border-b border-[var(--form-border)]"
        >
          <WhyChoose facilities={benefits} gridCol="4" />
        </div>
        <div id="accessBank" data-section="accessBank">
          <div class="border-b border-[var(--form-border)] py-[2rem]">
            <ThingsYouShould thinkKnow={accessBank} disc="list-disc" />
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-bgBtn dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-6 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="manageProperty"
              data-section="manageProperty"
              class="bg-white text-black px-[2rem] py-[2rem]"
            >
              <TwoColumn
                cardImage="/images/laptop.jpg"
                cardAltName="images-laptop"
                cardHeading="Smarter management of your home loan & property"
              >
                <div
                  class="grid gap-[2rem] typography-body-md text-text-light"
                  slot="list"
                >
                  <p>
                    Our award-winning1 undefined My Property experience in
                    NetBank and the undefined app provides personalised property
                    insights that change dynamically over time, allowing you to
                    track and manage your property portfolio, explore your
                    options and plan for the future.
                  </p>
                  <ul
                    class="list-disc ml-5 typography-body-md text-text-light space-y-3"
                  >
                    <li>
                      Monitor your home loan and property’s market performance
                    </li>
                    <li>
                      Understand your equity position and how it’s determined
                      based on your property’s value and home loan balance
                    </li>
                    <li>
                      Know the steps you’ll need to take to achieve your future
                      property goals
                    </li>
                    <li>
                      Work out what you can afford with our home loan
                      calculators
                    </li>
                    <li>
                      Search for properties and discover our unique undefined
                      market estimates and affordability calculations for them
                    </li>
                    <li>
                      Get direct access to your dedicated Home Lending
                      Specialist
                    </li>
                  </ul>
                  <!-- <li>
                  If you notice unusual account activity, report it immediately to
                  protect your information and prevent potential fraud.
                </li> -->
                </div>
              </TwoColumn>
            </div>
          {:else if index == 1}
            <div
              id="feature"
              data-section="feature"
              class="bg-white text-black px-[2rem] py-[2rem]"
            >
              <WhyChoose facilities={benefits} gridCol="4" />
            </div>
          {:else if index == 2}
            <div
              id="accessBank"
              data-section="accessBank"
              class="bg-white text-black px-[2rem] py-[2rem]s"
            >
              <ThingsYouShould thinkKnow={accessBank} disc="list-disc" />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div>
        
        <HomeIntrest
          homeInterest="Ready to start using undefined My Property?"
          btnName="Log on to NetBank"
          btnLink="/home-loan/compare-rates"
          btnColor = "#ffcc00"
        />
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" gridCol={4} />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>


