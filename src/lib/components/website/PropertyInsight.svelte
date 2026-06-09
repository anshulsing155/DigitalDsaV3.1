<script>
	let {
		data
	} = $props();



  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThreeCard from "$lib/components/website/ThreeCard.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import PaymentTable from "$lib/components/website/PaymentTable.svelte";
  import Journey from "$lib/components/website/Journey.svelte";
  import Information from "$lib/components/website/Information.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import gsap from "gsap";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import IconCard from "./IconCard.svelte";
  import Ways from "./Ways.svelte";
  import BlogCard from "./BlogCard.svelte";
  import AnchorCounter from "./AnchorCounter.svelte";

  let pageData = {
    coverImage: "/images/houseRoadCar.jpg",
    altName: "images-houseRoadCar",
    classStyle: "object-cover xl:h-[70svh] 3xl:h-[70svh]",
    heroHeading: "Property Value: Reports & Insights",
    heroParagraph: `Thinking about buying or selling a home? undefined's property report provides the latest information on new listings, auctions, recent sales, suburb profiles. Obtain a property estimate and make more informed property decisions before placing an offer.`,
  };

  let subList = [
    {
name: "Know your property",
targetId: `knowProperty`,
    },
    {
name: "Tools & support",
targetId: `toolsSupport`,
    },
    {
name: "Property search",
targetId: `propertySearch`,
    },
    {
name: "Features and benefits",
targetId: `benefit`,
    },
  ];

  let navList = [
    {
actionBtn: [
{
firstBtn: "Book appointment",
link: "/appointment",
btnColor: "#ffcc00",
},
],
    },
  ];

  let navBarMedium = [
    "Know your property",
    "Tools & support",
    "Property search",
    "Features and benefits",
  ];

  let thinkKnow = {
    heading: "Know your property & the market",
    subPara: [
`^ Conditional pre-approval provides an estimate of the amount you can borrow based on the information you provide. The loan attributes, as well as interest rate changes, may result in changes to the amount you can borrow. The amount you can borrow is also subject to verification of your financial position, satisfactory security and to the Bank’s normal credit approval. It shouldn’t be considered an approval for a loan or a loan offer. Full terms and conditions (including fees and charges payable) will be included in the Bank’s offer documents, if an offer is made.`,
    ],
  };

  let benefits = [
    {
heading: "Estimated price",
para: `Find out what the property is worth based on recent comparable sales.`,
    },
    {
heading: "On the market",
para: `Our reports provide in-depth information on properties for sale in the neighbourhood, including listing dates, agents and lot plan details.`,
    },
    {
heading: "Suburb insights",
para: `Get median sale prices, value of sales, rental and demographic profiles.`,
    },
    {
heading: "Rental information",
para: `Interested in an investment property? See comparative rental properties including weekly rental prices, rental yield and capital growth.`,
    },
    {
heading: "Radius search",
para: `Our lenders can perform a radius search for you that targets a particular property as a starting point and look for comparable properties in the surrounding area.`,
    },
    {
heading: "Territory builder",
para: `Want to be close to a certain school, your parent’s home, or workplace? Our lenders can build your own 'territories' using an interactive map that will return all the homes in this area that meet your criteria.`,
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

  let IconCardHeading = "Start your home buying journey with us today";
  let cardDataList = [
    {
heading: "Know your borrowing power",
para: "Get the confidence to act quickly when the right property comes along",
icon: "/icons/checklist.svg",
iconAltName: "Message Icon",
link: "/calculators/emi-calculator",
btnName: "Check condition approval",
    },
    {
heading: "Apply for a loan",
para: "When you've found a property or want to refinance with undefined.",
icon: "/icons/apply-pen.svg",
iconAltName: "Alert Icon",
link: "/get-started/how-can-we-help",
btnName: "Apply for a home loan",
    },
    {
heading: "Ask a Lending expert",
para: "Talk on the phone or in person – whatever works best for you.",
icon: "/icons/contact.svg",
iconAltName: "Alert Icon",
link: "/appointment",
btnName: "Book an appointment",
    },
    {
heading: "Make informed property decisions with Home Hub",
para: `Get access to all the property tools and guidance you need in one place in <a class="underline text-linkColor">Home Hub </a>  within the undefined app.`,
icon: "/icons/home.svg",
iconAltName: "Alert Icon",
link: "/get-started/how-can-we-help",
btnName: "Check out Home Hub",
    },
  ];

  let knowMarket = {
    heading: "Know your property & the market",
    subPara: [
`Using the most up-to-date information from CoreLogic, Australia’s leading property data, information, analytics and service provider, our Property and Suburb Reports provide a comprehensive snapshot of a property and its neighbourhood.`,
`<a href="" class="underline hover:no-underline underline-offset-4">See sample Property Report </a>`,

`<a href="" class="underline hover:no-underline underline-offset-4">See sample Subhurb Report </a>`,
    ],
  };
  let propertySearch = {
    heading: `Property search`,
    para: `Existing undefined customer? Log onto NetBank and find your perfect property sooner  with market estimates and affordability snapshots.`,
    btnName: `Log on`,

    btnLink: "",
    btnColor: "#ffcc00",
  };
  let propertyPurchase = {
    heading: `Simplify your property purchase with Home-in`,
    para: `undefined has partnered with Home-in, your personal home buying concierge, simplifying complex processes and helping you in every step of your home buying journey.`,
    btnName: `Get started`,
    btnBorder: "#706d6e",

    btnLink: "",
  };
  let blogs = [
    {
icon: "/images/getReport.jpg",
altName: "images-getReport",
title: "Get the report",
paragraph: `Following an appointment with one of our Home Lending Specialists, access an unlimited number of reports and get all the insights to the property you may be interested in buying or selling, as well as compare it against similar properties on the market.`,
btnName: "Book appointment",
btnColor: "#ffcc00",
link: "/appointment"
    },

    {
icon: "/images/homeHub.jpg",
altName: "images-homeHUb",
title: "Home Hub",
paragraph: `Get access to all the property reports, tools and guidance you need in one place in Home Hub within the undefined app.`,
linkName: "Find out more",
url: "/home-loan/Home-Hub"
    },
    {
icon: "/images/borrowingPower.jfif",
altName: "images-borrowingPower",
title: "Know your borrowing power",
paragraph: `Get the confidence to act quickly when the right property comes along. Calculate your income and expenses to estimate how much you may be able to borrow for a home loan. Check conditional pre-approval.`,
btnName: "Check now",
btnBorder: "#4F4C4D",
link: "/calculators/emi-calculator"
    },
  ];

 

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
        <AnchorCounter/>
        <div class="px-[2rem] lg:px-[4rem]">
          <div  id="knowProperty"
            data-section="knowProperty"
            class="border-b border-borderColor py-[2rem]"
          >
            <ThingsYouShould thinkKnow={knowMarket} />
          </div>
          <div id="toolsSupport" data-section="toolsSupport" class="py-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              Tools & support
            </h2>
            <div
              class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[2rem]"
            >
              {#each blogs as blog (blog.title)}
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
                  cardBorder="#E3E3E3"
                />
              {/each}
            </div>
          </div>
          <div id="propertySearch" data-section="propertySearch">
            <Ways ways={propertySearch} />
          </div>
          <div
            id="benefit"
            data-section="benefits"
            class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section"
          >
            {#if benefits.length > 0}
              <h2
                class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                Features & benefits
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each benefits as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            {/if}
            <Ways ways={propertyPurchase} />
            <div class="pt-[4rem]">
              <h3
                class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                {IconCardHeading}
              </h3>
              <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                {#each cardDataList as cardData (cardData.heading)}
                  <IconCard {cardData} />
                {/each}
              </div>
            </div>
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
                  Get help from  the undefined app or connect with a
                  specialist who can message you back. You’ll need <span
                    class="underline text-linkColor cursor-pointer">undefined app</span
                  >
                  notifications turned on so you know when you’ve received a reply.
                </li>

                <div class="w-auto">
                  <Button
                    link="/contact"
                    btnBorder="#4F4C4D"
                    btnName="Message us"
                  />
                </div>
              </ul>
            </TwoColumn>
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
            <div  id="knowProperty"
            data-section="knowProperty"
            class="bg-white text-black px-[2rem]"
          >
            <ThingsYouShould thinkKnow={knowMarket} />
          </div>
            {:else if index == 1}
            <div id="toolsSupport"  class="py-[1rem] bg-white text-black px-[2rem]">
              <h2
                class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                Tools & support
              </h2>
              <div
                class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[2rem]"
              >
                {#each blogs as blog (blog.title)}
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
                    cardBorder="#E3E3E3"
                  />
                {/each}
              </div>
            </div>
            {:else if index == 2}
            <div id="propertySearch" class="bg-white text-black px-[2rem]" >
              <Ways ways={propertySearch} />
            </div>
            {:else if index == 3}
            <div
            id="benefit"
            data-section="benefits"
            class="bg-white text-black px-[2rem] py-[1rem]"
          >
            {#if benefits.length > 0}
              <h2
                class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                Features & benefits
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each benefits as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            {/if}
            <Ways ways={propertyPurchase} />
            <div class="pt-[4rem]">
              <h3
                class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                {IconCardHeading}
              </h3>
              <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                {#each cardDataList as cardData (cardData.heading)}
                  <IconCard {cardData} />
                {/each}
              </div>
            </div>
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
                  Get help from  the undefined app or connect with a
                  specialist who can message you back. You’ll need <span
                    class="underline text-linkColor cursor-pointer">undefined app</span
                  >
                  notifications turned on so you know when you’ve received a reply.
                </li>

                <div class="w-auto">
                  <Button
                    link="/contact"
                    btnBorder="#4F4C4D"
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
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
