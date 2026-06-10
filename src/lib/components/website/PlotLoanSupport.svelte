<script>
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Button from "$lib/components/website/Button.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithBlackCard from "$lib/components/website/AboveTitleWithBlackCard.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Loader from "$lib/components/website/Loader.svelte";
  import FeedbackCheck from "$lib/components/website/FeedbackCheck.svelte";
  import { applicationData } from "$lib/stores/stores";
  import Seo from "./Seo.svelte";

  let pageData = {
    coverImage: "/images/plot-loan-support-blog.jpg",
    coverAlt: "hero-cover",
    classStyle: "object-cover xl:h-[60svh] 3xl:max-h-[60svh]",
    heading: "Simplifying your plot loan journey",
    para: `Get expert support for your plot loan journey. Contact our help desk for personalized guidance. Our team is here to assist you with loan approvals, refinancing, and legal queries.`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare rates",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        btnClick: () => {
          $applicationData.LoanName = "Plot Loan";
        },
      },
    ],
  };

  let loaderValue = false;

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
</script>

<Seo
  type="WebPage"
  title="Simplify Your Plot Loan Journey | Compare & Apply Easily"
  image= "/images/plot-loan-support-blog.jpg"
  description="Get expert support for your plot loan. Compare offers, check eligibility, and secure approvals with transparency. Apply for a hassle-free loan today!"
  keywords="Plot loan Plot loan eligibility, Buy land loan, Land purchase loan, Plot loan approval, Plot loan interest rates, Plot loan calculator, Plot loan financing, Plot loan documents, Plot loan process, Best plot loan offers, Compare plot loan rates, Plot loan repayment options, Down payment for plot loan, Loan for land purchase"
/>

