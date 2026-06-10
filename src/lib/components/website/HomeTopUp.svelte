<script>
	let {
		pageData = {
    coverImage:
      "/images/DigitalDSA-executive-explains-top-up-loan-offers-on-video-call.jpg",
    coverAlt: "DigitalDSA executive explains top-up loan offers",
    sourceName: "Freepik",
    originalSource:
      "https://www.freepik.com/free-photo/young-beautiful-woman-works-office-speak-video-call-laptop_20082710.htm",
    heading: `Home Loan Top-Up:<br> Everything You Need to Know`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Check lowest rates",
        btnLink: "/get-started/how-can-we-help",
        animation: true,
        btnColor: "#ffcc00",
        btnClick: () => {
          $applicationData.LoanName = "Home Loan";
        },
      },
    ],
    para: "A <span class='font-semibold'>Home Loan Top-Up</span> is an additional loan that you can avail over and above your existing home loan. It is a great option for borrowers who need extra funds for renovation, education, medical emergencies, or even a new investment. Since the loan is given against an existing home loan, the processing is simpler and faster than other loan types.",
  }
	} = $props();


  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import HelpList from "./HelpList.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";

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

  let activeSection = $state("");
;

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
</script>

<Seo
  type="WebPage"
  title="Home Loan Top-Up: Low Interest, Quick Approval & No Hassle"
  image="{pageData.coverImage},"
  description="Get a home loan top-up at low interest rates with quick approval. Use funds for renovation, education, or emergencies. Check eligibility now!"
  keywords="Home loan top-up, Home loan top-up eligibility, Home loan top-up interest rate, Home loan top-up benefits, Home loan top-up process, Home loan balance transfer, Additional loan on home loan, Home loan top-up calculator, Top-up home loan vs personal loan, Home loan top-up EMI calculator"
