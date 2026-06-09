<script>
	let {
		data,
		pageData = {
    coverImage: "/images/property-value-blog.jpg",
    coverAlt: "hero-cover",
    heading: "How to Use Your Property’s Value to Get extra funds",
    para: `Knowing where to start can be the biggest hurdle. The right tools and support will get you movingYou must be familiar with financial products like <span class="font-FourthHead" > Top-Up Loans </span> and <span class="font-FourthHead" > Loans Against Property (LAP) </span>. These products allow you to unlock the value in your property and use it to borrow funds for various needs. <br> In simple terms, the value of your property can be used to secure a loan, giving you access to funds without having to sell or move out of your home.`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare offers",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  },
		title = "",
		keywords = ""
	} = $props();



  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import AboveTitleWithLeftIconCard from "./AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import HelpList from "./HelpList.svelte";

  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import Seo from "./Seo.svelte";

  let firstTableData = [
    {
columnName: [
"<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
"<div class='flex gap-2 items-center justify-center'>Top-Up Loan</div>",
"<div class='flex gap-2 items-center justify-center'>Loan Against Property (LAP) </div>",
],
rowData: [
{
"<span class='font-FourthHead flex gap-4 items-center'>Loan Amount </span>":
[
`Up to 80% of the property value minus outstanding loan`,
`60-70% of the property’s market value`,
],
},
{
"<span class='font-FourthHead flex gap-4 items-center'>Purpose</span>":
[
"For smaller needs like home improvement, education, or medical expenses",
"For large-scale needs like business funding or purchasing another property",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center'>Interest Rates</span>":
[
"Typically lower than personal loans",
"Higher than Top-Up loans, but lower than personal loans",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center'>Eligibility</span>":
[
"Based on current home loan and property value",
"Based on the value of the property and income",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center'>Repayment Tenure</span>":
[
"Shorter tenures (5-10 years)",
"Longer tenures (up to 15-20 years)",
],
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

  let activeSection = $state('');




  // end-here

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
activeSection = firstSection.id;
    }
  };

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
  };

  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
window.removeEventListener("scroll", handleScroll);
    };
  });

  //send data child to parent
  const dispatch = createEventDispatcher();

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
  title="Use Your Property’s Value to Get Extra Funds | Top-Up & LAP"
  image={pageData.coverImage}
  description="Unlock funds using your property’s value. Get a Top-Up Loan or Loan Against Property (LAP) for home, business, or personal needs. Apply now!"
  keywords="Top-Up Loan, Loan Against Property (LAP), Home equity loan, Property-based loan, Mortgage top-up, Property financing options, Borrow against property, Home loan top-up eligibility, LAP vs Top-Up Loan, Loan against home equity, Home equity financing, Best loans for property owners, Property-based borrowing, Home equity loan process, How to use home equity for loans"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "What is equity",
              targetId: `equity`,
            },
            {
              name: "Top up",
              targetId: `topup`,
            },
            {
              name: "Loan Against Property",
              targetId: `lap`,
            },
            {
              name: "Top vs Lap",
              targetId: `difference`,
            },
            {
              name: "How to use equity",
              targetId: `howUseEquity`,
            },
            {
              name: "How to apply",
              targetId: `apply`,
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
        }}
        {activeSection}
      ></StickyNavbar>
      <!-- <AnchorCounter /> -->
      <div
        class="lg:px-[4rem] border-b border-borderColor"
        id="equity"
        data-section="equity"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "Understanding Home Equity",
            subPara: [
              `Home equity refers to the portion of your property that you own outright. It’s the difference between your home’s current market value and what you still owe on your mortgage.`,
              `<span class="font-FourthHead"> For Example: </span>`,
            ],
            paraGraph: [
              `If your property is worth ₹50 lakh and you still owe ₹30 lakh on your home loan, your home equity is ₹20 lakh.`,
              `This ₹20 lakh is the portion you can use to get a <span class="underline decoration-btnBg underline-offset-4" > Top-Up Loan </span> or a <span class="underline decoration-btnBg underline-offset-4" >Loan Against Property (LAP) </span>  .`,
            ],
          }}
          disc="list-disc"
        />
      </div>

      <div id="topup" data-section="topup">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Top-Up Loan`,
            para: `A <span class="font-FourthHead">Top-Up Loan  </span> allows you to borrow more money on top of your existing home loan. The loan amount is generally determined by the value of your property and the outstanding balance on your home loan.`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "How Does it works",
                para: `Banks typically offer up to <span class="font-FourthHead">  80% of the property’s market value</span>, minus the current outstanding balance on your home loan.
              <br> <br> <span class="font-FourthHead">For Example: </span>​​ <br>
              <ul class="pl-5 list-disc pt-4">
