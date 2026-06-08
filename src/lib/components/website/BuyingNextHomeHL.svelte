<script>
	let {
		data,
		pageData = {
    coverImage: "/images/buyingNextHome.jpg",
    coverAlt:
      "photo of a happy indian family with two young kids planning to move in new home with the help of DigitalDSA services",
    heading: "Buying your next home",
    para: `Thinking about upsizing or a tree or sea change?  
  Things may be a little different the second time around.  
  We’ve got the tools and support to help you sell and get moving into your next home.`,
    actionBtns: [
      {
        btnName: "Connect with us",
        btnLink: "/appointment",
      },
      {
        btnName: "Check latest offers ",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true
      },
    ],
  }
	} = $props();



  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";

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
  let activeSection = ""; // Initially no section is active

;

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

  //send data child to parent
  const dispatch = createEventDispatcher();

  let exampleTableData = [
    {
columnName: [
"Feature",
`Resale property (<span class="text-green-400">✅ Pros</span>)`,
`Resale property (<span class="text-red-400">❌ Cons</span>)`,
`Direct purchase from builder (<span class="text-green-400">✅ Pros</span>)`,
`Direct purchase from builder (<span class="text-red-400">❌ Cons</span>)`,
],
rowData: [
{
"Location & connectivity": [
"Established neighborhoods with good infrastructure",
"Older surroundings, limited future development",
"Newer townships, planned layouts",
"Often in developing areas with fewer amenities initially",
],
},
{
"Possession timeline": [
"Immediate possession, no waiting",
"–",
"Option to buy under construction or ready-to-move homes",
"High risk of possession delay in under-construction properties",
],
},
{
"Customization & layout": [
"Existing structure gives a clear idea of space",
"No major customization possible",
"Choose layouts, interiors, and fixtures",
"Limited customization if buying a ready property",
],
},
{
"Cost factors": [
"No GST, lower upfront cost",
"May require renovation, leading to additional expenses",
"Modern amenities, better construction quality",
"Includes GST, making it more expensive",
],
},
{
"Future value & investment": [
"Property value depends on demand in the area",
"Older properties may have limited resale demand",
"High resale potential due to modern design and amenities",
"Construction quality and appreciation depend on the builder's reputation",
],
},
],
    },
  ];

  $effect(() => {
    onMount(() => {
setTimeout(() => {
const text = document.querySelector(".content")?.innerText || "";
dispatch("textExtracted", text);
dispatch("pageData", pageData);
}, 100); // Small delay to ensure DOM updates
    });
  });
</script>

