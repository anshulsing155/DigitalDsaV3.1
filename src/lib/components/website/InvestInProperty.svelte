<script>
	let {
		data
	} = $props();



  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  
  import Support from "$lib/components/website/Support.svelte";
  
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  
  import BlogCard from "./BlogCard.svelte";

  let pageData = {
    coverImage: "/images/investInProperty-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Investment property",
    linkName: "Download our investing property guide",
    url: "",
    heroParagraph: `Plan your next steps with the right tools and resources. Make an informed decision when it comes to buying an investment property.`,
  };

  let subList = [
    {
name: "Getting started",
targetId: `started`,
    },
    {
name: "Plan your investment",
targetId: `plan`,
    },
    {
name: "Investing in property guide",
targetId: `guide`,
    },
    {
name: "Property reports",
targetId: `reports`,
    },
    {
name: "Tools and calculators",
targetId: `tools`,
    },
  ];

  let navList = [
    {
actionBtn: [
{
firstBtn: "Book an appointment",
link: "/appointment",
btnColor: "#ffcc00",
},
{
firstBtn: "Apply online",
link: "/get-started/how-can-we-help",
},
],
    },
  ];

  let navBarMedium = [
    "Getting started",
    "Plan your investment",
    "Investing in property guide",
    "Property reports",
    "Tools and calculators",
  ];

  let started = [
    {
icon: "/images/rentalYield.jpg",
altName: "amber icon",
title: "What's rental yield?",
paragraph:
"If you pay a high price for a house in a popular suburb, you would hope that rental demand is high enough in the area to offset your higher costs of ownership. Yield is the return you receive on a property investment- most commonly in the form of rent.",

btnName: "Learn More",
    btnBorder: "#706d6e",
link: "/home-loan/The-Home-in-app",
    },
    {
icon: "/images/gearingAndTax.jpg",
altName: "more icon",
title: "Negative gearing and tax",
paragraph:
"Income earned from your investment property is either positively or negatively geared. If you’re a property investor or looking to become one, it’s important to understand what that is, the possible benefits, risks and tax considerations associated with it.",

btnName: "Find out more",
btnBorder: "#706d6e",
link: "/offers",
    },
  ];

  let sideBarMore = [
    {
icon: "/images/apartments.jpg",
altName: "images-diversity",
paragraph: "Find the right property",
link: "/home-loan/get-rewarded",
    },

    {
icon: "/images/coupleAtHome.jpg",
altName: "images-employees",
paragraph: "What could I offord",
link: "/home-loan/partnership-offers",
    },
    {
icon: "/images/theCost.jpg",
altName: "images-family",
paragraph: "Understanding the costs",
link: "/home-loan/say-hello",
    },
    {
icon: "/images/apartments2.jpg",
altName: "images-family",
paragraph: "Choosing the right investment home loan",
link: "/home-loan/say-hello",
    },
  ];

  let facilities = {
    heading: "Plan your property investment",
    items: [
{
id: 1,
title: "Check your borrowing power​",
desc: `We don't collect your phone number to show the best deals available with all the lenders.`,
icon: "/icons/calc.svg",
altName: "calculator-icon",
btnName: "Calculate now",
btnBorder: "#706d6e",
},
{
id: 2,
title: "Savings and equity​​",
desc: "If you already own a property, unlocking or accessing your equity can help fund your property investment purchase.",
icon: "/icons/coins.svg",
altName: "coins-icon",
btnName: "How does it work?",
btnBorder: "#706d6e",
},
{
id: 3,
title: "Investment loans & rates​",
desc: "Find the right loan and interest rate for your next investment property before you make any decisions.",
icon: "/icons/home.svg",
altName: "home-icon",
btnName: "Compare loans",
btnColor: "#ffcc00"
},
{
id: 4,
title:
"Get conditional pre-approval",
desc: "Show sellers you’re serious about investing and receive conditional pre-approval from Digital DSA.​",
icon: "/icons/ThumbsUp.svg",
altName: "thumbs-up-icon",
btnName: "Learn more",
btnBorder: "#706d6e",
},
    ],
  };

  let contents = [
    {
id: 1,
title: "Calculators",
links: [
{ id: 1, name: "How much can I borrow?", url: "/calculators/emi-calculator" },
{ id: 2, name: "What would my repayments be?", url: "/calculators/emi-calculator" },
{ id: 3, name: "What would my upfront costs be?", url: "/calculators/emi-calculator" },
],
    },
    {
id: 2,
title: "Tools",
links: [
{ id: 1, name: "Budget planner", url: "/planners/both" },
{ id: 2, name: "Home in conveyancing", url: "/planners/both" },
{ id: 3, name: "Home Hub app", url: "/planners/both" },
{ id: 4, name: "My Property app", url: "/planners/both" },
],
    },
  ];

  let help = [
    {
Heading: "Book an appointment",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/appointment.svg",
altTitle: "icons",
link: "/appointment",
    },
    {
Heading: "Manage your loan online",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
link: "/home-loan/top-up-only",
    },
    {
Heading: "Contact us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/contact.svg",
altTitle: "icons",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/msg.svg",
altTitle: "icons",
link: "/contact",
    },
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`Subject to credit approval. Fees, charges, terms and conditions apply. As this advice has been prepared without considering your objectives, financial situation or needs, you should consider its appropriateness to your circumstances before acting on the advice.`,
    ],
  };

  // Function to handle opening and closing of details
  // Toggle dropdown with animation
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
  let activeSection = $state(""); // Initially no section is active

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