/>
<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Getting started",
              targetId: `started`,
            },
            {
              name: "Loan Tenure & Fee",
              targetId: `fee`,
            },
            {
              name: "Step-by-step",
              targetId: `step`,
            },
            {
              name: "How we help",
              targetId: `help`,
            },
            {
              name: "Tools & calculators",
              targetId: `tool`,
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
              animation: true,
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Home Loan";
              },
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div class="">
        <div id="started" data-section="started" class="">
          <TwoColumnWithLeftHeading
            contents={{
              heading: `What is a Home Loan Top-Up?`,
              secPara: `A <span class="font-semibold">home loan top-up</span> is an additional amount that can be borrowed over an existing home loan, without the need for a fresh property mortgage. This means you can access extra funds without going through the hassle of a new loan application.`,
              listTopPara: `Key Features:`,
              list: [
                {
                  heading: `Available only to existing home loan borrowers.`,
                },

                {
                  heading: `Loan amount depends on the current outstanding loan and property value.`,
                },
                {
                  heading: `No restrictions on end-use (except speculative purposes like stock market trading).`,
                },
                {
                  heading: `Interest rates are lower than personal loans.`,
                },
                {
                  heading: `Processing is faster compared to new loans.`,
                },
              ],
            }}
          />

          <!-- eligibility -->
          <AboveTitleWithTopIconCard
            contents={{
              heading: `Eligibility Criteria for a Top-Up Loan`,
              xlGridCol: 3,
              list: [
                {
                  icon: "/icons/checklist.svg",
                  iconAltName: "check Icon",
                  heading: "Good Repayment History",
                  desc: [
                    `Most lenders require <span class="font-semibold">at least 12 months</span> of timely EMI payments on your existing home loan.`,
                    `No missed or delayed payments in recent months.`,
                  ],
                },
                {
                  icon: "/icons/apply-pen.svg",
                  iconAltName: "pen Icon",
                  heading: "Sufficient Loan Eligibility",
                  desc: [
                    `Banks will check your <span class="font-semibold">loan-to-value (LTV) ratio</span> to ensure the total loan amount (existing loan + top-up) does not exceed 75%-80% of the property value.`,
                    `Your <span class="font-semibold">monthly income</span> and <span class="font-semibold">debt-to-income ratio</span> also determine your eligibility.`,
                  ],
                },
                {
                  icon: "/icons/ownership.svg",
                  iconAltName: "home Icon",
                  heading: "Clean Property Title & Ownership",
                  desc: [
                    `The property should be <span class="font-semibold">legally clear</span> with no pending disputes.`,
                    `The property should already be <span class="font-semibold">registered in your name</span>.`,
                  ],
                },
              ],
            }}
          />
        </div>

        <div id="fee" data-section="fee" class="section">
          <!-- tenure -->
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Loan Amount & Tenure`,
              list: [
                {
                  desc: `<span class="font-semibold">Minimum Loan– </span> ₹2 lakh (varies by bank)`,
                },

                {
                  desc: `<span class="font-semibold">Maximum Loan– </span> Up to ₹1 crore (or as per bank policy)`,
                },
                {
                  desc: `<span class="font-semibold">Loan Tenure– </span> Up to 15-20 years (varies by lender)`,
                },
                {
                  desc: `<span class="font-semibold">Loan-to-Value (LTV)– </span> Total loan (existing + top-up) should not exceed 80% of property value.`,
                },
              ],
            }}
          />

          <!-- processing fee -->
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Interest Rates & Processing Fees`,
              list: [
                {
                  desc: `<span class="font-semibold">Interest Rate– </span> Generally 0.5%-1% higher than your existing home loan rate.`,
                },
                {
                  desc: `<span class="font-semibold">Processing Fees– </span> 0.5% - 1% of loan amount (some banks offer discounts).`,
                },
                {
                  desc: `<span class="font-semibold">Prepayment Charges– </span> Nil for floating-rate loans, may apply for fixed-rate loans.`,
                },
                {
                  desc: `<span class="font-semibold">Other Charges– </span> Legal, valuation, and documentation charges may apply.`,
                },
              ],
              listSecPara: `<span class="font-semibold">💡 Tip:</span> If you have an existing home loan at a <span class="font-semibold">higher interest rate</span>, consider transferring your loan to a lower rate before taking a top-up.`,
            }}
          />
        </div>

        <div id="step" data-section="step" class="section">
          <!-- step-by-step -->
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/step-by-step.jpg",
              cardAltName:
                "Photo pf a couple descending step-by-step to represent a step-by-step process of top-up loans",
              cardHeading: `Home Loan Top-Up Processing: <br> Step-by-Step Guide`,
            }}
          >
            <div class="typography-body-sm text-text-light">
              <ul class="space-y-6">
                <li class="">
                  <div class="typography-body-md space-y-4">
                    <span class="font-semibold"
                      >1️⃣ Check Your Loan Eligibility</span
                    >
                    <ul class="list-disc ml-[2rem] space-y-2">
                      <li class="font-para typography-body-md">
                        Use an Eligibility Calculator (We can help! 😉).
                      </li>
                      <li class="font-para typography-body-md">
                        Check your remaining loan balance and current property
                        value.
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="">
                  <div class="typography-body-md space-y-4">
                    <span class="font-semibold"
                      >2️⃣ Submit Application & Documents</span
                    >
                    <ul class="list-disc ml-[2rem] space-y-2">
                      <li class="font-para typography-body-md">
                        KYC Documents (Aadhaar, PAN, Passport, Voter ID)
                      </li>
                      <li class="font-para typography-body-md">
                        Income Proof (Salary Slips, ITR, Bank Statements)
                      </li>
                      <li class="font-para typography-body-md">
                        Property Papers (Registry, Approved Plan)
                      </li>
                      <li class="font-para typography-body-md">
                        Existing Loan Details (Sanction Letter, EMI Schedule)
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="">
                  <div class="typography-body-md space-y-4">
                    <span class="font-semibold"
                      >3️⃣ Bank Verification & Processing</span
                    >
                    <ul class="list-disc ml-[2rem] space-y-2">
                      <li class="font-para typography-body-md">
                        The lender will verify your documents.
                      </li>
                      <li class="font-para typography-body-md">
                        A property re-evaluation may be done.
                      </li>
                      <li class="font-para typography-body-md">
                        Loan amount is decided based on eligibility.
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="">
                  <div class="typography-body-md space-y-4">
                    <span class="font-semibold"
                      >4️⃣ Loan Approval & Offer Letter</span
                    >
                    <ul class="list-disc ml-[2rem] space-y-2">
                      <li class="font-para typography-body-md">
                        Once approved, you’ll receive a sanction letter with
                        loan details.
                      </li>
                      <li class="font-para typography-body-md">
                        Carefully check interest rates, tenure, and charges.
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="">
                  <div class="typography-body-md space-y-4">
                    <span class="font-semibold">5️⃣ Disbursement of Funds</span
                    >
                    <ul class="list-disc ml-[2rem] space-y-2">
                      <li class="font-para typography-body-md">
                        The loan amount is credited to your bank account.
                      </li>
                      <li class="font-para typography-body-md">
                        The EMIs start from the next billing cycle.
                      </li>
                    </ul>
                  </div>
                </li>
                <li class="typography-body-md">
                  <span class="font-semibold">📢 Processing Time:</span>
                  <p class="font-para typography-body-md">
                    Generally takes 3-7 working days if all documents are in
                    order.
                  </p>
                </li>
              </ul>
            </div>
          </TwoColumnWithImage>

          <ButtonBanner
            contents={{
              heading: `See our home loan budget planner`,
              btnName: "Explore now",
              btnLink: "/planners/budget-planner",
              btnBorder: "#4F4C4D",
            }}
          />
          <!-- pros and cons -->
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Pros & Cons of a Home Loan Top-Up",
              cardData: [
                {
                  title: "✅ Pros:",
                  para: "1️⃣ Lower Interest Rates than personal loans. <br><br> 2️⃣ No Collateral Needed (same property mortgage is used). <br><br> 3️⃣ Longer Tenure (up to 20 years). <br><br> 4️⃣ Quick Processing since you're an existing borrower. <br><br> 5️⃣ No Restrictions on Fund Usage (except speculative purposes).",
                },
                {
                  title: "❌ Cons:",
                  para: "1️⃣ Increases EMI Burden if not planned properly. <br><br> 2️⃣ Higher Interest than Home Loans (usually 0.5%-1% extra).",
                },
              ],
            }}
          />
        </div>
        <div id="help" data-section="help" class="section">
          <!-- help -->
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/how-we-help.jpg",
              cardAltName:
                "photo of DigitalDSA executive helping customer on phone",
              cardHeading: "How we Help",
              reverse: true,
            }}
          >
            <div>
              <ul class="space-y-4">
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check-icon"
                    class="h-4 mt-1"
                  />
                  <span>
                    <span>Compare Top-Up Loan Offers</span> from multiple banks.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check-icon"
                    class="h-4 mt-1"
                  />
                  <span>
                    <span class="font-semibold"
                      >Instant Eligibility Check</span
                    > with our tools.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check-icon"
                    class="h-4 mt-1"
                  />
                  <span>
                    <span class="font-semibold"
                      >Lower Interest Rate Guidance</span
                    >(Balance Transfer + Top-Up).
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check-icon"
                    class="h-4 mt-1"
                  />
                  <span>
                    <span class="font-semibold"
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
                    <span class="font-semibold">Paperwork Assistance</span> to
                    speed up approval.
                  </span>
                </li>
                <li>
                  <span>
                    <span class="font-semibold"
                      >📌 Want to check your eligibility?</span
                    > Visit our Home Loan Top-Up Page or call us for personalized
                    assistance.
                  </span>
                </li>
              </ul>
            </div>
          </TwoColumnWithImage>
        </div>
        <div id="tool" data-section="tool" class="section">
          <!-- tools and calc -->
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Unlock the Door to Your New Home",
              cardData: [
                {
                  title: "Secure the Best Top-Up Loan Offers",
                  para: "Get the best top-up loan deals with competitive interest rates and flexible repayment options. Enhance your financial stability by accessing additional funds on your existing loan.",
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
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Getting started", "Loan Tenure & Fee", "Step-by-step", "How we help", "Tools & calculators"] as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="started" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `What is a Home Loan Top-Up?`,
                  secPara: `A <span class="font-semibold">home loan top-up</span> is an additional amount that can be borrowed over an existing home loan, without the need for a fresh property mortgage. This means you can access extra funds without going through the hassle of a new loan application.`,
                  listTopPara: `Key Features:`,
                  list: [
                    {
                      heading: `Available only to existing home loan borrowers.`,
                    },

                    {
                      heading: `Loan amount depends on the current outstanding loan and property value.`,
                    },
                    {
                      heading: `No restrictions on end-use (except speculative purposes like stock market trading).`,
                    },
                    {
                      heading: `Interest rates are lower than personal loans.`,
                    },
                    {
                      heading: `Processing is faster compared to new loans.`,
                    },
                  ],
                }}
              />

              <!-- eligibility -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Eligibility Criteria for a Top-Up Loan`,
                  xlGridCol: 3,
                  list: [
                    {
                      icon: "/icons/checklist.svg",
                      iconAltName: "check Icon",
                      heading: "Good Repayment History",
                      desc: [
                        `Most lenders require <span class="font-semibold">at least 12 months</span> of timely EMI payments on your existing home loan.`,
                        `No missed or delayed payments in recent months.`,
                      ],
                    },
                    {
                      icon: "/icons/apply-pen.svg",
                      iconAltName: "pen Icon",
                      heading: "Sufficient Loan Eligibility",
                      desc: [
                        `Banks will check your <span class="font-semibold">loan-to-value (LTV) ratio</span> to ensure the total loan amount (existing loan + top-up) does not exceed 75%-80% of the property value.`,
                        `Your <span class="font-semibold">monthly income</span> and <span class="font-semibold">debt-to-income ratio</span> also determine your eligibility.`,
                      ],
                    },
                    {
                      icon: "/icons/ownership.svg",
                      iconAltName: "home Icon",
                      heading: "Clean Property Title & Ownership",
                      desc: [
                        `The property should be <span class="font-semibold">legally clear</span> with no pending disputes.`,
                        `The property should already be <span class="font-semibold">registered in your name</span>.`,
                      ],
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="fee" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Loan Amount & Tenure`,
                  list: [
                    {
                      desc: `<span class="font-semibold">Minimum Loan– </span> ₹2 lakh (varies by bank)`,
                    },

                    {
                      desc: `<span class="font-semibold">Maximum Loan– </span> Up to ₹1 crore (or as per bank policy)`,
                    },
                    {
                      desc: `<span class="font-semibold">Loan Tenure– </span> Up to 15-20 years (varies by lender)`,
                    },
                    {
                      desc: `<span class="font-semibold">Loan-to-Value (LTV)– </span> Total loan (existing + top-up) should not exceed 80% of property value.`,
                    },
                  ],
                }}
              />

              <!-- processing fee -->
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Interest Rates & Processing Fees`,
                  list: [
                    {
                      desc: `<span class="font-semibold">Interest Rate– </span> Generally 0.5%-1% higher than your existing home loan rate.`,
                    },
                    {
                      desc: `<span class="font-semibold">Processing Fees– </span> 0.5% - 1% of loan amount (some banks offer discounts).`,
                    },
                    {
                      desc: `<span class="font-semibold">Prepayment Charges– </span> Nil for floating-rate loans, may apply for fixed-rate loans.`,
                    },
                    {
                      desc: `<span class="font-semibold">Other Charges– </span> Legal, valuation, and documentation charges may apply.`,
                    },
                  ],
                  listSecPara: `<span class="font-semibold">💡 Tip:</span> If you have an existing home loan at a <span class="font-semibold">higher interest rate</span>, consider transferring your loan to a lower rate before taking a top-up.`,
                }}
              />
            </div>
          {:else if index == 2}
            <div id="step" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/step-by-step.jpg",
                  cardAltName:
                    "Photo pf a couple descending step-by-step to represent a step-by-step process of top-up loans",
                  cardHeading: `Home Loan Top-Up Processing: <br> Step-by-Step Guide`,
                }}
              >
                <div class="typography-body-sm text-text-light">
                  <ul class="space-y-6">
                    <li class="">
                      <div class="typography-body-md space-y-4">
                        <span class="font-semibold"
                          >1️⃣ Check Your Loan Eligibility</span
                        >
                        <ul class="list-disc ml-[2rem] space-y-2">
                          <li class="font-para typography-body-md">
                            Use an Eligibility Calculator (We can help! 😉).
                          </li>
                          <li class="font-para typography-body-md">
                            Check your remaining loan balance and current
                            property value.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li class="">
                      <div class="typography-body-md space-y-4">
                        <span class="font-semibold"
                          >2️⃣ Submit Application & Documents</span
                        >
                        <ul class="list-disc ml-[2rem] space-y-2">
                          <li class="font-para typography-body-md">
                            KYC Documents (Aadhaar, PAN, Passport, Voter ID)
                          </li>
                          <li class="font-para typography-body-md">
                            Income Proof (Salary Slips, ITR, Bank Statements)
                          </li>
                          <li class="font-para typography-body-md">
                            Property Papers (Registry, Approved Plan)
                          </li>
                          <li class="font-para typography-body-md">
                            Existing Loan Details (Sanction Letter, EMI
                            Schedule)
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li class="">
                      <div class="typography-body-md space-y-4">
                        <span class="font-semibold"
                          >3️⃣ Bank Verification & Processing</span
                        >
                        <ul class="list-disc ml-[2rem] space-y-2">
                          <li class="font-para typography-body-md">
                            The lender will verify your documents.
                          </li>
                          <li class="font-para typography-body-md">
                            A property re-evaluation may be done.
                          </li>
                          <li class="font-para typography-body-md">
                            Loan amount is decided based on eligibility.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li class="">
                      <div class="typography-body-md space-y-4">
                        <span class="font-semibold"
                          >4️⃣ Loan Approval & Offer Letter</span
                        >
                        <ul class="list-disc ml-[2rem] space-y-2">
                          <li class="font-para typography-body-md">
                            Once approved, you’ll receive a sanction letter with
                            loan details.
                          </li>
                          <li class="font-para typography-body-md">
                            Carefully check interest rates, tenure, and charges.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li class="">
                      <div class="typography-body-md space-y-4">
                        <span class="font-semibold"
                          >5️⃣ Disbursement of Funds</span
                        >
                        <ul class="list-disc ml-[2rem] space-y-2">
                          <li class="font-para typography-body-md">
                            The loan amount is credited to your bank account.
                          </li>
                          <li class="font-para typography-body-md">
                            The EMIs start from the next billing cycle.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li class="typography-body-md">
                      <span class="font-semibold">📢 Processing Time:</span>
                      <p class="font-para typography-body-md">
                        Generally takes 3-7 working days if all documents are in
                        order.
                      </p>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>

              <ButtonBanner
                contents={{
                  heading: `See our home loan budget planner`,
                  btnName: "Explore now",
                  btnLink: "/planners/budget-planner",
                  btnBorder: "#4F4C4D",
                }}
              />
              <!-- pros and cons -->
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Pros & Cons of a Home Loan Top-Up",
                  cardData: [
                    {
                      title: "✅ Pros:",
                      para: "1️⃣ Lower Interest Rates than personal loans. <br><br> 2️⃣ No Collateral Needed (same property mortgage is used). <br><br> 3️⃣ Longer Tenure (up to 20 years). <br><br> 4️⃣ Quick Processing since you're an existing borrower. <br><br> 5️⃣ No Restrictions on Fund Usage (except speculative purposes).",
                    },
                    {
                      title: "❌ Cons:",
                      para: "1️⃣ Increases EMI Burden if not planned properly. <br><br> 2️⃣ Higher Interest than Home Loans (usually 0.5%-1% extra).",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="help" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/how-we-help.jpg",
                  cardAltName:
                    "photo of DigitalDSA executive helping customer on phone",
                  cardHeading: "How we Help",
                  reverse: true,
                }}
              >
                <div class="typography-body-sm text-text-light">
                  <ul class="space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Compare Top-Up Loan Offers</strong> from multiple
                        banks.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Instant Eligibility Check</strong> with our tools.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Lower Interest Rate Guidance</strong>(Balance
                        Transfer + Top-Up).
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Negotiate with lenders for better deals!</strong
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
                        <strong>Paperwork Assistance</strong> to speed up approval.
                      </span>
                    </li>
                    <li>
                      <span>
                        <strong>📌 Want to check your eligibility?</strong> Visit
                        our Home Loan Top-Up Page or call us for personalized assistance.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 4}
            <div id="tool" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Unlock the Door to Your New Home",
                  cardData: [
                    {
                      title: "Secure the Best Top-Up Loan Offers",
                      para: "Get the best top-up loan deals with competitive interest rates and flexible repayment options. Enhance your financial stability by accessing additional funds on your existing loan.",
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

    <TwoColumnWithImage
      contents={{
        cardImage: "/images/message.jpg",
        cardAltName: "housing-figure",
        cardHeading: "Message us 24/7",
        sourceName: "DigitalDSA",
        originalSource: "www.digitaldsa.com",
        reverse: false,
      }}
    >
      <p>
        Get instant help from the Digital DSA app or connect with a specialist
        who can message you back. You’ll need Digital DSA app notifications
        turned on so you know when you’ve received a reply.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
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
