<script>
	let {
		data
	} = $props();



  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  let pageData = {
    coverImage: "/images/understanding-the-cost-of-buying-a-new-home.jpg",
    coverAlt: "hero-cover",
    classStyle: "object-cover xl:h-[120svh] 3xl:max-h-[100svh]",
    heading: "The Home Buying Process (Legal & Documentation)",
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
},
{
btnName: "Compare offers",
btnLink: "/get-started/how-can-we-help",
btnColor: "#ffcc00",
animation: true
},
    ],
    para: `Buying a home is not just about choosing the right property and securing financing—it’s also about getting the legal and documentation process right. This page will guide you through the essential paperwork, verification steps, and common legal pitfalls to ensure a smooth and hassle-free home-buying experience.`,
  };

  let subList = {
    items: [
{
name: "Property Laws",
targetId: `laws`,
},
{
name: "Essential Document",
targetId: `document`,
},
{
name: "Charges",
targetId: `charges`,
},
{
name: "Possession process",
targetId: `possession`,
},
{
name: "Legal pitfalls",
targetId: `pitfalls`,
},
    ],
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
},
{
btnName: "Compare offers",
btnLink: "/get-started/how-can-we-help",
btnColor: "#ffcc00",
},
    ],
  };

  let firstTableData = [
    {
columnName: [
"<div class='flex gap-2 items-center'> State </div>",
"<div class='flex gap-2 items-center'> Stamp duty </div>",
"<div class='flex gap-2 items-centers'> Registration charges</div>",
],
rowData: [
{
"<span class='font-semibold flex gap-4 items-center'> Maharashtra </span>":
["5%", "1%"],
},
{
"<span class='font-semibold flex gap-4 items-center'>Delhi</span>":
["4%-6%", "1%"],
},
{
"<span class='font-semibold flex gap-4 items-center'>Karnataka</span>":
["5%", "1%"],
},
{
"<span class='font-semibold flex gap-4 items-center'>Tamil Nadu </span>":
["7%", "1%"],
},
{
"<span class='font-semibold flex gap-4 items-center'>Uttar Pradesh</span>":
["5%-7%", "1%"],
},
],
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

<Seo
  type="WebPage"
  title="Home Buying Process: Legal, Documentation & Key Pitfalls"
  image={pageData.coverImage}
  description="Understand the home buying legal process, essential documents, property laws, stamp duty & pitfalls to ensure a smooth home purchase."
  keywords="Home buying process, Property legal verification, Home loan documents, Stamp duty and registration, Property title verification, RERA registration, Real estate legal guide, Buying a house checklist, Property legal pitfalls, Home loan approval process"
/>

<section>
  <!-- <p>This is new loan page</p>
                <Breadcrumb /> -->
  <!-- {page.url.pathname} -->
  <!-- Create a breadcrumb-style navigation with clickable links -->

  <NewPageLayout {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}></StickyNavbar>
        <div>
          <div
            class="lg:px-[4rem] border-b border-borderColor"
            id="laws"
            data-section="laws"
          >
            <ThingsYouShould
              thinkKnow={{
                heading:
                  "Understanding Legal Due Diligence Before Buying a Home",
                subPara: [
                  `Before making any commitment, it's crucial to legally verify the property to ensure there are no hidden disputes or liabilities.`,
                  ` <span class="font-semibold"> Key Legal Checks Before Purchase :</span>`,
                ],
                paraGraph: [
                  `<span class="font-semibold">Title Verification – </span>  Ensure the seller has a clear and marketable title to the property.`,
                  ` <span class="font-semibold">Encumbrance Certificate (EC) – </span>  Confirms the property is free from any outstanding loans or legal claims.`,
                  `<span class="font-semibold">Sale Agreement & Sale Deed – </span>  The agreement states the terms of the sale, while the deed officially transfers ownership.`,
                  `<span class="font-semibold"> Property Tax Receipts –</span>  Check if the property has any pending tax dues.`,
                  `<span class="font-semibold">RERA Registration – </span>  If it’s a new project, verify if it’s registered under RERA (Real Estate Regulatory Authority).`,
                  `<span class="font-semibold">Approval from Local Authorities – </span>  Ensure the property has legal approvals from the municipal corporation and development authorities.`,
                  `<span class="font-semibold"> Land Use & Zoning Clearance –</span>  Confirms whether the property is approved for residential purposes.`,
                ],
                bottomPara: [
                  `<span class="font-semibold"> 💡 Pro Tip:</span>  Always get a legal expert to verify property documents before making any payment.`,
                ],
              }}
              disc="list-disc"
            />
          </div>
          <div id="document" data-section="document">
            <AboveTitleWithoutIconCard
              contents={{
                heading: `Essential documents you need to provide for a home loan`,
                para: `Once you finalize the property, you need to submit various documents to the bank for loan approval.`,
                xlGridCol: 3,
                borderBottom: true,
                list: [
                  {
                    heading: "For salaried buyers",
                    desc: [
                      `Identity proof (PAN/Aadhaar/Passport)`,
                      `Address proof (Aadhaar/Voter ID/Utility bill)`,
                      `Income proof (salary slips of last 3 months, Form 16)`,
                      `Bank statements (last 6 months)`,
                      `Employment proof (offer letter or experience letter)`,
                    ],
                  },
                  {
                    heading: "For self-employed buyers",
                    desc: [
                      ` Identity & address proof`,
                      ` Income tax returns (last 3 years)`,
                      ` Business registration certificate`,
                      ` Bank statements (last 12 months)`,
                      ` Balance sheets & profit-loss statements`,
                    ],
                  },
                  {
                    heading: "Property-related documents required for a loan​",
                    desc: [
                      ` Sale agreement & allotment letter (for under-construction property)`,
                      ` Approved building plan & property tax receipts`,
                      ` Title deed & encumbrance certificate`,
                      ` NOC from builder/society (if applicable)`,
                    ],
                  },
                ],
              }}
            >
              <p class="typography-body-sm text-text-light">
                <span class="font-semibold">💡 Pro Tip: </span> Keeping these documents
                ready can speed up the home loan approval process by 5-7 working
                days!
              </p>
            </AboveTitleWithoutIconCard>
          </div>

          <div
            class="lg:px-[4rem] border-b border-borderColor"
            id="charges"
            data-section="charges"
          >
            <TwoColumn
              cardImage="/images/buyingNextHome.jpg"
              cardAltName="images-buyingNextHome"
              cardHeading="Stamp duty, registration & other charges"
            >
              <div
                class="typography-body-md text-text-light space-y-6"
                slot="list"
              >
                <p>
                  Apart from the property price and home loan, you also need to
                  pay stamp duty & registration charges, which vary by state.
                </p>
                <ul class="grid gap-[2rem] typography-body-md text-text-light">
                  <div class="">
                    {#each firstTableData as tableData}
                      <PaymentTable {tableData} />
                    {/each}
                  </div>
                </ul>
                <p>
                  💡 <span class="font-semibold">Pro Tip: </span> If you register
                  the property in a woman’s name, many states offer a lower stamp
                  duty rate (1%-2% discount), helping you save lakhs!
                </p>
              </div>
            </TwoColumn>
          </div>

          <div
            class="lg:px-[4rem] border-b border-borderColor"
            id="possession"
            data-section="possession"
          >
            <ThingsYouShould
              thinkKnow={{
                heading: "The Final Registration & Possession Process",
                subPara: [
                  `Once your loan is approved and the payment is processed, you must register the property in your name at the local sub-registrar’s office.`,
                  ` <span class="font-semibold"> Home Registration Process </span>`,
                ],
                paraGraph: [
                  ` Step 1: Pay the stamp duty and registration fees.`,
                  ` Step 2: Sign the Sale Deed in the presence of a registrar.`,
                  ` Step 3: Get the document verified and signed by witnesses.`,
                  ` Step 4: Collect the registered Sale Deed after processing (usually within a week).`,
                ],
                bottomPara: [
                  ` <span class="font-semibold"> 💡 Pro Tip:</span> After registration, don’t forget to update property records in your name at the municipal office to avoid tax issues later.`,
                ],
              }}
              disc="list-disc"
            />
          </div>
          <div class="" id="pitfalls" data-section="laws">
            <TwoColumnWithImage
              contents={{
                cardImage: "/images/buildingHome-cover.jpg",
                cardAltName: "housing-figure",
                cardHeading: "Step-by-Step process for Balance Transfer",
              }}
            >
              <div class="typography-body-md text-text-light space-y-6">
                <p>
                  Even experienced buyers make mistakes when dealing with legal
                  and financial aspects of home buying. Here’s how you can avoid
                  them:
                </p>
                <div class="space-y-4">
                  <h3 class="typography-h3 font-semibold text-text-main">
                    Common Mistakes & Their Solutions
                  </h3>
                  <ul class="space-y-3 list-disc pl-5">
                    <li>
                      <span class="font-semibold"
                        >Buying without title verification –
                      </span> Always check legal ownership history.
                    </li>
                    <li>
                      <span class="font-semibold"
                        >Not checking hidden charges in builder agreements –
                      </span> Read every clause carefully.
                    </li>
                    <li>
                      <span class="font-semibold">
                        Ignoring project approvals –</span
                      > Ensure the builder has received clearance from local authorities.
                    </li>
                    <li>
                      <span class="font-semibold"
                        >Skipping RERA verification –
                      </span> Always buy from RERA-registered projects.
                    </li>
                    <li>
                      <span class="font-semibold"
                        >Not calculating total costs (stamp duty, GST,
                        maintenance fees) –
                      </span> Budget for all costs upfront.
                    </li>
                  </ul>
                </div>

                <p>
                  💡 <span class="font-semibold">Pro Tip: </span> : If a deal looks
                  “too good to be true,” double-check the legal paperwork before
                  proceeding.
                </p>
              </div>
            </TwoColumnWithImage>
          </div>
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Final Checklist Before Taking Possession",
              cardData: [
                {
                  para: `
<ul class="list-disc pl-5">
<li> Ensure all property documents are legally verified.</li>
<li>Keep home loan paperwork ready for quick processing. </li>
<li> Pay stamp duty & registration charges as per state laws.</li>
<li> Cross-check property handover conditions with the builder/seller.</li>
<li> Update municipal records in your name after purchase.</li>
</ul>
`,
                },
                {
                  title: "Consult with a Loan Expert",
                  para: "Are you confused? , Talk with our loan specialist",
                  btnName: "Book an appointment",
                  btnLink: "/appointment",
                  btnBorder: "#4F4C4D",
                },
              ],
            }}
          />
        </div>
      </div>

      <div class="lg:hidden block">
        {#each ["Property Laws", "Essential Document", "Charges", "Possession process", "Legal pitfalls"] as list, index}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
          >
            <summary
              class="col-span-3 list-none px-[1rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div class="bg-white text-black">
                <ThingsYouShould
                  thinkKnow={{
                    heading:
                      "Understanding Legal Due Diligence Before Buying a Home",
                    subPara: [
                      `Before making any commitment, it's crucial to legally verify the property to ensure there are no hidden disputes or liabilities.`,
                      ` <span class="font-semibold"> Key Legal Checks Before Purchase :</span>`,
                    ],
                    paraGraph: [
                      `<span class="font-semibold">Title Verification – </span>  Ensure the seller has a clear and marketable title to the property.`,
                      ` <span class="font-semibold">Encumbrance Certificate (EC) – </span>  Confirms the property is free from any outstanding loans or legal claims.`,
                      `<span class="font-semibold">Sale Agreement & Sale Deed – </span>  The agreement states the terms of the sale, while the deed officially transfers ownership.`,
                      `<span class="font-semibold"> Property Tax Receipts –</span>  Check if the property has any pending tax dues.`,
                      `<span class="font-semibold">RERA Registration – </span>  If it’s a new project, verify if it’s registered under RERA (Real Estate Regulatory Authority).`,
                      `<span class="font-semibold">Approval from Local Authorities – </span>  Ensure the property has legal approvals from the municipal corporation and development authorities.`,
                      `<span class="font-semibold"> Land Use & Zoning Clearance –</span>  Confirms whether the property is approved for residential purposes.`,
                    ],
                    bottomPara: [
                      `💡 Pro Tip: Always get a legal expert to verify property documents before making any payment.`,
                    ],
                  }}
                  disc="list-disc"
                />
              </div>
            {:else if index == 1}
              <div class="bg-white text-black">
                <AboveTitleWithoutIconCard
                  contents={{
                    heading: `Essential documents you need to provide for a home loan`,
                    para: `Once you finalize the property, you need to submit various documents to the bank for loan approval.`,
                    xlGridCol: 3,
                    borderBottom: true,
                    list: [
                      {
                        heading: "For salaried buyers",
                        desc: [
                          `Identity proof (PAN/Aadhaar/Passport)`,
                          `Address proof (Aadhaar/Voter ID/Utility bill)`,
                          `Income proof (salary slips of last 3 months, Form 16)`,
                          `Bank statements (last 6 months)`,
                          `Employment proof (offer letter or experience letter)`,
                        ],
                      },
                      {
                        heading: "For self-employed buyers",
                        desc: [
                          ` Identity & address proof`,
                          ` Income tax returns (last 3 years)`,
                          ` Business registration certificate`,
                          ` Bank statements (last 12 months)`,
                          ` Balance sheets & profit-loss statements`,
                        ],
                      },
                      {
                        heading:
                          "Property-related documents required for a loan​",
                        desc: [
                          ` Sale agreement & allotment letter (for under-construction property)`,
                          ` Approved building plan & property tax receipts`,
                          ` Title deed & encumbrance certificate`,
                          ` NOC from builder/society (if applicable)`,
                        ],
                      },
                    ],
                  }}
                >
                  <p class="typography-body-sm text-text-light">
                    <span class="font-semibold">💡 Pro Tip: </span> Keeping these
                    documents ready can speed up the home loan approval process by
                    5-7 working days!
                  </p>
                </AboveTitleWithoutIconCard>
              </div>
            {:else if index == 2}
              <div class="bg-white text-black px-[0.5rem]">
                <TwoColumn
                  cardImage="/images/buyingNextHome.jpg"
                  cardAltName="images-buyingNextHome"
                  cardHeading="Stamp duty, registration & other charges"
                >
                  <div
                    class="typography-body-md text-text-light space-y-6"
                    slot="list"
                  >
                    <p>
                      Apart from the property price and home loan, you also need
                      to pay stamp duty & registration charges, which vary by
                      state.
                    </p>
                    <ul class="grid gap-[2rem] typography-body-md text-text-light">
                      <div class="">
                        {#each firstTableData as tableData}
                          <PaymentTable {tableData} />
                        {/each}
                      </div>
                    </ul>
                    <p>
                      💡 <span class="font-semibold">Pro Tip: </span> If you register
                      the property in a woman’s name, many states offer a lower stamp
                      duty rate (1%-2% discount), helping you save lakhs!
                    </p>
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 3}
              <div id="tools" class="bg-white text-black">
                <ThingsYouShould
                  thinkKnow={{
                    heading: "The Final Registration & Possession Process",
                    subPara: [
                      `Once your loan is approved and the payment is processed, you must register the property in your name at the local sub-registrar’s office.`,
                      ` <span class="font-semibold"> Home Registration Process </span>`,
                    ],
                    paraGraph: [
                      ` Step 1: Pay the stamp duty and registration fees.`,
                      ` Step 2: Sign the Sale Deed in the presence of a registrar.`,
                      ` Step 3: Get the document verified and signed by witnesses.`,
                      ` Step 4: Collect the registered Sale Deed after processing (usually within a week).`,
                    ],
                    bottomPara: [
                      ` <span class="font-semibold"> 💡 Pro Tip:</span> After registration, don’t forget to update property records in your name at the municipal office to avoid tax issues later.`,
                    ],
                  }}
                  disc="list-disc"
                />
              </div>
            {:else if index == 4}
              <div id="tools" class="bg-white text-black">
                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/buildingHome-cover.jpg",
                    cardAltName: "housing-figure",
                    cardHeading: "Step-by-Step process for Balance Transfer",
                  }}
                >
                  <div class="typography-body-md text-text-light space-y-6">
                    <p>
                      Even experienced buyers make mistakes when dealing with
                      legal and financial aspects of home buying. Here’s how you
                      can avoid them:
                    </p>
                    <div class="space-y-4">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        Common Mistakes & Their Solutions
                      </h3>
                      <ul class="space-y-3 list-disc pl-5">
                        <li>
                          <span class="font-semibold"
                            >Buying without title verification –
                          </span> Always check legal ownership history.
                        </li>
                        <li>
                          <span class="font-semibold"
                            >Not checking hidden charges in builder agreements –
                          </span> Read every clause carefully.
                        </li>
                        <li>
                          <span class="font-semibold">
                            Ignoring project approvals –</span
                          > Ensure the builder has received clearance from local
                          authorities.
                        </li>
                        <li>
                          <span class="font-semibold"
                            >Skipping RERA verification –
                          </span> Always buy from RERA-registered projects.
                        </li>
                        <li>
                          <span class="font-semibold"
                            >Not calculating total costs (stamp duty, GST,
                            maintenance fees) –
                          </span> Budget for all costs upfront.
                        </li>
                      </ul>
                    </div>

                    <p>
                      💡 <span class="font-semibold">Pro Tip: </span> : If a deal
                      looks “too good to be true,” double-check the legal paperwork
                      before proceeding.
                    </p>
                  </div>
                </TwoColumnWithImage>

                <ThreeColumWithLeftHeading
                  contents={{
                    heading: "Final Checklist Before Taking Possession",
                    cardData: [
                      {
                        para: `
<ul class="list-disc pl-5">
<li> Ensure all property documents are legally verified.</li>
<li>Keep home loan paperwork ready for quick processing. </li>
<li> Pay stamp duty & registration charges as per state laws.</li>
<li> Cross-check property handover conditions with the builder/seller.</li>
<li> Update municipal records in your name after purchase.</li>
</ul>
`,
                      },
                      {
                        title: "Consult with a Loan Expert",
                        para: "Are you confused? , Talk with our loan specialist",
                        btnName: "Book an appointment",
                        btnLink: "/appointment",
                        btnBorder: "#4F4C4D",
                      },
                    ],
                  }}
                />
              </div>
            {/if}
          </details>
        {/each}
      </div>
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
              iconAltName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              iconAltName: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the Digital DSA.",
              icon: "/icons/contact.svg",
              iconAltName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              iconAltName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />
      <ThingsYouShould
        thinkKnow={{
          heading: `Things you should know`,
          paraGraph: [
            `<span class="font-semibold">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-semibold">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>