<section>
  <NewPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Loan type",
              targetId: `type`,
            },
            {
              name: "Key challenges",
              targetId: `challenges`,
            },
            {
              name: "Important steps",
              targetId: `steps`,
            },
            {
              name: "Financial support",
              targetId: `support`,
            },
            {
              name: "Tools & calculators",
              targetId: `tools`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Plot Loan";
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="type" data-section="type" class="section">
        <!-- check loan type -->
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Check your plot loan type first`,
            list: [
              {
                heading: `Different Loan Types–`,
                desc: `
                    Plot loans can vary based on factors like location (urban vs. rural), purpose (investment vs. construction), and lender policies. Knowing the right type helps you choose the best financing option.
                    `,
              },
              {
                heading: `Plot-Only Loan–`,
                desc: `A <a href="/plot-loan/plot-only-loan">Plot-Only Loan</a> is ideal if you’re buying land without immediate construction plans. However, lenders may have restrictions on location, land type, and tenure.`,
              },
              {
                heading: `Plot + Construction Loan–`,
                desc: `A <a href="/plot-loan/plot-and-construction-loan">Plot + Construction Loan</a> suits those planning to build soon. It often comes with better terms since it covers both land purchase and construction.`,
              },
            ],
          }}
        />

          <!-- we help -->
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/employees.jpg",
              cardAltName: "employees-figure",
              cardHeading: "How we Help",
            }}
          >
            <div class="typography-body-md text-[var(--form-text-secondary)]">
              <ul class="list-disc space-y-4">
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check"
                    class="h-4 mt-1"
                  />
                  <span>
                    <strong>Compare offers from multiple banks/NBFCs:</strong> Help
                    users choose the best interest rate and tenure.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check"
                    class="h-4 mt-1"
                  />
                  <span>
                    <strong>Transparency & zero spam policy:</strong> No contact
                    required upfront; no spam calls.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check"
                    class="h-4 mt-1"
                  />
                  <span>
                    <strong>Easy-to-use tools:</strong> Use our calculators to determine
                    your eligibility, affordability, and EMI for plot loan.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check"
                    class="h-4 mt-1"
                  />
                  <span>
                    <strong>Assured cashback offers:</strong> Mention any ongoing
                    cashback promotions or benefits for applying via your platform.
                  </span>
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle-check"
                    class="h-4 mt-1"
                  />
                  <span>
                    <strong>Doorstep Services:</strong> Highlight your convenience
                    factor, like document collection and processing from home.
                  </span>
                </li>
              </ul>
            </div>
          </TwoColumnWithImage>

          <div id="challenges" data-section="challenges" class="section">
            <!-- after buying prop. issues -->
            <TwoColumnWithLeftHeading
              contents={{
                heading: `Plot purchase challenges in India`,
                list: [
                  {
                    heading: `Encroachment issues–`,
                    desc: `
                    Local land mafia or neighbors may illegally occupy your land.
                    <br>
                    Fake documents may be created to claim ownership.
                    `,
                  },
                  {
                    heading: `Multiple buyers–`,
                    desc: `Fraudsters may sell the same plot to multiple people using duplicate sale deeds.`,
                  },
                  {
                    heading: `Hidden Liabilities–`,
                    desc: `Outstanding property tax, electricity bills, or other dues may transfer to the new owner.
              <br>
              Loan fraud—land sold despite being mortgaged to a bank.`,
                  },
                  {
                    heading: `No proper possession–`,
                    desc: `Real estate developers may delay handing over possession after payment.
              <br>
              Some builders falsely claim land approvals and then abandon projects.`,
                  },
                  {
                    heading: `Fake cooperative societies–`,
                    desc: `Some plots are sold in unauthorized layouts, leading to demolition by authorities.
              <br>
              Fraudulent cooperative housing societies sell land they don’t own.`,
                  },
                ],
                listUrl: {
                  url: "/plot-loan/plot-only-loan-challenges",
                  linkName: "👉 Learn More About Plot Purchase Challenges",
                },
              }}
            />
          </div>
          <div id="steps" data-section="steps" class="section">
            <!-- awareness -->
            <AboveTitleWithTopIconCard
              contents={{
                heading: `Important steps before buying a plot`,
                xlGridCol: 3,
                borderBottom: true,
                cards: [
                  {
                    heading: "Verify title and ownership",
                    para: `Ensure that the title deed is genuine and that the seller is the rightful owner by checking government records.`,
                    icon: "/icons/ownership.svg",
                    altName: "owner-icon",
                  },
                  {
                    heading: "Confirm boundaries​​",
                    para: `Check that the plot’s boundaries are clearly marked and free from any encroachments.`,
                    icon: "/icons/boundaries.svg",
                    altName: "boundary-icon",
                  },
                  {
                    heading: "Review documentation​",
                    para: `Make sure all documents—such as sale deeds, land records, and approvals—are complete and authentic.`,
                    icon: "/icons/financialProfile.svg",
                    altName: "profile-icon",
                  },
                  {
                    heading: "Check regulatory approvals",
                    para: `Verify that the plot has the necessary clearances, including land use conversion and zoning permissions.​`,
                    icon: "/icons/inte.svg",
                    altName: "inte-icon",
                  },
                  {
                    heading: "Avoid double selling​",
                    para: `Confirm that the plot isn’t being sold to multiple buyers at the same time.`,
                    icon: "/icons/contact.svg",
                    altName: "contact-icon",
                  },
                  {
                    heading: "Choose reputable agents​",
                    para: `Work with trusted brokers or developers to reduce the risk of misrepresentation or fraudulent practices.`,
                    icon: "/icons/people.svg",
                    altName: "offers-icon",
                  },
                ],
              }}
            />

            <!-- apply -->
            <TwoColumnWithLeftHeading
              contents={{
                heading:
                  "Get hassle-free plot loans with <span class='underline decoration-4 underline-offset-4 decoration-btnBg'>digitalDSA!</span>",

                secHeading: "Own your plot with the best loan options",
                secPara:
                  "Avoid rejection, delays and hidden charges with expert guidance, complete documentation, and transparent terms. Apply with confidence and secure your loan smoothly.",
                btnName: "Compare rates",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  $applicationData.LoanName = "Plot Loan";
                },
              }}
            />
          </div>

          <div id="support" data-section="support" class="section">
            <!-- financial support -->
            <AboveTitleWithoutIconCard
              contents={{
                heading: `Financial support for your plot loan`,
                xlGridCol: 3,
                borderBottom: true,
                cards: [
                  {
                    heading: "Need help arranging the down payment",
                    para: `digitalDSA connects you with financing options to cover your down payment easily, reducing upfront financial stress.​​`,
                    linkName: "Get Down Payment Support",
                    url: "/arrange-down-payment",
                  },
                  {
                    heading: "Facing cash flow issues during loan repayment",
                    para: `We offer customized repayment solutions to help you manage EMIs without straining your finances.`,
                    linkName: "Explore Repayment Plans",
                    url: "/planners/flexible-emi-planner",
                  },
                  {
                    heading:
                      "Looking for additional funding for plot development​",
                    para: `Need funds for fencing, leveling, or construction? digitalDSA connects you with top lenders for quick approvals, minimal paperwork, and lower EMIs on your existing loan.`,
                    linkName: `Apply for Additional Funding `,
                    url: "/get-started/how-can-we-help",
                    onClick: ($applicationData.LoanName = "Plot Loan"),
                  },
                ],
              }}
            />
          </div>
          <div id="tools" data-section="tools" class="section">
            <!-- money map -->
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

            <!-- plot loan calc -->
            <AboveTitleWithBlackCard
              contents={{
                heading: "Plot loan calculator",
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
                    heading: "Plot loan repayments calculator",
                    icon: "/icons/lap.svg",
                    iconAltName: "loan-icon",
                    url: "/planners/part-payment-planner",
                  },
                  {
                    heading: "Stamp duty calculator",
                    icon: "/icons/apply.svg",
                   iconAltName: "icons-apply",
                    url: "/calculators/stamp-duty-calculator",
                  },
                  {
                    heading: "Balance transfer calculator",
                    icon: "/icons/calc.svg",
                    iconAltName: "icons-calc",
                    url: "/calculators/balance-transfer-calculator",
                  },
                ],
              }}
            />

            <!-- ways to pay off -->
            <ButtonBanner
              contents={{
                heading: `Smart loan planning`,
                para: `Take control of your loan with our smart planners! Whether you prefer part-payment, flexible EMIs, or a combination of both, our planners help you optimize your repayment strategy for maximum savings.`,
                btnName: `Get Started`,
                btnBorder: `#4F4C4D`,
                btnLink: "/planners/both",
              }}
            />
          </div>
        </div>
      </div>
      <div class="lg:hidden block">
        {#each ["Loan type", "Key challenges", "Important steps", "Financial support", "Tools & calculators"] as list, index}
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
                <div class="icon-container justify-self-end">
                  <span><i class="fa-solid fa-angle-down faq-icon text-black dark:text-white"></i></span>
                </div>
              </div>
            </summary>
            {#if index == 0}
              <div id="type" class="bg-white text-black">
                <TwoColumnWithLeftHeading
                  contents={{
                    heading: `Check your plot loan type first`,
                    list: [
                      {
                        heading: `Different Loan Types–`,
                        desc: `
                    Plot loans can vary based on factors like location (urban vs. rural), purpose (investment vs. construction), and lender policies. Knowing the right type helps you choose the best financing option.
                    `,
                    },
                    {
                      heading: `Plot-Only Loan–`,
                      desc: `A <a href="/plot-loan/plot-only-loan">Plot-Only Loan</a> is ideal if you’re buying land without immediate construction plans. However, lenders may have restrictions on location, land type, and tenure.`,
                    },
                    {
                      heading: `Plot + Construction Loan–`,
                      desc: `A <a href="/plot-loan/plot-and-construction-loan">Plot + Construction Loan</a> suits those planning to build soon. It often comes with better terms since it covers both land purchase and construction.`,
                    },
                  ],
                }}
              />

              <!-- we help -->
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/employees.jpg",
                  cardAltName: "employees-figure",
                  cardHeading: "How we Help",
                }}
              >
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  <ul class="list-disc space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong
                          >Compare offers from multiple banks/NBFCs:</strong
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
                        <strong>Transparency & zero spam policy:</strong> No contact
                        required upfront; no spam calls.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Easy-to-use tools:</strong> Use our calculators to
                        determine your eligibility, affordability, and EMI for plot
                        loan.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Assured cashback offers:</strong> Mention any ongoing
                        cashback promotions or benefits for applying via your platform.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Doorstep Services:</strong> Highlight your convenience
                        factor, like document collection and processing from home.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Plot purchase challenges in India`,
                  list: [
                    {
                      heading: `Encroachment issues–`,
                      desc: `
                    Local land mafia or neighbors may illegally occupy your land.
                    <br>
                    Fake documents may be created to claim ownership.
                    `,
                    },
                    {
                      heading: `Multiple buyers–`,
                      desc: `Fraudsters may sell the same plot to multiple people using duplicate sale deeds.`,
                    },
                    {
                      heading: `Hidden Liabilities–`,
                      desc: `Outstanding property tax, electricity bills, or other dues may transfer to the new owner.
              <br>
              Loan fraud—land sold despite being mortgaged to a bank.`,
                    },
                    {
                      heading: `No proper possession–`,
                      desc: `Real estate developers may delay handing over possession after payment.
              <br>
              Some builders falsely claim land approvals and then abandon projects.`,
                    },
                    {
                      heading: `Fake cooperative societies–`,
                      desc: `Some plots are sold in unauthorized layouts, leading to demolition by authorities.
              <br>
              Fraudulent cooperative housing societies sell land they don’t own.`,
                    },
                  ],
                  listUrl: {
                    url: "/plot-loan/plot-only-loan-challenges",
                    linkName: "👉 Learn More About Plot Purchase Challenges",
                  },
                }}
              />
            </div>
          {:else if index == 2}
            <div id="steps" class="bg-white text-black">
              <!-- awareness -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Important steps before buying a plot`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Verify title and ownership",
                      para: `Ensure that the title deed is genuine and that the seller is the rightful owner by checking government records.`,
                      icon: "/icons/ownership.svg",
                      altName: "owner-icon",
                    },
                    {
                      heading: "Confirm boundaries​​",
                      para: `Check that the plot’s boundaries are clearly marked and free from any encroachments.`,
                      icon: "/icons/boundaries.svg",
                      altName: "boundary-icon",
                    },
                    {
                      heading: "Review documentation​",
                      para: `Make sure all documents—such as sale deeds, land records, and approvals—are complete and authentic.`,
                      icon: "/icons/financialProfile.svg",
                      altName: "profile-icon",
                    },
                    {
                      heading: "Check regulatory approvals",
                      para: `Verify that the plot has the necessary clearances, including land use conversion and zoning permissions.​`,
                      icon: "/icons/inte.svg",
                      altName: "inte-icon",
                    },
                    {
                      heading: "Avoid double selling​",
                      para: `Confirm that the plot isn’t being sold to multiple buyers at the same time.`,
                      icon: "/icons/contact.svg",
                      altName: "contact-icon",
                    },
                    {
                      heading: "Choose reputable agents​",
                      para: `Work with trusted brokers or developers to reduce the risk of misrepresentation or fraudulent practices.`,
                      icon: "/icons/people.svg",
                      altName: "offers-icon",
                    },
                  ],
                }}
              />

              <!-- apply -->
              <TwoColumnWithLeftHeading
                contents={{
                  heading:
                    "Get hassle-free plot loans with <span class='underline decoration-4 underline-offset-4 decoration-btnBg'>digitalDSA!</span>",

                  secHeading: "Own your plot with the best loan options",
                  secPara:
                    "Avoid rejection, delays and hidden charges with expert guidance, complete documentation, and transparent terms. Apply with confidence and secure your loan smoothly.",
                  btnName: "Compare rates",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnClick: () => {
                    $applicationData.LoanName = "Plot Loan";
                  },
                }}
              />
            </div>
          {:else if index == 3}
            <div id="support" class="bg-white text-black">
              <!-- financial support -->
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Financial support for your plot loan`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Need help arranging the down payment",
                      para: `digitalDSA connects you with financing options to cover your down payment easily, reducing upfront financial stress.​​`,
                      linkName: "Get Down Payment Support",
                      url: "/arrange-down-payment",
                    },
                    {
                      heading: "Facing cash flow issues during loan repayment",
                      para: `We offer customized repayment solutions to help you manage EMIs without straining your finances.`,
                      linkName: "Explore Repayment Plans",
                      url: "/planners/flexible-emi-planner",
                    },
                    {
                      heading:
                        "Looking for additional funding for plot development​",
                      para: `Need funds for fencing, leveling, or construction? digitalDSA connects you with top lenders for quick approvals, minimal paperwork, and lower EMIs on your existing loan.`,
                      linkName: `Apply for Additional Funding `,
                      url: "/get-started/how-can-we-help",
                      onClick: ($applicationData.LoanName = "Plot Loan"),
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 4}
            <div id="tools" class="bg-white text-black">
              <!-- money map -->
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

              <!-- plot loan calc -->
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Plot loan calculator",
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
                      heading: "Plot loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
                    },
                    {
                      heading: "Stamp duty calculator",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/calculators/stamp-duty-calculator",
                    },
                    {
                      heading: "Balance transfer calculator",
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/calculators/balance-transfer-calculator",
                    },
                  ],
                }}
              />

              <!-- ways to pay off -->
              <ButtonBanner
                contents={{
                  heading: `Smart loan planning`,
                  para: `Take control of your loan with our smart planners! Whether you prefer part-payment, flexible EMIs, or a combination of both, our planners help you optimize your repayment strategy for maximum savings.`,
                  btnName: `Get Started`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/planners/both",
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
              para: "Book instantly to speak to a plot loan specialist at a time that suits you",
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

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