<section>
  <!-- <p>This is new loan page</p>
              <Breadcrumb /> -->
  <!-- {page.url.pathname} -->
  <!-- Create a breadcrumb-style navigation with clickable links -->

  <PageDesign {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}>
          <div class="  flex gap-4 pr-4">
            {#each navList as lastItem}
              {#if lastItem.actionBtn}
                {#each lastItem.actionBtn as action}
                  <div>
                    <Button
                      btnName={action.firstBtn}
                      btnColor={action.btnColor}
                      link={action.link}
                    />
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </StickyNavbar>

        <div class="px-[2rem] lg:px-[4rem]">
          <div id="started" data-section="started" class="section">
            <div class="grid gap-[2rem] border-b border-borderColor py-[4rem]">
              <div class="grid gap-6">
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  Getting started
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  Unlike a home, buying the right investment property is a
                  financial decision. So, it’s important to understand the goals
                  and strategies behind a successful property investment.
                </p>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2 grid lg:grid-cols-2 gap-4">
                  {#each started as item}
                    <BlogCard
                      icon={item.icon}
                      altName={item.altName}
                      title={item.title}
                      paragraph={item.paragraph}
                      link={item.link}
                      btnName={item.btnName}
                      cardBorder="#E3E3E3"
                    />
                  {/each}
                </div>
                <div class="col-span-1 flex flex-col gap-6">
                  {#each sideBarMore as side, index}
                    <a href={side.link}>
                      <div
                        class="grid grid-cols-5 gap-[1rem] border shadow-[0px_0px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)]"
                      >
                        <div class="col-span-2">
                          <img
                            src={side.icon}
                            alt={side.altName}
                            class="aspect-square h-[6rem] object-cover"
                          />
                        </div>
                        <div class="col-span-3 content-center">
                          <h2>{side.paragraph}</h2>
                        </div>
                      </div>
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <div id="plan" data-section="plan" class="border-b border-borderColor section">
            <WhyChoose {facilities} gridCol=4/>
          </div>

          <div id="guide" data-section="guide" class="section">
            <TwoColumn
            cardImage="/images/propertyGuide.jpg"
            cardAltName="construction image"
            cardHeading="Investing in property guide"
          >
            <ul
              class="grid gap-[2rem] font-Paragraph text-subParaFont"
              slot="list"
            >
              <li>
                There are several things to consider when it comes to investing in property, so let’s look at what’s involved and how you can be sure this is the right option for you. Learn through our comprehensive investing in property guide.
              </li>

              <a
                  href="/"
                  class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                  >Download PDF guide</a
                >
            </ul>
          </TwoColumn>
          </div>

          <div id="reports" data-section="reports" class="section">
            <TwoColumn
              cardImage="/images/housing.jpg"
              cardAltName="housing image"
              cardHeading="Digital DSA Property & Suburb Reports"
              reverse
            >
              <ul
                class="grid gap-[2rem] font-Paragraph text-subParaFont"
                slot="list"
              >
                <li>
                    Your complimentary Property & Suburb Reports provide the latest information on new listings, auctions, recent sales and suburb profiles to help you make informed property decisions. You can access them for free when you book an appointment with one of our Home Lending Specialists.
                </li>

                <a
                href="/"
                class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                >Discover the reports
                </a
              >
              </ul>
            </TwoColumn>
          </div>

          <div id="tools" data-section="tools" class="section">
            <div class="border-b grid gap-4 md:grid-cols-3">
                <h2
                  class="col-span-1 py-[3rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  Tools & calculators
                </h2>
                <div class="col-span-2">
                  <Support {contents} gridCol={2} />
                </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:hidden block">
        {#each navBarMedium as list, index}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index <
            list.length - 1
              ? 'border-b'
              : ''} "
          >
            <summary
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end text-mobSubHead">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="started" class="bg-white text-black px-[2rem]">
                <div class="grid gap-[2rem] border-b border-borderColor py-[4rem]">
                    <div class="grid gap-6">
                      <h2
                        class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                      >
                        Getting started
                      </h2>
                      <p class="font-Paragraph text-minParaFont">
                        Unlike a home, buying the right investment property is a
                        financial decision. So, it’s important to understand the goals
                        and strategies behind a successful property investment.
                      </p>
                    </div>
                    <div class="grid gap-4">
                      <div class="grid md:grid-cols-2 gap-4">
                        {#each started as item}
                          <BlogCard
                            icon={item.icon}
                            altName={item.altName}
                            title={item.title}
                            paragraph={item.paragraph}
                            link={item.link}
                            btnName={item.btnName}
                            cardBorder="#E3E3E3"
                          />
                        {/each}
                      </div>
                      <div class="grid sm:grid-cols-2 gap-6">
                        {#each sideBarMore as side, index}
                          <a href={side.link}>
                            <div
                              class="flex gap-[1rem] border shadow-[0px_0px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)]"
                            >
                              <div class="">
                                <img
                                  src={side.icon}
                                  alt={side.altName}
                                  class="aspect-square h-[6rem] object-cover"
                                />
                              </div>
                              <div class="content-center">
                                <h2>{side.paragraph}</h2>
                              </div>
                            </div>
                          </a>
                        {/each}
                      </div>
                    </div>
                  </div>
              </div>
            {:else if index == 1}
              <div id="plan" class="bg-white text-black px-[2rem]">
                <WhyChoose {facilities} gridCols=4/>
              </div>
            {:else if index == 2}
              <div id="guide" class="bg-white text-black px-[2rem]">
                <TwoColumn
                cardImage="/images/propertyGuide.jpg"
                cardAltName="construction image"
                cardHeading="Investing in property guide"
              >
                <ul
                  class="grid gap-[2rem] font-Paragraph text-subParaFont"
                  slot="list"
                >
                  <li>
                    There are several things to consider when it comes to investing in property, so let’s look at what’s involved and how you can be sure this is the right option for you. Learn through our comprehensive investing in property guide.
                  </li>
    
                  <a
                      href="/"
                      class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                      >Download PDF guide</a
                    >
                </ul>
              </TwoColumn>
              </div>
            {:else if index == 3}
              <div id="reports" class="bg-white text-black px-[2rem]">
                <TwoColumn
              cardImage="/images/housing.jpg"
              cardAltName="housing image"
              cardHeading="Digital DSA Property & Suburb Reports"
              reverse
            >
              <ul
                class="grid gap-[2rem] font-Paragraph text-subParaFont"
                slot="list"
              >
                <li>
                    Your complimentary Property & Suburb Reports provide the latest information on new listings, auctions, recent sales and suburb profiles to help you make informed property decisions. You can access them for free when you book an appointment with one of our Home Lending Specialists.
                </li>

                <a
                href="/"
                class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                >Discover the reports
                </a
              >
              </ul>
            </TwoColumn>
              </div>
            {:else if index == 4}
              <div id="tools" class="bg-white text-black px-[2rem]">
                <div class="border-b grid gap-4 py-[3rem] ">
                    <h2
                      class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                    >
                      Tools & calculators
                    </h2>
                    <div class="">
                      <Support {contents} gridCol={2} />
                    </div>
                </div>
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <div class="px-[2rem] lg:px-[4rem]">
        <TwoColumn
          cardImage="/images/message.jpg"
          cardAltName="housing-figure"
          cardHeading="Message us 24/7"
        >
          <ul
            class="grid gap-[2rem] font-Paragraph text-subParaFont"
            slot="list"
          >
            <li>
              Get instant help from  the Digital DSA app or connect with
              a specialist who can message you back. You’ll need Digital DSA app
              notifications turned on so you know when you’ve received a reply.
            </li>

            <div class="w-auto">
              <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
            </div>
          </ul>
        </TwoColumn>
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
