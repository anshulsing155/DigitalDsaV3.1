<script>
	let {
		data
	} = $props();


  

  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
  import IconCard from "./IconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import ThreeCard from "./ThreeCard.svelte";
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
 
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "./WhyChoose.svelte";

  let pageData = {
    coverImage: "/images/babyHug.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Home Guarantee Scheme",
    heroParagraph: `Australian Government grants and schemes to help you buy your home sooner with a deposit from as little as 2-5%.*`,
  };

  let subList = [
    {
name: "What are the Guarantees?",
targetId: `guarantee`,
    },
    {
name: "Eligibility for the Guarantees",
targetId: `eligibility`,
    },
    {
name: "How to apply",
targetId: `apply`,
    },
    {
name: "Other grants & concessions",
targetId: `concessions`,
    },
  ];
  let navList = {
    firstBtn: "Book appointment",
    link: "/appointment",
    btnColor: "#ffcc00",
  };

  let getStart = [
    {
heading: "Getting ready to buy",
data: [
{
id: "1",
title: "Home buying made easy",
desc: `Your step-by-step guide to buying property, whether it's a home to live in or an investment for your future.`,
link: "Read home buying guide (PDF)",
url: "/",
},
{
id: "2",
title: "Saving for a deposit ",
desc: `Get some tips to help you start saving for your house deposit.`,
link: "Tell me more about saving for a deposit",
url: "",
},
{
id: "3",
title: "Should you get conditional pre-approval?",
desc: `Having conditional pre-approval can help show that you're serious about buying. `,
link: "Keep reading about conditional pre-approval",
url: "",
},
{
id: "4",
title: "Understand the costs",
desc: `There are a number of costs you'll need to factor into your home buying budget.`,
link: "Find out more about home buying costs",
url: "",
},
],
    },
  ];

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
para: `Get access to all the property tools and guidance you need in one place in <a class="underline underline-offset-4 text-linkColor">Home Hub  <a/>  within the undefined app.`,
icon: "/icons/home.svg",
iconAltName: "Alert Icon",
link: "/get-started/how-can-we-help",
btnName: "Check out Home Hub",
    },
  ];

  let forHome = [
    {
heading: "Property report ",
para: `Make informed property decisions and understand the market.`,
link: "/finance-support",
linkName: "Get Property Report",
    },
    {
heading: "Simplify your property purchase with Home-in",
para: `Digital DSA has partnered with Home-in, your personal home buying concierge to help simplify your first home buying journey. Helping you at every step, from pre-approval to shortlisting homes, conveyancing and settling on your new property.`,
link: "/finance-support",
linkName: "Get started with Home-in",
    },
    {
heading: "Watch our webinars for more guidance",
para: `We've created a four-part webinar series to support you as you get started on your property journey, whether you're looking for a place to live in or invest.`,
link: "/finance-support",
linkName: "Watch webinars",
    },
  ];

  let whatNext = [
    {
heading: "Understanding the home loan process",
para: `Our step-by-step guide from applying for your home loan to settlement. `,
link: "/offers",
linkName: "Tell me more",
    },
    {
heading: "Making an offer",
para: `Here's what you need to know about the final steps to owning a home.`,
link: "/offers",
linkName: "Keep reading",
    },
    {
heading: "Offset accounts",
para: `Offsetting your interest could shave thousands off your home loan.`,
link: "/offers",
linkName: "Keep reading",
    },
  ];

  let IconCardHeading = "Start your home buying journey with us today";

  

  let help = [
    {
Heading: "Book an appointment",
paragraph:
"Book instantly to speak to a home loan specialist at a time that suits you",
icon: "/icons/appointment.svg",
altTitle: "icons",
link: "/appointment",
    },
    {
Heading: "Check loan offers",
paragraph:
"In as little as 10 minutes and tailored exactly as per your financial profile.",
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
link: "/get-started/how-can-we-help",
    },
    {
Heading: "Contact us",
paragraph:
"Fast-track your call and connect with a specialist in the Digital DSA.",
icon: "/icons/contact.svg",
altTitle: "icons",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph:
"Get instant help from our online assistants  or chat to a specialist.",
icon: "/icons/msg.svg",
altTitle: "icons",
link: "/contact",
    },
  ];

  let navBarMedium = [
    "Getting ready",
    "Find a home",
    "What's next?",
    "Tools & calculators",
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`Applications are subject to credit approval. Full terms and conditions will be set out in our loan offer, if an offer is made. Fees and charges are payable. Once our allocation of loans under the scheme has been exhausted, standard lending approval criteria, including the need for LMI and LDP where appropriate, will apply.`,

`To find out more about the Home Guarantee Scheme, download the Australian Government's Information Guides for the First Home Guarantee (PDF), Family Home Guarantee (PDF) and Regional First Home Buyer Guarantee (PDF). You can also download the First Home Guarantee Declaration (PDF), Family Home Guarantee Declaration (PDF) and Regional First Home Buyer Declaration (PDF).`,
    ],
  };
  let firstHomeSooner = {
    heading: "You could buy your first home sooner",
    subPara: [
`Saving a deposit for your first home can be challenging. That’s why we're proud to work alongside the Australian Government on the Home Guarantee Scheme to help more <a class="underline underline-offset-4 text-linkColor">home buyers </a>  and single parents realise their home ownership goals.`,
`If you want to buy a property today you typically need to save at least 20% of the property’s value in order to secure a home loan and avoid paying <a class="underline underline-offset-4 text-linkColor">Lenders Mortgage Insurance (LMI) </a> or <a class="underline underline-offset-4 text-linkColor"> Low Deposit Premium (LDP)  </a>   or to avoid relying on a guarantor.`,
`With our <a class=underline underline-offset-4 text-linkColor>flexible home </a>  loans and competitive <a class="underline underline-offset-4 text-linkColor">interest rates </a> , the Home Guarantee Scheme is another way we can help home buyers into property ownership sooner.`,
    ],
  };

  let firstHomeGuarantee = {
    heading: "What is the First Home Guarantee?  ",
    subHeading:
"<p class=text-sm>  Under the First Home Guarantee, you're required to contribute a deposit as little as 5% of the property’s value. Housing Australia then provides a guarantee to the lender covering up to 15% of the property’s value. </p>",
    subPara: [
`The First Home Guarantee is an initiative from the Australian Government designed to support eligible home buyers purchase a home sooner.`,
`<a class="underline underline-offset-4 text-linkColor">Housing Australia  </a>  provides  a guarantee for eligible home buyers on low and middle incomes so that they can purchase a home with a deposit of as little as 5%.`,
`The Australian Government has made 35,000 First Home Guarantee places available for the current financial year through a panel of participating lenders, including the Commonwealth Bank.`,
    ],
  };
  let familyHomeGuarantee = {
    heading: "What is the Family Home Guarantee?",
    subHeading:
"<p class=text-sm>  Under the Family Home Guarantee, you're required to contribute a deposit of as little as 2% of the property’s value. The Housing Australia then provides a guarantee to the lender covering up to 18% of the property’s value.</p>",
    subPara: [
`The Family Home Guarantee is an Australian Government initiative designed to support eligible single parents or eligible single legal guardians with at least one dependent child in purchasing a family home.`,
`Housing Australia provides a guarantee for eligible single parents or single legal guardians with at least one dependent on low and middle incomes so that they can purchase a home to live in with a deposit of as little as two percent, regardless of whether the single parent or single legal guardian is a first home buyer or a previous home owner. `,
`The Australian Government has made 5,000 Family Home Guarantee places available for the current financial year through a panel of participating lenders, including the Commonwealth Bank.`,
    ],
  };
  let firstHomeBuyerGuarantee = {
    heading: "What is the Regional First  Home Buyer Guarantee? ",
    subHeading:
"<p class=text-sm> Under the Regional First Home Buyer Guarantee, you're required to contribute a deposit of as little as 5% of the property’s value. Housing Australia then provides a guarantee to the lender covering up to 15% of the property’s value. </p>",
    subPara: [
`The Regional First Home Buyer Guarantee is an initiative from the Australian Government designed to support eligible regional home buyers purchase a home in regional areas.`,
`Housing Australia provides a guarantee for eligible home buyers on low and middle incomes so that they can purchase a home with a deposit of as little as 5%.`,
`The Australian Government has made 10,000 Regional First Home Buyer Guarantee places available for the current financial year through a panel of participating lenders, including the Commonwealth Bank.`,
    ],
  };

  let eligible = {
    heading:
"Are you eligible for the First Home Guarantee, Family Home Guarantee or Regional First Home Buyer Guarantee?",
    subPara: [
"For the Home Guarantee Scheme, you can check your eligibility on the Housing Australia website. The following conditions will generally apply:",
    ],
    paraGraph: [
`Australian citizens and Australian permanent residents who are at least 18 years of age.`,
`Applicants must not have previously owned or had an interest in a residential property, either separately or jointly with someone else (this includes residential strata and company title properties, regardless of whether it was an investment or owner-occupied property and whether it was ever lived in) in the past 10 years.`,
`Family Home Guarantee applicants are allowed to have previously or currently own a home, however at the time they become the registered owner of the property being purchased must not have a freehold interest in property (this includes land).`,
`Only singles with a taxable income of up to $125,000 per annum and couples with a combined taxable income of up to $200,000 per annum may be eligible (taxable income as shown on the Notice of Assessment issued by the Australian Taxation Office).`,
`For the First Home Guarantee and Regional First Home Buyer Guarantee, co-borrowers are eligible including married, in a de facto relationship, siblings, parent/child or friends.`,
`For the Family Home Guarantee, the applicant must be a single parent or single legal guardian with at least one dependent child.`,
`The Guarantee will only apply to Owner Occupied home loans paid on a principal and interest basis (investment properties and Interest Only loans are excluded). If the loan relates both to the purchase of vacant land and to the construction of a house, the loan may still be eligible even if the terms of the construction loan agreement permit Interest Only payments for the partially funded period.`,
`For the First Home Guarantee and Regional First Home Buyer Guarantee, applicants must have a deposit of between 5% and 20% of the property’s value and contribute the maximum amount of funds available to them.`,
`For the Family Home Guarantee, applicants must have a deposit of between 2% and 20% and contribute the maximum amount of funds available to them.`,
`For the Regional First Home Buyer Guarantee, at least one applicant must have lived in the region (ASGS SA4 2016) or an adjacent region for the entire previous 12 months.`,
`Refer to the Housing Australia Regional Checker to see if your postcode is eligible under the Regional First Home Buyer Guarantee.`,
    ],
    bottomPara: [
`Your maximum property purchase price is subject to the suburb and postcode of your new property. You can check the property price threshold for your property’s suburb and postcode using Housing Australia's property price threshold tool.
`,
`You can only use the Guarantee once for the settlement of a home. If you were unable to purchase a property in the required timeframe, you may be able to make a new place reservation.

`,
    ],
  };

  let apply = {
    heading: "How do you apply?",
    subHeading: `To apply for the First Home Guarantee, Family Home Guarantee, Regional First Home Buyer Guarantee, speak to a undefined Home Lending Specialist who will guide you through the application process. Simply <a class="underline underline-offset-4 text-linkColor">book an appointment online <a/> , call 13 2224, or visit a lender at your nearest <a class="underline underline-offset-4 text-linkColor">branch <a/>  .`,
    items: [
{
id: 1,
title: "1. Prepare​",
desc: `Talk to our Home Lending Specialists about how to prepare for when you're provided a place (eligibility criteria apply).`,
},
{
id: 2,
title: "2. Submit your application",
desc: "Our Home Lending Specialists will help you with the documents required, lodge them on your behalf and keep you up to date on the progress of your application. <br> You'll need to purchase your home within 90 days of approval on the Home Guarantee Scheme.",
},
{
id: 3,
title: "3. Move in​",
desc: "Move in and enjoy your new home.",
},
    ],
  };

  let assistanceGrant = {
    items: [
{
id: 1,
title: "First Home Owners Grant. ​",
desc: `The First Home Owner Grant is a government scheme that was introduced in 2000 to offset the effect of Goods and Services Tax (GST) on buying or building a home. It’s a one-off payment for eligible first home buyers who purchase or build a residential property to live in. Eligibility isn’t based on financial considerations such as your income.

<br> <br> To find out how it works, visit the First Home Owners Grant website.`,
},
{
id: 2,
title: "Stamp duty concessions",
desc: `Stamp duty is a tax levied by state or territory governments on certain purchases, including buying a home, land, or investment property. Depending on your state or territory, you may be eligible for concessions as a first home buyer.

<br> <br> In NSW from 1 August 2020 and for a 12-month period, the threshold above which stamp duty is charged on new homes for first home buyers increased from $650,000 to $800,000, with the concession reduced on higher values before phasing out at $1 million. The stamp duty threshold on vacant land rose from $350,000 to $400,000 and phases out at $500,000. Note: these threshold changes only apply to newly built homes and vacant land in NSW.

`,
},
{
id: 3,
title: "The First Home Super Saver Scheme​",
desc: `The First Home Super Saver Scheme allows you to save money for your first home using your superannuation fund. This scheme, run by the Australian Taxation Office (ATO), helps first home buyers save faster by allowing them to withdraw voluntary super contributions they’ve made to their super.

<br> <br> For more information, visit the ATO website.`,
},
{
id: 4,
title: "Victorian Homebuyer Fund​",
desc: `The Victorian Homebuyer Fund is a shared equity scheme funded by the State Government. Commonwealth Bank will be participating in the Scheme, starting 8 December 2022.`,
},
    ],
  };

  let weHelp = {
    heading: "We're here to help",
    subPara: [
`We understand that saving a deposit for your first home can be challenging and we’re here to help. When applications open, speak with a <a class="underline underline-offset-4 text-linkColor">Home Lending Specialist </a>  to see what options are available to you. Call 13 2224, book an <a href="/appointment" class="underline underline-offset-4 text-linkColor"> appointment online</a>  , find a mobile lender or visit your <a class="underline underline-offset-4 text-linkColor">nearest branch </a> .
`,
    ],
  };

  let contents = [
    {
thirdBox: [
{
title: "Calculators & tools",
links: [
{
name: "Upfront costs (stamp duty) calculator",
url: "/calculators/emi-calculator",
},
{
name: "Repayments calculator",
url: "/calculators/emi-calculator",
},
{
name: "Home buying concierge & conveyancing by Home-in",
url: "/calculators/emi-calculator",
},
{
name: "Budget planner",
url: "/calculators/emi-calculator",
},
{
name: "Home Hub",
url: "/calculators/emi-calculator",
},

],
},
],
firstBox: [
{
linkName: `How much can I borrow?`,
url: "/calculators/emi-calculator",
icon: "/icons/calc.svg",
},
],
secBox: [
{
src: "/images/laptopPic.jpg",
alt: "images-laptopPic",
heading: "undefined My Property",
para: `undefined My Property redefines how you view, track and manage your home loan online to help you achieve your property goals.`,
link: "Tell me more about My Property",
url: "/home-loan/my-property",
},
],
    },
  ];
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
</script>