<li> Your property’s market value is ₹50 lakh.</li>
<li> You have an outstanding home loan of ₹30 lakh.</li>
<li> You can borrow up to ₹10 lakh (which is 80% of ₹50 lakh = ₹40 lakh – ₹30 lakh outstanding loan).</li>
              </ul>
              This means, the more your property is worth, and the lesser you owe on your current loan, the higher your Top-Up Loan eligibility can be.
              `,
              },
              {
                heading: "Advantages of a Top-Up",
                para: `
              <ul class="pl-5 list-disc space-y-4">
<li>	<span class="font-FourthHead">  Low Interest Rates:</span> Top-Up loans typically have lower interest rates compared to personal loans. </li>
<li>	<span class="font-FourthHead">Quick Approval Process: </span>  The process is quicker than applying for a fresh loan.</li>
<li>	<span class="font-FourthHead"> Flexible Usage:</span>  You can use the loan amount for any purpose like home improvement, funding education, or paying for a wedding. </li>

              </ul>
              
              `,
              },
              {
                heading: "How to Apply for a Top-Up ",
                para: `
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead"> Check Your Property’s Market Value: </span> Get a valuation to know the maximum loan amount you may be eligible for. </li>
<li> <span class="font-FourthHead"> Eligibility Check: </span> Ensure you meet the eligibility requirements for a Top-Up Loan, which will typically include a good credit score and an income check. </li>
<li><span class="font-FourthHead"> Submit Documents:</span>  Provide necessary documents like income proof, property papers, and the details of your existing home loan. </li>
<li><span class="font-FourthHead">  Loan Disbursement:</span> Once approved, the loan amount is disbursed, and you can use it for your intended purpose. </li>
              </ul>
              
              `,
                btnName: "Explore more",
                btnLink: "/home-loan",
                btnColor: "#ffcc00",
              },
            ],
          }}
        />

        <AboveTitleWithBlackCard
          contents={{
            heading: "Our calculators",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "How much can I borrow?",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/eligibility-calculator",
              },
              {
                heading: "Home loan repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
              },
              {
                heading: "How much can i afford",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/calculators/affordability-calculator",
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

      <div id="lap" data-section="lap">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Loan Against Property (LAP)`,
            para: `A <span class="font-FourthHead">Loan Against Property (LAP) </span>  is another popular option for leveraging the value of your property to secure a loan. Unlike a Top-Up Loan, which is based on your existing home loan, LAP allows you to pledge your residential, commercial, or industrial property for funding.`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "How LAP Works",
                para: `
             
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead">Loan Amount: </span>  The amount you can borrow typically ranges from <span class="font-FourthHead">60-70% of the property’s market value </span> .</li>
<li><span class="font-FourthHead">Interest Rates:  </span>	LAP interest rates tend to be higher than Top-Up Loans but lower than personal loans. </li>
<li>	<span class="font-FourthHead">Loan Tenure: </span>  LAPs often come with longer repayment tenures, usually up to 15-20 years. </li>
              </ul>
              This means, the more your property is worth, and the lesser you owe on your current loan, the higher your Top-Up Loan eligibility can be.
              `,
              },
              {
                heading: "When to Consider LAP",
                para: `
              <ul class="pl-5 list-disc space-y-4">
<li>	For large expenses like funding a business, paying for medical emergencies, or buying a second property. </li>
<li>	You may also consider LAP if you have other property or a higher-value asset that you wish to use as collateral.</li>

              </ul>
              
              `,
              },
              {
                heading: "How to Apply for LAP",
                para: `
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead"> Get Property Valuation:</span>	 You will need to get your property valued to understand how much loan you can avail.</li>
<li>	<span class="font-FourthHead">Eligibility Check: </span> Banks will evaluate your repayment capacity based on your income, credit history, and the value of the property. </li>
<li><span class="font-FourthHead"> Submit Documents:</span>	 Provide necessary documents such as property papers, income proof, and bank statements. </li>
<li><span class="font-FourthHead"> Loan Disbursement:</span>	 After approval, funds are disbursed, and you can use them for your chosen purpose. </li>
              </ul>
              
              `,
                btnName: "Explore more",
                btnLink: "/lap",
                btnColor: "#ffcc00",
              },
            ],
          }}
        />
      </div>

      <div
        id="difference"
        data-section="difference"
        class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
      >
        <div class=" ">
          <h2
            class=" font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center py-5"
          >
            <p>
              <span class="underline">Top-Up Loan </span> vs
              <span class="underline"> Loan Against Property (LAP)</span>
            </p>
          </h2>
        </div>
        <div class="">
          {#each firstTableData as tableData}
            <PaymentTable {tableData} />
          {/each}
        </div>
      </div>
      <div id="howUseEquity" data-section="howUseEquity">
        <ThreeColumWithLeftHeading
          contents={{
            heading:
              "How Can You Leverage Your Property’s Value for Big Goals?",
            cardData: [
              {
                title: " Buying Another Home",
                para: "If you plan to buy a second home or an investment property, a Top-Up Loan or LAP can provide you with the funds required for the down payment or full purchase.",
              },
              {
                title: "Renovating Your Existing Property",
                para: "A Top-Up Loan or LAP can also help you renovate or upgrade your current property, increasing its value in the long run.",
              },
              {
                title: "Starting a Business",
                para: "If you’re planning to start a business, both Top-Up Loans and LAP offer a way to secure funds based on your home’s equity, without having to sell or liquidate other assets.",
              },
            ],
          }}
        />
      </div>

      <div class="lg:px-[4rem]" id="apply" data-section="apply">
        <div class=" border-b border-borderColor">
          <ThingsYouShould
            thinkKnow={{
              heading: "How to Apply for a Top-Up Loan or LAP",
              paraGraph: [
                `	<span class="font-FourthHead">Get a Property Valuation: </span>  The loan amount you are eligible for will depend on the value of your property.`,
                `<span class="font-FourthHead">  Check Eligibility: </span>Speak with your bank or lender to confirm eligibility criteria for a Top-Up Loan or LAP.`,
                `<span class="font-FourthHead"> Submit Required Documents:</span>  Provide property-related documents, income proof, and details of your current loan (if applicable).`,
                `<span class="font-FourthHead"> Loan Approval and Disbursement:</span>  Once approved, you will receive the loan amount, which you can use for your planned purpose.`,
              ],
            }}
            disc="list-disc"
          />
        </div>

        <ButtonBanner
          contents={{
            heading: `See our home loan options`,
            btnName: "Explore now",
            btnLink: "/home-loan",
            btnBorder: "#4F4C4D",
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["What is equity?", "Top up", "Loan Against Property", "Top vs Lap", "How to use equity", "How to apply"] as list, index}
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
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="equity" class="bg-white text-black">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Understanding Home Equity",
                  subPara: [
                    `Home equity refers to the portion of your property that you own outright. It’s the difference between your home’s current market value and what you still owe on your mortgage.`,
                    `<span class="font-FourthHead"> For Example: </span>`,
                  ],
                  paraGraph: [
                    `If your property is worth ₹50 lakh and you still owe ₹30 lakh on your home loan, your home equity is ₹20 lakh.`,
                    `This ₹20 lakh is the portion you can use to get a <span class="underline decoration-btnBg underline-offset-4" > Top-Up Loan </span> or a <span class="underline decoration-btnBg underline-offset-4" >Loan Against Property (LAP) </span>  .`,
                  ],
                }}
                disc="list-disc"
              />
            </div>
          {:else if index == 1}
            <div id="start" class=" bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Top-Up Loan`,
                  para: `A <span class="font-FourthHead">Top-Up Loan  </span> allows you to borrow more money on top of your existing home loan. The loan amount is generally determined by the value of your property and the outstanding balance on your home loan.`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "How Does it works",
                      para: `Banks typically offer up to <span class="font-FourthHead">  80% of the property’s market value</span>, minus the current outstanding balance on your home loan.
              <br> <br> <span class="font-FourthHead">For Example: </span>​​ <br>
              <ul class="pl-5 list-disc pt-4">
<li> Your property’s market value is ₹50 lakh.</li>
<li> You have an outstanding home loan of ₹30 lakh.</li>
<li> You can borrow up to ₹10 lakh (which is 80% of ₹50 lakh = ₹40 lakh – ₹30 lakh outstanding loan).</li>
              </ul>
              This means, the more your property is worth, and the lesser you owe on your current loan, the higher your Top-Up Loan eligibility can be.
              `,
                    },
                    {
                      heading: "Advantages of a Top-Up",
                      para: `
              <ul class="pl-5 list-disc space-y-4">
<li>	<span class="font-FourthHead">  Low Interest Rates:</span> Top-Up loans typically have lower interest rates compared to personal loans. </li>
<li>	<span class="font-FourthHead">Quick Approval Process: </span>  The process is quicker than applying for a fresh loan.</li>
<li>	<span class="font-FourthHead"> Flexible Usage:</span>  You can use the loan amount for any purpose like home improvement, funding education, or paying for a wedding. </li>

              </ul>
              
              `,
                    },
                    {
                      heading: "How to Apply for a Top-Up ",
                      para: `
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead"> Check Your Property’s Market Value: </span> Get a valuation to know the maximum loan amount you may be eligible for. </li>
<li> <span class="font-FourthHead"> Eligibility Check: </span> Ensure you meet the eligibility requirements for a Top-Up Loan, which will typically include a good credit score and an income check. </li>
<li><span class="font-FourthHead"> Submit Documents:</span>  Provide necessary documents like income proof, property papers, and the details of your existing home loan. </li>
<li><span class="font-FourthHead">  Loan Disbursement:</span> Once approved, the loan amount is disbursed, and you can use it for your intended purpose. </li>
              </ul>
              
              `,
                      btnName: "Explore more",
                      btnLink: "/home-loan",
                      btnColor: "#ffcc00",
                    },
                  ],
                }}
              />

              <AboveTitleWithBlackCard
                contents={{
                  heading: "Our calculators",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "How much can I borrow?",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/eligibility-calculator",
                    },
                    {
                      heading: "Home loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
                    },
                    {
                      heading: "How much can i afford",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/calculators/affordability-calculator",
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
          {:else if index == 2}
            <div id="lap" class="bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Loan Against Property (LAP)`,
                  para: `A <span class="font-FourthHead">Loan Against Property (LAP) </span>  is another popular option for leveraging the value of your property to secure a loan. Unlike a Top-Up Loan, which is based on your existing home loan, LAP allows you to pledge your residential, commercial, or industrial property for funding.`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "How LAP Works",
                      para: `
             
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead">Loan Amount: </span>  The amount you can borrow typically ranges from <span class="font-FourthHead">60-70% of the property’s market value </span> .</li>
<li><span class="font-FourthHead">Interest Rates:  </span>	LAP interest rates tend to be higher than Top-Up Loans but lower than personal loans. </li>
<li>	<span class="font-FourthHead">Loan Tenure: </span>  LAPs often come with longer repayment tenures, usually up to 15-20 years. </li>
              </ul>
              This means, the more your property is worth, and the lesser you owe on your current loan, the higher your Top-Up Loan eligibility can be.
              `,
                    },
                    {
                      heading: "When to Consider LAP",
                      para: `
              <ul class="pl-5 list-disc space-y-4">
<li>	For large expenses like funding a business, paying for medical emergencies, or buying a second property. </li>
<li>	You may also consider LAP if you have other property or a higher-value asset that you wish to use as collateral.</li>

              </ul>
              
              `,
                    },
                    {
                      heading: "How to Apply for LAP",
                      para: `
              <ul class="pl-5 list-disc space-y-4">
<li><span class="font-FourthHead"> Get Property Valuation:</span>	 You will need to get your property valued to understand how much loan you can avail.</li>
<li>	<span class="font-FourthHead">Eligibility Check: </span> Banks will evaluate your repayment capacity based on your income, credit history, and the value of the property. </li>
<li><span class="font-FourthHead"> Submit Documents:</span>	 Provide necessary documents such as property papers, income proof, and bank statements. </li>
<li><span class="font-FourthHead"> Loan Disbursement:</span>	 After approval, funds are disbursed, and you can use them for your chosen purpose. </li>
              </ul>
              
              `,
                      btnName: "Explore more",
                      btnLink: "/lap",
                      btnColor: "#ffcc00",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black">
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class=" ">
                  <h2
                    class=" font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center py-5"
                  >
                    <p>
                      <span class="underline">Top-Up Loan </span> vs
                      <span class="underline">
                        Loan Against Property (LAP)</span
                      >
                    </p>
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 4}
            <div class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading:
                    "How Can You Leverage Your Property’s Value for Big Goals?",
                  cardData: [
                    {
                      title: " Buying Another Home",
                      para: "If you plan to buy a second home or an investment property, a Top-Up Loan or LAP can provide you with the funds required for the down payment or full purchase.",
                    },
                    {
                      title: "Renovating Your Existing Property",
                      para: "A Top-Up Loan or LAP can also help you renovate or upgrade your current property, increasing its value in the long run.",
                    },
                    {
                      title: "Starting a Business",
                      para: "If you’re planning to start a business, both Top-Up Loans and LAP offer a way to secure funds based on your home’s equity, without having to sell or liquidate other assets.",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 5}
            <div
              class="bg-white text-black px-[0.5rem]"
              id="apply"
              data-section="apply"
            >
              <ThingsYouShould
                thinkKnow={{
                  heading: "How to Apply for a Top-Up Loan or LAP",
                  paraGraph: [
                    `	<span class="font-FourthHead">Get a Property Valuation: </span>  The loan amount you are eligible for will depend on the value of your property.`,
                    `<span class="font-FourthHead">  Check Eligibility: </span>Speak with your bank or lender to confirm eligibility criteria for a Top-Up Loan or LAP.`,
                    `<span class="font-FourthHead"> Submit Required Documents:</span>  Provide property-related documents, income proof, and details of your current loan (if applicable).`,
                    `<span class="font-FourthHead"> Loan Approval and Disbursement:</span>  Once approved, you will receive the loan amount, which you can use for your planned purpose.`,
                  ],
                }}
                disc="list-disc"
              />
              <ButtonBanner
                contents={{
                  heading: `See our home loan options`,
                  btnName: "Explore now",
                  btnLink: "/home-loan",
                  btnBorder: "#4F4C4D",
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
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

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
          heading: "Things you should know",
          paraGraph: [
            `<span class="font-FourthHead">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>