<Seo
  type="WebPage"
  title="Buying Your Next Home: Smart Guide to Upsizing & Investing"
  image={pageData.coverImage}
  description="Find expert tips, tools & financing options for buying your next home. Explore resale vs. direct purchase & maximize your property investment."
  keywords="Buying your next home, Upsizing your home, Home investment guide, Second home financing, Resale vs new home, Home loan options, Property investment tips, Real estate market insights, Home buying process, Best neighborhoods to buy"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar
          navList={{
            items: [
              {
                name: "Getting started",
                targetId: `started`,
              },
              {
                name: "Why buy?",
                targetId: `whybuy`,
              },
              {
                name: "Why choose?",
                targetId: `whychoose`,
              },
              {
                name: "Tools & calculators",
                targetId: `calculators`,
              },
            ],

            actionBtns: [
              {
                btnName: "Connect with us",
                btnLink: "/appointment",
              },
              {
                btnName: "Check latest offers ",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
              },
            ],
          }}
          {activeSection}
        ></StickyNavbar>

        <div id="started" data-section="started" class="section">
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Getting ready to buy",
              cardData: [
                {
                  id: "1",
                  title: "Renovate or move?",
                  para: `If you like where you live, you may want to consider renovating instead of finding a new home.`,
                  linkName: "Read more",
                  url: "/home-loan/renovate-or-move",
                },
                {
                  id: "2",
                  title: "Turning your home into an investment",
                  para: `Depending on your circumstances, you could consider turning your current home into an investment property.`,
                  linkName: "Tell me more",
                  url: "/home-loan/turning-your-home-into-investment",
                },
                {
                  id: "3",
                  title: "How to choose the perfect neighborhood",
                  para: `Finding the right neighborhood is just as important as finding the right home`,
                  linkName: "Tell me more",
                  url: "/home-loan/choose-perfect-neighbourhood",
                },
                {
                  id: "4",
                  title: "Buying a property through resale or direct purchase",
                  para: `Explore the pros and cons of buying a property through resale or direct purchase to make an informed decision that suits your needs and budget.`,
                  linkName: "Tell me more",
                  url: "/home-loan/buy-property-resale",
                },
              ],
            }}
          />
        </div>

        <div id="whybuy" data-section="whybuy">
          <AboveTitleWithTopIconCard
            listGridAboveLg="2"
            contents={{
              heading: `Why buy your next home?`,

              xlGridCol: 2,
              borderBottom: true,
              list: [
                {
                  heading: "Lifestyle upgrade",
                  topPara: `Need more space for your growing family? Or perhaps a home closer to work, schools, or amenities?`,
                  icon: "/icons/uniqueLink.svg",
                  altName: "unique-icon",
                },
                {
                  heading: "Investment opportunity",
                  topPara: `A second property can serve as a rental income source or an asset for future financial security.`,
                  icon: "/icons/features.svg",
                  altName: "investment-icon",
                },
                {
                  heading: "Vacation home",
                  topPara: `A dream getaway in the hills, by the beach, or in a serene township.`,
                  icon: "/icons/ownership.svg",
                  altName: "vacation-icon",
                },
                {
                  heading: "Relocation or retirement",
                  topPara: `Planning a move to a quieter city or a retirement-friendly location?`,
                  icon: "/icons/offers.svg",
                  altName: "relocation-icon",
                },
              ],
            }}
          />

          <AboveTitleWithTopIconCard
            contents={{
              heading: `Key considerations for next-home buyers`,
              xlGridCol: 1,
              borderBottom: true,
              list: [
                {
                  heading: "Sell or retain your current home?",
                  topPara: `• <span class="font-FourthHead">Sell before you buy :</span> This can free up funds for your next purchase and reduce financial strain.<br>
                        • <span class="font-FourthHead">Keep your current home :</span> If you’re financially stable, your current property can become a rental income source.`,
                  icon: "/icons/sellingHome.svg",
                  altName: "sell-retain-icon",
                },
                {
                  heading: "Financing your next home",
                  topPara: `• <span class="font-FourthHead">Leverage your home equity :</span> If you have a running home loan, you may consider a balance transfer or a top-up loan.<br>
                        •<span class="font-FourthHead"> Down payment considerations :</span> If you’re selling your current home, ensure you align the timelines for sale proceeds and the next purchase.<br>
                        •<span class="font-FourthHead"> Second home loan:</span> Understand the tax implications and benefits of owning multiple properties.`,
                  icon: "/icons/personalLoan.svg",
                  altName: "financing-icon",
                },
                {
                  heading: "Property type and purpose",
                  topPara: `• Are you buying for self-use or investment? <br>
                        • Consider if you're looking for a resale property, a new home from a builder, or a vacation home in a prime location.`,
                  icon: "/icons/inte.svg",
                  altName: "property-type-icon",
                },
                {
                  heading: "Stamp duty & registration",
                  topPara: `• Be aware that stamp duty and registration charges differ for second-home buyers and may not come with first-time buyer concessions.`,
                  icon: "/icons/interestIcon.svg",
                  altName: "stamp-duty-icon",
                },
                {
                  heading: "Maintenance costs",
                  topPara: `• Owning multiple properties comes with additional maintenance costs such as property taxes, utilities, and society fees.`,
                  icon: "/icons/mutualFund.svg",
                  altName: "maintenance-icon",
                },
                {
                  heading: "Rental income opportunities",
                  topPara: `• If you're investing in a second property, assess the rental demand and expected income in the locality.`,
                  icon: "/icons/FD.svg",
                  altName: "rental-income-icon",
                },
              ],
            }}
          />

          <div class="border-b border-borderColor">
            <AboveTitleWithTopIconCard
              contents={{
                heading: `Benefits of buying your next home`,
                xlGridCol: 1,
                borderBottom: true,
                list: [
                  {
                    heading: "Tax benefits",
                    topPara: `Interest paid on a second home loan is eligible for tax deductions under certain conditions.`,
                  },
                  {
                    heading: "Asset diversification",
                    topPara: `Investing in real estate strengthens your portfolio.`,
                  },
                  {
                    heading: "Long-term appreciation",
                    topPara: `Property values in prime locations tend to grow steadily over time.`,
                  },
                ],
              }}
            />
          </div>

          <AboveTitleWithTopIconCard
            listGridAboveLg="2"
            contents={{
              heading: `Steps to make your next purchase seamless`,
              xlGridCol: 2,
              borderBottom: true,
              list: [
                {
                  heading: "Evaluate your financial position",
                  topPara: `Assess your existing home loan, EMIs, and disposable income.`,
                  icon: "/icons/coinHouse.svg",
                  altName: "financial-position-icon",
                },
                {
                  heading: "Research the market",
                  topPara: `Look for properties in areas with good appreciation potential, rental demand, or lifestyle value.`,
                  icon: "/icons/stocks.svg",
                  altName: "research-market-icon",
                },
                {
                  heading: "Get pre-approved",
                  topPara: `This will give you a clear idea of your borrowing power and make negotiations smoother.`,
                  icon: "/icons/educationLoan.svg",
                  altName: "pre-approved-icon",
                },
                {
                  heading: "Seek professional advice",
                  topPara: `Hire a reliable real estate agent or property consultant to explore the best options.`,
                  icon: "/icons/phoneConnection.svg",
                  altName: "professional-advice-icon",
                },
              ],
            }}
          />
        </div>
        <div id="whychoose" data-section="whychoose">
          <div
            class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
          >
            <div class="">
              <h2
                class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont text-center"
              >
                Why choose resale or direct purchase from a builder?
              </h2>
            </div>
            <div class="">
              {#each exampleTableData as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>

          <TwoColumnWithLeftHeading
            contents={{
              heading: "Make your next home count",
              secPara: `<p>💡Your second or next home is more than just a property it’s a lifestyle upgrade, a step toward financial growth, or a dream fulfilled. By evaluating your needs, financial goals, and property options, you can ensure your next home is everything you’ve envisioned.</p>
                  <p>Whether you’re buying for self-use or investment, plan ahead, and don’t hesitate to seek expert guidance to make an informed decision.</p>`,
            }}
          />

          <ButtonBanner
            contents={{
              heading: `Compare home loan offers online`,
              para: `Looking to transfer your home loan? Explore and compare the best offers to secure better terms and maximize your savings.`,
              btnName: "Compare rates",
              btnBorder: `#4F4C4D`,
              btnColor: `#ffcc00`,
              btnLink: "/get-started/how-can-we-help",
            }}
          />
        </div>
        <div data-section="calculators" id="calculators" class="section">
          <AboveTitleWithBlackCard
            contents={{
              heading: "Home loan calculator",
              xlGridCol: 4,
              borderBottom: true,
              cards: [
                {
                  heading: " How much can I borrow?",
                  icon: "/icons/calc.svg",
                  iconAltName: "icon-calc",
                  url: "/calculators/affordability-calculator",
                },
                {
                  heading: " Home loan repayments calculator",
                  icon: "/icons/lap.svg",
                  iconAltName: "loan-icon",
                  url: "/planners/part-payment-planner",
                },
                {
                  heading: "  Stamp duty calculator",
                  icon: "/icons/apply.svg",
                  iconAltName: "icons-apply",
                  url: "/calculators/stamp-duty-calculator",
                },
                {
                  heading: "Calculators & tools?",
                  icon: "/icons/calc.svg",
                  iconAltName: "icons-calc",
                  url: "/home-loan/home-loan-tools-calculator",
                },
              ],
            }}
          />
        </div>
      </div>
      <div class="lg:hidden block">
        {#each ["Getting started", "Why buy?", "Why choose?", "Tools & calculators"] as list, index}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index <
            list.length - 1
              ? 'border-b'
              : ''} "
          >
            <summary
              class="col-span-3 list-none px-[1rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4 font-FourthHead text-subParaFont"
              >
                <h2 class="">{list}</h2>
                <div class="icon-container justify-self-end">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="started" class="text-black bg-white">
                <ThreeColumWithLeftHeading
                  contents={{
                    heading: "Getting ready to buy",
                    cardData: [
                      {
                        id: "1",
                        title: "Renovate or move?",
                        para: `If you like where you live, you may want to consider renovating instead of finding a new home.`,
                        linkName: "Read more",
                        url: "/home-loan/renovate-or-move",
                      },
                      {
                        id: "2",
                        title: "Turning your home into an investment",
                        para: `Depending on your circumstances, you could consider turning your current home into an investment property.`,
                        linkName: "Tell me more",
                        url: "/home-loan/turning-your-home-into-investment",
                      },
                      {
                        id: "3",
                        title: "How to choose the perfect neighborhood",
                        para: `Finding the right neighborhood is just as important as finding the right home`,
                        linkName: "Tell me more",
                        url: "/home-loan/choose-perfect-neighbourhood",
                      },
                      {
                        id: "4",
                        title:
                          "Buying a property through resale or direct purchase",
                        para: `Explore the pros and cons of buying a property through resale or direct purchase to make an informed decision that suits your needs and budget.`,
                        linkName: "Tell me more",
                        url: "/home-loan/buy-property-resale",
                      },
                    ],
                  }}
                />
              </div>
            {:else if index == 1}
              <div id="whybuy" class="text-black bg-white">
                <AboveTitleWithTopIconCard
                  contents={{
                    heading: `Why buy your next home?`,
                    xlGridCol: 2,
                    borderBottom: true,
                    list: [
                      {
                        heading: "Lifestyle upgrade",
                        topPara: `Need more space for your growing family? Or perhaps a home closer to work, schools, or amenities?`,
                        icon: "/icons/riskFactor.svg",
                        altName: "lifestyle-icon",
                      },
                      {
                        heading: "Investment opportunity",
                        topPara: `A second property can serve as a rental income source or an asset for future financial security.`,
                        icon: "/icons/features.svg",
                        altName: "investment-icon",
                      },
                      {
                        heading: "Vacation home",
                        topPara: `A dream getaway in the hills, by the beach, or in a serene township.`,
                        icon: "/icons/inte.svg",
                        altName: "vacation-icon",
                      },
                      {
                        heading: "Relocation or retirement",
                        topPara: `Planning a move to a quieter city or a retirement-friendly location?`,
                        icon: "/icons/interestIcon.svg",
                        altName: "relocation-icon",
                      },
                    ],
                  }}
                />

                <AboveTitleWithTopIconCard
                  contents={{
                    heading: `Key considerations for next-home buyers`,
                    xlGridCol: 1,
                    borderBottom: true,
                    list: [
                      {
                        heading: "Sell or retain your current home?",
                        topPara: `• <span class="font-FourthHead">Sell before you buy :</span> This can free up funds for your next purchase and reduce financial strain.<br>
                        • <span class="font-FourthHead">Keep your current home :</span> If you’re financially stable, your current property can become a rental income source.`,
                        icon: "/icons/sellingHome.svg",
                        altName: "sell-retain-icon",
                      },
                      {
                        heading: "Financing Your Next Home",
                        topPara: `• <span class="font-FourthHead">Leverage your home equity :</span> If you have a running home loan, you may consider a balance transfer or a top-up loan.<br>
                        •<span class="font-FourthHead"> Down payment considerations :</span> If you’re selling your current home, ensure you align the timelines for sale proceeds and the next purchase.<br>
                        •<span class="font-FourthHead"> Second home loan:</span> Understand the tax implications and benefits of owning multiple properties.`,
                        icon: "/icons/personalLoan.svg",
                        altName: "financing-icon",
                      },
                      {
                        heading: "Property type and purpose",
                        topPara: `• Are you buying for self-use or investment? <br>
                        • Consider if you're looking for a resale property, a new home from a builder, or a vacation home in a prime location.`,
                        icon: "/icons/inte.svg",
                        altName: "property-type-icon",
                      },
                      {
                        heading: "Stamp duty & registration",
                        topPara: `• Be aware that stamp duty and registration charges differ for second-home buyers and may not come with first-time buyer concessions.`,
                        icon: "/icons/interestIcon.svg",
                        altName: "stamp-duty-icon",
                      },
                      {
                        heading: "Maintenance costs",
                        topPara: `• Owning multiple properties comes with additional maintenance costs such as property taxes, utilities, and society fees.`,
                        icon: "/icons/mutualFund.svg",
                        altName: "maintenance-icon",
                      },
                      {
                        heading: "Rental income opportunities",
                        topPara: `• If you're investing in a second property, assess the rental demand and expected income in the locality.`,
                        icon: "/icons/FD.svg",
                        altName: "rental-income-icon",
                      },
                    ],
                  }}
                />

                <div class="border-b border-borderColor">
                  <AboveTitleWithTopIconCard
                    contents={{
                      heading: `Benefits of buying your next home`,
                      xlGridCol: 1,
                      borderBottom: true,
                      list: [
                        {
                          heading: "Tax benefits",
                          topPara: `Interest paid on a second home loan is eligible for tax deductions under certain conditions.`,
                        },
                        {
                          heading: "Asset diversification",
                          topPara: `Investing in real estate strengthens your portfolio.`,
                        },
                        {
                          heading: "Long-term appreciation",
                          topPara: `Property values in prime locations tend to grow steadily over time.`,
                        },
                      ],
                    }}
                  />
                </div>

                <AboveTitleWithTopIconCard
                  contents={{
                    heading: `Steps to make your next purchase seamless`,
                    xlGridCol: 2,
                    borderBottom: true,
                    list: [
                      {
                        heading: "Evaluate your financial position",
                        topPara: `Assess your existing home loan, EMIs, and disposable income.`,
                        icon: "/icons/coinHouse.svg",
                        altName: "financial-position-icon",
                      },
                      {
                        heading: "Research the Market",
                        topPara: `Look for properties in areas with good appreciation potential, rental demand, or lifestyle value.`,
                        icon: "/icons/stocks.svg",
                        altName: "research-market-icon",
                      },
                      {
                        heading: "Get pre-approved",
                        topPara: `This will give you a clear idea of your borrowing power and make negotiations smoother.`,
                        icon: "/icons/educationLoan.svg",
                        altName: "pre-approved-icon",
                      },
                      {
                        heading: "Seek professional advice",
                        topPara: `Hire a reliable real estate agent or property consultant to explore the best options.`,
                        icon: "/icons/phoneConnection.svg",
                        altName: "professional-advice-icon",
                      },
                    ],
                  }}
                />
              </div>
            {:else if index == 2}
              <div id="whychoose" class="text-black bg-white">
                <div
                  class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
                >
                  <div class="">
                    <h2
                      class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont text-center"
                    >
                      Why choose resale or direct purchase from a builder?
                    </h2>
                  </div>
                  <div class="">
                    {#each exampleTableData as tableData}
                      <PaymentTable {tableData} />
                    {/each}
                  </div>
                </div>

                <TwoColumnWithLeftHeading
                  contents={{
                    heading: "Make your next home count",
                    secPara: `<p>💡Your second or next home is more than just a property it’s a lifestyle upgrade, a step toward financial growth, or a dream fulfilled. By evaluating your needs, financial goals, and property options, you can ensure your next home is everything you’ve envisioned.</p>
                    <p>Whether you’re buying for self-use or investment, plan ahead, and don’t hesitate to seek expert guidance to make an informed decision.</p>`,
                  }}
                />

                <ButtonBanner
                  contents={{
                    heading: `Compare home loan offers online`,
                    para: `Looking to transfer your home loan? Explore and compare the best offers to secure better terms and maximize your savings.`,
                    btnName: "Compare rates",
                    btnBorder: `#4F4C4D`,
                    btnColor: `#ffcc00`,
                    btnLink: "/get-started/how-can-we-help",
                  }}
                />
              </div>
            {:else if index == 3}
              <div id="calculators" class="text-black bg-white">
                <AboveTitleWithBlackCard
                  contents={{
                    heading: "Home loan calculator",
                    xlGridCol: 4,
                    borderBottom: true,
                    cards: [
                      {
                        heading: " How much can I borrow?",
                        icon: "/icons/calc.svg",
                        iconAltName: "icon-calc",
                        url: "/calculators/affordability-calculator",
                      },
                      {
                        heading: " Home loan repayments calculator",
                        icon: "/icons/lap.svg",
                        iconAltName: "loan-icon",
                        url: "/planners/part-payment-planner",
                      },
                      {
                        heading: "  Stamp duty calculator",
                        icon: "/icons/apply.svg",
                        iconAltName: "icons-apply",
                        url: "/calculators/stamp-duty-calculator",
                      },
                      {
                        heading: "Calculators & tools?",
                        icon: "/icons/calc.svg",
                        iconAltName: "icons-calc",
                        url: "/home-loan/home-loan-tools-calculator",
                      },
                    ],
                  }}
                />
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <TwoColumnWithImage
        contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
        sourceName: "DigitalDSA",
        originalSource: "www.digitaldsa.com",
      }}
      >
        <p>
          Feel free to message us anytime for expert assistance with your loan
          needs. Our team is here to provide professional advice, guide you
          through the loan process, and help you find the best options. No
          matter the time, we’ve got you covered! Message us anytime, and we’ll
          respond promptly.
        </p>
        <div class="w-full lg:w-auto">
          <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
        </div>
      </TwoColumnWithImage>
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
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
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
          heading: "Things you should know",
          paraGraph: [
            `Interest rates may vary based on lending conditions and could be subject to margins above or below the reference rate.`,
            `At the end of a fixed-rate period, the interest rate may adjust to the applicable Standard Variable Rate, with any eligible discounts outlined in the loan agreement.`,
            `Contract reviews are typically processed within six business hours when complete documentation is uploaded via the Digital DSA app, but processing times may vary.`,
            `Home buyers may want to explore conveyancing options to understand potential costs and legal considerations.`,
            `Those seeking bundled financial services should carefully review the terms of any additional offers before making a decision.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