<section>
  <PageDesign {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}>
          <div class="  flex gap-4 pr-4">
            <div>
              <Button
                btnName={navList.firstBtn}
                btnColor={navList.btnColor}
                link={navList.link}
              />
            </div>
          </div>
        </StickyNavbar>

        <div class=" px-[2rem] lg:px-[4rem]">
          <div>
            <div id="guarantee" data-section="guarantee">
              <div class="border-b border-borderColor">
                <ThingsYouShould thinkKnow={firstHomeSooner} />
              </div>
              <div class="border-b border-borderColor">
                <ThingsYouShould thinkKnow={firstHomeGuarantee} />
              </div>
              <div class="border-b border-borderColor">
                <ThingsYouShould thinkKnow={familyHomeGuarantee} />
              </div>
              <div class="border-b border-borderColor">
                <ThingsYouShould thinkKnow={firstHomeBuyerGuarantee} />
              </div>
            </div>
            <div
              id="eligibility"
              data-section="eligibility"
              class="border-b border-borderColor"
            >
              <ThingsYouShould thinkKnow={eligible} disc="list-disc " />
            </div>

            <div id="apply" data-section="apply">
              <div class="border-b border-borderColor">
                <WhyChoose facilities={apply} gridCol={3} />
              </div>
              {#if cardDataList.length > 0}
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
              {/if}
            </div>

            <div id="concessions" data-section="concessions">
              <div
                class="grid grid-cols-3 border-b border-borderColor gap-[2rem]"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont col-span-1 pt-[8rem]"
                >
                  Other assistance grants & concessions
                </h2>
                <div class="col-span-2">
                  <WhyChoose facilities={assistanceGrant} gridCol={2} />
                </div>
              </div>

                <ThingsYouShould thinkKnow={weHelp} />

                <div id="support" class="section" data-section="support">
                  <div class="border-b border-borderColor">
                    <div class="grid lg:grid-cols-3 gap-4 py-[1rem] md:py-[4rem]">
                      {#each contents as content}
                        {#each content.thirdBox as details}
                          <div
                            class="border-2 border-borderColor min-h-[50svh] h-full p-[1rem] md:p-[2rem] flex flex-col justify-between"
                          >
                            <div class="flex flex-col gap-4">
                              <h3 class="font-ThirdHead text-minSubHead">
                                {details.title}
                              </h3>
                              <div class="flex flex-col gap-2">
                                {#each details.links as link, index}
                                  <ul class="list-disc marker:text-black pl-4">
                                    <li
                                      class="underline text-linkColor hover:no-underline"
                                    >
                                      <a href={link.url}>{link.name}</a>
                                    </li>
                                  </ul>
                                {/each}
                              </div>
                            </div>
                            <a
                              href="/home-loan/home-loan-tools-calculator"
                              class="hover:underline text-linkColor font-Paragraph text-subParaFont"
                              >Show me more home loan tools and calculators</a
                            >
                          </div>
                        {/each}
                        {#each content.firstBox as details}
                          <a
                            href={details.url}
                            class="border-2 border-borderColor min-h-[50svh] h-full p-[1rem] md:p-[2rem] flex justify-center items-center bg-darkColor text-white"
                          >
                            <div class="flex flex-col justify-center items-center">
                              <img src={details.icon} alt="icon" />
                              <p class="text-center font-Paragraph text-subParaFont">
                                {details.linkName}
                              </p>
                            </div>
                          </a>
                        {/each}
                        {#each content.secBox as details}
                          <div class="border-2 border-borderColor min-h-[50svh] h-full">
                            <div>
                              <img src={details.src} alt={details.alt} />
                            </div>
                            <div class="p-[1rem] md:p-[2rem] flex flex-col gap-4">
                              <h3 class="font-ThirdHead text-minSubHead">
                                {details.heading}
                              </h3>
                              <p class="font-Paragraph text-minParaFont">
                                {details.para}
                              </p>
                              <a
                                href={details.url}
                                class="text-linkColor hover:underline font-Paragraph text-subParaFont"
                                >{details.link}</a
                              >
                            </div>
                          </div>
                        {/each}
                      {/each}
                    </div>
                  </div>
                </div>

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

          <div data-section="calculators" id="calculators" class="section">
           
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
              <div id="ready" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each getStart as steps}
                  <div class="">
                    <NewHome {steps} />
                  </div>
                {/each}

                {#if cardDataList.length > 0}
                  <div class="pt-[2rem]">
                    <h3
                      class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                    >
                      {IconCardHeading}
                    </h3>
                    <div class="grid md:grid-cols-2 lg:grid-cols-4">
                      {#each cardDataList as cardData (cardData.heading)}
                        <IconCard {cardData} />
                      {/each}
                    </div>
                  </div>
                {/if}
                <TwoColumn
                  cardImage="/images/housing.jpg"
                  cardAltName="housing-figure"
                  cardHeading="How much can I borrow?"
                  reverse
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="font-Paragraph text-minParaFont">
                      Get an estimate of how much you may be able to borrow.
                    </p>
                    <a
                      href="/calculators/emi-calculator"
                      class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                      >Use calculator</a
                    >
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 1}
              <div
                id="find"
                class="py-[4rem] flex flex-col bg-white text-black px-[2rem]"
              >
                {#if forHome.length > 0}
                  <h2
                    class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Looking for a home
                  </h2>
                  <div
                    class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                  >
                    {#each forHome as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                {/if}
              </div>
            {:else if index == 2}
              <div id="next" class="bg-white text-black px-[2rem] py-[1rem]">
                <TwoColumn
                  cardImage="/images/home-scheme.jpg"
                  cardAltName="parent-figure"
                  cardHeading="Home Guarantee Scheme"
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="font-Paragraph text-minParaFont">
                      You may be able to buy your first home sooner with a
                      smaller deposit.
                    </p>
                    <a
                      href="/finance-support"
                      class="underline underline-offset-4 hover:no-underline text-linkColor font-Paragraph text-subParaFont"
                      >Discover the Scheme</a
                    >
                  </div>
                </TwoColumn>

                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  {#if whatNext.length > 0}
                    <h2
                      class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                    >
                      What's next?
                    </h2>
                    <div
                      class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                    >
                      {#each whatNext as cardData (cardData.heading)}
                        <ThreeCard {cardData} />
                      {/each}
                    </div>
                  {/if}
                </div>

                <HomeIntrest
                  homeInterest="See our home loan options"
                  btnName="Explore now"
                  btnBorder="#4F4C4D"
                />
              </div>
            {:else if index == 3}
              <div
                id="calculators"
                class="bg-white text-black px-[2rem] py-[1rem]"
              >
                <div class="grid lg:grid-cols-3">
                  <h2
                    class="lg:col-span-1 pt-[3rem] lg:pb-[3rem] pb-0 font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Tools & calculators
                  </h2>
                  <div class="col-span-2">
                    <Support {contents} gridCol={2} />
                  </div>
                </div>
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

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
