<script>
  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import { applicationData } from "$lib/stores/stores";
  import ButtonBanner from "./ButtonBanner.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import Seo from "./Seo.svelte";
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

  let activeSection = "";

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

  let exampleTableData = [
    {
      columnName: [
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Loan Amount </div>",
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'><img class='h-5' src='/icons/plotLoans.svg' alt='plot icon'> Old Rate </div>",
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'> <img class='h-5' src='/icons/inte.svg' alt='home icon'> New Rate </div>",
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'><img class='h-5' src='/icons/personalLoan.svg' alt='gear icon'> EMI Before </div>",
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'><img class='h-5' src='/icons/support.svg' alt='plot icon'> EMI After </div>",
        "<div class='flex lg:flex-row flex-col gap-2 lg:items-center items-start'> <img class='h-5' src='/icons/accessEnergy.svg' alt='home icon'> Total Savings (20 years) </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> ₹50 Lakh </span>":
            ["9.5%", "8.35%", "₹46,607", "₹42,669", "₹6.4 Lakh"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='home icon'>₹75 Lakh</span>":
            ["9.5%", "8.35%", "₹69,911", "₹64,003", "₹9.6 Lakh"],
        },
      ],
    },
  ];
</script>

<Seo
  type="WebPage"
  title="Home Loan Balance Transfer – Lower EMIs & Save More"
  image="/images/young-indian-couple-planning-loan-refinance-through-DigitalDSA.jpg"
  description="Switch your home loan to a lower interest rate & reduce EMIs. Compare balance transfer offers, calculate savings & apply hassle-free for the best deal today!"
  keywords="Home loan balance transfer, Transfer home loan to another bank, Lower home loan interest rate, Home loan EMI savings, Best home loan transfer offers, Home loan refinance, Reduce home loan EMI, Compare home loan rates, Home loan prepayment options, Home loan top-up loan, Home loan eligibility checker, Home loan transfer calculator, Home loan balance transfer process, Lowest home loan interest rates, Best home loan lenders"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage:
        "/images/young-indian-couple-planning-loan-refinance-through-DigitalDSA.jpg",
      coverAlt:
        "photo of a young indian couple planning balance transfer through DigitalDSA",
      heading: "Transferring your home loan: When & how to do",
      sourceName: "Freepik",
      originalSource:
        "https://www.freepik.com/free-photo/lovely-couple-looking-laptop_5123228.htm",
      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Check lowest rates",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          animation: true,
          btnClick: () => {
            $applicationData.LoanName = "Home Loan";
          },
        },
      ],
      para: `Transferring your home loan—also called a home loan balance transfer—can be a game changer if done at the right time. It allows you to move your outstanding loan amount to another bank or lender, usually at a lower interest rate or with better terms.`,
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "When to consider",
              targetId: `whyRefinance`,
            },
            {
              name: "When to avoid",
              targetId: `whenAvoid`,
            },
            {
              name: "How to do it",
              targetId: `how`,
            },
            {
              name: "How we help",
              targetId: `help`,
            },
            {
              name: "Tools & Calculators",
              targetId: `tools`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Check lowest rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Home Loan";
              },
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
      <div id="whyRefinance" data-section="whyRefinance" class="section">
        <AboveTitleWithTopIconCard
          listGridAboveLg="2"
          contents={{
            heading: `When should you consider a home loan balance transfer?`,
            xlGridCol: 2,
            borderBottom: true,
            list: [
              {
                heading: "When interest rates drop significantly",
                topPara: `If your current loan has a <span class="font-FourthHead">high interest rate</span>, and a new lender is offering a much lower rate, <span class="font-FourthHead">switching can save you lakhs</span> over time.
                <br><br>
                <span class="font-FourthHead">💡Example:</span>`,
                desc: [
                  `<span class="font-FourthHead">Existing loan:</span> ₹50 lakh at 9.5% interest for 20 years.`,
                  `<span class="font-FourthHead">New offer:</span> 8.35% interest.`,
                  `<span class="font-FourthHead">Savings:</span> Over ₹6 lakh in total interest!`,
                ],
                icon: "/icons/interestIcon.svg",
                altName: "interest-icon",
              },
              {
                heading: "When your credit score has improved",
                topPara: `If your <span class="font-FourthHead">credit score was low</span> when you took the loan, you probably got a <span class="font-FourthHead">higher interest rate</span>. But if you’ve built a <span class="font-FourthHead">stronger credit history</span>, you may now qualify for <span class="font-FourthHead">better loan terms</span> elsewhere.`,
                para: `<span class="font-FourthHead">💡Pro Tip:</span> Check your<span class="font-FourthHead"> CIBIL score</span> before applying. <span class="font-FourthHead">750+ is ideal</span> for the best rates!`,
                icon: "/icons/emiIcon.svg",
                altName: "emi-icon",
              },
              {
                heading: "When you want better loan features​",
                topPara: `<span class="font-FourthHead">A new lender might offer:</span>`,
                desc: [
                  `<span class="font-FourthHead">Lower or zero</span> processing fees.`,
                  `<span class="font-FourthHead">Flexible prepayment</span> options without penalties.`,
                  `<span class="font-FourthHead">Overdraft facilities</span> to reduce interest burden.`,
                ],
                para: `<span class="font-FourthHead">💡Pro Tip:</span> If your current bank charges high prepayment penalties, <span class="font-FourthHead">consider switching to one that allows free prepayments!</span>`,
                icon: "/icons/personalLoan.svg",
                altName: "loan-icon",
              },
              {
                heading:
                  "If you need additional funds for renovation or other needs​",
                topPara: `You can also <span class="font-FourthHead">combine a balance transfer with a top-up loan</span> to get <span class="font-FourthHead">extra money</span> for:
                <br><br>
                ✅ Home renovation <br> ✅ Business expansion <br> ✅ Higher education
                <br><br>
                <span class="font-FourthHead">💡Example:</span>`,
                desc: [
                  `Outstanding loan: ₹40 lakh`,
                  `New lender offers ₹45 lakh (₹5 lakh top-up) at <span class="font-FourthHead">same or lower interest rate Smart move? Absolutely! 🚀</span>`,
                ],
                icon: "/icons/renovateHome.svg",
                altName: "home-icon",
              },
            ],
          }}
        />
      </div>

      <div id="whenAvoid" data-section="whenAvoid" class="section">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `When Should You AVOID a Balance Transfer?`,
            xlGridCol: 3,
            borderBottom: true,
            list: [
              {
                heading: "If You Are in the Last Few Years of Your Loan",
                topPara: `Most of the interest is <span class="font-FourthHead">paid in the first few years</span> of a loan. If you’ve already <span class="font-FourthHead">paid 70-80% of the interest</span>, switching won’t save much.`,
                para: `<span class="font-FourthHead">💡Better Option:</span> Instead of transferring, <span class="font-FourthHead">make part payments</span> to close the loan faster!`,
                icon: "/icons/riskFactor.svg",
                altName: "risk-icon",
              },
              {
                heading: "If the Processing Fees & Charges Are Too High​",
                topPara: `Some banks <span class="font-FourthHead">advertise lower interest rates</span> but charge:`,
                desc: [
                  `<span class="font-FourthHead">igh processing fees</span> 10,000 - ₹50,000!)`,
                  `<span class="font-FourthHead">Legal & technical</span> verification fees`,
                  `<span class="font-FourthHead">Hidden charges</span>.`,
                ],
                para: `<span class="font-FourthHead">💡What to do:</span> Always calculate the net savings before switching.`,
                icon: "/icons/features.svg",
                altName: "emi-icon",
              },
              {
                heading:
                  "If Your Loan Is Fixed-Rate & Prepayment Charges Are High​",
                topPara: `Fixed-rate home loans often have <span class="font-FourthHead">steep penalties</span> for early closure. In such cases,<span class="font-FourthHead">transferring may not be beneficial</span>.`,
                para: `<span class="font-FourthHead">💡Pro Tip:</span> Check the terms & conditions carefully before proceeding!`,
                icon: "/icons/inte.svg",
                altName: "interest-icon",
              },
            ],
          }}
        />
      </div>

      <div id="how" data-section="how" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Step-by-Step Guide`,
            list: [
              {
                heading: `<span class="font-FourthHead">Step 1: Compare Interest Rates & Savings</span>`,
                desc: `✔️ Check the latest home loan rates from top lenders. <br> ✔️ Use a home loan balance transfer calculator (We can help! 😎). <br> ✔️ Ensure your savings outweigh the transfer costs. `,
              },

              {
                heading: `<span class="font-FourthHead">Step 2: Get a Loan Closure Letter from Your Current Lender</span>`,
                desc: `Request a Foreclosure letter & LOD (List of Original Documents) from your existing lender.`,
              },
              {
                heading: `<span class="font-FourthHead">Step 3: Apply for a New Loan With the New Lender</span>`,
                desc: `Submit the following documents: <br> 📌 KYC (Aadhaar, PAN, etc.) <br> 📌 Income proof (Salary slips, Form-16 or ITR) <br> 📌 Property documents <br> 📌 Foreclosure Letter & LOD from current lender`,
              },
              {
                heading: `<span class="font-FourthHead">Step 4: Approval & Loan Disbursement</span>`,
                desc: `✔️ Once approved, your new lender pays off the old loan directly. <br> ✔️ Your new loan starts with the new bank at a lower rate.`,
              },
              {
                heading: `<span class="font-FourthHead">Step 5: Start Paying Your New EMI & Enjoy Savings</span>`,
                desc: `You’ll now pay lower EMIs or close the loan faster!`,
              },
            ],
          }}
        />

        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont text-center"
            >
              How Much Can You Save? Let's See With an Example!
            </h2>
          </div>
          <div class="">
            {#each exampleTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>

        <ButtonBanner
          contents={{
            heading: `Ways to pay off your home loan faster`,
            para: `Small changes now can mean big differences later to how much of your home loan you end up repaying.`,
            btnName: `Find out how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/planners/part-payment-planner",
          }}
        />
      </div>

      <div id="help" data-section="help" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage:
              "/images/DigitalDSA-executive-explains-loan-offers-on-video-call.jpg",
            cardAltName:
              "photo of an executive of DigitalDSA explaining loan offers on video call.jpg",
            cardHeading: "How we Help",
          }}
        >
          <div class="">
            <ul class="list-disc space-y-4">
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <span class="font-FourthHead"
                    >Compare the best balance transfer offers.</span
                  > Help users choose the best interest rate and tenure.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <span class="font-FourthHead">Calculate actual savings</span> after
                  all costs.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <span class="font-FourthHead"
                    >Guide you through the process step by step.</span
                  >
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <span class="font-FourthHead"
                    >Negotiate with lenders for better deals!</span
                  >
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <span class="font-FourthHead">Doorstep Services:</span> Highlight
                  your convenience factor, like document collection and processing
                  from home.
                </span>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="tools" data-section="tools" class="section">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Take the First Step Towards Your Dream Home",
            cardData: [
              {
                title: "Secure best balance transfer offers",
                para: "Get the best balance transfer deals with lower interest rates and reduced EMIs. Secure your financial future by switching to a better loan option.",
                btnName: "Compare bank offers",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  $applicationData.LoanName = "Home Loan";
                },
              },
              {
                title: "Get the best home loan deal",
                para: "Get the most from your home loan application process and book time with our Home Lending Specialist at a time  that suits you.",
                btnName: "Book an appointment",
                btnLink: "/appointment",
              },
            ],
          }}
        />
        <AboveTitleWithBlackCard
          contents={{
            heading: "Home loan calculator",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Check offers from other banks",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/balance-transfer-calculator",
              },
              {
                heading: " How much can I borrow?",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",

                url: "/calculators/eligibility-calculator",
              },
              {
                heading: " Home loan repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
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

        <AboveTitleWithTopIconCard
          contents={{
            heading: `Smart savings calculators – Plan your future with confidence`,
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Know How Long Your Savings Will Last",
                para: `Determine how many years your savings can support your lifestyle.`,
                icon: "/icons/clock.svg",
                altName: "clock-icon",
                linkName: "Check Your Savings Longevity",
                url: "/money-map/how-long-will-your-savings-support-you",
              },
              {
                heading: "Track Your Progress Towards Your Goal​",
                para: `Estimate the time required to reach your financial milestones.`,
                icon: "/icons/phoneConnection.svg",
                altName: "phoneConnection-icon",
                linkName: "Plan Your Savings Journey",
                url: "/money-map/how-long-will-it-take-to-save",
              },
              {
                heading: "Set a Target for Retirement Savings​​",
                para: `Calculate the amount needed for a secure and comfortable retirement.`,
                icon: "/icons/negotiate.svg",
                altName: "negotiate-icon",
                linkName: "Plan Your Retirement Fund",
                url: "/money-map/how-much-to-save-by-retirement",
              },
              {
                heading: "Grow Your Savings with Consistency​",
                para: `See how regular contributions can maximize your savings over time.`,
                icon: "/icons/coinHouse.svg",
                altName: "coinHouse-icon",
                linkName: "Calculate Your Future Savings",
                url: "/money-map/how-much-can-i-save-with-regular-contributions",
              },
            ],
          }}
        />
      </div>
    </div>
    <div class="lg:hidden block">
      {#each ["When to consider", "When to avoid", "How to do it", "How we help", "Tools & Calculators"] as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem] cursor-pointer"
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
            <div id="whyRefinance" class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `When should you consider a home loan balance transfer?`,
                  xlGridCol: 3,
                  borderBottom: true,
                  list: [
                    {
                      heading: "When interest rates drop significantly",
                      topPara: `If your current loan has a <span class="font-FourthHead">high interest rate</span>, and a new lender is offering a much lower rate, <span class="font-FourthHead">switching can save you lakhs</span> over time.
                <br><br>
                <span class="font-FourthHead">💡Example:</span>`,
                      desc: [
                        `<span class="font-FourthHead">Existing loan:</span> ₹50 lakh at 9.5% interest for 20 years.`,
                        `<span class="font-FourthHead">New offer:</span> 8.35% interest.`,
                        `<span class="font-FourthHead">Savings:</span> Over ₹6 lakh in total interest!`,
                      ],
                      icon: "/icons/interestIcon.svg",
                      altName: "interest-icon",
                    },
                    {
                      heading: "When your credit score has improved​​",
                      topPara: `If your <span class="font-FourthHead">credit score was low</span> when you took the loan, you probably got a <span class="font-FourthHead">higher interest rate</span>. But if you’ve built a <span class="font-FourthHead">stronger credit history</span>, you may now qualify for <span class="font-FourthHead">better loan terms</span> elsewhere.`,
                      para: `<span class="font-FourthHead">💡Pro Tip:</span> Check your<span class="font-FourthHead"> CIBIL score</span> before applying. <span class="font-FourthHead">750+ is ideal</span> for the best rates!`,
                      icon: "/icons/emiIcon.svg",
                      altName: "emi-icon",
                    },
                    {
                      heading: "When you want better loan features​",
                      topPara: `<span class="font-FourthHead">A new lender might offer:</span>`,
                      desc: [
                        `<span class="font-FourthHead">Lower or zero</span> processing fees.`,
                        `<span class="font-FourthHead">Flexible prepayment</span> options without penalties.`,
                        `<span class="font-FourthHead">Overdraft facilities</span> to reduce interest burden.`,
                      ],
                      para: `<span class="font-FourthHead">💡Pro Tip:</span> If your current bank charges high prepayment penalties, <span class="font-FourthHead">consider switching to one that allows free prepayments!</span>`,
                      icon: "/icons/personalLoan.svg",
                      altName: "loan-icon",
                    },
                    {
                      heading:
                        "If you need additional funds for renovation or other needs​",
                      topPara: `You can also <span class="font-FourthHead">combine a balance transfer with a top-up loan</span> to get <span class="font-FourthHead">extra money</span> for:
                <br><br>
                ✅ Home renovation <br> ✅ Business expansion <br> ✅ Higher education
                <br><br>
                <span class="font-FourthHead">💡Example:</span>`,
                      desc: [
                        `Outstanding loan: ₹40 lakh`,
                        `New lender offers ₹45 lakh (₹5 lakh top-up) at <span class="font-FourthHead">same or lower interest rate Smart move? Absolutely! 🚀</span>`,
                      ],
                      icon: "/icons/renovateHome.svg",
                      altName: "home-icon",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="whenAvoid" class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `When Should You AVOID a Balance Transfer?`,
                  xlGridCol: 3,
                  borderBottom: true,
                  list: [
                    {
                      heading: "If You Are in the Last Few Years of Your Loan",
                      topPara: `Most of the interest is <span class="font-FourthHead">paid in the first few years</span> of a loan. If you’ve already <span class="font-FourthHead">paid 70-80% of the interest</span>, switching won’t save much.`,
                      para: `<span class="font-FourthHead">💡Better Option:</span> Instead of transferring, <span class="font-FourthHead">make part payments</span> to close the loan faster!`,
                      icon: "/icons/riskFactor.svg",
                      altName: "risk-icon",
                    },
                    {
                      heading: "If the Processing Fees & Charges Are Too High​",
                      topPara: `Some banks <span class="font-FourthHead">advertise lower interest rates</span> but charge:`,
                      desc: [
                        `<span class="font-FourthHead">igh processing fees</span> 10,000 - ₹50,000!)`,
                        `<span class="font-FourthHead">Legal & technical</span> verification fees`,
                        `<span class="font-FourthHead">Hidden charges</span>.`,
                      ],
                      para: `<span class="font-FourthHead">💡What to do:</span> Always calculate the net savings before switching.`,
                      icon: "/icons/features.svg",
                      altName: "emi-icon",
                    },
                    {
                      heading:
                        "If Your Loan Is Fixed-Rate & Prepayment Charges Are High​",
                      topPara: `Fixed-rate home loans often have <span class="font-FourthHead">steep penalties</span> for early closure. In such cases,<span class="font-FourthHead">transferring may not be beneficial</span>.`,
                      para: `<span class="font-FourthHead">💡Pro Tip:</span> Check the terms & conditions carefully before proceeding!`,
                      icon: "/icons/inte.svg",
                      altName: "interest-icon",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="how" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Step-by-Step Guide`,
                  list: [
                    {
                      heading: `<span class="font-FourthHead">Step 1: Compare Interest Rates & Savings</span>`,
                      desc: `✔️ Check the latest home loan rates from top lenders. <br> ✔️ Use a home loan balance transfer calculator (We can help! 😎). <br> ✔️ Ensure your savings outweigh the transfer costs. `,
                    },

                    {
                      heading: `<span class="font-FourthHead">Step 2: Get a Loan Closure Letter from Your Current Lender</span>`,
                      desc: `Request a Foreclosure letter & LOD (List of Original Documents) from your existing lender.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Step 3: Apply for a New Loan With the New Lender</span>`,
                      desc: `Submit the following documents: <br> 📌 KYC (Aadhaar, PAN, etc.) <br> 📌 Income proof (Salary slips, Form-16 or ITR) <br> 📌 Property documents <br> 📌 Foreclosure Letter & LOD from current lender`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Step 4: Approval & Loan Disbursement</span>`,
                      desc: `✔️ Once approved, your new lender pays off the old loan directly. <br> ✔️ Your new loan starts with the new bank at a lower rate.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Step 5: Start Paying Your New EMI & Enjoy Savings</span>`,
                      desc: `You’ll now pay lower EMIs or close the loan faster!`,
                    },
                  ],
                }}
              />

              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    How Much Can You Save? Let's See With an Example!
                  </h2>
                </div>
                <div class="">
                  {#each exampleTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <ButtonBanner
                contents={{
                  heading: `Ways to pay off your home loan faster`,
                  para: `Small changes now can mean big differences later to how much of your home loan you end up repaying.`,
                  btnName: `Find out how`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/planners/part-payment-planner",
                }}
              />
            </div>
          {:else if index == 3}
            <div id="help" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage:
                    "/images/DigitalDSA-executive-explains-loan-offers-on-video-call.jpg",
                  cardAltName:
                    "photo of an executive of DigitalDSA explaining loan offers on video call.jpg",
                  cardHeading: "How we Help",
                }}
              >
                <div class="">
                  <ul class="list-disc space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <span class="font-FourthHead"
                          >Compare the best balance transfer offers.</span
                        > Help users choose the best interest rate and tenure.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <span class="font-FourthHead"
                          >Calculate actual savings</span
                        > after all costs.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <span class="font-FourthHead"
                          >Guide you through the process step by step.</span
                        >
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <span class="font-FourthHead"
                          >Negotiate with lenders for better deals!</span
                        >
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <span class="font-FourthHead">Doorstep Services:</span> Highlight
                        your convenience factor, like document collection and processing
                        from home.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 4}
            <div id="tools" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Take the First Step Towards Your Dream Home",
                  cardData: [
                    {
                      title: "Secure best balance transfer offers",
                      para: "Get the best balance transfer deals with lower interest rates and reduced EMIs. Secure your financial future by switching to a better loan option.",
                      btnName: "Compare bank offers",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        $applicationData.LoanName = "Home Loan";
                      },
                    },
                    {
                      title: "Get the best home loan deal",
                      para: "Get the most from your home loan application process and book time with our Home Lending Specialist at a time  that suits you.",
                      btnName: "Book an appointment",
                      btnLink: "/appointment",
                    },
                  ],
                }}
              />
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Home loan calculator",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Check offers from other banks",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/balance-transfer-calculator",
                    },
                    {
                      heading: " How much can I borrow?",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",

                      url: "/calculators/eligibility-calculator",
                    },
                    {
                      heading: " Home loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
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

              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Smart savings calculators – Plan your future with confidence`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Know How Long Your Savings Will Last",
                      para: `Determine how many years your savings can support your lifestyle.`,
                      icon: "/icons/clock.svg",
                      altName: "clock-icon",
                      linkName: "Check Your Savings Longevity",
                      url: "/money-map/how-long-will-your-savings-support-you",
                    },
                    {
                      heading: "Track Your Progress Towards Your Goal​",
                      para: `Estimate the time required to reach your financial milestones.`,
                      icon: "/icons/phoneConnection.svg",
                      altName: "phoneConnection-icon",
                      linkName: "Plan Your Savings Journey",
                      url: "/money-map/how-long-will-it-take-to-save",
                    },
                    {
                      heading: "Set a Target for Retirement Savings​​",
                      para: `Calculate the amount needed for a secure and comfortable retirement.`,
                      icon: "/icons/negotiate.svg",
                      altName: "negotiate-icon",
                      linkName: "Plan Your Retirement Fund",
                      url: "/money-map/how-much-to-save-by-retirement",
                    },
                    {
                      heading: "Grow Your Savings with Consistency​",
                      para: `See how regular contributions can maximize your savings over time.`,
                      icon: "/icons/coinHouse.svg",
                      altName: "coinHouse-icon",
                      linkName: "Calculate Your Future Savings",
                      url: "/money-map/how-much-can-i-save-with-regular-contributions",
                    },
                  ],
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <!-- message us  -->
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
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <!-- feedback -->
    <FeedbackCheck />
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
            `<span class="font-FourthHead">Independent Facilitator:</span> Digital DSA acts as an independent loan facilitator, helping home loan borrowers explore balance transfer options with licensed banks and NBFCs. We do not provide loans directly and are not a financial institution.`,
            `<span class="font-FourthHead">Balance Transfer Approval:</span> The approval of a home loan balance transfer depends entirely on the bank or NBFC where you apply. Digital DSA does not guarantee approval or influence the lender’s decision. All applications are subject to the lender’s credit assessment, eligibility criteria, interest rates, and applicable charges.`,
            `<span class="font-FourthHead">Liability:</span> Digital DSA is not responsible for delays, rejections, or any financial losses arising during the balance transfer process. The final decision made by the bank or NBFC is binding on both the borrower and Digital DSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
